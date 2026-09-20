import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, CheckCircle2, Search, Sparkles, Store } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/states";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Matchleaf — Thoughtful Procurement Matches" }, { name: "description", content: "AI-assisted matching that helps buyers and suppliers find a practical fit." }, { property: "og:title", content: "Matchleaf — Thoughtful Procurement Matches" }, { property: "og:description", content: "AI-assisted matching that helps buyers and suppliers find a practical fit." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Index,
});

function Index() {
  const summary = useQuery({ queryKey: ["summary"], queryFn: api.getSummary, retry: 1 });
  const stats = summary.data;
  return (
    <>
      <section className="hero-band">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:py-24">
          <div><span className="eyebrow"><Sparkles /> AI-assisted procurement</span><h1 className="mt-5 max-w-3xl font-display text-5xl font-semibold leading-[1.05] sm:text-6xl">Find the right business fit, without the guesswork.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">Matchleaf brings buyers and suppliers together using the details that actually shape a good working relationship—from capabilities and quantities to budget, location, and timing.</p><div className="mt-8 flex flex-wrap gap-3"><Button size="lg" asChild><Link to="/clients/new"><Search />I’m looking for a supplier<ArrowRight /></Link></Button><Button size="lg" variant="secondary" asChild><Link to="/suppliers/new"><Store />I’m a supplier<ArrowRight /></Link></Button></div></div>
          <div className="match-illustration" aria-hidden="true"><div className="illustration-card left"><Building2 /><span>Buyer needs</span></div><div className="illustration-heart"><Sparkles /></div><div className="illustration-card right"><Store /><span>Supplier fit</span></div><svg viewBox="0 0 500 230"><path d="M110 118 C190 18, 312 215, 400 108" /></svg></div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6"><div className="mb-5 flex items-end justify-between"><div><span className="eyebrow">Live marketplace</span><h2 className="mt-2 font-display text-3xl font-semibold">A growing network of good fits</h2></div></div>{summary.isError ? <ErrorState message={summary.error.message} retry={() => void summary.refetch()} /> : <div className="stat-grid">{[["Active clients", stats?.total_clients, "sage"], ["Ready suppliers", stats?.total_suppliers, "peach"], ["Matches made", stats?.total_matches, "lavender"], ["Average fit", `${Number(stats?.average_match_score ?? stats?.avg_match_score ?? 0).toFixed(0)}%`, "butter"]].map(([label, amount, tone]) => <div className={`stat-card bg-${tone}`} key={String(label)}><span>{label}</span>{summary.isLoading ? <div className="skeleton mt-3 h-9 w-20" /> : <strong>{String(amount ?? 0)}</strong>}</div>)}</div>}</section>
      <section className="how-band"><div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[.7fr_1.3fr]"><div><span className="eyebrow">How it works</span><h2 className="mt-3 font-display text-4xl font-semibold">Useful AI, explained simply.</h2></div><div className="grid gap-5 sm:grid-cols-3">{[["1", "Share the real details", "Tell us what you need or offer in your own words."], ["2", "We compare the fit", "AI reads meaning alongside practical constraints such as budget and delivery."], ["3", "You stay in control", "Review the score breakdown and reasoning, then accept or decline."]].map(([n, title, copy]) => <div key={n} className="process-step"><span>{n}</span><h3>{title}</h3><p>{copy}</p><CheckCircle2 /></div>)}</div></div></section>
    </>
  );
}
