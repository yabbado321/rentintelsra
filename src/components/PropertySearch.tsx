import { useState } from "react";
import { Search, Loader2, AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePropertyStore } from "@/lib/propertyStore";
import { useToast } from "@/hooks/use-toast";

/**
 * Address-driven auto-fill for the active property. Sends the typed address
 * to the secure `rentcast-lookup` edge function and merges the response into
 * the global Zustand store via `applyRentCastPayload`.
 */
export default function PropertySearch() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFilled, setLastFilled] = useState<string | null>(null);
  const apply = usePropertyStore((s) => s.applyRentCastPayload);
  const cacheZip = usePropertyStore((s) => s.cacheZip);
  const { toast } = useToast();

  const analyze = async () => {
    const a = address.trim();
    if (a.length < 5) { setError("Enter a full street address (street, city, state)."); return; }
    setLoading(true); setError(null); setLastFilled(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("rentcast-lookup", {
        body: { mode: "address", address: a },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);

      apply({
        address: data.addressNormalized,
        purchasePrice: data.purchasePrice,
        grossRent: data.grossRent,
        annualTaxes: data.annualTaxes,
        squareFootage: data.squareFootage,
        yearBuilt: data.yearBuilt,
        zip: data.zip,
      });

      // If the address response includes ZIP, opportunistically fetch market data for fallback.
      if (data.zip) {
        supabase.functions.invoke("rentcast-lookup", { body: { mode: "zip", zip: data.zip } })
          .then(({ data: z }) => { if (z && !z.error) cacheZip(z); })
          .catch(() => {});
      }

      setLastFilled(data.addressNormalized || a);
      toast({ title: "Property auto-filled", description: `Pulled live data for ${data.addressNormalized || a}` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Lookup failed";
      setError(msg);
      toast({ title: "Lookup failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-md gradient-primary flex items-center justify-center text-primary-foreground">
          <Sparkles size={14} />
        </span>
        <h3 className="font-semibold text-sm">Address Auto-Fill <span className="text-muted-foreground font-normal">· powered by RentCast</span></h3>
      </div>
      <div className="flex gap-2 flex-col sm:flex-row">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") analyze(); }}
          placeholder="123 Main St, Beverly Hills, CA 90210"
          className="input-field flex-1"
          disabled={loading}
        />
        <button onClick={analyze} disabled={loading || address.trim().length < 5} className="btn-primary whitespace-nowrap">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</> : <><Search className="w-4 h-4" /> Analyze Deal</>}
        </button>
      </div>
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}
      {lastFilled && !error && (
        <div className="flex items-center gap-2 text-sm text-success">
          <CheckCircle2 className="w-4 h-4" /> Filled price, rent, taxes & specs for <strong className="font-semibold">{lastFilled}</strong>
        </div>
      )}
    </div>
  );
}
