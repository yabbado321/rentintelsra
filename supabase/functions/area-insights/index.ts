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

const SYSTEM = `You are a US real-estate market analyst with access to live web search. Accuracy and auditability are non-negotiable.

# ABSOLUTE ACCURACY RULE (highest priority — overrides everything else)
Prioritize 100% certain results. For EVERY numeric or factual value you output:
  - If you have directly verified it from a named, authoritative live source → mark confidence "High" and cite the exact source URL/name.
  - If you are inferring, modeling, averaging, extrapolating, or are not 100% certain → you MUST prefix the value's display string with "Estimated " (e.g. "Estimated $2,450") AND set confidence "Medium" or "Low" AND add an entry to dataSourcesSummary noting it is an estimate.
  - If you cannot verify and cannot reasonably estimate → return 0 (numeric) or "Insufficient data — manual verification recommended" (string) with confidence "Low". Do NOT fabricate.
  - Never present an estimated, modeled, or inferred number as if it were a verified fact. When in doubt, label it Estimated.
  - Add a top-level field "accuracyNotice": "Values prefixed 'Estimated' are modeled or inferred and not directly verified." whenever ANY field is estimated.

# STRICT SOURCING RULES — follow exactly

## 1. PROPERTY-LEVEL FACTS (year built, sqft, beds/baths, lot size) — source hierarchy:
  1. County Assessor / Tax Records (ground truth)
  2. Zillow property facts
  3. Redfin public records
  4. Realtor.com (tiebreaker)
  If sources conflict, DEFER to the county assessor. Never average. Flag the discrepancy in confidenceDrivers.

## 2. SELF-CONSISTENCY CHECK (run internally before output):
  - sqft in rentBreakdown.adjustments MUST match property.sqft
  - bedroom count in HUD FMR base MUST match property bedrooms (and the subject estimate)
  - yearBuilt is consistent everywhere
  - every nearbyComps entry is a real address, within 0.5mi (or note widening to 1mi), same property type, ±1 bedroom, listed/rented within 6 months, with a source URL
  If any check fails, FIX before responding. Never output contradictions.

## 3. DEMOGRAPHICS — ZIP-level only, never city/MSA:
  Pull from U.S. Census ACS 5-Year Estimates for the SPECIFIC ZIP. Cite the data year (e.g. "2024 ACS"). Never substitute Fargo city pop (~135k) for ZIP 58103 pop (~40-50k).

## 4. HOME VALUE — triangulate three sources, report the median:
  Pull (a) Zillow Zestimate (b) Redfin Estimate (c) county assessed value for the specific address. Report all three in property.valueTriangulation and use the MEDIAN as estimatedValue. Never extrapolate from neighborhood medians alone.

## 5. RENT COMPS — strict validity:
  Same ZIP or ≤0.5mi, same property type (SFH ≠ apartment), ±1 bedroom, listed within 6 months, verifiable source URL. If <3 valid comps, widen to 1mi and state so explicitly in confidenceDrivers.

## 6. MARKET DATA — labeled by source in this priority:
  1. Rentometer (ZIP rent distribution)
  2. RentHop (ZIP median by bedroom)
  3. HUD FMR (MSA — floor/baseline only)
  4. Zillow Rent Zestimate (subject address)
  Never blend geographic scopes without noting it.

## 7. CONFIDENCE FLAGS — append to EVERY major data point:
  "High" = 2+ authoritative sources agree
  "Medium" = single source, or <10% disagreement
  "Low" = significant conflict OR extrapolated/estimated
  Low-confidence items must include a "wouldImproveWith" note.

## 8. WHEN DATA IS UNAVAILABLE:
  State "Insufficient data — manual verification recommended." Do NOT fabricate plausible-sounding numbers. Do NOT use city averages as ZIP/property substitutes.

Cross-reference at least 3 independent sources before stating any number. NEVER invent comp addresses. If you cannot verify, mark confidence "Low" and widen ranges.

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
  "rentBreakdown": {
    // Transparent step-by-step derivation of subjectEstimate. Every number must reconcile:
    // baseRent + sum(adjustments[].dollarImpact) ≈ finalEstimate (±$25).
    "baseRent": number,           // Starting point: HUD SAFMR or ZIP median for the unit size
    "baseRentSource": string,     // e.g. "HUD 2024 SAFMR — 2BR Los Angeles-Long Beach-Anaheim MSA"
    "adjustments": [
      {
        "factor": string,         // "Bedroom count", "Square footage premium", "Walk Score 92", "School rating 9/10", "In-unit laundry", "Sub-market premium (Beverly Hills)"
        "dollarImpact": number,   // signed $ adjustment vs. base
        "rationale": string       // 1-sentence cite-able reasoning
      }
    ],
    "finalEstimate": number,      // MUST equal rentEstimates.subjectEstimate
    "methodology": string,        // 2-3 sentences describing weighting (HUD SAFMR + comp regression + amenity hedonic model)
    "confidenceDrivers": string[] // why High/Medium/Low confidence (e.g. "5 comps within 0.5mi", "no recent listings — using ZIP median")
  },
  "entertainment": {
    // Real, named venues only — no generic "local parks". Each item must be a place a user can Google.
    "kids": [{ "name": string, "category": string, "distanceMi": number, "ageRange": string, "blurb": string }],        // 0-12: playgrounds, children's museums, zoos, family attractions
    "teens": [{ "name": string, "category": string, "distanceMi": number, "ageRange": string, "blurb": string }],       // 13-17: arcades, skate parks, mini-golf, escape rooms, malls
    "youngAdults": [{ "name": string, "category": string, "distanceMi": number, "ageRange": string, "blurb": string }], // 18-30: nightlife, breweries, live music, sports bars, climbing gyms
    "families": [{ "name": string, "category": string, "distanceMi": number, "ageRange": string, "blurb": string }],    // multi-gen: parks, festivals, family restaurants, movie theaters
    "seniors": [{ "name": string, "category": string, "distanceMi": number, "ageRange": string, "blurb": string }]      // 55+: golf, community centers, theaters, gardens, libraries
  },
  "justification": string[],     // 4-6 bullet sentences explaining WHY rent in this ZIP is what it is
  "dataConfidence": "Low" | "Medium" | "High",
  "lastUpdated": string,         // ISO date you sourced the data

  // REQUIRED — audit trail. One entry per major data point.
  "dataSourcesSummary": [
    {
      "field": string,           // e.g. "Year Built", "ZIP 58103 Population", "Subject Rent Estimate", "Estimated Home Value"
      "value": string,           // the value as reported (with units)
      "source": string,          // e.g. "Cass County Assessor", "2024 ACS 5-Year (ZIP 58103)", "Median of Zillow/Redfin/County"
      "confidence": "High" | "Medium" | "Low",  // ✅ / ⚠️ / ❌
      "notes": string            // why this confidence, or "wouldImproveWith" hint if Low
    }
  ],

  // Only when an address is provided — otherwise omit:
  "property"?: {
    "addressNormalized": string,
    "yearBuilt": number,
    "yearBuiltSource": string,    // e.g. "Cass County Assessor 2024"
    "lotSizeSqft": number,
    "estimatedValue": number,     // MEDIAN of the three values below
    "valueTriangulation": {
      "zillowZestimate": number,
      "redfinEstimate": number,
      "countyAssessedValue": number,
      "medianUsed": number,       // = estimatedValue
      "confidence": "High" | "Medium" | "Low"
    },
    "lastSoldPrice": number,
    "lastSoldYear": number,
    "propertyType": string,       // SFH, condo, townhome, multifamily, apartment — comps must match
    "neighborhood": string,
    "nearbyComps": [
      // Each comp MUST: same ZIP or ≤0.5mi, same propertyType, ±1 bedroom, listed/rented within 6 months
      { "address": string, "beds": number, "baths": number, "sqft": number, "rent": number, "distanceMi": number, "listedWithinMonths": number, "source": string }
    ],
    "compSearchRadiusMi": number, // 0.5 default; note if widened to 1.0

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

Use the most recent data you can. If a number truly cannot be sourced, set it to 0 and add an "Insufficient data" entry in dataSourcesSummary with confidence "Low" rather than guessing. Every report MUST include the dataSourcesSummary audit array.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { zip, address, listingUrl, beds, baths, sqft, autoDetect } = await req.json() as Body;
    if (!zip || !/^\d{5}$/.test(zip)) {
      return new Response(JSON.stringify({ error: 'Valid 5-digit ZIP required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const geo = await geocode(address ? `${address}, ${zip}` : zip);

    const useAuto = autoDetect || (beds == null && baths == null && sqft == null);
    const subjectLine = useAuto
      ? `Subject property: AUTO-DETECT beds/baths/sqft from the listing URL${listingUrl ? '' : ' and/or public records for the address'}. Echo the detected values in property.addressNormalized + nearbyComps reasoning. If unverifiable, fall back to the ZIP's median 2bd/1ba/1000sqft and mark dataConfidence "Low".`
      : `Subject property: ${beds ?? 2} bed / ${baths ?? 1} bath / ${sqft ?? 1000} sqft`;

    const userPrompt = `ZIP code: ${zip}
${address ? `Property address: ${address}` : ''}
${listingUrl ? `Property listing URL: ${listingUrl}  ← FETCH THIS PAGE FIRST. Extract list price, beds, baths, sqft, year built, lot size, amenities, photos description, days on market, price history, HOA, and any rent or sale signals. Cross-reference against Zillow/Redfin/Realtor for the same address before committing to numbers.` : ''}
${subjectLine}
Today's date: ${new Date().toISOString().slice(0, 10)}

Search the web for the most current rental market data, demographics, schools, crime, walkability, employers, and amenities for this ZIP.${address || listingUrl ? ` Also research the SPECIFIC property — pull year built, lot size, last sale, 3-5 nearby comparable rentals, and craft a detailed rent-maximization strategy with concrete tips, value-add features with dollar amounts, optimal listing season, and listing headlines that justify premium pricing. Set subjectEstimate using the verified specs.` : ''} Return ONLY the JSON object — no prose, no markdown fences.`;

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
        max_tokens: 16000,
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
    let data: any;
    const tryParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };
    const repair = (s: string) => {
      // Strip trailing junk after last complete brace, then rebalance
      let str = s.trim().replace(/^```json\s*|```$/g, '');
      // Remove trailing commas before } or ]
      str = str.replace(/,(\s*[}\]])/g, '$1');
      // If truncated mid-array/object, trim to last balanced point
      const stack: string[] = [];
      let lastGood = -1;
      let inStr = false, esc = false;
      for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (inStr) {
          if (esc) esc = false;
          else if (c === '\\') esc = true;
          else if (c === '"') inStr = false;
          continue;
        }
        if (c === '"') inStr = true;
        else if (c === '{' || c === '[') stack.push(c);
        else if (c === '}' || c === ']') stack.pop();
        if (!inStr && stack.length === 0 && (c === '}' || c === ']')) lastGood = i;
      }
      let truncated = lastGood >= 0 ? str.slice(0, lastGood + 1) : str;
      // If still unbalanced, append closers
      const s2 = truncated;
      const opens: string[] = [];
      let inS = false, es = false;
      for (let i = 0; i < s2.length; i++) {
        const c = s2[i];
        if (inS) { if (es) es = false; else if (c === '\\') es = true; else if (c === '"') inS = false; continue; }
        if (c === '"') inS = true;
        else if (c === '{') opens.push('}');
        else if (c === '[') opens.push(']');
        else if (c === '}' || c === ']') opens.pop();
      }
      while (opens.length) truncated += opens.pop();
      return truncated;
    };
    data = tryParse(content);
    if (!data) {
      const m = content.match(/\{[\s\S]*\}/);
      data = m ? tryParse(m[0]) : null;
    }
    if (!data) {
      data = tryParse(repair(content)) ?? {};
      console.warn('area-insights: JSON repaired from truncated AI output');
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
