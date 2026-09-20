import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, Building2, Handshake, Play, RefreshCw, Store } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/states";

const activityIcons: Record<string, React.ReactNode> = { client_created: <Building2 />, supplier_created: <Store />, match_created: <Handshake />, notification_sent: <Bell /> };
const value = (input: unknown, fallback = "—") => typeof input === "string" || typeof input === "number" ? String(input) : fallback;
const percent = (input: unknown) => { const score = Number(input ?? 0); return Math.round(score <= 1 ? score * 100 : score); };

export function AdminDashboard() {
  const [status, setStatus] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [sort, setSort] = useState("desc");
  const [page, setPage] = useState(0);
  const [running, setRunning] = useState(false);
  const limit = 10;
  const params = useMemo(() => { const p = new URLSearchParams({ limit: String(limit), offset: String(page * limit), sort_by: "match_score", sort_order: sort }); if (status) p.set("status", status); if (minScore) p.set("min_score", String(minScore)); return p; }, [status, minScore, sort, page]);
  const summary = useQuery({ queryKey: ["summary"], queryFn: api.getSummary, retry: 1 });
  const categories = useQuery({ queryKey: ["categories"], queryFn: api.getCategoryBreakdown, retry: 1 });
  const activity = useQuery({ queryKey: ["activity"], queryFn: api.getRecentActivity, retry: 1 });
  const matches = useQuery({ queryKey: ["matches", params.toString()], queryFn: () => api.getMatches(params), retry: 1 });
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
  async function runAll() { setRunning(true); try { await api.runAllMatching(); toast.success("Platform-wide matching complete"); await Promise.all([summary.refetch(), matches.refetch(), activity.refetch(), categories.refetch()]); } catch (error) { toast.error(error instanceof Error ? error.message : "Matching failed"); } finally { setRunning(false); } }
  return <div className="page-wrap">
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><span className="eyebrow">Platform overview</span><h1 className="page-title mt-3">Matching desk</h1><p className="mt-2 text-muted-foreground">A live view of marketplace health, quality, and activity.</p></div><Button onClick={runAll} disabled={running}><Play />{running ? "Running…" : "Run matching for everyone"}</Button></div>
    {summary.isError ? <ErrorState message={summary.error.message} /> : <div className="stat-grid">{[
      ["Clients", stats?.total_clients, "sage"], ["Suppliers", stats?.total_suppliers, "peach"], ["Matches", stats?.total_matches, "lavender"], ["Average score", `${Number(stats?.average_match_score ?? stats?.avg_match_score ?? 0).toFixed(0)}%`, "butter"]
    ].map(([label, amount, tone]) => <div key={String(label)} className={`stat-card bg-${tone}`}><span>{label}</span>{summary.isLoading ? <div className="skeleton mt-4 h-9 w-20" /> : <strong>{value(amount, "0")}</strong>}</div>)}</div>}
    {stats?.matches_by_status && <div className="mt-4 flex flex-wrap gap-2">{Object.entries(stats.matches_by_status).map(([name, count]) => <span className="status-badge" key={name}>{name}: {count}</span>)}</div>}
    <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
      <section><div className="section-heading"><div><h2>Category breakdown</h2><p>Match volume across the marketplace.</p></div></div><div className="panel min-h-72">{categories.isLoading ? <div className="space-y-5">{[1,2,3,4].map((i) => <div className="skeleton h-9" key={i} />)}</div> : categories.isError ? <ErrorState message={categories.error.message} /> : bars.length === 0 ? <p className="empty-copy">No category data yet.</p> : <div className="space-y-5">{bars.map((bar, index) => <div key={bar.name}><div className="mb-1.5 flex justify-between text-sm"><span className="font-semibold">{bar.name}</span><span className="text-muted-foreground">{bar.count} {bar.count === 1 ? "match" : "matches"}{bar.score != null && bar.score > 0 ? ` · ${Math.round(bar.score)}% avg` : ""}</span></div><div className="h-4 rounded bg-muted"><div className={`h-full rounded ${index % 3 === 0 ? "bg-primary" : index % 3 === 1 ? "bg-peach" : "bg-lavender"}`} style={{ width: `${(bar.count / max) * 100}%` }} /></div></div>)}</div>}</div></section>
      <section><div className="section-heading"><div><h2>Recent activity</h2><p>What just happened.</p></div></div><div className="panel min-h-72">{activity.isLoading ? <div className="space-y-3">{[1,2,3].map((i) => <div className="skeleton h-16" key={i} />)}</div> : activity.isError ? <ErrorState message={activity.error.message} /> : activity.data?.items.length === 0 ? <p className="empty-copy">The activity feed is quiet.</p> : <div className="space-y-4">{activity.data?.items.map((item, index) => <div className="flex gap-3" key={value(item["id"], String(index))}><span className="activity-icon">{activityIcons[value(item["event_type"] ?? item["type"])] || <RefreshCw />}</span><div><p className="text-sm font-semibold">{value(item["message"] ?? item["description"], "Platform activity")}</p><p className="text-xs text-muted-foreground">{value(item["created_at"], "Just now")}</p></div></div>)}</div>}</div></section>
    </div>
    <section className="mt-10"><div className="section-heading flex-wrap gap-4"><div><h2>All matches</h2><p>Filter and compare every recommendation.</p></div><div className="flex flex-wrap gap-2"><select className="filter-control" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}><option value="">All statuses</option><option value="pending">Pending</option><option value="notified">Notified</option><option value="accepted">Accepted</option><option value="declined">Declined</option></select><input className="filter-control w-36" type="number" min="0" max="100" placeholder="Min score" value={minScore || ""} onChange={(e) => { setMinScore(Number(e.target.value)); setPage(0); }} /><select className="filter-control" value={sort} onChange={(e) => setSort(e.target.value)}><option value="desc">Best score first</option><option value="asc">Lowest score first</option></select></div></div>
      <div className="overflow-x-auto rounded-lg border border-border bg-card"><table className="data-table"><thead><tr><th>Client</th><th>Supplier</th><th>Category</th><th>Score</th><th>Status</th></tr></thead><tbody>{matches.isLoading ? <tr><td colSpan={5}><div className="skeleton h-24" /></td></tr> : matches.isError ? <tr><td colSpan={5} className="text-destructive">{matches.error.message}</td></tr> : matches.data?.items.length === 0 ? <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No matches fit these filters.</td></tr> : matches.data?.items.map((match) => <tr key={match.id}><td>{value(match.client_name ?? (match.client as Record<string, unknown> | undefined)?.["company_name"])}</td><td>{value(match.supplier_name ?? (match.supplier as Record<string, unknown> | undefined)?.["supplier_name"])}</td><td>{value(match.category)}</td><td><span className="score-mini">{percent(match.match_score ?? match.score)}%</span></td><td><span className="status-badge">{value(match.status, "Pending")}</span></td></tr>)}</tbody></table></div>
      <div className="mt-4 flex items-center justify-between text-sm"><span>{matches.data ? `${matches.data.offset + 1}–${Math.min(matches.data.offset + matches.data.items.length, matches.data.total)} of ${matches.data.total}` : ""}</span><div className="flex gap-2"><Button variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button><Button variant="outline" disabled={!matches.data?.has_more} onClick={() => setPage((p) => p + 1)}>Next</Button></div></div>
    </section>
  </div>;
}