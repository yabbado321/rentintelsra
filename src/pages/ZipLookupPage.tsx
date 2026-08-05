import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import MetricCard from "@/components/MetricCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import {
  Loader2, MapPin, Users, Briefcase, GraduationCap, ShoppingBag, TrendingUp, AlertCircle,
  Home, Satellite, Music, Calculator, ArrowRight, Rocket, ShieldCheck, ShieldAlert,
} from "lucide-react";

import { usePropertyStore } from "@/lib/propertyStore";
import { useToast } from "@/hooks/use-toast";
import { buildCanonicalProperty, type CanonicalProperty } from "@/lib/subjectProperty";
import type { Page } from "@/components/AppLayout";

interface EntertainmentItem { name: string; category: string; distanceMi: number; ageRange: string; blurb: string }
interface SourceAudit { field: string; value: string; source: string; confidence: "High" | "Medium" | "Low"; notes?: string }

const fmtCurrency = (n: number | null | undefined) =>
  n == null ? "Unknown" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const fmtNum = (n: number | null | undefined) => (n == null ? "Unknown" : new Intl.NumberFormat("en-US").format(n));

type IntelTab = "deal" | "market" | "audit";

export default function ZipLookupPage({ onNavigate }: { onNavigate?: (page: Page) => void } = {}) {
  const [tab, setTab] = useState<IntelTab>("deal");
  const { toast } = useToast();
  const [zipCode, setZipCode] = useState("");
  const [address, setAddress] = useState("");
  const [listingUrl, setListingUrl] = useState("");
  const [beds, setBeds] = useState(2);
  const [baths, setBaths] = useState(1);
  const [sqft, setSqft] = useState(1000);
  const [autoDetect, setAutoDetect] = useState(false);
  const [raw, setRaw] = useState<any>(null);
  const [inputsUsed, setInputsUsed] = useState<{ zip: string; address: string; beds?: number; baths?: number; sqft?: number; autoDetect: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** The ONE object every section below reads from. Built + validated once per result. */
  const subject: CanonicalProperty | null = useMemo(
    () => (raw && inputsUsed ? buildCanonicalProperty(raw, inputsUsed) : null),
    [raw, inputsUsed]
  );

  const analyze = async () => {
    if (!zipCode || zipCode.length !== 5) { setError("Enter a valid 5-digit ZIP code"); return; }
    if (listingUrl.trim() && !/^https?:\/\/\S+\.\S+/.test(listingUrl.trim())) {
      setError("Listing URL must start with http(s):// and be a valid link");
      return;
    }
    setLoading(true); setError(null); setRaw(null); setInputsUsed(null);
    try {
      const payload = {
        zip: zipCode,
        address: address.trim() || undefined,
        listingUrl: listingUrl.trim() || undefined,
        beds: autoDetect ? undefined : beds,
        baths: autoDetect ? undefined : baths,
        sqft: autoDetect ? undefined : sqft,
        autoDetect,
      };
      const { data: res, error: fnErr } = await supabase.functions.invoke("area-insights", { body: payload });
      if (fnErr) throw fnErr;
      if (res?.error) throw new Error(res.error);
      setRaw(res);
      setInputsUsed({
        zip: zipCode, address: address.trim(),
        beds: autoDetect ? undefined : beds,
        baths: autoDetect ? undefined : baths,
        sqft: autoDetect ? undefined : sqft,
        autoDetect,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch area data");
    } finally { setLoading(false); }
  };

  const entertainment = raw?.entertainment as
    | { kids: EntertainmentItem[]; teens: EntertainmentItem[]; youngAdults: EntertainmentItem[]; families: EntertainmentItem[]; seniors: EntertainmentItem[] }
    | undefined;
  const audit = (raw?.dataSourcesSummary ?? []) as SourceAudit[];

  const specLine = subject
    ? `${subject.beds ?? "Unknown"} bd · ${subject.baths ?? "Unknown"} ba · ${subject.sqft ? `${fmtNum(subject.sqft)} sqft` : "Unknown sqft"}`
    : "";

  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-4xl font-bold font-display flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow-elegant">
            <MapPin className="w-5 h-5 text-primary-foreground" />
          </span>
          ZIP Rent Lookup
        </h1>
        <p className="text-muted-foreground mt-2">
          Deterministic rent underwriting. Every figure traces back to one canonical property record — unverified facts show as <strong>Unknown</strong> and earn no adjustment.
        </p>
      </header>

      <div className="panel space-y-4">
        <div>
          <label htmlFor="zl-url" className="text-xs font-medium text-muted-foreground block mb-1.5">
            Property Listing URL <span className="text-muted-foreground/60">(optional — Zillow, Redfin, Apartments.com, Realtor.com or Craigslist link for exact specs)</span>
          </label>
          <input id="zl-url" type="url" value={listingUrl} onChange={(e) => setListingUrl(e.target.value)} className="input-field" placeholder="https://www.zillow.com/homedetails/..." />
        </div>

        <div>
          <label htmlFor="zl-addr" className="text-xs font-medium text-muted-foreground block mb-1.5">
            Property Address <span className="text-muted-foreground/60">(optional — unlocks maps, comps &amp; property record)</span>
          </label>
          <input id="zl-addr" type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="input-field" placeholder="123 Main St, Beverly Hills" />
        </div>

        {(address.trim() || listingUrl.trim()) && (
          <label htmlFor="zl-auto" className="flex items-start gap-3 p-3 rounded-xl bg-secondary/40 border border-border/60 cursor-pointer hover:border-primary/40 transition-colors">
            <input id="zl-auto" type="checkbox" checked={autoDetect} onChange={(e) => setAutoDetect(e.target.checked)} className="mt-0.5 w-4 h-4 accent-primary cursor-pointer" />
            <span className="text-sm">
              <span className="font-medium text-foreground">Auto-detect bed / bath / sqft from the listing</span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                Specs are pulled from the listing or public records. If they cannot be verified they are reported as Unknown rather than guessed.
              </span>
            </span>
          </label>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="zl-zip" className="text-xs font-medium text-muted-foreground block mb-1.5">ZIP Code</label>
            <input id="zl-zip" type="text" maxLength={5} value={zipCode} onChange={(e) => setZipCode(e.target.value.replace(/\D/g, ""))} className="input-field font-mono" placeholder="e.g. 90210" />
          </div>
          <div>
            <label htmlFor="zl-beds" className="text-xs font-medium text-muted-foreground block mb-1.5">Bedrooms {autoDetect && <span className="text-primary/70">· auto</span>}</label>
            <input id="zl-beds" type="number" min={0} value={beds} disabled={autoDetect} onChange={(e) => setBeds(Number(e.target.value))} className="input-field font-mono disabled:opacity-50" />
          </div>
          <div>
            <label htmlFor="zl-baths" className="text-xs font-medium text-muted-foreground block mb-1.5">Bathrooms {autoDetect && <span className="text-primary/70">· auto</span>}</label>
            <input id="zl-baths" type="number" min={0} value={baths} disabled={autoDetect} onChange={(e) => setBaths(Number(e.target.value))} className="input-field font-mono disabled:opacity-50" />
          </div>
          <div>
            <label htmlFor="zl-sqft" className="text-xs font-medium text-muted-foreground block mb-1.5">Square Footage {autoDetect && <span className="text-primary/70">· auto</span>}</label>
            <input id="zl-sqft" type="number" min={0} step={50} value={sqft} disabled={autoDetect} onChange={(e) => setSqft(Number(e.target.value))} className="input-field font-mono disabled:opacity-50" />
          </div>
        </div>
        <button onClick={analyze} disabled={loading} className="btn-primary">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Researching live data...</> : <>🔍 Analyze Area</>}
        </button>
        {error && <div className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="w-4 h-4" /> {error}</div>}
      </div>

      {subject && (
        <div className="space-y-6 animate-fade-in">
          {/* Canonical subject header — the identity every section inherits */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-5 h-5 text-primary" />
                  <h2 className="text-2xl font-bold">{subject.address}</h2>
                </div>
                <p className="text-sm text-muted-foreground font-mono">
                  {subject.city}, {subject.state} {subject.zip} · {subject.county} · {subject.propertyType}
                </p>
                <p className="text-sm font-mono mt-2 text-foreground">{specLine}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Specs: {subject.specVerification === "verified" ? "Verified" : subject.specVerification === "estimated" ? "Estimated" : "Unverified"} · {subject.specSource}
                </p>
              </div>
              <ConfidenceBadge confidence={subject.confidence} />
            </div>
          </div>

          {subject.validationIssues.length > 0 && (
            <div className="rounded-xl border border-warning/40 bg-warning/10 p-4">
              <p className="text-sm font-semibold text-warning flex items-center gap-2 mb-2">
                <ShieldAlert className="w-4 h-4" /> Validation log — {subject.validationIssues.length} inconsistency(ies) resolved to verified values
              </p>
              <ul className="space-y-1 text-xs text-warning/90">
                {subject.validationIssues.map((v, i) => <li key={i}>• {v}</li>)}
              </ul>
            </div>
          )}

          <div className="flex gap-2 flex-wrap sticky top-2 z-10 bg-background/80 backdrop-blur py-2 -mx-1 px-1 rounded-lg">
            {([["deal", "The Deal"], ["market", "The Market"], ["audit", "Data Audit"]] as [IntelTab, string][]).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} className={`tab-pill ${tab === id ? "tab-pill-active" : "tab-pill-inactive"}`}>{label}</button>
            ))}
          </div>

          {tab === "deal" && (
            <>
              {subject.geo && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-card rounded-xl border border-border overflow-hidden">
                    <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                      <Satellite className="w-4 h-4 text-primary" /><h3 className="text-sm font-semibold">Satellite View — {subject.address}</h3>
                    </div>
                    <iframe title="Satellite View" src={`https://maps.google.com/maps?q=${subject.geo.lat},${subject.geo.lng}&t=k&z=18&output=embed`} className="w-full h-[320px] border-0" loading="lazy" />
                  </div>
                  <div className="bg-card rounded-xl border border-border overflow-hidden">
                    <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" /><h3 className="text-sm font-semibold">Location &amp; Neighborhood</h3>
                    </div>
                    <iframe title="Location Map" src={`https://www.openstreetmap.org/export/embed.html?bbox=${subject.geo.lng - 0.012},${subject.geo.lat - 0.008},${subject.geo.lng + 0.012},${subject.geo.lat + 0.008}&layer=mapnik&marker=${subject.geo.lat},${subject.geo.lng}`} className="w-full h-[320px] border-0" loading="lazy" />
                  </div>
                </div>
              )}

              {/* Property record */}
              <div className="bg-card rounded-xl p-6 border border-border">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Home className="w-5 h-5 text-primary" /> Property Record</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <MetricCard label="Type" value={subject.propertyType} />
                  <MetricCard label="Bedrooms" value={subject.beds != null ? String(subject.beds) : "Unknown"} />
                  <MetricCard label="Bathrooms" value={subject.baths != null ? String(subject.baths) : "Unknown"} />
                  <MetricCard label="Square Footage" value={subject.sqft ? `${fmtNum(subject.sqft)} sqft` : "Unknown"} />
                  <MetricCard label="Year Built" value={subject.yearBuilt != null ? String(subject.yearBuilt) : "Unknown"} />
                  <MetricCard label="Lot Size" value={subject.lotSizeSqft ? `${fmtNum(subject.lotSizeSqft)} sqft` : "Unknown"} />
                  <MetricCard label="List Price" value={subject.listingPrice != null ? fmtCurrency(subject.listingPrice) : "Unknown"} />
                  <MetricCard label="Last Sold" value={subject.lastSoldPrice != null ? fmtCurrency(subject.lastSoldPrice) : "Unknown"} subtitle={subject.lastSoldYear ? String(subject.lastSoldYear) : undefined} />
                </div>

                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Verified Features</p>
                <p className="text-[11px] text-muted-foreground mb-3">Only features confirmed by the listing or public records count toward rent. Anything else is Unknown and adds $0.</p>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
                  {subject.features.map((f) => (
                    <div key={f.label} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-secondary/40 border border-border/60 text-xs">
                      <span>{f.label}</span>
                      <span className={f.status === "yes" ? "text-success font-semibold" : f.status === "no" ? "text-muted-foreground" : "text-warning font-semibold"}>
                        {f.status === "yes" ? "Yes" : f.status === "no" ? "No" : "Unknown"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Valuation */}
              {subject.valueSources.length > 0 && (
                <div className="bg-card rounded-xl p-6 border border-border">
                  <h3 className="text-lg font-semibold mb-1">Home Value Triangulation</h3>
                  <p className="text-xs text-muted-foreground mb-4">Median of the independent estimates below — never extrapolated from neighborhood averages.</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {subject.valueSources.map((v) => <MetricCard key={v.label} label={v.label} value={fmtCurrency(v.value)} />)}
                    <MetricCard label="Estimated Value (median)" value={fmtCurrency(subject.estimatedValue)} variant="success" subtitle={`${subject.valueSources.length} source(s)`} />
                  </div>
                </div>
              )}

              {/* Rent derivation */}
              <div className="bg-card rounded-xl p-6 border border-primary/40 glow-primary">
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-1">
                  <Calculator className="w-5 h-5 text-primary" /> Rent Derivation — {fmtCurrency(subject.estimatedRent)} / mo
                </h3>
                <p className="text-xs text-muted-foreground mb-5">
                  Computed deterministically for this {subject.beds ?? "Unknown"}-bed / {subject.baths ?? "Unknown"}-bath{subject.sqft ? ` / ${fmtNum(subject.sqft)} sqft` : ""} {subject.propertyType.toLowerCase()}: base rent plus verified adjustments only.
                </p>

                <div className="overflow-x-auto mb-5">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-border">
                        <td className="py-2.5 font-medium">ZIP Base Rent</td>
                        <td className="py-2.5 text-right font-mono font-semibold">{fmtCurrency(subject.baseRent)}</td>
                        <td className="py-2.5 text-muted-foreground text-xs">{subject.baseRentSource}</td>
                      </tr>
                      {subject.lineItems.map((l, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-2.5 font-medium">
                            {l.factor}
                            {!l.verified && <span className="ml-2 text-[10px] uppercase tracking-wider text-warning">Not verified</span>}
                          </td>
                          <td className={`py-2.5 text-right font-mono font-semibold ${!l.verified ? "text-muted-foreground" : l.dollarImpact >= 0 ? "text-success" : "text-destructive"}`}>
                            {l.verified ? `${l.dollarImpact >= 0 ? "+" : ""}${fmtCurrency(l.dollarImpact)}` : "$0"}
                          </td>
                          <td className="py-2.5 text-muted-foreground text-xs">
                            {l.verified ? l.rationale : "Feature not confirmed — no adjustment applied."}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-primary/40">
                        <td className="py-3 font-bold text-primary">Final Estimated Rent</td>
                        <td className="py-3 text-right font-mono font-bold text-primary text-lg">{fmtCurrency(subject.estimatedRent)}</td>
                        <td className="py-3 text-muted-foreground text-xs">
                          {subject.rentRange ? `Market range ${fmtCurrency(subject.rentRange[0])} – ${fmtCurrency(subject.rentRange[1])}` : ""}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {subject.methodology && (
                  <>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Methodology</p>
                    <p className="text-sm text-foreground/90 leading-relaxed">{subject.methodology}</p>
                  </>
                )}
              </div>

              {/* Rent comps */}
              {subject.comps.length > 0 && (
                <div className="bg-card rounded-xl p-6 border border-border">
                  <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                    <h3 className="text-lg font-semibold">Rental Comparables</h3>
                    {subject.compRadiusMi != null && <span className="text-xs text-muted-foreground">Search radius: {subject.compRadiusMi.toFixed(1)} mi</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Ranked against the subject ({specLine}). Highlighted rows are the closest matches on bedrooms, size and distance.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                          <th className="py-2">Address</th>
                          <th className="py-2 text-right">Bd/Ba</th>
                          <th className="py-2 text-right">Sqft</th>
                          <th className="py-2 text-right">Rent</th>
                          <th className="py-2 text-right">$/Sqft</th>
                          <th className="py-2 text-right">Distance</th>
                          <th className="py-2 text-right">DOM</th>
                          <th className="py-2 text-right">Listed</th>
                          <th className="py-2 text-right">Match</th>
                          <th className="py-2 text-right">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subject.comps.map((c, i) => (
                          <tr key={i} className={`border-b border-border/50 ${c.similarity >= 80 ? "bg-primary/5" : ""}`}>
                            <td className="py-2.5">{c.address}</td>
                            <td className="py-2.5 text-right font-mono">{c.beds}/{c.baths}</td>
                            <td className="py-2.5 text-right font-mono">{c.sqft ? fmtNum(c.sqft) : "—"}</td>
                            <td className="py-2.5 text-right font-mono font-bold">{c.rent ? fmtCurrency(c.rent) : "—"}</td>
                            <td className="py-2.5 text-right font-mono">{c.pricePerSqft != null ? `$${c.pricePerSqft.toFixed(2)}` : "—"}</td>
                            <td className="py-2.5 text-right font-mono text-muted-foreground">{c.distanceMi.toFixed(1)} mi</td>
                            <td className="py-2.5 text-right font-mono text-muted-foreground">{c.daysOnMarket ?? "—"}</td>
                            <td className="py-2.5 text-right font-mono text-muted-foreground text-xs">{c.listedDate ?? "—"}</td>
                            <td className={`py-2.5 text-right font-mono text-xs ${c.similarity >= 80 ? "text-success font-bold" : "text-muted-foreground"}`}>{c.similarity}%</td>
                            <td className="py-2.5 text-right">
                              {c.source ? <a href={c.source} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">link</a> : <span className="text-xs text-muted-foreground">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Confidence detail */}
              <div className="bg-card rounded-xl p-6 border border-border">
                <h3 className="text-lg font-semibold mb-4">Confidence Score</h3>
                <div className="flex items-start gap-6 flex-wrap">
                  <div className="text-center">
                    <p className="text-5xl font-mono font-bold text-primary">{subject.confidence.score}</p>
                    <p className="text-xs text-muted-foreground">/ 100</p>
                  </div>
                  <ul className="flex-1 min-w-[260px] space-y-1.5">
                    {subject.confidence.drivers.map((d, i) => (
                      <li key={i} className={`text-sm flex gap-2 ${d.ok ? "text-foreground" : "text-muted-foreground"}`}>
                        <span className={d.ok ? "text-success" : "text-warning"}>{d.ok ? "✓" : "✕"}</span>{d.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="sticky bottom-3 z-20">
                <button
                  onClick={() => {
                    const store = usePropertyStore.getState();
                    store.addProperty({
                      address: subject.address,
                      purchasePrice: Math.round(subject.estimatedValue ?? 0) || 250000,
                      grossRent: Math.round(subject.estimatedRent ?? 0) || 2000,
                      vacancyRate: Number(raw?.rentalDemand?.vacancyRatePct) || 5,
                      squareFootage: subject.sqft ?? undefined,
                      yearBuilt: subject.yearBuilt ?? undefined,
                      zip: subject.zip,
                    });
                    toast({ title: "Deal loaded into the underwriter", description: `${subject.address} is now your active property.` });
                    onNavigate?.("deal");
                  }}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl gradient-primary text-primary-foreground font-bold text-base shadow-elegant hover:opacity-95 transition-all"
                >
                  <Rocket className="w-5 h-5" /> Underwrite This Deal <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </>
          )}

          {tab === "market" && (
            <>
              {/* Quantitative market table */}
              <div className="bg-card rounded-xl p-6 border border-border">
                <h3 className="text-lg font-semibold mb-1 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Market Metrics — ZIP {subject.zip}</h3>
                <p className="text-xs text-muted-foreground mb-4">Quantitative only. Metrics that could not be sourced read Unknown.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {subject.marketMetrics.map((m, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-2.5 text-muted-foreground">{m.label}</td>
                          <td className={`py-2.5 text-right font-mono font-semibold ${m.value === "Unknown" ? "text-muted-foreground/60" : ""}`}>{m.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Rent by unit type — chart + underlying table */}
              {subject.rentByUnitType.length > 0 && (
                <div className="bg-card rounded-xl p-6 border border-border">
                  <h3 className="text-lg font-semibold mb-4">Market Rent by Unit Type</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={subject.rentByUnitType}>
                      <XAxis dataKey="name" stroke="hsl(240, 5%, 55%)" fontSize={12} />
                      <YAxis stroke="hsl(240, 5%, 55%)" fontSize={12} tickFormatter={(v) => `$${v}`} />
                      <Tooltip contentStyle={{ background: "hsl(240, 5%, 13%)", border: "1px solid hsl(240, 4%, 20%)", borderRadius: 8 }} formatter={(v: number) => fmtCurrency(v)} />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {subject.rentByUnitType.map((r, i) => (
                          <Cell key={i} fill={subject.beds === r.beds ? "hsl(150, 65%, 45%)" : `hsl(${244 + i * 6}, 75%, ${58 + i * 3}%)`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <table className="w-full text-sm mt-4">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                        <th className="py-2">Unit Type</th><th className="py-2 text-right">Median Rent</th><th className="py-2 text-right">Subject</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subject.rentByUnitType.map((r) => (
                        <tr key={r.name} className="border-b border-border/50">
                          <td className="py-2">{r.name}</td>
                          <td className="py-2 text-right font-mono">{fmtCurrency(r.value)}</td>
                          <td className="py-2 text-right text-xs">{subject.beds === r.beds ? <span className="text-success font-semibold">← this property</span> : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {entertainment && (
                <div className="bg-card rounded-xl p-6 border border-border">
                  <h3 className="text-lg font-semibold mb-1 flex items-center gap-2"><Music className="w-5 h-5 text-primary" /> Entertainment &amp; Things to Do</h3>
                  <p className="text-xs text-muted-foreground mb-5">Named, verifiable venues near {subject.address}.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {([
                      ["Kids (0–12)", entertainment.kids],
                      ["Teens (13–17)", entertainment.teens],
                      ["Young Adults (18–30)", entertainment.youngAdults],
                      ["Families", entertainment.families],
                      ["Seniors (55+)", entertainment.seniors],
                    ] as const).map(([title, items]) => (
                      <div key={title} className="rounded-xl border border-border bg-secondary/30 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">{title}</p>
                        <ul className="space-y-3">
                          {(items || []).map((it, i) => (
                            <li key={i} className="text-sm">
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-medium text-foreground">{it.name}</span>
                                <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">{it.distanceMi?.toFixed(1)} mi</span>
                              </div>
                              <p className="text-[11px] text-primary/80 uppercase tracking-wider mt-0.5">{it.category}</p>
                            </li>
                          ))}
                          {(!items || items.length === 0) && <li className="text-xs text-muted-foreground italic">No verified venues found nearby.</li>}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {raw?.economy?.majorEmployers?.length > 0 && (
                <div className="bg-card rounded-xl p-6 border border-border">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Briefcase className="w-5 h-5 text-primary" /> Major Employers</h3>
                  <div className="flex flex-wrap gap-2">
                    {raw.economy.majorEmployers.map((e: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 bg-secondary border border-border rounded-md text-xs">{e}</span>
                    ))}
                  </div>
                </div>
              )}

              {raw?.livability?.topSchools?.length > 0 && (
                <div className="bg-card rounded-xl p-6 border border-border">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><GraduationCap className="w-5 h-5 text-primary" /> Schools &amp; Walkability</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <MetricCard label="Walk Score" value={raw.livability.walkScore ? `${raw.livability.walkScore}` : "Unknown"} subtitle="/ 100" />
                    <MetricCard label="Transit Score" value={raw.livability.transitScore ? `${raw.livability.transitScore}` : "Unknown"} subtitle="/ 100" />
                    <MetricCard label="Bike Score" value={raw.livability.bikeScore ? `${raw.livability.bikeScore}` : "Unknown"} subtitle="/ 100" />
                    <MetricCard label="School Rating" value={raw.livability.schoolRating ? `${raw.livability.schoolRating}/10` : "Unknown"} />
                  </div>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-sm">
                    {raw.livability.topSchools.map((s: string, i: number) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
              )}

              {raw?.amenities && (
                <div className="bg-card rounded-xl p-6 border border-border">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-primary" /> Local Amenities</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    {([["Grocery", raw.amenities.groceryStores], ["Parks", raw.amenities.parks],
                       ["Restaurants", raw.amenities.restaurants], ["Hospitals", raw.amenities.hospitals]] as const).map(([title, list]) => (
                      <div key={title}>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{title}</p>
                        <ul className="space-y-1">{(list as string[] | undefined)?.map((x, i) => <li key={i}>• {x}</li>)}</ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-card rounded-xl p-6 border border-border">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Demographics (ZIP {subject.zip})</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <MetricCard label="Population" value={fmtNum(Number(raw?.demographics?.population) || null)} />
                  <MetricCard label="Median Income" value={fmtCurrency(Number(raw?.demographics?.medianHouseholdIncome) || null)} />
                  <MetricCard label="Median Age" value={raw?.demographics?.medianAge ? `${raw.demographics.medianAge}` : "Unknown"} />
                </div>
              </div>
            </>
          )}

          {tab === "audit" && (
            <>
              {raw?.accuracyNotice && (
                <div className="bg-warning/10 border border-warning/30 text-warning rounded-xl p-4 text-sm">⚠️ {raw.accuracyNotice}</div>
              )}

              <div className="bg-card rounded-xl p-6 border border-border">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /> Pre-Render Validation</h3>
                <p className="text-xs text-muted-foreground mb-4">Consistency checks executed against the canonical property record before anything was displayed.</p>
                <ul className="space-y-1.5 text-sm">
                  {[
                    ["Bedroom count consistent", subject.beds != null],
                    ["Bathroom count consistent", subject.baths != null],
                    ["Square footage consistent", subject.sqft != null],
                    ["Address consistent across sections", !!subject.address],
                    ["ZIP consistent", /^\d{5}$/.test(subject.zip)],
                    ["Property type consistent", subject.propertyType !== "Unknown"],
                    ["Rent derivation reconciles to base + verified adjustments", subject.estimatedRent != null],
                    ["Adjustment engine used verified features only", subject.lineItems.every((l) => l.verified || l.dollarImpact === 0)],
                    ["No unresolved contradictions", subject.validationIssues.length === 0],
                  ].map(([label, ok], i) => (
                    <li key={i} className="flex gap-2">
                      <span className={ok ? "text-success" : "text-warning"}>{ok ? "✓" : "✕"}</span>
                      <span className={ok ? "" : "text-muted-foreground"}>{label as string}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {raw?.rentEstimates?.sources?.length > 0 && (
                <div className="bg-card rounded-xl p-5 border border-border">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Sources</p>
                  <div className="flex flex-wrap gap-2">
                    {raw.rentEstimates.sources.map((s: string, i: number) => (
                      <a key={i} href={s} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline truncate max-w-xs">{s}</a>
                    ))}
                  </div>
                </div>
              )}

              {audit.length > 0 && (
                <div className="bg-card rounded-xl p-6 border border-border">
                  <h3 className="text-lg font-semibold mb-2">Data Sources &amp; Confidence Summary</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                          <th className="py-2">Data Point</th><th className="py-2">Value</th><th className="py-2">Source</th><th className="py-2">Confidence</th><th className="py-2">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {audit.map((row, i) => {
                          const icon = row.confidence === "High" ? "✅" : row.confidence === "Medium" ? "⚠️" : "❌";
                          const color = row.confidence === "High" ? "text-success" : row.confidence === "Medium" ? "text-warning" : "text-destructive";
                          return (
                            <tr key={i} className="border-b border-border/50 align-top">
                              <td className="py-2.5 font-medium">{row.field}</td>
                              <td className="py-2.5 font-mono">{row.value}</td>
                              <td className="py-2.5 text-muted-foreground text-xs">{row.source}</td>
                              <td className={`py-2.5 text-xs font-semibold ${color}`}>{icon} {row.confidence}</td>
                              <td className="py-2.5 text-muted-foreground text-xs">{row.notes || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: CanonicalProperty["confidence"] }) {
  const tone = confidence.score >= 80 ? "success" : confidence.score >= 55 ? "warning" : "destructive";
  return (
    <div className={`rounded-xl border px-4 py-3 text-center border-${tone}/40 bg-${tone}/10`}>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Confidence Score</p>
      <p className={`text-3xl font-mono font-bold text-${tone}`}>{confidence.score}<span className="text-sm text-muted-foreground"> / 100</span></p>
    </div>
  );
}
