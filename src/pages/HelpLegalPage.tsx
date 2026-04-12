export default function HelpLegalPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">📖 Help & Legal</h1>
        <p className="text-muted-foreground mt-1">Glossary, methodology, and legal information.</p>
      </div>

      {/* Glossary */}
      <Section title="📊 Financial Metrics">
        <Glossary items={[
          { term: "ROI (Return on Investment)", def: "Annual return as a percentage of total cash invested. Higher = better performance." },
          { term: "Cap Rate", def: "Net Operating Income ÷ Property Value. Measures yield independent of financing." },
          { term: "Cash-on-Cash Return", def: "Annual pre-tax cash flow ÷ total cash invested. Focuses on actual cash returns." },
          { term: "DSCR", def: "Debt Service Coverage Ratio. NOI ÷ Annual Debt Service. Above 1.25 = healthy." },
          { term: "LTV", def: "Loan-to-Value ratio. Loan Amount ÷ Property Value. Lower = less leverage risk." },
          { term: "IRR", def: "Internal Rate of Return. Accounts for time value of money across all cash flows." },
          { term: "NOI", def: "Net Operating Income. Gross income minus operating expenses (excluding debt service)." },
        ]} />
      </Section>

      <Section title="🧾 Taxes & Write-Offs">
        <Glossary items={[
          { term: "Depreciation", def: "Residential properties depreciate over 27.5 years (building portion only)." },
          { term: "1031 Exchange", def: "Defer capital gains by reinvesting proceeds into a like-kind property." },
          { term: "Cost Segregation", def: "Accelerate depreciation by reclassifying building components." },
          { term: "Bonus Depreciation", def: "Additional first-year depreciation on qualifying assets." },
          { term: "Schedule E", def: "IRS form for reporting rental income and expenses." },
        ]} />
      </Section>

      <Section title="🧠 Strategy Terms">
        <Glossary items={[
          { term: "BRRRR", def: "Buy, Rehab, Rent, Refinance, Repeat — a popular wealth-building strategy." },
          { term: "Buy & Hold", def: "Long-term rentals for cash flow and appreciation." },
          { term: "Fix & Flip", def: "Renovate and resell quickly for profit." },
          { term: "House Hacking", def: "Live in part of the property, rent the rest." },
          { term: "Value-Add", def: "Improvements that increase NOI and property value." },
        ]} />
      </Section>

      <Section title="📉 Financing">
        <Glossary items={[
          { term: "Amortization", def: "How principal is paid down over the loan term." },
          { term: "PMI", def: "Private Mortgage Insurance — required when down payment is below 20%." },
          { term: "Bridge Loan", def: "Short-term financing until permanent loan or refinance." },
          { term: "IO Period", def: "Interest-Only period where no principal is paid." },
        ]} />
      </Section>

      {/* Methodology */}
      <div className="bg-card rounded-xl p-6 border border-border space-y-4">
        <h2 className="text-xl font-bold">📊 Data & Methodology</h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>All deal analyses are based on user-provided inputs. The app does not pull live market data.</p>
          <p><strong className="text-foreground">ROI, Cap Rate, Cash Flow</strong> follow standard real estate formulas.</p>
          <p><strong className="text-foreground">Multi-Year ROI</strong> includes appreciation, equity growth, and tax-adjusted cash flow.</p>
          <p><strong className="text-foreground">IRR</strong> accounts for timing of all cash flows including sale.</p>
          <p><strong className="text-foreground">Depreciation</strong> uses a 27.5-year schedule for residential (building only).</p>
          <p><strong className="text-foreground">Deal Score</strong> blends ROI, Cap Rate, and Cash Flow into a 0–100 scale.</p>
        </div>
      </div>

      {/* Privacy & Disclaimer */}
      <div className="bg-card rounded-xl p-6 border border-border space-y-4">
        <h2 className="text-xl font-bold">📄 Privacy & Disclaimer</h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>🔐 RentIntel does <strong className="text-foreground">not collect</strong> or store any personal information. All calculations are handled locally in your browser.</p>
          <p>⚠️ This application is for <strong className="text-foreground">educational and estimation purposes only</strong>. All outputs are simulations based on user inputs and are not guaranteed results.</p>
          <p>Always consult a licensed professional (CPA, agent, lender, attorney) before making investment decisions.</p>
        </div>
      </div>

      {/* Contact */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <h2 className="text-xl font-bold mb-3">📬 Contact</h2>
        <p className="text-sm text-muted-foreground">
          Questions? Email us at:{" "}
          <a href="mailto:smart-rental-analyzer@outlook.com" className="text-accent hover:underline">
            smart-rental-analyzer@outlook.com
          </a>
        </p>
      </div>

      <p className="text-xs text-muted-foreground text-center pb-8">
        © 2025 Jacob W. Klingman. RentIntel — Smart Rental Analyzer. All rights reserved.
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Glossary({ items }: { items: { term: string; def: string }[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.term} className="flex gap-3">
          <span className="text-primary mt-0.5">•</span>
          <div>
            <span className="text-sm font-medium text-foreground">{item.term}</span>
            <span className="text-sm text-muted-foreground"> — {item.def}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
