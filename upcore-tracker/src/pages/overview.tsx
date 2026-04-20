import React, { useState, useEffect, useRef } from "react";
import { useGetAllClubsOverview, useGetClubOverview } from "../api";
import type { ClubOverview } from "../api";
import { keepPreviousData } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LayoutDashboard, Trophy, Users, Crown, RefreshCw,
  Globe, Shield, ChevronRight, Loader2, AlertCircle,
  Wifi, Ticket, Star,
} from "lucide-react";
import { usePageTransition } from "@/context/TransitionContext";

const OVERVIEW_REFETCH_MS = 5 * 60 * 1000;
const LOADING_RETRY_MS = 5_000;

function formatRole(role: string) {
  const map: Record<string, string> = {
    member: "Member", senior: "Senior",
    vicePresident: "VP", president: "President",
  };
  return map[role] ?? role;
}

function roleColor(role: string) {
  const map: Record<string, string> = {
    president: "text-amber-300 bg-amber-400/15 border-amber-400/40",
    vicePresident: "text-sky-300 bg-sky-400/15 border-sky-400/40",
    senior: "text-emerald-300 bg-emerald-400/15 border-emerald-400/40",
    member: "text-slate-400 bg-slate-400/10 border-slate-600",
  };
  return map[role] ?? "text-slate-400 bg-slate-400/10 border-slate-600";
}

function stripMarkup(text: string) {
  return text.replace(/<[^>]+>/g, "").trim();
}

