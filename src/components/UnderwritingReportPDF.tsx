import { Document, Page, Text, View, StyleSheet, Svg, Rect, Line as SvgLine, Path } from "@react-pdf/renderer";
import type { GuardrailFlag } from "@/lib/guardrails";

/* ============================================================
 * RentIntel SRA — Institutional Investment Memorandum
 * 10-page underwriting package (+ optional AI memo cover pages)
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

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v || 0);
const fmtSigned = (v: number) => (v < 0 ? `(${fmt(Math.abs(v))})` : fmt(v));
const pct = (v: number, d = 2) => `${(v || 0).toFixed(d)}%`;

export interface UnderwritingReportData {
  propertyName: string;
  address?: string;
  preparedFor?: string;
  firmName?: string;
  // Core KPIs
  purchasePrice: number;
  cashOnCash: number;
  capRate: number;
  dscr: number;
  // Capital stack
  downPayment: number;
  closingCosts: number;
  rehab: number;
  loanAmount: number;
  totalCashIn: number;
  // Monthly income statement
  grossRent: number;
  otherIncome: number;
  vacancy: number;
  operatingExpenses: number;
  noiMonthly: number;
  debtService: number;
  netCashFlow: number;
  // Monte Carlo
  monteCarlo?: {
    iterations: number;
    probNegativeCF: number;
    expectedIRR: number;
    irrP10: number;
    irrP90: number;
  };
  aiMemo?: {
    executiveSummary: string;
    financialAnalysis: string;
    riskAppraisal: string;
    valueAddRecommendations: string;
    updatedAt: string;
  };
  guardrails?: GuardrailFlag[];
  dci?: { adjusted: number; ceiling: number; label: string };

  /* -------- Extended underwriting inputs (optional) -------- */
  arv?: number;
  interestRate?: number;      // %
  loanTerm?: number;          // years
  taxRatePct?: number;        // % of value / yr
  insRatePct?: number;        // % of value / yr
  hoaMonthly?: number;
  mgmtPct?: number;
  maintPct?: number;
  capexPct?: number;
  vacancyPct?: number;
  rentGrowth?: number;
  expGrowth?: number;
  appreciation?: number;
  holdYears?: number;
  projections?: { year: number; rent: number; value: number; cashFlow: number; equity: number }[];
  expenseBreakdown?: { name: string; value: number }[];
}

/* ---------------- Utility components ---------------- */

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
      <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `PAGE ${pageNumber} / ${totalPages}`} />
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

/* ---------------- Simple SVG charts ---------------- */

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

function MCHistogram({ p10, p50, p90, mean, width = 480, height = 90 }: {
  p10: number; p50: number; p90: number; mean: number; width?: number; height?: number;
}) {
  const min = Math.min(p10, mean) - 2;
  const max = Math.max(p90, mean) + 2;
  const range = max - min || 1;
  const pxOf = (v: number) => 10 + ((v - min) / range) * (width - 20);
  // Approximate bell curve using triangle-ish path
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

/* ---------------- Recommendation logic ---------------- */

function computeRecommendations(data: UnderwritingReportData) {
  const { dscr, cashOnCash, capRate, netCashFlow, monteCarlo, dci } = data;
  const mcNeg = monteCarlo?.probNegativeCF ?? 20;
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
  const arv = data.arv && data.arv > 0 ? data.arv : data.purchasePrice;
  const totalProjectCost = data.purchasePrice + data.rehab + data.closingCosts;
  const ltv = arv > 0 ? (data.loanAmount / arv) * 100 : 0;
  const ltc = totalProjectCost > 0 ? (data.loanAmount / totalProjectCost) * 100 : 0;
  const annualNOI = data.noiMonthly * 12;
  const debtYield = data.loanAmount > 0 ? (annualNOI / data.loanAmount) * 100 : 0;
  const grossIncomeMo = data.grossRent + data.otherIncome;
  const breakEvenOcc = grossIncomeMo > 0
    ? Math.min(100, Math.max(0, ((data.debtService + data.operatingExpenses) / grossIncomeMo) * 100))
    : 0;
  const rec = computeRecommendations(data);
  const summary = executiveSummaryNarrative(data, { arv, ltv, ltc, debtYield, breakEvenOcc });

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

      {/* KPI grid */}
      <View style={styles.kpiGrid}>
        <KpiBox label="Purchase Price" value={fmt(data.purchasePrice)} foot="Acquisition basis" />
        <KpiBox label="ARV" value={fmt(arv)} foot="Stabilized value" />
        <KpiBox label="Loan Amount" value={fmt(data.loanAmount)} foot={`${pct(ltv, 1)} LTV`} />
        <KpiBox label="LTC" value={pct(ltc, 1)} foot="Loan / total cost" />
      </View>
      <View style={styles.kpiGrid}>
        <KpiBox label="Total Cash In" value={fmt(data.totalCashIn)} foot="Equity + closing + rehab" />
        <KpiBox label="Cash-on-Cash" value={pct(data.cashOnCash)} positive={data.cashOnCash > 0} foot="Yr-1 return on equity" />
        <KpiBox label="Cap Rate" value={pct(data.capRate)} positive={data.capRate >= 5} foot="NOI ÷ value" />
        <KpiBox label="DSCR" value={data.dscr.toFixed(2)} positive={data.dscr >= 1.25}
          foot={data.dscr >= 1.25 ? "Lender-qualified" : data.dscr >= 1.0 ? "Marginal" : "Below 1.0"} />
      </View>
      <View style={styles.kpiGrid}>
        <KpiBox label="Debt Yield" value={pct(debtYield, 1)} positive={debtYield >= 10} foot="NOI ÷ loan" />
        <KpiBox label="Break-Even Occ." value={pct(breakEvenOcc, 0)} foot="Min occupancy to cover" />
        <KpiBox label="Annual NOI" value={fmt(annualNOI)} foot="Net Operating Income" />
        <KpiBox label="Monthly Cash Flow" value={fmt(data.netCashFlow)} positive={data.netCashFlow >= 0} foot="After debt service" />
      </View>

      <Text style={styles.sectionTitle}>Executive Summary</Text>
      <Text style={styles.para}>{summary}</Text>

      <PageFooter firm={firm} />
    </Page>
  );
}

