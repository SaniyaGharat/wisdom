"""
AI-Powered Client-Supplier Matchmaking Engine (Phase 2).

WHY A HYBRID MATCHING APPROACH:
Pure keyword search or exact text matching fails in B2B matchmaking because:
1. Lexical variance: A client requesting 'Flexible OLED display modules' will fail to match
   a supplier offering 'AMOLED screens and touch panels' with keyword matching despite
   high technical equivalence.
2. Contextual understanding: Transformer-based embeddings capture deep semantic associations,
   specifications, and synonyms across product descriptions.
3. Operational feasibility: A 100% semantic match is useless if the supplier's price exceeds
   the client's budget by 5x, or if available quantity is insufficient.
Therefore, this engine combines dense semantic similarity (35%) with deterministic business-rule
scoring (category, location, quantity capacity, budget, and delivery timelines) to ensure matches
are both semantically sound and commercially viable.
"""

import re
import hashlib
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.orm import Session

from app.config import settings
from app.models.client import Client
from app.models.supplier import Supplier
from app.models.match import Match
from app.crud.client import get_client, get_clients
from app.crud.supplier import get_supplier, get_suppliers
from app.crud.match import upsert_match


# ---------------------------------------------------------------------------
# Embedding Model & Cache Management
# ---------------------------------------------------------------------------

_model_instance = None
# In-memory embedding cache: key -> np.ndarray
# Note: In-memory cache is ideal for Phase 2. For high-volume multi-worker deployments,
# this should be transitioned to pgvector / Redis / dedicated vector database.
_embedding_cache: Dict[str, np.ndarray] = {}


def get_embedding_model():
    """Lazy load the sentence transformer model as a singleton."""
    global _model_instance
    if _model_instance is None:
        from sentence_transformers import SentenceTransformer
        _model_instance = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
    return _model_instance


def get_text_hash(text: str) -> str:
    """Generate SHA256 hash for cache key validation."""
    return hashlib.sha256(text.strip().encode("utf-8")).hexdigest()[:16]


def get_embedding(text: str, cache_key: Optional[str] = None) -> np.ndarray:
    """
    Generate or retrieve cached embedding for a given text.
    """
    if cache_key and cache_key in _embedding_cache:
        return _embedding_cache[cache_key]

    model = get_embedding_model()
    embedding = model.encode(text, convert_to_numpy=True, normalize_embeddings=True)

    if cache_key:
        _embedding_cache[cache_key] = embedding
    return embedding


def clear_embedding_cache():
    """Utility to reset cache (useful during tests/benchmarks)."""
    global _embedding_cache
    _embedding_cache.clear()


# ---------------------------------------------------------------------------
# Text Representation Builders
# ---------------------------------------------------------------------------

def build_client_text(client: Client) -> str:
    """
    Construct rich descriptive string representation of Client requirement.
    """
    parts = [
        f"Product Requirement: {client.product_requirement}",
        f"Category: {client.category}",
    ]
    if client.additional_notes:
        parts.append(f"Specifications & Notes: {client.additional_notes}")
    return ". ".join(parts)


def build_supplier_text(supplier: Supplier) -> str:
    """
    Construct rich descriptive string representation of Supplier offering.
    """
    parts = [
        f"Product Offered: {supplier.product_offered}",
        f"Category: {supplier.category}",
    ]
    if supplier.additional_notes:
        parts.append(f"Capabilities & Notes: {supplier.additional_notes}")
    return ". ".join(parts)


# ---------------------------------------------------------------------------
# Heuristic Business Rule Scorers
# ---------------------------------------------------------------------------

def score_semantic(client: Client, supplier: Supplier) -> float:
    """
    Compute cosine similarity between client requirement and supplier offering embeddings.
    Returns float in range [0.0, 1.0].
    """
    client_text = build_client_text(client)
    supplier_text = build_supplier_text(supplier)

    client_cache_key = f"client:{client.id}:{get_text_hash(client_text)}"
    supplier_cache_key = f"supplier:{supplier.id}:{get_text_hash(supplier_text)}"

    client_emb = get_embedding(client_text, client_cache_key)
    supplier_emb = get_embedding(supplier_text, supplier_cache_key)

    sim = float(cosine_similarity([client_emb], [supplier_emb])[0][0])
    # Ensure clamped within [0.0, 1.0]
    return max(0.0, min(1.0, round(sim, 4)))


