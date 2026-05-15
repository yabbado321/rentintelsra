import { useMemo } from "react";
import { Activity, Building2, DollarSign, Wrench, MessageSquare, TrendingUp, Bot } from "lucide-react";
import { usePortfolio } from "@/lib/portfolio";
import { formatCurrency } from "@/lib/calculations";

interface Props { onNavigate: (page: string) => void }

export default function PortfolioDashboardPage({ onNavigate }: Props) {
  const { units, tickets, conversations } = usePortfolio();

  const kpis = useMemo(() => {
    const occupied = units.filter((u) => u.occupied).length;
    const occPct = units.length ? (occupied / units.length) * 100 : 0;
    const monthlyRent = units.reduce((s, u) => s + (u.occupied ? u.currentRent : 0), 0);
    const annualRent = monthlyRent * 12;
    const noiAssumption = annualRent * 0.55; // rough 55% NOI margin until expenses page integration
    const lift = units.reduce((s, u) => s + Math.max(0, (u.suggestedRent ?? 0) - u.currentRent), 0) * 12;
    const openTickets = tickets.filter((t) => t.status !== "Closed" && t.status !== "Resolved").length;
    return { occPct, monthlyRent, annualRent, noiAssumption, lift, openTickets };
  }, [units, tickets]);

  const recent = useMemo(() => {
    const items: { icon: any; tone: string; text: string; at: string }[] = [];
    for (const t of tickets.slice(0, 5)) items.push({ icon: Wrench, tone: "text-warning", text: `${t.priority} · ${t.summary || t.description.slice(0, 60)}`, at: t.createdAt });
    for (const c of conversations.slice(0, 5)) items.push({ icon: MessageSquare, tone: "text-success", text: `Reply drafted for ${c.tenantName}`, at: c.updatedAt });
    for (const u of units.filter((u) => u.suggestedRent).slice(0, 5)) items.push({ icon: TrendingUp, tone: "text-primary", text: `AI suggests ${formatCurrency(u.suggestedRent!)} for ${u.label} (${u.address})`, at: u.pricingUpdatedAt ?? new Date().toISOString() });
    return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
  }, [units, tickets, conversations]);

  return (
    <div className="space-y-7">
      <header className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold font-display">Portfolio Dashboard</h1>
          <p className="text-muted-foreground mt-2">Live KPIs across every unit you've added — occupancy, revenue, NOI, and the AI's open recommendations.</p>
        </div>
        <button onClick={() => onNavigate("pricing")} className="btn-primary"><TrendingUp size={14}/> Run AI pricing</button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Units" value={units.length.toString()} sub={`${units.filter(u=>u.occupied).length} occupied`} />
        <Kpi label="Occupancy" value={`${kpis.occPct.toFixed(1)}%`} sub="across portfolio" tone={kpis.occPct >= 90 ? "success" : "warning"} />
        <Kpi label="Monthly rent" value={formatCurrency(kpis.monthlyRent)} sub={`${formatCurrency(kpis.annualRent)} annualized`} />
        <Kpi label="Annual NOI lift" value={formatCurrency(kpis.lift)} sub={kpis.lift > 0 ? "from AI pricing" : "run AI pricing →"} tone="success" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="panel lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold">Units</h3>
            <button onClick={() => onNavigate("pricing")} className="text-xs text-primary hover:underline">Manage units →</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border/60">
                <th className="text-left py-2">Unit</th><th className="text-left py-2">Address</th><th className="text-right py-2">Rent</th><th className="text-right py-2">AI Suggest</th><th className="text-right py-2">Status</th>
              </tr></thead>
              <tbody>
                {units.map((u) => {
                  const delta = u.suggestedRent ? u.suggestedRent - u.currentRent : 0;
                  return (
                    <tr key={u.id} className="border-t border-border/40">
                      <td className="py-2.5 font-medium flex items-center gap-2"><Building2 className="w-3.5 h-3.5 text-primary/70"/>{u.label}</td>
                      <td className="py-2.5 text-muted-foreground">{u.address} · {u.zip}</td>
                      <td className="py-2.5 text-right font-mono">{formatCurrency(u.currentRent)}</td>
                      <td className="py-2.5 text-right font-mono">
                        {u.suggestedRent ? <span className={delta > 0 ? "text-success" : "text-muted-foreground"}>{formatCurrency(u.suggestedRent)}{delta > 0 ? ` (+${delta})` : ""}</span> : <span className="text-muted-foreground/50">—</span>}
                      </td>
                      <td className="py-2.5 text-right">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${u.occupied ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>{u.occupied ? "Occupied" : "Vacant"}</span>
                      </td>
                    </tr>
                  );
                })}
                {units.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No units yet — add some on the AI Pricing page.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="flex items-center gap-2 mb-4"><Activity className="w-4 h-4 text-primary"/><h3 className="font-display font-semibold">Recent activity</h3></div>
          <div className="space-y-2">
            {recent.length === 0 && <p className="text-sm text-muted-foreground">Activity will appear as you use Pricing, Maintenance, and Comms.</p>}
            {recent.map((r, i) => { const I = r.icon; return (
              <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-secondary/30 border border-border/40">
                <I className={`w-3.5 h-3.5 mt-0.5 ${r.tone}`}/>
                <span className="text-xs text-foreground/85 flex-1">{r.text}</span>
              </div>
            ); })}
          </div>
          <div className="mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground flex items-center gap-2">
            <Bot className="w-3.5 h-3.5 text-primary"/> {kpis.openTickets} open ticket{kpis.openTickets === 1 ? "" : "s"} · {conversations.length} tenant thread{conversations.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <QuickAction icon={TrendingUp} title="AI Rent Pricing" desc="Pull live comps and get a daily price per unit." onClick={() => onNavigate("pricing")} />
        <QuickAction icon={Wrench} title="Maintenance Autopilot" desc="Submit a ticket — AI triages priority, vendor, SLA." onClick={() => onNavigate("maintenance")} />
        <QuickAction icon={MessageSquare} title="Tenant Comms" desc="Draft on-brand replies grounded in lease terms." onClick={() => onNavigate("comms")} />
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "success" | "warning" }) {
  const toneCls = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "gradient-text";
  return (
    <div className="metric-card">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-2xl md:text-3xl font-bold font-display mt-1 ${toneCls}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function QuickAction({ icon: Icon, title, desc, onClick }: { icon: any; title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="metric-card text-left group">
      <Icon className="w-5 h-5 text-primary mb-3"/>
      <div className="font-semibold mb-1 group-hover:text-primary transition-colors">{title}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </button>
  );
}
