import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, Loader2, MapPin, Sparkles, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { api, type Match } from "@/lib/api";
import { formatRupees, formatRupeeText } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/states";
import { NotificationBell } from "@/components/app-shell";

const scoreKeys = [["semantic_score", "Semantic"], ["category_score", "Category"], ["location_score", "Location"], ["quantity_score", "Quantity"], ["budget_score", "Budget"], ["delivery_score", "Delivery"]] as const;
const text = (value: unknown, fallback = "Not provided") => typeof value === "string" || typeof value === "number" ? String(value) : fallback;
const scoreOf = (match: Match) => Number(match.match_score ?? match.overall_score ?? match.score ?? 0);
const normalized = (value: unknown) => { const score = Number(value || 0); return score <= 1 ? score * 100 : score; };
/** Map display-friendly status labels */
const statusLabel = (status: string) => {
  if (status === "rejected") return "Declined";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export function MatchDashboard({ kind, id }: { kind: "client" | "supplier"; id: string }) {
  const queryClient = useQueryClient();
  const queryKey = [kind, "dashboard", id];
  const query = useQuery({ queryKey, queryFn: () => kind === "client" ? api.getClientDashboard(id) : api.getSupplierDashboard(id), retry: 1 });
  const [running, setRunning] = useState(false);
  /** Track per-match in-flight status updates and optimistic status overrides */
  const [pendingAction, setPendingAction] = useState<Record<string | number, string>>({});
  const [resolvedStatus, setResolvedStatus] = useState<Record<string | number, string>>({});

  const status = useMutation({
    mutationFn: ({ matchId, value }: { matchId: string | number; value: string }) => {
      setPendingAction((prev) => ({ ...prev, [matchId]: value }));
      return api.updateMatchStatus(matchId, value);
    },
    onSuccess: (_data, variables) => {
      setResolvedStatus((prev) => ({ ...prev, [variables.matchId]: variables.value }));
      setPendingAction((prev) => { const next = { ...prev }; delete next[variables.matchId]; return next; });
      void queryClient.invalidateQueries({ queryKey });
      const label = variables.value === "accepted" ? "Accepted" : "Declined";
      toast.success(`Match ${label.toLowerCase()} successfully`);
    },
    onError: (error, variables) => {
      setPendingAction((prev) => { const next = { ...prev }; delete next[variables.matchId]; return next; });
      toast.error(error.message);
    },
  });

  if (query.isLoading) return <PageSkeleton rows={4} />;
  if (query.isError) return <ErrorState message={query.error.message} retry={() => void query.refetch()} />;
  const data = query.data || {};
  const profile = (data[kind] || data.requirement || data.profile || {}) as Record<string, unknown>;
  const matchSource = data.matches;
  const matches = Array.isArray(matchSource) ? matchSource : matchSource?.items || [];
  const name = text(profile[kind === "client" ? "company_name" : "supplier_name"], kind === "client" ? "Your requirement" : "Your supply profile");
  const product = text(profile[kind === "client" ? "product_requirement" : "product_offered"]);
  async function rerun() { setRunning(true); try { await api.runMatching(id); await query.refetch(); toast.success("Fresh matches are ready"); } catch (error) { toast.error(error instanceof Error ? error.message : "Matching failed"); } finally { setRunning(false); } }
  return <div className="page-wrap">
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4"><div><span className="eyebrow">{kind} workspace</span><h1 className="page-title mt-3">Matches for {name}</h1></div><div className="flex gap-2"><NotificationBell /><Button onClick={rerun} disabled={running}><Sparkles />{running ? "Matching…" : "Find matches"}</Button></div></div>
    <section className="requirement-strip">
      <div>
        <p className="text-xs font-bold uppercase text-muted-foreground">Your {kind === "client" ? "requirement" : "offer"}</p>
        <p className="mt-2 max-w-3xl font-display text-xl">{product}</p>
      </div>
      <div className="grid gap-1 text-sm">
        <span><strong>Category:</strong> {text(profile["category"])}</span>
        <span><strong>Location:</strong> {text(profile["location"])}</span>
        {kind === "client" && profile["budget"] != null && (
          <span><strong>Budget:</strong> {formatRupees(profile["budget"] as number | string)}</span>
        )}
        {kind === "supplier" && profile["pricing_details"] && (
          <span><strong>Pricing:</strong> {formatRupeeText(String(profile["pricing_details"]))}</span>
        )}
      </div>
    </section>
    <div className="mb-4 mt-9 flex items-end justify-between"><div><h2 className="font-display text-2xl font-semibold">Ranked matches</h2><p className="text-sm text-muted-foreground">Best fit first, with the reasoning in plain language.</p></div><span className="text-sm font-semibold">{matches.length} found</span></div>
    {matches.length === 0 ? <EmptyState title="No matches yet" description="Run matching to see who fits your needs. New profiles can improve the results over time." action={<Button onClick={rerun}><Sparkles />Find matches</Button>} /> : <div className="space-y-4">{matches.map((match, index) => <MatchCard key={match.id} match={match} rank={index + 1} counterpart={kind === "client" ? "supplier" : "client"} pendingAction={pendingAction[match.id]} resolvedStatus={resolvedStatus[match.id]} onStatus={(value) => status.mutate({ matchId: match.id, value })} />)}</div>}
    <div className="mt-7 text-right"><Button asChild variant="ghost"><Link to={kind === "client" ? "/clients/edit/$id" : "/suppliers/edit/$id"} params={{ id }}>Edit profile</Link></Button></div>
  </div>;
}

function MatchCard({ match, rank, counterpart, pendingAction, resolvedStatus, onStatus }: { match: Match; rank: number; counterpart: "client" | "supplier"; pendingAction?: string; resolvedStatus?: string; onStatus: (status: string) => void }) {
  const [open, setOpen] = useState(false);
  const nested = (match[counterpart] || {}) as Record<string, unknown>;
  const name = text(match[counterpart === "supplier" ? "supplier_name" : "client_name"] ?? match.company_name ?? nested[counterpart === "supplier" ? "supplier_name" : "company_name"], `Match ${rank}`);
  const category = text(match.category ?? nested["category"]);
  const location = text(match.location ?? nested["location"]);
  const score = normalized(scoreOf(match));
  const tone = score >= 75 ? "score-high" : score >= 50 ? "score-mid" : "score-low";

  // Determine effective status: optimistic override > server status
  const effectiveStatus = resolvedStatus || (match.status as string) || "pending";
  const isActioned = effectiveStatus === "accepted" || effectiveStatus === "rejected";
  const isInFlight = !!pendingAction;

  const matchReason = formatRupeeText(text(match.match_reason ?? match.reason, "This profile shares relevant requirements and capabilities with yours."));
  const counterpartPricing = nested["pricing_details"] ? formatRupeeText(String(nested["pricing_details"])) : undefined;
  const counterpartBudget = nested["budget"] != null ? formatRupees(nested["budget"] as number | string) : undefined;

  return <article className="match-card"><div className="flex flex-col gap-5 md:flex-row md:items-start"><div className="flex flex-1 gap-4"><span className="rank-mark">{rank}</span><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-xl font-semibold">{name}</h3><span className={`status-badge ${effectiveStatus === "accepted" ? "status-accepted" : effectiveStatus === "rejected" ? "status-rejected" : ""}`}>{statusLabel(effectiveStatus)}</span></div><p className="mt-1 text-sm font-medium text-primary">{category}</p><p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-4" />{location}</p>{counterpartPricing && <p className="mt-1 text-xs font-medium text-muted-foreground">Pricing: {counterpartPricing}</p>}{counterpartBudget && <p className="mt-1 text-xs font-medium text-muted-foreground">Budget: {counterpartBudget}</p>}<p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">{matchReason}</p></div></div><div className={`score-badge ${tone}`}><strong>{Math.round(score)}%</strong><span>match</span></div></div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
      <Button variant="ghost" onClick={() => setOpen((value) => !value)}>Score details <ChevronDown className={`transition-transform ${open ? "rotate-180" : ""}`} /></Button>
      <div className="flex gap-2">
        {isInFlight ? (
          <Button disabled variant="outline"><Loader2 className="animate-spin" />Saving…</Button>
        ) : isActioned ? (
          <Button variant="ghost" onClick={() => onStatus("notified")} className="text-muted-foreground"><Undo2 className="size-4" />Change decision</Button>
        ) : (
          <>
            <Button variant="outline" onClick={() => onStatus("rejected")}><X />Decline</Button>
            <Button onClick={() => onStatus("accepted")}><Check />Accept</Button>
          </>
        )}
      </div>
    </div>
    {open && <div className="mt-4 grid gap-3 rounded-md bg-muted p-4 sm:grid-cols-2 lg:grid-cols-3">{scoreKeys.map(([key, label]) => { const value = normalized(match[key]); return <div key={key}><div className="mb-1 flex justify-between text-xs font-semibold"><span>{label}</span><span>{Math.round(value)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(value, 100)}%` }} /></div></div>; })}</div>}
  </article>;
}