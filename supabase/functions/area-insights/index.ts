import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface Body {
  zip: string;
  address?: string;
  listingUrl?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  autoDetect?: boolean;
}

interface GeoResult {
  lat: number;
  lon: number;
  displayName: string;
}

async function geocode(query: string): Promise<GeoResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'RentIntel/1.0 (lovable.app)' } });
    if (!res.ok) return null;
    const arr = await res.json();
    if (!arr?.length) return null;
    return { lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon), displayName: arr[0].display_name };
  } catch { return null; }
}

const SYSTEM = `You are a US real-estate market analyst with access to live web search.
Accuracy is paramount. Cross-reference at least 3 independent sources (Zillow, Apartments.com, Rentometer, Realtor.com, RentCafe, Zumper, HUD FMR, Census ACS, BLS, GreatSchools, NeighborhoodScout) before stating any number. If sources disagree, return the median and widen the range. NEVER invent comp addresses — only return real listings you can cite. If you cannot verify a value, mark dataConfidence "Low" and widen rangeLow/rangeHigh.

For the given ZIP code, return STRICT JSON (no markdown) matching this TypeScript type:

{
  "area": { "city": string, "state": string, "county": string, "neighborhoodSummary": string },
  "rentEstimates": {
    "studio": number, "oneBed": number, "twoBed": number, "threeBed": number, "fourBed": number,
    "medianOverall": number, "pricePerSqft": number,
    "subjectEstimate": number,  // for the requested beds/baths/sqft
    "rangeLow": number, "rangeHigh": number,
    "yoyChangePct": number,
    "sources": string[]         // 2-5 source URLs (Zillow, Apartments.com, RentCafe, Rentometer, HUD, Zumper, Realtor.com, etc.) used as of today
  },
  "demographics": {
    "population": number, "medianHouseholdIncome": number, "medianAge": number,
    "ownerOccupiedPct": number, "renterOccupiedPct": number, "populationGrowth5yPct": number
  },
  "economy": {
    "unemploymentPct": number, "majorEmployers": string[], "jobGrowthPct": number,
    "medianHomePrice": number, "homeAppreciation1yPct": number
  },
  "livability": {
    "walkScore": number, "transitScore": number, "bikeScore": number,
    "crimeIndex": string,        // "Low" | "Below Avg" | "Average" | "Above Avg" | "High"
    "schoolRating": number,      // 1-10
    "topSchools": string[]
  },
  "amenities": {
    "groceryStores": string[], "parks": string[], "restaurants": string[], "hospitals": string[]
  },
  "rentalDemand": {
    "vacancyRatePct": number, "avgDaysOnMarket": number,
    "demandLevel": string,       // "Very Low" | "Low" | "Moderate" | "High" | "Very High"
    "rentToIncomeRatioPct": number,
    "investorScore": number      // 1-10
  },
  "justification": string[],     // 4-6 bullet sentences explaining WHY rent in this ZIP is what it is
  "dataConfidence": "Low" | "Medium" | "High",
  "lastUpdated": string,         // ISO date you sourced the data

  // Only when an address is provided — otherwise omit:
  "property"?: {
    "addressNormalized": string,
    "yearBuilt": number,
    "lotSizeSqft": number,
    "estimatedValue": number,
    "lastSoldPrice": number,
    "lastSoldYear": number,
    "propertyType": string,
    "neighborhood": string,
    "nearbyComps": [
      { "address": string, "beds": number, "baths": number, "sqft": number, "rent": number, "distanceMi": number }
    ],
    "rentMaxStrategy": {
      "recommendedRent": number,
      "premiumRent": number,
      "tips": string[],
      "amenityValueAdds": [{ "feature": string, "monthlyValue": number }],
      "seasonalTiming": string,
      "marketingAngles": string[]
    }
  }
}

Use the most recent data you can. If unsure about a number, give a reasonable estimate but never null.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { zip, address, beds = 2, baths = 1, sqft = 1000 } = await req.json() as Body;
    if (!zip || !/^\d{5}$/.test(zip)) {
      return new Response(JSON.stringify({ error: 'Valid 5-digit ZIP required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const geo = await geocode(address ? `${address}, ${zip}` : zip);

    const userPrompt = `ZIP code: ${zip}
${address ? `Property address: ${address}` : ''}
Subject property: ${beds} bed / ${baths} bath / ${sqft} sqft
Today's date: ${new Date().toISOString().slice(0, 10)}

Search the web for the most current rental market data, demographics, schools, crime, walkability, employers, and amenities for this ZIP.${address ? ` Also research the SPECIFIC property at the address — pull year built, lot size, last sale, 3-5 nearby comparable rentals, and craft a detailed rent-maximization strategy with concrete tips, value-add features with dollar amounts, optimal listing season, and listing headlines that justify premium pricing.` : ''} Return ONLY the JSON object — no prose, no markdown fences.`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, try again shortly.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Add credits in Lovable Cloud settings.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error ${aiRes.status}: ${txt}`);
    }

    const ai = await aiRes.json();
    const content = ai.choices?.[0]?.message?.content ?? '{}';
    let data;
    try {
      data = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      data = m ? JSON.parse(m[0]) : {};
    }

    if (geo) data.geo = { lat: geo.lat, lng: geo.lon, displayName: geo.displayName };

    return new Response(JSON.stringify(data), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('area-insights error', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
