import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

/**
 * RentCast-first property lookup.
 * ------------------------------------------------------------------
 * RentCast is the SINGLE SOURCE OF TRUTH for every property fact,
 * rent estimate, valuation and rental comparable returned here.
 *
 * The AI model is called at most once and is only ever allowed to
 * produce non-numeric neighborhood narrative / points of interest.
 * It can never emit a property fact, a rent figure, a comp, or a
 * value that feeds a calculation. Its output is returned under
 * `aiContext` and is labeled "Estimated" for the UI.
 */

const RENTCAST_BASE = 'https://api.rentcast.io/v1';

interface Body {
  zip?: string;
  address?: string;
  listingUrl?: string;
}

interface ApiError { endpoint: string; status: number; message: string }

/* ------------------------------------------------------------------ */
/* Listing-URL address extraction — the URL is treated as INPUT ONLY.  */
/* No data is ever attributed to the listing site.                     */
/* ------------------------------------------------------------------ */

const titleize = (slug: string) =>
  slug
    .split('-')
    .filter(Boolean)
    .map((w) => (/^[A-Z]{2}$/.test(w) || /^\d/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');

/** Turns "1234-Main-St-Fargo-ND-58103" into "1234 Main St, Fargo, ND 58103". */
function slugToAddress(slug: string): string | null {
  const parts = slug.split('-').filter(Boolean);
  if (parts.length < 4) return null;
  const zipIdx = parts.findIndex((p) => /^\d{5}$/.test(p));
  const stateIdx = parts.findIndex((p, i) => /^[A-Za-z]{2}$/.test(p) && (zipIdx === -1 || i === zipIdx - 1));
  if (stateIdx <= 1) return null;
  const zip = zipIdx > -1 ? parts[zipIdx] : '';
  const state = parts[stateIdx].toUpperCase();
  // City is the token(s) directly before the state. Assume 1-3 tokens.
  const cityStart = Math.max(1, stateIdx - 3);
  // Heuristic: street ends at a common street suffix.
  const SUFFIX = /^(st|street|ave|avenue|rd|road|dr|drive|ln|lane|ct|court|blvd|boulevard|way|pl|place|ter|terrace|cir|circle|pkwy|parkway|trl|trail|hwy|loop|run|pt|point|sq|square|N|S|E|W|NE|NW|SE|SW)$/i;
  let streetEnd = -1;
  for (let i = 1; i < stateIdx; i++) if (SUFFIX.test(parts[i])) streetEnd = i;
  const street = titleize(parts.slice(0, streetEnd > 0 ? streetEnd + 1 : Math.max(2, cityStart)).join('-'));
  const city = titleize(parts.slice(streetEnd > 0 ? streetEnd + 1 : cityStart, stateIdx).join('-'));
  if (!street || !city) return null;
  return `${street}, ${city}, ${state}${zip ? ` ${zip}` : ''}`;
}

function extractAddressFromUrl(rawUrl: string): { address: string | null; method: string } {
  let u: URL;
  try { u = new URL(rawUrl); } catch { return { address: null, method: 'Invalid URL' }; }
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  const segs = u.pathname.split('/').filter(Boolean);

  // Zillow: /homedetails/<slug>/<zpid>_zpid/
  if (host.includes('zillow.com')) {
    const i = segs.indexOf('homedetails');
    const slug = i > -1 ? segs[i + 1] : segs.find((s) => /-\d{5}$/.test(s));
    if (slug) return { address: slugToAddress(slug), method: 'Parsed from Zillow URL path' };
  }
  // Redfin: /<ST>/<City>/<street-slug-ZIP>/home/<id>
  if (host.includes('redfin.com')) {
    const hi = segs.indexOf('home');
    if (hi >= 3) {
      const slug = segs[hi - 1];
      const city = titleize(segs[hi - 2]);
      const state = segs[hi - 3].toUpperCase();
      const zip = slug.match(/(\d{5})$/)?.[1] ?? '';
      const street = titleize(slug.replace(/-\d{5}$/, ''));
      if (street && city) return { address: `${street}, ${city}, ${state}${zip ? ` ${zip}` : ''}`, method: 'Parsed from Redfin URL path' };
    }
  }
  // Realtor.com: /realestateandhomes-detail/<Street>_<City>_<ST>_<ZIP>_M...
  if (host.includes('realtor.com')) {
    const seg = segs.find((s) => s.includes('_'));
    if (seg) {
      const p = seg.split('_');
      if (p.length >= 4) {
        return {
          address: `${titleize(p[0])}, ${titleize(p[1])}, ${p[2].toUpperCase()} ${/^\d{5}$/.test(p[3]) ? p[3] : ''}`.trim(),
          method: 'Parsed from Realtor.com URL path',
        };
      }
    }
  }
  // Apartments.com / Trulia / Homes.com / generic: first slug that looks address-like
  const slug = segs.find((s) => /^\d+[-a-z]/i.test(s) && s.includes('-'));
  if (slug) {
    const parsed = slugToAddress(slug);
    if (parsed) return { address: parsed, method: `Parsed from ${host} URL path` };
  }
  return { address: null, method: `Could not parse an address from ${host}` };
}

/* ------------------------------------------------------------------ */
/* RentCast client                                                     */
/* ------------------------------------------------------------------ */

async function rentcast<T>(
  key: string,
  path: string,
  params: Record<string, string | number | undefined>,
  errors: ApiError[],
): Promise<T | null> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '' && v !== null) qs.set(k, String(v));
  const url = `${RENTCAST_BASE}${path}?${qs.toString()}`;
  try {
    const res = await fetch(url, { headers: { 'X-Api-Key': key, Accept: 'application/json' } });
    const text = await res.text();
    if (!res.ok) {
      errors.push({ endpoint: path, status: res.status, message: text.slice(0, 300) });
      return null;
    }
    return JSON.parse(text) as T;
  } catch (e) {
    errors.push({ endpoint: path, status: 0, message: e instanceof Error ? e.message : 'network error' });
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* AI narrative — NON-NUMERIC CONTEXT ONLY                             */
/* ------------------------------------------------------------------ */

const AI_SYSTEM = `You write short, factual neighborhood context for US rental markets.

HARD RULES — violating any of these makes the output unusable:
- NEVER output property facts (bedrooms, bathrooms, square footage, lot size, year built, garage, amenities, sale history).
- NEVER output rent figures, property values, comparable rentals, or any dollar amount.
- NEVER output percentages, counts, scores, or any other statistic.
- Only name real, well-known places you are confident exist in or near the given ZIP code.
- If you are unsure a place exists, omit it. An empty list is correct and expected.

Return STRICT JSON only (no markdown):
{
  "neighborhoodSummary": string,          // 2-3 sentences, qualitative only
  "rentalDemandNarrative": string,        // 2 sentences on who rents here and why, qualitative only
  "majorEmployers": string[],             // named employers only, 0-6 items
  "amenities": { "grocery": string[], "parks": string[], "restaurants": string[], "hospitals": string[] },
  "thingsToDo": {
    "kids": [{ "name": string, "category": string }],
    "teens": [{ "name": string, "category": string }],
    "youngAdults": [{ "name": string, "category": string }],
    "families": [{ "name": string, "category": string }],
    "seniors": [{ "name": string, "category": string }]
  }
}`;

async function fetchAiContext(zip: string, city: string, state: string): Promise<unknown | null> {
  const key = Deno.env.get('LOVABLE_API_KEY');
  if (!key) return null;
  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: AI_SYSTEM },
          { role: 'user', content: `ZIP code ${zip}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''}. Qualitative context and named local places only. No numbers of any kind.` },
        ],
        temperature: 0.2,
        max_tokens: 1600,
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const content = j.choices?.[0]?.message?.content ?? '';
    try { return JSON.parse(content); } catch { return null; }
  } catch { return null; }
}

