import sys
import os
from decimal import Decimal

# Ensure backend directory is in path when running script directly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.database import SessionLocal, engine, Base
from app.models.client import Client
from app.models.supplier import Supplier
from app.models.match import Match
from app.services.matching_engine import run_matching_all


SAMPLE_CLIENTS = [
    {
        "company_name": "Apex IoT Innovations",
        "product_requirement": "Custom Multi-Layer Printed Circuit Boards (PCBs) with SMD components",
        "category": "Electronics",
        "quantity_required": 5000,
        "budget": Decimal("45000.00"),
        "location": "Bengaluru, Karnataka, India",
        "delivery_timeline": "within 3 weeks",
        "additional_notes": "Requires lead-free RoHS compliance and ISO 9001 certified manufacturing.",
    },
    {
        "company_name": "Lumina Display Tech",
        "product_requirement": "OLED Flexible Display Modules 6.5 inch with driver ICs",
        "category": "Electronics",
        "quantity_required": 2000,
        "budget": Decimal("80000.00"),
        "location": "Pune, Maharashtra, India",
        "delivery_timeline": "within 4 weeks",
        "additional_notes": "Sample batch of 50 units required prior to mass production.",
    },
    {
        "company_name": "EcoThread Apparel Co.",
        "product_requirement": "100% Organic GOTS-Certified Combed Ring-Spun Cotton Fabric Rolls (180 GSM)",
        "category": "Textiles",
        "quantity_required": 10000,
        "budget": Decimal("35000.00"),
        "location": "Coimbatore, Tamil Nadu, India",
        "delivery_timeline": "within 2 weeks",
        "additional_notes": "Pantone-matched dyed colors: Slate Grey, Forest Green, and Natural Off-White.",
    },
    {
        "company_name": "Vanguard Activewear",
        "product_requirement": "Recycled Polyester & Spandex Performance Blend (Moisture-wicking, 4-way stretch)",
        "category": "Textiles",
        "quantity_required": 8000,
        "budget": Decimal("48000.00"),
        "location": "Surat, Gujarat, India",
        "delivery_timeline": "within 3 weeks",
        "additional_notes": "UV protective finish (UPF 50+) and anti-microbial coating required.",
    },
    {
        "company_name": "PurePack Organics",
        "product_requirement": "Biodegradable PLA Compostable Shipping Mailers (10x13 inch) with custom logo",
        "category": "Packaging",
        "quantity_required": 50000,
        "budget": Decimal("22000.00"),
        "location": "Mumbai, Maharashtra, India",
        "delivery_timeline": "within 10 business days",
        "additional_notes": "Water-based ink printing; certified ASTM D6400 compostable.",
    },
    {
        "company_name": "Beverage Craft Collective",
        "product_requirement": "Corrugated Heavy-Duty 12-Bottle Shipping Boxes with protective dividers",
        "category": "Packaging",
        "quantity_required": 15000,
        "budget": Decimal("18500.00"),
        "location": "New Delhi, Delhi, India",
        "delivery_timeline": "within 2 weeks",
        "additional_notes": "Drop-test rated 200 lb crush resistance with custom 2-color exterior print.",
    },
    {
        "company_name": "AeroForge Dynamics",
        "product_requirement": "Aerospace Grade 6061-T6 Aluminum Billets (extrusion ready)",
        "category": "Raw Materials",
        "quantity_required": 12000,
        "budget": Decimal("95000.00"),
        "location": "Hyderabad, Telangana, India",
        "delivery_timeline": "within 4 weeks",
        "additional_notes": "Complete Mill Test Certificates (MTRs) and ultrasonic inspection required.",
    },
    {
        "company_name": "BioPharm Solutions",
        "product_requirement": "USP Grade Medical-Grade Polypropylene Granules for Injection Molding",
        "category": "Raw Materials",
        "quantity_required": 25000,
        "budget": Decimal("62500.00"),
        "location": "Ahmedabad, Gujarat, India",
        "delivery_timeline": "within 3 weeks",
        "additional_notes": "Class VI biocompatibility certification and batch lot traceability mandatory.",
    },
]

