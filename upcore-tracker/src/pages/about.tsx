import React from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Activity, Search, Trophy, Zap, RefreshCw,
  PiggyBank, Globe, Lock, UserCog, ScrollText, Shield,
} from "lucide-react";

const FEATURES = [
  { icon: LayoutDashboard, label: "Club Overview",      line: "Live stats for all 16 UPCore clubs",      color: "text-sky-400" },
  { icon: Activity,        label: "Activity Logs",      line: "Every membership event, timestamped",      color: "text-emerald-400" },
  { icon: Search,          label: "Club Lookup",        line: "Full profile breakdown per club",          color: "text-violet-400" },
  { icon: Trophy,          label: "Leaderboard",        line: "Clubs ranked live by total trophies",      color: "text-yellow-300" },
  { icon: Zap,             label: "Join Suggester",     line: "Instant eligibility check for any player", color: "text-pink-400" },
  { icon: RefreshCw,       label: "Auto Polling",       line: "System-driven updates every 5 minutes",   color: "text-cyan-400" },
  { icon: PiggyBank,       label: "Mega Pig Tracking",  line: "Wins, rates, and tickets per member",      color: "text-rose-400" },
  { icon: Globe,           label: "16 Clubs",           line: "Full UPCore family — every tier covered",  color: "text-amber-400" },
  { icon: Lock,            label: "Persistent Storage", line: "All logs retained indefinitely in MongoDB","color": "text-indigo-400" },
  { icon: UserCog,         label: "Admin Panel",        line: "Secure dashboard for club management",     color: "text-orange-400" },
  { icon: ScrollText,      label: "Audit Trail",        line: "Permanent record of every admin action",   color: "text-slate-400" },
  { icon: Shield,          label: "Settings",           line: "Add, rename, and toggle clubs on-the-fly", color: "text-green-400" },
];

const STACK = [
  "React", "Vite", "TypeScript", "Express.js",
  "MongoDB", "TanStack Query", "Framer Motion", "Tailwind CSS",
  "BrawlTools API", "JWT Auth", "pnpm Workspaces",
];

const STATS = [
  { value: "16",    label: "Clubs Tracked" },
  { value: "5m",    label: "Poll Interval" },
  { value: "24/7",  label: "Live Monitoring" },
  { value: "∞",     label: "Events Stored" },
];

function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const s: Record<string, string> = {
    tl: "top-0 left-0 border-t border-l",
    tr: "top-0 right-0 border-t border-r",
    bl: "bottom-0 left-0 border-b border-l",
    br: "bottom-0 right-0 border-b border-r",
  };
  return <div className={`absolute w-4 h-4 pointer-events-none ${s[pos]}`} style={{ borderColor: "rgba(255,255,255,0.2)" }} />;
}

export default function About() {
  const year = new Date().getFullYear();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 space-y-16">

      {/* ── Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-7"
      >
        <div className="flex justify-center">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full blur-2xl opacity-20 bg-white scale-150" />
            <img
              src="/upcore-logo-nobg.png"
              alt="UPCore"
              className="relative w-full h-full object-contain"
              style={{ filter: "brightness(0) invert(1)" }}
            />
          </div>
        </div>

        <div>
          <p className="font-mono text-[10px] tracking-[0.55em] text-white/25 uppercase mb-3">Upcore Esports</p>
          <h1 className="text-white uppercase leading-none"
            style={{ fontFamily: "'Bebas Neue',Impact,sans-serif", fontSize: "clamp(2.4rem,7vw,3.6rem)", letterSpacing: "0.18em" }}>
            Club Tracker
          </h1>
          <p className="mt-3 text-sm font-mono text-white/35 tracking-[0.25em] uppercase">
            Brawl Stars · Club Intelligence System
          </p>
        </div>

        <p className="text-white/45 text-[13px] leading-relaxed max-w-md mx-auto font-mono">
          An internal dashboard monitoring the full UPCore club family — membership events, live rankings, and player data, around the clock.
        </p>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-3 pt-1">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
              className="relative px-6 py-4 text-center"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <Corner pos="tl" /><Corner pos="tr" /><Corner pos="bl" /><Corner pos="br" />
              <div className="font-mono font-black text-2xl text-white tracking-tight">{s.value}</div>
              <div className="text-[9px] font-mono text-white/30 tracking-[0.3em] uppercase mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Divider */}
      <div className="h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.08) 50%,transparent)" }} />

      {/* ── Features ── */}
      <div>
        <p className="font-mono text-[10px] tracking-[0.5em] uppercase text-white/25 mb-7">Capabilities</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 + i * 0.035 }}
              className="flex items-start gap-4 px-5 py-5 group transition-colors duration-150"
              style={{ background: "rgba(10,10,10,0.95)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(10,10,10,0.95)")}
            >
              <div className="shrink-0 mt-0.5 w-8 h-8 flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <f.icon className={`w-4 h-4 ${f.color}`} />
              </div>
              <div>
                <div className="text-[11px] font-mono font-bold text-white tracking-[0.18em] uppercase mb-1">{f.label}</div>
                <div className="text-[12px] font-mono text-white/35 leading-snug">{f.line}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.08) 50%,transparent)" }} />

      {/* ── Stack ── */}
      <div>
        <p className="font-mono text-[10px] tracking-[0.5em] uppercase text-white/25 mb-5">Built With</p>
        <div className="flex flex-wrap gap-2">
          {STACK.map(t => (
            <span key={t}
              className="text-[11px] font-mono px-3 py-1.5 text-white/40 transition-colors duration-150 hover:text-white/70"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.08) 50%,transparent)" }} />

      {/* ── Legal / About ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="relative px-8 py-8 space-y-5"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <Corner pos="tl" /><Corner pos="tr" /><Corner pos="bl" /><Corner pos="br" />

        <div className="space-y-3">
          <p className="font-mono text-[10px] tracking-[0.5em] uppercase text-white/25">About</p>
          <p className="text-[12px] font-mono text-white/40 leading-relaxed">
            UPCore Esports is a competitive Brawl Stars organisation running clubs across multiple tiers.
            This tool is an internal system built exclusively for club management — not affiliated with or endorsed by Supercell.
          </p>
        </div>

        <div className="border-t border-white/5 pt-5 space-y-2">
          <p className="text-[11px] font-mono text-white/25 leading-relaxed">
            Brawl Stars and related assets are property of <span className="text-white/50">Supercell</span>.
            BrawlTools data is provided by the BrawlTools community API.
          </p>
          <p className="text-[11px] font-mono text-white/25">
            Design and code are proprietary to <span className="text-white/50">UPCore Esports</span>. Not for redistribution.
          </p>
        </div>

        <div className="border-t border-white/5 pt-5 flex items-center justify-between">
          <p className="text-[10px] font-mono text-white/20 tracking-[0.3em] uppercase">#RISEUP · UPCORE TRACKER</p>
          <p className="text-[10px] font-mono text-white/20">© {year} UPCore Esports</p>
        </div>
      </motion.div>

    </div>
  );
}
