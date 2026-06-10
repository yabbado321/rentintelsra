// Secure RentCast proxy — keeps RENTCAST_API_KEY server-side only.
// Supports two modes:
//   { mode: "address", address: "123 Main St, Beverly Hills, CA 90210" }
//   { mode: "zip",     zip: "90210" }
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const API_KEY = Deno.env.get("RENTCAST_API_KEY");
const BASE = "https://api.rentcast.io/v1";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function rc(path: string, params: Record<string, string>) {
  const url = new URL(`${BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => v && url.searchParams.set(k, v));
  const res = await fetch(url, { headers: { "X-Api-Key": API_KEY!, Accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RentCast ${path} ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!API_KEY) return json({ error: "RENTCAST_API_KEY is not configured. Add it in project secrets to enable address & market lookups." }, 503);

    const body = await req.json().catch(() => ({}));
    const mode = body?.mode;

    if (mode === "address") {
      const address = String(body.address || "").trim();
      if (!address) return json({ error: "Address is required" }, 400);

      // 1) Property record (AVM, specs, tax history) — array response
      const propRes = await rc("/properties", { address });
      const prop = Array.isArray(propRes) ? propRes[0] : propRes;
      if (!prop) return json({ error: "Address not found or invalid" }, 404);

      // 2) AVM value estimate (separate endpoint, gives confidence range)
      let avm: any = null;
      try { avm = await rc("/avm/value", { address }); } catch { /* optional */ }

      // 3) Long-term rent estimate
      let rentEst: any = null;
      try { rentEst = await rc("/avm/rent/long-term", { address }); } catch { /* optional */ }

      // Latest tax year amount (if present)
      const taxHistory = prop.taxAssessments || prop.propertyTaxes || {};
      const taxYears = Object.keys(taxHistory).sort().reverse();
      const latestTax = taxYears.length ? Number(taxHistory[taxYears[0]]?.total ?? taxHistory[taxYears[0]]?.value ?? 0) : 0;

      const estimatedValue = Number(avm?.price ?? prop.price ?? prop.lastSalePrice ?? 0);
      const rentEstimate   = Number(rentEst?.rent ?? prop.rentEstimate ?? 0);

      return json({
        mode: "address",
        addressNormalized: prop.formattedAddress || address,
        purchasePrice: estimatedValue,
        grossRent: rentEstimate,
        annualTaxes: latestTax,
        squareFootage: Number(prop.squareFootage ?? 0),
        yearBuilt: Number(prop.yearBuilt ?? 0),
        bedrooms: Number(prop.bedrooms ?? 0),
        bathrooms: Number(prop.bathrooms ?? 0),
        propertyType: prop.propertyType ?? null,
        zip: prop.zipCode ?? null,
        confidence: avm?.priceRangeLow && avm?.priceRangeHigh
          ? { low: avm.priceRangeLow, high: avm.priceRangeHigh }
          : null,
        raw: { prop, avm, rentEst },
      });
    }

    if (mode === "zip") {
      const zip = String(body.zip || "").trim();
      if (!/^\d{5}$/.test(zip)) return json({ error: "5-digit ZIP code required" }, 400);

      // Market stats — sale + rental
      const [sale, rental] = await Promise.all([
        rc("/markets", { zipCode: zip, dataType: "Sale" }).catch(() => null),
        rc("/markets", { zipCode: zip, dataType: "Rental" }).catch(() => null),
      ]);

      const saleData   = sale?.saleData   || sale   || {};
      const rentalData = rental?.rentalData || rental || {};
      const byBedrooms = rentalData?.dataByBedrooms || [];

      const bedroomRents: Record<string, number> = {};
      for (const b of byBedrooms) {
        bedroomRents[`bed_${b.bedrooms}`] = Number(b.averageRent ?? 0);
      }

      const medianRent      = Number(rentalData?.averageRent ?? rentalData?.medianRent ?? 0);
      const avgPricePerSqft = Number(saleData?.averagePricePerSquareFoot ?? saleData?.medianPricePerSquareFoot ?? 0);
      const medianPrice     = Number(saleData?.averagePrice ?? saleData?.medianPrice ?? 0);
      // RentCast "Rental" market doesn't expose vacancy directly; estimate from days-on-market.
      const avgDom          = Number(rentalData?.averageDaysOnMarket ?? 30);
      const vacancyRatePct  = Math.max(2, Math.min(15, +(avgDom / 365 * 100).toFixed(1)));

      // Yield ratio (annual rent / price) — used for the yield badge.
      const grossYield = medianPrice > 0 ? (medianRent * 12) / medianPrice * 100 : 0;
      const yieldLabel = grossYield >= 8 ? "High Yield" : grossYield >= 5 ? "Balanced" : "Low Yield / Equity-First";

      return json({
        mode: "zip",
        zip,
        medianRent,
        avgPricePerSqft,
        medianPrice,
        vacancyRatePct,
        avgDaysOnMarket: avgDom,
        bedroomRents,
        grossYieldPct: +grossYield.toFixed(2),
        yieldLabel,
      });
    }

    return json({ error: "mode must be 'address' or 'zip'" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
