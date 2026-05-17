import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import MetricCard from "@/components/MetricCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Loader2, MapPin, Users, Briefcase, GraduationCap, ShoppingBag, TrendingUp, AlertCircle, Home, Sparkles, Satellite, Music, Calculator } from "lucide-react";

interface Comp { address: string; beds: number; baths: number; sqft: number; rent: number; distanceMi: number; listedWithinMonths?: number; source?: string; }
interface EntertainmentItem { name: string; category: string; distanceMi: number; ageRange: string; blurb: string; }
interface RentAdjustment { factor: string; dollarImpact: number; rationale: string; }
interface SourceAudit { field: string; value: string; source: string; confidence: "High" | "Medium" | "Low"; notes?: string; }
interface AreaData {
  area: { city: string; state: string; county: string; neighborhoodSummary: string };
  rentEstimates: {
    studio: number; oneBed: number; twoBed: number; threeBed: number; fourBed: number;
    medianOverall: number; pricePerSqft: number; subjectEstimate: number;
    rangeLow: number; rangeHigh: number; yoyChangePct: number; sources: string[];
  };
  rentBreakdown?: {
    baseRent: number; baseRentSource: string;
    adjustments: RentAdjustment[];
    finalEstimate: number; methodology: string; confidenceDrivers: string[];
  };
  entertainment?: {
    kids: EntertainmentItem[]; teens: EntertainmentItem[]; youngAdults: EntertainmentItem[];
    families: EntertainmentItem[]; seniors: EntertainmentItem[];
  };
  demographics: {
    population: number; medianHouseholdIncome: number; medianAge: number;
    ownerOccupiedPct: number; renterOccupiedPct: number; populationGrowth5yPct: number;
  };
  economy: {
    unemploymentPct: number; majorEmployers: string[]; jobGrowthPct: number;
    medianHomePrice: number; homeAppreciation1yPct: number;
  };
  livability: {
    walkScore: number; transitScore: number; bikeScore: number;
    crimeIndex: string; schoolRating: number; topSchools: string[];
  };
  amenities: {
    groceryStores: string[]; parks: string[]; restaurants: string[]; hospitals: string[];
  };
  rentalDemand: {
    vacancyRatePct: number; avgDaysOnMarket: number; demandLevel: string;
    rentToIncomeRatioPct: number; investorScore: number;
  };
  justification: string[];
  dataConfidence?: "Low" | "Medium" | "High";
  lastUpdated?: string;
  dataSourcesSummary?: SourceAudit[];
  geo?: { lat: number; lng: number; displayName: string };
  property?: {
    addressNormalized: string; yearBuilt: number; yearBuiltSource?: string; lotSizeSqft: number;
    estimatedValue: number;
    valueTriangulation?: { zillowZestimate: number; redfinEstimate: number; countyAssessedValue: number; medianUsed: number; confidence: "High" | "Medium" | "Low" };
    lastSoldPrice: number; lastSoldYear: number;
    propertyType: string; neighborhood: string;
    nearbyComps: Comp[];
    compSearchRadiusMi?: number;
    rentMaxStrategy: {
      recommendedRent: number; premiumRent: number; tips: string[];
      amenityValueAdds: { feature: string; monthlyValue: number }[];
      seasonalTiming: string; marketingAngles: string[];
    };
  };
}

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);
const fmtNum = (n: number) => new Intl.NumberFormat("en-US").format(n || 0);

