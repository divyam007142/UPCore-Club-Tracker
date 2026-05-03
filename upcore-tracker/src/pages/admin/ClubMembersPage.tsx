import React, { useState } from "react";
import { useGetAllClubsOverview } from "@/api";
import { Users, Trophy, Crown, Star, ChevronDown, ChevronRight, Loader2, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<string, string> = {
  president: "President",
  vicePresident: "VP",
  senior: "Senior",
  member: "Member",
};

const ROLE_COLOR: Record<string, string> = {
  president: "text-yellow-300 bg-yellow-300/10 border-yellow-300/30",
  vicePresident: "text-orange-300 bg-orange-300/10 border-orange-300/30",
  senior: "text-sky-300 bg-sky-300/10 border-sky-300/30",
  member: "text-slate-400 bg-white/5 border-white/10",
};

function roleOrder(role: string): number {
  return { president: 0, vicePresident: 1, senior: 2, member: 3 }[role] ?? 4;
}

export default function ClubMembersPage() {
  const { data: clubs, isLoading, refetch, isFetching } = useGetAllClubsOverview({
    query: { refetchInterval: 60000 },
  });

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"role" | "trophies">("role");

  const toggle = (tag: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });

  const totalMembers = clubs?.reduce((s, c) => s + (c.memberCount ?? 0), 0) ?? 0;
  const totalOnline  = clubs?.reduce((s, c) => s + (c.online ?? 0), 0) ?? 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-lg font-bold tracking-wider uppercase text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Live Members
          </h2>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            {totalMembers} members across {clubs?.length ?? 0} clubs
            {totalOnline > 0 && (
              <span className="text-emerald-400 ml-2">• {totalOnline} online now</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">Sort by:</span>
          <button
            onClick={() => setSortBy("role")}
            className={cn(
              "text-xs font-mono px-2.5 py-1 rounded border transition-colors",
              sortBy === "role"
                ? "border-primary/40 text-primary bg-primary/10"
                : "border-border text-muted-foreground hover:text-white",
            )}
          >
            Role
          </button>
          <button
            onClick={() => setSortBy("trophies")}
            className={cn(
              "text-xs font-mono px-2.5 py-1 rounded border transition-colors",
              sortBy === "trophies"
                ? "border-primary/40 text-primary bg-primary/10"
                : "border-border text-muted-foreground hover:text-white",
            )}
          >
            Trophies
          </button>
          <button
            onClick={() => void refetch()}
            disabled={isFetching}
            className="text-xs font-mono px-3 py-1.5 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            {isFetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {(clubs ?? [])
            .filter((c) => !("loading" in c && c.loading))
            .sort((a, b) => (b.trophies ?? 0) - (a.trophies ?? 0))
            .map((club) => {
              const isOpen = expanded.has(club.tag);
              const members = [...(club.members ?? [])].sort((a, b) =>
                sortBy === "role"
                  ? roleOrder(a.role) - roleOrder(b.role) || b.trophies - a.trophies
                  : b.trophies - a.trophies,
              );

              return (
                <div key={club.tag} className="bg-card border border-border rounded-xl overflow-hidden">
                  {/* Club header row */}
                  <button
                    onClick={() => toggle(club.tag)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-white/3 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-sm">{club.name}</span>
                        <span className="text-xs font-mono text-primary/70">{club.tag}</span>
                        {(club.online ?? 0) > 0 && (
                          <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                            <Wifi className="w-3 h-3" /> {club.online} online
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs font-mono text-yellow-300">
                          <Trophy className="w-3 h-3" />
                          {(club.trophies ?? 0).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                          <Users className="w-3 h-3" />
                          {club.memberCount ?? 0}/30 members
                        </span>
                        {club.president && (
                          <span className="flex items-center gap-1 text-xs font-mono text-yellow-400/70">
                            <Crown className="w-3 h-3" /> {club.president}
                          </span>
                        )}
                      </div>
                    </div>
                    {isOpen
                      ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    }
                  </button>

                  {/* Member list */}
                  {isOpen && (
                    <div className="border-t border-border">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border">
                        {members.map((m) => (
                          <div
                            key={m.tag}
                            className="flex items-center gap-3 px-4 py-2.5 bg-background/60 hover:bg-white/3 transition-colors"
                          >
                            {m.role === "president" ? (
                              <Crown className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
                            ) : m.role === "vicePresident" ? (
                              <Star className="w-3.5 h-3.5 text-orange-300 shrink-0" />
                            ) : (
                              <div className="w-3.5 h-3.5 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-white truncate block">{m.name}</span>
                              <span className="text-[10px] font-mono text-muted-foreground">{m.tag}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={cn(
                                "text-[10px] font-mono px-1.5 py-0.5 rounded border",
                                ROLE_COLOR[m.role] ?? ROLE_COLOR.member,
                              )}>
                                {ROLE_LABEL[m.role] ?? m.role}
                              </span>
                              <span className="text-xs font-mono text-yellow-300 flex items-center gap-1">
                                <Trophy className="w-3 h-3" />
                                {m.trophies.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
