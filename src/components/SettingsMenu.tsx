import { useEffect, useRef, useState } from "react";
import { Settings, Check, Palette, Type, Gauge, Sparkles } from "lucide-react";
import { useSessionState } from "@/hooks/useSessionState";

type ThemeKey = "iris" | "noir" | "emerald" | "slate";
type DensityKey = "comfortable" | "compact";

const THEMES: Record<ThemeKey, { label: string; swatches: string[]; vars: Record<string, string> }> = {
  iris: {
    label: "Iris",
    swatches: ["#7c3aed", "#4f46e5", "#3b82f6"],
    vars: {
      "--background": "232 45% 4%",
      "--card": "230 40% 8%",
      "--popover": "230 40% 8%",
      "--primary": "258 90% 66%",
      "--primary-glow": "220 95% 68%",
      "--accent": "220 95% 64%",
      "--ring": "258 90% 66%",
      "--sidebar-background": "232 50% 3%",
      "--sidebar-primary": "258 90% 66%",
      "--gradient-primary": "linear-gradient(135deg, hsl(258 90% 66%) 0%, hsl(238 90% 64%) 50%, hsl(220 95% 64%) 100%)",
      "--shadow-elegant": "0 20px 60px -20px hsl(258 90% 50% / 0.45)",
      "--glow-primary": "0 0 28px hsl(258 90% 66% / 0.28)",
    },
  },
  noir: {
    label: "Noir & Gold",
    swatches: ["#0d0d0d", "#c9a84c", "#e9c97a"],
    vars: {
      "--background": "0 0% 5%",
      "--card": "0 0% 8%",
      "--popover": "0 0% 8%",
      "--primary": "42 65% 54%",
      "--primary-glow": "42 75% 64%",
      "--accent": "42 70% 60%",
      "--ring": "42 65% 54%",
      "--sidebar-background": "0 0% 4%",
      "--sidebar-primary": "42 65% 54%",
      "--gradient-primary": "linear-gradient(135deg, hsl(42 65% 54%) 0%, hsl(38 70% 58%) 50%, hsl(42 75% 64%) 100%)",
      "--shadow-elegant": "0 20px 60px -20px hsl(42 65% 40% / 0.45)",
      "--glow-primary": "0 0 28px hsl(42 65% 54% / 0.28)",
    },
  },
  emerald: {
    label: "Emerald",
    swatches: ["#064e3b", "#10b981", "#34d399"],
    vars: {
      "--background": "160 35% 5%",
      "--card": "160 30% 9%",
      "--popover": "160 30% 9%",
      "--primary": "160 75% 42%",
      "--primary-glow": "158 80% 56%",
      "--accent": "158 80% 50%",
      "--ring": "160 75% 42%",
      "--sidebar-background": "160 40% 4%",
      "--sidebar-primary": "160 75% 42%",
      "--gradient-primary": "linear-gradient(135deg, hsl(160 75% 42%) 0%, hsl(158 80% 48%) 50%, hsl(158 80% 56%) 100%)",
      "--shadow-elegant": "0 20px 60px -20px hsl(160 75% 30% / 0.45)",
      "--glow-primary": "0 0 28px hsl(160 75% 42% / 0.28)",
    },
  },
  slate: {
    label: "Slate & Steel",
    swatches: ["#1e293b", "#64748b", "#94a3b8"],
    vars: {
      "--background": "222 25% 6%",
      "--card": "222 22% 10%",
      "--popover": "222 22% 10%",
      "--primary": "215 25% 60%",
      "--primary-glow": "215 30% 72%",
      "--accent": "215 30% 68%",
      "--ring": "215 25% 60%",
      "--sidebar-background": "222 28% 5%",
      "--sidebar-primary": "215 25% 60%",
      "--gradient-primary": "linear-gradient(135deg, hsl(215 25% 50%) 0%, hsl(215 28% 60%) 50%, hsl(215 30% 72%) 100%)",
      "--shadow-elegant": "0 20px 60px -20px hsl(215 25% 30% / 0.45)",
      "--glow-primary": "0 0 28px hsl(215 25% 60% / 0.28)",
    },
  },
};