export default function ZipLookupPage() {
  const [zipCode, setZipCode] = useState("");
  const [address, setAddress] = useState("");
  const [listingUrl, setListingUrl] = useState("");
  const [beds, setBeds] = useState(2);
  const [baths, setBaths] = useState(1);
  const [sqft, setSqft] = useState(1000);
  const [autoDetect, setAutoDetect] = useState(false);
  const [data, setData] = useState<AreaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
    if (!zipCode || zipCode.length !== 5) {
      setError("Enter a valid 5-digit ZIP code");
      return;
    }
    if (listingUrl.trim() && !/^https?:\/\/\S+\.\S+/.test(listingUrl.trim())) {
      setError("Listing URL must start with http(s):// and be a valid link");
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const { data: res, error: fnErr } = await supabase.functions.invoke("area-insights", {
        body: {
          zip: zipCode,
          address: address.trim() || undefined,
          listingUrl: listingUrl.trim() || undefined,
          beds: autoDetect ? undefined : beds,
          baths: autoDetect ? undefined : baths,
          sqft: autoDetect ? undefined : sqft,
          autoDetect,
        },
      });
      if (fnErr) throw fnErr;
      if (res?.error) throw new Error(res.error);
      setData(res as AreaData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch area data");
    } finally {
      setLoading(false);
    }
  };

  const rentChart = data ? [
    { name: "Studio", value: data.rentEstimates.studio },
    { name: "1 Bed", value: data.rentEstimates.oneBed },
    { name: "2 Bed", value: data.rentEstimates.twoBed },
    { name: "3 Bed", value: data.rentEstimates.threeBed },
    { name: "4 Bed", value: data.rentEstimates.fourBed },
  ] : [];

  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-4xl font-bold font-display flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow-elegant">
            <MapPin className="w-5 h-5 text-primary-foreground" />
          </span>
          ZIP Rent Lookup
        </h1>
        <p className="text-muted-foreground mt-2">Live area research, rent comps, demographics, and Street View — sourced from the web in real time.</p>
      </header>

      <div className="panel space-y-4">
        <div>
          <label htmlFor="zl-url" className="text-xs font-medium text-muted-foreground block mb-1.5">
            Property Listing URL <span className="text-muted-foreground/60">(optional — paste a Zillow, Redfin, Apartments.com, Realtor.com, or Craigslist link to pull exact specs & list price)</span>
          </label>
          <input
            id="zl-url" type="url" value={listingUrl} onChange={(e) => setListingUrl(e.target.value)}
            className="input-field"
            placeholder="https://www.zillow.com/homedetails/..."
          />
        </div>

        <div>
          <label htmlFor="zl-addr" className="text-xs font-medium text-muted-foreground block mb-1.5">Property Address <span className="text-muted-foreground/60">(optional — unlocks Street View, comps & rent-max strategy)</span></label>
          <input
            id="zl-addr" type="text" value={address} onChange={(e) => setAddress(e.target.value)}
            className="input-field"
            placeholder="123 Main St, Beverly Hills"
          />
        </div>

        {/* Auto-detect toggle — only meaningful when we have an address or URL */}
        {(address.trim() || listingUrl.trim()) && (
          <label htmlFor="zl-auto" className="flex items-start gap-3 p-3 rounded-xl bg-secondary/40 border border-border/60 cursor-pointer hover:border-primary/40 transition-colors">
            <input
              id="zl-auto" type="checkbox" checked={autoDetect} onChange={(e) => setAutoDetect(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-primary cursor-pointer"
            />
            <span className="text-sm">
              <span className="font-medium text-foreground">Auto-detect bed / bath / sqft from the listing</span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                Let the AI pull exact specs from the URL or public records for max accuracy — overrides the manual fields below.
              </span>
            </span>
          </label>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="zl-zip" className="text-xs font-medium text-muted-foreground block mb-1.5">ZIP Code</label>
            <input
              id="zl-zip" type="text" maxLength={5} value={zipCode}
              onChange={(e) => setZipCode(e.target.value.replace(/\D/g, ""))}
              className="input-field font-mono"
              placeholder="e.g. 90210"
            />
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
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
      </div>

      {data && (
        <div className="space-y-6 animate-fade-in">
          {/* Header summary */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold">{data.area.city}, {data.area.state} <span className="text-muted-foreground text-base font-normal">· {data.area.county}</span></h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{data.area.neighborhoodSummary}</p>
          </div>

          {/* Satellite + Street Map (when geo found) */}
          {data.geo && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                  <Satellite className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">Satellite View</h3>
                </div>
                <iframe
                  title="Satellite View"
                  src={`https://maps.google.com/maps?q=${data.geo.lat},${data.geo.lng}&t=k&z=18&output=embed`}
                  className="w-full h-[320px] border-0"
                  loading="lazy"
                />
              </div>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">Location & Neighborhood</h3>
                </div>
                <iframe
                  title="Location Map"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${data.geo.lng - 0.012},${data.geo.lat - 0.008},${data.geo.lng + 0.012},${data.geo.lat + 0.008}&layer=mapnik&marker=${data.geo.lat},${data.geo.lng}`}
                  className="w-full h-[320px] border-0"
                  loading="lazy"
                />
              </div>
            </div>
          )}

          {/* Property details (when address resolved) */}
          {data.property && (
            <div className="bg-card rounded-xl p-6 border border-border">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Home className="w-5 h-5 text-primary" /> Property Details
              </h3>
              <p className="text-sm text-muted-foreground mb-4">{data.property.addressNormalized} · {data.property.neighborhood}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label="Type" value={data.property.propertyType} />
                <MetricCard label="Year Built" value={`${data.property.yearBuilt}`} />
                <MetricCard label="Lot Size" value={`${fmtNum(data.property.lotSizeSqft)} sqft`} />
                <MetricCard label="Est. Value" value={fmtCurrency(data.property.estimatedValue)} variant="success" />
                <MetricCard label="Last Sold" value={fmtCurrency(data.property.lastSoldPrice)} subtitle={`${data.property.lastSoldYear}`} />
              </div>
            </div>
          )}

          {/* Rent Maximization Strategy */}
          {data.property?.rentMaxStrategy && (
            <div className="bg-card rounded-xl p-6 border border-primary/40 glow-primary">
              <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> Rent Maximization Strategy
              </h3>
              <p className="text-xs text-muted-foreground mb-4">Concrete actions to capture top-of-market rent for THIS property</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <MetricCard label="Suggested Rent" value={fmtCurrency(data.property.rentMaxStrategy.recommendedRent)} subtitle="Optimized listing price" variant="success" />
                <MetricCard label="Premium Rent" value={fmtCurrency(data.property.rentMaxStrategy.premiumRent)} subtitle="With value-adds applied" variant="success" />
                <MetricCard label="Best Time to List" value={data.property.rentMaxStrategy.seasonalTiming} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Action Items</p>
                  <ul className="space-y-2">
                    {data.property.rentMaxStrategy.tips.map((t, i) => (
                      <li key={i} className="text-sm flex gap-2">
                        <span className="text-primary mt-0.5">✓</span><span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Value-Add Features (Monthly $)</p>
                  <div className="space-y-1.5">
                    {data.property.rentMaxStrategy.amenityValueAdds.map((a, i) => (
                      <div key={i} className="flex justify-between items-center px-3 py-2 bg-secondary/50 rounded-md text-sm">
                        <span>{a.feature}</span>
                        <span className="font-mono font-bold text-success">+{fmtCurrency(a.monthlyValue)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-4 mb-2">Listing Headlines</p>
                  <ul className="space-y-1 text-sm italic text-foreground/80">
                    {data.property.rentMaxStrategy.marketingAngles.map((m, i) => (
                      <li key={i}>“{m}”</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Nearby Comps */}
          {data.property?.nearbyComps && data.property.nearbyComps.length > 0 && (
            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">🏘 Nearby Rental Comps</h3>
                {data.property.compSearchRadiusMi != null && (
                  <span className="text-xs text-muted-foreground">Search radius: {data.property.compSearchRadiusMi.toFixed(1)} mi</span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                      <th className="py-2">Address</th>
                      <th className="py-2 text-right">Beds/Baths</th>
                      <th className="py-2 text-right">Sqft</th>
                      <th className="py-2 text-right">Rent</th>
                      <th className="py-2 text-right">Distance</th>
                      <th className="py-2 text-right">Listed</th>
                      <th className="py-2 text-right">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.property.nearbyComps.map((c, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2.5">{c.address}</td>
                        <td className="py-2.5 text-right font-mono">{c.beds}/{c.baths}</td>
                        <td className="py-2.5 text-right font-mono">{fmtNum(c.sqft)}</td>
                        <td className="py-2.5 text-right font-mono font-bold">{fmtCurrency(c.rent)}</td>
                        <td className="py-2.5 text-right font-mono text-muted-foreground">{c.distanceMi.toFixed(1)} mi</td>
                        <td className="py-2.5 text-right font-mono text-muted-foreground">{c.listedWithinMonths != null ? `${c.listedWithinMonths}mo` : "—"}</td>
                        <td className="py-2.5 text-right">
                          {c.source ? (
                            <a href={c.source} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">link</a>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Home Value Triangulation */}
          {data.property?.valueTriangulation && (
            <div className="bg-card rounded-xl p-6 border border-border">
              <h3 className="text-lg font-semibold mb-4">💰 Home Value Triangulation</h3>
              <p className="text-xs text-muted-foreground mb-4">We pull three independent estimates and use the <strong>median</strong> — never extrapolate from neighborhood averages.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label="Zillow Zestimate" value={fmtCurrency(data.property.valueTriangulation.zillowZestimate)} />
                <MetricCard label="Redfin Estimate" value={fmtCurrency(data.property.valueTriangulation.redfinEstimate)} />
                <MetricCard label="County Assessed" value={fmtCurrency(data.property.valueTriangulation.countyAssessedValue)} />
                <MetricCard label="Est. Value (median)" value={fmtCurrency(data.property.valueTriangulation.medianUsed)} variant="success"
                  subtitle={`${data.property.valueTriangulation.confidence} confidence`} />
              </div>
            </div>
          )}



          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard label="Subject Estimate" value={fmtCurrency(data.rentEstimates.subjectEstimate)}
              subtitle={`${beds}bd/${baths}ba · ${sqft}sqft`} variant="success" />
            <MetricCard label="Rent Range" value={`${fmtCurrency(data.rentEstimates.rangeLow)} – ${fmtCurrency(data.rentEstimates.rangeHigh)}`} subtitle="Low to high market" />
            <MetricCard label="Median Rent" value={fmtCurrency(data.rentEstimates.medianOverall)} subtitle="Across all unit types" />
            <MetricCard label="YoY Change" value={`${data.rentEstimates.yoyChangePct > 0 ? "+" : ""}${data.rentEstimates.yoyChangePct.toFixed(1)}%`}
              subtitle="Year-over-year" variant={data.rentEstimates.yoyChangePct >= 0 ? "success" : "warning"} />
          </div>

          {/* Rent by unit type */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="text-lg font-semibold mb-4">📊 Market Rent by Unit Type</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={rentChart}>
                <XAxis dataKey="name" stroke="hsl(240, 5%, 55%)" fontSize={12} />
                <YAxis stroke="hsl(240, 5%, 55%)" fontSize={12} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ background: "hsl(240, 5%, 13%)", border: "1px solid hsl(240, 4%, 20%)", borderRadius: 8 }}
                  formatter={(v: number) => fmtCurrency(v)}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {rentChart.map((_, i) => (
                    <Cell key={i} fill={`hsl(${244 + i * 6}, 75%, ${58 + i * 3}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-2">Price per sqft: <span className="font-mono text-foreground">${data.rentEstimates.pricePerSqft.toFixed(2)}</span></p>
          </div>

          {/* Detailed Rent Derivation */}
          <div className="bg-card rounded-xl p-6 border border-primary/40 glow-primary">
            <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" /> How We Arrived at {fmtCurrency(data.rentEstimates.subjectEstimate)}
              </h3>
              {data.dataConfidence && (
                <span className={`text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-md border ${
                  data.dataConfidence === "High" ? "border-success/40 text-success bg-success/10" :
                  data.dataConfidence === "Medium" ? "border-warning/40 text-warning bg-warning/10" :
                  "border-destructive/40 text-destructive bg-destructive/10"
                }`}>{data.dataConfidence} Confidence</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-5">Transparent, line-by-line derivation — every dollar accounted for.</p>

            {data.rentBreakdown ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                  <div className="p-4 rounded-lg bg-secondary/40 border border-border">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Base Rent</p>
                    <p className="text-xl font-mono font-bold">{fmtCurrency(data.rentBreakdown.baseRent)}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{data.rentBreakdown.baseRentSource}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/40 border border-border">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Net Adjustments</p>
                    <p className={`text-xl font-mono font-bold ${
                      data.rentBreakdown.adjustments.reduce((s, a) => s + a.dollarImpact, 0) >= 0 ? "text-success" : "text-destructive"
                    }`}>
                      {data.rentBreakdown.adjustments.reduce((s, a) => s + a.dollarImpact, 0) >= 0 ? "+" : ""}
                      {fmtCurrency(data.rentBreakdown.adjustments.reduce((s, a) => s + a.dollarImpact, 0))}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">{data.rentBreakdown.adjustments.length} factors</p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/40">
                    <p className="text-[10px] uppercase tracking-wider text-primary mb-1">Final Estimate</p>
                    <p className="text-xl font-mono font-bold text-primary">{fmtCurrency(data.rentBreakdown.finalEstimate)}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Per month</p>
                  </div>
                </div>

                <div className="overflow-x-auto mb-5">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                        <th className="py-2">Factor</th>
                        <th className="py-2 text-right">Impact</th>
                        <th className="py-2">Rationale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rentBreakdown.adjustments.map((a, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-2.5 font-medium">{a.factor}</td>
                          <td className={`py-2.5 text-right font-mono font-semibold ${a.dollarImpact >= 0 ? "text-success" : "text-destructive"}`}>
                            {a.dollarImpact >= 0 ? "+" : ""}{fmtCurrency(a.dollarImpact)}
                          </td>
                          <td className="py-2.5 text-muted-foreground text-xs">{a.rationale}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Methodology</p>
                    <p className="text-sm text-foreground/90 leading-relaxed">{data.rentBreakdown.methodology}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Confidence Drivers</p>
                    <ul className="space-y-1.5">
                      {data.rentBreakdown.confidenceDrivers.map((d, i) => (
                        <li key={i} className="text-sm flex gap-2"><span className="text-primary mt-0.5">●</span><span>{d}</span></li>
                      ))}
                    </ul>
                  </div>
                </div>
              </>
            ) : null}

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Market Context</p>
              <ul className="space-y-2">
                {data.justification.map((j, i) => (
                  <li key={i} className="text-sm text-foreground/90 flex gap-2">
                    <span className="text-primary mt-1">▸</span><span>{j}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Entertainment by age group */}
          {data.entertainment && (
            <div className="bg-card rounded-xl p-6 border border-border">
              <h3 className="text-lg font-semibold mb-1 flex items-center gap-2"><Music className="w-5 h-5 text-primary" /> Entertainment & Things to Do</h3>
              <p className="text-xs text-muted-foreground mb-5">Real, named venues nearby — curated by age group.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {([
                  ["Kids (0–12)", data.entertainment.kids],
                  ["Teens (13–17)", data.entertainment.teens],
                  ["Young Adults (18–30)", data.entertainment.youngAdults],
                  ["Families", data.entertainment.families],
                  ["Seniors (55+)", data.entertainment.seniors],
                ] as const).map(([title, items]) => (
                  <div key={title} className="rounded-xl border border-border bg-secondary/30 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">{title}</p>
                    <ul className="space-y-3">
                      {(items || []).map((it, i) => (
                        <li key={i} className="text-sm">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-medium text-foreground">{it.name}</span>
                            <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">{it.distanceMi.toFixed(1)} mi</span>
                          </div>
                          <p className="text-[11px] text-primary/80 uppercase tracking-wider mt-0.5">{it.category}</p>
                          <p className="text-xs text-muted-foreground mt-1 leading-snug">{it.blurb}</p>
                        </li>
                      ))}
                      {(!items || items.length === 0) && <li className="text-xs text-muted-foreground italic">No verified venues found nearby.</li>}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Demographics */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Demographics</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <MetricCard label="Population" value={fmtNum(data.demographics.population)} />
              <MetricCard label="Median Income" value={fmtCurrency(data.demographics.medianHouseholdIncome)} />
              <MetricCard label="Median Age" value={`${data.demographics.medianAge}`} />
              <MetricCard label="Owner Occupied" value={`${data.demographics.ownerOccupiedPct}%`} />
              <MetricCard label="Renter Occupied" value={`${data.demographics.renterOccupiedPct}%`} />
              <MetricCard label="5yr Pop Growth" value={`${data.demographics.populationGrowth5yPct > 0 ? "+" : ""}${data.demographics.populationGrowth5yPct}%`} />
            </div>
          </div>

          {/* Economy */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Briefcase className="w-5 h-5 text-primary" /> Economy & Housing</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <MetricCard label="Unemployment" value={`${data.economy.unemploymentPct}%`} />
              <MetricCard label="Job Growth" value={`${data.economy.jobGrowthPct}%`} />
              <MetricCard label="Median Home Price" value={fmtCurrency(data.economy.medianHomePrice)} />
              <MetricCard label="1yr Appreciation" value={`${data.economy.homeAppreciation1yPct > 0 ? "+" : ""}${data.economy.homeAppreciation1yPct}%`}
                variant={data.economy.homeAppreciation1yPct >= 0 ? "success" : "warning"} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Major Employers</p>
              <div className="flex flex-wrap gap-2">
                {data.economy.majorEmployers.map((e, i) => (
                  <span key={i} className="px-2.5 py-1 bg-secondary border border-border rounded-md text-xs">{e}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Livability */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><GraduationCap className="w-5 h-5 text-primary" /> Livability & Schools</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <MetricCard label="Walk Score" value={`${data.livability.walkScore}`} subtitle="/ 100" />
              <MetricCard label="Transit Score" value={`${data.livability.transitScore}`} subtitle="/ 100" />
              <MetricCard label="Bike Score" value={`${data.livability.bikeScore}`} subtitle="/ 100" />
              <MetricCard label="Crime" value={data.livability.crimeIndex} />
              <MetricCard label="School Rating" value={`${data.livability.schoolRating}/10`} />
            </div>
            {data.livability.topSchools?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Top Schools</p>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-sm">
                  {data.livability.topSchools.map((s, i) => <li key={i}>• {s}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* Amenities */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-primary" /> Local Amenities</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              {([["Grocery", data.amenities.groceryStores], ["Parks", data.amenities.parks],
                 ["Restaurants", data.amenities.restaurants], ["Hospitals", data.amenities.hospitals]] as const).map(([title, list]) => (
                <div key={title}>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{title}</p>
                  <ul className="space-y-1">{list?.map((x, i) => <li key={i}>• {x}</li>)}</ul>
                </div>
              ))}
            </div>
          </div>

          {/* Rental Demand */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Rental Demand Signals</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <MetricCard label="Vacancy Rate" value={`${data.rentalDemand.vacancyRatePct}%`} />
              <MetricCard label="Days on Market" value={`${data.rentalDemand.avgDaysOnMarket}`} />
              <MetricCard label="Demand" value={data.rentalDemand.demandLevel} variant="success" />
              <MetricCard label="Rent / Income" value={`${data.rentalDemand.rentToIncomeRatioPct}%`} />
              <MetricCard label="Investor Score" value={`${data.rentalDemand.investorScore}/10`} variant="success" />
            </div>
          </div>

          {/* Sources */}
          {data.rentEstimates.sources?.length > 0 && (
            <div className="bg-card rounded-xl p-5 border border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Sources</p>
              <div className="flex flex-wrap gap-2">
                {data.rentEstimates.sources.map((s, i) => (
                  <a key={i} href={s} target="_blank" rel="noreferrer"
                    className="text-xs text-primary hover:underline truncate max-w-xs">
                    {s}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Data Sources & Confidence Audit */}
          {data.dataSourcesSummary && data.dataSourcesSummary.length > 0 && (
            <div className="bg-card rounded-xl p-6 border border-border">
              <h3 className="text-lg font-semibold mb-2">🔍 Data Sources & Confidence Summary</h3>
              <p className="text-xs text-muted-foreground mb-4">Every major data point, the source it came from, and how confident we are. Audit anything that matters.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                      <th className="py-2">Data Point</th>
                      <th className="py-2">Value</th>
                      <th className="py-2">Source</th>
                      <th className="py-2">Confidence</th>
                      <th className="py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.dataSourcesSummary.map((row, i) => {
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
        </div>
      )}
    </div>
  );
}
