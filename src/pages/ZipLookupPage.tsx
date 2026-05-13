import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import MetricCard from "@/components/MetricCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Loader2, MapPin, Users, Briefcase, GraduationCap, ShoppingBag, TrendingUp, AlertCircle, Home, Sparkles, Eye } from "lucide-react";

interface Comp { address: string; beds: number; baths: number; sqft: number; rent: number; distanceMi: number; }
interface AreaData {
  area: { city: string; state: string; county: string; neighborhoodSummary: string };
  rentEstimates: {
    studio: number; oneBed: number; twoBed: number; threeBed: number; fourBed: number;
    medianOverall: number; pricePerSqft: number; subjectEstimate: number;
    rangeLow: number; rangeHigh: number; yoyChangePct: number; sources: string[];
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
  geo?: { lat: number; lng: number; displayName: string };
  property?: {
    addressNormalized: string; yearBuilt: number; lotSizeSqft: number;
    estimatedValue: number; lastSoldPrice: number; lastSoldYear: number;
    propertyType: string; neighborhood: string;
    nearbyComps: Comp[];
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
  const [beds, setBeds] = useState(2);
  const [baths, setBaths] = useState(1);
  const [sqft, setSqft] = useState(1000);
  const [data, setData] = useState<AreaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
    if (!zipCode || zipCode.length !== 5) {
      setError("Enter a valid 5-digit ZIP code");
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const { data: res, error: fnErr } = await supabase.functions.invoke("area-insights", {
        body: { zip: zipCode, address: address.trim() || undefined, beds, baths, sqft },
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">📍 ZIP Rent Lookup</h1>
        <p className="text-muted-foreground mt-1">Live market data sourced from the web — everything that justifies rent in this ZIP.</p>
      </div>

      {/* Inputs */}
      <div className="bg-card rounded-xl p-6 border border-border space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Property Address <span className="text-muted-foreground/60">(optional — unlocks Street View, comps & rent-max strategy)</span></label>
          <input
            type="text" value={address} onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            placeholder="123 Main St, Beverly Hills"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">ZIP Code</label>
            <input
              type="text" maxLength={5} value={zipCode}
              onChange={(e) => setZipCode(e.target.value.replace(/\D/g, ""))}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              placeholder="e.g. 90210"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Bedrooms</label>
            <input type="number" min={0} value={beds} onChange={(e) => setBeds(Number(e.target.value))}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Bathrooms</label>
            <input type="number" min={0} value={baths} onChange={(e) => setBaths(Number(e.target.value))}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Square Footage</label>
            <input type="number" min={0} step={50} value={sqft} onChange={(e) => setSqft(Number(e.target.value))}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
          </div>
        </div>
        <button onClick={analyze} disabled={loading}
          className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-all inline-flex items-center gap-2 disabled:opacity-50">
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

          {/* Street View + Map (when geo found) */}
          {data.geo && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">Street View</h3>
                </div>
                <iframe
                  title="Street View"
                  src={`https://www.google.com/maps?layer=c&cbll=${data.geo.lat},${data.geo.lng}&output=embed`}
                  className="w-full h-[320px] border-0"
                  loading="lazy"
                />
              </div>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">Location</h3>
                </div>
                <iframe
                  title="Map"
                  src={`https://www.google.com/maps?q=${data.geo.lat},${data.geo.lng}&z=15&output=embed`}
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
              <h3 className="text-lg font-semibold mb-4">🏘 Nearby Rental Comps</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                      <th className="py-2">Address</th>
                      <th className="py-2 text-right">Beds/Baths</th>
                      <th className="py-2 text-right">Sqft</th>
                      <th className="py-2 text-right">Rent</th>
                      <th className="py-2 text-right">Distance</th>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {rentChart.map((_, i) => (
                    <Cell key={i} fill={`hsl(${142 + i * 8}, 70%, ${50 + i * 2}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-2">Price per sqft: <span className="font-mono text-foreground">${data.rentEstimates.pricePerSqft.toFixed(2)}</span></p>
          </div>

          {/* Justification */}
          <div className="bg-card rounded-xl p-6 border border-primary/30 glow-primary">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Why Rent Is What It Is</h3>
            <ul className="space-y-2">
              {data.justification.map((j, i) => (
                <li key={i} className="text-sm text-foreground/90 flex gap-2">
                  <span className="text-primary mt-1">▸</span><span>{j}</span>
                </li>
              ))}
            </ul>
          </div>

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
        </div>
      )}
    </div>
  );
}
