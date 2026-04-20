import React from "react";
import { useGetLogsSummary } from "../api";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Activity, ChevronRight, Users, TrendingUp, Clock, ArrowRight } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.12, duration: 0.7, ease: [0, 0, 0.2, 1] as [number, number, number, number] },
  }),
};

function formatEventType(type: string) {
  const map: Record<string, string> = {
    join: "Join", leave: "Leave", kick: "Kick",
    promotion: "Promotion", demotion: "Demotion", role_change: "Role Change",
  };
  return map[type] ?? type;
}

function eventColor(type: string) {
  const map: Record<string, string> = {
    join: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
    leave: "text-red-400 bg-red-400/10 border-red-400/30",
    kick: "text-red-500 bg-red-500/10 border-red-500/30",
    promotion: "text-sky-400 bg-sky-400/10 border-sky-400/30",
    demotion: "text-orange-400 bg-orange-400/10 border-orange-400/30",
    role_change: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  };
  return map[type] ?? "text-white/50 bg-white/5 border-white/10";
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Home() {
  const { data: summary, isLoading } = useGetLogsSummary();

  const stats = [
    { label: "Total Logs", value: summary?.totalLogs ?? 0, icon: Activity, color: "text-primary" },
    { label: "Today", value: summary?.todayLogs ?? 0, icon: Clock, color: "text-sky-400" },
    { label: "Joins", value: summary?.joinCount ?? 0, icon: Users, color: "text-emerald-400" },
    { label: "Promotions", value: summary?.promotionCount ?? 0, icon: TrendingUp, color: "text-accent" },
  ];

  return (
    <div>
      {/* ── HERO — video background ── */}
      <section className="relative w-full overflow-hidden flex items-center justify-center" style={{ minHeight: "52vh" }}>
        {/* Video — full coverage */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/upcore-intro.mp4" type="video/mp4" />
        </video>

        {/* Dark vignette */}
        <div className="absolute inset-0 bg-black/50 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black to-transparent pointer-events-none" />

        {/* Hero content */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 py-14 w-full">
          <motion.div initial="hidden" animate="visible" className="space-y-3 max-w-3xl mx-auto">
            <motion.h1
              variants={fadeUp}
              custom={0}
              className="text-white uppercase leading-none drop-shadow-2xl"
              style={{ fontSize: "clamp(3rem, 10vw, 7rem)", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.08em" }}
            >
              UPCORE
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={1}
              className="font-display text-white/70 tracking-[0.35em] uppercase text-sm md:text-lg"
            >
              CLUB TRACKER
            </motion.p>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-white/50 text-sm max-w-sm mx-auto leading-relaxed"
            >
              Real-time monitoring of all 16 UPCore Brawl Stars clubs.
            </motion.p>

            <motion.div
              variants={fadeUp}
              custom={3}
              className="flex flex-wrap items-center justify-center gap-3 pt-5"
            >
              <Link href="/overview">
                <button className="flex items-center gap-2 bg-white text-black font-bold text-xs tracking-[0.15em] uppercase px-6 py-3 hover:bg-primary transition-all duration-200">
                  CLUB OVERVIEW <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </Link>
              <Link href="/logs">
                <button className="flex items-center gap-2 border border-white/40 text-white font-medium text-xs tracking-[0.15em] uppercase px-6 py-3 hover:bg-white/10 hover:border-white transition-all duration-200">
                  ACTIVITY LOGS
                </button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="bg-black px-4 sm:px-6 py-10 border-t border-white/5">
        <div className="max-w-6xl mx-auto space-y-12">
          <motion.div
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                custom={i + 4}
                className="bg-black p-8 flex flex-col gap-3 hover:bg-white/[0.02] transition-colors"
              >
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                {isLoading ? (
                  <Skeleton className="h-10 w-20 bg-white/10" />
                ) : (
                  <div className="font-display text-4xl font-black text-white">
                    {stat.value.toLocaleString()}
                  </div>
                )}
                <div className="text-xs text-white/40 font-mono tracking-[0.2em] uppercase">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Recent Activity */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={8}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-black tracking-[0.15em] uppercase text-white flex items-center gap-3">
                <span className="w-8 h-px bg-primary inline-block" />
                Recent Activity
              </h2>
              <Link href="/logs">
                <span className="text-xs font-mono text-white/40 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors tracking-widest uppercase">
                  View All <ChevronRight className="w-3 h-3" />
                </span>
              </Link>
            </div>

            <div className="space-y-1">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full bg-white/5" />
                  ))
                : summary?.recentActivity?.length === 0
                ? (
                  <div className="text-center py-16 text-white/30 font-mono text-sm border border-white/5">
                    No activity yet — poller checks clubs every 5 minutes.
                  </div>
                )
                : summary?.recentActivity?.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-4 border border-white/5 hover:border-white/10 hover:bg-white/[0.02] transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`text-xs px-2 py-0.5 rounded border font-mono font-medium shrink-0 ${eventColor(log.eventType)}`}>
                        {formatEventType(log.eventType)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{log.playerName}</p>
                        <p className="text-xs text-white/40 truncate font-mono">{log.clubName}</p>
                      </div>
                    </div>
                    <span className="text-xs text-white/30 font-mono shrink-0 ml-2">{timeAgo(log.timestamp)}</span>
                  </div>
                ))}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
