export default function HelpLegalPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">📖 Help & Legal</h1>
        <p className="text-muted-foreground mt-1">Glossary, methodology, and legal information.</p>
      </div>

      {/* Glossary */}
      <Section title="📊 Returns & Performance Metrics">
        <Glossary items={[
          { term: "ROI (Return on Investment)", def: "Annual return as a percentage of total cash invested. Higher = better performance." },
          { term: "Cash-on-Cash Return (CoC)", def: "Annual pre-tax cash flow ÷ total cash invested. Focuses on actual cash returns." },
          { term: "Cap Rate", def: "NOI ÷ Property Value. Measures unlevered yield independent of financing." },
          { term: "NOI (Net Operating Income)", def: "Gross income minus operating expenses, before debt service and taxes." },
          { term: "Gross Operating Income (GOI)", def: "Gross potential rent minus vacancy and credit loss." },
          { term: "Effective Gross Income (EGI)", def: "GOI plus other income (laundry, parking, pet, storage)." },
          { term: "IRR (Internal Rate of Return)", def: "Time-weighted return across all cash flows including sale. Accounts for time value of money." },
          { term: "Equity Multiple (EM)", def: "Total dollars returned ÷ total dollars invested. >2.0x is strong over a 5–10 yr hold." },
          { term: "Yield on Cost (YoC)", def: "Stabilized NOI ÷ total project cost. Critical for BRRRR/development underwriting." },
          { term: "Total Return", def: "Cash flow + principal paydown + appreciation + tax benefits over hold." },
          { term: "Annualized Return", def: "Geometric average yearly return — smooths multi-year performance into one number." },
        ]} />
      </Section>

      <Section title="💵 Cash Flow & Underwriting">
        <Glossary items={[
          { term: "PITI", def: "Principal, Interest, Taxes, Insurance — the four parts of a typical mortgage payment." },
          { term: "PITIA", def: "PITI plus Association dues (HOA)." },
          { term: "OpEx (Operating Expenses)", def: "Tax, insurance, HOA, management, maintenance, CapEx, utilities, vacancy." },
          { term: "CapEx (Capital Expenditures)", def: "Big-ticket replacements (roof, HVAC, water heater) reserved as a % of rent." },
          { term: "Vacancy Rate", def: "% of the year a unit sits empty. Typical underwriting: 5–8%." },
          { term: "Other Income", def: "Pet rent, parking, laundry, storage, late fees — often 1–3% of gross rent." },
          { term: "1% Rule", def: "Monthly rent ≥ 1% of purchase price. Quick screening test, not a guarantee." },
          { term: "2% Rule", def: "Monthly rent ≥ 2% of purchase price. Rare; usually only in distressed markets." },
          { term: "50% Rule", def: "Assume 50% of gross rent goes to non-mortgage expenses. Coarse but conservative." },
          { term: "70% Rule (Flip)", def: "Max purchase = 70% × ARV − rehab. Standard flip underwriting heuristic." },
          { term: "GRM (Gross Rent Multiplier)", def: "Price ÷ annual gross rent. Lower = better. Useful for quick comp screening." },
          { term: "Break-Even Occupancy", def: "Occupancy % needed to cover PITI + OpEx. Below 80% is strong." },
        ]} />
      </Section>

      <Section title="🏦 Financing & Leverage">
        <Glossary items={[
          { term: "DSCR (Debt Service Coverage Ratio)", def: "NOI ÷ annual debt service. ≥1.25 required by most commercial lenders." },
          { term: "LTV (Loan-to-Value)", def: "Loan amount ÷ property value. Lower = less leverage and less risk." },
          { term: "LTC (Loan-to-Cost)", def: "Loan ÷ total project cost (purchase + rehab). Common in construction/BRRRR." },
          { term: "ARV (After-Repair Value)", def: "Estimated value post-rehab. Drives BRRRR refinance and flip exit pricing." },
          { term: "Amortization", def: "Schedule by which principal is paid down over the loan term." },
          { term: "Points", def: "Upfront fee = 1% of loan per point. Buys down interest rate or covers origination." },
          { term: "PMI", def: "Private Mortgage Insurance — required when down payment is below 20% on conventional." },
          { term: "PMI Drop-Off", def: "PMI auto-cancels at 78% LTV based on original schedule." },
          { term: "Bridge Loan", def: "Short-term loan (6–24 mo) until permanent financing or sale." },
          { term: "Hard Money", def: "Asset-based short-term loan, high rate (10–14%) and points. Used for flips/BRRRR." },
          { term: "DSCR Loan", def: "Investor loan qualified by property cash flow, not personal income." },
          { term: "Portfolio Loan", def: "Loan held on the lender's books, often blanket-style across multiple properties." },
          { term: "IO Period", def: "Interest-Only period — no principal paid, payment stays low." },
          { term: "Refi (Cash-Out)", def: "Refinance and pull equity out as cash. Core BRRRR mechanic." },
          { term: "Seasoning", def: "Required hold period before lender will refinance at new value (typically 6–12 mo)." },
          { term: "Assumable Loan", def: "Buyer takes over seller's existing mortgage and rate. Huge value when rates rise." },
          { term: "Subject-To", def: "Buy a property 'subject to' the existing financing remaining in seller's name." },
        ]} />
      </Section>

      <Section title="🧾 Taxes, Depreciation & Exits">
        <Glossary items={[
          { term: "Depreciation", def: "Residential buildings deduct over 27.5 years; commercial over 39. Land does not depreciate." },
          { term: "Cost Segregation", def: "Engineering study that reclassifies components to 5/7/15-yr lives — front-loads deductions." },
          { term: "Bonus Depreciation", def: "First-year write-off on qualifying short-life assets. Phasing down through 2027." },
          { term: "Depreciation Recapture", def: "On sale, IRS reclaims prior depreciation at up to 25%." },
          { term: "Capital Gains (Long-Term)", def: "Held >1 yr: 0/15/20% rate depending on income bracket." },
          { term: "Capital Gains (Short-Term)", def: "Held ≤1 yr: taxed at ordinary income rates." },
          { term: "Adjusted Basis", def: "Purchase price + capital improvements − accumulated depreciation." },
          { term: "1031 Exchange", def: "Defer cap gains by reinvesting into like-kind property within 45/180-day windows." },
          { term: "Reverse 1031", def: "Buy the replacement property before selling the relinquished one." },
          { term: "Delaware Statutory Trust (DST)", def: "Fractional ownership that qualifies as 1031 replacement — passive exit." },
          { term: "Opportunity Zone (QOZ)", def: "Invest gains into designated zones to defer/reduce/eliminate cap gains." },
          { term: "Passive Activity Losses (PALs)", def: "Rental losses generally only offset passive income; carried forward otherwise." },
          { term: "REPS (Real Estate Professional Status)", def: "750+ hrs/yr unlocks unlimited active loss offset against W-2 income." },
          { term: "Short-Term Rental Loophole", def: "Avg stay ≤7 days + material participation = active losses without REPS." },
          { term: "Schedule E", def: "IRS form reporting rental income, expenses, depreciation." },
          { term: "Step-Up in Basis", def: "On death, heirs inherit at fair market value — capital gains wiped." },
        ]} />
      </Section>

      <Section title="🧠 Investment Strategies">
        <Glossary items={[
          { term: "Buy & Hold", def: "Long-term rental for cash flow, appreciation, debt paydown, and tax benefits." },
          { term: "BRRRR", def: "Buy → Rehab → Rent → Refinance → Repeat. Recycle capital to scale." },
          { term: "Fix & Flip", def: "Renovate and resell in 3–9 months. Active income, taxed as ordinary." },
          { term: "Wholesale", def: "Contract a property and assign the contract for a fee — no closing capital." },
          { term: "House Hack", def: "Owner-occupy 2–4 unit; rent other units. Qualifies for FHA 3.5% down." },
          { term: "Live-in Flip", def: "Renovate while occupying; sell after 2 yrs for §121 $250k/$500k cap-gain exclusion." },
          { term: "Short-Term Rental (STR)", def: "Airbnb/VRBO. Higher gross, higher OpEx, more management intensity." },
          { term: "Mid-Term Rental (MTR)", def: "30–90 day furnished stays — travel nurses, corporate relo. Less regulation than STR." },
          { term: "Section 8", def: "HUD voucher tenant. Guaranteed portion of rent; stricter inspections." },
          { term: "Turnkey", def: "Move-in-ready rental sold to passive investors, often with property mgmt in place." },
          { term: "Syndication", def: "Pool capital from LPs; GP operates the deal. Large-asset access for passive investors." },
          { term: "Value-Add", def: "Reposition (rehab, raise rents, cut costs) to lift NOI and force appreciation." },
          { term: "Forced Appreciation", def: "Increase value via NOI growth (commercial: value = NOI ÷ cap rate)." },
        ]} />
      </Section>

      <Section title="🏘️ Property Types & Classes">
        <Glossary items={[
          { term: "SFR (Single-Family Rental)", def: "1-unit detached. Easiest financing; tenants stay longer." },
          { term: "Multifamily (2–4)", def: "Residential financing applies. Sweet spot for house-hacking." },
          { term: "Multifamily (5+)", def: "Commercial loans, valued on NOI. Economies of scale." },
          { term: "Class A", def: "Newer (<10 yrs), top schools, high-income tenants. Low cash flow, high appreciation." },
          { term: "Class B", def: "10–30 yrs old, workforce neighborhoods. Balanced cash flow + appreciation." },
          { term: "Class C", def: "30+ yrs, blue-collar tenants. Strong cash flow, higher management load." },
          { term: "Class D", def: "Distressed neighborhoods. High vacancy & turnover; aggressive yields only." },
        ]} />
      </Section>

      <Section title="📑 Legal, Title & Entity">
        <Glossary items={[
          { term: "LLC (Limited Liability Company)", def: "Most common holding entity — liability shield + pass-through taxation." },
          { term: "Series LLC", def: "Parent LLC with isolated 'series' cells per property. Available in select states." },
          { term: "Title Insurance", def: "One-time premium protecting against unknown title defects." },
          { term: "Deed of Trust / Mortgage", def: "Recorded instrument securing the loan against the property." },
          { term: "Escrow", def: "Third party holds funds/docs until closing conditions are met." },
          { term: "Earnest Money", def: "Good-faith deposit (typically 1–3%) credited at closing." },
          { term: "Closing Costs", def: "Title, escrow, lender fees, recording, taxes — typically 2–5% of price." },
          { term: "Estoppel Certificate", def: "Tenant-signed doc confirming lease terms — required at multifamily closing." },
          { term: "Eviction Process", def: "Notice → court filing → judgment → writ. Timeline varies 30–180+ days by state." },
          { term: "Fair Housing Act", def: "Federal law prohibiting discrimination based on protected classes." },
        ]} />
      </Section>

      <Section title="📈 Market & Due Diligence">
        <Glossary items={[
          { term: "Comps (Comparables)", def: "Recently sold/leased similar properties used for value & rent benchmarking." },
          { term: "Rent Comps", def: "Active and leased comparable rentals — drives realistic rent estimates." },
          { term: "Days on Market (DOM)", def: "Median time listings take to go pending — gauges market velocity." },
          { term: "Absorption Rate", def: "Pace at which available inventory is sold/leased. Low = seller's market." },
          { term: "Months of Supply", def: "Active listings ÷ monthly sales pace. <4 = seller's; >6 = buyer's." },
          { term: "Price-to-Rent Ratio", def: "Median price ÷ annual rent. <15 favors buy; >20 favors rent." },
          { term: "Population & Job Growth", def: "Leading indicators for rent growth and appreciation." },
          { term: "Median Household Income", def: "Anchor for sustainable rent: rent should be ≤30% of MHI/12." },
          { term: "Inspection", def: "Pro walkthrough identifying defects, life-safety, and deferred maintenance." },
          { term: "Appraisal", def: "Licensed valuation required by the lender." },
          { term: "Survey", def: "Boundary, encroachment, easement map. Critical on land/multifamily." },
          { term: "Phase I ESA", def: "Environmental site assessment — required on commercial deals." },
        ]} />
      </Section>

      <Section title="🛠️ Operations & Property Management">
        <Glossary items={[
          { term: "Property Management Fee", def: "Typically 8–10% of collected rent + leasing fee." },
          { term: "Leasing Fee", def: "One-time charge per new tenant placement: 50–100% of one month's rent." },
          { term: "Turnover Cost", def: "Make-ready + vacancy + leasing — often $1,500–$5,000 per turn." },
          { term: "Rent Roll", def: "Schedule of all units, tenants, rents, lease end dates." },
          { term: "T-12 / T-3", def: "Trailing 12-month / trailing 3-month operating statements — core DD docs." },
          { term: "Pro Forma", def: "Forward-looking projected financials. Always stress-test vs T-12 actuals." },
          { term: "GP / LP", def: "General Partner (operator) vs Limited Partner (passive investor) in a syndication." },
          { term: "Preferred Return (Pref)", def: "LPs receive X% before GP gets promote. Typical: 7–8%." },
          { term: "Waterfall", def: "Tiered cash-flow split between GP and LPs above the pref." },
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
