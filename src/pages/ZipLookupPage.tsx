import { useMemo, useState } from "react";
import {
  Search, Loader2, MapPin, Home, TrendingUp, AlertTriangle, ClipboardList,
  Calculator, Building2, Database, Info, CheckCircle2,
} from "lucide-react";
import {
  DEFAULT_MANUAL_INPUT, FEATURE_KEYS, FEATURE_LABELS, PROPERTY_TYPES,
  buildRentEstimate, computeInputConfidence, hasBlockingErrors, runManualMonteCarlo,
  runUnderwriting, validateManualInput,
  type ManualPropertyInput, type PropertyType, type TriState,
} from "@/lib/manualUnderwriting";
import { fetchZipMarket, fmtUnknown, int0, money0, pct1, type ZipMarketData } from "@/lib/zipMarket";
import { hasProvider, USER_INPUT_SOURCE, PUBLIC_DATASET_SOURCE, CALCULATED_SOURCE } from "@/lib/providers/propertyDataProvider";

type Mode = "market" | "property";

const card = "rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-5";
const labelCls = "text-[11px] uppercase tracking-wider text-muted-foreground font-medium";
const inputCls =
  "w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/70 transition-colors";

/* ------------------------------------------------------------------ */

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  const unknown = value === "Unknown";
  return (
    <div className="rounded-xl border border-border/50 bg-secondary/20 px-4 py-3">
      <div className={labelCls}>{label}</div>
      <div className={`mt-1 font-mono text-lg ${unknown ? "text-muted-foreground/60" : "text-foreground"}`}>{value}</div>
      {note && <div className="mt-0.5 text-[11px] text-muted-foreground">{note}</div>}
    </div>
  );
}

function NumField({
  label, value, onChange, step = 1, prefix, suffix, placeholder,
}: {
  label: string; value: number | null; onChange: (v: number | null) => void;
  step?: number; prefix?: string; suffix?: string; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <div className="mt-1 flex items-center gap-1">
        {prefix && <span className="text-xs text-muted-foreground">{prefix}</span>}
        <input
          type="number"
          step={step}
          className={inputCls}
          value={value === null ? "" : value}
          placeholder={placeholder ?? "Unknown"}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </label>
  );
}

