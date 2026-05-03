import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePageTransition } from "@/context/TransitionContext";
import { useSearch, useLocation } from "wouter";
import { useGetLogs, useGetTrackedClubs, getGetLogsQueryKey } from "../api";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Activity, Search, X, Filter, Link as LinkIcon,
  Wifi, WifiOff, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EVENT_TYPES = ["join", "leave", "kick", "promotion", "demotion", "role_change"];
const ALL = "__all__";
const LIMIT = 25;

function fmt(type: string) {
  const m: Record<string, string> = {
    join: "Join", leave: "Leave", kick: "Kick",
    promotion: "Promotion", demotion: "Demotion", role_change: "Role Change",
  };
  return m[type] ?? type;
}

const STYLE: Record<string, { badge: string; bar: string; dot: string; glow: string }> = {
  join:        { badge: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30", bar: "bg-emerald-400", dot: "bg-emerald-400", glow: "shadow-[0_0_12px_rgba(52,211,153,0.15)]" },
  leave:       { badge: "text-red-400 bg-red-400/10 border-red-400/30",             bar: "bg-red-400",     dot: "bg-red-400",     glow: "" },
  kick:        { badge: "text-rose-500 bg-rose-500/10 border-rose-500/30",          bar: "bg-rose-500",    dot: "bg-rose-500",    glow: "" },
  promotion:   { badge: "text-sky-400 bg-sky-400/10 border-sky-400/30",             bar: "bg-sky-400",     dot: "bg-sky-400",     glow: "shadow-[0_0_12px_rgba(56,189,248,0.15)]" },
  demotion:    { badge: "text-orange-400 bg-orange-400/10 border-orange-400/30",    bar: "bg-orange-400",  dot: "bg-orange-400",  glow: "" },
  role_change: { badge: "text-amber-400 bg-amber-400/10 border-amber-400/30",       bar: "bg-amber-400",   dot: "bg-amber-400",   glow: "" },
};
const DEFAULT_STYLE = { badge: "text-muted-foreground bg-muted/10 border-border", bar: "bg-muted-foreground", dot: "bg-muted-foreground", glow: "" };
function styleOf(t: string) { return STYLE[t] ?? DEFAULT_STYLE; }

function fmtRole(r: string | null) {
  if (!r) return null;
  return ({ member: "Member", senior: "Senior", vicePresident: "Vice President", president: "President" })[r] ?? r;
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

/* ── URL filter state ─────────────────────────────────────────── */
function useUrlFilters() {
  const rawSearch = useSearch();
  const [location, navigate] = useLocation();
  const search = rawSearch.startsWith("?") ? rawSearch.slice(1) : rawSearch;
  const p = new URLSearchParams(search);
  const club      = p.get("club")  || ALL;
  const eventType = p.get("event") || ALL;
  const query     = p.get("q")     || "";
  const page      = Math.max(0, Number(p.get("page") || "0"));

  const update = useCallback((updates: Record<string, string>) => {
    const next = new URLSearchParams(search);
    for (const [k, v] of Object.entries(updates)) {
      if (v && v !== ALL && v !== "0") next.set(k, v); else next.delete(k);
    }
    const qs = next.toString();
    navigate(location + (qs ? `?${qs}` : ""), { replace: true });
  }, [search, location, navigate]);

  const clear = useCallback(() => navigate(location, { replace: true }), [location, navigate]);
  return { club, eventType, query, page, update, clear };
}

/* ── Live SSE pulse indicator ─────────────────────────────────── */
function LivePulse({ live }: { live: boolean }) {
  return (
    <span className={cn("flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full border transition-colors",
      live ? "text-emerald-400 border-emerald-400/25 bg-emerald-400/8" : "text-muted-foreground border-border/50 bg-transparent")}>
      {live ? (
        <><span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative rounded-full h-1.5 w-1.5 bg-emerald-400" />
        </span>Live</>
      ) : (
        <><WifiOff className="w-3 h-3" />Offline</>
      )}
    </span>
  );
}

/* ── Single log row ───────────────────────────────────────────── */
interface LogRow {
  id: string;
  clubTag: string;
  clubName: string;
  playerTag: string;
  playerName: string;
  eventType: string;
  roleFrom: string | null;
  roleTo: string | null;
  timestamp: string;
  isNew?: boolean;
}

function LogItem({ log, isNew }: { log: LogRow; isNew: boolean }) {
  const s = styleOf(log.eventType);
  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, y: -8, scale: 0.98 } : { opacity: 0 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all",
        isNew ? `bg-card/80 border-primary/20 ${s.glow}` : "bg-card border-border",
        "hover:border-primary/25 group"
      )}
    >
      {/* Color bar */}
      <div className={`w-0.5 h-9 rounded-full shrink-0 ${s.bar} opacity-60`} />

      {/* Event badge */}
      <span className={cn("text-[11px] px-2.5 py-1 rounded-full border font-mono font-semibold shrink-0 min-w-[76px] text-center", s.badge)}>
        {fmt(log.eventType)}
      </span>

      {/* Player info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-white">{log.playerName}</span>
          {log.roleFrom && log.roleTo && (
            <span className="text-xs text-muted-foreground/70 font-mono">
              {fmtRole(log.roleFrom)} → {fmtRole(log.roleTo)}
            </span>
          )}
          {log.roleTo && !log.roleFrom && (
            <span className="text-xs text-muted-foreground/70 font-mono">as {fmtRole(log.roleTo)}</span>
          )}
          {isNew && (
            <span className="text-[9px] font-mono text-primary uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 animate-pulse">
              new
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground/60 font-mono truncate mt-0.5">{log.clubName}</p>
      </div>

      {/* Time */}
      <span className="text-xs text-muted-foreground/60 font-mono shrink-0 tabular-nums whitespace-nowrap">
        {timeAgo(log.timestamp)}
      </span>
    </motion.div>
  );
}