def score_category(client: Client, supplier: Supplier) -> float:
    """
    Exact category alignment.
    1.0 if categories match (case-insensitive), else 0.0.
    """
    if not client.category or not supplier.category:
        return 0.0
    return 1.0 if client.category.strip().lower() == supplier.category.strip().lower() else 0.0


def score_location(client: Client, supplier: Supplier) -> float:
    """
    Location proximity scoring:
    - 1.0: Same city / exact location match
    - 0.5: Same broader region / state
    - 0.0: No recognized geographic overlap
    """
    if not client.location or not supplier.location:
        return 0.0

    c_loc = client.location.strip().lower()
    s_loc = supplier.location.strip().lower()

    if c_loc == s_loc:
        return 1.0

    # Parse tokens as lists to preserve primary city order
    c_parts = [t.strip() for t in re.split(r"[,/\-]+", c_loc) if t.strip()]
    s_parts = [t.strip() for t in re.split(r"[,/\-]+", s_loc) if t.strip()]

    if not c_parts or not s_parts:
        return 0.0

    # Check for city match (first token)
    c_city = c_parts[0]
    s_city = s_parts[0]
    if c_city and s_city and c_city == s_city:
        return 1.0

    # Exclude common national suffixes so country name alone doesn't trigger state/region match
    common_countries = {"india", "usa", "us", "united states", "uk", "germany", "france", "china", "japan"}
    c_regions = {p for p in c_parts[1:] if p not in common_countries}
    s_regions = {p for p in s_parts[1:] if p not in common_countries}

    if c_regions and s_regions and c_regions.intersection(s_regions):
        return 0.5

    return 0.0


def score_quantity(client: Client, supplier: Supplier) -> float:
    """
    Quantity capacity scoring:
    - 1.0 if supplier available quantity >= client quantity required
    - Partial score (available / required) if supplier can partially fulfill
    """
    if client.quantity_required <= 0:
        return 1.0
    if supplier.available_quantity >= client.quantity_required:
        return 1.0
    return max(0.0, min(1.0, round(supplier.available_quantity / client.quantity_required, 4)))


def score_budget(client: Client, supplier: Supplier) -> float:
    """
    Budget feasibility scoring:
    - Total order cost = supplier.pricing_details (unit price) * client.quantity_required
    - 1.0 if total order cost <= client budget
    - Decaying score if over budget (e.g. 20% over budget -> 0.80, 100% over budget -> 0.0)
    """
    client_budget = float(client.budget)
    if client_budget <= 0:
        return 0.0

    total_cost = float(supplier.pricing_details) * client.quantity_required
    if total_cost <= client_budget:
        return 1.0

    overage_ratio = (total_cost - client_budget) / client_budget
    return max(0.0, round(1.0 - overage_ratio, 4))


def parse_timeline_to_days(text: Optional[str]) -> Optional[int]:
    """
    Regex heuristic parser to convert free-text timeline statements into estimated days.
    Examples:
    - "within 2 weeks" -> 14
    - "ships in 5-7 business days" -> 9 (business days * 1.3)
    - "ships in 10-14 days" -> 14 (takes upper bound)
    - "within 1 month" -> 30

    *Limitation Notice*:
    Free-text timeline estimation relies on heuristic regex extraction. For production,
    structured integer day fields or standardized delivery SLAs should be captured.
    """
    if not text:
        return None

    cleaned = text.lower().strip()

    # Match patterns with range e.g. "10-14 days" -> take upper bound 14
    range_match = re.search(r"(\d+)\s*-\s*(\d+)\s*(day|business day|week|month)", cleaned)
    if range_match:
        upper = int(range_match.group(2))
        unit = range_match.group(3)
        if "week" in unit:
            return upper * 7
        elif "month" in unit:
            return upper * 30
        elif "business" in unit:
            return int(upper * 1.3)
        return upper

    # Match single number with unit e.g. "2 weeks", "5 days"
    single_match = re.search(r"(\d+)\s*(day|business day|week|month)", cleaned)
    if single_match:
        val = int(single_match.group(1))
        unit = single_match.group(2)
        if "week" in unit:
            return val * 7
        elif "month" in unit:
            return val * 30
        elif "business" in unit:
            return int(val * 1.3)
        return val

    return None