function applyTheme(key: ThemeKey) {
  const root = document.documentElement;
  Object.entries(THEMES[key].vars).forEach(([k, v]) => root.style.setProperty(k, v));
}

function applyDensity(d: DensityKey) {
  document.documentElement.style.setProperty("--radius", d === "compact" ? "0.6rem" : "1rem");
  document.documentElement.dataset.density = d;
}

function applyMotion(reduced: boolean) {
  document.documentElement.dataset.reducedMotion = reduced ? "true" : "false";
  if (reduced) {
    document.documentElement.style.setProperty("scroll-behavior", "auto");
  }
}

export default function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useSessionState<ThemeKey>("settings.theme", "iris");
  const [density, setDensity] = useSessionState<DensityKey>("settings.density", "comfortable");
  const [reducedMotion, setReducedMotion] = useSessionState<boolean>("settings.reducedMotion", false);
  const [glow, setGlow] = useSessionState<boolean>("settings.glow", true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { applyTheme(theme); }, [theme]);
  useEffect(() => { applyDensity(density); }, [density]);
  useEffect(() => { applyMotion(reducedMotion); }, [reducedMotion]);
  useEffect(() => {
    document.documentElement.dataset.glow = glow ? "on" : "off";
    if (!glow) {
      document.documentElement.style.setProperty("--glow-primary", "0 0 0 transparent");
      document.documentElement.style.setProperty("--shadow-glow", "0 0 0 transparent");
    } else {
      document.documentElement.style.removeProperty("--shadow-glow");
      // re-apply theme to restore --glow-primary
      applyTheme(theme);
    }
  }, [glow, theme]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Settings"
        className="p-2 rounded-xl border border-border/70 bg-secondary/40 hover:bg-secondary/70 text-foreground transition-all hover:rotate-45 duration-300"
      >
        <Settings size={18} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 glass-strong rounded-2xl shadow-elegant z-50 animate-fade-in overflow-hidden">
          <div className="p-4 border-b border-border/70">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-primary" />
              <h3 className="font-display font-semibold text-sm">Preferences</h3>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Personalize your workspace</p>
          </div>

          <div className="p-4 space-y-5 max-h-[70vh] overflow-y-auto">
            <section>
              <div className="flex items-center gap-2 mb-2">
                <Palette size={13} className="text-muted-foreground" />
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Color theme</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(THEMES) as ThemeKey[]).map((k) => {
                  const t = THEMES[k];
                  const active = theme === k;
                  return (
                    <button
                      key={k}
                      onClick={() => setTheme(k)}
                      className={`group relative flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                        active ? "border-primary/60 bg-primary/10" : "border-border/60 hover:border-primary/40 bg-secondary/30"
                      }`}
                    >
                      <div className="flex -space-x-1">
                        {t.swatches.map((c, i) => (
                          <span key={i} className="w-4 h-4 rounded-full border border-background" style={{ background: c }} />
                        ))}
                      </div>
                      <span className="text-xs font-medium">{t.label}</span>
                      {active && <Check size={12} className="ml-auto text-primary" />}
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-2">
                <Gauge size={13} className="text-muted-foreground" />
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Density</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(["comfortable", "compact"] as DensityKey[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDensity(d)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all capitalize ${
                      density === d ? "border-primary/60 bg-primary/10 text-foreground" : "border-border/60 bg-secondary/30 hover:border-primary/40"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Type size={13} className="text-muted-foreground" />
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Experience</span>
              </div>
              <ToggleRow label="Reduced motion" hint="Minimize animations" value={reducedMotion} onChange={setReducedMotion} />
              <ToggleRow label="Ambient glow" hint="Decorative shadows & halos" value={glow} onChange={setGlow} />
            </section>
          </div>

          <div className="p-3 border-t border-border/70 bg-secondary/20">
            <p className="text-[10px] text-muted-foreground text-center">Settings save locally to this device.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-secondary/30 hover:border-primary/40 transition-all"
    >
      <div className="text-left">
        <div className="text-xs font-medium">{label}</div>
        {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
      </div>
      <span className={`relative w-9 h-5 rounded-full transition-colors ${value ? "bg-primary" : "bg-border"}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-background transition-all ${value ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}
