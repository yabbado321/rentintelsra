import { TrendingUp, DollarSign, Ruler, Loader2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePropertyStore, type ZipMarketData } from "@/lib/propertyStore";

const fmt$ = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

function yieldStyle(label: string) {
  if (label.startsWith("High")) return "bg-success/15 text-success border-success/40";
  if (label.startsWith("Balanced")) return "bg-primary/15 text-primary border-primary/40";
  return "bg-warning/15 text-warning border-warning/40";
}

/**
 * Compact RentCast market-stats dashboard. Reads from the global ZIP cache
 * first; only hits the network on cache miss.
 */
export default function MarketDashboard({ defaultZip = "" }: { defaultZip?: string }) {
  const [zip, setZip] = useState(defaultZip);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const data = usePropertyStore((s) => (zip ? s.zipCache[zip] : undefined));
  const cacheZip = usePropertyStore((s) => s.cacheZip);

  const fetchZip = async (target: string) => {
    if (!/^\d{5}$/.test(target)) { setError("Enter a 5-digit ZIP"); return; }
    setError(null);
    // Cache hit → no network.
    const cached = usePropertyStore.getState().zipCache[target];
    if (cached) { setZip(target); return; }
    setLoading(true);
    try {
      const { data: res, error: fnErr } = await supabase.functions.invoke("rentcast-lookup", {
        body: { mode: "zip", zip: target },
      });
      if (fnErr) throw fnErr;
      if (res?.error) throw new Error(res.error);
      cacheZip(res as ZipMarketData);
      setZip(target);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Market lookup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-md gradient-primary flex items-center justify-center text-primary-foreground">
            <TrendingUp size={14} />
          </span>
          <h3 className="font-semibold text-sm">Market Intelligence <span className="text-muted-foreground font-normal">· RentCast aggregates</span></h3>
        </div>
        <div className="flex gap-2">
          <input
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
            onKeyDown={(e) => { if (e.key === "Enter") fetchZip(zip); }}
            placeholder="ZIP"
            className="input-field font-mono w-28 py-1.5"
            maxLength={5}
          />
          <button onClick={() => fetchZip(zip)} disabled={loading} className="btn-primary py-1.5 text-xs">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Load"}
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-destructive flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat icon={<DollarSign size={14} />} label="Median Rent" value={fmt$(data.medianRent) + "/mo"} />
          <Stat icon={<Ruler size={14} />} label="Avg $/Sqft" value={`$${data.avgPricePerSqft.toFixed(0)}`} />
          <Stat label="Vacancy Rate" value={`${data.vacancyRatePct}%`} subtitle={`${data.avgDaysOnMarket}d on market`} />
          <div className="metric-card flex flex-col items-start justify-center">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.14em] mb-1">Yield</span>
            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold border ${yieldStyle(data.yieldLabel)}`}>
              {data.yieldLabel}
            </span>
            <span className="text-[10px] text-muted-foreground mt-1 font-mono">{data.grossYieldPct}% gross</span>
          </div>
        </div>
      )}

      {!data && !error && (
        <p className="text-xs text-muted-foreground">Search a ZIP to load median rent, $/sqft, vacancy and yield classification for that market. Cached locally — re-queries are instant.</p>
      )}
    </div>
  );
}

function Stat({ icon, label, value, subtitle }: { icon?: React.ReactNode; label: string; value: string; subtitle?: string }) {
  return (
    <div className="metric-card">
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon && <span className="text-primary/80">{icon}</span>}
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className="text-xl font-bold font-mono tracking-tight">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground/80 mt-1">{subtitle}</p>}
    </div>
  );
}