def score_delivery(client: Client, supplier: Supplier) -> float:
    """
    Delivery timeline feasibility:
    - 1.0 if supplier lead time <= client required timeline
    - Partial decaying score if supplier takes slightly longer (up to 1.5x)
    - 0.0 if delivery is far too slow or cannot be fulfilled
    """
    client_days = parse_timeline_to_days(client.delivery_timeline)
    supplier_days = parse_timeline_to_days(supplier.delivery_capability)

    if client_days is None or supplier_days is None:
        # Neutral default if timeline cannot be parsed
        return 0.70

    if supplier_days <= client_days:
        return 1.0

    if supplier_days <= client_days * 1.5:
        overage = supplier_days - client_days
        return max(0.0, round(1.0 - (overage / client_days), 4))

    return 0.0


# ---------------------------------------------------------------------------
# Match Reason Generator
# ---------------------------------------------------------------------------

def generate_match_reason(
    client: Client,
    supplier: Supplier,
    semantic_score: float,
    category_score: float,
    location_score: float,
    quantity_score: float,
    budget_score: float,
    delivery_score: float,
) -> str:
    """
    Generate an insightful, human-readable justification of the match scores.
    """
    reasons = []

    # Semantic relevance
    if semantic_score >= 0.75:
        reasons.append(f"Strong semantic alignment on product requirement ({int(semantic_score*100)}%)")
    elif semantic_score >= 0.50:
        reasons.append(f"Moderate product capability overlap ({int(semantic_score*100)}%)")
    else:
        reasons.append(f"Low semantic relevance ({int(semantic_score*100)}%)")

    # Category
    if category_score == 1.0:
        reasons.append(f"exact category match ('{client.category}')")
    else:
        reasons.append(f"cross-category match ('{client.category}' vs '{supplier.category}')")

    # Budget
    total_cost = float(supplier.pricing_details) * client.quantity_required
    client_budget = float(client.budget)
    if budget_score == 1.0:
        reasons.append(f"within budget (₹{total_cost:,.2f} <= ₹{client_budget:,.2f})")
    else:
        overage = total_cost - client_budget
        reasons.append(f"exceeds budget by ₹{overage:,.2f}")

    # Quantity
    if quantity_score == 1.0:
        reasons.append(f"sufficient supply ({supplier.available_quantity:,} available for {client.quantity_required:,} required)")
    else:
        reasons.append(f"partial quantity capacity ({supplier.available_quantity:,}/{client.quantity_required:,})")

    # Location
    if location_score == 1.0:
        reasons.append(f"co-located in {client.location}")
    elif location_score == 0.5:
        reasons.append(f"regional location alignment ({supplier.location} -> {client.location})")
    else:
        reasons.append(f"different geographic location ({supplier.location} vs {client.location})")

    # Delivery
    if delivery_score == 1.0:
        reasons.append(f"delivery capability meets timeline ({supplier.delivery_capability} vs {client.delivery_timeline})")
    else:
        reasons.append(f"potential delivery delay ({supplier.delivery_capability} vs {client.delivery_timeline})")

    # Combine into readable paragraph
    return ". ".join(r[0].upper() + r[1:] for r in reasons) + "."