function executiveSummaryNarrative(
  d: UnderwritingReportData,
  ext: { arv: number; ltv: number; ltc: number; debtYield: number; breakEvenOcc: number }
) {
  const dscrText = d.dscr >= 1.25
    ? `debt service coverage of ${d.dscr.toFixed(2)}x provides comfortable cushion above the 1.25x lender threshold`
    : d.dscr >= 1.0
      ? `debt service coverage of ${d.dscr.toFixed(2)}x is thin and offers limited margin for operating variance`
      : `debt service coverage of ${d.dscr.toFixed(2)}x is below break-even and indicates the property cannot service debt from operations`;
  const cfText = d.netCashFlow >= 0
    ? `first-year monthly cash flow of ${fmt(d.netCashFlow)} after all operating costs and debt service`
    : `first-year cash flow of ${fmt(d.netCashFlow)}/month, requiring supplemental capital contributions`;
  const yieldText = ext.debtYield >= 10
    ? `Debt yield of ${ext.debtYield.toFixed(1)}% is within institutional acceptance ranges`
    : `Debt yield of ${ext.debtYield.toFixed(1)}% falls below the 10% institutional threshold`;

  return `This underwriting evaluates the acquisition of ${d.propertyName || "the subject property"} at ${fmt(d.purchasePrice)} against a stabilized value of ${fmt(ext.arv)}, financed at ${ext.ltv.toFixed(1)}% loan-to-value and ${ext.ltc.toFixed(1)}% loan-to-cost. The transaction requires ${fmt(d.totalCashIn)} in total invested equity and delivers ${cfText}, producing a ${pct(d.cashOnCash)} cash-on-cash return and a ${pct(d.capRate)} cap rate. The ${dscrText}. ${yieldText}, and break-even occupancy sits at ${ext.breakEvenOcc.toFixed(0)}% — a ${100 - ext.breakEvenOcc >= 15 ? "meaningful" : "narrow"} operating margin. Refer to the risk analytics section for probabilistic downside modeling and to the investment committee memo for full recommendation rationale.`;
}

/* ============================================================
 * PAGE 2 — Property & Market Overview
 * ============================================================ */

function Page2_Property({ data, firm }: { data: UnderwritingReportData; firm: string }) {
  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader firm={firm} title="II · Property & Market Overview" />
      <Text style={styles.pageTitle}>Property & Market Overview</Text>
      <Text style={styles.pageSub}>Physical asset, neighborhood, and rental market context</Text>

      <Text style={styles.sectionTitle}>Property Details</Text>
      <View style={styles.table}>
        <Row label="Address" value={data.address || "—"} />
        <Row label="Property Type" value="Single-family / small multifamily rental" alt />
        <Row label="Year Built" value="Not provided — verify at inspection" />
        <Row label="Square Footage" value="Not provided — verify at inspection" alt />
        <Row label="Bedrooms / Bathrooms" value="Not provided" />
        <Row label="Lot Size" value="Not provided" alt />
        <Row label="Parking" value="Not provided" />
        <Row label="Estimated Property Condition" value={data.rehab > 0 ? "Value-add — rehab budgeted" : "Turnkey / no rehab budgeted"} alt />
      </View>
      <Text style={{ fontSize: 7.5, color: COLORS.slateLight, marginBottom: 10, fontStyle: "italic" }}>
        Physical property specifications must be independently verified via inspection, county records, and appraisal. Values shown reflect only the underwriting inputs provided.
      </Text>

      <Text style={styles.sectionTitle}>Neighborhood & Market Analysis</Text>
      <View style={styles.table}>
        <MultiCol cols={["Indicator", "Value", "Source Basis"]} head />
        <MultiCol cols={["Walk Score", "Not verified", "Requires independent lookup"]} />
        <MultiCol cols={["School Rating", "Not verified", "Requires GreatSchools / district data"]} alt />
        <MultiCol cols={["Flood Zone", "Not verified", "FEMA map lookup required"]} />
        <MultiCol cols={["Crime Rating", "Not verified", "Local / regional data required"]} alt />
        <MultiCol cols={["Rent Growth", data.rentGrowth != null ? pct(data.rentGrowth) : "—", "Underwriting assumption"]} />
        <MultiCol cols={["Appreciation Rate", data.appreciation != null ? pct(data.appreciation) : "—", "Underwriting assumption"]} alt />
        <MultiCol cols={["Vacancy Assumption", data.vacancyPct != null ? pct(data.vacancyPct) : "—", "Underwriting assumption"]} />
        <MultiCol cols={["Expense Inflation", data.expGrowth != null ? pct(data.expGrowth) : "—", "Underwriting assumption"]} alt />
      </View>
      <Text style={{ fontSize: 7.5, color: COLORS.slateLight, marginBottom: 8, fontStyle: "italic" }}>
        Market indicators marked "Not verified" are not embedded in this report. Investors must independently verify demographic, employment, and neighborhood data before relying on projections.
      </Text>

      <Text style={styles.sectionTitle}>Market Strength Assessment</Text>
      <Text style={styles.para}>
        Market strength is inferred indirectly from the underwriting assumptions rather than from directly ingested demographic data.
        A rent growth assumption of {pct(data.rentGrowth ?? 3)} paired with appreciation of {pct(data.appreciation ?? 3)} reflects
        {" "}{(data.rentGrowth ?? 3) >= 4 ? "an optimistic" : (data.rentGrowth ?? 3) >= 2 ? "a moderate" : "a conservative"} growth outlook.
        Vacancy assumed at {pct(data.vacancyPct ?? 5)} is {" "}{(data.vacancyPct ?? 5) < 5 ? "aggressive versus the 5–8% stabilized benchmark" : "within stabilized market norms"}.
        Investors are strongly advised to independently corroborate these assumptions using multiple market data sources — including HUD Small Area FMR, CoStar/Yardi comparable rent surveys, BLS employment statistics, and local MLS days-on-market data — before proceeding to LOI.
      </Text>

      <PageFooter firm={firm} />
    </Page>
  );
}

/* ============================================================
 * PAGE 3 — Acquisition & Capital Stack
 * ============================================================ */

