import { useState } from "react";
import { Home, MapPin, BarChart3, TrendingUp, GitCompare, LineChart, BookOpen, Menu, X, Mail } from "lucide-react";

type Page = "home" | "zip" | "deal" | "roi" | "comparison" | "advanced" | "help";

const NAV_ITEMS: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: "home", label: "Home", icon: <Home size={18} /> },
  { id: "zip", label: "ZIP Lookup", icon: <MapPin size={18} /> },
  { id: "deal", label: "Deal Analyzer", icon: <BarChart3 size={18} /> },
  { id: "roi", label: "ROI & Taxes", icon: <TrendingUp size={18} /> },
  { id: "comparison", label: "Comparison", icon: <GitCompare size={18} /> },
  { id: "advanced", label: "Advanced Tools", icon: <LineChart size={18} /> },
  { id: "help", label: "Help & Legal", icon: <BookOpen size={18} /> },
];

interface AppLayoutProps {
  activePage: Page;
  onPageChange: (page: Page) => void;
  children: React.ReactNode;
}

export default function AppLayout({ activePage, onPageChange, children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-sidebar border-r border-sidebar-border
        flex flex-col transition-transform duration-300
        lg:translate-x-0 lg:static lg:z-auto
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="p-6 border-b border-sidebar-border">
          <div className="text-center">
            <div className="text-xl font-bold text-foreground tracking-tight">🏡 RentIntel</div>
            <p className="text-xs text-muted-foreground mt-1">Smart Rental Analyzer</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => { onPageChange(item.id); setSidebarOpen(false); }}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-200
                ${activePage === item.id
                  ? "bg-primary text-primary-foreground glow-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }
              `}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <a href="mailto:smart-rental-analyzer@outlook.com" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Mail size={14} />
            Contact Support
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-background/80 backdrop-blur-lg border-b border-border lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-secondary">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="font-semibold text-sm">RentIntel</span>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}

export type { Page };
