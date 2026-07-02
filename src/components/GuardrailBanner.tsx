import { AlertOctagon, AlertTriangle, Info } from "lucide-react";
import type { GuardrailFlag, GuardrailSeverity } from "@/lib/guardrails";

const CFG: Record<GuardrailSeverity, {
  ring: string; bg: string; text: string; icon: typeof Info; label: string;
}> = {
  critical: {
    ring: "border-destructive/50",
    bg: "bg-destructive/10",
    text: "text-destructive",
    icon: AlertOctagon,
    label: "Critical",
  },
  warning: {
    ring: "border-amber-500/50",
    bg: "bg-amber-500/10",
    text: "text-amber-500",
    icon: AlertTriangle,
    label: "Warning",
  },
  info: {
    ring: "border-primary/40",
    bg: "bg-primary/10",
    text: "text-primary",
    icon: Info,
    label: "Disclosure",
  },
};

interface Props {
  flags: GuardrailFlag[];
  title?: string;
  compact?: boolean;
}

/**
 * Institutional risk-flag banner. Renders 0…N guardrail flags in a single
 * grouped panel; hides itself when no flags are present.
 */
export default function GuardrailBanner({ flags, title, compact }: Props) {
  if (!flags.length) return null;
  return (
    <div className="panel space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold font-display tracking-tight">
          {title ?? "Underwriting Disclosures"}
        </h3>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {flags.length} {flags.length === 1 ? "flag" : "flags"}
        </span>
      </div>
      <div className={`grid gap-2 ${compact ? "" : "md:grid-cols-2"}`}>
        {flags.map((f) => {
          const c = CFG[f.severity];
          const Icon = c.icon;
          return (
            <div
              key={f.code}
              className={`rounded-xl border ${c.ring} ${c.bg} p-3 flex gap-3`}
            >
              <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${c.text}`} />
              <div className="min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${c.text}`}>
                    {c.label}
                  </span>
                  <span className="text-sm font-semibold text-foreground truncate">
                    {f.title}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {f.message}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
