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
    <div className="bg-card rounded-xl p-5 border border-border glow-primary mb-6">
      <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">{title}</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((item) => (
          <div key={item.label}>
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="text-xl font-bold font-mono text-foreground">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
