import React, { useState, useRef } from "react";
import { useGetLogsSummary } from "../api";
import { useGetAllClubsOverview } from "../api";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import {
  Activity, ChevronRight, Users, TrendingUp, Clock, ArrowRight,
  Search, User, Shield, Trophy, Wifi, Globe, Lock, Unlock,
  PiggyBank, Loader2, X, Ticket, Star, Swords, Zap, Crown,
} from "lucide-react";
import JoinSuggestion from "@/components/JoinSuggestion";
import { cn } from "@/lib/utils";

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

function hexColor(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const hex = raw.replace(/^0x/i, "");
  return hex.length >= 6 ? `#${hex.slice(-6)}` : undefined;
}

function iconUrl(id?: number | null) {
  return id ? `https://cdn.brawlify.com/profile-icons/regular/${id}.png` : null;
}

function badgeUrl(id?: number | null) {
  return id ? `https://cdn.brawlify.com/club-badges/regular/${id}.png` : null;
}

// ── Player Lookup ─────────────────────────────────────────────────────────────
interface BSBrawler {
  id: number;
  name: string;
  power: number;
  rank: number;
  trophies: number;
  highestTrophies: number;
  starPowers?: Array<{ id: number; name: string }>;
  gadgets?: Array<{ id: number; name: string }>;
}

interface BSPlayer {
  tag: string;
  name: string;
  nameColor?: string;
  icon?: { id: number };
  trophies: number;
  highestTrophies?: number;
  expLevel?: number;
  expPoints?: number;
  soloVictories?: number;
  duoVictories?: number;
  trioVictories?: number;
  bestRoboRumbleTime?: number;
  bestTimeAsBigBrawler?: number;
  brawlers?: BSBrawler[];
  brawlersUnlocked?: number;
  club?: { tag: string; name: string };
}

function PlayerAvatar({ player }: { player: BSPlayer }) {
  const [err, setErr] = useState(false);
  const url = iconUrl(player.icon?.id);
  if (url && !err) {
    return (
      <img
        src={url}
        alt={player.name}
        onError={() => setErr(true)}
        className="w-16 h-16 rounded-full border-2 border-primary/30 object-cover shrink-0"
      />
    );
  }
  return (
    <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center shrink-0">
      <User className="w-7 h-7 text-primary/50" />
    </div>
  );
}

function StatPill({ icon: Icon, label, value, color = "text-white/60" }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg bg-white/3 border border-white/6 min-w-0">
      <Icon className={cn("w-3.5 h-3.5 shrink-0", color)} />
      <span className={cn("font-display font-black text-lg tabular-nums leading-none", color)}>{value}</span>
      <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest text-center leading-tight">{label}</span>
    </div>
  );
}