def generate_match_summary(
    client: Client,
    supplier: Supplier,
    match_score: float,
    semantic_score: float,
    category_score: float,
    location_score: float,
    quantity_score: float,
    budget_score: float,
    delivery_score: float,
) -> str:
    """
    Generate a natural, analyst-style 2-sentence executive summary.
    Sentence 1 summarizes core capability and alignment fit.
    Sentence 2 highlights the single weakest sub-score as an analytical caveat (if < 0.75),
    or praises overall alignment if all sub-scores are strong (>= 0.75).
    """
    score_pct = int(round(match_score))
    if semantic_score >= 0.75:
        alignment_text = "strong technical alignment"
    elif semantic_score >= 0.50:
        alignment_text = "moderate capability overlap"
    else:
        alignment_text = "partial technical alignment"

    co_location = f", and benefits from co-location in {client.location}" if location_score == 1.0 else ""
    sentence_one = (
        f"Supplier {supplier.supplier_name} matches {score_pct}% because they offer {supplier.product_offered} "
        f"with {alignment_text} to your {client.product_requirement} requirement{co_location}."
    )

    # Evaluate the single weakest commercial/technical sub-score
    sub_scores = [
        ("delivery", delivery_score),
        ("budget", budget_score),
        ("quantity", quantity_score),
        ("location", location_score),
        ("category", category_score),
        ("semantic", semantic_score),
    ]

    # Focus on components strictly below absolute threshold of 0.75 (excluding strong matches >= 0.75)
    caveat_candidates = [(name, val) for name, val in sub_scores if val < 0.75]

    if caveat_candidates:
        weakest_name, weakest_val = min(caveat_candidates, key=lambda item: item[1])
        if weakest_name == "delivery":
            sentence_two = (
                f"However, their delivery capability ({supplier.delivery_capability}) runs longer than "
                f"your requested timeline ({client.delivery_timeline})."
            )
        elif weakest_name == "budget":
            sentence_two = (
                "However, their quoted unit pricing results in a total project cost exceeding your stated budget."
            )
        elif weakest_name == "quantity":
            sentence_two = (
                f"However, their available capacity ({supplier.available_quantity:,} units) covers only part of "
                f"your required volume ({client.quantity_required:,} units)."
            )
        elif weakest_name == "location":
            sentence_two = (
                f"However, their facility in {supplier.location} is geographically distant from your location in {client.location}."
            )
        elif weakest_name == "category":
            sentence_two = (
                f"However, their primary industry category ({supplier.category}) differs from your specified category ({client.category})."
            )
        elif weakest_name == "semantic":
            if weakest_val < 0.75:
                sentence_two = (
                    "However, catalog capabilities show only moderate overlap with your exact custom specifications."
                )
            else:
                sentence_two = (
                    "All operational, budgetary, and delivery constraints align exceptionally well with your specifications."
                )
        else:
            sentence_two = (
                "All operational, budgetary, and delivery constraints align exceptionally well with your specifications."
            )
    else:
        sentence_two = (
            "All operational, budgetary, and delivery constraints align exceptionally well with your specifications."
        )

    return f"{sentence_one} {sentence_two}"


# ---------------------------------------------------------------------------
# Composite Match Computation & Orchestration
# ---------------------------------------------------------------------------

def compute_match(client: Client, supplier: Supplier) -> Dict[str, Any]:
    """
    Compute full hybrid match breakdown and final weighted score for a Client-Supplier pair.
    """
    sem_score = score_semantic(client, supplier)
    cat_score = score_category(client, supplier)
    loc_score = score_location(client, supplier)
    qty_score = score_quantity(client, supplier)
    bud_score = score_budget(client, supplier)
    del_score = score_delivery(client, supplier)

    # Weighted composite score formula
    final_score_normalized = (
        (sem_score * settings.MATCH_WEIGHT_SEMANTIC)
        + (cat_score * settings.MATCH_WEIGHT_CATEGORY)
        + (loc_score * settings.MATCH_WEIGHT_LOCATION)
        + (qty_score * settings.MATCH_WEIGHT_QUANTITY)
        + (bud_score * settings.MATCH_WEIGHT_BUDGET)
        + (del_score * settings.MATCH_WEIGHT_DELIVERY)
    )

    # Scale to 0 - 100
    final_score = round(final_score_normalized * 100.0, 2)

    reason = generate_match_reason(
        client=client,
        supplier=supplier,
        semantic_score=sem_score,
        category_score=cat_score,
        location_score=loc_score,
        quantity_score=qty_score,
        budget_score=bud_score,
        delivery_score=del_score,
    )

    summary = generate_match_summary(
        client=client,
        supplier=supplier,
        match_score=final_score,
        semantic_score=sem_score,
        category_score=cat_score,
        location_score=loc_score,
        quantity_score=qty_score,
        budget_score=bud_score,
        delivery_score=del_score,
    )

    return {
        "match_score": final_score,
        "semantic_score": sem_score,
        "category_score": cat_score,
        "location_score": loc_score,
        "quantity_score": qty_score,
        "budget_score": bud_score,
        "delivery_score": del_score,
        "match_reason": reason,
        "match_summary": summary,
    }


from app.services.notification_service import notify_match


import time
import logging

logger = logging.getLogger("app.matching_engine")