function TriToggle({ label, value, onChange }: { label: string; value: TriState; onChange: (v: TriState) => void }) {
  const opts: TriState[] = ["yes", "no", "unknown"];
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-secondary/15 px-3 py-2">
      <span className="text-xs text-foreground">{label}</span>
      <div className="inline-flex rounded-md border border-border/60 bg-background/50 p-0.5">
        {opts.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`px-2 py-1 text-[11px] font-semibold rounded capitalize transition-colors ${
              value === o ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export default function ZipLookupPage() {
  const [mode, setMode] = useState<Mode>("market");

  // ---- Mode 1: ZIP market research (free public datasets) ----
  const [zip, setZip] = useState("");
  const [loading, setLoading] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [market, setMarket] = useState<ZipMarketData | null>(null);

  const loadMarket = async () => {
    if (!/^\d{5}$/.test(zip.trim())) {
      setMarketError("Enter a 5-digit ZIP code.");
      return;
    }
    setLoading(true);
    setMarketError(null);
    setMarket(null);
    try {
      setMarket(await fetchZipMarket(zip.trim()));
    } catch (e) {
      setMarketError(e instanceof Error ? e.message : "Market lookup failed.");
    } finally {
      setLoading(false);
    }
  };

  // ---- Mode 2: manual property analysis ----
  const [input, setInput] = useState<ManualPropertyInput>(DEFAULT_MANUAL_INPUT);
  const set = <K extends keyof ManualPropertyInput>(k: K, v: ManualPropertyInput[K]) =>
    setInput((p) => ({ ...p, [k]: v }));
  const setFeature = (k: (typeof FEATURE_KEYS)[number], v: TriState) =>
    setInput((p) => ({ ...p, features: { ...p.features, [k]: v } }));

  const issues = useMemo(() => validateManualInput(input), [input]);
  const blocked = hasBlockingErrors(issues);

  const marketMedianRent = market?.zip === (input.zip || market?.zip) ? market?.housing.medianGrossRent ?? null : null;

  const rentEstimate = useMemo(
    () => buildRentEstimate(input, marketMedianRent),
    [input, marketMedianRent],
  );

  const confidence = useMemo(
    () =>
      computeInputConfidence({
        input,
        marketAvailable: !!market,
        marketRentAvailable: marketMedianRent !== null,
        issues,
      }),
    [input, market, marketMedianRent, issues],
  );

  const uw = useMemo(() => (blocked ? null : runUnderwriting(input)), [input, blocked]);
  const [mc, setMc] = useState<ReturnType<typeof runManualMonteCarlo> | null>(null);
  const [mcRunning, setMcRunning] = useState(false);

  const runMc = () => {
    setMcRunning(true);
    setTimeout(() => {
      setMc(runManualMonteCarlo(input, 5000, "balanced"));
      setMcRunning(false);
    }, 10);
  };

  /* --------------------------- summary --------------------------- */
  const summary = useMemo(() => {
    if (!uw) return null;
    const lines: string[] = [];
    lines.push(
      `Using the figures entered, the property produces ${money0(uw.monthlyCashFlow)} per month (${money0(uw.annualCashFlow)} per year) after debt service, with a ${uw.capRate.toFixed(2)}% cap rate and a ${uw.dscr.toFixed(2)} DSCR.`,
    );
    if (uw.dscr < 1) lines.push("DSCR is below 1.00 — net operating income does not cover the loan payment. Most lenders will decline this structure.");
    if (uw.annualCashFlow < 0) lines.push("Cash flow is negative. The deal requires ongoing capital contributions to hold.");
    lines.push(`Break-even occupancy is ${uw.breakEvenOccupancy.toFixed(1)}%; the operating expense ratio is ${uw.expenseRatio.toFixed(1)}% of effective gross income.`);
    if (market?.housing.medianGrossRent && input.expectedRent) {
      const delta = ((input.expectedRent - market.housing.medianGrossRent) / market.housing.medianGrossRent) * 100;
      lines.push(
        `Entered rent is ${Math.abs(delta).toFixed(1)}% ${delta >= 0 ? "above" : "below"} the ZIP median gross rent of ${money0(market.housing.medianGrossRent)} (Census ACS ${market.acsYear}).`,
      );
    } else {
      lines.push("No public median rent is loaded for this ZIP, so the entered rent has not been benchmarked.");
    }
    if (market?.housing.vacancyRate !== null && market?.housing.vacancyRate !== undefined) {
      lines.push(`ZIP vacancy rate is ${pct1(market.housing.vacancyRate)} versus the ${input.vacancyPct ?? 0}% vacancy assumption used here.`);
    }
    return lines;
  }, [uw, market, input.expectedRent, input.vacancyPct]);

  /* --------------------------- audit ----------------------------- */
  const auditRows = useMemo(() => {
    const rows: { field: string; value: string; source: string; used: boolean }[] = [
      { field: "Address", value: input.address || "Unknown", source: USER_INPUT_SOURCE, used: false },
      { field: "Property Type", value: input.propertyType, source: USER_INPUT_SOURCE, used: false },
      { field: "Bedrooms", value: fmtUnknown(input.bedrooms, int0), source: USER_INPUT_SOURCE, used: true },
      { field: "Bathrooms", value: fmtUnknown(input.bathrooms, (n) => n.toString()), source: USER_INPUT_SOURCE, used: true },
      { field: "Square Footage", value: fmtUnknown(input.squareFootage, int0), source: USER_INPUT_SOURCE, used: true },
      { field: "Year Built", value: fmtUnknown(input.yearBuilt, (n) => n.toString()), source: USER_INPUT_SOURCE, used: true },
      { field: "Lot Size (sqft)", value: fmtUnknown(input.lotSizeSqft, int0), source: USER_INPUT_SOURCE, used: false },
      { field: "Purchase Price", value: fmtUnknown(input.purchasePrice, money0), source: USER_INPUT_SOURCE, used: true },
      { field: "Expected Rent", value: fmtUnknown(input.expectedRent, money0), source: USER_INPUT_SOURCE, used: true },
      { field: "Property Tax (annual)", value: fmtUnknown(input.annualPropertyTax, money0), source: USER_INPUT_SOURCE, used: true },
      { field: "Insurance (annual)", value: fmtUnknown(input.annualInsurance, money0), source: USER_INPUT_SOURCE, used: true },
      { field: "HOA (monthly)", value: fmtUnknown(input.monthlyHoa, money0), source: USER_INPUT_SOURCE, used: true },
      { field: "Repairs (monthly)", value: fmtUnknown(input.monthlyRepairs, money0), source: USER_INPUT_SOURCE, used: true },
      { field: "Vacancy", value: fmtUnknown(input.vacancyPct, pct1), source: USER_INPUT_SOURCE, used: true },
      { field: "Management", value: fmtUnknown(input.managementPct, pct1), source: USER_INPUT_SOURCE, used: true },
      { field: "Utilities (monthly)", value: fmtUnknown(input.monthlyUtilities, money0), source: USER_INPUT_SOURCE, used: true },
      { field: "Closing Costs", value: fmtUnknown(input.closingCostPct, pct1), source: USER_INPUT_SOURCE, used: true },
      { field: "Down Payment", value: fmtUnknown(input.downPaymentPct, pct1), source: USER_INPUT_SOURCE, used: true },
      { field: "Interest Rate", value: fmtUnknown(input.interestRate, pct1), source: USER_INPUT_SOURCE, used: true },
      { field: "Loan Term", value: fmtUnknown(input.loanTermYears, (n) => `${n} yrs`), source: USER_INPUT_SOURCE, used: true },
    ];
    FEATURE_KEYS.forEach((k) =>
      rows.push({
        field: FEATURE_LABELS[k],
        value: input.features[k] === "unknown" ? "Unknown" : input.features[k] === "yes" ? "Yes" : "No",
        source: USER_INPUT_SOURCE,
        used: input.features[k] === "yes",
      }),
    );
    if (market) {
      rows.push(
        { field: "ZIP Median Gross Rent", value: fmtUnknown(market.housing.medianGrossRent, money0), source: PUBLIC_DATASET_SOURCE, used: true },
        { field: "ZIP Median Home Value", value: fmtUnknown(market.housing.medianHomeValue, money0), source: PUBLIC_DATASET_SOURCE, used: false },
        { field: "ZIP Population", value: fmtUnknown(market.demographics.population, int0), source: PUBLIC_DATASET_SOURCE, used: false },
        { field: "ZIP Vacancy Rate", value: fmtUnknown(market.housing.vacancyRate, pct1), source: PUBLIC_DATASET_SOURCE, used: false },
      );
    }
    if (uw) {
      rows.push(
        { field: "Monthly Loan Payment", value: money0(uw.monthlyLoanPayment), source: CALCULATED_SOURCE, used: true },
        { field: "NOI (annual)", value: money0(uw.noi), source: CALCULATED_SOURCE, used: true },
        { field: "Adjusted Rent Estimate", value: rentEstimate.adjustedRent === null ? "Unknown" : money0(rentEstimate.adjustedRent), source: CALCULATED_SOURCE, used: false },
      );
    }
    return rows;
  }, [input, market, uw, rentEstimate]);

  /* ------------------------------------------------------------------ */

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          Market Research &amp; Manual Property Analysis
        </h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-3xl">
          Market research uses available public datasets (US Census ACS). Property details are entered by you — no listing
          site, valuation model, or AI generates any property fact here.
        </p>
      </header>

      {!hasProvider() && (
        <div className="rounded-xl border border-border/60 bg-secondary/20 px-4 py-3 text-xs text-muted-foreground flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 text-primary shrink-0" />
          <span>
            No property data provider is connected. All property information is entered manually. If a provider is added
            later it will pre-fill these fields and you will still be able to override every value.
          </span>
        </div>
      )}

      <div className="inline-flex rounded-xl border border-border/60 bg-background/40 p-1">
        {([["market", "ZIP Market Research", TrendingUp], ["property", "Manual Property Analysis", Calculator]] as const).map(
          ([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                mode === id ? "bg-primary text-primary-foreground shadow-elegant" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ),
        )}
      </div>

      {/* ------------------------- MODE 1 ------------------------- */}
      {mode === "market" && (
        <section className="space-y-5">
          <div className={card}>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex-1 min-w-[200px]">
                <span className={labelCls}>ZIP Code</span>
                <input
                  className={`${inputCls} mt-1 font-mono`}
                  value={zip}
                  maxLength={5}
                  placeholder="58103"
                  onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && loadMarket()}
                />
              </label>
              <button
                onClick={loadMarket}
                disabled={loading}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60 flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Research ZIP
              </button>
            </div>
            {marketError && (
              <p className="mt-3 text-xs text-destructive flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" /> {marketError}
              </p>
            )}
          </div>

          {market && (
            <>
              <div className={card}>
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MapPin className="w-4 h-4 text-primary" />
                  {market.place.city ?? "Unknown"}
                  {market.place.state ? `, ${market.place.state}` : ""} · ZIP {market.zip}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  County: Unknown (not published in the datasets used) · ACS vintage {market.acsYear ?? "Unknown"}
                </div>
              </div>

              {!market.censusAvailable && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-xs text-muted-foreground flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 text-destructive shrink-0" />
                  <span>
                    The Census ACS dataset did not return data for this ZIP, so demographic and housing statistics are
                    Unknown. Nothing below is estimated.
                    {market.datasetErrors.length > 0 && <> Reason: {market.datasetErrors[0]}</>}
                  </span>
                </div>
              )}

              <div>
                <h2 className="mb-2 text-sm font-semibold text-foreground">Population &amp; Employment</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Stat label="Population" value={fmtUnknown(market.demographics.population, int0)} />
                  <Stat label="Median Household Income" value={fmtUnknown(market.demographics.medianHouseholdIncome, money0)} />
                  <Stat label="Civilian Labor Force" value={fmtUnknown(market.demographics.laborForce, int0)} />
                  <Stat label="Unemployment Rate" value={fmtUnknown(market.demographics.unemploymentRate, pct1)} />
                </div>
              </div>

              <div>
                <h2 className="mb-2 text-sm font-semibold text-foreground">Housing Statistics</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Stat label="Median Home Value" value={fmtUnknown(market.housing.medianHomeValue, money0)} />
                  <Stat label="Median Gross Rent" value={fmtUnknown(market.housing.medianGrossRent, money0)} note="Monthly, incl. utilities" />
                  <Stat label="Housing Units" value={fmtUnknown(market.housing.housingUnits, int0)} />
                  <Stat label="Vacancy Rate" value={fmtUnknown(market.housing.vacancyRate, pct1)} />
                  <Stat label="Owner Occupancy" value={fmtUnknown(market.housing.ownerOccupiedPct, pct1)} />
                  <Stat label="Renter Occupancy" value={fmtUnknown(market.housing.renterOccupiedPct, pct1)} />
                  <Stat label="Median Year Built" value={fmtUnknown(market.housing.medianYearBuilt, (n) => n.toString())} />
                  <Stat label="Market GRM" value={fmtUnknown(market.housing.grossRentMultiplierMarket, (n) => n.toFixed(1))} note="Median value / annual median rent" />
                </div>
              </div>

              {market.trend.length > 0 && (
                <div className={card}>
                  <h2 className="mb-3 text-sm font-semibold text-foreground">Historical Trend (ACS vintages)</h2>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="pb-2">Year</th>
                        <th className="pb-2">Median Gross Rent</th>
                        <th className="pb-2">Median Home Value</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {market.trend.map((t) => (
                        <tr key={t.year} className="border-t border-border/40">
                          <td className="py-2">{t.year}</td>
                          <td className="py-2">{fmtUnknown(t.medianGrossRent, money0)}</td>
                          <td className="py-2">{fmtUnknown(t.medianHomeValue, money0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className={`${card} text-[11px] text-muted-foreground`}>
                <div className="flex items-center gap-2 font-semibold text-foreground mb-1">
                  <Database className="w-3.5 h-3.5 text-primary" /> Sources
                </div>
                <ul className="list-disc pl-4 space-y-0.5">
                  {market.sources.map((s) => <li key={s}>{s}</li>)}
                </ul>
                <p className="mt-2">Retrieved {new Date(market.retrievedAt).toLocaleString()}. Fields the datasets do not publish are shown as Unknown.</p>
              </div>
            </>
          )}
        </section>
      )}

      {/* ------------------------- MODE 2 ------------------------- */}
      {mode === "property" && (
        <section className="space-y-5">
          <div className={card}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Building2 className="w-4 h-4 text-primary" /> Property Details
              <span className="ml-auto text-[11px] font-normal text-muted-foreground">Entered by user</span>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block sm:col-span-2">
                <span className={labelCls}>Property Address</span>
                <input className={`${inputCls} mt-1`} value={input.address} placeholder="123 Main St, City, ST"
                  onChange={(e) => set("address", e.target.value)} />
              </label>
              <label className="block">
                <span className={labelCls}>ZIP Code</span>
                <input className={`${inputCls} mt-1 font-mono`} value={input.zip} maxLength={5} placeholder="58103"
                  onChange={(e) => set("zip", e.target.value.replace(/\D/g, ""))} />
              </label>
              <label className="block">
                <span className={labelCls}>Property Type</span>
                <select className={`${inputCls} mt-1`} value={input.propertyType}
                  onChange={(e) => set("propertyType", e.target.value as PropertyType)}>
                  {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <NumField label="Bedrooms" value={input.bedrooms} onChange={(v) => set("bedrooms", v)} />
              <NumField label="Bathrooms" step={0.5} value={input.bathrooms} onChange={(v) => set("bathrooms", v)} />
              <NumField label="Square Footage" value={input.squareFootage} onChange={(v) => set("squareFootage", v)} />
              <NumField label="Year Built" value={input.yearBuilt} onChange={(v) => set("yearBuilt", v)} />
              <NumField label="Lot Size (sqft)" value={input.lotSizeSqft} onChange={(v) => set("lotSizeSqft", v)} />
            </div>
          </div>

          <div className={card}>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Purchase &amp; Income</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <NumField label="Purchase Price" prefix="$" step={1000} value={input.purchasePrice} onChange={(v) => set("purchasePrice", v)} />
              <NumField label="Expected Monthly Rent" prefix="$" step={25} value={input.expectedRent} onChange={(v) => set("expectedRent", v)} />
              <NumField label="Down Payment" suffix="%" step={1} value={input.downPaymentPct} onChange={(v) => set("downPaymentPct", v)} />
              <NumField label="Interest Rate" suffix="%" step={0.125} value={input.interestRate} onChange={(v) => set("interestRate", v)} />
              <NumField label="Loan Term" suffix="yrs" value={input.loanTermYears} onChange={(v) => set("loanTermYears", v)} />
              <NumField label="Hold Period" suffix="yrs" value={input.holdYears} onChange={(v) => set("holdYears", v)} />
              <NumField label="Closing Costs" suffix="%" step={0.25} value={input.closingCostPct} onChange={(v) => set("closingCostPct", v)} />
              <NumField label="Rehab Budget" prefix="$" step={500} value={input.rehabBudget} onChange={(v) => set("rehabBudget", v)} />
            </div>
          </div>

          <div className={card}>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Operating Expenses</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <NumField label="Property Tax (annual)" prefix="$" step={100} value={input.annualPropertyTax} onChange={(v) => set("annualPropertyTax", v)} />
              <NumField label="Insurance (annual)" prefix="$" step={50} value={input.annualInsurance} onChange={(v) => set("annualInsurance", v)} />
              <NumField label="HOA (monthly)" prefix="$" step={10} value={input.monthlyHoa} onChange={(v) => set("monthlyHoa", v)} />
              <NumField label="Repairs (monthly)" prefix="$" step={10} value={input.monthlyRepairs} onChange={(v) => set("monthlyRepairs", v)} />
              <NumField label="Vacancy" suffix="%" step={0.5} value={input.vacancyPct} onChange={(v) => set("vacancyPct", v)} />
              <NumField label="Property Management" suffix="%" step={0.5} value={input.managementPct} onChange={(v) => set("managementPct", v)} />
              <NumField label="Utilities (monthly)" prefix="$" step={10} value={input.monthlyUtilities} onChange={(v) => set("monthlyUtilities", v)} />
            </div>
          </div>

          <div className={card}>
            <h2 className="mb-1 text-sm font-semibold text-foreground">Property Features</h2>
            <p className="mb-3 text-[11px] text-muted-foreground">Unknown applies no rent adjustment. Nothing is assumed.</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURE_KEYS.map((k) => (
                <TriToggle key={k} label={FEATURE_LABELS[k]} value={input.features[k]} onChange={(v) => setFeature(k, v)} />
              ))}
            </div>
          </div>

          {/* Validation */}
          {issues.length > 0 && (
            <div className={`${card} border-destructive/40`}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <AlertTriangle className="w-4 h-4 text-destructive" /> Validation
              </h2>
              <ul className="space-y-1 text-xs">
                {issues.map((v) => (
                  <li key={`${v.field}-${v.message}`} className={v.severity === "error" ? "text-destructive" : "text-muted-foreground"}>
                    <span className="font-semibold">{v.label}:</span> {v.message}
                  </li>
                ))}
              </ul>
              {blocked && <p className="mt-2 text-[11px] text-muted-foreground">Results are withheld until every error is resolved.</p>}
            </div>
          )}

          {/* Results */}
          {uw && (
            <>
              <div>
                <h2 className="mb-2 text-sm font-semibold text-foreground">Underwriting Results</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Stat label="Monthly Cash Flow" value={money0(uw.monthlyCashFlow)} />
                  <Stat label="Annual Cash Flow" value={money0(uw.annualCashFlow)} />
                  <Stat label="Cap Rate" value={pct1(uw.capRate)} />
                  <Stat label="Cash-on-Cash" value={pct1(uw.cashOnCash)} />
                  <Stat label="Total ROI" value={pct1(uw.totalRoi)} note={`Over ${input.holdYears ?? 10} yrs`} />
                  <Stat label="IRR" value={pct1(uw.irr)} note="2.5% appreciation assumption" />
                  <Stat label="DSCR" value={uw.dscr.toFixed(2)} note={uw.dscr < 1 ? "Below lender minimum" : undefined} />
                  <Stat label="GRM" value={uw.grm.toFixed(1)} />
                  <Stat label="Expense Ratio" value={pct1(uw.expenseRatio)} />
                  <Stat label="Break-even Occupancy" value={pct1(uw.breakEvenOccupancy)} />
                  <Stat label="Loan Payment" value={money0(uw.monthlyLoanPayment)} note="Principal & interest" />
                  <Stat label="Total Interest" value={money0(uw.totalInterestOverTerm)} note="Full loan term" />
                  <Stat label="Equity at Horizon" value={money0(uw.equityAtHorizon)} />
                  <Stat label="Appreciation Gain" value={money0(uw.appreciationGain)} note="2.5%/yr assumption" />
                  <Stat label="Net Worth Projection" value={money0(uw.netWorthProjection)} />
                  <Stat label="Cash Invested" value={money0(uw.cashInvested)} />
                </div>
              </div>

              {/* Rent adjustments */}
              <div className={card}>
                <h2 className="mb-3 text-sm font-semibold text-foreground">Rent Adjustment Engine</h2>
                {rentEstimate.baseRent === null ? (
                  <p className="text-xs text-muted-foreground">
                    {rentEstimate.baseSource}. Run ZIP Market Research for this ZIP to produce a benchmark rent — no base
                    rent is invented.
                  </p>
                ) : (
                  <table className="w-full text-xs">
                    <tbody className="font-mono">
                      <tr className="border-b border-border/40">
                        <td className="py-2 font-sans">Base Rent</td>
                        <td className="py-2 font-sans text-muted-foreground">{rentEstimate.baseSource}</td>
                        <td className="py-2 text-right">{money0(rentEstimate.baseRent)}</td>
                      </tr>
                      {rentEstimate.adjustments.map((a) => (
                        <tr key={a.label} className="border-b border-border/30">
                          <td className="py-1.5 font-sans">{a.label}</td>
                          <td className="py-1.5 font-sans text-muted-foreground">{a.rule}</td>
                          <td className={`py-1.5 text-right ${a.amount >= 0 ? "text-primary" : "text-destructive"}`}>
                            {a.amount >= 0 ? "+" : "-"}{money0(Math.abs(a.amount))}
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td className="pt-2 font-sans font-semibold">Adjusted Rent Estimate</td>
                        <td />
                        <td className="pt-2 text-right font-semibold">{money0(rentEstimate.adjustedRent ?? 0)}</td>
                      </tr>
                      {rentEstimate.varianceVsUser !== null && (
                        <tr>
                          <td className="pt-1 font-sans text-muted-foreground">Variance vs your entered rent</td>
                          <td />
                          <td className="pt-1 text-right text-muted-foreground">
                            {rentEstimate.varianceVsUser >= 0 ? "+" : "-"}{money0(Math.abs(rentEstimate.varianceVsUser))}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Confidence */}
              <div className={card}>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">Evidence Confidence</h2>
                  <span className="font-mono text-lg text-foreground">{confidence.score}/100 · {confidence.label}</span>
                </div>
                <table className="mt-3 w-full text-xs">
                  <tbody>
                    {confidence.components.map((c) => (
                      <tr key={c.label} className="border-t border-border/40">
                        <td className="py-1.5">{c.label}</td>
                        <td className="py-1.5 text-muted-foreground">{c.detail}</td>
                        <td className="py-1.5 text-right font-mono">{c.earned}{c.max > 0 ? ` / ${c.max}` : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              {summary && (
                <div className={card}>
                  <h2 className="mb-2 text-sm font-semibold text-foreground">Investment Summary</h2>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {summary.map((s) => (
                      <li key={s} className="flex gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Monte Carlo */}
              <div className={card}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-foreground">Monte Carlo Simulation</h2>
                  <button onClick={runMc} disabled={mcRunning}
                    className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60 flex items-center gap-2">
                    {mcRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calculator className="w-3.5 h-3.5" />}
                    Run 5,000 simulations
                  </button>
                </div>
                {mc && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Stat label="Median ROI" value={pct1(mc.roi.median)} />
                    <Stat label="Median IRR" value={pct1(mc.irr.median)} />
                    <Stat label="P5 / P95 ROI" value={`${mc.roi.p5.toFixed(1)}% / ${mc.roi.p95.toFixed(1)}%`} />
                    <Stat label="Probability of Loss" value={pct1(mc.probLoss)} />
                    <Stat label="Negative Cash-Flow Year" value={pct1(mc.probNegativeCashFlowYear)} />
                    <Stat label="Value at Risk (5%)" value={pct1(mc.var5)} />
                    <Stat label="Sharpe" value={mc.sharpe.toFixed(2)} />
                    <Stat label="Sortino" value={mc.sortino.toFixed(2)} />
                  </div>
                )}
              </div>

              {/* Data audit */}
              <div className={card}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ClipboardList className="w-4 h-4 text-primary" /> Data Audit
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="pb-2">Field</th>
                        <th className="pb-2">Value</th>
                        <th className="pb-2">Source</th>
                        <th className="pb-2">Used in Calculation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditRows.map((r) => (
                        <tr key={r.field} className="border-t border-border/40">
                          <td className="py-1.5">{r.field}</td>
                          <td className="py-1.5 font-mono">{r.value}</td>
                          <td className="py-1.5 text-muted-foreground">{r.source}</td>
                          <td className="py-1.5">{r.used ? "Yes" : "No"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {!uw && !issues.some((i) => i.severity === "error") && (
            <div className={`${card} text-xs text-muted-foreground flex items-center gap-2`}>
              <Home className="w-4 h-4 text-primary" /> Enter the property details above to run the underwriting engine.
            </div>
          )}
        </section>
      )}
    </div>
  );
}