/** Strips anything numeric the model may have smuggled into the narrative. */
function sanitizeAi(ctx: any): any {
  if (!ctx || typeof ctx !== 'object') return null;
  const noNums = (s: unknown) =>
    typeof s === 'string' ? s.replace(/\$?\d[\d,.]*%?/g, '').replace(/\s{2,}/g, ' ').trim() : '';
  const names = (arr: unknown) =>
    Array.isArray(arr) ? arr.filter((x) => typeof x === 'string' && x.trim()).slice(0, 8).map((x) => String(x).trim()) : [];
  const places = (arr: unknown) =>
    Array.isArray(arr)
      ? arr
          .filter((x: any) => x && typeof x.name === 'string' && x.name.trim())
          .slice(0, 6)
          .map((x: any) => ({ name: String(x.name).trim(), category: typeof x.category === 'string' ? x.category.trim() : '' }))
      : [];
  const t = ctx.thingsToDo ?? {};
  return {
    neighborhoodSummary: noNums(ctx.neighborhoodSummary),
    rentalDemandNarrative: noNums(ctx.rentalDemandNarrative),
    majorEmployers: names(ctx.majorEmployers),
    amenities: {
      grocery: names(ctx.amenities?.grocery),
      parks: names(ctx.amenities?.parks),
      restaurants: names(ctx.amenities?.restaurants),
      hospitals: names(ctx.amenities?.hospitals),
    },
    thingsToDo: {
      kids: places(t.kids),
      teens: places(t.teens),
      youngAdults: places(t.youngAdults),
      families: places(t.families),
      seniors: places(t.seniors),
    },
  };
}

