import { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  subtitle?: string;
  variant?: "default" | "success" | "warning" | "danger";
}

const variantStyles: Record<NonNullable<MetricCardProps["variant"]>, string> = {
  default: "",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
};

export default function MetricCard({ label, value, icon, subtitle, variant = "default" }: MetricCardProps) {
  return (
    <div className="metric-card group">
      <div className="flex items-center gap-2 mb-1.5">
        {icon && <span className="text-primary/80">{icon}</span>}
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className={`text-2xl font-bold font-mono tracking-tight ${variantStyles[variant] || "text-foreground"}`}>
        {value}
      </p>
      {subtitle && <p className="text-xs text-muted-foreground/80 mt-1">{subtitle}</p>}
    </div>
  );
}
