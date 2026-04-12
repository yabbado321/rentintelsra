import { useState } from "react";
import AppLayout, { type Page } from "@/components/AppLayout";
import HomePage from "./HomePage";
import ZipLookupPage from "./ZipLookupPage";
import DealAnalyzerPage from "./DealAnalyzerPage";
import ROITaxesPage from "./ROITaxesPage";
import ComparisonPage from "./ComparisonPage";
import AdvancedToolsPage from "./AdvancedToolsPage";
import HelpLegalPage from "./HelpLegalPage";

export default function Index() {
  const [page, setPage] = useState<Page>("home");

  const renderPage = () => {
    switch (page) {
      case "home": return <HomePage onNavigate={(p) => setPage(p as Page)} />;
      case "zip": return <ZipLookupPage />;
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
      {renderPage()}
    </AppLayout>
  );
}
