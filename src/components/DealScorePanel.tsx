import { useState } from "react";
import { ChevronDown, TrendingUp, Sparkles, Target } from "lucide-react";
import type { DealScore } from "@/lib/underwriting";

/**
 * Presentation-only Deal Score panel.
 * The score, its categories, maxes and explanation come straight from the
 * canonical underwriting engine (computeUnderwriting().score). Nothing is
 * re-scored here — only improvement guidance is derived from the metrics.
 */
export interface ScoreInputs {
  roi: number;
  capRate: number;
  dscr: number;
  onePctTest: number;
  annualCF: number;
}

interface DealScorePanelProps {
  dealScore: DealScore;
  inputs: ScoreInputs;
}

const TIPS: ((i: ScoreInputs) => string | null)[] = [
  (i) =>
    i.roi >= 15
      ? null
      : i.roi >= 8
      ? "Push cash-on-cash higher — negotiate 3-5% off price or increase rent."
      : "Cash-on-cash is thin. Lower purchase price, cut rehab, or add unit income (parking, laundry).",
  (i) =>
    i.capRate >= 7
      ? null
      : i.capRate >= 5
      ? "Trim recurring OpEx (self-manage, shop insurance) to lift cap rate."
      : "Cap rate is below market — reprice the offer or look at a higher-rent submarket.",
  (i) =>
    i.dscr >= 1.25
      ? null
      : "Boost down payment 5%, extend term to 30 yrs, or raise rents to clear 1.25 DSCR.",
  (i) =>
    i.onePctTest >= 1
      ? null
      : "Aim for monthly rent ≥ 1% of price. Re-check comps or negotiate the price down.",
  (i) =>
    i.annualCF > 0
      ? null
      : "Cash flow is negative — reduce mortgage insurance (20% down), refinance, or drop non-essential OpEx.",
];

export default function DealScorePanel({ dealScore, inputs }: DealScorePanelProps) {
  const [open, setOpen] = useState(false);
  const score = dealScore.total;

  const tier =
    dealScore.verdict === "Excellent"
      ? { label: "Excellent deal", emoji: "🏆", color: "hsl(152 70% 55%)", ring: "ring-success/40" }
      : dealScore.verdict === "Good"
      ? { label: "Solid deal", emoji: "👍", color: "hsl(152 70% 55%)", ring: "ring-success/30" }
      : dealScore.verdict === "Marginal"
      ? { label: "Marginal", emoji: "⚠️", color: "hsl(38 95% 60%)", ring: "ring-warning/40" }
      : { label: "High risk", emoji: "🚨", color: "hsl(0 80% 62%)", ring: "ring-destructive/40" };

  const tips = TIPS.map((t) => t(inputs)).filter((t): t is string => Boolean(t));
  const roundedScore = Math.round(score);

  return (
    <div className={`panel overflow-hidden transition-all ${tier.ring} ring-1`}>
      <div className="flex items-center gap-8 flex-wrap">
        {/* Score ring */}
        <div className="relative w-40 h-40 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90 drop-shadow-[0_0_18px_hsl(258_90%_66%/0.35)]">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(232 28% 16%)" strokeWidth="3" />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke={tier.color}
              strokeWidth="3"
              strokeDasharray={`${Math.max(0, Math.min(100, score))} 100`}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1)" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold font-mono tracking-tight">{roundedScore}</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">/ 100</span>
          </div>
        </div>

        {/* Verdict + CTA */}
        <div className="flex-1 min-w-[240px] space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Deal Score</h3>
            <span className="text-[10px] uppercase tracking-widest text-primary/80">Live</span>
          </div>
          <p className="text-2xl font-bold font-display">
            <span className="mr-2">{tier.emoji}</span>
            {tier.label}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">{dealScore.explanation}</p>
          {!dealScore.marketScored && (
            <p className="text-[11px] text-muted-foreground/80">
              Market category not scored — no verified market data attached. Score normalised across the remaining categories.
            </p>
          )}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-glow transition-colors"
          >
            {open ? "Hide breakdown & tips" : "See how we arrived at this score"}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* Dropdown */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr] mt-6" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border/60 pt-5 space-y-5">
            {/* Component breakdown */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground">Score composition</h4>
              </div>
              <div className="space-y-2.5">
                {dealScore.categories.map((c) => {
                  const pct = c.max > 0 ? Math.max(0, Math.min(100, (Math.max(0, c.score) / c.max) * 100)) : 0;
                  return (
                    <div key={c.key} className="space-y-1">
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="font-medium text-foreground">{c.label}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          <span className="text-foreground">{c.score.toFixed(1)}</span>
                          <span className="text-muted-foreground/60"> / {c.max} pts</span>
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary-glow)))",
                          }}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">{c.detail}</p>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total</span>
                <span className="font-mono text-sm">
                  <span className="font-bold text-foreground">{roundedScore}</span>
                  <span className="text-muted-foreground/60"> / 100</span>
                </span>
              </div>
            </div>

            {/* Tips */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                {tips.length > 0 ? (
                  <TrendingUp className="w-4 h-4 text-warning" />
                ) : (
                  <Sparkles className="w-4 h-4 text-success" />
                )}
                <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground">
                  {tips.length > 0 ? "How to improve" : "Nothing to fix"}
                </h4>
              </div>
              {tips.length > 0 ? (
                <ul className="space-y-2">
                  {tips.map((t, i) => (
                    <li
                      key={i}
                      className="flex gap-3 text-sm text-muted-foreground leading-relaxed rounded-lg border border-border/50 bg-secondary/30 p-3"
                    >
                      <span className="text-primary font-bold mt-0.5">→</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed rounded-lg border border-success/30 bg-success/5 p-3">
                  Every scoring lever is maxed out. Stress-test with Monte Carlo and lock the deal.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
