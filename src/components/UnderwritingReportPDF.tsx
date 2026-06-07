import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const COLORS = {
  navy: "#0f172a",
  slate: "#334155",
  slateLight: "#64748b",
  border: "#cbd5e1",
  surface: "#f1f5f9",
  white: "#ffffff",
  green: "#166534",
  red: "#991b1b",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: COLORS.navy,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.navy,
    marginBottom: 20,
  },
  brand: { fontSize: 16, fontFamily: "Helvetica-Bold", letterSpacing: 1, color: COLORS.navy },
  brandSub: { fontSize: 8, color: COLORS.slateLight, letterSpacing: 2, marginTop: 2 },
  headerRight: { fontSize: 9, color: COLORS.slate, textTransform: "uppercase", letterSpacing: 1.5 },

  propertyBlock: { marginBottom: 16 },
  propertyName: { fontSize: 18, fontFamily: "Helvetica-Bold", color: COLORS.navy },
  propertyMeta: { fontSize: 9, color: COLORS.slateLight, marginTop: 3 },

  kpiGrid: { flexDirection: "row", gap: 8, marginBottom: 22 },
  kpiBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.navy,
    padding: 12,
  },
  kpiLabel: { fontSize: 7, color: COLORS.slateLight, letterSpacing: 1.2, marginBottom: 6, textTransform: "uppercase" },
  kpiValue: { fontSize: 16, fontFamily: "Helvetica-Bold", color: COLORS.navy },
  kpiValuePos: { color: COLORS.green },
  kpiValueNeg: { color: COLORS.red },
  kpiFoot: { fontSize: 7, color: COLORS.slateLight, marginTop: 4 },

  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.navy,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  table: { marginBottom: 18 },
  row: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  rowAlt: { backgroundColor: COLORS.surface },
  rowHead: {
    backgroundColor: COLORS.navy,
    paddingVertical: 7,
    paddingHorizontal: 4,
    flexDirection: "row",
  },
  cell: { flex: 1, fontSize: 9, color: COLORS.slate },
  cellHead: { flex: 1, fontSize: 8, color: COLORS.white, fontFamily: "Helvetica-Bold", letterSpacing: 0.8, textTransform: "uppercase" },
  cellRight: { textAlign: "right", fontFamily: "Helvetica-Bold", color: COLORS.navy },
  cellRightPos: { color: COLORS.green },
  cellRightNeg: { color: COLORS.red },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 7, color: COLORS.slateLight, letterSpacing: 1 },
});

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v || 0);
const pct = (v: number, d = 2) => `${(v || 0).toFixed(d)}%`;

