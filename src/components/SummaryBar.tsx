interface SummaryItem {
  label: string;
  value: string;
}

interface SummaryBarProps {
  title: string;
  items: SummaryItem[];
}

export default function SummaryBar({ title, items }: SummaryBarProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 p-6 mb-6 shadow-elegant">
      <div className="absolute inset-0 gradient-primary opacity-[0.08] -z-10" />
      <div className="absolute inset-0 bg-card/70 backdrop-blur-xl -z-10" />
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.18em]">{title}</h4>
        <span className="text-[10px] uppercase tracking-widest text-primary/80">Live</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {items.map((item) => (
          <div key={item.label} className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{item.label}</p>
            <p className="text-2xl font-bold font-mono tracking-tight text-foreground">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
