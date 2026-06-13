import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, X, Save, RefreshCw, FileDown, Loader2, Check } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { usePropertyStore, useActiveProperty, type AIMemo } from "@/lib/propertyStore";
import { useToast } from "@/hooks/use-toast";
import UnderwritingReportPDF, { type UnderwritingReportData } from "./UnderwritingReportPDF";

interface Props {
  /** Live calculator-derived data, including monteCarlo & metrics. */
  reportData: UnderwritingReportData;
}

const LOADER_STAGES = [
  "Drafting executive summary…",
  "Structuring financial rationale…",
  "Analyzing Monte Carlo risk parameters…",
  "Polishing tactical recommendations…",
];

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v || 0);
const pct = (v: number, d = 1) => `${(v || 0).toFixed(d)}%`;

/** Deterministic-but-varied mock generator. `tone` rotates the narrative voice. */
function buildMemo(prop: ReturnType<typeof useActiveProperty>, r: UnderwritingReportData, tone = 0): AIMemo {
  const mc = r.monteCarlo;
  const successRate = mc ? Math.max(0, 100 - mc.probNegativeCF) : 78;
  const irr = mc?.expectedIRR ?? r.cashOnCash;
  const dscrLabel = r.dscr >= 1.25 ? "lender-qualified" : r.dscr >= 1 ? "marginal" : "sub-coverage";
  const zip = prop.zip ? ` (ZIP ${prop.zip})` : "";
  const specs = [
    prop.yearBuilt ? `built ${prop.yearBuilt}` : null,
    prop.squareFootage ? `${prop.squareFootage.toLocaleString()} sqft` : null,
  ].filter(Boolean).join(" · ");

  const tones = [
    { exec: "presents a disciplined entry into", risk: "Risk telemetry indicates", value: "Capture upside through" },
    { exec: "represents an opportunistic acquisition in", risk: "Stochastic modeling reveals", value: "Unlock premium yield via" },
    { exec: "constitutes a defensive cash-flow play in", risk: "Probabilistic stress-tests show", value: "Accelerate NOI growth with" },
  ];
  const t = tones[tone % tones.length];

  return {
    executiveSummary:
      `${prop.address}${zip} ${t.exec} the local rental market at an acquisition basis of ${fmt(r.purchasePrice)}. ` +
      `${specs ? `The asset (${specs}) ` : "The asset "}underwrites to a year-one cash-on-cash return of ${pct(r.cashOnCash)} ` +
      `and a cap rate of ${pct(r.capRate)}, supported by gross scheduled rent of ${fmt(r.grossRent)} per month. ` +
      `The investment thesis is anchored in stable in-place income, conservative leverage at ${fmt(r.loanAmount)} of debt, ` +
      `and a defensible ${dscrLabel} debt service coverage ratio of ${r.dscr.toFixed(2)}.`,

    financialAnalysis:
      `Total capital required at closing is ${fmt(r.totalCashIn)}, comprising ${fmt(r.downPayment)} equity, ` +
      `${fmt(r.closingCosts)} in closing costs, and ${fmt(r.rehab)} of day-one rehab. ` +
      `Stabilized monthly net operating income lands at ${fmt(r.noiMonthly)} against ${fmt(r.debtService)} of debt service, ` +
      `producing ${fmt(r.netCashFlow)} of free cash flow per month. ` +
      `Cash-on-cash of ${pct(r.cashOnCash)} compares favorably to passive benchmarks; ` +
      `exit strategy assumes a hold-and-refinance pathway once rents mature, with a secondary disposition lane should cap rates compress below ${pct(Math.max(0, r.capRate - 0.75))}.`,

    riskAppraisal: mc
      ? `Across ${mc.iterations.toLocaleString()} Monte Carlo iterations the deal posts a ${pct(successRate)} probability of clearing the target IRR threshold, ` +
        `with expected IRR of ${pct(mc.expectedIRR)} bounded by a P10 of ${pct(mc.irrP10)} and a P90 of ${pct(mc.irrP90)}. ` +
        `${t.risk} the dominant downside drivers are short-term vacancy spikes and expense inflation outpacing rent growth. ` +
        `Both are materially mitigated by maintaining a vacancy reserve of ${pct(prop.vacancyRate)} and a CapEx escrow of ${pct(prop.capex)} of gross rents. ` +
        `Probability of negative year-one cash flow is contained at ${pct(mc.probNegativeCF)}, well inside our institutional tolerance band.`
      : `Risk profile is constrained by a ${dscrLabel} DSCR of ${r.dscr.toFixed(2)} and a vacancy buffer of ${pct(prop.vacancyRate)}. ` +
        `Run the Monte Carlo simulator on the Deal Analyzer to attach a 500-iteration probabilistic stress test to this memo.`,

    valueAddRecommendations:
      `${t.value} four concrete levers: (1) re-bench rent to the top quartile of local comps within 60 days of takeover, ` +
      `(2) introduce light-rehab amenity upgrades (in-unit laundry, smart locks, LVP flooring) priced to deliver a 1.5-year payback, ` +
      `(3) renegotiate the property insurance binder against the appraised value of ${fmt(r.purchasePrice)} to compress expense ratio, ` +
      `(4) institute professional management at ${pct(8)} to reduce turn time and stabilize occupancy above 95%. ` +
      `Executed cleanly, these moves can lift NOI by an estimated 8-12% within the first 18 months.`,

    updatedAt: new Date().toISOString(),
  };
}

