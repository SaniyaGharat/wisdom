import { AlertCircle, SearchX } from "lucide-react";

export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return <div className="mx-auto max-w-7xl space-y-5 px-4 py-10 sm:px-6"><div className="skeleton h-10 w-64" /><div className="skeleton h-24 w-full" />{Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton h-36 w-full" />)}</div>;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="mx-auto my-10 flex max-w-2xl gap-3 rounded-lg border border-rose/40 bg-rose-soft p-5 text-foreground"><AlertCircle className="mt-0.5 size-5 shrink-0 text-rose" /><div><strong>We hit a snag</strong><p className="mt-1 text-sm text-muted-foreground">{message}</p>{retry && <button className="mt-3 text-sm font-semibold underline" onClick={retry}>Try again</button>}</div></div>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="border-sketch flex min-h-64 flex-col items-center justify-center rounded-lg bg-card p-8 text-center"><span className="mb-4 grid size-14 place-items-center rounded-full bg-butter"><SearchX className="size-6" /></span><h3 className="font-display text-xl font-semibold">{title}</h3><p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}