def run_matching_for_client(
    db: Session,
    client_id: Any,
    min_score: Optional[float] = None,
) -> List[Match]:
    """
    Scores a single client against all available suppliers.
    Filters out matches below min_score threshold and upserts qualifying matches.
    Automatically notifies client & supplier if a new match is created.
    Returns ranked list of stored matches.
    """
    start_time = time.perf_counter()
    client = get_client(db, client_id)
    if not client:
        logger.warning(f"Matching run failed: Client with id {client_id} not found")
        raise ValueError(f"Client with id {client_id} not found")

    threshold = min_score if min_score is not None else settings.MATCH_MIN_SCORE_THRESHOLD
    suppliers, _ = get_suppliers(db, limit=1000, offset=0)

    stored_matches: List[Match] = []
    for supplier in suppliers:
        match_data = compute_match(client, supplier)
        if match_data["match_score"] >= threshold:
            match_record, is_created = upsert_match(
                db=db,
                client_id=client.id,
                supplier_id=supplier.id,
                match_data=match_data,
            )
            # Notify only on newly created match crossing threshold
            if is_created:
                notify_match(db, match_record)

            stored_matches.append(match_record)

    # Sort descending by match_score
    stored_matches.sort(key=lambda m: (m.match_score or 0.0), reverse=True)
    duration_ms = (time.perf_counter() - start_time) * 1000
    logger.info(
        f"Matching run completed for client_id={client_id}: "
        f"{len(stored_matches)} matches found across {len(suppliers)} suppliers "
        f"in {duration_ms:.2f}ms (threshold={threshold})"
    )
    return stored_matches


def run_matching_for_supplier(
    db: Session,
    supplier_id: Any,
    min_score: Optional[float] = None,
) -> List[Match]:
    """
    Scores a single supplier against all active clients.
    Filters out matches below min_score threshold and upserts qualifying matches.
    Automatically notifies client & supplier if a new match is created.
    Returns ranked list of stored matches.
    """
    start_time = time.perf_counter()
    supplier = get_supplier(db, supplier_id)
    if not supplier:
        logger.warning(f"Matching run failed: Supplier with id {supplier_id} not found")
        raise ValueError(f"Supplier with id {supplier_id} not found")

    threshold = min_score if min_score is not None else settings.MATCH_MIN_SCORE_THRESHOLD
    clients, _ = get_clients(db, limit=1000, offset=0)

    stored_matches: List[Match] = []
    for client in clients:
        match_data = compute_match(client, supplier)
        if match_data["match_score"] >= threshold:
            match_record, is_created = upsert_match(
                db=db,
                client_id=client.id,
                supplier_id=supplier.id,
                match_data=match_data,
            )
            if is_created:
                notify_match(db, match_record)

            stored_matches.append(match_record)

    stored_matches.sort(key=lambda m: (m.match_score or 0.0), reverse=True)
    duration_ms = (time.perf_counter() - start_time) * 1000
    logger.info(
        f"Matching run completed for supplier_id={supplier_id}: "
        f"{len(stored_matches)} matches found across {len(clients)} clients "
        f"in {duration_ms:.2f}ms (threshold={threshold})"
    )
    return stored_matches


def run_matching_all(
    db: Session,
    min_score: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Runs full batch matchmaking: all clients vs all suppliers.
    Automatically notifies client & supplier for any newly created qualifying match.
    Returns summary metrics.
    """
    start_time = time.perf_counter()
    threshold = min_score if min_score is not None else settings.MATCH_MIN_SCORE_THRESHOLD
    clients, _ = get_clients(db, limit=1000, offset=0)
    suppliers, _ = get_suppliers(db, limit=1000, offset=0)

    matches_count = 0
    new_notifications_count = 0

    for client in clients:
        for supplier in suppliers:
            match_data = compute_match(client, supplier)
            if match_data["match_score"] >= threshold:
                match_record, is_created = upsert_match(
                    db=db,
                    client_id=client.id,
                    supplier_id=supplier.id,
                    match_data=match_data,
                )
                if is_created:
                    notify_match(db, match_record)
                    new_notifications_count += 2

                matches_count += 1

    duration_ms = (time.perf_counter() - start_time) * 1000
    logger.info(
        f"Batch matching run completed: {len(clients)} clients, {len(suppliers)} suppliers, "
        f"{matches_count} qualifying matches, {new_notifications_count} notifications created "
        f"in {duration_ms:.2f}ms"
    )

    return {
        "message": "Batch matchmaking completed successfully",
        "clients_processed": len(clients),
        "suppliers_evaluated": len(suppliers),
        "matches_stored": matches_count,
        "new_notifications_created": new_notifications_count,
        "min_score_threshold": threshold,
    }