export default function AIMemoGenerator({ reportData }: Props) {
  const prop = useActiveProperty();
  const setActiveMemo = usePropertyStore((s) => s.setActiveMemo);
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [tone, setTone] = useState(0);
  const [draft, setDraft] = useState<AIMemo | null>(prop.aiMemo ?? null);
  const [busyPdf, setBusyPdf] = useState(false);

  // Sync draft when active property changes
  useEffect(() => { setDraft(prop.aiMemo ?? null); }, [prop.id, prop.aiMemo]);

  const cycleRef = useRef<number | null>(null);
  const stopCycle = () => { if (cycleRef.current) { window.clearInterval(cycleRef.current); cycleRef.current = null; } };

  const runGenerate = async (nextTone = tone) => {
    setLoading(true);
    setStage(0);
    setOpen(true);
    stopCycle();
    cycleRef.current = window.setInterval(() => setStage((s) => (s + 1) % LOADER_STAGES.length), 750);
    // realistic suspense
    await new Promise((r) => setTimeout(r, 2600));
    stopCycle();
    const memo = buildMemo(prop, reportData, nextTone);
    setDraft(memo);
    setLoading(false);
  };

  const handleGenerate = () => { runGenerate(tone); };
  const handleRegenerate = () => { const next = tone + 1; setTone(next); runGenerate(next); };

  const handleSave = () => {
    if (!draft) return;
    setActiveMemo({ ...draft, updatedAt: new Date().toISOString() });
    toast({ title: "Memo saved", description: "Investment memo stored on this property." });
  };

  const stitchedPdfData: UnderwritingReportData = useMemo(
    () => ({ ...reportData, aiMemo: draft ?? undefined } as UnderwritingReportData),
    [reportData, draft]
  );

  const handleDownload = async () => {
    setBusyPdf(true);
    try {
      const blob = await pdf(<UnderwritingReportPDF data={stitchedPdfData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safe = (prop.address || "RentIntel-Deal").replace(/[^a-z0-9\-_]+/gi, "_");
      a.href = url; a.download = `${safe}_Memo_Underwriting.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error(e);
      toast({ title: "Download failed", description: "Could not generate the PDF.", variant: "destructive" });
    } finally {
      setBusyPdf(false);
    }
  };

  const updateField = (k: keyof AIMemo, v: string) => {
    setDraft((d) => d ? { ...d, [k]: v } : d);
  };

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={handleGenerate}
        className="relative w-full group inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-white shadow-elegant transition-all hover:scale-[1.01] active:scale-[0.99]"
        style={{
          background: "linear-gradient(135deg, hsl(258 90% 60%) 0%, hsl(244 85% 58%) 45%, hsl(38 95% 60%) 110%)",
        }}
      >
        <Sparkles className="w-4 h-4" />
        <span>Generate AI Investment Memo</span>
        <span className="ml-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-white/20 backdrop-blur border border-white/30">
          Premium
        </span>
        {prop.aiMemo && (
          <span className="absolute -top-2 -right-2 flex items-center gap-1 text-[10px] font-semibold bg-success text-success-foreground px-2 py-0.5 rounded-full shadow-md">
            <Check className="w-3 h-3" /> Draft saved
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 md:p-8 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget && !loading) setOpen(false); }}
        >
          <div className="w-full max-w-4xl">
            {loading ? (
              <LoaderCard stage={stage} />
            ) : draft && (
              <MemoSheet
                draft={draft}
                propertyName={prop.address}
                onClose={() => setOpen(false)}
                onChange={updateField}
                onSave={handleSave}
                onRegenerate={handleRegenerate}
                onDownload={handleDownload}
                busyPdf={busyPdf}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

function LoaderCard({ stage }: { stage: number }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-10 shadow-2xl text-center max-w-xl mx-auto mt-24">
      <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-5"
        style={{ background: "linear-gradient(135deg, hsl(258 90% 60%), hsl(244 85% 58%), hsl(38 95% 60%))" }}>
        <Loader2 className="w-7 h-7 text-white animate-spin" />
      </div>
      <h3 className="text-xl font-display font-semibold mb-2">Composing your memo</h3>
      <p key={stage} className="text-sm text-muted-foreground animate-fade-in min-h-[20px]">
        {LOADER_STAGES[stage]}
      </p>
      <div className="mt-6 flex justify-center gap-1.5">
        {LOADER_STAGES.map((_, i) => (
          <span key={i} className={`h-1.5 rounded-full transition-all ${i <= stage ? "w-8 bg-primary" : "w-3 bg-muted"}`} />
        ))}
      </div>
    </div>
  );
}

interface SheetProps {
  draft: AIMemo;
  propertyName: string;
  onClose: () => void;
  onChange: (k: keyof AIMemo, v: string) => void;
  onSave: () => void;
  onRegenerate: () => void;
  onDownload: () => void;
  busyPdf: boolean;
}

function MemoSheet({ draft, propertyName, onClose, onChange, onSave, onRegenerate, onDownload, busyPdf }: SheetProps) {
  return (
    <div className="relative animate-fade-in">
      {/* Sticky toolbar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 mb-4 bg-card/95 backdrop-blur border border-border rounded-xl p-3 shadow-elegant">
        <div className="flex items-center gap-2 px-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold font-display">AI Investment Memo</span>
          <span className="hidden sm:inline text-xs text-muted-foreground">· {propertyName}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={onSave} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
            <Save className="w-3.5 h-3.5" /> Save Draft
          </button>
          <button onClick={onRegenerate} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Re-Generate
          </button>
          <button
            onClick={onDownload}
            disabled={busyPdf}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-white shadow-elegant disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, hsl(258 90% 60%), hsl(244 85% 58%) 60%, hsl(38 95% 60%))" }}
          >
            {busyPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            {busyPdf ? "Building PDF…" : "Download Complete Report"}
          </button>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Paper sheet */}
      <article
        className="rounded-md shadow-2xl border border-zinc-300 mx-auto"
        style={{
          background: "#fbfaf6",
          color: "#1a1a2e",
          padding: "clamp(1.75rem, 4vw, 3.5rem)",
          fontFamily: "'Merriweather', Georgia, 'Times New Roman', serif",
          lineHeight: 1.85,
        }}
      >
        <header className="mb-8 pb-6 border-b border-zinc-300">
          <p className="text-[10px] tracking-[0.3em] uppercase text-zinc-500 mb-2">RentIntel SRA · Confidential Investment Memorandum</p>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight" style={{ letterSpacing: "-0.01em" }}>{propertyName}</h1>
          <p className="text-xs text-zinc-500 mt-2">
            Drafted {new Date(draft.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            {" · "}Click any section to edit
          </p>
        </header>

        <MemoSection title="I. Executive Summary" value={draft.executiveSummary} onChange={(v) => onChange("executiveSummary", v)} />
        <MemoSection title="II. Financial Performance Analysis" value={draft.financialAnalysis} onChange={(v) => onChange("financialAnalysis", v)} />
        <MemoSection title="III. Monte Carlo Risk Appraisal" value={draft.riskAppraisal} onChange={(v) => onChange("riskAppraisal", v)} />
        <MemoSection title="IV. Tactical Value-Add Recommendations" value={draft.valueAddRecommendations} onChange={(v) => onChange("valueAddRecommendations", v)} />

        <footer className="mt-10 pt-5 border-t border-zinc-300 text-[10px] uppercase tracking-[0.25em] text-zinc-500 flex justify-between">
          <span>RentIntel SRA</span>
          <span>For Discussion Purposes Only</span>
        </footer>
      </article>
    </div>
  );
}

function MemoSection({ title, value, onChange }: { title: string; value: string; onChange: (v: string) => void }) {
  return (
    <section className="mb-7">
      <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-700 mb-3" style={{ fontFamily: "'Merriweather', serif" }}>
        {title}
      </h2>
      <textarea
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          const t = e.currentTarget;
          t.style.height = "auto";
          t.style.height = `${t.scrollHeight}px`;
        }}
        ref={(el) => {
          if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; }
        }}
        className="w-full resize-none bg-transparent border-0 outline-none focus:bg-white/60 focus:ring-1 focus:ring-primary/30 rounded-md p-2 -mx-2 text-[15px] leading-[1.85] text-zinc-800"
        style={{ fontFamily: "'Merriweather', Georgia, serif" }}
      />
    </section>
  );
}