/* ── Main page ────────────────────────────────────────────────── */
export default function Logs() {
  const { club, eventType, query, page, update, clear } = useUrlFilters();
  const { data: clubs } = useGetTrackedClubs();
  const { triggerTransition } = usePageTransition();

  const logParams = {
    club:      club === ALL ? undefined : club,
    eventType: eventType === ALL ? undefined : (eventType as "join" | "leave" | "kick" | "promotion" | "demotion" | "role_change"),
    search:    query || undefined,
    limit:     LIMIT,
    offset:    page * LIMIT,
  };

  const { data, isLoading, refetch } = useGetLogs(logParams, {
    query: { queryKey: getGetLogsQueryKey(logParams), refetchInterval: 8000, staleTime: 4000 },
  });

  const logs  = data?.logs ?? [];
  const total = data?.total ?? 0;
  const hasFilters = club !== ALL || eventType !== ALL || !!query;

  // Track which IDs are newly arrived
  const seenIds = useRef<Set<string>>(new Set());
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (!data?.logs) return;
    if (isFirstLoad.current) {
      // On first load, seed seen IDs — don't mark anything as new
      for (const l of data.logs) seenIds.current.add(l.id);
      isFirstLoad.current = false;
      return;
    }
    const fresh = new Set<string>();
    for (const l of data.logs) {
      if (!seenIds.current.has(l.id)) {
        fresh.add(l.id);
        seenIds.current.add(l.id);
      }
    }
    if (fresh.size > 0) {
      setNewIds(fresh);
      setTimeout(() => setNewIds(new Set()), 6000);
    }
  }, [data]);

  // Live indicator — true when on page 0 (auto-refresh active every 8s)
  const sseConnected = page === 0;

  const [copied, setCopied] = useState(false);
  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
        <div>
          <h1 className="font-display text-2xl font-black tracking-wider uppercase text-white flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-primary shrink-0" />
            Activity Logs
          </h1>
          <p className="text-muted-foreground text-sm mt-1 font-mono">
            {total > 0 ? <><span className="text-white font-semibold">{total.toLocaleString()}</span> total events</> : "Loading…"}
            {page === 0 && <> · refreshes every 8s</>}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <LivePulse live={page === 0 ? sseConnected : false} />
          <button onClick={copyLink}
            className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-white hover:border-white/20 transition-colors">
            <LinkIcon className="w-3 h-3" />{copied ? "Copied!" : "Share"}
          </button>
          <button onClick={() => { triggerTransition(1400); void refetch(); }}
            className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-colors">
            <Zap className="w-3 h-3" />Refresh
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2.5 items-center">
        <Select value={club} onValueChange={(v) => update({ club: v, page: "0" })}>
          <SelectTrigger className="w-[170px] bg-card border-border text-white font-mono text-sm">
            <SelectValue placeholder="All Clubs" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border text-white font-mono max-h-60">
            <SelectItem value={ALL} className="text-muted-foreground focus:bg-primary/10 focus:text-white">All Clubs</SelectItem>
            {(clubs ?? []).map((c) => (
              <SelectItem key={c.tag} value={c.tag} className="focus:bg-primary/10 focus:text-white">{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={eventType} onValueChange={(v) => update({ event: v, page: "0" })}>
          <SelectTrigger className="w-[150px] bg-card border-border text-white font-mono text-sm">
            <SelectValue placeholder="All Events" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border text-white font-mono">
            <SelectItem value={ALL} className="text-muted-foreground focus:bg-primary/10 focus:text-white">All Events</SelectItem>
            {EVENT_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="focus:bg-primary/10 focus:text-white">{fmt(t)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1 min-w-[160px] flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2.5 focus-within:border-primary/40 transition-colors">
          <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input type="text" placeholder="Search player…" value={query}
            onChange={(e) => update({ q: e.target.value, page: "0" })}
            className="bg-transparent text-sm text-white placeholder-muted-foreground/40 focus:outline-none w-full font-mono" />
          {query && <button onClick={() => update({ q: "", page: "0" })}><X className="w-3 h-3 text-muted-foreground hover:text-white" /></button>}
        </div>

        {hasFilters && (
          <button onClick={clear}
            className="flex items-center gap-1.5 text-xs font-mono px-3 py-2.5 rounded-lg border border-border text-muted-foreground hover:text-white hover:border-white/20 transition-colors">
            <X className="w-3 h-3" />Clear
          </button>
        )}
      </div>

      {/* Active filter pills */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2 -mt-1">
          {club !== ALL && (
            <span className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full">
              Club: {clubs?.find((c) => c.tag === club)?.name ?? club}
              <button onClick={() => update({ club: ALL, page: "0" })}><X className="w-2.5 h-2.5 hover:text-white" /></button>
            </span>
          )}
          {eventType !== ALL && (
            <span className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full">
              {fmt(eventType)}
              <button onClick={() => update({ event: ALL, page: "0" })}><X className="w-2.5 h-2.5 hover:text-white" /></button>
            </span>
          )}
          {query && (
            <span className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full">
              "{query}"
              <button onClick={() => update({ q: "", page: "0" })}><X className="w-2.5 h-2.5 hover:text-white" /></button>
            </span>
          )}
        </div>
      )}

      {/* ── Log Feed ── */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-border rounded-xl gap-3">
          <Filter className="w-8 h-8 opacity-30" />
          <p className="font-mono text-sm">No logs match your filters</p>
          {hasFilters && (
            <button onClick={clear} className="text-xs text-primary hover:underline font-mono">Clear filters</button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <AnimatePresence initial={false}>
              {logs.map((log) => (
                <LogItem key={log.id} log={log} isNew={newIds.has(log.id)} />
              ))}
            </AnimatePresence>
          </div>

          {/* Pagination */}
          {total > LIMIT && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-mono text-muted-foreground">
                Showing {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} of {total.toLocaleString()}
              </span>
              <div className="flex gap-2">
                <button onClick={() => update({ page: String(page - 1) })} disabled={page === 0}
                  className="text-xs font-mono px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-white hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  ← Prev
                </button>
                <button onClick={() => update({ page: String(page + 1) })} disabled={(page + 1) * LIMIT >= total}
                  className="text-xs font-mono px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-white hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