function MegaPigWinRate({ wins, played }: { wins: number; played: number }) {
  const rate = played > 0 ? Math.round((wins / played) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-[11px] font-mono mb-1.5">
        <span className="text-slate-400">Mega Pig Win Rate</span>
        <span className="text-white font-semibold">{wins}W / {played}P — {rate}%</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${rate}%`,
            background: rate >= 60
              ? "linear-gradient(90deg,#34d399,#10b981)"
              : rate >= 40
              ? "linear-gradient(90deg,#fbbf24,#f59e0b)"
              : "linear-gradient(90deg,#f87171,#ef4444)",
          }}
        />
      </div>
    </div>
  );
}

function ClubDetailModal({
  tag, name, open, onClose,
}: {
  tag: string; name: string; open: boolean; onClose: () => void;
}) {
  const { data, isLoading, isError } = useGetClubOverview(tag, {
    query: { enabled: open },
  });
  const sortedMembers = data?.members
    ? [...data.members].sort((a, b) => b.trophies - a.trophies)
    : [];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        aria-describedby={undefined}
        className="max-w-2xl max-h-[88vh] overflow-hidden flex flex-col bg-card border-border p-0"
      >
        <div className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogHeader>
            <DialogTitle className="font-display text-white tracking-wide flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5 text-primary shrink-0" />
              <span className="truncate">{name}</span>
              {data?.tag && (
                <span className="text-xs font-mono text-primary/70 font-normal">{data.tag}</span>
              )}
            </DialogTitle>
            {data && (
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {data.regionName && (
                  <span className="flex items-center gap-1 text-xs font-mono text-slate-300">
                    <Globe className="w-3 h-3 text-slate-400" /> {data.regionName}
                  </span>
                )}
                {data.type && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-white/20 text-slate-300 uppercase">
                    {data.type}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-xs font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  <span className="text-emerald-300 font-semibold">{data.online} online</span>
                </span>
              </div>
            )}
          </DialogHeader>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-mono text-sm">Fetching live data…</span>
          </div>
        )}
        {isError && (
          <div className="flex items-center justify-center py-16 text-red-400 gap-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-mono text-sm">Failed to load club data</span>
          </div>
        )}

        {data && (
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { icon: <Trophy className="w-3.5 h-3.5 text-amber-400" />, label: "Trophies", value: data.trophies.toLocaleString() },
                { icon: <Users className="w-3.5 h-3.5 text-primary" />, label: "Members", value: `${data.memberCount} / 30` },
                { icon: <Wifi className="w-3.5 h-3.5 text-emerald-400" />, label: "Online", value: String(data.online) },
                { icon: <Trophy className="w-3.5 h-3.5 text-slate-400" />, label: "Min Trophies", value: data.requiredTrophies ? data.requiredTrophies.toLocaleString() : "—" },
              ].map(({ icon, label, value }) => (
                <div key={label} className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1.5 font-mono uppercase tracking-wide">
                    {icon} {label}
                  </div>
                  <div className="font-display font-bold text-white text-base">{value}</div>
                </div>
              ))}
            </div>

            {data.president && (
              <div className="flex items-center gap-2.5 bg-amber-400/8 border border-amber-400/30 rounded-lg px-4 py-2.5">
                <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <p className="text-[10px] font-mono text-amber-400/70 uppercase tracking-wide">President</p>
                  <p className="text-sm font-semibold text-amber-300">{data.president}</p>
                </div>
              </div>
            )}

            {data.description && (
              <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3">
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wide mb-1.5">Description</p>
                <p className="text-sm text-slate-300 leading-relaxed">{stripMarkup(data.description)}</p>
              </div>
            )}

            {data.megaPig && (
              <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 space-y-3">
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Star className="w-3 h-3 text-pink-400" /> Mega Pig Stats
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Wins", value: data.megaPig.totalWins, color: "text-emerald-400" },
                    { label: "Played", value: data.megaPig.totalPlayed, color: "text-white" },
                    {
                      label: "Win Rate",
                      value: data.megaPig.totalPlayed > 0
                        ? `${Math.round((data.megaPig.totalWins / data.megaPig.totalPlayed) * 100)}%`
                        : "—",
                      color: "text-pink-400",
                    },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="text-center">
                      <p className="text-[11px] font-mono text-slate-400 mb-1">{label}</p>
                      <p className={`text-base font-display font-bold ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
                <MegaPigWinRate wins={data.megaPig.totalWins} played={data.megaPig.totalPlayed} />
              </div>
            )}

            <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3">
              <div className="flex justify-between text-[11px] font-mono mb-2">
                <span className="text-slate-400 uppercase tracking-wide">Capacity</span>
                <span className="text-white font-semibold">{data.memberCount} / 30</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-700"
                  style={{ width: `${(data.memberCount / 30) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                <Users className="w-3 h-3" /> Members ({sortedMembers.length}) — sorted by trophies
              </p>
              <div className="space-y-1">
                {sortedMembers.map((m, i) => (
                  <div
                    key={m.tag}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-white/4 border border-white/8 hover:border-primary/30 transition-colors"
                  >
                    <span className="text-[11px] font-mono text-slate-500 w-5 text-right shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-white font-semibold truncate">{m.name}</span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-bold ${roleColor(m.role)}`}>
                          {formatRole(m.role)}
                        </span>
                        {m.brawlPass != null && m.brawlPass >= 0 && (
                          <span className="text-[9px] font-mono text-violet-300 bg-violet-400/15 border border-violet-400/30 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Ticket className="w-2.5 h-2.5" /> Pass
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">{m.tag}</span>
                    </div>
                    {m.megaPig && (
                      <div className="text-right shrink-0 space-y-0.5">
                        <p className="text-[10px] font-mono text-pink-400 font-semibold">{m.megaPig.wins} wins</p>
                        <p className="text-[10px] font-mono text-slate-400 flex items-center justify-end gap-0.5">
                          <Ticket className="w-2.5 h-2.5 shrink-0" />
                          {m.megaPig.ticketsLeft} tickets
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-1 shrink-0">
                      <Trophy className="w-2.5 h-2.5 text-amber-400" />
                      <span className="text-xs font-mono text-white font-semibold">{m.trophies.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Overview() {
  const {
    data: clubs,
    isLoading,
    refetch,
    isFetching,
    dataUpdatedAt,
  } = useGetAllClubsOverview({
    query: {
      refetchInterval: OVERVIEW_REFETCH_MS,
      placeholderData: keepPreviousData,
    },
  });

  const [selectedClub, setSelectedClub] = useState<{ tag: string; name: string } | null>(null);

  /* ── Auto-retry while any club is still loading ─────────────────── */
  const hasLoadingClubs = !!clubs?.some((c: ClubOverview & { loading?: boolean }) => c.loading);
  useEffect(() => {
    if (!hasLoadingClubs) return;
    const timer = setTimeout(() => { void refetch(); }, LOADING_RETRY_MS);
    return () => clearTimeout(timer);
  }, [hasLoadingClubs, clubs, refetch]);

  /* ── Refresh-button overlay ──────────────────────────────────────── */
  const { triggerTransition } = usePageTransition();
  const manualRefreshing = useRef(false);

  const handleRefresh = () => {
    if (isFetching) return;
    manualRefreshing.current = true;
    triggerTransition(1400);
    void refetch();
  };

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  const isAutoRefreshing = isFetching && !isLoading && !manualRefreshing.current;

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-wider uppercase text-white flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-primary" />
              Club Overview
            </h1>
            <p className="text-slate-400 text-sm mt-1 font-mono flex items-center gap-2 flex-wrap">
              <span>{clubs?.length ?? "—"} clubs · auto-refreshes every 5 min</span>
              {isAutoRefreshing && (
                <span className="flex items-center gap-1 text-primary/80">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Updating…
                </span>
              )}
              {!isAutoRefreshing && lastUpdated && (
                <span className="text-slate-500">updated {lastUpdated}</span>
              )}
              {hasLoadingClubs && !isFetching && (
                <span className="flex items-center gap-1 text-amber-400/80 text-xs">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading remaining clubs…
                </span>
              )}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Updating…" : "Refresh"}
          </button>
        </div>

        {/* Club Cards Grid — no opacity changes, no jitter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-52 rounded-xl" />
              ))
            : clubs?.map((club: ClubOverview & { loading?: boolean }) => {
                if (club.loading) {
                  return (
                    <div key={club.tag} className="bg-card border border-white/10 rounded-xl p-5 space-y-3 animate-pulse">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3.5 bg-white/10 rounded w-3/5" />
                          <div className="h-2.5 bg-white/6 rounded w-1/3" />
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <div className="h-5 w-10 bg-white/8 rounded-full" />
                        <div className="h-5 w-16 bg-white/8 rounded-full" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-14 bg-white/6 rounded-lg" />
                        <div className="h-14 bg-white/6 rounded-lg" />
                      </div>
                      <div className="h-8 bg-white/6 rounded-lg" />
                      <div className="h-8 bg-amber-400/6 border border-amber-400/10 rounded-lg" />
                      <div className="h-1 bg-white/10 rounded-full mt-1" />
                    </div>
                  );
                }
                return (
                  <div
                    key={club.tag}
                    onClick={() => setSelectedClub({ tag: club.tag, name: club.name })}
                    className="bg-card border border-white/10 rounded-xl p-5 hover:border-primary/50 hover:bg-card/80 transition-all group relative overflow-hidden cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display font-bold text-white text-sm tracking-wide group-hover:text-primary transition-colors truncate">
                          {club.name}
                        </h3>
                        <p className="text-[11px] font-mono text-primary/70 mt-0.5">{club.tag}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                    </div>

                    <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                      {club.regionName && (
                        <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/8 border border-white/15 text-slate-300">
                          <Globe className="w-2.5 h-2.5 text-slate-400" /> {club.regionName}
                        </span>
                      )}
                      {club.type && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-white/15 text-slate-300 uppercase bg-white/8">
                          {club.type}
                        </span>
                      )}
                      {club.online > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-400/12 border border-emerald-400/30 text-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {club.online} online
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-white/6 rounded-lg p-2.5 border border-white/10">
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1 font-mono uppercase tracking-wide">
                          <Trophy className="w-2.5 h-2.5 text-amber-400" /> Trophies
                        </div>
                        <div className="font-display font-bold text-white text-base leading-none">
                          {club.trophies.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-white/6 rounded-lg p-2.5 border border-white/10">
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1 font-mono uppercase tracking-wide">
                          <Users className="w-2.5 h-2.5 text-primary" /> Members
                        </div>
                        <div className="font-display font-bold text-white text-base leading-none">
                          {club.memberCount}
                          <span className="text-[11px] text-slate-400 font-mono font-normal"> / 30</span>
                        </div>
                      </div>
                    </div>

                    {club.megaPig && (
                      <div className="bg-white/6 border border-white/10 rounded-lg px-2.5 py-2 mb-3 flex items-center gap-2">
                        <Star className="w-3 h-3 text-pink-400 shrink-0" />
                        <span className="text-[10px] font-mono text-slate-400 flex-1">Mega Pig</span>
                        <span className="text-xs font-mono text-emerald-400 font-bold">{club.megaPig.totalWins}W</span>
                        <span className="text-[10px] font-mono text-slate-400">/ {club.megaPig.totalPlayed}P</span>
                        <span className="text-[11px] font-mono text-pink-400 font-bold">
                          {club.megaPig.totalPlayed > 0
                            ? `${Math.round((club.megaPig.totalWins / club.megaPig.totalPlayed) * 100)}%`
                            : "—"}
                        </span>
                      </div>
                    )}

                    {club.president && (
                      <div className="flex items-center gap-1.5 text-[11px] bg-amber-400/8 border border-amber-400/25 rounded-lg px-2.5 py-1.5">
                        <Crown className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                        <span className="text-amber-300 font-mono font-semibold truncate flex-1">{club.president}</span>
                        <span className="text-slate-500 font-mono shrink-0 text-[10px]">President</span>
                      </div>
                    )}

                    <div className="mt-3">
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-700"
                          style={{ width: `${(club.memberCount / 30) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
        </div>

        {selectedClub && (
          <ClubDetailModal
            tag={selectedClub.tag}
            name={selectedClub.name}
            open={!!selectedClub}
            onClose={() => setSelectedClub(null)}
          />
        )}
      </div>
    </>
  );
}
