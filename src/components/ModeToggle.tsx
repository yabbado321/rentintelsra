import { Sparkles, SlidersHorizontal } from "lucide-react";

export type Mode = "simple" | "advanced";

export default function ModeToggle({ mode, onChange, hint }: { mode: Mode; onChange: (m: Mode) => void; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap rounded-2xl border border-border/60 bg-secondary/20 px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span>{hint || "Simple mode shows only the essentials. Switch to Advanced for full underwriting controls."}</span>
      </div>
      <div className="inline-flex rounded-xl border border-border/60 bg-background/40 p-1">
        {(["simple", "advanced"] as const).map((m) => (
          <button
            key={m}
            onClick={() => onChange(m)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all flex items-center gap-1.5
              ${mode === m ? "bg-primary text-primary-foreground shadow-elegant" : "text-muted-foreground hover:text-foreground"}`}
          >
            {m === "simple" ? <Sparkles className="w-3 h-3" /> : <SlidersHorizontal className="w-3 h-3" />}
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}
