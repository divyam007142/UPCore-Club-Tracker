import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Activity, LayoutDashboard, Shield, X, Info, BarChart2, Trophy, Lock, LogIn, Search, Mail, Menu, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface LayoutProps {
  children: React.ReactNode;
}

export interface ScanOverlayHandle {
  trigger: () => void;
}

const BAR_COUNT = 9;

export function ScanOverlay({ visible, active, label = "Loading" }: { visible: boolean; active: boolean; label?: string }) {
  const [animKey, setAnimKey] = useState(0);
  useEffect(() => { if (active) setAnimKey((k) => k + 1); }, [active]);
  if (!visible) return null;

  const STAGGER = 48;
  const BAR_DUR = 280;
  const allInMs = (BAR_COUNT - 1) * STAGGER + BAR_DUR;

  return (
    <div
      className="fixed inset-0 z-[90] overflow-hidden"
      style={{
        opacity: active ? 1 : 0,
        transition: active ? "none" : "opacity 0.3s ease",
        pointerEvents: active ? "all" : "none",
      }}
    >
      {Array.from({ length: BAR_COUNT }).map((_, i) => {
        const fromLeft = i % 2 === 0;
        return (
          <div
            key={`${animKey}-${i}`}
            style={{
              position: "absolute",
              left: 0, right: 0,
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
      <div key={`${animKey}-tl`} className="scan-bracket absolute top-4 left-4 w-7 h-7 border-t-[1.5px] border-l-[1.5px] border-primary/60" />
      <div key={`${animKey}-tr`} className="scan-bracket absolute top-4 right-4 w-7 h-7 border-t-[1.5px] border-r-[1.5px] border-primary/60" />
      <div key={`${animKey}-bl`} className="scan-bracket absolute bottom-4 left-4 w-7 h-7 border-b-[1.5px] border-l-[1.5px] border-primary/60" />
      <div key={`${animKey}-br`} className="scan-bracket absolute bottom-4 right-4 w-7 h-7 border-b-[1.5px] border-r-[1.5px] border-primary/60" />
      <div className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: "none" }}>
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

function NavItem({
  href,
  label,
  icon: Icon,
  isActive,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <Link href={href}>
      <div
        onClick={onClick}
        className={cn(
          "relative flex items-center gap-1.5 px-3 h-16 text-[11px] font-bold tracking-[0.18em] uppercase cursor-pointer transition-colors duration-200 group select-none",
          isActive ? "text-white" : "text-white/45 hover:text-white"
        )}
      >
        <Icon
          className={cn(
            "w-3.5 h-3.5 shrink-0 transition-colors duration-200",
            isActive ? "text-white" : "text-white/30 group-hover:text-white"
          )}
        />
        <span>{label}</span>
        <span
          className={cn(
            "absolute bottom-0 left-0 right-0 h-[2px] bg-primary transition-transform duration-200 origin-left",
            isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
          )}
        />
      </div>
    </Link>
  );
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { admin } = useAuth();

  const coreItems = [
    { href: "/",            label: "Command Center", icon: Home },
    { href: "/logs",        label: "Activity Logs",  icon: Activity },
    { href: "/overview",    label: "Club Overview",  icon: LayoutDashboard },
    { href: "/leaderboard", label: "Leaderboard",    icon: Trophy },
    { href: "/lookup",      label: "Lookup",         icon: Search },
    { href: "/stats",       label: "Stats",          icon: BarChart2 },
  ];

  const infoItems = [
    { href: "/about",   label: "About",   icon: Info },
    { href: "/contact", label: "Contact", icon: Mail },
  ];

  const allDrawerItems = [
    ...coreItems,
    { href: "/about",   label: "About",   icon: Info },
    { href: "/contact", label: "Contact", icon: Mail },
    admin
      ? { href: "/admin", label: "Admin",  icon: Lock }
      : { href: "/login", label: "Log in", icon: LogIn },
  ];

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">

      {/* ── Top Nav ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#000000f2] border-b border-white/[0.07]">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 flex items-center justify-between">

          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer group shrink-0 py-2">
              <img
                src="/upcore-logo-nobg.png"
                alt="UPCore"
                className="h-8 w-8 object-contain transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(0,180,255,0.6)]"
                style={{ filter: "brightness(0) invert(1)" }}
              />
              <div className="leading-none">
                <div className="font-display font-black text-white text-[17px] tracking-[0.15em] uppercase transition-colors duration-200 group-hover:text-primary">
                  UPCORE
                </div>
                <div className="text-[9px] font-mono text-primary/70 tracking-[0.25em] uppercase mt-[1px]">
                  Club Tracker
                </div>
              </div>
            </div>
          </Link>

          {/* Desktop Nav — 3 tiers based on width */}
          {/* md (768+): 3 items */}
          <nav className="hidden md:flex lg:hidden items-center">
            {coreItems.slice(0, 3).map((item) => (
              <NavItem key={item.href} {...item} isActive={location === item.href} />
            ))}
          </nav>

          {/* lg (1024+): all 6 core items */}
          <nav className="hidden lg:flex xl:hidden items-center">
            {coreItems.map((item) => (
              <NavItem key={item.href} {...item} isActive={location === item.href} />
            ))}
          </nav>

          {/* xl (1280+): all 6 core + About/Contact + Login/Admin */}
          <nav className="hidden xl:flex items-center">
            {coreItems.map((item) => (
              <NavItem key={item.href} {...item} isActive={location === item.href} />
            ))}
            <div className="w-px h-4 bg-white/10 mx-1" />
            {infoItems.map((item) => (
              <NavItem key={item.href} {...item} isActive={location === item.href} />
            ))}
            <div className="w-px h-4 bg-white/10 mx-1" />
            <NavItem
              href={admin ? "/admin" : "/login"}
              label={admin ? "Admin" : "Log in"}
              icon={admin ? Lock : LogIn}
              isActive={location === (admin ? "/admin" : "/login")}
            />
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3 shrink-0">
            {/* LIVE badge */}
            <div className="hidden md:flex items-center gap-1.5 text-[10px] font-mono font-bold text-primary tracking-[0.2em] uppercase">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
              </span>
              LIVE
            </div>

            {/* Hamburger */}
            <button
              className="flex flex-col gap-[5px] p-2 text-white/50 hover:text-primary transition-colors duration-200 group"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
            >
              <span className="block w-[18px] h-[1.5px] bg-current transition-all duration-200" />
              <span className="block w-[18px] h-[1.5px] bg-current transition-all duration-200" />
              <span className="block w-[18px] h-[1.5px] bg-current transition-all duration-200" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Drawer backdrop ── */}
      <div
        className="fixed inset-0 z-[60] transition-all duration-300"
        style={{
          opacity: drawerOpen ? 1 : 0,
          pointerEvents: drawerOpen ? "all" : "none",
          background: "rgba(0,0,0,0.72)",
          backdropFilter: drawerOpen ? "blur(5px)" : "none",
        }}
        onClick={() => setDrawerOpen(false)}
      />

      {/* ── Drawer panel ── */}
      <div
        className="fixed top-0 right-0 bottom-0 z-[70] w-72 flex flex-col"
        style={{
          transform: drawerOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
          background: "#06080a",
          borderLeft: "1px solid rgba(0,180,255,0.10)",
        }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-white/[0.06] shrink-0">
          <div>
            <div className="text-[9px] font-mono text-primary/50 tracking-[0.35em] uppercase">Navigation</div>
            <div className="font-display font-black text-white text-base tracking-[0.12em] uppercase leading-none mt-0.5">
              UPCORE
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="text-white/30 hover:text-white transition-colors duration-150 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {allDrawerItems.map((item, idx) => {
            const isActive = location === item.href;
            const isLast = idx === allDrawerItems.length - 1;
            return (
              <React.Fragment key={item.href}>
                {isLast && <div className="my-2 border-t border-white/[0.05]" />}
                <Link href={item.href}>
                  <div
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      "relative flex items-center gap-3 px-4 py-3 mb-0.5 text-[11px] font-bold tracking-[0.2em] uppercase cursor-pointer transition-all duration-150 overflow-hidden group",
                      isActive
                        ? "text-white bg-primary/8 border-l-2 border-primary"
                        : "text-white/40 hover:text-white hover:bg-white/[0.03] border-l-2 border-transparent"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4 shrink-0 transition-colors duration-150", isActive ? "text-primary" : "text-white/25 group-hover:text-primary")} />
                    {item.label}
                    {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                  </div>
                </Link>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Drawer footer */}
        <div className="px-6 py-4 border-t border-white/[0.05] shrink-0">
          <div className="flex items-center gap-2 text-[10px] font-mono text-primary/60">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
            </span>
            LIVE · All clubs monitored
          </div>
          <p className="text-[9px] font-mono text-white/12 tracking-[0.3em] uppercase mt-2">#RISEUP · UPCORE TRACKER</p>
        </div>
      </div>

      <main className="flex-1 mt-16">{children}</main>
    </div>
  );
}
