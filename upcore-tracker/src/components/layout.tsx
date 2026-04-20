import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Activity, LayoutDashboard, Settings, Shield, Menu, X, Info, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

/* ─── Shared scan overlay ─────────────────────────────────────────── */
export interface ScanOverlayHandle {
  trigger: () => void;
}

function NavProgressBar({ active }: { active: boolean }) {
  const [barKey, setBarKey] = useState(0);
  useEffect(() => { if (active) setBarKey((k) => k + 1); }, [active]);
  if (barKey === 0) return null;
  return (
    <div
      key={barKey}
      className="nav-bar-active fixed top-16 left-0 right-0 z-[91] h-[2px] bg-primary origin-left"
    />
  );
}

interface ScanOverlayProps {
  visible: boolean;
  active: boolean;
  label?: string;
}

const BAR_COUNT = 9;

export function ScanOverlay({ visible, active, label = "Loading" }: ScanOverlayProps) {
  const [animKey, setAnimKey] = useState(0);
  useEffect(() => { if (active) setAnimKey((k) => k + 1); }, [active]);
  if (!visible) return null;

  const STAGGER   = 48;   // ms between each bar
  const BAR_DUR   = 280;  // ms each bar takes to slide in
  const allInMs   = (BAR_COUNT - 1) * STAGGER + BAR_DUR; // ~680ms

  return (
    <div
      className="fixed inset-0 z-[90] overflow-hidden"
      style={{
        opacity: active ? 1 : 0,
        transition: active ? "none" : "opacity 0.3s ease",
        pointerEvents: active ? "all" : "none",
      }}
    >
      {/* Armor plates */}
      {Array.from({ length: BAR_COUNT }).map((_, i) => {
        const fromLeft = i % 2 === 0;
        return (
          <div
            key={`${animKey}-${i}`}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: `${(i / BAR_COUNT) * 100}%`,
              height: `${100 / BAR_COUNT}%`,
              background: i % 2 === 0 ? "#000c15" : "#00090f",
              borderBottom: "1px solid rgba(0,200,255,0.07)",
              animation: `${fromLeft ? "plate-from-left" : "plate-from-right"} ${BAR_DUR}ms cubic-bezier(0.7,0,0.3,1) both`,
              animationDelay: `${i * STAGGER}ms`,
            }}
          />
        );
      })}

      {/* Neon center hairline — appears once all plates are in */}
      <div
        key={`${animKey}-line`}
        style={{
          position: "absolute",
          left: 0, right: 0, top: "50%",
          height: "1px",
          background: "hsl(199 100% 50% / 0.25)",
          boxShadow: "0 0 10px 3px hsl(199 100% 50% / 0.15)",
          animation: `plate-label-in 0.25s ease both`,
          animationDelay: `${allInMs}ms`,
        }}
      />

      {/* Corner accents */}
      <div key={`${animKey}-tl`} className="scan-bracket absolute top-4 left-4 w-7 h-7 border-t-[1.5px] border-l-[1.5px] border-primary/60" />
      <div key={`${animKey}-tr`} className="scan-bracket absolute top-4 right-4 w-7 h-7 border-t-[1.5px] border-r-[1.5px] border-primary/60" />
      <div key={`${animKey}-bl`} className="scan-bracket absolute bottom-4 left-4 w-7 h-7 border-b-[1.5px] border-l-[1.5px] border-primary/60" />
      <div key={`${animKey}-br`} className="scan-bracket absolute bottom-4 right-4 w-7 h-7 border-b-[1.5px] border-r-[1.5px] border-primary/60" />

      {/* Status label */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ pointerEvents: "none" }}
      >
        <span
          key={`${animKey}-label`}
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "9px",
            letterSpacing: "0.45em",
            textTransform: "uppercase",
            color: "hsl(199 100% 50% / 0.55)",
            animation: `plate-label-in 0.3s ease both`,
            animationDelay: `${allInMs + 40}ms`,
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

/* ─── Layout ──────────────────────────────────────────────────────── */
export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: "/",         label: "Command Center",  icon: Shield },
    { href: "/logs",     label: "Activity Logs",   icon: Activity },
    { href: "/overview", label: "Club Overview",   icon: LayoutDashboard },
    { href: "/stats",    label: "Stats",           icon: BarChart2 },
    { href: "/settings", label: "System Settings", icon: Settings },
    { href: "/about",    label: "About",           icon: Info },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      {/* Top nav — solid bg, no backdrop-filter */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#000000f0] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer group">
              <img
                src="/upcore-logo-nobg.png"
                alt="UPCore"
                className="h-9 w-9 object-contain"
                style={{ filter: "brightness(0) invert(1) drop-shadow(0 0 6px rgba(255,255,255,0.5))" }}
              />
              <div className="leading-none">
                <div className="font-display font-black text-white text-lg tracking-[0.15em] uppercase group-hover:text-primary transition-colors duration-200">
                  UPCORE
                </div>
                <div className="text-[9px] font-mono text-primary/80 tracking-[0.25em] uppercase">
                  Club Tracker
                </div>
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 text-sm font-medium tracking-wider uppercase cursor-pointer transition-all duration-200",
                      isActive
                        ? "text-white border-b-2 border-primary"
                        : "text-white/50 hover:text-white border-b-2 border-transparent"
                    )}
                  >
                    <item.icon className="w-3.5 h-3.5" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-primary/80">
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
              </span>
              LIVE
            </div>
            <button
              className="md:hidden text-white/70 hover:text-white transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-white/5 bg-black">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-6 py-3.5 text-sm font-medium tracking-wider uppercase cursor-pointer transition-colors border-l-2",
                      isActive
                        ? "text-white border-primary bg-white/5"
                        : "text-white/50 hover:text-white border-transparent"
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </header>

      <main className="flex-1 mt-16">{children}</main>
    </div>
  );
}