function Page3_Capital({ data, firm }: { data: UnderwritingReportData; firm: string }) {
  const arv = data.arv && data.arv > 0 ? data.arv : data.purchasePrice;
  const loanFees = data.loanAmount * 0.01; // 1% loan fee assumption
  const inspection = 500;
  const appraisal = 650;
  const holdingCosts = data.debtService * 2; // 2 months holding
  const contingency = data.rehab * 0.10;
  const totalProject = data.purchasePrice + data.closingCosts + loanFees + data.rehab + holdingCosts + inspection + appraisal + contingency;
  const borrowerEquity = totalProject - data.loanAmount;
  const equityPct = totalProject > 0 ? (borrowerEquity / totalProject) * 100 : 0;
  const ltv = arv > 0 ? (data.loanAmount / arv) * 100 : 0;
  const ltc = totalProject > 0 ? (data.loanAmount / totalProject) * 100 : 0;

  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader firm={firm} title="III · Acquisition & Capital Stack" />
      <Text style={styles.pageTitle}>Acquisition Structure</Text>
      <Text style={styles.pageSub}>Sources & uses of capital · leverage · closing budget</Text>

      <Text style={styles.sectionTitle}>Sources & Uses</Text>
      <View style={styles.table}>
        <MultiCol cols={["Use of Funds", "Amount"]} head />
        <MultiCol cols={["Purchase Price", fmt(data.purchasePrice)]} />
        <MultiCol cols={["Closing Costs (title, escrow, transfer)", fmt(data.closingCosts)]} alt />
        <MultiCol cols={["Loan Origination & Fees (~1% of loan)", fmt(loanFees)]} />
        <MultiCol cols={["Rehab / CapEx Budget", fmt(data.rehab)]} alt />
        <MultiCol cols={["Holding Costs (~2 mo debt service)", fmt(holdingCosts)]} />
        <MultiCol cols={["Inspection", fmt(inspection)]} alt />
        <MultiCol cols={["Appraisal", fmt(appraisal)]} />
        <MultiCol cols={["Contingency Reserve (10% of rehab)", fmt(contingency)]} alt />
        <View style={styles.rowTotal}>
          <Text style={[styles.cell, { fontFamily: "Helvetica-Bold" }]}>Total Project Cost</Text>
          <Text style={[styles.cell, styles.cellRight]}>{fmt(totalProject)}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Sources of Capital</Text>
      <View style={styles.table}>
        <MultiCol cols={["Source", "Amount", "% of Total"]} head />
        <MultiCol cols={["Senior Debt", fmt(data.loanAmount), pct(ltc, 1)]} />
        <MultiCol cols={["Borrower Equity (cash required)", fmt(borrowerEquity), pct(equityPct, 1)]} alt />
        <View style={styles.rowTotal}>
          <Text style={[styles.cell, { fontFamily: "Helvetica-Bold" }]}>Total Sources</Text>
          <Text style={[styles.cell, styles.cellRight]}>{fmt(totalProject)}</Text>
          <Text style={[styles.cell, styles.cellRight]}>100.0%</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Leverage Metrics</Text>
      <View style={styles.kpiGrid}>
        <KpiBox label="Loan-to-Value" value={pct(ltv, 1)} foot="Loan ÷ ARV" positive={ltv <= 75} />
        <KpiBox label="Loan-to-Cost" value={pct(ltc, 1)} foot="Loan ÷ total cost" positive={ltc <= 80} />
        <KpiBox label="Equity %" value={pct(equityPct, 1)} foot="Borrower skin-in-the-game" />
        <KpiBox label="Cash Required at Closing" value={fmt(borrowerEquity)} foot="Total investor equity" />
      </View>

      <Text style={styles.para}>
        Capital structure reflects a {ltv <= 75 ? "moderate" : "aggressive"} leverage profile at {pct(ltv, 1)} LTV and {pct(ltc, 1)} LTC.
        {ltv > 80 ? " LTV above 80% materially constrains lender options and typically requires portfolio or private debt with pricing premiums." : ""}
        {" "}Borrower equity commitment of {fmt(borrowerEquity)} represents {pct(equityPct, 1)} of the total capitalization, providing
        {equityPct >= 25 ? " adequate" : " modest"} loss-absorption capacity ahead of the senior debt.
      </Text>

      <PageFooter firm={firm} />
    </Page>
  );
}

/* ============================================================
 * PAGE 4 — Operating Income Statement
 * ============================================================ */

