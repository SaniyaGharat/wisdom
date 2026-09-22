import { useEffect, useState } from "react";
import { Brain, Filter, Calculator, Trophy, Check, Loader2 } from "lucide-react";

interface MatchmakingProgressModalProps {
  isOpen: boolean;
  title?: string;
}

const STAGES = [
  {
    step: 1,
    title: "Vectorizing requirements...",
    desc: "Generating dense semantic embeddings via SentenceTransformers",
    icon: Brain,
    tone: "bg-sage/40 text-primary border-primary/30",
  },
  {
    step: 2,
    title: "Filtering by category and location...",
    desc: "Aligning industrial taxonomy and geographical proximity",
    icon: Filter,
    tone: "bg-peach/40 text-amber-800 dark:text-amber-200 border-peach/50",
  },
  {
    step: 3,
    title: "Computing business constraints...",
    desc: "Scoring capacity volumes, target budget thresholds, and lead times",
    icon: Calculator,
    tone: "bg-lavender/40 text-purple-900 dark:text-purple-200 border-lavender/50",
  },
  {
    step: 4,
    title: "Ranking matches...",
    desc: "Synthesizing composite scores and executive analyst briefings",
    icon: Trophy,
    tone: "bg-butter/50 text-amber-900 dark:text-amber-100 border-butter/60",
  },
];

export function MatchmakingProgressModal({
  isOpen,
  title = "AI Matchmaking Engine",
}: MatchmakingProgressModalProps) {
  const [currentStage, setCurrentStage] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStage(0);
      return;
    }

    // Step through stages with timed intervals (~600ms per stage)
    const timers: NodeJS.Timeout[] = [];

    timers.push(
      setTimeout(() => {
        setCurrentStage((prev) => (prev < 1 ? 1 : prev));
      }, 550)
    );

    timers.push(
      setTimeout(() => {
        setCurrentStage((prev) => (prev < 2 ? 2 : prev));
      }, 1150)
    );

    timers.push(
      setTimeout(() => {
        // Hold on stage 3 ("Ranking matches...") until real API response resolves
        setCurrentStage((prev) => (prev < 3 ? 3 : prev));
      }, 1750)
    );

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const progressPercent = Math.round(((currentStage + 1) / STAGES.length) * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="progress-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
              <Loader2 className="size-5 animate-spin" />
            </span>
            <div>
              <h3 id="progress-modal-title" className="font-display text-lg font-semibold text-foreground">
                {title}
              </h3>
              <p className="text-xs text-muted-foreground">Evaluating live supplier catalogs</p>
            </div>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-foreground">
            {progressPercent}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Stepper list */}
        <div className="mt-6 space-y-3">
          {STAGES.map((stage, idx) => {
            const isCompleted = currentStage > idx;
            const isCurrent = currentStage === idx;
            const isUpcoming = currentStage < idx;
            const Icon = stage.icon;

            return (
              <div
                key={stage.step}
                className={`flex items-start gap-3.5 rounded-xl border p-3 transition-all duration-300 ${
                  isCurrent
                    ? `${stage.tone} shadow-xs scale-[1.01]`
                    : isCompleted
                    ? "border-border/60 bg-muted/40 text-muted-foreground"
                    : "border-transparent text-muted-foreground/50 opacity-60"
                }`}
              >
                <div
                  className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-all ${
                    isCompleted
                      ? "bg-primary text-primary-foreground"
                      : isCurrent
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? <Check className="size-4 stroke-[3]" /> : stage.step}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm font-semibold tracking-tight ${
                        isCurrent ? "text-foreground font-bold" : isCompleted ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {stage.title}
                    </p>
                    {isCurrent && <Loader2 className="size-3.5 animate-spin text-primary shrink-0" />}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{stage.desc}</p>
                </div>

                <Icon className={`size-4 shrink-0 mt-1 ${isCurrent ? "text-primary" : "text-muted-foreground/40"}`} />
              </div>
            );
          })}
        </div>

        {/* Footnote */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Calibrating semantic relevance alongside business rules…
        </p>
      </div>
    </div>
  );
}
