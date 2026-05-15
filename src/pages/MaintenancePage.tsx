import { useMemo, useState } from "react";
import { Wrench, Loader2, Bot, ChevronRight, Trash2 } from "lucide-react";
import { usePortfolio, type Ticket } from "@/lib/portfolio";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PRIORITY_COLORS: Record<string, string> = {
  P1: "bg-destructive/15 text-destructive border-destructive/30",
  P2: "bg-warning/15 text-warning border-warning/30",
  P3: "bg-primary/15 text-primary border-primary/30",
};
const STATUSES: Ticket["status"][] = ["Open", "Dispatched", "Scheduled", "Resolved", "Closed"];

export default function MaintenancePage() {
  const { units, tickets, addTicket, updateTicket, removeTicket } = usePortfolio();
  const [unitId, setUnitId] = useState(units[0]?.id ?? "");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"all" | "open">("open");

  const visible = useMemo(() => {
    if (filter === "open") return tickets.filter((t) => t.status !== "Closed" && t.status !== "Resolved");
    return tickets;
  }, [tickets, filter]);

  const submit = async () => {
    if (!unitId || !desc.trim()) { toast.error("Pick a unit and describe the issue"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-assist", { body: { kind: "triage", description: desc } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      addTicket({
        unitId,
        description: desc,
        priority: data.priority ?? "P3",
        category: data.category ?? "General",
        severity: data.severity ?? "Standard",
        estimatedCostRange: data.estimatedCostRange ?? "—",
        vendorType: data.vendorType ?? "General contractor",
        slaHours: data.slaHours ?? 48,
        summary: data.summary ?? desc.slice(0, 80),
        selfFixSteps: data.tenantSelfFixSteps ?? [],
      });
      setDesc("");
      toast.success(`Ticket created · AI triaged as ${data.priority}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Triage failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-4xl font-bold font-display">Maintenance Autopilot</h1>
        <p className="text-muted-foreground mt-2">Submit any tenant request — AI scores priority, picks the vendor type, sets the SLA, and drafts safe self-fix steps.</p>
      </header>

      <div className="panel space-y-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.18em]">New maintenance request</h3>
        <div className="grid md:grid-cols-[200px_1fr_auto] gap-3">
          <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className="input-field">
            <option value="">Select unit…</option>
            {units.map((u) => <option key={u.id} value={u.id}>{u.label} · {u.address}</option>)}
          </select>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. There's water dripping from the ceiling under the upstairs bathroom and it's getting worse." className="input-field min-h-[44px]" rows={2} />
          <button onClick={submit} disabled={busy} className="btn-primary self-start">
            {busy ? <Loader2 className="w-4 h-4 animate-spin"/> : <Bot className="w-4 h-4"/>}
            {busy ? "Triaging…" : "AI triage"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => setFilter("open")} className={`text-xs px-3 py-1.5 rounded-full border ${filter === "open" ? "border-primary text-primary bg-primary/10" : "border-border/60 text-muted-foreground"}`}>Open</button>
        <button onClick={() => setFilter("all")} className={`text-xs px-3 py-1.5 rounded-full border ${filter === "all" ? "border-primary text-primary bg-primary/10" : "border-border/60 text-muted-foreground"}`}>All</button>
        <span className="text-xs text-muted-foreground ml-auto">{visible.length} ticket{visible.length === 1 ? "" : "s"}</span>
      </div>

      <div className="space-y-3">
        {visible.map((t) => {
          const unit = units.find((u) => u.id === t.unitId);
          return (
            <details key={t.id} className="panel group">
              <summary className="flex flex-wrap items-center gap-3 cursor-pointer list-none">
                <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded border ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                <div className="flex-1 min-w-[200px]">
                  <div className="font-semibold text-sm">{t.summary}</div>
                  <div className="text-xs text-muted-foreground">{unit?.label ?? "Unknown unit"} · {t.category} · SLA {t.slaHours}h · {t.estimatedCostRange}</div>
                </div>
                <select value={t.status} onChange={(e) => updateTicket(t.id, { status: e.target.value as Ticket["status"] })} onClick={(e) => e.stopPropagation()} className="text-xs px-2 py-1 rounded-md bg-secondary/60 border border-border/60">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={(e) => { e.preventDefault(); removeTicket(t.id); }} aria-label="Remove ticket" className="p-1.5 rounded-md text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5"/></button>
                <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-90" />
              </summary>
              <div className="mt-4 grid md:grid-cols-2 gap-4 text-sm border-t border-border/50 pt-4">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Tenant description</div>
                  <p className="text-foreground/90">{t.description}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <Meta label="Vendor type" value={t.vendorType}/>
                    <Meta label="Severity" value={t.severity}/>
                    <Meta label="Cost range" value={t.estimatedCostRange}/>
                    <Meta label="Created" value={new Date(t.createdAt).toLocaleString()}/>
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">AI self-fix steps for tenant</div>
                  {t.selfFixSteps.length ? (
                    <ol className="list-decimal list-inside space-y-1 text-foreground/90">{t.selfFixSteps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                  ) : <p className="text-muted-foreground text-xs">Not safe for tenant self-fix — vendor required.</p>}
                </div>
              </div>
            </details>
          );
        })}
        {visible.length === 0 && <div className="rounded-2xl p-10 text-center border border-dashed border-border/70 bg-secondary/20 text-muted-foreground">No tickets here. Submit a request above.</div>}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-secondary/40 border border-border/50 px-2 py-1.5"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div><div className="font-medium">{value}</div></div>;
}