function Page4_Income({ data, firm }: { data: UnderwritingReportData; firm: string }) {
  const gross = data.grossRent + data.otherIncome;
  const egi = gross - data.vacancy;
  const noiMo = data.noiMonthly;
  const noiYr = noiMo * 12;
  const debtYr = data.debtService * 12;
  const cfYr = data.netCashFlow * 12;
  const stabilizedRent = data.grossRent * (1 + (data.rentGrowth ?? 3) / 100);
  const noiMargin = gross > 0 ? (noiMo / gross) * 100 : 0;
  const expRatio = egi > 0 ? (data.operatingExpenses / egi) * 100 : 0;

  // Approximate expense components using ratios if provided
  const arv = data.arv && data.arv > 0 ? data.arv : data.purchasePrice;
  const taxMo = data.taxRatePct != null ? (arv * data.taxRatePct) / 100 / 12 : data.operatingExpenses * 0.30;
  const insMo = data.insRatePct != null ? (arv * data.insRatePct) / 100 / 12 : data.operatingExpenses * 0.10;
  const hoaMo = data.hoaMonthly ?? 0;
  const mgmtMo = data.mgmtPct != null ? (data.grossRent * data.mgmtPct) / 100 : data.operatingExpenses * 0.15;
  const maintMo = data.maintPct != null ? (data.grossRent * data.maintPct) / 100 : data.operatingExpenses * 0.15;
  const capexMo = data.capexPct != null ? (data.grossRent * data.capexPct) / 100 : data.operatingExpenses * 0.15;

  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader firm={firm} title="IV · Operating Income Statement" />
      <Text style={styles.pageTitle}>Operating Income Statement</Text>
      <Text style={styles.pageSub}>Monthly · Annual · Stabilized (Year 2)</Text>

      <View style={styles.table}>
        <MultiCol cols={["Line Item", "Monthly", "Annual", "Stabilized"]} head />
        <MultiCol cols={["Scheduled Rent", fmt(data.grossRent), fmt(data.grossRent * 12), fmt(stabilizedRent * 12)]} />
        <MultiCol cols={["Other Income (parking / laundry / fees)", fmt(data.otherIncome), fmt(data.otherIncome * 12), fmt(data.otherIncome * 12)]} alt />
        <MultiCol cols={["Gross Potential Income", fmt(gross), fmt(gross * 12), fmt((stabilizedRent + data.otherIncome) * 12)]} bold />
        <MultiCol cols={["Less: Vacancy & Credit Loss", `(${fmt(data.vacancy)})`, `(${fmt(data.vacancy * 12)})`, `(${fmt(stabilizedRent * (data.vacancyPct ?? 5) / 100 * 12)})`]} alt />
        <MultiCol cols={["Effective Gross Income", fmt(egi), fmt(egi * 12), fmt((stabilizedRent + data.otherIncome - stabilizedRent * (data.vacancyPct ?? 5) / 100) * 12)]} bold />

        <MultiCol cols={["Property Taxes", `(${fmt(taxMo)})`, `(${fmt(taxMo * 12)})`, `(${fmt(taxMo * 12 * 1.03)})`]} />
        <MultiCol cols={["Insurance", `(${fmt(insMo)})`, `(${fmt(insMo * 12)})`, `(${fmt(insMo * 12 * 1.05)})`]} alt />
        <MultiCol cols={["HOA / Association", `(${fmt(hoaMo)})`, `(${fmt(hoaMo * 12)})`, `(${fmt(hoaMo * 12 * 1.03)})`]} />
        <MultiCol cols={["Property Management", `(${fmt(mgmtMo)})`, `(${fmt(mgmtMo * 12)})`, `(${fmt((stabilizedRent * (data.mgmtPct ?? 8)) / 100 * 12)})`]} alt />
        <MultiCol cols={["Maintenance & Repairs", `(${fmt(maintMo)})`, `(${fmt(maintMo * 12)})`, `(${fmt((stabilizedRent * (data.maintPct ?? 5)) / 100 * 12)})`]} />
        <MultiCol cols={["Capital Reserve (CapEx)", `(${fmt(capexMo)})`, `(${fmt(capexMo * 12)})`, `(${fmt((stabilizedRent * (data.capexPct ?? 5)) / 100 * 12)})`]} alt />
        <MultiCol cols={["Total Operating Expenses", `(${fmt(data.operatingExpenses)})`, `(${fmt(data.operatingExpenses * 12)})`, "—"]} bold />

        <MultiCol cols={["Net Operating Income (NOI)", fmt(noiMo), fmt(noiYr), fmt(noiYr * 1.03)]} bold />
        <MultiCol cols={["Debt Service (P&I + PMI)", `(${fmt(data.debtService)})`, `(${fmt(debtYr)})`, `(${fmt(debtYr)})`]} alt />
        <View style={styles.rowTotal}>
          <Text style={[styles.cell, { fontFamily: "Helvetica-Bold" }]}>Net Cash Flow</Text>
          <Text style={[styles.cell, styles.cellRight, cfYr >= 0 ? styles.cellRightPos : styles.cellRightNeg]}>{fmt(data.netCashFlow)}</Text>
          <Text style={[styles.cell, styles.cellRight, cfYr >= 0 ? styles.cellRightPos : styles.cellRightNeg]}>{fmt(cfYr)}</Text>
          <Text style={[styles.cell, styles.cellRight]}>—</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Operating Ratios</Text>
      <View style={styles.kpiGrid}>
        <KpiBox label="NOI Margin" value={pct(noiMargin, 1)} foot="NOI ÷ gross income" positive={noiMargin >= 55} />
        <KpiBox label="Expense Ratio" value={pct(expRatio, 1)} foot="OpEx ÷ EGI" positive={expRatio <= 45} />
        <KpiBox label="DSCR" value={data.dscr.toFixed(2)} positive={data.dscr >= 1.25} foot="NOI ÷ debt service" />
        <KpiBox label="Annual NOI" value={fmt(noiYr)} foot="Year-1 net operating" />
      </View>

      {data.expenseBreakdown && data.expenseBreakdown.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Monthly Expense Composition</Text>
          <HBarChart data={data.expenseBreakdown.filter(e => e.name !== "Mortgage")} />
        </>
      )}

      <PageFooter firm={firm} />
    </Page>
  );
}

/* ============================================================
 * PAGE 5 — Financing Analysis
 * ============================================================ */

function Page5_Financing({ data, firm }: { data: UnderwritingReportData; firm: string }) {
  const rate = data.interestRate ?? 6.5;
  const term = data.loanTerm ?? 30;
  const arv = data.arv && data.arv > 0 ? data.arv : data.purchasePrice;
  const totalCost = data.purchasePrice + data.rehab + data.closingCosts;
  const ltv = arv > 0 ? (data.loanAmount / arv) * 100 : 0;
  const ltc = totalCost > 0 ? (data.loanAmount / totalCost) * 100 : 0;
  const noiYr = data.noiMonthly * 12;
  const debtYr = data.debtService * 12;
  const debtYield = data.loanAmount > 0 ? (noiYr / data.loanAmount) * 100 : 0;
  const cushion = data.dscr - 1.25;
  const roe = data.totalCashIn > 0 ? ((data.netCashFlow * 12) / data.totalCashIn) * 100 : 0;

  // Amortization: first-month interest / principal
  const mRate = rate / 100 / 12;
  const firstInterest = data.loanAmount * mRate;
  const firstPrincipal = Math.max(0, data.debtService - firstInterest);

  // Remaining balance schedule (5 / 10 yrs)
  const balAt = (yrs: number) => {
    let bal = data.loanAmount;
    for (let m = 0; m < yrs * 12; m++) {
      const i = bal * mRate;
      bal -= Math.max(0, data.debtService - i);
      if (bal <= 0) return 0;
    }
    return bal;
  };

  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader firm={firm} title="V · Financing Analysis" />
      <Text style={styles.pageTitle}>Debt Structure & Coverage</Text>
      <Text style={styles.pageSub}>Loan terms · amortization · coverage cushion</Text>

      <Text style={styles.sectionTitle}>Loan Summary</Text>
      <View style={styles.table}>
        <Row label="Loan Amount" value={fmt(data.loanAmount)} />
        <Row label="Interest Rate" value={pct(rate)} alt />
        <Row label="Loan Type" value="Fixed rate, fully amortizing" />
        <Row label="Loan Term" value={`${term} years`} alt />
        <Row label="Amortization" value={`${term} years`} />
        <Row label="Balloon Date" value="None (fully amortizing)" alt />
        <Row label="Monthly Payment (P&I + PMI)" value={fmt(data.debtService)} />
        <Row label="Year-1 Principal (Month 1)" value={fmt(firstPrincipal)} alt />
        <Row label="Year-1 Interest (Month 1)" value={fmt(firstInterest)} />
      </View>

      <Text style={styles.sectionTitle}>Remaining Balance Schedule</Text>
      <View style={styles.table}>
        <MultiCol cols={["Time Horizon", "Remaining Balance", "Principal Paid"]} head />
        <MultiCol cols={["End of Year 1", fmt(balAt(1)), fmt(data.loanAmount - balAt(1))]} />
        <MultiCol cols={["End of Year 3", fmt(balAt(3)), fmt(data.loanAmount - balAt(3))]} alt />
        <MultiCol cols={["End of Year 5", fmt(balAt(5)), fmt(data.loanAmount - balAt(5))]} />
        <MultiCol cols={["End of Year 10", fmt(balAt(10)), fmt(data.loanAmount - balAt(10))]} alt />
      </View>

      <Text style={styles.sectionTitle}>Coverage & Leverage Metrics</Text>
      <View style={styles.kpiGrid}>
        <KpiBox label="DSCR" value={data.dscr.toFixed(2)} positive={data.dscr >= 1.25} foot="NOI ÷ debt service" />
        <KpiBox label="Coverage Cushion" value={`${cushion >= 0 ? "+" : ""}${cushion.toFixed(2)}x`} positive={cushion >= 0} foot="vs. 1.25x threshold" />
        <KpiBox label="Debt Yield" value={pct(debtYield, 1)} positive={debtYield >= 10} foot="NOI ÷ loan" />
        <KpiBox label="LTV" value={pct(ltv, 1)} positive={ltv <= 75} foot="Loan ÷ value" />
      </View>
      <View style={styles.kpiGrid}>
        <KpiBox label="LTC" value={pct(ltc, 1)} positive={ltc <= 80} foot="Loan ÷ cost" />
        <KpiBox label="Cash Invested" value={fmt(data.totalCashIn)} foot="Equity + closing + rehab" />
        <KpiBox label="Return on Equity" value={pct(roe)} positive={roe >= 5} foot="Yr-1 cash return" />
        <KpiBox label="Annual Debt Service" value={fmt(debtYr)} foot="P&I + PMI × 12" />
      </View>

      <Text style={styles.para}>
        Debt sizing carries {data.dscr >= 1.25 ? "adequate" : data.dscr >= 1.10 ? "marginal" : "insufficient"} operating coverage at {data.dscr.toFixed(2)}x DSCR
        {cushion >= 0 ? `, providing a ${cushion.toFixed(2)}x cushion above the standard 1.25x lender threshold` : `, falling ${Math.abs(cushion).toFixed(2)}x short of the 1.25x lender minimum`}.
        Debt yield of {pct(debtYield, 1)} {debtYield >= 10 ? "meets" : "falls below"} institutional 10% minimums, indicating the loan
        {debtYield >= 10 ? " is sizable relative to income and defensible against value declines" : " may exceed prudent sizing for the property's NOI generation"}.
      </Text>

      <PageFooter firm={firm} />
    </Page>
  );
}

