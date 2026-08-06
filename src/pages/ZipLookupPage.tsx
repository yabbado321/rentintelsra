import { useMemo, useState } from "react";
import {
  Search, Loader2, MapPin, Home, TrendingUp, ShieldCheck, AlertTriangle, Link2,
  Database, ClipboardList, Sparkles, ExternalLink, CheckCircle2, XCircle, Calculator,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { buildRentCastProperty, type CanonicalProperty } from "@/lib/rentcastProperty";
import type { Page } from "@/components/AppLayout";

type Tab = "property" | "rent" | "market" | "area" | "audit";

const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "property", label: "Property", icon: Home },
  { id: "rent", label: "Rent Derivation", icon: Calculator },
  { id: "market", label: "ZIP Market", icon: TrendingUp },
  { id: "area", label: "Area Context", icon: Sparkles },
  { id: "audit", label: "Data Audit", icon: ClipboardList },
];

const money = (n: number | null | undefined) =>
  n == null ? "Unknown" : n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function ZipLookupPage({ onNavigate }: { onNavigate?: (page: Page) => void } = {}) {
  const [address, setAddress] = useState("");
  const [listingUrl, setListingUrl] = useState("");
  const [zip, setZip] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiErrors, setApiErrors] = useState<{ endpoint: string; status: number; message: string }[]>([]);
  const [subject, setSubject] = useState<CanonicalProperty | null>(null);
  const [tab, setTab] = useState<Tab>("property");

  const run = async () => {
    if (!address.trim() && !listingUrl.trim() && !/^\d{5}$/.test(zip.trim())) {
      setError("Enter a property address, paste a listing URL, or enter a 5-digit ZIP code.");
      return;
    }
    setLoading(true);
    setError(null);
    setApiErrors([]);
    setSubject(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("rentcast-lookup", {
        body: { address: address.trim(), listingUrl: listingUrl.trim(), zip: zip.trim() },
      });
      if (fnError) {
        // Surface the backend's verbatim reason rather than a generic failure.
        let detail = fnError.message;
        const ctx = (fnError as unknown as { context?: Response }).context;
        try {
          const body = ctx ? await ctx.clone().json() : null;
          if (body?.error) detail = body.error;
          if (Array.isArray(body?.rentcastErrors)) setApiErrors(body.rentcastErrors);
        } catch { /* keep the original message */ }
        throw new Error(detail);
      }
      if (data?.error) {
        setApiErrors(Array.isArray(data.rentcastErrors) ? data.rentcastErrors : []);
        throw new Error(data.error);
      }
      setSubject(buildRentCastProperty(data, zip.trim()));
      setTab("property");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lookup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">ZIP &amp; Rent Lookup</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every property fact, rent estimate, valuation and comparable on this page comes directly from the
          RentCast API or from a deterministic calculation on RentCast data. Fields RentCast does not return are
          shown as <span className="font-mono">Unknown</span> — never estimated.
        </p>
      </header>

      {/* ------------------------------------------------------------ inputs */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-[1.4fr_1fr_0.5fr]">
          <Field label="Property address" hint="Street, city, state — the most accurate input">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="5500 Grand Lake Dr, San Antonio, TX 78244"
                className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
          </Field>
          <Field label="Or paste a listing URL" hint="Used only to read the address — no data is taken from the listing site">
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={listingUrl}
                onChange={(e) => setListingUrl(e.target.value)}
                placeholder="https://www.zillow.com/homedetails/..."
                className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
          </Field>
          <Field label="ZIP code" hint="For market stats">
            <input
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
              placeholder="78244"
              inputMode="numeric"
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm font-mono outline-none focus:border-primary"
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={run}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? "Querying RentCast…" : "Look up property"}
          </button>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Database className="h-3.5 w-3.5" /> Source of record: RentCast API v1
          </span>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold text-destructive">
              <AlertTriangle className="h-4 w-4" /> {error}
            </p>
            {apiErrors.length > 0 && (
              <ul className="mt-2 space-y-1 font-mono text-xs text-muted-foreground">
                {apiErrors.map((e, i) => (
                  <li key={i}>
                    {e.endpoint} → HTTP {e.status}: {e.message}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              No values are shown when RentCast fails. Nothing on this page is substituted with an estimate.
            </p>
          </div>
        )}
      </section>

      {subject && <Results subject={subject} tab={tab} setTab={setTab} onNavigate={onNavigate} />}
    </div>
  );
}

/* ------------------------------------------------------------------ results */

function Results({
  subject, tab, setTab, onNavigate,
}: { subject: CanonicalProperty; tab: Tab; setTab: (t: Tab) => void; onNavigate?: (p: Page) => void }) {
  if (subject.blockingFailures.length) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-5">
        <p className="flex items-center gap-2 font-semibold text-destructive">
          <XCircle className="h-4 w-4" /> Data integrity check failed — report withheld
        </p>
        <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
          {subject.blockingFailures.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SubjectHeader subject={subject} />

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "property" && <PropertyTab subject={subject} />}
      {tab === "rent" && <RentTab subject={subject} onNavigate={onNavigate} />}
      {tab === "market" && <MarketTab subject={subject} />}
      {tab === "area" && <AreaTab subject={subject} />}
      {tab === "audit" && <AuditTab subject={subject} />}
    </div>
  );
}

function SubjectHeader({ subject }: { subject: CanonicalProperty }) {
  const specs = [
    subject.beds != null ? `${subject.beds} bd` : "Beds Unknown",
    subject.baths != null ? `${subject.baths} ba` : "Baths Unknown",
    subject.sqft != null ? `${subject.sqft.toLocaleString()} sqft` : "Sqft Unknown",
    subject.yearBuilt != null ? `Built ${subject.yearBuilt}` : "Year Built Unknown",
    subject.propertyType ?? "Type Unknown",
  ];
  return (
    <section className="bg-card border border-border rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Subject Property · RentCast record</p>
          <h2 className="mt-1 text-xl font-bold">{subject.address ?? "No RentCast property record matched"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {[subject.city, subject.state, subject.zip].filter(Boolean).join(", ") || "Location Unknown"}
            {subject.county ? ` · ${subject.county} County` : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {specs.map((s) => (
              <span key={s} className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-mono">{s}</span>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Match: {subject.matchMethod} · Retrieved {new Date(subject.retrievedAt).toLocaleString()}
          </p>
          {subject.listingUrlProvided && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ExternalLink className="h-3 w-3" />
              Address read from your link: <span className="font-mono">{subject.extractedAddress ?? "not parseable"}</span>
              {subject.extractionMethod ? ` (${subject.extractionMethod})` : ""}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-stretch gap-3">
          <Stat label="RentCast rent estimate" value={subject.avmRent != null ? `${money(subject.avmRent)}/mo` : "Unknown"} />
          <Stat label="Estimated value" value={money(subject.valueEstimate)} />
          <ConfidenceBadge confidence={subject.confidence} />
        </div>
      </div>
      {subject.geo && (
        <div className="mt-5 overflow-hidden rounded-lg border border-border">
          <iframe
            title="Property location map"
            className="h-64 w-full"
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${subject.geo.lng - 0.01}%2C${subject.geo.lat - 0.008}%2C${subject.geo.lng + 0.01}%2C${subject.geo.lat + 0.008}&layer=mapnik&marker=${subject.geo.lat}%2C${subject.geo.lng}`}
          />
          <p className="bg-background px-3 py-2 text-xs text-muted-foreground">
            Marker plotted from RentCast <span className="font-mono">property.latitude / property.longitude</span>
            {` (${subject.geo.lat.toFixed(5)}, ${subject.geo.lng.toFixed(5)})`}
          </p>
        </div>
      )}
    </section>
  );
}

function PropertyTab({ subject }: { subject: CanonicalProperty }) {
  const rows: [string, string, string][] = [
    ["Bedrooms", subject.beds != null ? String(subject.beds) : "Unknown", "property.bedrooms"],
    ["Bathrooms", subject.baths != null ? String(subject.baths) : "Unknown", "property.bathrooms"],
    ["Square footage", subject.sqft != null ? `${subject.sqft.toLocaleString()} sqft` : "Unknown", "property.squareFootage"],
    ["Lot size", subject.lotSizeSqft != null ? `${subject.lotSizeSqft.toLocaleString()} sqft` : "Unknown", "property.lotSize"],
    ["Year built", subject.yearBuilt != null ? String(subject.yearBuilt) : "Unknown", "property.yearBuilt"],
    ["Property type", subject.propertyType ?? "Unknown", "property.propertyType"],
    ["County", subject.county ?? "Unknown", "property.county"],
    ["Estimated value", money(subject.valueEstimate), "valueAvm.price"],
    ["Value range", subject.valueRange ? `${money(subject.valueRange[0])} – ${money(subject.valueRange[1])}` : "Unknown", "valueAvm.priceRangeLow / High"],
    ["Last sale", subject.lastSalePrice != null || subject.lastSaleDate ? `${money(subject.lastSalePrice)}${subject.lastSaleDate ? ` on ${subject.lastSaleDate.slice(0, 10)}` : ""}` : "Unknown", "property.lastSalePrice / lastSaleDate"],
    ["Tax assessed value", subject.taxAssessedValue != null ? `${money(subject.taxAssessedValue)} (${subject.taxAssessedYear})` : "Unknown", "property.taxAssessments"],
    ["Annual property tax", money(subject.annualPropertyTax), "property.propertyTaxes"],
    ["HOA fee", subject.hoaFee != null ? `${money(subject.hoaFee)}/mo` : "Unknown", "property.hoa.fee"],
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Verified property record" subtitle="RentCast /properties and /avm/value">
        <dl className="divide-y divide-border/60">
          {rows.map(([k, v, field]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-sm text-muted-foreground">
                {k}
                <span className="ml-2 font-mono text-[10px] text-muted-foreground/60">{field}</span>
              </dt>
              <dd className={`text-sm font-mono ${v === "Unknown" ? "text-muted-foreground" : "font-semibold"}`}>{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="space-y-5">
        <Card title="Features" subtitle="Only keys RentCast actually returned are listed">
          {subject.features.length === 0 ? (
            <p className="text-sm text-muted-foreground">RentCast returned no feature data for this property. Nothing is assumed.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {subject.features.map((f) => (
                <div key={f.label} className="rounded-lg border border-border bg-background px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.label}</p>
                  <p className="text-sm font-medium">{f.value}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Sale history" subtitle="property.history">
          {subject.saleHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sale history returned.</p>
          ) : (
            <ul className="space-y-2">
              {subject.saleHistory.map((h, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{h.date} · {h.event}</span>
                  <span className="font-mono font-medium">{money(h.price)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function RentTab({ subject, onNavigate }: { subject: CanonicalProperty; onNavigate?: (p: Page) => void }) {
  const applied = subject.adjustments.filter((a) => a.applied);
  const notApplied = subject.adjustments.filter((a) => !a.applied);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Recommended rent" subtitle="RentCast /avm/rent/long-term — rentAvm.rent">
          <p className="font-mono text-3xl font-bold">{subject.avmRent != null ? `${money(subject.avmRent)}` : "Unknown"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {subject.avmRentRange ? `RentCast range ${money(subject.avmRentRange[0])} – ${money(subject.avmRentRange[1])}` : "No range returned"}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            This is RentCast's own long-term rent AVM for this exact address, computed by RentCast from the comparable
            set below. It is not adjusted, marked up or smoothed here.
          </p>
        </Card>

        <Card title="Independent comp cross-check" subtitle="Deterministic calculation from RentCast comparables">
          <p className="font-mono text-3xl font-bold">{subject.compDerivedRent != null ? money(subject.compDerivedRent) : "Unknown"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {subject.variancePct == null
              ? "Not enough comparables to cross-check."
              : `${subject.variancePct > 0 ? "+" : ""}${subject.variancePct}% vs the RentCast estimate`}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Built bottom-up from the comps so you can see the arithmetic. Where it disagrees with the AVM by more than
            15%, the comp set is thin or mismatched — check the flags in the table.
          </p>
        </Card>

        <Card title="Comparable set" subtitle="rentAvm.comparables">
          <p className="font-mono text-3xl font-bold">{subject.comps.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {subject.comps.filter((c) => c.rent != null).length} with an asking rent ·{" "}
            {subject.comps.filter((c) => !c.sameMarket).length} outside the subject market
          </p>
          {onNavigate && (
            <button onClick={() => onNavigate("deal")} className="mt-3 text-xs font-semibold text-primary hover:underline">
              Use this rent in the Deal Analyzer →
            </button>
          )}
        </Card>
      </div>

      <Card title="Exactly how the cross-check rent was derived" subtitle="Base + only those adjustments that a documented formula supports">
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-4 rounded-lg border border-border bg-background px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Base rent</p>
              <p className="text-xs text-muted-foreground">{subject.compBaseLabel}</p>
            </div>
            <p className="font-mono text-lg font-bold">{money(subject.compBaseRent)}</p>
          </div>

          {applied.map((a) => (
            <div key={a.factor} className="flex items-baseline justify-between gap-4 rounded-lg border border-border bg-background px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{a.factor}</p>
                <p className="break-words font-mono text-xs text-muted-foreground">{a.formula}</p>
              </div>
              <p className={`font-mono text-lg font-bold ${a.dollarImpact >= 0 ? "text-success" : "text-destructive"}`}>
                {a.dollarImpact >= 0 ? "+" : "−"}{money(Math.abs(a.dollarImpact))}
              </p>
            </div>
          ))}

          <div className="flex items-baseline justify-between gap-4 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3">
            <p className="text-sm font-bold">Comp-derived rent (rounded to nearest $5)</p>
            <p className="font-mono text-xl font-bold">{money(subject.compDerivedRent)}</p>
          </div>

          {notApplied.length > 0 && (
            <div className="rounded-lg border border-border bg-background px-4 py-3">
              <p className="text-sm font-semibold">Adjustments deliberately not applied</p>
              <ul className="mt-2 space-y-2">
                {notApplied.map((a) => (
                  <li key={a.factor} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{a.factor}: $0</span> — {a.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>

      <Card title="Rental comparables" subtitle="Every column is a RentCast field — nothing is inferred">
        {subject.comps.length === 0 ? (
          <p className="text-sm text-muted-foreground">RentCast returned no comparable rentals for this address.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3">Address</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Bd</th>
                  <th className="py-2 pr-3">Ba</th>
                  <th className="py-2 pr-3">Sqft</th>
                  <th className="py-2 pr-3">Rent</th>
                  <th className="py-2 pr-3">$/Sqft</th>
                  <th className="py-2 pr-3">Dist</th>
                  <th className="py-2 pr-3">Listed</th>
                  <th className="py-2 pr-3">Age</th>
                  <th className="py-2 pr-3">Corr.</th>
                  <th className="py-2">Flags</th>
                </tr>
              </thead>
              <tbody>
                {subject.comps.map((c) => {
                  const flags: string[] = [];
                  if (!c.sameMarket) flags.push("Outside market");
                  if (subject.propertyType && c.propertyType && c.propertyType !== subject.propertyType) flags.push("Type mismatch");
                  if (subject.beds != null && c.beds != null && c.beds !== subject.beds) flags.push("Bed mismatch");
                  if (c.daysOld != null && c.daysOld > 180) flags.push("Stale listing");
                  return (
                    <tr key={c.id} className="border-b border-border/50 align-top">
                      <td className="py-2.5 pr-3 font-medium">{c.address}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{c.propertyType ?? "Unknown"}</td>
                      <td className="py-2.5 pr-3 font-mono">{c.beds ?? "—"}</td>
                      <td className="py-2.5 pr-3 font-mono">{c.baths ?? "—"}</td>
                      <td className="py-2.5 pr-3 font-mono">{c.sqft?.toLocaleString() ?? "—"}</td>
                      <td className="py-2.5 pr-3 font-mono font-semibold">{c.rent != null ? money(c.rent) : "—"}</td>
                      <td className="py-2.5 pr-3 font-mono">{c.rentPerSqft != null ? `$${c.rentPerSqft.toFixed(2)}` : "—"}</td>
                      <td className="py-2.5 pr-3 font-mono">{c.distanceMi != null ? `${c.distanceMi.toFixed(2)} mi` : "—"}</td>
                      <td className="py-2.5 pr-3 font-mono text-xs">{c.listedDate ?? "—"}</td>
                      <td className="py-2.5 pr-3 font-mono">{c.daysOld != null ? `${c.daysOld}d` : "—"}</td>
                      <td className="py-2.5 pr-3 font-mono">{c.correlation != null ? c.correlation.toFixed(2) : "—"}</td>
                      <td className="py-2.5 text-xs text-warning">{flags.join(", ") || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function MarketTab({ subject }: { subject: CanonicalProperty }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card
        title={`ZIP ${subject.zip ?? ""} market statistics`}
        subtitle={`RentCast /markets${subject.marketLastUpdated ? ` · updated ${subject.marketLastUpdated}` : ""}`}
      >
        <dl className="divide-y divide-border/60">
          {subject.marketStats.map((m) => (
            <div key={m.label} className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-sm text-muted-foreground">
                {m.label}
                <span className="ml-2 font-mono text-[10px] text-muted-foreground/60">{m.apiField}</span>
              </dt>
              <dd className={`text-sm font-mono ${m.value === "Unknown" ? "text-muted-foreground" : "font-semibold"}`}>{m.value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card title="Median rent by bedroom count" subtitle="market.rentalData.dataByBedrooms">
        {subject.marketRentRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">RentCast returned no bedroom-level rent data for this ZIP.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="py-2">Unit type</th>
                <th className="py-2">Median</th>
                <th className="py-2">Average</th>
                <th className="py-2">Listings</th>
              </tr>
            </thead>
            <tbody>
              {subject.marketRentRows.map((r) => (
                <tr key={r.name} className={`border-b border-border/50 ${subject.beds === r.beds ? "bg-primary/5" : ""}`}>
                  <td className="py-2.5 font-medium">
                    {r.name}
                    {subject.beds === r.beds && <span className="ml-2 text-[10px] uppercase text-primary">subject</span>}
                  </td>
                  <td className="py-2.5 font-mono font-semibold">{money(r.medianRent)}</td>
                  <td className="py-2.5 font-mono">{money(r.averageRent)}</td>
                  <td className="py-2.5 font-mono">{r.listings ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function AreaTab({ subject }: { subject: CanonicalProperty }) {
  const ctx = subject.context;
  const GROUPS: [string, string][] = [
    ["kids", "Kids"],
    ["teens", "Teens"],
    ["youngAdults", "Young adults"],
    ["families", "Families"],
    ["seniors", "Seniors"],
  ];
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
        <p className="flex items-center gap-2 font-semibold text-warning">
          <AlertTriangle className="h-4 w-4" /> Estimated — AI-generated area context
        </p>
        <p className="mt-1 text-muted-foreground">
          This tab is qualitative colour only. It is produced by a language model, contains no numbers, is not sourced
          from RentCast, and is never used in any rent, value or return calculation on this platform.
        </p>
      </div>

      {!ctx ? (
        <p className="text-sm text-muted-foreground">No area context was generated for this lookup.</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Neighborhood summary (Estimated)" subtitle="AI narrative">
            <p className="text-sm text-muted-foreground">{ctx.neighborhoodSummary || "Not available."}</p>
            <p className="mt-3 text-sm text-muted-foreground">{ctx.rentalDemandNarrative}</p>
          </Card>
          <Card title="Named local places (Estimated)" subtitle="AI narrative">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {(["grocery", "parks", "restaurants", "hospitals"] as const).map((k) => (
                <div key={k}>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</p>
                  <ul className="mt-1 space-y-0.5">
                    {(ctx.amenities[k] ?? []).length === 0 ? (
                      <li className="text-muted-foreground">—</li>
                    ) : (
                      ctx.amenities[k].map((a) => <li key={a}>{a}</li>)
                    )}
                  </ul>
                </div>
              ))}
            </div>
            {ctx.majorEmployers.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Major employers</p>
                <p className="mt-1 text-sm">{ctx.majorEmployers.join(" · ")}</p>
              </div>
            )}
          </Card>
          <Card title="Things to do by age group (Estimated)" subtitle="AI narrative">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {GROUPS.map(([key, label]) => (
                <div key={key}>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
                  <ul className="mt-1 space-y-1 text-sm">
                    {(ctx.thingsToDo[key] ?? []).length === 0 ? (
                      <li className="text-muted-foreground">—</li>
                    ) : (
                      ctx.thingsToDo[key].map((t) => (
                        <li key={t.name}>
                          {t.name}
                          {t.category && <span className="text-muted-foreground"> · {t.category}</span>}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function AuditTab({ subject }: { subject: CanonicalProperty }) {
  const usedCount = useMemo(() => subject.audit.filter((a) => a.usedInCalc).length, [subject.audit]);
  return (
    <div className="space-y-5">
      <Card title="Validation checks" subtitle="Run against the RentCast payload before anything is rendered">
        <ul className="space-y-2">
          {subject.checks.map((c) => (
            <li key={c.label} className="flex items-start gap-2.5 text-sm">
              {c.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              ) : (
                <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${c.blocking ? "text-destructive" : "text-warning"}`} />
              )}
              <span>
                <span className="font-medium">{c.label}</span>
                <span className="text-muted-foreground"> — {c.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Confidence score" subtitle="Additive, measurable drivers only — nothing subjective">
        <div className="mb-4 flex items-center gap-4">
          <ConfidenceBadge confidence={subject.confidence} />
          <p className="text-sm text-muted-foreground">
            Points are awarded only for data RentCast actually returned. Missing data earns zero — it is never
            back-filled with an assumption.
          </p>
        </div>
        <ul className="space-y-1.5 text-sm">
          {subject.confidence.drivers.map((d, i) => (
            <li key={i} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                {d.ok ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />}
                <span className={d.ok ? "" : "text-muted-foreground"}>{d.text}</span>
              </span>
              <span className="font-mono text-xs">{d.ok ? `+${d.points}` : "+0"}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card
        title="Field-level source log"
        subtitle={`${subject.audit.length} field(s) traced to a named RentCast field · ${usedCount} used in a calculation`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-3">Field</th>
                <th className="py-2 pr-3">Value</th>
                <th className="py-2 pr-3">Source</th>
                <th className="py-2 pr-3">API field</th>
                <th className="py-2 pr-3">Retrieved</th>
                <th className="py-2">In calc?</th>
              </tr>
            </thead>
            <tbody>
              {subject.audit.map((a, i) => (
                <tr key={i} className="border-b border-border/50 align-top">
                  <td className="py-2.5 pr-3 font-medium">{a.field}</td>
                  <td className="py-2.5 pr-3 font-mono">{a.value}</td>
                  <td className="py-2.5 pr-3 text-xs text-muted-foreground">{a.source}</td>
                  <td className="py-2.5 pr-3 font-mono text-xs text-muted-foreground">{a.apiField}</td>
                  <td className="py-2.5 pr-3 font-mono text-xs text-muted-foreground">{new Date(a.retrievedAt).toLocaleString()}</td>
                  <td className="py-2.5 text-xs">{a.usedInCalc ? <span className="text-success">Yes</span> : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {subject.apiErrors.length > 0 && (
        <Card title="RentCast endpoint errors" subtitle="Shown verbatim — no value was substituted">
          <ul className="space-y-1 font-mono text-xs text-muted-foreground">
            {subject.apiErrors.map((e, i) => (
              <li key={i}>{e.endpoint} → HTTP {e.status}: {e.message}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- atoms */

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-base font-semibold">{title}</h3>
      {subtitle && <p className="mt-0.5 mb-4 font-mono text-[11px] text-muted-foreground">{subtitle}</p>}
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background px-4 py-3 text-center">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-xl font-bold">{value}</p>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: CanonicalProperty["confidence"] }) {
  const tone =
    confidence.score >= 80
      ? { wrap: "border-success/40 bg-success/10", text: "text-success" }
      : confidence.score >= 55
      ? { wrap: "border-warning/40 bg-warning/10", text: "text-warning" }
      : { wrap: "border-destructive/40 bg-destructive/10", text: "text-destructive" };
  return (
    <div className={`rounded-xl border px-4 py-3 text-center ${tone.wrap}`}>
      <p className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
        <ShieldCheck className="h-3 w-3" /> Data confidence
      </p>
      <p className={`font-mono text-2xl font-bold ${tone.text}`}>
        {confidence.score}
        <span className="text-sm text-muted-foreground"> / 100</span>
      </p>
    </div>
  );
}
