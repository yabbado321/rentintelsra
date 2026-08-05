import { useState } from "react";
import { Home, MapPin, BarChart3, TrendingUp, GitCompare, LineChart, BookOpen, Menu, X, Mail, LayoutDashboard, Wrench, MessageSquare } from "lucide-react";
import SettingsMenu from "./SettingsMenu";

export type Page = "home" | "dashboard" | "pricing" | "maintenance" | "comms" | "zip" | "deal" | "roi" | "comparison" | "advanced" | "help";

const NAV_GROUPS: { label?: string; items: { id: Page; label: string; icon: React.ReactNode }[] }[] = [
  { items: [{ id: "home", label: "Home", icon: <Home size={18} /> }] },
  {
    label: "Operate",
    items: [
      { id: "dashboard", label: "Portfolio", icon: <LayoutDashboard size={18} /> },
      { id: "pricing", label: "AI Pricing", icon: <TrendingUp size={18} /> },
      { id: "maintenance", label: "Maintenance", icon: <Wrench size={18} /> },
      { id: "comms", label: "Tenant Comms", icon: <MessageSquare size={18} /> },
    ],
  },
  {
    label: "Analyze",
    items: [
      { id: "zip", label: "ZIP Lookup", icon: <MapPin size={18} /> },
      { id: "deal", label: "Deal Analyzer", icon: <BarChart3 size={18} /> },
      { id: "roi", label: "ROI & Taxes", icon: <LineChart size={18} /> },
      { id: "comparison", label: "Comparison", icon: <GitCompare size={18} /> },
      { id: "advanced", label: "Advanced Tools", icon: <LineChart size={18} /> },
    ],
  },
  { items: [{ id: "help", label: "Help & Legal", icon: <BookOpen size={18} /> }] },
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
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-background/70 backdrop-blur-md lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-sidebar/90 backdrop-blur-xl border-r border-sidebar-border
        flex flex-col transition-transform duration-300
        lg:translate-x-0 lg:static lg:z-auto
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-lg shadow-elegant">🏡</div>
            <div>
              <div className="text-base font-bold tracking-tight gradient-text font-display">RentIntel</div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5">AI Operating System</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          {NAV_GROUPS.map((g, gi) => (
            <div key={gi} className="space-y-1">
              {g.label && <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-3 pt-2 pb-1">{g.label}</div>}
              {g.items.map((item) => {
                const active = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { onPageChange(item.id); setSidebarOpen(false); }}
                    className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden
                      ${active ? "text-primary-foreground shadow-elegant" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                  >
                    {active && <span className="absolute inset-0 gradient-primary -z-10" />}
                    <span className={active ? "" : "text-muted-foreground group-hover:text-primary transition-colors"}>{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <a href="mailto:smart-rental-analyzer@outlook.com" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors">
            <Mail size={14} /> Contact Support
          </a>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-background/70 backdrop-blur-xl border-b border-border lg:hidden">
          <button onClick={() => setSidebarOpen(true)} aria-label={sidebarOpen ? "Close menu" : "Open menu"} className="p-2 rounded-lg hover:bg-secondary">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="font-display font-semibold text-sm gradient-text">RentIntel</span>
          <div className="ml-auto"><SettingsMenu /></div>
        </header>

        <div className="hidden lg:flex sticky top-0 z-30 items-center justify-end px-10 py-3 bg-background/40 backdrop-blur-xl border-b border-border/50">
          <SettingsMenu />
        </div>

        <div className="p-4 md:p-10 max-w-7xl mx-auto animate-fade-in">{children}</div>
      </main>
    </div>
  );
}

export type { Page };
