import React, { useState, useEffect, useCallback } from "react";
import {
  Trophy, Users, CheckCircle, XCircle, Loader2,
  Search, Wifi, Lock, Unlock, AlertCircle, ChevronDown,
} from "lucide-react";
import { getApiUrl } from "@/api";

interface Club {
  tag: string;
  name: string;
  trophies: number;
  requiredTrophies?: number | null;
  memberCount: number;
  online?: number;
  type?: string | null;
  loading?: boolean;
}

interface PlayerResult {
  name: string;
  tag: string;
  trophies: number;
}

interface ClubMatch {
  club: Club;
  eligible: boolean;
  reason?: string;
}

function computeMatches(clubs: Club[], player: PlayerResult): ClubMatch[] {
  const readyClubs = clubs.filter((c) => !c.loading);
  const matches: ClubMatch[] = readyClubs.map((club) => {
    const isClosed = (club.type ?? "").toLowerCase() === "closed";
    const isFull = club.memberCount >= 30;
    const notEnoughTrophies = club.requiredTrophies != null && player.trophies < club.requiredTrophies;
    if (isClosed) return { club, eligible: false, reason: "Club is closed" };
    if (isFull)   return { club, eligible: false, reason: "Club is full (30/30)" };
    if (notEnoughTrophies)
      return {
        club, eligible: false,
        reason: `Need ${club.requiredTrophies!.toLocaleString()} trophies`,
      };
    return { club, eligible: true };
  });
  return matches.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    return b.club.trophies - a.club.trophies;
  });
}

