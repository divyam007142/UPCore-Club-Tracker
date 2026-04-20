import React from "react";
import { motion } from "framer-motion";
import { Shield, Activity, LayoutDashboard, RefreshCw, Globe, Lock, Info } from "lucide-react";

const FEATURES = [
  {
    icon: <LayoutDashboard className="w-5 h-5 text-primary" />,
    title: "Club Overview",
    desc: "Real-time stats for all 16 UPCore clubs — trophies, member counts, online status, region, Mega Pig records, and president info at a glance.",
  },
  {
    icon: <Activity className="w-5 h-5 text-emerald-400" />,
    title: "Activity Logs",
    desc: "Every join, leave, kick, promotion, demotion, and role change is recorded with timestamps. Filter by club or event type and share a filtered URL with anyone.",
  },
  {
    icon: <RefreshCw className="w-5 h-5 text-sky-400" />,
    title: "Automatic Polling",
    desc: "The system polls BrawlTools every 5 minutes for all tracked clubs and detects membership changes automatically — no manual refreshing needed.",
  },
  {
    icon: <Globe className="w-5 h-5 text-violet-400" />,
    title: "16 Clubs Tracked",
    desc: "Covers the full UPCore Esports club family, from Main and Paradise to BOSS, SESA, Vanguards, and beyond.",
  },
  {
    icon: <Lock className="w-5 h-5 text-amber-400" />,
    title: "Persistent Storage",
    desc: "All logs and club data are stored in MongoDB. Reloading the page or coming back days later never loses a single event.",
  },
  {
    icon: <Shield className="w-5 h-5 text-pink-400" />,
    title: "Settings & Control",
    desc: "Add or remove clubs from tracking, toggle logging per club, and manage the entire dashboard without touching any code.",
  },
];

export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-14">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-6"
      >
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl scale-150" />
            <img
              src="/upcore-logo-nobg.png"
              alt="UPCore"
              className="relative w-20 h-20 object-contain"
              style={{ filter: "brightness(0) invert(1) drop-shadow(0 0 12px rgba(255,255,255,0.5))" }}
            />
          </div>
        </div>
        <div>
          <h1 className="font-display font-black text-4xl tracking-[0.15em] uppercase text-white">
            UPCORE
          </h1>
          <p className="font-mono text-primary/80 tracking-[0.35em] text-xs uppercase mt-1">
            Club Tracker
          </p>
        </div>
        <p className="text-slate-300 text-base leading-relaxed max-w-xl mx-auto">
          A real-time internal dashboard built for UPCore Esports to monitor all 16 Brawl Stars
          clubs — tracking membership changes, live stats, and activity history, 24/7.
        </p>
      </motion.div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Features */}
      <div>
        <h2 className="font-display font-bold text-lg tracking-wider uppercase text-white flex items-center gap-2 mb-6">
          <Info className="w-4 h-4 text-primary" />
          What This Does
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-card border border-white/10 rounded-xl p-5 space-y-2 hover:border-white/20 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                {f.icon}
                <h3 className="font-display font-bold text-white text-sm tracking-wide">{f.title}</h3>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Stack */}
      <div>
        <h2 className="font-display font-bold text-lg tracking-wider uppercase text-white mb-4">
          Tech Stack
        </h2>
        <div className="flex flex-wrap gap-2">
          {["React + Vite", "TypeScript", "Express.js", "MongoDB", "TanStack Query", "Framer Motion", "Tailwind CSS", "BrawlTools API", "pnpm Workspaces"].map((t) => (
            <span key={t} className="text-xs font-mono px-3 py-1.5 bg-white/6 border border-white/12 rounded-full text-slate-300">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Copyright / Legal */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-card border border-white/10 rounded-xl p-6 space-y-4"
      >
        <h2 className="font-display font-bold text-lg tracking-wider uppercase text-white">
          About UPCore Esports
        </h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          UPCore Esports is a competitive Brawl Stars organisation operating a family of clubs
          across multiple tiers. This dashboard is an internal tool built exclusively for UPCore
          club management and is not affiliated with or endorsed by Supercell.
        </p>
        <div className="bg-white/4 border border-white/8 rounded-lg px-4 py-3 space-y-1">
          <p className="text-slate-400 text-xs font-mono">
            Brawl Stars and all related assets are property of <span className="text-white">Supercell</span>.
            BrawlTools data is provided by the BrawlTools community API.
          </p>
          <p className="text-slate-400 text-xs font-mono">
            This tool, its design, and its code are proprietary to <span className="text-white">UPCore Esports</span> and are not for redistribution.
          </p>
        </div>
        <div className="pt-2 border-t border-white/8">
          <p className="text-slate-500 text-xs font-mono text-center">
            © {new Date().getFullYear()} UPCore Esports. All rights reserved.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
