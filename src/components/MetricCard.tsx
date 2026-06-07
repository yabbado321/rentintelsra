import { ReactNode } from "react";
import InfoTooltip from "./InfoTooltip";

interface MetricCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  subtitle?: string;
  variant?: "default" | "success" | "warning" | "danger";
  /** Optional algebraic formula surfaced in a hover tooltip. */
  formula?: string;
  /** Optional plain-English note paired with the formula. */
  formulaNote?: string;
}

const variantStyles: Record<NonNullable<MetricCardProps["variant"]>, string> = {
  default: "",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
};

const variantRing: Record<NonNullable<MetricCardProps["variant"]>, string> = {
  default: "",
  success: "ring-1 ring-success/40 bg-success/5",
  warning: "ring-1 ring-warning/40 bg-warning/5",
  danger: "ring-1 ring-destructive/50 bg-destructive/5",
};

export default function MetricCard({
  label,
  value,
  icon,
  subtitle,
  variant = "default",
  formula,
  formulaNote,
}: MetricCardProps) {
  return (
    <div className={`metric-card group ${variantRing[variant]}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon && <span className="text-primary/80">{icon}</span>}
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.14em]">{label}</span>
        {formula && <InfoTooltip formula={formula} note={formulaNote} />}
      </div>
      <p className={`text-2xl font-bold font-mono tracking-tight ${variantStyles[variant] || "text-foreground"}`}>
        {value}
      </p>
      {subtitle && <p className="text-xs text-muted-foreground/80 mt-1">{subtitle}</p>}
    </div>
  );
}