export interface UnderwritingReportData {
  propertyName: string;
  address?: string;
  preparedFor?: string;
  firmName?: string;
  // KPIs
  purchasePrice: number;
  cashOnCash: number; // %
  capRate: number;    // %
  dscr: number;
  // Capital stack
  downPayment: number;
  closingCosts: number;
  rehab: number;
  loanAmount: number;
  totalCashIn: number;
  // First year monthly cash flow
  grossRent: number;
  otherIncome: number;
  vacancy: number;
  operatingExpenses: number; // taxes + ins + hoa + mgmt + maint + capex
  noiMonthly: number;
  debtService: number;
  netCashFlow: number;
  // Monte Carlo
  monteCarlo?: {
    iterations: number;
    probNegativeCF: number; // %
    expectedIRR: number;    // %
    irrP10: number;
    irrP90: number;
  };
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

function Row({ label, value, alt, tone }: { label: string; value: string; alt?: boolean; tone?: "pos" | "neg" }) {
  return (
    <View style={[styles.row, alt && styles.rowAlt]}>
      <Text style={styles.cell}>{label}</Text>
      <Text style={[styles.cell, styles.cellRight, tone === "pos" && styles.cellRightPos, tone === "neg" && styles.cellRightNeg]}>
        {value}
      </Text>
    </View>
  );
}

export default function UnderwritingReportPDF({ data }: { data: UnderwritingReportData }) {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const firm = data.firmName || "RentIntel SRA";
  const mc = data.monteCarlo;

  return (
    <Document title={`${firm} — ${data.propertyName} Underwriting`} author={firm}>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.brand}>{firm}</Text>
            <Text style={styles.brandSub}>STRATEGIC REAL ASSETS</Text>
          </View>
          <Text style={styles.headerRight}>Executive Investment Underwriting</Text>
        </View>

        {/* Property block */}
        <View style={styles.propertyBlock}>
          <Text style={styles.propertyName}>{data.propertyName || "Untitled Deal"}</Text>
          <Text style={styles.propertyMeta}>
            {data.address ? `${data.address}  ·  ` : ""}Prepared {today}
            {data.preparedFor ? `  ·  For ${data.preparedFor}` : ""}
          </Text>
        </View>

        {/* KPI grid */}
        <View style={styles.kpiGrid}>
          <KpiBox label="Purchase Price" value={fmt(data.purchasePrice)} foot="Acquisition basis" />
          <KpiBox label="Cash-on-Cash" value={pct(data.cashOnCash)} positive={data.cashOnCash > 0}
            foot={`vs. ${fmt(data.totalCashIn)} cash in`} />
          <KpiBox label="Cap Rate" value={pct(data.capRate)} positive={data.capRate >= 5}
            foot="NOI ÷ Property Value" />
          <KpiBox label="DSCR" value={data.dscr.toFixed(2)} positive={data.dscr >= 1.25}
            foot={data.dscr >= 1.25 ? "Lender-qualified" : data.dscr >= 1.0 ? "Marginal" : "Below 1.0"} />
        </View>

        {/* Capital Stack */}
        <Text style={styles.sectionTitle}>Capital Stack &amp; Acquisition</Text>
        <View style={styles.table}>
          <View style={styles.rowHead}>
            <Text style={styles.cellHead}>Source / Use</Text>
            <Text style={[styles.cellHead, { textAlign: "right" }]}>Amount</Text>
          </View>
          <Row label="Down Payment" value={fmt(data.downPayment)} />
          <Row label="Closing Costs" value={fmt(data.closingCosts)} alt />
          <Row label="Rehab / CapEx at Acquisition" value={fmt(data.rehab)} />
          <Row label="Loan Amount" value={fmt(data.loanAmount)} alt />
          <Row label="Total Cash Required" value={fmt(data.totalCashIn)} />
        </View>

        {/* Monthly Cash Flow */}
        <Text style={styles.sectionTitle}>First-Year Monthly Cash Flow</Text>
        <View style={styles.table}>
          <View style={styles.rowHead}>
            <Text style={styles.cellHead}>Line Item</Text>
            <Text style={[styles.cellHead, { textAlign: "right" }]}>Monthly</Text>
          </View>
          <Row label="Gross Scheduled Rent" value={fmt(data.grossRent)} />
          <Row label="Other Income" value={fmt(data.otherIncome)} alt />
          <Row label="Less: Vacancy Allowance" value={`(${fmt(data.vacancy)})`} tone="neg" />
          <Row label="Operating Expenses (Tax, Ins, Mgmt, Maint, CapEx, HOA)" value={`(${fmt(data.operatingExpenses)})`} alt tone="neg" />
          <Row label="Net Operating Income" value={fmt(data.noiMonthly)} tone="pos" />
          <Row label="Debt Service (P&amp;I + PMI)" value={`(${fmt(data.debtService)})`} alt tone="neg" />
          <Row label="Net Cash Flow" value={fmt(data.netCashFlow)} tone={data.netCashFlow >= 0 ? "pos" : "neg"} />
        </View>

        {/* Monte Carlo */}
        <Text style={styles.sectionTitle}>Monte Carlo Risk Simulation</Text>
        {mc ? (
          <View style={styles.table}>
            <View style={styles.rowHead}>
              <Text style={styles.cellHead}>Risk Metric</Text>
              <Text style={[styles.cellHead, { textAlign: "right" }]}>Value</Text>
            </View>
            <Row label={`Iterations Modeled`} value={mc.iterations.toLocaleString()} />
            <Row label="Probability of Negative Year-1 Cash Flow" value={pct(mc.probNegativeCF, 1)} alt
              tone={mc.probNegativeCF < 15 ? "pos" : mc.probNegativeCF < 35 ? undefined : "neg"} />
            <Row label="Expected IRR (Mean)" value={pct(mc.expectedIRR)} tone="pos" />
            <Row label="Downside IRR (10th percentile)" value={pct(mc.irrP10)} alt tone={mc.irrP10 < 0 ? "neg" : undefined} />
            <Row label="Upside IRR (90th percentile)" value={pct(mc.irrP90)} tone="pos" />
          </View>
        ) : (
          <Text style={{ fontSize: 9, color: COLORS.slateLight, marginBottom: 18 }}>
            Monte Carlo simulation not executed in this session. Run the Risk Analyzer to attach probabilistic results.
          </Text>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {firm.toUpperCase()}  ·  CONFIDENTIAL — FOR DISCUSSION PURPOSES ONLY
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `PAGE ${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
