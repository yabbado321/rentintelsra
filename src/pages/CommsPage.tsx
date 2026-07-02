import { useMemo, useState } from "react";
import { MessageSquare, Loader2, Bot, Send, Copy, Check } from "lucide-react";
import { usePortfolio } from "@/lib/portfolio";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { stripLeaseCitations } from "@/lib/guardrails";

export default function CommsPage() {
  const { units, conversations, upsertConversation } = usePortfolio();
  const [unitId, setUnitId] = useState(units.find((u) => u.occupied)?.id ?? units[0]?.id ?? "");
  const [tenantMsg, setTenantMsg] = useState("");
  const [leaseNotes, setLeaseNotes] = useState("Rent due 1st of month, 5-day grace, $75 late fee, ACH/credit card accepted via portal.");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<{ reply: string; sentiment?: string; churnRisk?: string; suggestedAction?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const unit = useMemo(() => units.find((u) => u.id === unitId), [units, unitId]);

  const draft = async () => {
    if (!unit) { toast.error("Select a unit"); return; }
    if (!tenantMsg.trim()) { toast.error("Paste the tenant's message"); return; }
    setBusy(true); setReply(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-assist", {
        body: { kind: "reply", tenantMessage: tenantMsg, tenantName: unit.tenantName ?? "Tenant", unit: unit.label, rent: unit.currentRent, leaseNotes },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      // Guardrail: scrub any fabricated lease clause citations before display
      const sanitized = { ...data, reply: stripLeaseCitations(data.reply ?? "") };
      setReply(sanitized);
      const convId = `c-${unit.id}`;
      const existing = conversations.find((c) => c.id === convId);
      const now = new Date().toISOString();
      upsertConversation({
        id: convId, unitId: unit.id, tenantName: unit.tenantName ?? "Tenant",
        sentiment: data.sentiment, churnRisk: data.churnRisk, updatedAt: now,
        messages: [
          ...(existing?.messages ?? []),
          { role: "tenant", text: tenantMsg, at: now },
          { role: "ai", text: data.reply, at: now, meta: { sentiment: data.sentiment, churnRisk: data.churnRisk } },
        ],
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reply failed");
    } finally { setBusy(false); }
  };

  const copy = async () => {
    if (!reply) return;
    await navigator.clipboard.writeText(reply.reply);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  const conv = conversations.find((c) => c.unitId === unitId);

  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-4xl font-bold font-display">Tenant Comms</h1>
        <p className="text-muted-foreground mt-2">Paste a tenant message — get an on-brand, lease-aware reply, plus sentiment and churn risk.</p>
      </header>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="panel space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Unit / tenant</label>
              <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className="input-field">
                {units.map((u) => <option key={u.id} value={u.id}>{u.label} · {u.tenantName ?? "—"}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Monthly rent</label>
              <input className="input-field font-mono" value={unit?.currentRent ?? ""} readOnly />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Lease notes for AI grounding</label>
            <textarea value={leaseNotes} onChange={(e) => setLeaseNotes(e.target.value)} rows={2} className="input-field text-xs" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Tenant message</label>
            <textarea value={tenantMsg} onChange={(e) => setTenantMsg(e.target.value)} rows={5} placeholder="Hi, when is rent due this month and is the late fee still $75? Also can I pay by ACH?" className="input-field" />
          </div>
          <button onClick={draft} disabled={busy} className="btn-primary">
            {busy ? <Loader2 className="w-4 h-4 animate-spin"/> : <Bot className="w-4 h-4"/>}
            {busy ? "Drafting…" : "Draft AI reply"}
          </button>
        </div>

        <div className="panel min-h-[300px]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-primary"/><span className="font-semibold text-sm">AI draft</span></div>
            {reply && <button onClick={copy} className="text-xs flex items-center gap-1 text-muted-foreground hover:text-primary">{copied ? <Check className="w-3 h-3"/> : <Copy className="w-3 h-3"/>}{copied ? "Copied" : "Copy"}</button>}
          </div>
          {reply ? (
            <>
              <div className="rounded-xl gradient-primary text-primary-foreground p-4 text-sm leading-relaxed whitespace-pre-wrap">{reply.reply}</div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
                <Pill label="Sentiment" value={reply.sentiment ?? "—"} />
                <Pill label="Churn risk" value={reply.churnRisk ?? "—"} />
                <Pill label="Suggested action" value={reply.suggestedAction ?? "—"} />
              </div>
              <button className="btn-ghost mt-3 text-xs"><Send className="w-3.5 h-3.5"/> Send via portal (demo)</button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Draft a reply to see it here.</p>
          )}
        </div>
      </div>

      {conv && conv.messages.length > 0 && (
        <div className="panel">
          <h3 className="font-display font-semibold mb-3">Thread · {conv.tenantName}</h3>
          <div className="space-y-2">
            {conv.messages.slice(-10).map((m, i) => (
              <div key={i} className={`flex ${m.role === "tenant" ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${m.role === "tenant" ? "bg-secondary/60 border border-border/60" : "gradient-primary text-primary-foreground"}`}>{m.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-secondary/40 border border-border/50 px-2.5 py-1.5"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div><div className="text-xs font-semibold">{value}</div></div>;
}
