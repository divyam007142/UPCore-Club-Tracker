import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Crown, Medal, Award, Users, Wifi, Lock, Unlock, Zap, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiUrl } from "@/api";

interface LeaderboardRow {
  tag: string;
  name: string;
  trophies: number;
  requiredTrophies: number | null;
  badgeId: number | null;
  memberCount: number;
  online: number;
  type: string | null;
  loading?: boolean;
  stale?: boolean;
}

async function fetchLeaderboard(): Promise<LeaderboardRow[]> {
  const res = await fetch(getApiUrl("/api/clubs/leaderboard"));
  if (!res.ok) throw new Error("Failed to load leaderboard");
  return res.json();
}

function badgeUrl(id: number | null) {
  return id ? `https://cdn.brawlify.com/club-badges/regular/${id}.png` : null;
}

function ClubBadgeImg({ badgeId, name, size = 10 }: { badgeId: number | null; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  const url = badgeUrl(badgeId);
  const cls = `w-${size} h-${size} object-contain shrink-0`;
  if (url && !err)
    return <img src={url} alt={name} onError={() => setErr(true)} className={cls} />;
  return (
    <div className={`w-${size} h-${size} rounded-lg bg-white/8 border border-white/10 flex items-center justify-center shrink-0`}>
      <Trophy className="w-4 h-4 text-muted-foreground/50" />
    </div>
  );
}

function typeChip(type: string | null) {
  if (!type) return null;
  const l = type.toLowerCase();
  const isOpen = l === "open";
  const isClosed = l === "closed";
  return (
    <span className={`flex items-center gap-1 text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border
      ${isOpen   ? "text-emerald-400 border-emerald-400/25 bg-emerald-400/8"
      : isClosed ? "text-red-400 border-red-400/25 bg-red-400/8"
      :            "text-amber-400 border-amber-400/25 bg-amber-400/8"}`}
    >
      {isOpen ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
      {type}
    </span>
  );
}

const PODIUM = {
  1: { outer: "border-yellow-400/40 bg-gradient-to-b from-yellow-500/20 to-yellow-500/5", icon: Crown, iconCls: "text-yellow-300", text: "text-yellow-300", glow: "shadow-[0_0_40px_rgba(250,204,21,0.18)]", order: "order-2", height: "pt-0" },
  2: { outer: "border-slate-300/30 bg-gradient-to-b from-slate-400/15 to-slate-400/5",   icon: Medal, iconCls: "text-slate-200",  text: "text-slate-200",  glow: "shadow-[0_0_20px_rgba(203,213,225,0.08)]", order: "order-1", height: "pt-8" },
  3: { outer: "border-amber-600/30 bg-gradient-to-b from-amber-700/15 to-amber-700/5",   icon: Award, iconCls: "text-amber-400",  text: "text-amber-400",  glow: "shadow-[0_0_20px_rgba(180,83,9,0.1)]",    order: "order-3", height: "pt-12" },
};

function PodiumCard({ row, rank }: { row: LeaderboardRow; rank: 1 | 2 | 3 }) {
  const cfg = PODIUM[rank];
  const Icon = cfg.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.1, duration: 0.5 }}
      className={`${cfg.order} ${cfg.height} flex-1 flex flex-col items-center`}
    >
      <div className={`w-full rounded-2xl border ${cfg.outer} ${cfg.glow} p-5 flex flex-col items-center gap-3 relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-b from-white/3 to-transparent pointer-events-none" />

        {/* Rank icon */}
        <div className={`relative z-10 w-12 h-12 rounded-full border-2 ${cfg.outer} flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${cfg.iconCls}`} />
        </div>

        {/* Badge */}
        <ClubBadgeImg badgeId={row.badgeId} name={row.name} size={12} />

        {/* Name */}
        <div className="text-center">
          <h3 className={`font-display font-black text-sm sm:text-base tracking-wide leading-tight ${cfg.text}`}>
            {row.name}
          </h3>
          <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">{row.tag}</p>
        </div>

        {/* Trophies */}
        <div className={`font-display font-black text-2xl sm:text-3xl tabular-nums ${cfg.text} flex items-center gap-1.5`}>
          <Trophy className="w-5 h-5 opacity-80" />
          {row.trophies.toLocaleString()}
        </div>

        {/* Meta chips */}
        <div className="flex flex-wrap gap-1.5 justify-center">
          <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
            <Users className="w-3 h-3" />{row.memberCount}/30
          </span>
          {row.online > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
              <Wifi className="w-3 h-3" />{row.online} online
            </span>
          )}
          {typeChip(row.type)}
        </div>
      </div>
    </motion.div>
  );
}

function ListRow({ row, rank, maxTrophies }: { row: LeaderboardRow; rank: number; maxTrophies: number }) {
  const pct = maxTrophies > 0 ? (row.trophies / maxTrophies) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(rank * 0.03, 0.5), duration: 0.3 }}
      className="relative group overflow-hidden rounded-xl border border-border bg-card hover:border-primary/25 hover:bg-primary/3 transition-all"
    >
      {/* Subtle fill bar */}
      <div
        className="absolute inset-y-0 left-0 bg-primary/4 pointer-events-none transition-all duration-1000"
        style={{ width: `${pct}%` }}
      />

      <div className="relative flex items-center gap-4 px-4 py-3.5">
        {/* Rank number */}
        <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center shrink-0">
          <span className="font-display font-black text-sm text-muted-foreground">#{rank}</span>
        </div>

        {/* Club badge */}
        <ClubBadgeImg badgeId={row.badgeId} name={row.name} size={8} />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-bold text-white text-sm group-hover:text-primary transition-colors truncate">
              {row.name}
            </span>
            {typeChip(row.type)}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-[10px] font-mono text-muted-foreground/50">{row.tag}</span>
            <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
              <Users className="w-2.5 h-2.5" />{row.memberCount}/30
            </span>
            {row.online > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                <Wifi className="w-2.5 h-2.5" />{row.online}
              </span>
            )}
            {row.requiredTrophies != null && (
              <span className="text-[10px] font-mono text-muted-foreground/40">
                Req. {row.requiredTrophies.toLocaleString()}
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-2 h-0.5 rounded-full bg-white/6 overflow-hidden max-w-xs">
            <div
              className="h-full rounded-full bg-primary/50 transition-all duration-1000"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Trophy count */}
        <div className="text-right shrink-0">
          <div className="font-display font-black text-base sm:text-lg text-white flex items-center gap-1.5 justify-end tabular-nums">
            <Trophy className="w-3.5 h-3.5 text-amber-400/70" />
            {row.trophies.toLocaleString()}
          </div>
          {row.loading && (
            <div className="text-[10px] font-mono text-muted-foreground/40 mt-0.5">loading…</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function Leaderboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
    refetchInterval: 60_000,
  });

  // Only show clubs that actually have data (loading:true means no cache + no snapshot)
  const readyRows  = data?.filter(r => !r.loading) ?? [];
  const allLoading = !!data && data.length > 0 && readyRows.length === 0;
  const anyStale   = readyRows.some(r => r.stale);

  const maxTrophies  = readyRows[0]?.trophies ?? 1;
  const totalTrophies = readyRows.reduce((s, r) => s + r.trophies, 0);
  const top3 = readyRows.slice(0, 3);
  const rest = readyRows.slice(3);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">

      {/* Header */}
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-black tracking-wider uppercase text-white flex items-center gap-3">
          <Trophy className="w-6 h-6 text-yellow-300 shrink-0" />
          Trophy Leaderboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1 font-mono">
          UPCore clubs ranked by total trophies &bull; live updates every minute
        </p>
      </div>

      {/* Rate-limit warning — all clubs still loading, no snapshots */}
      {allLoading && (
        <div className="flex items-center gap-2.5 px-4 py-3 border border-amber-500/20 bg-amber-500/5 text-amber-400 font-mono text-xs rounded-xl">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          BrawlTools API daily limit active — trophy data will appear once the limit resets after midnight UTC.
        </div>
      )}

      {/* Stale data notice — serving from MongoDB snapshots */}
      {anyStale && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 border border-amber-500/20 bg-amber-500/5 text-amber-400 font-mono text-xs rounded-xl">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          Showing last saved data — BrawlTools API daily limit active. Live data resumes after midnight UTC.
        </div>
      )}

      {/* Combined trophy stat */}
      {totalTrophies > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-yellow-400/15 bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent p-6 flex items-center justify-between gap-4"
        >
          <div>
            <p className="text-[11px] font-mono text-yellow-300/60 uppercase tracking-widest mb-1">Combined Club Trophies</p>
            <div className="font-display font-black text-3xl sm:text-4xl text-yellow-300 flex items-center gap-2 tabular-nums">
              <Trophy className="w-7 h-7" />
              {totalTrophies.toLocaleString()}
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-1 text-right">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
              <Zap className="w-3 h-3 text-yellow-300" />
              {readyRows.length} clubs tracked
            </div>
            <div className="text-[11px] font-mono text-muted-foreground">
              avg {readyRows.length > 0 ? Math.round(totalTrophies / readyRows.length).toLocaleString() : "—"} / club
            </div>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {/* Podium skeletons */}
          <div className="flex gap-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="flex-1 h-52 rounded-2xl" />
            ))}
          </div>
          {/* List skeletons */}
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : allLoading ? (
        /* All clubs are still warming up — show placeholder */
        <div className="flex flex-col items-center justify-center py-20 border border-amber-500/10 rounded-2xl text-muted-foreground">
          <Trophy className="w-10 h-10 mb-4 opacity-20" />
          <p className="font-mono text-sm">Trophy data unavailable until API limit resets</p>
        </div>
      ) : readyRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-border rounded-2xl text-muted-foreground">
          <Trophy className="w-10 h-10 mb-4 opacity-30" />
          <p className="font-mono text-sm">No clubs tracked yet</p>
        </div>
      ) : (
        <>
          {/* ── Podium top 3 ── */}
          {top3.length >= 2 && (
            <div className="flex items-end gap-3 sm:gap-4">
              {top3.map((row, i) => (
                <PodiumCard key={row.tag} row={row} rank={(i + 1) as 1 | 2 | 3} />
              ))}
            </div>
          )}

          {/* ── Divider ── */}
          {rest.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border/60" />
              <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">Ranks 4–{readyRows.length}</span>
              <div className="h-px flex-1 bg-border/60" />
            </div>
          )}

          {/* ── Ranked list ── */}
          {rest.length > 0 && (
            <div className="space-y-2">
              {rest.map((row, i) => (
                <ListRow key={row.tag} row={row} rank={i + 4} maxTrophies={maxTrophies} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
