import React, { useCallback } from "react";
import { usePageTransition } from "@/context/TransitionContext";
import { useSearch, useLocation } from "wouter";
import { useGetLogs, useGetTrackedClubs, getGetLogsQueryKey } from "../api";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Activity, Search, X, Filter, Link } from "lucide-react";

const EVENT_TYPES = ["join", "leave", "kick", "promotion", "demotion", "role_change"];
const ALL = "__all__";

function formatEventType(type: string) {
  const map: Record<string, string> = {
    join: "Join", leave: "Leave", kick: "Kick",
    promotion: "Promotion", demotion: "Demotion", role_change: "Role Change",
  };
  return map[type] ?? type;
}

function eventStyle(type: string) {
  const map: Record<string, { badge: string; dot: string }> = {
    join:        { badge: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30", dot: "bg-emerald-400" },
    leave:       { badge: "text-red-400 bg-red-400/10 border-red-400/30",             dot: "bg-red-400" },
    kick:        { badge: "text-red-500 bg-red-500/10 border-red-500/30",             dot: "bg-red-500" },
    promotion:   { badge: "text-sky-400 bg-sky-400/10 border-sky-400/30",             dot: "bg-sky-400" },
    demotion:    { badge: "text-orange-400 bg-orange-400/10 border-orange-400/30",    dot: "bg-orange-400" },
    role_change: { badge: "text-amber-400 bg-amber-400/10 border-amber-400/30",       dot: "bg-amber-400" },
  };
  return map[type] ?? { badge: "text-muted-foreground bg-muted/10 border-border", dot: "bg-muted-foreground" };
}

function formatRole(role: string | null) {
  if (!role) return null;
  const map: Record<string, string> = {
    member: "Member", senior: "Senior",
    vicePresident: "Vice President", president: "President",
  };
  return map[role] ?? role;
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

function useUrlFilters() {
  const rawSearch = useSearch();
  const [location, navigate] = useLocation();

  const search = rawSearch.startsWith("?") ? rawSearch.slice(1) : rawSearch;
  const params = new URLSearchParams(search);

  const club      = params.get("club") || ALL;
  const eventType = params.get("event") || ALL;
  const query     = params.get("q") || "";
  const page      = Math.max(0, Number(params.get("page") || "0"));

  const update = useCallback((updates: Record<string, string>) => {
    const next = new URLSearchParams(search);
    for (const [key, val] of Object.entries(updates)) {
      if (val && val !== ALL && val !== "0") {
        next.set(key, val);
      } else {
        next.delete(key);
      }
    }
    const qs = next.toString();
    navigate(location + (qs ? `?${qs}` : ""), { replace: true });
  }, [search, location, navigate]);

  const clear = useCallback(() => {
    navigate(location, { replace: true });
  }, [location, navigate]);

  return { club, eventType, query, page, update, clear };
}

export default function Logs() {
  const { club, eventType, query, page, update, clear } = useUrlFilters();
  const limit = 30;

  const { data: clubs } = useGetTrackedClubs();

  const logParams = {
    club:      club === ALL ? undefined : club,
    eventType: eventType === ALL ? undefined : eventType as "join" | "leave" | "kick" | "promotion" | "demotion" | "role_change",
    search:    query || undefined,
    limit,
    offset:    page * limit,
  };

  const { data, isLoading, refetch } = useGetLogs(logParams, {
    query: { queryKey: getGetLogsQueryKey(logParams), refetchInterval: 30000 },
  });

  const { triggerTransition } = usePageTransition();

  const logs  = data?.logs ?? [];
  const total = data?.total ?? 0;
  const hasFilters = club !== ALL || eventType !== ALL || !!query;

  const [copied, setCopied] = React.useState(false);
  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="min-w-0">
          <h1 className="font-display text-xl sm:text-2xl font-bold tracking-wider uppercase text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary shrink-0" />
            Activity Logs
          </h1>
          <p className="text-muted-foreground text-sm mt-1 font-mono">
            {total.toLocaleString()} total events &bull; auto-refreshes every 30s
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <button
            onClick={copyLink}
            title="Copy link to current filters"
            className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded border border-border text-muted-foreground hover:text-white hover:border-white/20 transition-colors"
          >
            <Link className="w-3 h-3" />
            {copied ? "Copied!" : "Share"}
          </button>
          <button
            onClick={() => { triggerTransition(1400); void refetch(); }}
            className="text-xs font-mono px-3 py-1.5 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 bg-card border border-border rounded-lg">
        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-[180px] bg-background border border-border rounded-md px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search player..."
            value={query}
            onChange={(e) => update({ q: e.target.value, page: "0" })}
            className="bg-transparent text-sm text-white placeholder-muted-foreground focus:outline-none w-full font-mono"
          />
          {query && (
            <button onClick={() => update({ q: "", page: "0" })}>
              <X className="w-3 h-3 text-muted-foreground hover:text-white" />
            </button>
          )}
        </div>

        {/* Club filter */}
        <Select value={club} onValueChange={(v) => update({ club: v, page: "0" })}>
          <SelectTrigger className="w-[180px] bg-background border-border text-white font-mono text-sm focus:ring-primary/50 focus:ring-1">
            <SelectValue placeholder="All Clubs" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border text-white font-mono">
            <SelectItem value={ALL} className="text-muted-foreground focus:bg-primary/10 focus:text-white">
              All Clubs
            </SelectItem>
            {clubs?.map((c) => (
              <SelectItem key={c.tag} value={c.tag} className="focus:bg-primary/10 focus:text-white">
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Event type filter */}
        <Select value={eventType} onValueChange={(v) => update({ event: v, page: "0" })}>
          <SelectTrigger className="w-[160px] bg-background border-border text-white font-mono text-sm focus:ring-primary/50 focus:ring-1">
            <SelectValue placeholder="All Events" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border text-white font-mono">
            <SelectItem value={ALL} className="text-muted-foreground focus:bg-primary/10 focus:text-white">
              All Events
            </SelectItem>
            {EVENT_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="focus:bg-primary/10 focus:text-white">
                {formatEventType(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <button
            onClick={clear}
            className="flex items-center gap-1.5 text-xs font-mono px-3 py-2 rounded-md border border-border text-muted-foreground hover:text-white hover:border-white/20 transition-colors"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Active filter pills */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2 -mt-3">
          {club !== ALL && (
            <span className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full">
              Club: {clubs?.find((c) => c.tag === club)?.name ?? club}
              <button onClick={() => update({ club: ALL, page: "0" })} className="hover:text-white transition-colors">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}
          {eventType !== ALL && (
            <span className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full">
              Event: {formatEventType(eventType)}
              <button onClick={() => update({ event: ALL, page: "0" })} className="hover:text-white transition-colors">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}
          {query && (
            <span className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full">
              Search: "{query}"
              <button onClick={() => update({ q: "", page: "0" })} className="hover:text-white transition-colors">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Log Feed */}
      <div className="space-y-1.5">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-md" />
            ))
          : logs.length === 0
          ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-border rounded-lg">
              <Filter className="w-8 h-8 mb-3 opacity-40" />
              <p className="font-mono text-sm">No logs match your filters</p>
              {hasFilters && (
                <button
                  onClick={clear}
                  className="mt-3 text-xs text-primary hover:underline font-mono"
                >
                  Clear filters
                </button>
              )}
            </div>
          )
          : (
            <>
              {logs.map((log, i) => {
                const style = eventStyle(log.eventType);
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-3 p-3 rounded-md bg-card border border-border hover:border-primary/20 transition-colors group"
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${style.dot} shadow-lg`} />
                    <span className={`text-xs px-2 py-0.5 rounded border font-mono font-medium shrink-0 ${style.badge}`}>
                      {formatEventType(log.eventType)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">{log.playerName}</span>
                        {log.roleFrom && log.roleTo && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {formatRole(log.roleFrom)} &rarr; {formatRole(log.roleTo)}
                          </span>
                        )}
                        {log.roleTo && !log.roleFrom && (
                          <span className="text-xs text-muted-foreground font-mono">as {formatRole(log.roleTo)}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{log.clubName}</p>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono shrink-0">{timeAgo(log.timestamp)}</span>
                  </motion.div>
                );
              })}

              {/* Pagination */}
              {total > limit && (
                <div className="flex items-center justify-between pt-4">
                  <span className="text-xs font-mono text-muted-foreground">
                    Page {page + 1} of {Math.ceil(total / limit)} &bull; {total} total
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => update({ page: String(page - 1) })}
                      disabled={page === 0}
                      className="text-xs font-mono px-3 py-1.5 rounded border border-border text-muted-foreground hover:text-white hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => update({ page: String(page + 1) })}
                      disabled={(page + 1) * limit >= total}
                      className="text-xs font-mono px-3 py-1.5 rounded border border-border text-muted-foreground hover:text-white hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
      </div>
    </div>
  );
}
