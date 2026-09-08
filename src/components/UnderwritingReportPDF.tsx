import { Document, Page, Text, View, StyleSheet, Svg, Rect, Line as SvgLine } from "@react-pdf/renderer";
import type { GuardrailFlag, UnderwritingResult } from "@/lib/underwriting";
import type { MonteCarloResult } from "@/lib/underwritingMonteCarlo";

/* ============================================================
 * RentIntel SRA — Institutional Investment Memorandum
 * 10-page underwriting package (+ optional AI memo cover pages)
 *
 * PURE PRESENTATION LAYER. Every financial number rendered on every page
 * is read directly from a canonical UnderwritingResult / MonteCarloResult
 * passed in as props — computed once by src/lib/underwriting.ts and
 * src/lib/underwritingMonteCarlo.ts. This file contains NO independent
 * NOI/cash-flow/capital-stack/amortization/exit/Monte-Carlo formulas.
 * The only arithmetic below is formatting (dividing an annual canonical
 * figure by 12 for a monthly display column) or a fixed display threshold
 * used purely for badge coloring (e.g. "is DSCR >= 1.25" to pick a color) —
 * never a recomputation of NOI, cash flow, LTV, LTC, DSCR, IRR, equity
 * multiple, or exit proceeds.
 * ============================================================ */

const COLORS = {
  navy: "#0f172a",
  ink: "#1e293b",
  slate: "#334155",
  slateLight: "#64748b",
  border: "#cbd5e1",
  borderLight: "#e2e8f0",
  surface: "#f1f5f9",
  cream: "#fbfaf6",
  white: "#ffffff",
  green: "#166534",
  greenLight: "#22c55e",
  amber: "#b45309",
  red: "#991b1b",
  redLight: "#ef4444",
  accent: "#1e3a8a",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 52,
    paddingHorizontal: 40,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: COLORS.navy,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.navy,
    marginBottom: 14,
  },
  brand: { fontSize: 13, fontFamily: "Helvetica-Bold", letterSpacing: 1, color: COLORS.navy },
  brandSub: { fontSize: 7, color: COLORS.slateLight, letterSpacing: 2, marginTop: 2 },
  headerRight: { fontSize: 8, color: COLORS.slate, textTransform: "uppercase", letterSpacing: 1.4 },

  pageTitle: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: COLORS.navy,
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  pageSub: { fontSize: 8, color: COLORS.slateLight, marginBottom: 14, letterSpacing: 1.4, textTransform: "uppercase" },

  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.navy,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginTop: 8,
  },

  /* KPI grid */
  kpiGrid: { flexDirection: "row", gap: 6, marginBottom: 12, flexWrap: "wrap" },
  kpiBox: {
    minWidth: 100,
    flexGrow: 1,
    flexBasis: "22%",
    backgroundColor: COLORS.surface,
    borderLeftWidth: 2.5,
    borderLeftColor: COLORS.navy,
    paddingVertical: 8,
    paddingHorizontal: 9,
  },
  kpiLabel: { fontSize: 6.5, color: COLORS.slateLight, letterSpacing: 1.1, marginBottom: 4, textTransform: "uppercase" },
  kpiValue: { fontSize: 13, fontFamily: "Helvetica-Bold", color: COLORS.navy },
  kpiValuePos: { color: COLORS.green },
  kpiValueNeg: { color: COLORS.red },
  kpiFoot: { fontSize: 6.5, color: COLORS.slateLight, marginTop: 3 },

  /* Tables */
  table: { marginBottom: 10 },
  row: {
    flexDirection: "row",
    paddingVertical: 4.5,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.borderLight,
  },
  rowAlt: { backgroundColor: COLORS.surface },
  rowHead: {
    backgroundColor: COLORS.navy,
    paddingVertical: 5.5,
    paddingHorizontal: 4,
    flexDirection: "row",
  },
  rowTotal: {
    flexDirection: "row",
    paddingVertical: 5.5,
    paddingHorizontal: 4,
    borderTopWidth: 1.5,
    borderTopColor: COLORS.navy,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.navy,
  },
  cell: { flex: 1, fontSize: 8.5, color: COLORS.slate },
  cellHead: { flex: 1, fontSize: 7.5, color: COLORS.white, fontFamily: "Helvetica-Bold", letterSpacing: 0.6, textTransform: "uppercase" },
  cellRight: { textAlign: "right", fontFamily: "Helvetica-Bold", color: COLORS.navy },
  cellRightPos: { color: COLORS.green },
  cellRightNeg: { color: COLORS.red },

  /* Recommendation banner */
  recBanner: {
    padding: 14,
    marginBottom: 12,
    borderRadius: 4,
    borderLeftWidth: 4,
  },
  recLabel: { fontSize: 7, color: COLORS.slateLight, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 },
  recValue: { fontSize: 22, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  recSub: { fontSize: 9, color: COLORS.slate, marginTop: 4, lineHeight: 1.5 },

  /* Text body */
  para: { fontSize: 9, lineHeight: 1.55, color: COLORS.ink, marginBottom: 8, textAlign: "justify" },
  bullet: { fontSize: 9, lineHeight: 1.55, color: COLORS.ink, marginBottom: 3, paddingLeft: 10 },

  /* Watermark */
  watermark: {
    position: "absolute",
    top: 340,
    left: 60,
    right: 60,
    textAlign: "center",
    fontSize: 68,
    fontFamily: "Helvetica-Bold",
    color: COLORS.navy,
    opacity: 0.05,
    letterSpacing: 12,
  },

  /* Cover */
  coverPage: {
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 60,
    fontFamily: "Helvetica",
    color: COLORS.navy,
    backgroundColor: COLORS.cream,
  },
  coverBrand: { fontSize: 11, letterSpacing: 4, color: COLORS.slateLight, textTransform: "uppercase", marginBottom: 40 },
  coverTitle: { fontSize: 34, fontFamily: "Helvetica-Bold", color: COLORS.navy, marginBottom: 10, lineHeight: 1.1 },
  coverAddress: { fontSize: 12, color: COLORS.slate, marginBottom: 30, fontFamily: "Helvetica-Oblique" },
  coverMeta: { fontSize: 8, color: COLORS.slateLight, letterSpacing: 2, textTransform: "uppercase", lineHeight: 1.8 },

  footer: {
    position: "absolute",
    bottom: 22,
    left: 40,
    right: 40,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 6.5, color: COLORS.slateLight, letterSpacing: 1 },
});

/* ---------------- Formatting helpers (formatting only — no financial logic) ---------------- */

const fmt = (v: number | null | undefined) =>
  v === null || v === undefined || !isFinite(v)
    ? "N/A"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
const fmtSigned = (v: number | null | undefined) =>
  v === null || v === undefined || !isFinite(v) ? "N/A" : v < 0 ? `(${fmt(Math.abs(v))})` : fmt(v);
const pct = (v: number | null | undefined, d = 2) =>
  v === null || v === undefined || !isFinite(v) ? "N/A" : `${v.toFixed(d)}%`;
const num = (v: number | null | undefined, d = 2) =>
  v === null || v === undefined || !isFinite(v) ? "N/A" : v.toFixed(d);

export interface UnderwritingReportData {
  propertyName: string;
  address?: string;
  preparedFor?: string;
  firmName?: string;

  /** Canonical output of computeUnderwriting() — the ONLY source of financial figures in this report. */
  underwriting: UnderwritingResult;
  /** Canonical output of runUnderwritingMonteCarlo() — the ONLY source of risk-simulation figures. */
  monteCarlo?: MonteCarloResult;

  aiMemo?: {
    executiveSummary: string;
    financialAnalysis: string;
    riskAppraisal: string;
    valueAddRecommendations: string;
    updatedAt: string;
  };
  /** Report-level guardrails IN ADDITION TO underwriting.flags (e.g. presentation-only disclosures). Both are shown on Page 8. */
  guardrails?: GuardrailFlag[];
  /** External deal-conviction-index score, not produced by the underwriting engine. */
  dci?: { adjusted: number; ceiling: number; label: string };
}

/* ---------------- Utility components (presentation only) ---------------- */

function PageHeader({ firm, title }: { firm: string; title: string }) {
  return (
    <View style={styles.header} fixed>
      <View>
        <Text style={styles.brand}>{firm}</Text>
        <Text style={styles.brandSub}>STRATEGIC REAL ASSETS · UNDERWRITING</Text>
      </View>
      <Text style={styles.headerRight}>{title}</Text>
    </View>
  );
}

