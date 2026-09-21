import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, Building2, ChevronDown, Download, Handshake, Play, RefreshCw, Store, TrendingUp, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api, type Match, type ScoreTrendItem, type ScoreBandEffectiveness } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/states";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";

const activityIcons: Record<string, React.ReactNode> = { client_created: <Building2 />, supplier_created: <Store />, match_created: <Handshake />, notification_sent: <Bell /> };
const value = (input: unknown, fallback = "—") => typeof input === "string" || typeof input === "number" ? String(input) : fallback;
const percent = (input: unknown) => { const score = Number(input ?? 0); return Math.round(score <= 1 ? score * 100 : score); };
const normalized = (v: unknown) => { const s = Number(v || 0); return s <= 1 ? s * 100 : s; };
const scoreKeys = [["semantic_score", "Semantic"], ["category_score", "Category"], ["location_score", "Location"], ["quantity_score", "Quantity"], ["budget_score", "Budget"], ["delivery_score", "Delivery"]] as const;
/** Map display-friendly status labels */
const statusLabel = (status: string) => {
  if (status === "rejected") return "Declined";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

/* ── Match Quality Interpretation ──────────────────────────────── */
function interpretEffectiveness(bands: ScoreBandEffectiveness[]): string {
  const decidedBands = bands.filter((b) => b.acceptance_rate !== null);
  const totalDecided = decidedBands.reduce((s, b) => s + b.accepted_count + b.rejected_count, 0);

  if (totalDecided < 10) {
    return "Not enough decided matches yet to validate score calibration. At least 10 accepted or rejected matches are needed for a meaningful analysis.";
  }

  // Check if higher score bands have higher acceptance rates
  const ratesDesc = decidedBands
    .filter((b) => b.acceptance_rate !== null)
    .sort((a, b) => b.min_score - a.min_score);

  if (ratesDesc.length < 2) {
    return "Only one score band has decided matches — more spread across bands is needed for calibration analysis.";
  }

  let positiveSteps = 0;
  let negativeSteps = 0;
  for (let i = 0; i < ratesDesc.length - 1; i++) {
    if (ratesDesc[i].acceptance_rate! >= ratesDesc[i + 1].acceptance_rate!) {
      positiveSteps++;
    } else {
      negativeSteps++;
    }
  }

  if (positiveSteps > negativeSteps) {
    return "Higher-scoring matches are being accepted at a higher rate, suggesting the scoring model is well-calibrated.";
  } else if (negativeSteps > positiveSteps) {
    return "Lower-scoring matches are being accepted more often than higher-scoring ones — the scoring model may need recalibration.";
  }
  return "Acceptance rates are similar across score bands. More data will help determine if the scoring model is well-calibrated.";
}

/* ── Band colours (pastel design system) ──────────────────────── */
const bandColors = [
  "oklch(0.65 0.13 145)",   // sage-ish (90-100)
  "oklch(0.72 0.10 145)",   // lighter sage (80-89)
  "oklch(0.87 0.08 55)",    // peach (70-79)
  "oklch(0.92 0.09 92)",    // butter (60-69)
  "oklch(0.87 0.05 305)",   // lavender (50-59)
  "oklch(0.93 0.04 18)",    // rose-soft (40-49)
];

export function AdminDashboard() {
  const [status, setStatus] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [sort, setSort] = useState("desc");
  const [page, setPage] = useState(0);
  const [running, setRunning] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set());
  const limit = 10;
  const params = useMemo(() => { const p = new URLSearchParams({ limit: String(limit), offset: String(page * limit), sort_by: "match_score", sort_order: sort }); if (status) p.set("status", status); if (minScore) p.set("min_score", String(minScore)); return p; }, [status, minScore, sort, page]);
  const summary = useQuery({ queryKey: ["summary"], queryFn: api.getSummary, retry: 1 });
  const categories = useQuery({ queryKey: ["categories"], queryFn: api.getCategoryBreakdown, retry: 1 });
  const activity = useQuery({ queryKey: ["activity"], queryFn: api.getRecentActivity, retry: 1 });
  const matches = useQuery({ queryKey: ["matches", params.toString()], queryFn: () => api.getMatches(params), retry: 1 });
  const scoreTrend = useQuery({ queryKey: ["score-trend"], queryFn: () => api.getScoreTrend(30), retry: 1 });
  const scoreEffectiveness = useQuery({ queryKey: ["score-effectiveness"], queryFn: api.getScoreEffectiveness, retry: 1 });
  const stats = summary.data;
  const bars: Array<{ name: string; count: number; score?: number }> = useMemo(() => {
    if (!categories.data) return [];
    const list: Array<Record<string, unknown>> = Array.isArray(categories.data)
      ? categories.data
      : "items" in categories.data && Array.isArray((categories.data as { items: unknown[] }).items)
      ? ((categories.data as { items: Array<Record<string, unknown>> }).items)
      : [];

    if (list.length > 0) {
      return list.map((item) => ({
        name: value(item["category"] ?? item["name"], "Uncategorized"),
        count: Number(item["total_matches"] ?? item["count"] ?? item["total"] ?? 0),
        score: item["average_match_score"] != null ? Number(item["average_match_score"]) : undefined,
      }));
    }

    if (typeof categories.data === "object") {
      return Object.entries(categories.data).map(([name, count]) => ({
        name,
        count: typeof count === "number" ? count : Number(count) || 0,
      }));
    }

    return [];
  }, [categories.data]);

  const max = Math.max(...bars.map((item) => item.count), 1);

  function toggleRow(id: string | number) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  /* ── CSV export handler ──────────────────────────────────────── */
  function handleExportCsv() {
    const exportParams = new URLSearchParams();
    if (status) exportParams.set("status", status);
    if (minScore) exportParams.set("min_score", String(minScore));
    api.exportMatchesCsv(exportParams.size > 0 ? exportParams : undefined);
    toast.success("CSV export started");
  }

  async function runAll() { setRunning(true); try { await api.runAllMatching(); toast.success("Platform-wide matching complete"); await Promise.all([summary.refetch(), matches.refetch(), activity.refetch(), categories.refetch(), scoreTrend.refetch(), scoreEffectiveness.refetch()]); } catch (error) { toast.error(error instanceof Error ? error.message : "Matching failed"); } finally { setRunning(false); } }
  return <div className="page-wrap">
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><span className="eyebrow">Platform overview</span><h1 className="page-title mt-3">Matching desk</h1><p className="mt-2 text-muted-foreground">A live view of marketplace health, quality, and activity.</p></div><Button onClick={runAll} disabled={running}><Play />{running ? "Running…" : "Run matching for everyone"}</Button></div>
    {summary.isError ? <ErrorState message={summary.error.message} /> : <div className="stat-grid">{[
      ["Clients", stats?.total_clients, "sage"], ["Suppliers", stats?.total_suppliers, "peach"], ["Matches", stats?.total_matches, "lavender"], ["Average score", `${Number(stats?.average_match_score ?? stats?.avg_match_score ?? 0).toFixed(0)}%`, "butter"]
    ].map(([label, amount, tone]) => <div key={String(label)} className={`stat-card bg-${tone}`}><span>{label}</span>{summary.isLoading ? <div className="skeleton mt-4 h-9 w-20" /> : <strong>{value(amount, "0")}</strong>}</div>)}</div>}
    {stats?.matches_by_status && <div className="mt-4 flex flex-wrap gap-2">{Object.entries(stats.matches_by_status).map(([name, count]) => <span className="status-badge" key={name}>{statusLabel(name)}: {count}</span>)}</div>}
    <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
      <section><div className="section-heading"><div><h2>Category breakdown</h2><p>Match volume across the marketplace.</p></div></div><div className="panel min-h-72">{categories.isLoading ? <div className="space-y-5">{[1,2,3,4].map((i) => <div className="skeleton h-9" key={i} />)}</div> : categories.isError ? <ErrorState message={categories.error.message} /> : bars.length === 0 ? <p className="empty-copy">No category data yet.</p> : <div className="space-y-5">{bars.map((bar, index) => <div key={bar.name}><div className="mb-1.5 flex justify-between text-sm"><span className="font-semibold">{bar.name}</span><span className="text-muted-foreground">{bar.count} {bar.count === 1 ? "match" : "matches"}{bar.score != null && bar.score > 0 ? ` · ${Math.round(bar.score)}% avg` : ""}</span></div><div className="h-4 rounded bg-muted"><div className={`h-full rounded ${index % 3 === 0 ? "bg-primary" : index % 3 === 1 ? "bg-peach" : "bg-lavender"}`} style={{ width: `${(bar.count / max) * 100}%` }} /></div></div>)}</div>}</div></section>
      <section><div className="section-heading"><div><h2>Recent activity</h2><p>What just happened.</p></div></div><div className="panel min-h-72">{activity.isLoading ? <div className="space-y-3">{[1,2,3].map((i) => <div className="skeleton h-16" key={i} />)}</div> : activity.isError ? <ErrorState message={activity.error.message} /> : activity.data?.items.length === 0 ? <p className="empty-copy">The activity feed is quiet.</p> : <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">{activity.data?.items.map((item, index) => <div className="flex gap-3" key={value(item["id"], String(index))}><span className="activity-icon">{activityIcons[value(item["event_type"] ?? item["type"])] || <RefreshCw />}</span><div><p className="text-sm font-semibold">{value(item["message"] ?? item["description"], "Platform activity")}</p><p className="text-xs text-muted-foreground">{value(item["created_at"], "Just now")}</p></div></div>)}</div>}</div></section>
    </div>

    {/* ── PART B: Score Trend Chart ──────────────────────────────── */}
    <section className="mt-10">
      <div className="section-heading">
        <div>
          <h2 className="flex items-center gap-2"><TrendingUp className="size-5 text-primary" /> Match score trend</h2>
          <p>Average match score over the last 30 days.</p>
        </div>
      </div>
      <div className="panel" style={{ minHeight: 280 }}>
        {scoreTrend.isLoading ? (
          <div className="skeleton h-56" />
        ) : scoreTrend.isError ? (
          <ErrorState message={scoreTrend.error.message} />
        ) : !scoreTrend.data || scoreTrend.data.length === 0 ? (
          <p className="empty-copy">No trend data available yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={scoreTrend.data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickFormatter={(d: string) => {
                  const dt = new Date(d + "T00:00:00");
                  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
                }}
              />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={36} />
              <RechartsTooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  fontSize: 13,
                }}
                labelFormatter={(d: string) => {
                  const dt = new Date(d + "T00:00:00");
                  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                }}
                formatter={(v: number, name: string) => [
                  `${v.toFixed(1)}%`,
                  name === "average_score" ? "Avg score" : name,
                ]}
              />
              <Line
                type="monotone"
                dataKey="average_score"
                stroke="var(--primary)"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "var(--sage)", stroke: "var(--primary)", strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>

    {/* ── PART C: Match Quality Validation ────────────────────────── */}
    <section className="mt-10">
      <div className="section-heading">
        <div>
          <h2 className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /> Match quality validation</h2>
          <p>Acceptance rate by score band — does the AI scoring correlate with human decisions?</p>
        </div>
      </div>
      <div className="panel">
        {scoreEffectiveness.isLoading ? (
          <div className="skeleton h-56" />
        ) : scoreEffectiveness.isError ? (
          <ErrorState message={scoreEffectiveness.error.message} />
        ) : !scoreEffectiveness.data || scoreEffectiveness.data.length === 0 ? (
          <p className="empty-copy">No effectiveness data available.</p>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
              {/* Bar chart */}
              <div style={{ minHeight: 240 }}>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={scoreEffectiveness.data.map((b) => ({
                      ...b,
                      display_rate: b.acceptance_rate !== null ? Math.round(b.acceptance_rate * 100) : 0,
                      has_data: b.acceptance_rate !== null,
                    }))}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" />
                    <XAxis
                      dataKey="band"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      tickFormatter={(v: number) => `${v}%`}
                      width={44}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                        fontSize: 13,
                      }}
                      formatter={(_: unknown, __: unknown, entry: { payload: { acceptance_rate: number | null; total_matches: number; accepted_count: number; rejected_count: number; pending_count: number } }) => {
                        const d = entry.payload;
                        if (d.acceptance_rate === null) return ["No decided matches", "Acceptance rate"];
                        return [`${(d.acceptance_rate * 100).toFixed(1)}% (${d.accepted_count} acc / ${d.rejected_count} rej / ${d.pending_count} pend)`, "Acceptance rate"];
                      }}
                    />
                    <Bar dataKey="display_rate" radius={[4, 4, 0, 0]}>
                      {scoreEffectiveness.data.map((_, i) => (
                        <Cell key={i} fill={bandColors[i] || "var(--muted)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Table */}
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <table className="w-full border-collapse text-left text-xs sm:text-sm">
                  <thead className="border-b border-border bg-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-3">Band</th>
                      <th className="py-2.5 px-1.5 text-center">Total</th>
                      <th className="py-2.5 px-1.5 text-center">Accepted</th>
                      <th className="py-2.5 px-1.5 text-center">Rejected</th>
                      <th className="py-2.5 px-1.5 text-center">Pending</th>
                      <th className="py-2.5 px-3 text-right">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scoreEffectiveness.data.map((b) => (
                      <tr key={b.band} className="border-b border-border/50 last:border-b-0 hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-3 font-semibold">{b.band}</td>
                        <td className="py-2 px-1.5 text-center text-muted-foreground">{b.total_matches}</td>
                        <td className="py-2 px-1.5 text-center font-medium text-emerald-600 dark:text-emerald-400">{b.accepted_count}</td>
                        <td className="py-2 px-1.5 text-center font-medium text-rose-600 dark:text-rose-400">{b.rejected_count}</td>
                        <td className="py-2 px-1.5 text-center text-muted-foreground">{b.pending_count}</td>
                        <td className="py-2 px-3 text-right font-bold">
                          {b.acceptance_rate !== null
                            ? `${(b.acceptance_rate * 100).toFixed(1)}%`
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Dynamic interpretation */}
            <p className="mt-5 rounded-md border border-border bg-muted px-4 py-3 text-sm leading-relaxed text-muted-foreground">
              {interpretEffectiveness(scoreEffectiveness.data)}
            </p>
          </>
        )}
      </div>
    </section>

    {/* ── All Matches Table (with Export CSV) ─────────────────────── */}
    <section className="mt-10"><div className="section-heading flex-wrap gap-4"><div><h2>All matches</h2><p>Filter, compare, and audit every recommendation on the platform.</p></div><div className="flex flex-wrap gap-2"><select className="filter-control" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}><option value="">All statuses</option><option value="pending">Pending</option><option value="notified">Notified</option><option value="accepted">Accepted</option><option value="rejected">Declined</option></select><input className="filter-control w-36" type="number" min="0" max="100" placeholder="Min score" value={minScore || ""} onChange={(e) => { setMinScore(Number(e.target.value)); setPage(0); }} /><select className="filter-control" value={sort} onChange={(e) => setSort(e.target.value)}><option value="desc">Best score first</option><option value="asc">Lowest score first</option></select><Button id="export-csv-btn" variant="outline" onClick={handleExportCsv}><Download className="size-4" />Export CSV</Button></div></div>
      <div className="overflow-x-auto rounded-lg border border-border bg-card"><table className="data-table"><thead><tr><th></th><th>Client</th><th>Supplier</th><th>Category</th><th>Score</th><th>Status</th><th>Created</th></tr></thead><tbody>{matches.isLoading ? <tr><td colSpan={7}><div className="skeleton h-24" /></td></tr> : matches.isError ? <tr><td colSpan={7} className="text-destructive">{matches.error.message}</td></tr> : matches.data?.items.length === 0 ? <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No matches fit these filters.</td></tr> : matches.data?.items.map((match) => <MatchRow key={match.id} match={match} isExpanded={expandedRows.has(match.id)} onToggle={() => toggleRow(match.id)} />)}</tbody></table></div>
      <div className="mt-4 flex items-center justify-between text-sm"><span>{matches.data ? `${matches.data.offset + 1}–${Math.min(matches.data.offset + matches.data.items.length, matches.data.total)} of ${matches.data.total}` : ""}</span><div className="flex gap-2"><Button variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button><Button variant="outline" disabled={!matches.data?.has_more} onClick={() => setPage((p) => p + 1)}>Next</Button></div></div>
    </section>
  </div>;
}

function MatchRow({ match, isExpanded, onToggle }: { match: Match; isExpanded: boolean; onToggle: () => void }) {
  const clientName = value(match.client_name ?? (match.client as Record<string, unknown> | undefined)?.["company_name"]);
  const supplierName = value(match.supplier_name ?? (match.supplier as Record<string, unknown> | undefined)?.["supplier_name"]);
  const matchCategory = value(match.category);
  const matchStatus = value(match.status, "Pending");
  const score = percent(match.match_score ?? match.score);
  const tone = score >= 75 ? "score-high" : score >= 50 ? "score-mid" : "score-low";
  const createdAt = match.created_at ? new Date(match.created_at as string).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <>
      <tr className="cursor-pointer transition-colors hover:bg-muted/50" onClick={onToggle}>
        <td className="w-10 text-center"><ChevronDown className={`inline-block size-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} /></td>
        <td>{clientName}</td>
        <td>{supplierName}</td>
        <td>{matchCategory}</td>
        <td><span className={`score-mini ${tone === "score-high" ? "" : tone === "score-mid" ? "score-mini-mid" : "score-mini-low"}`}>{score}%</span></td>
        <td><span className={`status-badge ${matchStatus === "accepted" ? "status-accepted" : matchStatus === "rejected" ? "status-rejected" : ""}`}>{statusLabel(matchStatus)}</span></td>
        <td className="text-muted-foreground">{createdAt}</td>
      </tr>
      {isExpanded && (
        <tr className="expanded-row">
          <td colSpan={7}>
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <div>
                <p className="mb-3 text-xs font-bold uppercase text-muted-foreground">Score breakdown</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {scoreKeys.map(([key, label]) => {
                    const v = normalized(match[key]);
                    return (
                      <div key={key}>
                        <div className="mb-1 flex justify-between text-xs font-semibold"><span>{label}</span><span>{Math.round(v)}%</span></div>
                        <div className="h-2 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(v, 100)}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="mb-3 text-xs font-bold uppercase text-muted-foreground">Match reasoning</p>
                <p className="text-sm leading-6 text-muted-foreground">{value(match.match_reason ?? match.reason, "No detailed reasoning available.")}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}