SAMPLE_SUPPLIERS = [
    {
        "supplier_name": "CircuitCraft Microelectronics",
        "product_offered": "Turnkey Multilayer PCB Fabrication & High-Speed SMT Assembly",
        "category": "Electronics",
        "available_quantity": 20000,
        "pricing_details": Decimal("7.80"),  # per unit -> 5000 * 7.80 = 39000 <= 45000
        "location": "Bengaluru, Karnataka, India",
        "delivery_capability": "ships in 10-14 days",
        "additional_notes": "Equipped with automated optical inspection (AOI) and X-ray testing for BGA components.",
    },
    {
        "supplier_name": "OptiVision Optoelectronics",
        "product_offered": "Custom Flexible AMOLED & OLED Displays with integrated touch controllers",
        "category": "Electronics",
        "available_quantity": 8000,
        "pricing_details": Decimal("36.50"),  # per unit -> 2000 * 36.50 = 73000 <= 80000
        "location": "Mumbai, Maharashtra, India",
        "delivery_capability": "ships in 14-21 days",
        "additional_notes": "Offers complete optical bonding and custom cover glass printing.",
    },
    {
        "supplier_name": "Verde Mills & Weaving",
        "product_offered": "GOTS Certified Organic Ring-Spun Cotton Fabrics & Custom Dyeing",
        "category": "Textiles",
        "available_quantity": 30000,
        "pricing_details": Decimal("3.20"),  # per roll unit -> 10000 * 3.20 = 32000 <= 35000
        "location": "Chennai, Tamil Nadu, India",
        "delivery_capability": "ships in 7-10 days",
        "additional_notes": "OEKO-TEX Standard 100 certified, zero toxic wastewater discharge facility.",
    },
    {
        "supplier_name": "SyntheTech Performance Fabrics",
        "product_offered": "Recycled Poly/Spandex Technical Knits for athletic and compression wear",
        "category": "Textiles",
        "available_quantity": 25000,
        "pricing_details": Decimal("5.40"),  # per unit -> 8000 * 5.40 = 43200 <= 48000
        "location": "Surat, Gujarat, India",
        "delivery_capability": "ships in 12-15 days",
        "additional_notes": "High colorfastness to chlorine, UV, and laundering.",
    },
    {
        "supplier_name": "BioShield Packaging Group",
        "product_offered": "Certified Compostable PLA Mailers, Envelopes & Biodegradable Pouches",
        "category": "Packaging",
        "available_quantity": 100000,
        "pricing_details": Decimal("0.38"),  # per mailer -> 50000 * 0.38 = 19000 <= 22000
        "location": "Pune, Maharashtra, India",
        "delivery_capability": "ships in 5-7 business days",
        "additional_notes": "Custom flexographic printing up to 6 colors; tamper-evident adhesive strips.",
    },
    {
        "supplier_name": "Midwest Box & Container Co.",
        "product_offered": "Heavy-Duty Corrugated Shipping Boxes & Partition Inserts",
        "category": "Packaging",
        "available_quantity": 50000,
        "pricing_details": Decimal("1.10"),  # per box -> 15000 * 1.10 = 16500 <= 18500
        "location": "New Delhi, Delhi, India",
        "delivery_capability": "ships in 5-8 days",
        "additional_notes": "FSC-certified 100% recycled paperboard with moisture-resistant barrier.",
    },
    {
        "supplier_name": "Titanium & Alloy Works",
        "product_offered": "Certified Aerospace Grade Aluminum 6061-T6 / 7075 Extrusion Billets",
        "category": "Raw Materials",
        "available_quantity": 40000,
        "pricing_details": Decimal("7.25"),  # per unit -> 12000 * 7.25 = 87000 <= 95000
        "location": "Hyderabad, Telangana, India",
        "delivery_capability": "ships in 14-20 days",
        "additional_notes": "AS9100D registered facility, full lot traceability and ultrasonic inspection reports included.",
    },
    {
        "supplier_name": "Polymer Precision Corp",
        "product_offered": "Medical-Grade & Food-Contact USP Class VI Polypropylene Resin Pellets",
        "category": "Raw Materials",
        "available_quantity": 80000,
        "pricing_details": Decimal("2.15"),  # per unit -> 25000 * 2.15 = 53750 <= 62500
        "location": "Ahmedabad, Gujarat, India",
        "delivery_capability": "ships in 7-12 days",
        "additional_notes": "ISO 13485 cleanroom compound manufacturing with DMF on file.",
    },
]


def seed_database(run_matching: bool = True):
    """Seed the database with sample clients and suppliers, then run matchmaking."""
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Check existing records
        existing_clients = db.query(Client).count()
        existing_suppliers = db.query(Supplier).count()

        if existing_clients > 0 or existing_suppliers > 0:
            print(f"Database contains {existing_clients} clients and {existing_suppliers} suppliers.")
            user_input = os.getenv("FORCE_SEED", "false").lower()
            if user_input != "true":
                print("Skipping re-inserting client/supplier rows. (Set FORCE_SEED=true to wipe and re-seed)")
                if run_matching:
                    print("Running AI matchmaking engine on existing data...")
                    match_summary = run_matching_all(db, min_score=40.0)
                    print(f"Matchmaking complete: {match_summary['matches_stored']} matches stored.")
                return

            print("FORCE_SEED=true detected. Clearing existing data...")
            db.query(Match).delete()
            db.query(Client).delete()
            db.query(Supplier).delete()
            db.commit()

        print(f"Seeding {len(SAMPLE_CLIENTS)} clients...")
        for client_data in SAMPLE_CLIENTS:
            client = Client(**client_data)
            db.add(client)

        print(f"Seeding {len(SAMPLE_SUPPLIERS)} suppliers...")
        for supplier_data in SAMPLE_SUPPLIERS:
            supplier = Supplier(**supplier_data)
            db.add(supplier)

        db.commit()
        print(f"Successfully seeded {len(SAMPLE_CLIENTS)} clients and {len(SAMPLE_SUPPLIERS)} suppliers!")

        if run_matching:
            print("Executing AI Matchmaking Engine across all seed data...")
            match_summary = run_matching_all(db, min_score=40.0)
            print(f"AI Matchmaking complete! Generated {match_summary['matches_stored']} high-quality matches.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}", file=sys.stderr)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
