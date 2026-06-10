import { useState } from "react";
import AppLayout, { type Page } from "@/components/AppLayout";
import PropertySelector from "@/components/PropertySelector";
import PropertySearch from "@/components/PropertySearch";
import HomePage from "./HomePage";
import ZipLookupPage from "./ZipLookupPage";
import DealAnalyzerPage from "./DealAnalyzerPage";
import ROITaxesPage from "./ROITaxesPage";
import ComparisonPage from "./ComparisonPage";
import AdvancedToolsPage from "./AdvancedToolsPage";
import HelpLegalPage from "./HelpLegalPage";
import PortfolioDashboardPage from "./PortfolioDashboardPage";
import PricingToolPage from "./PricingToolPage";
import MaintenancePage from "./MaintenancePage";
import CommsPage from "./CommsPage";

const CALCULATOR_PAGES: Page[] = ["deal", "roi", "comparison", "advanced"];

export default function Index() {
  const [page, setPage] = useState<Page>("home");

  const renderPage = () => {
    switch (page) {
      case "home": return <HomePage onNavigate={(p) => setPage(p as Page)} />;
      case "dashboard": return <PortfolioDashboardPage onNavigate={(p) => setPage(p as Page)} />;
      case "pricing": return <PricingToolPage />;
      case "maintenance": return <MaintenancePage />;
      case "comms": return <CommsPage />;
      case "zip": return <ZipLookupPage onNavigate={(p) => setPage(p as Page)} />;
      case "deal": return <DealAnalyzerPage />;
      case "roi": return <ROITaxesPage />;
      case "comparison": return <ComparisonPage />;
      case "advanced": return <AdvancedToolsPage />;
      case "help": return <HelpLegalPage />;
      default: return <HomePage onNavigate={(p) => setPage(p as Page)} />;
    }
  };

  return (
    <AppLayout activePage={page} onPageChange={setPage}>
      {CALCULATOR_PAGES.includes(page) && (
        <div className="mb-6 space-y-3">
          <PropertySelector />
          <PropertySearch />
        </div>
      )}
      {renderPage()}
    </AppLayout>
  );
}