function PlayerLookup() {
  const [input, setInput] = useState("");
  const [searchTag, setSearchTag] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showAllBrawlers, setShowAllBrawlers] = useState(false);

  const { data: player, isLoading, isError, error, isFetching } = useQuery<BSPlayer, Error>({
    queryKey: ["player-lookup", searchTag],
    queryFn: async () => {
      const tag = (searchTag ?? "").replace(/^#?/, "#");
      const res = await fetch(`/api/players/${encodeURIComponent(tag)}`);
      if (res.status === 429) throw new Error("rate_limited");
      if (res.status === 404) throw new Error("not_found");
      if (!res.ok) throw new Error("fetch_error");
      return res.json();
    },
    enabled: !!searchTag,
    retry: false,
    staleTime: 30_000,
    gcTime: 60_000,
  });

  const handleSearch = () => {
    const t = input.trim().replace(/^#/, "");
    if (t) {
      setShowAllBrawlers(false);
      setSearchTag(t);
    }
  };

  const clear = () => {
    setInput("");
    setSearchTag(null);
    setShowAllBrawlers(false);
    inputRef.current?.focus();
  };

  const topBrawlers = player?.brawlers
    ? [...player.brawlers].sort((a, b) => b.trophies - a.trophies).slice(0, showAllBrawlers ? 999 : 6)
    : [];

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 space-y-4">
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-primary" />
        <h3 className="font-display text-sm font-black uppercase tracking-wider text-white">
          Profile Lookup
        </h3>
        <span className="text-[10px] font-mono text-muted-foreground ml-auto">by player tag</span>
      </div>

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 focus-within:border-primary/40 transition-colors">
          <span className="text-primary/60 font-mono text-sm font-bold">#</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="PlayerTag"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            className="bg-transparent text-sm text-white placeholder-white/20 focus:outline-none w-full font-mono tracking-wider"
          />
          {input && (
            <button type="button" onClick={clear} className="text-white/30 hover:text-white transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={!input.trim() || isFetching}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-black text-xs font-bold font-mono uppercase tracking-wider rounded-xl hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          Search
        </button>
      </form>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-full bg-white/5 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32 bg-white/5" />
              <Skeleton className="h-3 w-20 bg-white/5" />
              <Skeleton className="h-3 w-24 bg-white/5" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg bg-white/5" />)}
          </div>
        </div>
      )}

      {/* Error */}
      {isError && searchTag && !isLoading && (
        <div className={`rounded-xl border p-4 text-center ${error?.message === "rate_limited" ? "border-amber-500/20 bg-amber-500/5" : "border-red-500/15 bg-red-500/5"}`}>
          {error?.message === "rate_limited" ? (
            <>
              <p className="text-sm font-mono text-amber-400">⚠ API daily limit reached.</p>
              <p className="text-xs text-muted-foreground mt-1">BrawlTools resets at midnight UTC. Try again tomorrow.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-mono text-red-400">Player <span className="font-bold">#{searchTag}</span> not found.</p>
              <p className="text-xs text-muted-foreground mt-1">Check the tag and try again.</p>
            </>
          )}
        </div>
      )}

      {/* Result */}
      {player && !isLoading && (
        <div className="space-y-3">
          {/* Header card */}
          <div className="rounded-xl border border-primary/15 bg-gradient-to-br from-primary/8 to-transparent p-4">
            <div className="flex items-center gap-4">
              <PlayerAvatar player={player} />
              <div className="flex-1 min-w-0">
                <h4
                  className="font-display font-black text-xl tracking-wider truncate leading-none"
                  style={{ color: hexColor(player.nameColor) ?? "#ffffff" }}
                >
                  {player.name}
                </h4>
                <p className="text-[11px] font-mono text-primary/50 mt-1">{player.tag}</p>
                {player.club && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Shield className="w-3 h-3 text-primary/60 shrink-0" />
                    <span className="text-xs font-mono text-muted-foreground truncate">{player.club.name}</span>
                  </div>
                )}
                {player.expLevel != null && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Star className="w-3 h-3 text-amber-400/60 shrink-0" />
                    <span className="text-xs font-mono text-muted-foreground">Level {player.expLevel}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <div className="flex items-center gap-1 text-yellow-300 font-mono font-bold tabular-nums">
                  <Trophy className="w-3.5 h-3.5" />
                  {player.trophies.toLocaleString()}
                </div>
                {player.highestTrophies != null && (
                  <p className="text-[10px] font-mono text-muted-foreground">
                    Best: {player.highestTrophies.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2">
            {player.trioVictories != null && (
              <StatPill icon={Swords} label="3v3 Wins" value={player.trioVictories.toLocaleString()} color="text-sky-400" />
            )}
            {player.soloVictories != null && (
              <StatPill icon={Crown} label="Solo Wins" value={player.soloVictories.toLocaleString()} color="text-yellow-300" />
            )}
            {player.duoVictories != null && (
              <StatPill icon={Users} label="Duo Wins" value={player.duoVictories.toLocaleString()} color="text-emerald-400" />
            )}
            {player.brawlersUnlocked != null && (
              <StatPill icon={Zap} label="Brawlers" value={player.brawlersUnlocked} color="text-violet-400" />
            )}
            {player.bestRoboRumbleTime != null && player.bestRoboRumbleTime > 0 && (
              <StatPill icon={Activity} label="Robo Rumble" value={`${player.bestRoboRumbleTime}m`} color="text-orange-400" />
            )}
            {player.bestTimeAsBigBrawler != null && player.bestTimeAsBigBrawler > 0 && (
              <StatPill icon={TrendingUp} label="Big Brawler" value={`${player.bestTimeAsBigBrawler}m`} color="text-pink-400" />
            )}
          </div>

          {/* Top brawlers */}
          {topBrawlers.length > 0 && (
            <div className="rounded-xl border border-white/6 bg-white/[0.015] overflow-hidden">
              <div className="px-3 py-2.5 border-b border-white/5 flex items-center gap-2">
                <Trophy className="w-3 h-3 text-yellow-300" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-white">
                  Top Brawlers
                </span>
                <span className="text-[9px] font-mono text-muted-foreground ml-auto">
                  {player.brawlers?.length ?? 0} total
                </span>
              </div>
              <div className="divide-y divide-white/4">
                {topBrawlers.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white truncate">{b.name}</span>
                        <span className="text-[9px] font-mono text-violet-400 bg-violet-400/10 border border-violet-400/20 px-1.5 py-0.5 rounded shrink-0">
                          Pw {b.power}
                        </span>
                        {b.starPowers && b.starPowers.length > 0 && (
                          <span className="text-[9px] font-mono text-amber-400 shrink-0">⭐{b.starPowers.length}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-300/80 font-mono text-xs shrink-0 tabular-nums">
                      <Trophy className="w-2.5 h-2.5" />
                      {b.trophies.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
              {player.brawlers && player.brawlers.length > 6 && (
                <button
                  onClick={() => setShowAllBrawlers(v => !v)}
                  className="w-full py-2 text-[10px] font-mono text-muted-foreground hover:text-white transition-colors border-t border-white/5"
                >
                  {showAllBrawlers ? "Show less ▲" : `Show all ${player.brawlers.length} brawlers ▼`}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {!searchTag && !isLoading && (
        <p className="text-xs font-mono text-muted-foreground/50 text-center pb-1">
          Enter any Brawl Stars player tag to see their full profile
        </p>
      )}
    </div>
  );
}

// ── Club Lookup ───────────────────────────────────────────────────────────────
interface ClubOverview {
  tag: string;
  name: string;
  trophies: number;
  memberCount: number;
  online: number;
  president?: string | null;
  megaPig?: { totalWins: number; totalPlayed: number } | null;
  badgeId?: number | null;
  requiredTrophies?: number | null;
  type?: string | null;
  regionName?: string | null;
}

function ClubBadgeSmall({ badgeId, name }: { badgeId?: number | null; name: string }) {
  const [err, setErr] = useState(false);
  const url = badgeUrl(badgeId);
  if (url && !err) {
    return (
      <img src={url} alt={name} onError={() => setErr(true)} className="w-9 h-9 object-contain shrink-0" />
    );
  }
  return (
    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
      <Shield className="w-4 h-4 text-primary/50" />
    </div>
  );
}

function ClubLookup({ clubs, isClubsLoading }: { clubs: ClubOverview[]; isClubsLoading: boolean }) {
  const [filter, setFilter] = useState("");
  const [, navigate] = useLocation();

  const readyClubs = clubs.filter((c) => !(c as any).loading);
  const allLoading = !isClubsLoading && clubs.length > 0 && readyClubs.length === 0;

  const filtered = filter
    ? readyClubs.filter(
        (c) =>
          c.name?.toLowerCase().includes(filter.toLowerCase()) ||
          c.tag?.toLowerCase().includes(filter.toLowerCase()),
      )
    : readyClubs.slice(0, 4);

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-amber-400" />
        <h3 className="font-display text-sm font-black uppercase tracking-wider text-white">
          Club Lookup
        </h3>
        <span className="text-[10px] font-mono text-muted-foreground ml-auto">
          {isClubsLoading ? "Loading…" : `${clubs.length} clubs tracked`}
        </span>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 focus-within:border-amber-400/30 transition-colors">
        <Search className="w-3.5 h-3.5 text-white/30 shrink-0" />
        <input
          type="text"
          placeholder="Search club name or tag…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-transparent text-sm text-white placeholder-white/20 focus:outline-none w-full font-mono"
        />
        {filter && (
          <button onClick={() => setFilter("")} className="text-white/30 hover:text-white transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Results */}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {isClubsLoading ? (
          [...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[60px] rounded-xl bg-white/5" />
          ))
        ) : allLoading ? (
          <div className="py-6 text-center text-xs font-mono text-amber-400/70 border border-amber-500/15 rounded-xl bg-amber-500/5">
            ⚠ Club data warming up — BrawlTools API resets at midnight UTC.
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-6 text-center text-xs font-mono text-muted-foreground">
            No clubs match "{filter}"
          </div>
        ) : (
          filtered.map((club) => {
            const isClosed = (club.type ?? "").toLowerCase() === "closed";
            const isOpen   = (club.type ?? "").toLowerCase() === "open";
            return (
              <button
                key={club.tag}
                onClick={() => navigate(`/lookup?tag=${encodeURIComponent(club.tag)}`)}
                className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-white/6 bg-white/[0.015] hover:border-amber-400/25 hover:bg-amber-400/4 transition-all group"
              >
                <ClubBadgeSmall badgeId={club.badgeId} name={club.name} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors truncate">
                    {club.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-muted-foreground">
                    <span className="flex items-center gap-0.5 text-yellow-300/70">
                      <Trophy className="w-2.5 h-2.5" />{club.trophies.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Users className="w-2.5 h-2.5" />{club.memberCount}/30
                    </span>
                    {club.online > 0 && (
                      <span className="flex items-center gap-0.5 text-emerald-400">
                        <Wifi className="w-2.5 h-2.5" />{club.online}
                      </span>
                    )}
                    {club.type && (
                      <span className={cn("flex items-center gap-0.5",
                        isClosed ? "text-red-400" : isOpen ? "text-emerald-400" : "text-amber-400")}>
                        {isClosed ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                      </span>
                    )}
                    {club.megaPig && (
                      <span className="flex items-center gap-0.5 text-pink-400">
                        <PiggyBank className="w-2.5 h-2.5" />{club.megaPig.totalWins}W
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-amber-400 transition-colors shrink-0" />
              </button>
            );
          })
        )}
      </div>

      {!filter && readyClubs.length > 4 && !isClubsLoading && (
        <Link href="/lookup">
          <div className="flex items-center justify-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-amber-400 transition-colors cursor-pointer pt-1 border-t border-white/5">
            View all {readyClubs.length} clubs <ArrowRight className="w-3 h-3" />
          </div>
        </Link>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const { data: summary, isLoading } = useGetLogsSummary();
  const { data: clubs, isLoading: isClubsLoading } = useGetAllClubsOverview({ query: { refetchInterval: 300000 } });

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
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/upcore-intro.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/50 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black to-transparent pointer-events-none" />

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
              Real-time monitoring of all UPCore Brawl Stars clubs.
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

          {/* ── LOOKUP TOOLS ── */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={6}>
            <div className="mb-5">
              <h2 className="font-display text-xl font-black tracking-[0.15em] uppercase text-white flex items-center gap-3">
                <span className="w-8 h-px bg-primary inline-block" />
                Lookup Tools
              </h2>
              <p className="text-xs font-mono text-white/40 mt-1.5 ml-11 tracking-wide">
                Search any player or UPCore club instantly
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <PlayerLookup />
              <ClubLookup clubs={(clubs ?? []) as ClubOverview[]} isClubsLoading={isClubsLoading} />
            </div>
          </motion.div>

          {/* Join Suggestion Tool */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={7}>
            <JoinSuggestion clubs={(clubs ?? []) as any} />
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