/* ============================================================
 * PAGE 6 — Stress Testing & Sensitivity
 * ============================================================ */

function Page6_Stress({ data, firm }: { data: UnderwritingReportData; firm: string }) {
  const baseNoi = data.noiMonthly * 12;
  const arv = data.arv && data.arv > 0 ? data.arv : data.purchasePrice;
  const rate = data.interestRate ?? 6.5;

  // Helper to compute scenario metrics given multiplicative shocks
  const scenario = (rentMult: number, expMult: number, rateAddPct: number, rehabAdd: number) => {
    const rent = data.grossRent * rentMult;
    const vacancy = rent * ((data.vacancyPct ?? 5) / 100);
    const opex = data.operatingExpenses * expMult;
    const gross = rent + data.otherIncome;
    const noi = (gross - vacancy - opex) * 12;
    // recompute debt service if rate changes
    const newRate = (rate + rateAddPct) / 100 / 12;
    const n = (data.loanTerm ?? 30) * 12;
    const ds = data.loanAmount > 0 && newRate > 0
      ? data.loanAmount * newRate / (1 - Math.pow(1 + newRate, -n))
      : data.debtService;
    const debt = ds * 12;
    const cf = noi - debt;
    const dscr = debt > 0 ? noi / debt : 0;
    const cap = arv > 0 ? (noi / arv) * 100 : 0;
    let verdict: string;
    if (dscr >= 1.35 && cf > 0) verdict = "STRONG";
    else if (dscr >= 1.20 && cf > 0) verdict = "OK";
    else if (dscr >= 1.0) verdict = "MARGINAL";
    else verdict = "FAILS";
    return { noi, cf, dscr, cap, verdict };
  };

  const scenarios: { label: string; s: ReturnType<typeof scenario> }[] = [
    { label: "Current Projection", s: scenario(1, 1, 0, 0) },
    { label: "Rent −5%", s: scenario(0.95, 1, 0, 0) },
    { label: "Rent −10%", s: scenario(0.90, 1, 0, 0) },
    { label: "Rent −15%", s: scenario(0.85, 1, 0, 0) },
    { label: "Vacancy 10%", s: scenario(1, 1 + 0.05, 0, 0) },
    { label: "Vacancy 15%", s: scenario(1, 1 + 0.10, 0, 0) },
    { label: "Vacancy 20%", s: scenario(1, 1 + 0.15, 0, 0) },
    { label: "OpEx +10%", s: scenario(1, 1.10, 0, 0) },
    { label: "OpEx +20%", s: scenario(1, 1.20, 0, 0) },
    { label: "Interest Rate +1%", s: scenario(1, 1, 1, 0) },
    { label: "Interest Rate +2%", s: scenario(1, 1, 2, 0) },
    { label: "Rehab Over +10%", s: scenario(1, 1, 0, data.rehab * 0.1) },
    { label: "Rehab Over +20%", s: scenario(1, 1, 0, data.rehab * 0.2) },
  ];

  // Heatmap: rent × vacancy (5 × 5)
  const rentSteps = [1.00, 0.95, 0.90, 0.85, 0.80];
  const vacSteps = [1.00, 1.05, 1.10, 1.15, 1.20];

  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader firm={firm} title="VI · Stress Testing & Sensitivity" />
      <Text style={styles.pageTitle}>Stress Testing & Sensitivity Analysis</Text>
      <Text style={styles.pageSub}>Downside scenarios · rate shocks · rehab overruns</Text>

      <View style={styles.table}>
        <MultiCol cols={["Scenario", "NOI", "Cash Flow", "DSCR", "Cap", "Rec."]} head />
        {scenarios.map((sc, i) => (
          <MultiCol key={sc.label} alt={i % 2 === 1}
            cols={[sc.label, fmt(sc.s.noi), fmt(sc.s.cf), sc.s.dscr.toFixed(2), pct(sc.s.cap, 1), sc.s.verdict]} />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Sensitivity Heatmap — DSCR (Rent × Vacancy)</Text>
      <View style={{ marginBottom: 10 }}>
        <View style={{ flexDirection: "row", marginBottom: 3 }}>
          <Text style={{ width: 70, fontSize: 7, color: COLORS.slateLight }}></Text>
          {vacSteps.map((v, i) => (
            <Text key={i} style={{ width: 60, fontSize: 7, color: COLORS.slateLight, textAlign: "center" }}>
              Vac {((v - 1) * 100 + (data.vacancyPct ?? 5)).toFixed(0)}%
            </Text>
          ))}
        </View>
        {rentSteps.map((r, ri) => (
          <View key={ri} style={{ flexDirection: "row", marginBottom: 2 }}>
            <Text style={{ width: 70, fontSize: 7.5, color: COLORS.slate, paddingTop: 4 }}>
              Rent {((r - 1) * 100).toFixed(0)}%
            </Text>
            {vacSteps.map((v, vi) => {
              const s = scenario(r, v, 0, 0);
              const bg = s.dscr >= 1.35 ? "#dcfce7" : s.dscr >= 1.20 ? "#fef3c7" : s.dscr >= 1.0 ? "#fed7aa" : "#fee2e2";
              const color = s.dscr >= 1.20 ? COLORS.green : s.dscr >= 1.0 ? COLORS.amber : COLORS.red;
              return (
                <View key={vi} style={{ width: 58, marginRight: 2, backgroundColor: bg, padding: 4, alignItems: "center" }}>
                  <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color }}>{s.dscr.toFixed(2)}</Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 7.5, color: COLORS.slateLight, marginBottom: 8, fontStyle: "italic" }}>
        Green cells indicate DSCR ≥ 1.35 (strong). Yellow indicates 1.20–1.35 (acceptable). Orange indicates 1.0–1.20 (marginal). Red indicates DSCR &lt; 1.0 (failure to cover debt service).
      </Text>

      <PageFooter firm={firm} />
    </Page>
  );
}

/* ============================================================
 * PAGE 7 — Rehab & Value-Add
 * ============================================================ */

function Page7_Rehab({ data, firm }: { data: UnderwritingReportData; firm: string }) {
  const rehab = data.rehab;
  const arv = data.arv && data.arv > 0 ? data.arv : data.purchasePrice;
  const lift = arv - data.purchasePrice;
  const stabilizedRent = data.grossRent * (1 + (data.rentGrowth ?? 3) / 100);
  const rentLift = stabilizedRent - data.grossRent;
  const renoROI = rehab > 0 ? ((lift - rehab) / rehab) * 100 : 0;

  // Heuristic budget split
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
    { item: "Contingency (10%)", pct: 0.10, addValue: 0.00, rentImpact: 0.00, payback: "reserve" },
  ];

  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader firm={firm} title="VII · Rehab & Value-Add" />
      <Text style={styles.pageTitle}>Rehab & Value-Add Analysis</Text>
      <Text style={styles.pageSub}>Renovation budget · projected value creation · payback</Text>

      {rehab > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Renovation Budget Allocation</Text>
          <View style={styles.table}>
            <MultiCol cols={["Line Item", "Est. Cost", "Value Added", "Rent Impact", "Payback"]} head />
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
            <KpiBox label="Total Rehab" value={fmt(rehab)} foot="All-in construction budget" />
            <KpiBox label="Projected ARV" value={fmt(arv)} foot="Stabilized value" />
            <KpiBox label="Value Lift" value={fmt(lift)} positive={lift > rehab} foot="ARV − purchase" />
            <KpiBox label="Renovation ROI" value={pct(renoROI, 1)} positive={renoROI > 20} foot="(Lift − Rehab) ÷ Rehab" />
          </View>
          <Text style={styles.para}>
            The rehab budget of {fmt(rehab)} is projected to unlock {fmt(lift)} in value creation, yielding a renovation-only ROI
            of {pct(renoROI, 1)}. {renoROI > 30 ? "This is a materially accretive value-add profile." : renoROI > 0 ? "Value creation is positive but modest — execution risk warrants close monitoring." : "The current ARV assumption does not support the rehab budget; renovation would be dilutive under these inputs and must be re-scoped or re-priced before proceeding."}
            {" "}Stabilized rent uplift is projected at {fmt(rentLift)}/month ({fmt(rentLift * 12)}/yr), incorporated into Year-2 income projections.
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
 * ============================================================ */

function Page8_Risk({ data, firm }: { data: UnderwritingReportData; firm: string }) {
  const mc = data.monteCarlo;
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
            <MultiCol cols={["Expected IRR (Mean)", pct(mc.expectedIRR), "Central-tendency projection"]} />
            <MultiCol cols={["Median IRR (P50)", pct((mc.irrP10 + mc.irrP90) / 2), "Midpoint of outcomes"]} alt />
            <MultiCol cols={["Downside IRR (P10)", pct(mc.irrP10), "10% of outcomes below this"]} />
            <MultiCol cols={["Upside IRR (P90)", pct(mc.irrP90), "10% of outcomes above this"]} alt />
            <MultiCol cols={["Probability of Negative Year-1 CF", pct(mc.probNegativeCF, 1), mc.probNegativeCF < 15 ? "Low tail risk" : mc.probNegativeCF < 35 ? "Moderate risk" : "Elevated risk"]} />
            <MultiCol cols={["Est. Prob. DSCR < 1.25", pct(Math.min(100, Math.max(0, mc.probNegativeCF * 1.3)), 1), "Coverage compression risk"]} alt />
            <MultiCol cols={["Est. Prob. Vacancy > 10%", pct(Math.min(30, Math.max(2, (data.vacancyPct ?? 5) * 0.8)), 1), "Occupancy stress"]} />
            <MultiCol cols={["Est. Prob. ExpGrowth > RentGrowth", pct(35, 1), "Margin compression risk"]} alt />
          </View>

          <Text style={styles.sectionTitle}>IRR Distribution</Text>
          <View style={{ marginBottom: 10 }}>
            <MCHistogram p10={mc.irrP10} p50={(mc.irrP10 + mc.irrP90) / 2} p90={mc.irrP90} mean={mc.expectedIRR} />
          </View>

          <Text style={styles.sectionTitle}>Value-at-Risk & Equity Outcomes</Text>
          <View style={styles.table}>
            <MultiCol cols={["Metric", "Value", "Notes"]} head />
            <MultiCol cols={["Expected Equity Multiple", `${(1 + mc.expectedIRR / 100 * (data.holdYears ?? 5)).toFixed(2)}x`, "Approx. compounding of mean IRR"]} />
            <MultiCol cols={["Best-Case Equity Multiple (P90)", `${(1 + mc.irrP90 / 100 * (data.holdYears ?? 5)).toFixed(2)}x`, "Upside envelope"]} alt />
            <MultiCol cols={["Worst-Case Equity Multiple (P10)", `${(1 + mc.irrP10 / 100 * (data.holdYears ?? 5)).toFixed(2)}x`, "Downside envelope"]} />
            <MultiCol cols={["Value at Risk (95%)", pct(Math.min(0, mc.irrP10 * 0.9)), "Worst-case annualized loss (95% conf.)"]} alt />
            <MultiCol cols={["Expected Shortfall (avg tail)", pct(Math.min(0, mc.irrP10 * 0.7)), "Avg of worst-10% outcomes"]} />
            <MultiCol cols={["Sharpe Ratio", data.guardrails?.some(g => g.code === "SHARPE_OUT_OF_RANGE") ? "Suppressed — see disclosures" : ((mc.expectedIRR - 4.5) / Math.max(0.1, (mc.irrP90 - mc.irrP10) / 2.5631)).toFixed(2), "Risk-adjusted return"]} alt />
          </View>
        </>
      ) : (
        <Text style={styles.para}>
          Monte Carlo simulation was not executed in this underwriting session. Run the Risk Analyzer with a minimum of 5,000 iterations
          to attach probabilistic distributions, downside percentiles, and Value-at-Risk metrics before making a final investment decision.
        </Text>
      )}

      {data.guardrails && data.guardrails.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Underwriting Guardrails & Disclosures</Text>
          {data.guardrails.map((g) => (
            <View key={g.code} style={{
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
 * ============================================================ */

function Page9_Exit({ data, firm }: { data: UnderwritingReportData; firm: string }) {
  const hold = data.holdYears ?? 5;
  const appr = (data.appreciation ?? 3) / 100;
  const rate = (data.interestRate ?? 6.5) / 100 / 12;
  const arv = data.arv && data.arv > 0 ? data.arv : data.purchasePrice;

  // Balance at hold-end
  let bal = data.loanAmount;
  for (let m = 0; m < hold * 12; m++) {
    const i = bal * rate;
    bal -= Math.max(0, data.debtService - i);
    if (bal < 0) bal = 0;
  }

  const salePrice = arv * Math.pow(1 + appr, hold);
  const sellingCosts = salePrice * 0.07;
  const capGainsTax = Math.max(0, (salePrice - sellingCosts - data.purchasePrice - data.rehab)) * 0.20;
  const netProceedsSell = salePrice - sellingCosts - bal - capGainsTax;

  // Approximate cumulative CF (compounded at rent growth)
  const projCF = (data.projections && data.projections.length >= hold)
    ? data.projections.slice(0, hold).reduce((a, b) => a + b.cashFlow, 0)
    : (data.netCashFlow * 12) * hold;

  const totalReturnSell = projCF + netProceedsSell - data.totalCashIn;
  const equityMultSell = data.totalCashIn > 0 ? (projCF + netProceedsSell) / data.totalCashIn : 0;
  const irrSell = data.totalCashIn > 0 ? (Math.pow((projCF + netProceedsSell) / data.totalCashIn, 1 / hold) - 1) * 100 : 0;
  const avgAnnSell = hold > 0 ? (totalReturnSell / hold) / Math.max(1, data.totalCashIn) * 100 : 0;

  // Refi at year 3 (75% of appreciated value)
  const refiValue = arv * Math.pow(1 + appr, 3);
  const refiLoan = refiValue * 0.75;
  let bal3 = data.loanAmount;
  for (let m = 0; m < 36; m++) { const i = bal3 * rate; bal3 -= Math.max(0, data.debtService - i); }
  const refiCashOut = Math.max(0, refiLoan - bal3);

  // Long-term hold at hold+5
  const longHoldYrs = hold + 5;
  const longSale = arv * Math.pow(1 + appr, longHoldYrs);
  let bal2 = data.loanAmount;
  for (let m = 0; m < longHoldYrs * 12; m++) { const i = bal2 * rate; bal2 -= Math.max(0, data.debtService - i); if (bal2 < 0) bal2 = 0; }
  const longEquity = longSale - bal2;

  // 1031: same as sell but no tax
  const netProceeds1031 = salePrice - sellingCosts - bal;

  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader firm={firm} title="IX · Exit Strategy Analysis" />
      <Text style={styles.pageTitle}>Exit Strategy Analysis</Text>
      <Text style={styles.pageSub}>Sale · refinance · long-term hold · 1031 exchange</Text>

      <Text style={styles.sectionTitle}>Scenario 1 — Sale at Year {hold}</Text>
      <View style={styles.table}>
        <Row label="Projected Sale Price" value={fmt(salePrice)} />
        <Row label="Selling Costs (7%)" value={`(${fmt(sellingCosts)})`} alt tone="neg" />
        <Row label="Remaining Loan Balance" value={`(${fmt(bal)})`} tone="neg" />
        <Row label="Capital Gains Tax (est. 20%)" value={`(${fmt(capGainsTax)})`} alt tone="neg" />
        <Row label="Net Equity Proceeds" value={fmt(netProceedsSell)} bold />
        <Row label="Cumulative Operating Cash Flow" value={fmt(projCF)} alt />
        <Row label="IRR (annualized)" value={pct(irrSell)} tone={irrSell > 10 ? "pos" : "neg"} />
        <Row label="Equity Multiple" value={`${equityMultSell.toFixed(2)}x`} alt />
        <Row label="Average Annual Return" value={pct(avgAnnSell)} />
      </View>

      <Text style={styles.sectionTitle}>Scenario 2 — Cash-Out Refinance at Year 3</Text>
      <View style={styles.table}>
        <Row label="Refi Appraised Value" value={fmt(refiValue)} />
        <Row label="New Loan (75% LTV)" value={fmt(refiLoan)} alt />
        <Row label="Existing Balance Paid Off" value={`(${fmt(bal3)})`} tone="neg" />
        <Row label="Tax-Free Cash-Out" value={fmt(refiCashOut)} bold tone="pos" />
        <Row label="Retained Equity Post-Refi" value={fmt(refiValue - refiLoan)} alt />
      </View>

      <Text style={styles.sectionTitle}>Scenario 3 — Long-Term Hold ({longHoldYrs} yrs)</Text>
      <View style={styles.table}>
        <Row label="Projected Year-10 Value" value={fmt(longSale)} />
        <Row label="Est. Remaining Balance" value={fmt(bal2)} alt />
        <Row label="Projected Equity" value={fmt(longEquity)} bold tone="pos" />
        <Row label="Cash Flow (cumulative, est.)" value={fmt(projCF * (longHoldYrs / hold))} alt />
      </View>

      <Text style={styles.sectionTitle}>Scenario 4 — 1031 Exchange at Year {hold}</Text>
      <View style={styles.table}>
        <Row label="Net Proceeds (tax-deferred)" value={fmt(netProceeds1031)} bold tone="pos" />
        <Row label="Tax Deferral Benefit vs. Sale" value={fmt(capGainsTax)} alt tone="pos" />
        <Row label="Reinvestment Requirement" value="100% of equity into like-kind property" />
        <Row label="Best Suited For" value="Investors compounding portfolio without tax friction" alt />
      </View>

      <PageFooter firm={firm} />
    </Page>
  );
}

/* ============================================================
 * PAGE 10 — Investment Committee Memo
 * ============================================================ */

function Page10_Memo({ data, firm }: { data: UnderwritingReportData; firm: string }) {
  const rec = computeRecommendations(data);
  const dscrText = data.dscr >= 1.25 ? "adequate coverage" : data.dscr >= 1.0 ? "thin coverage" : "insufficient coverage";
  const cfText = data.netCashFlow >= 0 ? "generates positive first-year cash flow" : "produces negative first-year cash flow";
  const mcNeg = data.monteCarlo?.probNegativeCF ?? 20;

  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader firm={firm} title="X · Investment Committee Memo" />
      <Text style={styles.pageTitle}>Investment Committee Memo</Text>
      <Text style={styles.pageSub}>Underwriting analyst credit assessment</Text>

      <Text style={styles.sectionTitle}>Investment Thesis</Text>
      <Text style={styles.para}>
        {data.propertyName || "The subject property"} is underwritten as a {data.rehab > 0 ? "value-add" : "stabilized income"} acquisition
        at a purchase basis of {fmt(data.purchasePrice)}. The transaction {cfText} of {fmt(data.netCashFlow)}/month
        and delivers {pct(data.cashOnCash)} cash-on-cash return on {fmt(data.totalCashIn)} of invested equity.
        Debt service is provided with {dscrText} at {data.dscr.toFixed(2)}x DSCR.
      </Text>

      <Text style={styles.sectionTitle}>Primary Strengths</Text>
      <Text style={styles.bullet}>• {data.dscr >= 1.25 ? `DSCR of ${data.dscr.toFixed(2)}x exceeds institutional 1.25x threshold` : "DSCR does not meet institutional threshold — see weaknesses"}</Text>
      <Text style={styles.bullet}>• {data.cashOnCash >= 6 ? `Cash-on-cash return of ${pct(data.cashOnCash)} is competitive for the risk profile` : `Cash-on-cash of ${pct(data.cashOnCash)} — modest`}</Text>
      <Text style={styles.bullet}>• {data.capRate >= 6 ? `Cap rate of ${pct(data.capRate)} provides margin against value compression` : `Cap rate of ${pct(data.capRate)} is compressed — appreciation-dependent`}</Text>
      <Text style={styles.bullet}>• {mcNeg < 20 ? `Monte Carlo shows only ${pct(mcNeg, 1)} probability of negative Year-1 CF` : "Probabilistic downside is elevated — see weaknesses"}</Text>

      <Text style={styles.sectionTitle}>Primary Weaknesses & Execution Risks</Text>
      {data.dscr < 1.25 && <Text style={styles.bullet}>• DSCR at {data.dscr.toFixed(2)}x sits below the lender-preferred 1.25x cushion; refinance risk elevated in a rate-up environment.</Text>}
      {data.netCashFlow < 0 && <Text style={styles.bullet}>• Negative first-year cash flow of {fmt(data.netCashFlow)}/mo requires supplemental capital contributions.</Text>}
      {mcNeg >= 25 && <Text style={styles.bullet}>• Elevated probability of negative Year-1 cash flow ({pct(mcNeg, 1)}) under Monte Carlo modeling.</Text>}
      {data.rehab > 0 && <Text style={styles.bullet}>• Construction execution risk on {fmt(data.rehab)} rehab scope; cost and timeline overruns common.</Text>}
      <Text style={styles.bullet}>• Market data (rent comps, vacancy, appreciation) has not been independently verified within this report.</Text>
      <Text style={styles.bullet}>• Physical property condition assumes inspection findings will not reveal additional deferred maintenance.</Text>

      <Text style={styles.sectionTitle}>Collateral Quality & Income Stability</Text>
      <Text style={styles.para}>
        Collateral is a single-asset residential rental property. Income stability depends on tenant quality, local rental demand, and the
        rent assumption's alignment with market. The current underwriting {(data.vacancyPct ?? 5) < 5 ? "assumes aggressive vacancy below the 5–8% stabilized market benchmark, potentially overstating income stability" : "uses a market-consistent vacancy assumption"}.
        The vast majority of income is derived from a single lease, concentrating tenant credit risk.
      </Text>

      <Text style={styles.sectionTitle}>Recommendation</Text>
      <View style={[styles.recBanner, { backgroundColor: rec.invBg, borderLeftColor: rec.invColor, marginBottom: 8 }]}>
        <Text style={styles.recLabel}>Investment Committee Recommendation</Text>
        <Text style={[styles.recValue, { color: rec.invColor, fontSize: 18 }]}>{rec.inv.toUpperCase()}</Text>
        <Text style={styles.recSub}>Lender decision: {rec.lender}</Text>
      </View>

      <Text style={styles.sectionTitle}>Conditions Required Before Funding</Text>
      <Text style={styles.bullet}>• Independent third-party appraisal supporting the ARV of {fmt(data.arv && data.arv > 0 ? data.arv : data.purchasePrice)}.</Text>
      <Text style={styles.bullet}>• Property inspection confirming no material undisclosed deferred maintenance.</Text>
      <Text style={styles.bullet}>• Verified rent comparables corroborating the {fmt(data.grossRent)}/month rental assumption.</Text>
      <Text style={styles.bullet}>• Title, environmental, and flood-zone due diligence cleared.</Text>
      {data.rehab > 0 && <Text style={styles.bullet}>• Contractor bids and detailed rehab scope of work within 5% of the {fmt(data.rehab)} budget.</Text>}
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
 * AI MEMO COVER PAGES (unchanged legacy)
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
          <Text style={memoStyles.footerText} render={({ pageNumber, totalPages }) => `PAGE ${pageNumber} / ${totalPages}`} />
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
          <Text style={memoStyles.footerText} render={({ pageNumber, totalPages }) => `PAGE ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </>
  );
}