/* ------------------------------------------------------------------ */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const errors: ApiError[] = [];
  const retrievedAt = new Date().toISOString();

  try {
    const body = (await req.json()) as Body;
    const zipInput = (body.zip ?? '').trim();
    const addressInput = (body.address ?? '').trim();
    const listingUrl = (body.listingUrl ?? '').trim();

    if (zipInput && !/^\d{5}$/.test(zipInput)) {
      return new Response(JSON.stringify({ error: 'ZIP must be 5 digits' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!addressInput && !listingUrl && !zipInput) {
      return new Response(JSON.stringify({ error: 'Provide a property address, a listing URL, or a ZIP code' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const RENTCAST_API_KEY = Deno.env.get('RENTCAST_API_KEY');
    if (!RENTCAST_API_KEY) {
      return new Response(JSON.stringify({ error: 'RENTCAST_API_KEY is not configured on the backend.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---------------------------------------------- resolve the query address
    const extraction = listingUrl ? extractAddressFromUrl(listingUrl) : { address: null, method: '' };
    let queryAddress = addressInput || extraction.address || '';
    if (queryAddress && zipInput && !queryAddress.includes(zipInput) && /[A-Z]{2}\s*$/.test(queryAddress)) {
      queryAddress = `${queryAddress} ${zipInput}`;
    }

    // ---------------------------------------------------- 1. property record
    let property: any = null;
    if (queryAddress) {
      const rows = await rentcast<any[]>(RENTCAST_API_KEY, '/properties', { address: queryAddress }, errors);
      if (Array.isArray(rows) && rows.length) property = rows[0];
    }

    const subjZip = property?.zipCode ?? (zipInput || '');

    // -------------------------------------------------- 2. long-term rent AVM
    let rentAvm: any = null;
    if (queryAddress || property?.formattedAddress) {
      rentAvm = await rentcast<any>(
        RENTCAST_API_KEY,
        '/avm/rent/long-term',
        {
          address: property?.formattedAddress ?? queryAddress,
          propertyType: property?.propertyType,
          bedrooms: property?.bedrooms,
          bathrooms: property?.bathrooms,
          squareFootage: property?.squareFootage,
          compCount: 10,
        },
        errors,
      );
    }

    // ------------------------------------------------------- 3. value AVM
    let valueAvm: any = null;
    if (property?.formattedAddress ?? queryAddress) {
      valueAvm = await rentcast<any>(
        RENTCAST_API_KEY,
        '/avm/value',
        {
          address: property?.formattedAddress ?? queryAddress,
          propertyType: property?.propertyType,
          bedrooms: property?.bedrooms,
          bathrooms: property?.bathrooms,
          squareFootage: property?.squareFootage,
          compCount: 5,
        },
        errors,
      );
    }

    // -------------------------------------------------- 4. ZIP market stats
    let market: any = null;
    if (/^\d{5}$/.test(subjZip)) {
      market = await rentcast<any>(RENTCAST_API_KEY, '/markets', { zipCode: subjZip, dataType: 'All' }, errors);
    }

    // If nothing at all came back from RentCast, surface the failure verbatim.
    if (!property && !rentAvm && !market) {
      return new Response(
        JSON.stringify({
          error: 'RentCast returned no data for this request.',
          rentcastErrors: errors,
          input: { zip: zipInput, address: addressInput, listingUrl, extractedAddress: extraction.address, extractionMethod: extraction.method },
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ---------------------------------------------- non-numeric AI narrative
    const aiContext = sanitizeAi(
      await fetchAiContext(subjZip, property?.city ?? '', property?.state ?? ''),
    );

    return new Response(
      JSON.stringify({
        retrievedAt,
        provider: 'RentCast API v1',
        input: {
          zip: zipInput,
          address: addressInput,
          listingUrl,
          extractedAddress: extraction.address,
          extractionMethod: extraction.method,
          queryAddress,
        },
        match: {
          matched: !!property,
          method: property
            ? 'RentCast /properties exact address match'
            : queryAddress
            ? 'No RentCast property record for this address'
            : 'ZIP-level only — no address supplied',
        },
        property,
        rentAvm,
        valueAvm,
        market,
        aiContext,
        rentcastErrors: errors,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('rentcast-lookup error', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error', rentcastErrors: errors }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