export default function JoinSuggestion({ clubs }: { clubs: Club[] }) {
  const [tag, setTag]         = useState("");
  const [loading, setLoading] = useState(false);
  const [player, setPlayer]   = useState<PlayerResult | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [errorType, setErrorType] = useState<"rate_limited" | "not_found" | "network" | null>(null);
  const [results, setResults] = useState<ClubMatch[] | null>(null);
  const [showAll, setShowAll] = useState(false);

  const readyClubs = clubs.filter((c) => !c.loading);
  const allClubsLoading = clubs.length > 0 && readyClubs.length === 0;

  useEffect(() => {
    if (player && readyClubs.length > 0) {
      setResults(computeMatches(clubs, player));
    }
  }, [clubs, player]);

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = tag.trim();
    if (!raw) return;
    setLoading(true);
    setError(null);
    setErrorType(null);
    setPlayer(null);
    setResults(null);
    setShowAll(false);

    const encoded = encodeURIComponent(raw.startsWith("#") ? raw : `#${raw}`);
    try {
      const res = await fetch(getApiUrl(`/api/players/${encoded}`));
      if (res.status === 429) {
        setErrorType("rate_limited");
        setError("BrawlTools API daily limit reached. Try again tomorrow.");
        return;
      }
      if (res.status === 404) {
        setErrorType("not_found");
        setError("Player not found — check the tag.");
        return;
      }
      if (!res.ok) {
        setErrorType("network");
        setError("Failed to fetch player.");
        return;
      }
      const data = (await res.json()) as PlayerResult;
      setPlayer(data);
      setResults(computeMatches(clubs, data));
    } catch {
      setErrorType("network");
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [tag, clubs]);

  const eligible   = results?.filter(r => r.eligible)   ?? [];
  const ineligible = results?.filter(r => !r.eligible)  ?? [];
  const hasResults = results !== null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-white/[0.02]">
        <Search className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
            Club Join Suggester
          </h3>
          <p className="text-[10px] font-mono text-muted-foreground hidden sm:block">
            Enter your player tag to see which UPCore clubs you can join
          </p>
        </div>
        {hasResults && (
          <span className="text-[10px] font-mono text-muted-foreground shrink-0">
            {eligible.length} eligible
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Clubs warming up banner */}
        {allClubsLoading && (
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400/80 bg-amber-500/8 border border-amber-500/20 rounded-lg px-3 py-2.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            Club data is warming up (BrawlTools API resets at midnight UTC). Results may be incomplete.
          </div>
        )}

        {/* Search form */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2.5 focus-within:border-primary/40 transition-colors">
            <span className="text-muted-foreground/60 font-mono text-sm shrink-0">#</span>
            <input
              type="text"
              value={tag.replace(/^#/, "")}
              onChange={(e) => setTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              placeholder="PLAYERTAG"
              className="bg-transparent text-sm text-white placeholder-muted-foreground/40 focus:outline-none w-full font-mono tracking-widest"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !tag.trim()}
            className="px-4 py-2.5 rounded-lg bg-primary text-black text-xs font-black uppercase tracking-wider hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
          >
            {loading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Search className="w-3.5 h-3.5" />}
            {loading ? "…" : "Check"}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className={`flex items-center gap-2 text-xs font-mono border rounded-lg px-3 py-2.5 ${
            errorType === "rate_limited"
              ? "text-amber-400 bg-amber-500/8 border-amber-500/20"
              : "text-red-400 bg-red-500/8 border-red-500/20"
          }`}>
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Player found card */}
        {player && (
          <div className="flex items-center gap-3 bg-primary/5 border border-primary/15 rounded-lg px-4 py-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
              <span className="font-black text-primary text-sm">{player.name[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{player.name}</p>
              <p className="text-[10px] font-mono text-muted-foreground">{player.tag}</p>
            </div>
            <div className="flex items-center gap-1 text-yellow-300 font-mono text-sm font-bold shrink-0 tabular-nums">
              <Trophy className="w-3.5 h-3.5" />
              {player.trophies.toLocaleString()}
            </div>
          </div>
        )}

        {/* Results */}
        {hasResults && (
          <div className="space-y-2">
            {results.length === 0 ? (
              <div className="text-center py-4 text-sm font-mono text-muted-foreground border border-dashed border-border rounded-lg">
                {allClubsLoading ? "Club data still loading — try again shortly." : "No club data available yet."}
              </div>
            ) : (
              <>
                {/* Eligible clubs */}
                {eligible.length === 0 ? (
                  <div className="text-center py-4 text-sm font-mono text-muted-foreground border border-dashed border-border rounded-lg">
                    No eligible clubs found
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest px-1">
                      {eligible.length} eligible club{eligible.length !== 1 ? "s" : ""}
                    </p>
                    {eligible.map(({ club }) => (
                      <div
                        key={club.tag}
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-emerald-500/6 border border-emerald-500/20"
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold text-white truncate block">{club.name}</span>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0 text-[10px] font-mono text-muted-foreground">
                          {(club.type ?? "").toLowerCase() === "open"
                            ? <span className="flex items-center gap-0.5 text-emerald-400"><Unlock className="w-3 h-3" />Open</span>
                            : <span className="flex items-center gap-0.5 text-amber-400"><Lock className="w-3 h-3" />{club.type ?? "Invite"}</span>}
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{club.memberCount}/30</span>
                          {(club.online ?? 0) > 0 && (
                            <span className="flex items-center gap-1 text-emerald-400"><Wifi className="w-3 h-3" />{club.online}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Ineligible — collapsed by default */}
                {ineligible.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowAll(v => !v)}
                      className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/50 hover:text-muted-foreground transition-colors px-1 py-1 w-full"
                    >
                      <ChevronDown className={`w-3 h-3 transition-transform ${showAll ? "rotate-180" : ""}`} />
                      {showAll ? "Hide" : "Show"} {ineligible.length} ineligible club{ineligible.length !== 1 ? "s" : ""}
                    </button>
                    {showAll && (
                      <div className="space-y-1.5 mt-1.5">
                        {ineligible.map(({ club, reason }) => (
                          <div
                            key={club.tag}
                            className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-white/2 border border-border/40 opacity-60"
                          >
                            <XCircle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-semibold text-muted-foreground truncate block">{club.name}</span>
                              {reason && <span className="text-[10px] font-mono text-muted-foreground/50">{reason}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