function PageFooter({ firm }: { firm: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>{firm.toUpperCase()}  ·  CONFIDENTIAL — FOR DISCUSSION PURPOSES ONLY</Text>
      <Text style={styles.footerText} render={({ pageNumber, totalPages }: any) => `PAGE ${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function KpiBox({ label, value, positive, foot }: { label: string; value: string; positive?: boolean; foot?: string }) {
  return (
    <View style={styles.kpiBox}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, positive === true && styles.kpiValuePos, positive === false && styles.kpiValueNeg]}>
        {value}
      </Text>
      {foot && <Text style={styles.kpiFoot}>{foot}</Text>}
    </View>
  );
}

function Row({ label, value, alt, tone, bold }: { label: string; value: string; alt?: boolean; tone?: "pos" | "neg"; bold?: boolean }) {
  return (
    <View style={[styles.row, alt && styles.rowAlt]}>
      <Text style={[styles.cell, bold && { fontFamily: "Helvetica-Bold", color: COLORS.navy }]}>{label}</Text>
      <Text style={[styles.cell, styles.cellRight, tone === "pos" && styles.cellRightPos, tone === "neg" && styles.cellRightNeg]}>
        {value}
      </Text>
    </View>
  );
}

function TotalRow({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  return (
    <View style={styles.rowTotal}>
      <Text style={[styles.cell, { fontFamily: "Helvetica-Bold", color: COLORS.navy }]}>{label}</Text>
      <Text style={[styles.cell, styles.cellRight, tone === "pos" && styles.cellRightPos, tone === "neg" && styles.cellRightNeg]}>
        {value}
      </Text>
    </View>
  );
}

function MultiCol({ cols, alt, bold, head }: { cols: string[]; alt?: boolean; bold?: boolean; head?: boolean }) {
  if (head) {
    return (
      <View style={styles.rowHead}>
        {cols.map((c, i) => (
          <Text key={i} style={[styles.cellHead, i > 0 && { textAlign: "right" }]}>{c}</Text>
        ))}
      </View>
    );
  }
  return (
    <View style={[styles.row, alt && styles.rowAlt]}>
      {cols.map((c, i) => (
        <Text key={i} style={[
          styles.cell,
          i > 0 && { textAlign: "right", fontFamily: bold ? "Helvetica-Bold" : "Helvetica", color: COLORS.navy },
          bold && i === 0 && { fontFamily: "Helvetica-Bold", color: COLORS.navy },
        ]}>{c}</Text>
      ))}
    </View>
  );
}

/* ---------------- Simple SVG charts (presentation only — data passed in) ---------------- */

function HBarChart({ data, width = 480, barHeight = 14, maxLabel = 20 }: {
  data: { name: string; value: number }[]; width?: number; barHeight?: number; maxLabel?: number;
}) {
  const max = Math.max(1, ...data.map(d => d.value));
  const labelW = 110;
  const valueW = 60;
  const barW = width - labelW - valueW - 10;
  const height = data.length * (barHeight + 5) + 4;
  return (
    <Svg width={width} height={height}>
      {data.map((d, i) => {
        const y = i * (barHeight + 5) + 2;
        const w = (d.value / max) * barW;
        return (
          <View key={i}>
            <Rect x={labelW} y={y} width={barW} height={barHeight} fill={COLORS.borderLight} />
            <Rect x={labelW} y={y} width={w} height={barHeight} fill={COLORS.accent} />
          </View>
        );
      })}
      {data.map((d, i) => {
        const y = i * (barHeight + 5) + 2;
        const name = d.name.length > maxLabel ? d.name.slice(0, maxLabel - 1) + "…" : d.name;
        return (
          <View key={`t-${i}`}>
            <Text style={{ position: "absolute", left: 0, top: y + 2, fontSize: 8, color: COLORS.slate, width: labelW - 6 }}>
              {name}
            </Text>
            <Text style={{ position: "absolute", left: labelW + barW + 6, top: y + 2, fontSize: 8, fontFamily: "Helvetica-Bold", color: COLORS.navy }}>
              {fmt(d.value)}
            </Text>
          </View>
        );
      })}
    </Svg>
  );
}

/** Renders year-over-year cash flow vs. equity from canonical projection.years rows. */
function CashFlowBars({ data, width = 480, height = 130 }: {
  data: { year: number; cashFlow: number; equity: number }[]; width?: number; height?: number;
}) {
  if (!data.length) return null;
  const maxV = Math.max(...data.map(d => Math.max(d.cashFlow, d.equity)));
  const minV = Math.min(0, ...data.map(d => Math.min(d.cashFlow, d.equity)));
  const range = maxV - minV || 1;
  const chartH = height - 24;
  const zeroY = 8 + (maxV / range) * chartH;
  const groupW = (width - 40) / data.length;
  const barW = Math.max(3, groupW / 3);

  return (
    <Svg width={width} height={height}>
      <SvgLine x1={30} y1={zeroY} x2={width - 6} y2={zeroY} strokeWidth={0.5} stroke={COLORS.slateLight} />
      {data.map((d, i) => {
        const x = 30 + i * groupW + (groupW - barW * 2 - 2) / 2;
        const cfH = (Math.abs(d.cashFlow) / range) * chartH;
        const eqH = (Math.abs(d.equity) / range) * chartH;
        const cfY = d.cashFlow >= 0 ? zeroY - cfH : zeroY;
        const eqY = d.equity >= 0 ? zeroY - eqH : zeroY;
        return (
          <View key={i}>
            <Rect x={x} y={cfY} width={barW} height={cfH} fill={d.cashFlow >= 0 ? COLORS.accent : COLORS.redLight} />
            <Rect x={x + barW + 2} y={eqY} width={barW} height={eqH} fill={COLORS.greenLight} />
            <Text style={{ position: "absolute", left: x - 4, top: height - 12, fontSize: 6.5, color: COLORS.slateLight }}>
              Y{d.year}
            </Text>
          </View>
        );
      })}
    </Svg>
  );
}

/** Renders a Monte Carlo IRR distribution from canonical Distribution percentiles (no invented bell curve math beyond pixel mapping). */
function MCHistogram({ p10, p50, p90, mean, width = 480, height = 90 }: {
  p10: number; p50: number; p90: number; mean: number; width?: number; height?: number;
}) {
  const min = Math.min(p10, mean) - 2;
  const max = Math.max(p90, mean) + 2;
  const range = max - min || 1;
  const pxOf = (v: number) => 10 + ((v - min) / range) * (width - 20);
  const cx = pxOf(p50);
  const left = pxOf(p10);
  const right = pxOf(p90);
  return (
    <Svg width={width} height={height}>
      <Rect x={left} y={height - 55} width={right - left} height={40} fill={COLORS.borderLight} />
      <Rect x={pxOf(p50 - (p50 - p10) / 2)} y={height - 55} width={pxOf(p50 + (p90 - p50) / 2) - pxOf(p50 - (p50 - p10) / 2)} height={40} fill={COLORS.accent} opacity={0.4} />
      <SvgLine x1={cx} y1={height - 60} x2={cx} y2={height - 15} strokeWidth={1.5} stroke={COLORS.navy} />
      <SvgLine x1={pxOf(mean)} y1={height - 65} x2={pxOf(mean)} y2={height - 15} strokeWidth={1.5} stroke={COLORS.green} strokeDasharray="3,2" />
      <Text style={{ position: "absolute", left: left - 12, top: height - 12, fontSize: 6.5, color: COLORS.slate }}>
        {`P10 ${p10.toFixed(1)}%`}
      </Text>
      <Text style={{ position: "absolute", left: cx - 18, top: height - 12, fontSize: 6.5, fontFamily: "Helvetica-Bold", color: COLORS.navy }}>
        {`P50 ${p50.toFixed(1)}%`}
      </Text>
      <Text style={{ position: "absolute", left: right - 28, top: height - 12, fontSize: 6.5, color: COLORS.slate }}>
        {`P90 ${p90.toFixed(1)}%`}
      </Text>
    </Svg>
  );
}

/* ---------------- Recommendation logic ----------------
 * These are DISPLAY-ONLY THRESHOLD COMPARISONS (badge selection), not a
 * financial model: every value read (dscr, cashOnCash, capRate, cashFlow,
 * probNegativeCashFlow) comes straight from the canonical result, and the
 * only local arithmetic is comparing those canonical numbers against fixed
 * policy thresholds to pick a verdict word and a color. No NOI/cash-flow/
 * capital/IRR value is derived here.
 * ---------------------------------------------------------------------- */

function computeRecommendations(u: UnderwritingResult, mc: MonteCarloResult | undefined, dci: UnderwritingReportData["dci"]) {
  const dscr = u.metrics.dscr ?? 0;
  const cashOnCash = u.metrics.cashOnCashAfterCapexPct ?? 0;
  const capRate = u.metrics.capRatePct ?? 0;
  const netCashFlow = u.cashFlow.annualAfterCapex;
  const mcNeg = mc?.probNegativeCashFlow ?? 20;
  const dciAdj = dci?.adjusted ?? 60;

  let inv: "Strong Buy" | "Buy" | "Hold" | "Pass" = "Hold";
  let invColor = COLORS.slate;
  let invBg = COLORS.surface;
  if (dscr >= 1.35 && cashOnCash >= 8 && capRate >= 6 && netCashFlow > 0 && mcNeg < 15 && dciAdj >= 80) {
    inv = "Strong Buy"; invColor = COLORS.green; invBg = "#dcfce7";
  } else if (dscr >= 1.20 && cashOnCash >= 5 && netCashFlow > 0 && mcNeg < 30) {
    inv = "Buy"; invColor = COLORS.green; invBg = "#ecfdf5";
  } else if (dscr >= 1.0 && netCashFlow >= 0) {
    inv = "Hold"; invColor = COLORS.amber; invBg = "#fef3c7";
  } else {
    inv = "Pass"; invColor = COLORS.red; invBg = "#fee2e2";
  }

  let lender: "Approve" | "Approve with Conditions" | "Decline" = "Decline";
  let lenderColor = COLORS.red;
  let lenderBg = "#fee2e2";
  if (dscr >= 1.25 && mcNeg < 25) {
    lender = "Approve"; lenderColor = COLORS.green; lenderBg = "#dcfce7";
  } else if (dscr >= 1.10) {
    lender = "Approve with Conditions"; lenderColor = COLORS.amber; lenderBg = "#fef3c7";
  }

  return { inv, invColor, invBg, lender, lenderColor, lenderBg };
}

/* ============================================================
 * MAIN DOCUMENT
 * ============================================================ */

export default function UnderwritingReportPDF({ data }: { data: UnderwritingReportData }) {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const firm = data.firmName || "RentIntel SRA";

  return (
    <Document title={`${firm} — ${data.propertyName} Underwriting`} author={firm}>
      {data.aiMemo && <MemoCoverPages data={data} firm={firm} today={today} />}
      <Page1_Executive data={data} firm={firm} today={today} />
      <Page2_Property data={data} firm={firm} />
      <Page3_Capital data={data} firm={firm} />
      <Page4_Income data={data} firm={firm} />
      <Page5_Financing data={data} firm={firm} />
      <Page6_Stress data={data} firm={firm} />
      <Page7_Rehab data={data} firm={firm} />
      <Page8_Risk data={data} firm={firm} />
      <Page9_Exit data={data} firm={firm} />
      <Page10_Memo data={data} firm={firm} />
    </Document>
  );
}

/* ============================================================
 * PAGE 1 — Executive Investment Summary
 * ============================================================ */

function Page1_Executive({ data, firm, today }: { data: UnderwritingReportData; firm: string; today: string }) {
  const u = data.underwriting;
  const arvDisplay = u.inputs.arv && u.inputs.arv > 0 ? u.inputs.arv : u.inputs.purchasePrice;
  const rec = computeRecommendations(u, data.monteCarlo, data.dci);
  const summary = executiveSummaryNarrative(data, u, arvDisplay);

  return (
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.watermark} fixed>CONFIDENTIAL</Text>
      <PageHeader firm={firm} title="I · Executive Investment Summary" />

      <Text style={styles.pageTitle}>{data.propertyName || "Untitled Deal"}</Text>
      <Text style={styles.pageSub}>
        {data.address ? `${data.address}  ·  ` : ""}Prepared {today}
        {data.preparedFor ? `  ·  For ${data.preparedFor}` : ""}
      </Text>

      {/* Recommendation banners */}
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
        <View style={[styles.recBanner, { flex: 1, backgroundColor: rec.invBg, borderLeftColor: rec.invColor }]}>
          <Text style={styles.recLabel}>Investment Recommendation</Text>
          <Text style={[styles.recValue, { color: rec.invColor }]}>{rec.inv.toUpperCase()}</Text>
        </View>
        <View style={[styles.recBanner, { flex: 1, backgroundColor: rec.lenderBg, borderLeftColor: rec.lenderColor }]}>
          <Text style={styles.recLabel}>Lender Decision</Text>
          <Text style={[styles.recValue, { color: rec.lenderColor }]}>{rec.lender.toUpperCase()}</Text>
        </View>
      </View>

      {/* KPI grid — every value read directly from underwriting.capital / .metrics / .noiAnnual / .cashFlow */}
      <View style={styles.kpiGrid}>
        <KpiBox label="Purchase Price" value={fmt(u.inputs.purchasePrice)} foot="Acquisition basis" />
        <KpiBox label="ARV" value={fmt(arvDisplay)} foot={u.inputs.arv ? "Entered ARV" : "= purchase price (no ARV entered)"} />
        <KpiBox label="Loan Amount" value={fmt(u.capital.loanAmount)} foot={`${pct(u.metrics.ltvPct, 1)} LTV`} />
        <KpiBox label="LTC" value={pct(u.metrics.ltcPct, 1)} foot="Loan ÷ total project cost" />
      </View>
      <View style={styles.kpiGrid}>
        <KpiBox label="Total Cash In" value={fmt(u.capital.cashInvested)} foot="Investor equity (spec §5)" />
        <KpiBox label="Cash-on-Cash" value={pct(u.metrics.cashOnCashAfterCapexPct)} positive={(u.metrics.cashOnCashAfterCapexPct ?? 0) > 0} foot="Yr-1 return on equity, after CapEx" />
        <KpiBox label="Cap Rate" value={pct(u.metrics.capRatePct)} positive={(u.metrics.capRatePct ?? 0) >= 5} foot="NOI ÷ purchase price" />
        <KpiBox label="DSCR" value={num(u.metrics.dscr)} positive={(u.metrics.dscr ?? 0) >= 1.25}
          foot={(u.metrics.dscr ?? 0) >= 1.25 ? "Lender-qualified" : (u.metrics.dscr ?? 0) >= 1.0 ? "Marginal" : "Below 1.0"} />
      </View>
      <View style={styles.kpiGrid}>
        <KpiBox label="Debt Yield" value={pct(u.metrics.debtYieldPct, 1)} positive={(u.metrics.debtYieldPct ?? 0) >= 10} foot="NOI ÷ loan" />
        <KpiBox label="Break-Even Occ." value={u.metrics.breakEvenOccupancyPct === null ? "Not achievable" : pct(u.metrics.breakEvenOccupancyPct, 0)} foot="Min occupancy to cover opex + debt" />
        <KpiBox label="Annual NOI" value={fmt(u.noiAnnual)} foot="Net Operating Income" />
        <KpiBox label="Monthly Cash Flow" value={fmt(u.cashFlow.monthlyAfterCapex)} positive={u.cashFlow.monthlyAfterCapex >= 0} foot="After debt service and CapEx" />
      </View>

      <Text style={styles.sectionTitle}>Executive Summary</Text>
      <Text style={styles.para}>{summary}</Text>

      {u.validationErrors.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Model Validation Notice</Text>
          <Text style={[styles.para, { color: COLORS.red }]}>
            The underwriting engine flagged {u.validationErrors.length} reconciliation issue(s) with the inputs behind
            this report. Figures above may not be internally consistent until these are resolved: {u.validationErrors.join("; ")}.
          </Text>
        </>
      )}

      <PageFooter firm={firm} />
    </Page>
  );
}

function executiveSummaryNarrative(data: UnderwritingReportData, u: UnderwritingResult, arvDisplay: number) {
  const dscr = u.metrics.dscr ?? 0;
  const dscrText = dscr >= 1.25
    ? `debt service coverage of ${dscr.toFixed(2)}x provides comfortable cushion above the 1.25x lender threshold`
    : dscr >= 1.0
      ? `debt service coverage of ${dscr.toFixed(2)}x is thin and offers limited margin for operating variance`
      : `debt service coverage of ${dscr.toFixed(2)}x is below break-even and indicates the property cannot service debt from operations`;
  const cfText = u.cashFlow.monthlyAfterCapex >= 0
    ? `first-year monthly cash flow of ${fmt(u.cashFlow.monthlyAfterCapex)} after all operating costs and debt service`
    : `first-year cash flow of ${fmt(u.cashFlow.monthlyAfterCapex)}/month, requiring supplemental capital contributions`;
  const debtYield = u.metrics.debtYieldPct ?? 0;
  const yieldText = debtYield >= 10
    ? `Debt yield of ${debtYield.toFixed(1)}% is within institutional acceptance ranges`
    : `Debt yield of ${debtYield.toFixed(1)}% falls below the 10% institutional threshold`;
  const breakEven = u.metrics.breakEvenOccupancyPct;

  return `This underwriting evaluates the acquisition of ${data.propertyName || "the subject property"} at ${fmt(u.inputs.purchasePrice)} against a stabilized value of ${fmt(arvDisplay)}, financed at ${pct(u.metrics.ltvPct, 1)} loan-to-value and ${pct(u.metrics.ltcPct, 1)} loan-to-cost. The transaction requires ${fmt(u.capital.cashInvested)} in total invested equity and delivers ${cfText}, producing a ${pct(u.metrics.cashOnCashAfterCapexPct)} cash-on-cash return and a ${pct(u.metrics.capRatePct)} cap rate. The ${dscrText}. ${yieldText}, and break-even occupancy sits at ${breakEven === null ? "an unachievable level (expenses plus debt service exceed income even at full occupancy)" : `${breakEven.toFixed(0)}%`}. Refer to the risk analytics section for probabilistic downside modeling and to the investment committee memo for full recommendation rationale.`;
}

/* ============================================================
 * PAGE 2 — Property & Market Overview
 * ============================================================ */

function Page2_Property({ data, firm }: { data: UnderwritingReportData; firm: string }) {
  const i = data.underwriting.inputs;
  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader firm={firm} title="II · Property & Market Overview" />
      <Text style={styles.pageTitle}>Property & Market Overview</Text>
      <Text style={styles.pageSub}>Physical asset, neighborhood, and rental market context</Text>

      <Text style={styles.sectionTitle}>Property Details</Text>
      <View style={styles.table}>
        <Row label="Address" value={data.address || "—"} />
        <Row label="Property Type" value="Single-family / small multifamily rental" alt />
        <Row label="Year Built" value={i.risk?.yearBuilt ? String(i.risk.yearBuilt) : "Not provided — verify at inspection"} />
        <Row label="Square Footage" value={i.squareFeet ? i.squareFeet.toLocaleString() : "Not provided — verify at inspection"} alt />
        <Row label="Units" value={i.units ? String(i.units) : "Not provided"} />
        <Row label="Estimated Property Condition" value={i.rehabBudget > 0 ? "Value-add — rehab budgeted" : "Turnkey / no rehab budgeted"} alt />
      </View>
      <Text style={{ fontSize: 7.5, color: COLORS.slateLight, marginBottom: 10, fontStyle: "italic" }}>
        Physical property specifications must be independently verified via inspection, county records, and appraisal. Values shown reflect only the underwriting inputs provided.
      </Text>

      <Text style={styles.sectionTitle}>Neighborhood & Market Analysis</Text>
      <View style={styles.table}>
        <MultiCol cols={["Indicator", "Value", "Source Basis"]} head />
        <MultiCol cols={["ZIP Median Rent", i.market?.medianRent ? fmt(i.market.medianRent) : "Not verified", "Census ACS (if provided)"]} />
        <MultiCol cols={["ZIP Vacancy Rate", i.market?.vacancyRatePct !== undefined ? pct(i.market.vacancyRatePct, 1) : "Not verified", "Census ACS (if provided)"]} alt />
        <MultiCol cols={["Flood Zone", i.risk?.floodRisk ?? "Not verified", "FEMA map lookup required"]} />
        <MultiCol cols={["Rent Growth Assumption", pct(i.rentGrowthPct), "RentIntel underwriting assumption"]} alt />
        <MultiCol cols={["Appreciation Assumption", pct(i.appreciationPct), "RentIntel underwriting assumption"]} />
        <MultiCol cols={["Vacancy Assumption", pct(i.vacancyPct), "RentIntel underwriting assumption"]} alt />
        <MultiCol cols={["Expense Inflation Assumption", pct(i.expenseGrowthPct), "RentIntel underwriting assumption"]} />
      </View>
      <Text style={{ fontSize: 7.5, color: COLORS.slateLight, marginBottom: 8, fontStyle: "italic" }}>
        Market indicators marked "Not verified" are not embedded in this report. Investors must independently verify demographic, employment, and neighborhood data before relying on projections.
      </Text>

      <Text style={styles.sectionTitle}>Market Strength Assessment</Text>
      <Text style={styles.para}>
        Market strength is inferred indirectly from the underwriting assumptions rather than from directly ingested demographic data.
        A rent growth assumption of {pct(i.rentGrowthPct)} paired with appreciation of {pct(i.appreciationPct)} reflects
        {" "}{i.rentGrowthPct >= 4 ? "an optimistic" : i.rentGrowthPct >= 2 ? "a moderate" : "a conservative"} growth outlook.
        Vacancy assumed at {pct(i.vacancyPct)} is {" "}{i.vacancyPct < 5 ? "aggressive versus the 5–8% stabilized benchmark" : "within stabilized market norms"}.
        Investors are strongly advised to independently corroborate these assumptions using multiple market data sources — including HUD Small Area FMR, CoStar/Yardi comparable rent surveys, BLS employment statistics, and local MLS days-on-market data — before proceeding to LOI.
      </Text>

      <PageFooter firm={firm} />
    </Page>
  );
}

/* ============================================================
 * PAGE 3 — Acquisition & Capital Stack
 * All figures read directly from underwriting.capital / .metrics.
 * The Sources & Uses / Sources of Capital tables render the canonical
 * `capital.uses` / `capital.sources` arrays verbatim — no line item here
 * is independently computed.
 * ============================================================ */

function Page3_Capital({ data, firm }: { data: UnderwritingReportData; firm: string }) {
  const u = data.underwriting;
  const cap = u.capital;

  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader firm={firm} title="III · Acquisition & Capital Stack" />
      <Text style={styles.pageTitle}>Acquisition Structure</Text>
      <Text style={styles.pageSub}>Sources & uses of capital · leverage · closing budget</Text>

      <Text style={styles.sectionTitle}>Sources & Uses</Text>
      <View style={styles.table}>
        <MultiCol cols={["Use of Funds", "Amount"]} head />
        {cap.uses.map((use, i) => (
          <MultiCol key={use.key} alt={i % 2 === 1} cols={[use.label + (use.estimated ? " (Est.)" : ""), fmt(use.amount)]} />
        ))}
        <View style={styles.rowTotal}>
          <Text style={[styles.cell, { fontFamily: "Helvetica-Bold" }]}>Total Project Cost</Text>
          <Text style={[styles.cell, styles.cellRight]}>{fmt(cap.totalProjectCost)}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Sources of Capital</Text>
      <View style={styles.table}>
        <MultiCol cols={["Source", "Amount", "% of Total"]} head />
        {cap.sources.map((src, i) => (
          <MultiCol key={src.key} alt={i % 2 === 1} cols={[src.label, fmt(src.amount), pct(src.sharePct, 1)]} />
        ))}
        <View style={styles.rowTotal}>
          <Text style={[styles.cell, { fontFamily: "Helvetica-Bold" }]}>Total Sources</Text>
          <Text style={[styles.cell, styles.cellRight]}>{fmt(cap.totalProjectCost)}</Text>
          <Text style={[styles.cell, styles.cellRight]}>100.0%</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Leverage Metrics</Text>
      <View style={styles.kpiGrid}>
        <KpiBox label="Loan-to-Value" value={pct(u.metrics.ltvPct, 1)} foot="Loan ÷ purchase price" positive={(u.metrics.ltvPct ?? 100) <= 75} />
        <KpiBox label="Loan-to-Cost" value={pct(u.metrics.ltcPct, 1)} foot="Loan ÷ total project cost" positive={(u.metrics.ltcPct ?? 100) <= 80} />
        <KpiBox label="Equity %" value={pct(u.metrics.equitySharePct, 1)} foot="Investor equity ÷ total project cost" />
        <KpiBox label="Cash Required at Closing" value={fmt(cap.investorEquity)} foot="Investor equity / cash invested" />
      </View>

      <Text style={styles.para}>
        Capital structure reflects a {(u.metrics.ltvPct ?? 0) <= 75 ? "moderate" : "aggressive"} leverage profile at {pct(u.metrics.ltvPct, 1)} LTV and {pct(u.metrics.ltcPct, 1)} LTC.
        {(u.metrics.ltvPct ?? 0) > 80 ? " LTV above 80% materially constrains lender options and typically requires portfolio or private debt with pricing premiums." : ""}
        {" "}Investor equity commitment of {fmt(cap.investorEquity)} represents {pct(u.metrics.equitySharePct, 1)} of the total capitalization, providing
        {(u.metrics.equitySharePct ?? 0) >= 25 ? " adequate" : " modest"} loss-absorption capacity ahead of the senior debt.
      </Text>

      <PageFooter firm={firm} />
    </Page>
  );
}

/* ============================================================
 * PAGE 4 — Operating Income Statement
 * Line items render underwriting.expenses.lines verbatim (no heuristic
 * tax/insurance/management/maintenance/capex allocation). The "Stabilized"
 * figure is the canonical Year-2 row from underwriting.projection.years —
 * not a locally re-derived growth multiplier.
 * ============================================================ */

function Page4_Income({ data, firm }: { data: UnderwritingReportData; firm: string }) {
  const u = data.underwriting;
  const year2 = u.projection.years.find((y) => y.year === 2);
  const grossIncomeMo = (u.income.grossPotentialRentAnnual + u.income.otherIncomeAnnual) / 12;
  const debtServiceMo = u.debt.annualDebtService / 12;
  const cashFlowBeforeCapexMo = u.cashFlow.monthlyBeforeCapex;
  const capexMo = u.expenses.capexReserveAnnual / 12;

  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader firm={firm} title="IV · Operating Income Statement" />
      <Text style={styles.pageTitle}>Operating Income Statement</Text>
      <Text style={styles.pageSub}>Year 1 (Monthly · Annual) from the canonical underwriting engine</Text>

      <View style={styles.table}>
        <MultiCol cols={["Line Item", "Monthly", "Annual"]} head />
        <MultiCol cols={["Gross Potential Rent", fmt(u.income.grossPotentialRentAnnual / 12), fmt(u.income.grossPotentialRentAnnual)]} />
        <MultiCol cols={["Other Income", fmt(u.income.otherIncomeAnnual / 12), fmt(u.income.otherIncomeAnnual)]} alt />
        <MultiCol cols={["Gross Potential Income", fmt(grossIncomeMo), fmt(grossIncomeMo * 12)]} bold />
        <MultiCol cols={["Less: Vacancy & Credit Loss", `(${fmt(u.income.vacancyLossAnnual / 12)})`, `(${fmt(u.income.vacancyLossAnnual)})`]} alt />
        <MultiCol cols={["Effective Gross Income", fmt(u.income.effectiveGrossIncomeAnnual / 12), fmt(u.income.effectiveGrossIncomeAnnual)]} bold />

        {u.expenses.lines.filter((l) => l.inNOI).map((line, i) => (
          <MultiCol
            key={line.key}
            alt={i % 2 === 1}
            cols={[line.label + (line.estimated ? " (Est.)" : ""), `(${fmt(line.annual / 12)})`, `(${fmt(line.annual)})`]}
          />
        ))}
        <MultiCol cols={["Total Operating Expenses", `(${fmt(u.expenses.totalOperatingAnnual / 12)})`, `(${fmt(u.expenses.totalOperatingAnnual)})`]} bold />

        <MultiCol cols={["Net Operating Income (NOI)", fmt(u.noiAnnual / 12), fmt(u.noiAnnual)]} bold />
        <MultiCol cols={["Debt Service (P&I + MI)", `(${fmt(debtServiceMo)})`, `(${fmt(u.debt.annualDebtService)})`]} alt />
        <MultiCol cols={["Cash Flow Before CapEx", fmt(cashFlowBeforeCapexMo), fmt(u.cashFlow.annualBeforeCapex)]} bold />
        <MultiCol cols={["CapEx Reserve (below NOI)", `(${fmt(capexMo)})`, `(${fmt(u.expenses.capexReserveAnnual)})`]} alt />
        <View style={styles.rowTotal}>
          <Text style={[styles.cell, { fontFamily: "Helvetica-Bold" }]}>Net Cash Flow (After CapEx)</Text>
          <Text style={[styles.cell, styles.cellRight, u.cashFlow.monthlyAfterCapex >= 0 ? styles.cellRightPos : styles.cellRightNeg]}>{fmt(u.cashFlow.monthlyAfterCapex)}</Text>
          <Text style={[styles.cell, styles.cellRight, u.cashFlow.annualAfterCapex >= 0 ? styles.cellRightPos : styles.cellRightNeg]}>{fmt(u.cashFlow.annualAfterCapex)}</Text>
        </View>
      </View>

      {year2 && (
        <>
          <Text style={styles.sectionTitle}>Year 2 (Stabilized) Snapshot</Text>
          <Text style={{ fontSize: 7.5, color: COLORS.slateLight, marginBottom: 6, fontStyle: "italic" }}>
            From the canonical multi-year projection (includes the entered rent-growth and expense-growth assumptions). Not re-derived locally.
          </Text>
          <View style={styles.kpiGrid}>
            <KpiBox label="Gross Potential Rent" value={fmt(year2.grossPotentialRent)} foot="Year 2, annual" />
            <KpiBox label="Effective Gross Income" value={fmt(year2.effectiveGrossIncome)} foot="Year 2, annual" />
            <KpiBox label="Operating Expenses" value={fmt(year2.operatingExpenses)} foot="Year 2, annual" />
            <KpiBox label="NOI" value={fmt(year2.noi)} foot="Year 2, annual" />
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>Operating Ratios</Text>
      <View style={styles.kpiGrid}>
        <KpiBox label="Expense Ratio" value={pct(u.metrics.expenseRatioPct, 1)} foot="OpEx ÷ EGI" positive={(u.metrics.expenseRatioPct ?? 100) <= 45} />
        <KpiBox label="DSCR" value={num(u.metrics.dscr)} positive={(u.metrics.dscr ?? 0) >= 1.25} foot="NOI ÷ debt service" />
        <KpiBox label="Debt Yield" value={pct(u.metrics.debtYieldPct, 1)} positive={(u.metrics.debtYieldPct ?? 0) >= 10} foot="NOI ÷ loan" />
        <KpiBox label="Annual NOI" value={fmt(u.noiAnnual)} foot="Year-1 net operating income" />
      </View>

      <Text style={styles.sectionTitle}>Monthly Expense Composition</Text>
      <HBarChart
        data={u.expenses.lines
          .filter((l) => l.inNOI && l.annual !== 0)
          .map((l) => ({ name: l.label, value: l.annual / 12 }))}
      />

      <PageFooter firm={firm} />
    </Page>
  );
}

/* ============================================================
 * PAGE 5 — Financing Analysis
 * Remaining balance schedule uses underwriting.projection.exitScenarios
 * (each independently amortized for its own holdYears) rather than a
 * locally re-run amortization loop, so this page can never disagree with
 * Page 9's exit analysis.
 * ============================================================ */

function Page5_Financing({ data, firm }: { data: UnderwritingReportData; firm: string }) {
  const u = data.underwriting;
  const cushion = (u.metrics.dscr ?? 0) - 1.25; // display-only delta vs. the standard 1.25x lender threshold
  const year1 = u.projection.years.find((y) => y.year === 1);
  const balanceSchedule = [...u.projection.exitScenarios].sort((a, b) => a.holdYears - b.holdYears);

  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader firm={firm} title="V · Financing Analysis" />
      <Text style={styles.pageTitle}>Debt Structure & Coverage</Text>
      <Text style={styles.pageSub}>Loan terms · amortization · coverage cushion</Text>

      <Text style={styles.sectionTitle}>Loan Summary</Text>
      <View style={styles.table}>
        <Row label="Loan Amount" value={fmt(u.debt.loanAmount)} />
        <Row label="Interest Rate" value={pct(u.inputs.interestRatePct)} alt />
        <Row label="Loan Type" value="Fixed rate, fully amortizing" />
        <Row label="Loan Term" value={`${u.inputs.loanTermYears} years`} alt />
        <Row label="Monthly Payment (P&I)" value={fmt(u.debt.monthlyPI)} />
        {u.debt.monthlyMortgageInsurance > 0 && <Row label="Monthly Mortgage Insurance" value={fmt(u.debt.monthlyMortgageInsurance)} alt />}
        {year1 && <Row label="Year 1 Principal Paid" value={fmt(year1.principal)} alt />}
        {year1 && <Row label="Year 1 Interest Paid" value={fmt(year1.interest)} />}
      </View>

      <Text style={styles.sectionTitle}>Remaining Balance by Holding Period</Text>
      <Text style={{ fontSize: 7.5, color: COLORS.slateLight, marginBottom: 6, fontStyle: "italic" }}>
        Each row is its own independent projection.exitScenarios entry — the same figures shown on the Exit Strategy page.
      </Text>
      <View style={styles.table}>
        <MultiCol cols={["Time Horizon", "Remaining Balance", "Principal Paid"]} head />
        {balanceSchedule.map((s, i) => (
          <MultiCol
            key={s.holdYears}
            alt={i % 2 === 1}
            cols={[`End of Year ${s.holdYears}`, fmt(s.loanPayoff), fmt(u.debt.loanAmount - s.loanPayoff)]}
          />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Coverage & Leverage Metrics</Text>
      <View style={styles.kpiGrid}>
        <KpiBox label="DSCR" value={num(u.metrics.dscr)} positive={(u.metrics.dscr ?? 0) >= 1.25} foot="NOI ÷ debt service" />
        <KpiBox label="Coverage Cushion" value={`${cushion >= 0 ? "+" : ""}${cushion.toFixed(2)}x`} positive={cushion >= 0} foot="vs. 1.25x threshold" />
        <KpiBox label="Debt Yield" value={pct(u.metrics.debtYieldPct, 1)} positive={(u.metrics.debtYieldPct ?? 0) >= 10} foot="NOI ÷ loan" />
        <KpiBox label="LTV" value={pct(u.metrics.ltvPct, 1)} positive={(u.metrics.ltvPct ?? 100) <= 75} foot="Loan ÷ purchase price" />
      </View>
      <View style={styles.kpiGrid}>
        <KpiBox label="LTC" value={pct(u.metrics.ltcPct, 1)} positive={(u.metrics.ltcPct ?? 100) <= 80} foot="Loan ÷ total project cost" />
        <KpiBox label="Cash Invested" value={fmt(u.capital.cashInvested)} foot="Investor equity" />
        <KpiBox label="Cash-on-Cash (After CapEx)" value={pct(u.metrics.cashOnCashAfterCapexPct)} positive={(u.metrics.cashOnCashAfterCapexPct ?? 0) >= 5} foot="Yr-1 cash return" />
        <KpiBox label="Annual Debt Service" value={fmt(u.debt.annualDebtService)} foot="P&I + MI × 12" />
      </View>

      <Text style={styles.para}>
        Debt sizing carries {(u.metrics.dscr ?? 0) >= 1.25 ? "adequate" : (u.metrics.dscr ?? 0) >= 1.10 ? "marginal" : "insufficient"} operating coverage at {num(u.metrics.dscr)}x DSCR
        {cushion >= 0 ? `, providing a ${cushion.toFixed(2)}x cushion above the standard 1.25x lender threshold` : `, falling ${Math.abs(cushion).toFixed(2)}x short of the 1.25x lender minimum`}.
        Debt yield of {pct(u.metrics.debtYieldPct, 1)} {(u.metrics.debtYieldPct ?? 0) >= 10 ? "meets" : "falls below"} institutional 10% minimums, indicating the loan
        {(u.metrics.debtYieldPct ?? 0) >= 10 ? " is sizable relative to income and defensible against value declines" : " may exceed prudent sizing for the property's NOI generation"}.
      </Text>

      <PageFooter firm={firm} />
    </Page>
  );
}

/* ============================================================
 * PAGE 6 — Stress Testing & Sensitivity
 * Renders underwriting.sensitivity.scenarios verbatim. No local scenario()
 * function, no locally generated sensitivity heatmap grid.
 * ============================================================ */

function Page6_Stress({ data, firm }: { data: UnderwritingReportData; firm: string }) {
  const u = data.underwriting;
  const groupLabel: Record<string, string> = {
    rent: "Rent", vacancy: "Vacancy", opex: "Operating Expenses", rate: "Interest Rate", management: "Management", rehab: "Rehab",
  };

  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader firm={firm} title="VI · Stress Testing & Sensitivity" />
      <Text style={styles.pageTitle}>Stress Testing & Sensitivity Analysis</Text>
      <Text style={styles.pageSub}>Every row below reruns the canonical underwriting engine end to end</Text>

      <View style={styles.table}>
        <MultiCol cols={["Scenario", "NOI", "Cash Flow", "DSCR", "Cap Rate", "Rec."]} head />
        {u.sensitivity.scenarios.map((sc, i) => (
          <MultiCol
            key={sc.key}
            alt={i % 2 === 1}
            cols={[sc.label, fmt(sc.noi), fmt(sc.annualCashFlow), num(sc.dscr), pct(sc.capRatePct, 1), sc.pass ? "OK" : "FAILS"]}
          />
        ))}
      </View>
      <Text style={{ fontSize: 7.5, color: COLORS.slateLight, marginBottom: 8, fontStyle: "italic" }}>
        "OK" = cash flow ≥ $0 and DSCR ≥ 1.20 under that scenario (per the underwriting engine's canonical pass/fail definition).
        "FAILS" indicates the deal does not clear that bar under the stressed assumption.
      </Text>

      <Text style={styles.sectionTitle}>Scenario Groups</Text>
      <Text style={styles.para}>
        Scenarios are grouped as: {Array.from(new Set(u.sensitivity.scenarios.map((s) => groupLabel[s.group] ?? s.group))).join(", ")}.
        Every scenario reruns the full income statement, debt service, and capital stack on the modified assumption — none of the figures
        above are derived by adjusting NOI or cash flow directly.
      </Text>

      <PageFooter firm={firm} />
    </Page>
  );
}

/* ============================================================
 * PAGE 7 — Rehab & Value-Add
 * The renovation-category budget split below is explicitly ILLUSTRATIVE
 * planning content (paint/flooring/kitchen/etc. percentage allocations) —
 * there is no canonical per-line-item rehab breakdown in the underwriting
 * engine to defer to. The dollar totals it starts from (rehab budget, ARV,
 * purchase price, rent) are canonical; the category split itself is not a
 * financial-model output and is labeled as illustrative.
 * ============================================================ */

function Page7_Rehab({ data, firm }: { data: UnderwritingReportData; firm: string }) {
  const u = data.underwriting;
  const rehab = u.capital.rehab;
  const arv = u.inputs.arv && u.inputs.arv > 0 ? u.inputs.arv : u.inputs.purchasePrice;
  const lift = arv - u.inputs.purchasePrice;
  const rentLift = u.inputs.monthlyBaseRent * (u.inputs.rentGrowthPct / 100);
  const renoROI = rehab > 0 ? ((lift - rehab) / rehab) * 100 : 0;

  const budget: { item: string; pct: number; addValue: number; rentImpact: number; payback: string }[] = [
    { item: "Paint (Interior + Exterior)", pct: 0.08, addValue: 0.10, rentImpact: 0.02, payback: "0–1 yr" },
    { item: "Flooring", pct: 0.15, addValue: 0.14, rentImpact: 0.04, payback: "1–2 yrs" },
    { item: "Kitchen Refresh", pct: 0.20, addValue: 0.22, rentImpact: 0.10, payback: "2–4 yrs" },
    { item: "Bathrooms", pct: 0.14, addValue: 0.16, rentImpact: 0.06, payback: "2–3 yrs" },
    { item: "Roof", pct: 0.08, addValue: 0.08, rentImpact: 0.00, payback: "insurance / risk" },
    { item: "HVAC", pct: 0.07, addValue: 0.07, rentImpact: 0.01, payback: "capex-driven" },
    { item: "Electrical", pct: 0.04, addValue: 0.04, rentImpact: 0.00, payback: "safety / code" },
    { item: "Plumbing", pct: 0.04, addValue: 0.04, rentImpact: 0.00, payback: "safety / code" },
    { item: "Exterior / Siding", pct: 0.05, addValue: 0.06, rentImpact: 0.02, payback: "3–5 yrs" },
    { item: "Landscaping / Curb Appeal", pct: 0.03, addValue: 0.03, rentImpact: 0.02, payback: "immediate" },
    { item: "Windows", pct: 0.04, addValue: 0.04, rentImpact: 0.01, payback: "4–6 yrs" },
    { item: "Doors", pct: 0.02, addValue: 0.02, rentImpact: 0.00, payback: "cosmetic" },
    { item: "Lighting", pct: 0.02, addValue: 0.02, rentImpact: 0.01, payback: "immediate" },
    { item: "Appliances", pct: 0.03, addValue: 0.03, rentImpact: 0.02, payback: "1–2 yrs" },
    { item: "Contingency", pct: 0.10, addValue: 0.00, rentImpact: 0.00, payback: "reserve" },
  ];

  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader firm={firm} title="VII · Rehab & Value-Add" />
      <Text style={styles.pageTitle}>Rehab & Value-Add Analysis</Text>
      <Text style={styles.pageSub}>Illustrative renovation budget · projected value creation · payback</Text>

      {rehab > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Illustrative Renovation Budget Allocation</Text>
          <Text style={{ fontSize: 7.5, color: COLORS.slateLight, marginBottom: 6, fontStyle: "italic" }}>
            Category splits below are illustrative planning percentages, not underwriting-engine output. Only the total rehab
            budget ({fmt(rehab)}) is canonical; get contractor bids before relying on any single line.
          </Text>
          <View style={styles.table}>
            <MultiCol cols={["Line Item", "Est. Cost", "Illustrative Value Added", "Rent Impact", "Payback"]} head />
            {budget.map((b, i) => (
              <MultiCol key={b.item} alt={i % 2 === 1}
                cols={[
                  b.item,
                  fmt(rehab * b.pct),
                  fmt(lift > 0 ? lift * b.addValue : rehab * b.pct * 1.1),
                  fmt(rentLift > 0 ? rentLift * b.rentImpact : 0),
                  b.payback,
                ]} />
            ))}
            <View style={styles.rowTotal}>
              <Text style={[styles.cell, { fontFamily: "Helvetica-Bold" }]}>Total Rehab Budget</Text>
              <Text style={[styles.cell, styles.cellRight]}>{fmt(rehab)}</Text>
              <Text style={[styles.cell, styles.cellRight]}>{fmt(lift)}</Text>
              <Text style={[styles.cell, styles.cellRight]}>{fmt(rentLift * 12)}/yr</Text>
              <Text style={[styles.cell, styles.cellRight]}>—</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Value-Add Summary</Text>
          <View style={styles.kpiGrid}>
            <KpiBox label="Total Rehab" value={fmt(rehab)} foot="Canonical rehab budget (underwriting.capital.rehab)" />
            <KpiBox label="Projected ARV" value={fmt(arv)} foot="Stabilized value" />
            <KpiBox label="Value Lift" value={fmt(lift)} positive={lift > rehab} foot="ARV − purchase price" />
            <KpiBox label="Illustrative Renovation ROI" value={pct(renoROI, 1)} positive={renoROI > 20} foot="(Lift − Rehab) ÷ Rehab" />
          </View>
          <Text style={styles.para}>
            The rehab budget of {fmt(rehab)} is projected to unlock {fmt(lift)} in value creation, yielding an illustrative renovation-only ROI
            of {pct(renoROI, 1)}. {renoROI > 30 ? "This is a materially accretive value-add profile." : renoROI > 0 ? "Value creation is positive but modest — execution risk warrants close monitoring." : "The current ARV assumption does not support the rehab budget; renovation would be dilutive under these inputs and must be re-scoped or re-priced before proceeding."}
          </Text>
        </>
      ) : (
        <Text style={styles.para}>
          No rehab budget has been allocated in this underwriting. The property is being underwritten as a turnkey / no-renovation acquisition.
          If in-place condition assessment reveals deferred maintenance or capital needs, this section must be re-run with an appropriate scope
          and value-lift assumptions.
        </Text>
      )}

      <Text style={styles.sectionTitle}>Execution Timeline (Illustrative)</Text>
      <View style={styles.table}>
        <MultiCol cols={["Phase", "Duration", "Milestone"]} head />
        <MultiCol cols={["Due Diligence & Closing", "30–45 days", "Inspection, appraisal, funding"]} />
        <MultiCol cols={["Permits & Contractor Bids", "15–30 days", "Scope locked, GC engaged"]} alt />
        <MultiCol cols={["Construction Execution", rehab > 0 ? "60–120 days" : "N/A", "Rehab completed"]} />
        <MultiCol cols={["Lease-Up & Stabilization", "30–60 days", "First qualified tenant in place"]} alt />
      </View>

      <PageFooter firm={firm} />
    </Page>
  );
}

/* ============================================================
 * PAGE 8 — Risk Analytics
 * Every Monte Carlo figure is read directly from the MonteCarloResult
 * distribution objects — no P10/P90 midpoint standing in for median, no
 * hard-coded probabilities, no VaR/ES/Sharpe recomputed in the PDF.
 * ============================================================ */

function Page8_Risk({ data, firm }: { data: UnderwritingReportData; firm: string }) {
  const mc = data.monteCarlo;
  const u = data.underwriting;
  const allFlags = [...u.flags, ...(data.guardrails ?? [])];

  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader firm={firm} title="VIII · Risk Analytics" />
      <Text style={styles.pageTitle}>Probabilistic Risk Analysis</Text>
      <Text style={styles.pageSub}>Monte Carlo simulation · downside quantification</Text>

      {mc ? (
        <>
          <Text style={styles.sectionTitle}>Monte Carlo Simulation ({mc.iterations.toLocaleString()} iterations)</Text>
          <View style={styles.table}>
            <MultiCol cols={["Risk Metric", "Value", "Interpretation"]} head />
            <MultiCol cols={["Mean IRR", pct(mc.irr.mean), "Central-tendency projection"]} />
            <MultiCol cols={["Median IRR (P50)", pct(mc.irr.p50), "Midpoint of simulated outcomes"]} alt />
            <MultiCol cols={["Downside IRR (P10)", pct(mc.irr.p10), "10% of outcomes below this"]} />
            <MultiCol cols={["Upside IRR (P90)", pct(mc.irr.p90), "10% of outcomes above this"]} alt />
            <MultiCol cols={["Probability of Negative Year-1 CF", pct(mc.probNegativeCashFlow, 1), mc.probNegativeCashFlow < 15 ? "Low tail risk" : mc.probNegativeCashFlow < 35 ? "Moderate risk" : "Elevated risk"]} />
            <MultiCol cols={[`Prob. DSCR < ${mc.dscrThreshold.toFixed(2)}x`, pct(mc.probDscrBelowThreshold, 1), "Coverage compression risk"]} alt />
            <MultiCol cols={[`Prob. IRR > ${mc.targetReturnPct.toFixed(1)}%`, pct(mc.probReturnExceedsTarget, 1), "Probability of exceeding target return"]} />
          </View>

          <Text style={styles.sectionTitle}>IRR Distribution</Text>
          <View style={{ marginBottom: 10 }}>
            <MCHistogram p10={mc.irr.p10} p50={mc.irr.p50} p90={mc.irr.p90} mean={mc.irr.mean} />
          </View>

          <Text style={styles.sectionTitle}>Equity Multiple & Tail Risk</Text>
          <View style={styles.table}>
            <MultiCol cols={["Metric", "Value", "Notes"]} head />
            <MultiCol cols={["Expected Equity Multiple (mean)", `${mc.equityMultiple.mean.toFixed(2)}x`, "Directly from simulated cash-flow paths"]} />
            <MultiCol cols={["Equity Multiple P10 / P50 / P90", `${mc.equityMultiple.p10.toFixed(2)}x / ${mc.equityMultiple.p50.toFixed(2)}x / ${mc.equityMultiple.p90.toFixed(2)}x`, "Downside / median / upside envelope"]} alt />
            <MultiCol cols={[`Value at Risk (${mc.cashFlowTailRisk.confidencePct}% conf., annual cash flow)`, fmtSigned(-mc.cashFlowTailRisk.valueAtRisk), `Loss not exceeded ${mc.cashFlowTailRisk.confidencePct}% of the time`]} />
            <MultiCol cols={[`Expected Shortfall (worst ${100 - mc.cashFlowTailRisk.confidencePct}% tail)`, fmtSigned(-mc.cashFlowTailRisk.expectedShortfall), `Average loss within the worst ${100 - mc.cashFlowTailRisk.confidencePct}% of outcomes`]} alt />
            <MultiCol cols={["Sharpe Ratio", mc.sharpeRatio === null ? "Insufficient observations" : mc.sharpeRatio.toFixed(2), `Risk-adjusted return vs. ${mc.riskFreeRatePct}% risk-free rate`]} />
            <MultiCol cols={["Sortino Ratio", mc.sortinoRatio === null ? "Insufficient observations" : mc.sortinoRatio.toFixed(2), "Downside-only risk-adjusted return"]} alt />
          </View>
        </>
      ) : (
        <Text style={styles.para}>
          Monte Carlo simulation was not executed in this underwriting session. Run the Risk Analyzer to attach probabilistic
          distributions, downside percentiles, and Value-at-Risk metrics before making a final investment decision.
        </Text>
      )}

      {allFlags.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Underwriting Guardrails & Disclosures</Text>
          {allFlags.map((g, idx) => (
            <View key={`${g.code}-${idx}`} style={{
              borderLeftWidth: 2.5,
              borderLeftColor: g.severity === "critical" ? COLORS.red : g.severity === "warning" ? COLORS.amber : COLORS.slate,
              backgroundColor: COLORS.surface,
              padding: 6,
              marginBottom: 4,
            }}>
              <Text style={{ fontSize: 7, letterSpacing: 1, textTransform: "uppercase",
                color: g.severity === "critical" ? COLORS.red : g.severity === "warning" ? COLORS.amber : COLORS.slate,
                fontFamily: "Helvetica-Bold" }}>
                {g.severity} · {g.title}
              </Text>
              <Text style={{ fontSize: 8, color: COLORS.slate, marginTop: 2, lineHeight: 1.4 }}>{g.message}</Text>
            </View>
          ))}
        </>
      )}

      <PageFooter firm={firm} />
    </Page>
  );
}

/* ============================================================
 * PAGE 9 — Exit Strategy
 * Every scenario is a direct lookup into underwriting.projection.exitScenarios
 * by holdYears. No local amortization, sale-price, tax, IRR, or equity-
 * multiple calculation. If a requested holding period isn't in the
 * canonical exit-scenario set, the section says so rather than fabricating one.
 * ============================================================ */

function findExit(u: UnderwritingResult, years: number) {
  return u.projection.exitScenarios.find((e) => e.holdYears === years);
}

function Page9_Exit({ data, firm }: { data: UnderwritingReportData; firm: string }) {
  const u = data.underwriting;
  const primaryYears = Math.max(1, Math.round(u.inputs.holdYears));
  const primary = findExit(u, primaryYears);
  const longHold = findExit(u, 35) ?? findExit(u, primaryYears + 5);

  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader firm={firm} title="IX · Exit Strategy Analysis" />
      <Text style={styles.pageTitle}>Exit Strategy Analysis</Text>
      <Text style={styles.pageSub}>Every scenario below is its own independently-computed underwriting.projection.exitScenarios entry</Text>

      {primary ? (
        <>
          <Text style={styles.sectionTitle}>Scenario — Sale at Year {primary.holdYears} ({primary.label})</Text>
          <View style={styles.table}>
            <Row label="Property Value at Exit" value={fmt(primary.propertyValue)} />
            <Row label="Gross Sale Price" value={fmt(primary.grossSalePrice)} alt />
            <Row label="Exit Method" value={primary.method === "exit-cap" ? "Exit cap rate" : "Appreciation"} />
            <Row label="Selling Costs" value={`(${fmt(primary.sellingCosts)})`} alt tone="neg" />
            <Row label="Remaining Loan Balance" value={`(${fmt(primary.loanPayoff)})`} tone="neg" />
            <Row label="Net Proceeds Before Tax" value={fmt(primary.netProceedsPreTax)} alt />
            <Row label="Capital Gains Tax" value={`(${fmt(primary.capitalGainsTax)})`} tone="neg" />
            <Row label="Depreciation Recapture Tax" value={`(${fmt(primary.depreciationRecaptureTax)})`} alt tone="neg" />
            <Row label="Net Proceeds After Tax" value={fmt(primary.netProceedsAfterTax)} bold />
            <Row label="Cumulative Operating Cash Flow" value={fmt(primary.cumulativeCashFlow)} alt />
            <Row label="Pre-Tax IRR" value={pct(primary.irrPreTaxPct)} tone={(primary.irrPreTaxPct ?? 0) > 10 ? "pos" : "neg"} />
            <Row label="After-Tax IRR" value={pct(primary.irrAfterTaxPct)} alt tone={(primary.irrAfterTaxPct ?? 0) > 10 ? "pos" : "neg"} />
            <Row label="Equity Multiple" value={primary.equityMultiple === null ? "N/A" : `${primary.equityMultiple.toFixed(2)}x`} />
            <Row label="Annualized Return (CAGR of equity multiple)" value={pct(primary.annualizedReturnPct)} alt />
          </View>
        </>
      ) : (
        <Text style={styles.para}>
          No canonical exit scenario exists for the entered {primaryYears}-year holding period. This should not happen —
          verify the underwriting engine populated projection.exitScenarios before generating this report.
        </Text>
      )}

      <Text style={styles.sectionTitle}>All Canonical Exit Scenarios</Text>
      <View style={styles.table}>
        <MultiCol cols={["Holding Period", "Property Value", "Net Proceeds (Pre-Tax)", "Equity Multiple", "Pre-Tax IRR"]} head />
        {[...u.projection.exitScenarios].sort((a, b) => a.holdYears - b.holdYears).map((s, i) => (
          <MultiCol
            key={s.holdYears}
            alt={i % 2 === 1}
            cols={[
              `Year ${s.holdYears}${s.holdYears === primaryYears ? " (entered hold)" : ""}`,
              fmt(s.propertyValue),
              fmt(s.netProceedsPreTax),
              s.equityMultiple === null ? "N/A" : `${s.equityMultiple.toFixed(2)}x`,
              pct(s.irrPreTaxPct),
            ]}
          />
        ))}
      </View>

      {longHold && longHold.holdYears !== primaryYears && (
        <>
          <Text style={styles.sectionTitle}>Long-Term Hold — Year {longHold.holdYears}</Text>
          <View style={styles.table}>
            <Row label="Projected Property Value" value={fmt(longHold.propertyValue)} />
            <Row label="Remaining Loan Balance" value={fmt(longHold.loanPayoff)} alt />
            <Row label="Projected Equity" value={fmt(longHold.propertyValue - longHold.loanPayoff)} bold tone="pos" />
            <Row label="Cumulative Operating Cash Flow" value={fmt(longHold.cumulativeCashFlow)} alt />
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>1031 Exchange — Year {primaryYears}</Text>
      {primary ? (
        <View style={styles.table}>
          <Row label="Net Proceeds Before Tax (tax-deferred if exchanged)" value={fmt(primary.netProceedsPreTax)} bold tone="pos" />
          <Row label="Tax Deferral Benefit vs. Outright Sale" value={fmt(primary.capitalGainsTax + primary.depreciationRecaptureTax)} alt tone="pos" />
          <Row label="Reinvestment Requirement" value="100% of equity into like-kind property" />
          <Row label="Best Suited For" value="Investors compounding portfolio without tax friction" alt />
        </View>
      ) : (
        <Text style={styles.para}>Not available — see note above.</Text>
      )}

      <PageFooter firm={firm} />
    </Page>
  );
}

/* ============================================================
 * PAGE 10 — Investment Committee Memo
 * ============================================================ */

function Page10_Memo({ data, firm }: { data: UnderwritingReportData; firm: string }) {
  const u = data.underwriting;
  const rec = computeRecommendations(u, data.monteCarlo, data.dci);
  const dscr = u.metrics.dscr ?? 0;
  const dscrText = dscr >= 1.25 ? "adequate coverage" : dscr >= 1.0 ? "thin coverage" : "insufficient coverage";
  const cfText = u.cashFlow.monthlyAfterCapex >= 0 ? "generates positive first-year cash flow" : "produces negative first-year cash flow";
  const mcNeg = data.monteCarlo?.probNegativeCashFlow ?? 20;
  const arvDisplay = u.inputs.arv && u.inputs.arv > 0 ? u.inputs.arv : u.inputs.purchasePrice;

  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader firm={firm} title="X · Investment Committee Memo" />
      <Text style={styles.pageTitle}>Investment Committee Memo</Text>
      <Text style={styles.pageSub}>Underwriting analyst credit assessment</Text>

      <Text style={styles.sectionTitle}>Investment Thesis</Text>
      <Text style={styles.para}>
        {data.propertyName || "The subject property"} is underwritten as a {u.capital.rehab > 0 ? "value-add" : "stabilized income"} acquisition
        at a purchase basis of {fmt(u.inputs.purchasePrice)}. The transaction {cfText} of {fmt(u.cashFlow.monthlyAfterCapex)}/month
        and delivers {pct(u.metrics.cashOnCashAfterCapexPct)} cash-on-cash return on {fmt(u.capital.cashInvested)} of invested equity.
        Debt service is provided with {dscrText} at {num(u.metrics.dscr)}x DSCR.
      </Text>

      <Text style={styles.sectionTitle}>Primary Strengths</Text>
      <Text style={styles.bullet}>• {dscr >= 1.25 ? `DSCR of ${num(u.metrics.dscr)}x exceeds institutional 1.25x threshold` : "DSCR does not meet institutional threshold — see weaknesses"}</Text>
      <Text style={styles.bullet}>• {(u.metrics.cashOnCashAfterCapexPct ?? 0) >= 6 ? `Cash-on-cash return of ${pct(u.metrics.cashOnCashAfterCapexPct)} is competitive for the risk profile` : `Cash-on-cash of ${pct(u.metrics.cashOnCashAfterCapexPct)} — modest`}</Text>
      <Text style={styles.bullet}>• {(u.metrics.capRatePct ?? 0) >= 6 ? `Cap rate of ${pct(u.metrics.capRatePct)} provides margin against value compression` : `Cap rate of ${pct(u.metrics.capRatePct)} is compressed — appreciation-dependent`}</Text>
      <Text style={styles.bullet}>• {mcNeg < 20 ? `Monte Carlo shows only ${pct(mcNeg, 1)} probability of negative Year-1 CF` : "Probabilistic downside is elevated — see weaknesses"}</Text>

      <Text style={styles.sectionTitle}>Primary Weaknesses & Execution Risks</Text>
      {dscr < 1.25 && <Text style={styles.bullet}>• DSCR at {num(u.metrics.dscr)}x sits below the lender-preferred 1.25x cushion; refinance risk elevated in a rate-up environment.</Text>}
      {u.cashFlow.monthlyAfterCapex < 0 && <Text style={styles.bullet}>• Negative first-year cash flow of {fmt(u.cashFlow.monthlyAfterCapex)}/mo requires supplemental capital contributions.</Text>}
      {mcNeg >= 25 && <Text style={styles.bullet}>• Elevated probability of negative Year-1 cash flow ({pct(mcNeg, 1)}) under Monte Carlo modeling.</Text>}
      {u.capital.rehab > 0 && <Text style={styles.bullet}>• Construction execution risk on {fmt(u.capital.rehab)} rehab scope; cost and timeline overruns common.</Text>}
      {u.validationErrors.length > 0 && <Text style={styles.bullet}>• Underwriting reconciliation flagged {u.validationErrors.length} issue(s): {u.validationErrors.join("; ")}.</Text>}
      <Text style={styles.bullet}>• Market data (rent comps, vacancy, appreciation) has not been independently verified within this report.</Text>
      <Text style={styles.bullet}>• Physical property condition assumes inspection findings will not reveal additional deferred maintenance.</Text>

      <Text style={styles.sectionTitle}>Collateral Quality & Income Stability</Text>
      <Text style={styles.para}>
        Collateral is a single-asset residential rental property. Income stability depends on tenant quality, local rental demand, and the
        rent assumption's alignment with market. The current underwriting {u.inputs.vacancyPct < 5 ? "assumes aggressive vacancy below the 5–8% stabilized market benchmark, potentially overstating income stability" : "uses a market-consistent vacancy assumption"}.
        The vast majority of income is derived from a single lease, concentrating tenant credit risk.
      </Text>

      <Text style={styles.sectionTitle}>Recommendation</Text>
      <View style={[styles.recBanner, { backgroundColor: rec.invBg, borderLeftColor: rec.invColor, marginBottom: 8 }]}>
        <Text style={styles.recLabel}>Investment Committee Recommendation</Text>
        <Text style={[styles.recValue, { color: rec.invColor, fontSize: 18 }]}>{rec.inv.toUpperCase()}</Text>
        <Text style={styles.recSub}>Lender decision: {rec.lender}</Text>
      </View>

      <Text style={styles.sectionTitle}>Conditions Required Before Funding</Text>
      <Text style={styles.bullet}>• Independent third-party appraisal supporting the ARV of {fmt(arvDisplay)}.</Text>
      <Text style={styles.bullet}>• Property inspection confirming no material undisclosed deferred maintenance.</Text>
      <Text style={styles.bullet}>• Verified rent comparables corroborating the {fmt(u.inputs.monthlyBaseRent)}/month rental assumption.</Text>
      <Text style={styles.bullet}>• Title, environmental, and flood-zone due diligence cleared.</Text>
      {u.capital.rehab > 0 && <Text style={styles.bullet}>• Contractor bids and detailed rehab scope of work within 5% of the {fmt(u.capital.rehab)} budget.</Text>}
      <Text style={styles.bullet}>• Borrower liquidity of at least 6 months' debt service in reserve post-closing.</Text>

      <Text style={styles.sectionTitle}>Underwriting Conclusion</Text>
      <Text style={styles.para}>
        On a fully quantified basis, this transaction represents a {rec.inv.toLowerCase()} decision. The recommendation is contingent
        on satisfaction of the pre-funding conditions and independent verification of the market and property assumptions embedded in this analysis.
        Deviation from any of the base-case underwriting inputs — particularly rent, vacancy, or debt service — should trigger a re-underwrite before capital deployment.
      </Text>

      <PageFooter firm={firm} />
    </Page>
  );
}

/* ============================================================
 * AI MEMO COVER PAGES (unchanged legacy — narrative text only, no financial calcs)
 * ============================================================ */

const memoStyles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 56,
    fontSize: 11,
    fontFamily: "Times-Roman",
    color: COLORS.navy,
    backgroundColor: COLORS.cream,
  },
  eyebrow: { fontSize: 8, letterSpacing: 3, color: COLORS.slateLight, textTransform: "uppercase", marginBottom: 10 },
  title: { fontSize: 24, fontFamily: "Times-Bold", color: COLORS.navy, marginBottom: 6, lineHeight: 1.15 },
  subtitle: { fontSize: 9, color: COLORS.slateLight, marginBottom: 22 },
  divider: { borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 18 },
  sectionHead: { fontSize: 9, fontFamily: "Times-Bold", color: COLORS.slate, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, marginTop: 4 },
  body: { fontSize: 11, lineHeight: 1.7, color: COLORS.navy, marginBottom: 18, textAlign: "justify" },
  footer: {
    position: "absolute", bottom: 24, left: 56, right: 56,
    paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border,
    flexDirection: "row", justifyContent: "space-between",
  },
  footerText: { fontSize: 7, color: COLORS.slateLight, letterSpacing: 1.5 },
});

function MemoCoverPages({ data, firm, today }: { data: UnderwritingReportData; firm: string; today: string }) {
  const memo = data.aiMemo!;
  return (
    <>
      <Page size="LETTER" style={memoStyles.page}>
        <Text style={memoStyles.eyebrow}>{firm} · Confidential Investment Memorandum</Text>
        <Text style={memoStyles.title}>{data.propertyName || "Untitled Deal"}</Text>
        <Text style={memoStyles.subtitle}>
          {data.address ? `${data.address}  ·  ` : ""}Prepared {today}
        </Text>
        <View style={memoStyles.divider} />
        <Text style={memoStyles.sectionHead}>I. Executive Summary</Text>
        <Text style={memoStyles.body}>{memo.executiveSummary}</Text>
        <Text style={memoStyles.sectionHead}>II. Financial Performance Analysis</Text>
        <Text style={memoStyles.body}>{memo.financialAnalysis}</Text>
        <View style={memoStyles.footer} fixed>
          <Text style={memoStyles.footerText}>{firm.toUpperCase()}  ·  COVER SHEET</Text>
          <Text style={memoStyles.footerText} render={({ pageNumber, totalPages }: any) => `PAGE ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
      <Page size="LETTER" style={memoStyles.page}>
        <Text style={memoStyles.eyebrow}>{firm} · Portfolio Summary</Text>
        <Text style={memoStyles.title}>Risk & Value-Add Thesis</Text>
        <Text style={memoStyles.subtitle}>{data.propertyName}  ·  {today}</Text>
        <View style={memoStyles.divider} />
        <Text style={memoStyles.sectionHead}>III. Monte Carlo Risk Appraisal</Text>
        <Text style={memoStyles.body}>{memo.riskAppraisal}</Text>
        <Text style={memoStyles.sectionHead}>IV. Tactical Value-Add Recommendations</Text>
        <Text style={memoStyles.body}>{memo.valueAddRecommendations}</Text>
        <View style={memoStyles.footer} fixed>
          <Text style={memoStyles.footerText}>{firm.toUpperCase()}  ·  PORTFOLIO SUMMARY</Text>
          <Text style={memoStyles.footerText} render={({ pageNumber, totalPages }: any) => `PAGE ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </>
  );
}
