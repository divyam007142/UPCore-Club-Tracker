import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, Settings as SettingsIcon, ScrollText,
  LogOut, Users, Menu, X, UserCircle, Activity, Clock,
} from "lucide-react";

const INACTIVITY_MS = 10 * 60 * 1000; // 10 minutes

const adminNav = [
  { href: "/admin",          label: "Dashboard",     icon: LayoutDashboard },
  { href: "/admin/settings", label: "Club Settings",  icon: SettingsIcon   },
  { href: "/admin/members",  label: "Members",        icon: Users          },
  { href: "/admin/audit",    label: "Audit Logs",     icon: ScrollText     },
  { href: "/admin/status",   label: "System Status",  icon: Activity       },
  { href: "/admin/profile",  label: "My Profile",     icon: UserCircle     },
];

function AdminAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const { admin } = useAuth();
  const initial = (admin?.displayName || admin?.name || "A")[0].toUpperCase();
  const [imgErr, setImgErr] = useState(false);
  const picUrl = admin?.profilePicUrl;
  const sizeClass = size === "sm" ? "w-7 h-7 text-xs" : size === "lg" ? "w-11 h-11 text-sm" : "w-9 h-9 text-sm";

  if (picUrl && !imgErr) {
    return (
      <img
        src={picUrl} alt={admin?.displayName ?? admin?.name}
        onError={() => setImgErr(true)}
        className={`${sizeClass} rounded-none object-cover border border-white/20 shrink-0`}
      />
    );
  }
  return (
    <div className={`${sizeClass} bg-white flex items-center justify-center shrink-0`}>
      <span className="font-black text-black" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>{initial}</span>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { admin, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(INACTIVITY_MS / 1000);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // 10-minute inactivity auto-logout
  useEffect(() => {
    const resetTimer = () => {
      setSecondsLeft(INACTIVITY_MS / 1000);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (tickRef.current)  clearInterval(tickRef.current);

      timerRef.current = setTimeout(() => {
        logout();
        navigate("/login", { replace: true });
      }, INACTIVITY_MS);

      // Countdown tick every second
      tickRef.current = setInterval(() => {
        setSecondsLeft((s) => Math.max(0, s - 1));
      }, 1000);
    };

    const events = ["mousemove", "keydown", "mousedown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
      if (tickRef.current)  clearInterval(tickRef.current);
    };
  }, [logout, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const displayName = admin?.displayName || admin?.name;

  const minsLeft = Math.floor(secondsLeft / 60);
  const secsLeft = secondsLeft % 60;
  const sessionWarning = secondsLeft <= 120; // warn when ≤ 2 min left

  return (
    <div className="flex min-h-[calc(100vh-64px)]" style={{ background: "#080808" }}>

      {/* ── Desktop Sidebar ── */}
      <aside
        className="hidden md:flex flex-col w-56 shrink-0 border-r border-white/10"
        style={{ background: "#000" }}
      >
        {/* Identity block */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <AdminAvatar size="lg" />
            <div className="min-w-0 flex-1">
              <div
                className="text-white font-black truncate leading-tight"
                style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "1rem", letterSpacing: "0.1em" }}
              >
                {displayName}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                <span className="text-[9px] font-mono text-white/40 uppercase tracking-[0.2em]">Admin Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav label */}
        <div className="px-5 pt-5 pb-1">
          <span className="text-[8px] font-mono text-white/20 uppercase tracking-[0.4em]">Navigation</span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 pb-3 space-y-px overflow-y-auto">
          {adminNav.map((item) => {
            const isActive =
              item.href === "/admin"
                ? location === "/admin"
                : location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all group text-sm font-mono"
                  style={{
                    background: isActive ? "#fff" : "transparent",
                    color: isActive ? "#000" : "rgba(255,255,255,0.4)",
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.color = "#fff"; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.color = "rgba(255,255,255,0.4)"; }}
                >
                  <item.icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="tracking-wide">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Session timer */}
        <div className={`px-5 py-3 border-t ${sessionWarning ? "border-red-500/20" : "border-white/5"}`}>
          <div className={`flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest ${sessionWarning ? "text-red-400" : "text-white/20"}`}>
            <Clock className="w-2.5 h-2.5 shrink-0" />
            <span>
              {sessionWarning
                ? `Session expires in ${minsLeft}:${String(secsLeft).padStart(2, "0")}`
                : `Auto-logout in ${minsLeft}m`}
            </span>
          </div>
        </div>

        {/* Sign out */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-mono text-white/40 hover:text-red-400 hover:bg-red-400/5 transition-colors rounded"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            Sign Out
          </button>
        </div>

        {/* Footer tag */}
        <div className="px-5 py-3 border-t border-white/5">
          <span className="text-[8px] font-mono text-white/15 uppercase tracking-[0.3em]">#RISEUP</span>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden absolute left-0 right-0 z-40 top-0" style={{ background: "#000" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <AdminAvatar size="sm" />
            <span
              className="font-black text-white text-sm tracking-wider uppercase"
              style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
            >
              {displayName}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {sessionWarning && (
              <span className="text-[9px] font-mono text-red-400 tabular-nums">
                {minsLeft}:{String(secsLeft).padStart(2, "0")}
              </span>
            )}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="text-white/40 hover:text-white transition-colors">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-b border-white/10 p-2 space-y-px" style={{ background: "#000" }}>
            {adminNav.map((item) => {
              const isActive = item.href === "/admin" ? location === "/admin" : location.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm font-mono cursor-pointer transition-colors"
                    style={{ background: isActive ? "#fff" : "transparent", color: isActive ? "#000" : "rgba(255,255,255,0.4)" }}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-mono text-white/40 hover:text-red-400 transition-colors mt-1 rounded"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 min-w-0 overflow-auto" style={{ background: "#080808" }}>
        <div className="md:hidden h-[56px]" />
        <div className="p-6 sm:p-8 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
