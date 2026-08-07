import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

/**
 * ZIP Market Research — FREE PUBLIC DATASETS ONLY.
 * ---------------------------------------------------------------
 * Sources:
 *   - US Census Bureau, American Community Survey 5-Year (ZCTA level).
 *     Public, keyless API. https://api.census.gov/data
 *   - Zippopotam.us (public USPS-derived place names, keyless).
 *
 * Rules enforced here:
 *   - No AI is called. No estimation. No interpolation.
 *   - Any field the datasets do not return is emitted as null and the UI
 *     renders "Unknown".
 *   - Every returned metric carries its dataset name and vintage.
 */

const ACS_YEARS = [2023, 2022] as const;

const VARS = {
  population: 'B01003_001E',
  medianHouseholdIncome: 'B19013_001E',
  medianHomeValue: 'B25077_001E',
  medianGrossRent: 'B25064_001E',
  occupiedTotal: 'B25003_001E',
  ownerOccupied: 'B25003_002E',
  renterOccupied: 'B25003_003E',
  tenureTotal: 'B25002_001E',
  vacantUnits: 'B25002_003E',
  housingUnits: 'B25001_001E',
  laborForce: 'B23025_003E',
  unemployed: 'B23025_005E',
  medianYearBuilt: 'B25035_001E',
} as const;

type VarKey = keyof typeof VARS;

/** Census returns -666666666 style sentinels for suppressed values. */
function num(raw: string | undefined | null): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n <= -666666) return null;
  return n;
}

async function fetchAcs(zip: string, year: number, errors: string[]) {
  const get = Object.values(VARS).join(',');
  const url = `https://api.census.gov/data/${year}/acs/acs5?get=${get}&for=zip%20code%20tabulation%20area:${zip}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      errors.push(`ACS ${year}: HTTP ${res.status}`);
      return null;
    }
    const rows = (await res.json()) as string[][];
    if (!Array.isArray(rows) || rows.length < 2) return null;
    const header = rows[0];
    const row = rows[1];
    const byVar: Record<string, string> = {};
    header.forEach((h, i) => (byVar[h] = row[i]));
    const values = {} as Record<VarKey, number | null>;
    (Object.keys(VARS) as VarKey[]).forEach((k) => (values[k] = num(byVar[VARS[k]])));
    return { year, values };
  } catch (e) {
    errors.push(`ACS ${year}: ${e instanceof Error ? e.message : 'network error'}`);
    return null;
  }
}

async function fetchPlace(zip: string, errors: string[]) {
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!res.ok) {
      errors.push(`Zippopotam: HTTP ${res.status}`);
      return null;
    }
    const j = await res.json();
    const p = Array.isArray(j?.places) ? j.places[0] : null;
    if (!p) return null;
    return {
      city: p['place name'] ?? null,
      state: p['state abbreviation'] ?? null,
      stateName: p.state ?? null,
      latitude: p.latitude ? Number(p.latitude) : null,
      longitude: p.longitude ? Number(p.longitude) : null,
    };
  } catch (e) {
    errors.push(`Zippopotam: ${e instanceof Error ? e.message : 'network error'}`);
    return null;
  }
}

/** Same ACS pull for prior vintages so the UI can show a real historical trend. */
async function fetchTrend(zip: string, currentYear: number, errors: string[]) {
  const years = [currentYear - 4, currentYear - 2, currentYear].filter((y) => y >= 2015);
  const out: { year: number; medianGrossRent: number | null; medianHomeValue: number | null }[] = [];
  await Promise.all(
    years.map(async (y) => {
      const r = await fetchAcs(zip, y, errors);
      out.push({
        year: y,
        medianGrossRent: r?.values.medianGrossRent ?? null,
        medianHomeValue: r?.values.medianHomeValue ?? null,
      });
    }),
  );
  return out.sort((a, b) => a.year - b.year).filter((r) => r.medianGrossRent !== null || r.medianHomeValue !== null);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const errors: string[] = [];
  try {
    const { zip } = (await req.json()) as { zip?: string };
    const z = (zip ?? '').trim();
    if (!/^\d{5}$/.test(z)) {
      return new Response(JSON.stringify({ error: 'ZIP code must be exactly 5 digits.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let acs: Awaited<ReturnType<typeof fetchAcs>> = null;
    const [place] = await Promise.all([fetchPlace(z, errors)]);
    for (const y of ACS_YEARS) {
      acs = await fetchAcs(z, y, errors);
      if (acs) break;
    }

    if (!acs && !place) {
      return new Response(
        JSON.stringify({ error: 'No public dataset returned data for this ZIP code.', datasetErrors: errors }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const v = acs?.values;
    const vacancyRate =
      v && v.tenureTotal && v.vacantUnits !== null && v.tenureTotal > 0
        ? (v.vacantUnits / v.tenureTotal) * 100
        : null;
    const ownerPct =
      v && v.occupiedTotal && v.ownerOccupied !== null && v.occupiedTotal > 0
        ? (v.ownerOccupied / v.occupiedTotal) * 100
        : null;
    const renterPct =
      v && v.occupiedTotal && v.renterOccupied !== null && v.occupiedTotal > 0
        ? (v.renterOccupied / v.occupiedTotal) * 100
        : null;
    const unemploymentRate =
      v && v.laborForce && v.unemployed !== null && v.laborForce > 0 ? (v.unemployed / v.laborForce) * 100 : null;
    const rentToValue =
      v && v.medianGrossRent && v.medianHomeValue ? ((v.medianGrossRent * 12) / v.medianHomeValue) * 100 : null;

    const trend = acs ? await fetchTrend(z, acs.year, errors) : [];

    return new Response(
      JSON.stringify({
        zip: z,
        retrievedAt: new Date().toISOString(),
        acsYear: acs?.year ?? null,
        sources: [
          acs ? `US Census Bureau ACS 5-Year ${acs.year} (ZCTA ${z})` : null,
          place ? 'Zippopotam.us public ZIP place directory' : null,
        ].filter(Boolean),
        place: {
          city: place?.city ?? null,
          state: place?.state ?? null,
          stateName: place?.stateName ?? null,
          county: null, // not available from these datasets
          latitude: place?.latitude ?? null,
          longitude: place?.longitude ?? null,
        },
        demographics: {
          population: v?.population ?? null,
          medianHouseholdIncome: v?.medianHouseholdIncome ?? null,
          unemploymentRate,
          laborForce: v?.laborForce ?? null,
        },
        housing: {
          medianHomeValue: v?.medianHomeValue ?? null,
          medianGrossRent: v?.medianGrossRent ?? null,
          housingUnits: v?.housingUnits ?? null,
          occupiedUnits: v?.occupiedTotal ?? null,
          vacantUnits: v?.vacantUnits ?? null,
          vacancyRate,
          ownerOccupiedPct: ownerPct,
          renterOccupiedPct: renterPct,
          medianYearBuilt: v?.medianYearBuilt ?? null,
          grossRentMultiplierMarket:
            v?.medianHomeValue && v?.medianGrossRent ? v.medianHomeValue / (v.medianGrossRent * 12) : null,
          rentToValuePct: rentToValue,
        },
        trend,
        datasetErrors: errors,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error', datasetErrors: errors }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
