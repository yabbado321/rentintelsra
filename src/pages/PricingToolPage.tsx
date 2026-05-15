import { useState } from "react";
import { Plus, TrendingUp, Trash2, Loader2, Building2, Sparkles } from "lucide-react";
import { usePortfolio, type Unit } from "@/lib/portfolio";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/calculations";
import { toast } from "sonner";

export default function PricingToolPage() {
  const { units, addUnit, updateUnit, removeUnit } = usePortfolio();
  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<Unit, "id">>({
    label: "", address: "", zip: "", beds: 2, baths: 1, sqft: 900, currentRent: 1500, occupied: true,
  });

  const runPricing = async (u: Unit) => {
    if (!/^\d{5}$/.test(u.zip)) { toast.error("Unit needs a valid 5-digit ZIP"); return; }
    setBusy(u.id);
    try {
      const { data, error } = await supabase.functions.invoke("area-insights", {
        body: { zip: u.zip, address: u.address, beds: u.beds, baths: u.baths, sqft: u.sqft },
      });
      if (error) throw error;
      const re = data?.rentEstimates;
      const subj: number | undefined = re?.subjectEstimate ?? re?.medianOverall;
      const conf = data?.dataConfidence === "High" ? 92 : data?.dataConfidence === "Medium" ? 80 : 65;
      if (!subj) throw new Error("AI returned no rent estimate");
      updateUnit(u.id, { suggestedRent: Math.round(subj), pricingConfidence: conf, pricingUpdatedAt: new Date().toISOString() });
      toast.success(`${u.label}: AI suggests ${formatCurrency(Math.round(subj))} (${conf}% conf.)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Pricing failed");
    } finally { setBusy(null); }
  };

  const runAll = async () => {
    for (const u of units) { await runPricing(u); }
  };

  const apply = (u: Unit) => {
    if (!u.suggestedRent) return;
    updateUnit(u.id, { currentRent: u.suggestedRent });
    toast.success(`${u.label} rent updated to ${formatCurrency(u.suggestedRent)}`);
  };

  const submitDraft = () => {
    if (!draft.label || !draft.address || !/^\d{5}$/.test(draft.zip)) { toast.error("Label, address, and 5-digit ZIP are required"); return; }
    addUnit(draft);
    setDraft({ label: "", address: "", zip: "", beds: 2, baths: 1, sqft: 900, currentRent: 1500, occupied: true });
    toast.success("Unit added");
  };

  const totalLift = units.reduce((s, u) => s + Math.max(0, (u.suggestedRent ?? 0) - u.currentRent), 0) * 12;

  return (
    <div className="space-y-7">
      <header className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold font-display">AI Rent Pricing</h1>
          <p className="text-muted-foreground mt-2">Pull live comps for every unit in your portfolio and apply optimized rent in one click.</p>
        </div>
        <div className="flex gap-3 items-center">
          {totalLift > 0 && <div className="text-right text-sm"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Annualized lift</div><div className="font-mono font-bold text-success">+{formatCurrency(totalLift)}</div></div>}
          <button onClick={runAll} disabled={!units.length || !!busy} className="btn-primary"><Sparkles size={14}/> Refresh all</button>
        </div>
      </header>

      <div className="panel space-y-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.18em]">Add unit</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Label" value={draft.label} onChange={(v) => setDraft({ ...draft, label: v })} placeholder="Unit 4B" />
          <Field label="Address" value={draft.address} onChange={(v) => setDraft({ ...draft, address: v })} placeholder="1142 Oak St" />
          <Field label="ZIP" value={draft.zip} onChange={(v) => setDraft({ ...draft, zip: v.replace(/\D/g, "").slice(0, 5) })} placeholder="78704" />
          <NumField label="Current rent" value={draft.currentRent} onChange={(v) => setDraft({ ...draft, currentRent: v })} step={50} />
          <NumField label="Beds" value={draft.beds} onChange={(v) => setDraft({ ...draft, beds: v })} />
          <NumField label="Baths" value={draft.baths} onChange={(v) => setDraft({ ...draft, baths: v })} step={0.5} />
          <NumField label="Sqft" value={draft.sqft} onChange={(v) => setDraft({ ...draft, sqft: v })} step={50} />
          <div className="flex flex-col">
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Status</label>
            <select value={draft.occupied ? "1" : "0"} onChange={(e) => setDraft({ ...draft, occupied: e.target.value === "1" })} className="input-field">
              <option value="1">Occupied</option><option value="0">Vacant</option>
            </select>
          </div>
        </div>
        <button onClick={submitDraft} className="btn-primary"><Plus size={14}/> Add to portfolio</button>
      </div>

      <div className="space-y-3">
        {units.map((u) => {
          const delta = u.suggestedRent ? u.suggestedRent - u.currentRent : 0;
          return (
            <div key={u.id} className="panel flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-[220px]">
                <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground"><Building2 size={18}/></div>
                <div>
                  <div className="font-semibold">{u.label}</div>
                  <div className="text-xs text-muted-foreground">{u.address} · {u.zip} · {u.beds}bd/{u.baths}ba · {u.sqft} sqft</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Current</div>
                <div className="font-mono font-bold">{formatCurrency(u.currentRent)}</div>
              </div>
              <div className="text-right min-w-[120px]">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">AI suggestion</div>
                {u.suggestedRent ? (
                  <div className={`font-mono font-bold ${delta > 0 ? "text-success" : "text-muted-foreground"}`}>
                    {formatCurrency(u.suggestedRent)} {delta !== 0 && <span className="text-xs">({delta > 0 ? "+" : ""}{delta})</span>}
                    <div className="text-[10px] text-muted-foreground">{u.pricingConfidence}% conf · {u.pricingUpdatedAt ? new Date(u.pricingUpdatedAt).toLocaleString() : ""}</div>
                  </div>
                ) : <div className="text-muted-foreground/50 text-sm">—</div>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => runPricing(u)} disabled={busy === u.id} className="btn-ghost text-xs">
                  {busy === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <TrendingUp className="w-3.5 h-3.5"/>}
                  {busy === u.id ? "Analyzing…" : "Run AI"}
                </button>
                {u.suggestedRent && delta !== 0 && (
                  <button onClick={() => apply(u)} className="text-xs font-semibold px-3 py-1.5 rounded-lg gradient-primary text-primary-foreground">Apply</button>
                )}
                <button onClick={() => removeUnit(u.id)} aria-label={`Remove ${u.label}`} className="p-2 rounded-md text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5"/></button>
              </div>
            </div>
          );
        })}
        {units.length === 0 && <div className="rounded-2xl p-10 text-center border border-dashed border-border/70 bg-secondary/20 text-muted-foreground">Add your first unit above to start pulling AI pricing.</div>}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const id = `f-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground block mb-1.5">{label}</label>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input-field" />
    </div>
  );
}
function NumField({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  const id = `n-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground block mb-1.5">{label}</label>
      <input id={id} type="number" value={value} step={step} onChange={(e) => onChange(Number(e.target.value))} className="input-field font-mono" />
    </div>
  );
}
