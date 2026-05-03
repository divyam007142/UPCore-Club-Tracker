import React, { useState } from "react";
import { useSearch, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useGetAllClubsOverview, getApiUrl } from "@/api";
import {
  Search, Trophy, Users, Crown, Star,
  Shield, Zap, Swords, Loader2, Wifi, PiggyBank, Ticket,
  Globe, Lock, Unlock, ArrowLeft, ChevronRight, BarChart2, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import JoinSuggestion from "@/components/JoinSuggestion";

// ── Types ──────────────────────────────────────────────────────────
interface Member {
  tag: string;
  name: string;
  role: string;
  trophies: number;
  nameColor?: string | null;
  iconId?: number | null;
  megaPig?: { wins: number; ticketsLeft: number } | null;
  brawlPass?: number | null;
}

interface ClubDetail {
  tag: string;
  name: string;
  description?: string | null;
  type?: string | null;
  trophies: number;
  requiredTrophies?: number | null;
  badgeId?: number | null;
  memberCount: number;
  online: number;
  regionName?: string | null;
  megaPig?: { id: number; totalWins: number; totalPlayed: number } | null;
  president?: string | null;
  members: Member[];
  stale?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────
function iconUrl(id?: number | null) {
  return id ? `https://cdn.brawlify.com/profile-icons/regular/${id}.png` : null;
}
function badgeUrl(id?: number | null) {
  return id ? `https://cdn.brawlify.com/club-badges/regular/${id}.png` : null;
}
function hexColor(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const hex = raw.replace(/^0x/i, "");
  return hex.length >= 6 ? `#${hex.slice(-6)}` : undefined;
}

const ROLE_ORDER: Record<string, number> = { president: 0, vicePresident: 1, senior: 2, member: 3 };
const ROLE_LABEL: Record<string, string> = {
  president: "President", vicePresident: "VP", senior: "Senior", member: "Member",
};
const ROLE_BADGE: Record<string, string> = {
  president:     "text-yellow-300 bg-yellow-300/10 border-yellow-300/25",
  vicePresident: "text-orange-300 bg-orange-300/10 border-orange-300/25",
  senior:        "text-sky-300 bg-sky-300/10 border-sky-300/25",
  member:        "text-muted-foreground bg-white/5 border-white/10",
};

function sortedByRole(members: Member[]) {
  return [...members].sort((a, b) => {
    const d = (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9);
    return d !== 0 ? d : b.trophies - a.trophies;
  });
}

// ── Shared image components (state-isolated) ──────────────────────
function MemberAvatar({ member, size = 8 }: { member: Member; size?: number }) {
  const [err, setErr] = useState(false);
  const url = iconUrl(member.iconId);
  const cls = `w-${size} h-${size} rounded-full shrink-0 border border-white/10 object-cover`;
  if (url && !err)
    return <img src={url} alt={member.name} onError={() => setErr(true)} className={cls} />;
  return (
    <div className={`w-${size} h-${size} rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0`}>
      <span className="text-[10px] font-bold text-primary">{member.name[0]?.toUpperCase()}</span>
    </div>
  );
}

function ClubBadge({ badgeId, name, size = 10 }: { badgeId?: number | null; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  const url = badgeUrl(badgeId);
  if (url && !err)
    return <img src={url} alt={name} onError={() => setErr(true)} className={`w-${size} h-${size} object-contain shrink-0`} />;
  return (
    <div className={`w-${size} h-${size} rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0`}>
      <Shield className="w-4 h-4 text-primary/50" />
    </div>
  );
}

// ── Stat chip ─────────────────────────────────────────────────────
function Chip({ icon: Icon, label, color = "text-muted-foreground" }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color?: string;
}) {
  return (
    <span className={cn("flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded-full bg-white/5 border border-white/10", color)}>
      <Icon className="w-3 h-3 shrink-0" />
      {label}
    </span>
  );
}

// ── Member row ────────────────────────────────────────────────────
function MemberRow({ member: m, rank }: { member: Member; rank: number }) {
  const nameColor = hexColor(m.nameColor);
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors">
      <span className="text-xs font-mono text-muted-foreground/40 w-5 text-right shrink-0">{rank}</span>
      <MemberAvatar member={m} size={8} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold truncate" style={{ color: nameColor ?? "#ffffff" }}>
            {m.name}
          </span>
          <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded border", ROLE_BADGE[m.role] ?? ROLE_BADGE.member)}>
            {ROLE_LABEL[m.role] ?? m.role}
          </span>
          {m.megaPig && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border text-pink-400 bg-pink-400/8 border-pink-400/20">
              🐷 {m.megaPig.wins}W
            </span>
          )}
          {m.brawlPass != null && m.brawlPass >= 0 && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border text-violet-400 bg-violet-400/8 border-violet-400/20 flex items-center gap-0.5">
              <Ticket className="w-2 h-2" /> Pass
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 text-yellow-300/80 font-mono text-xs shrink-0 tabular-nums">
        <Trophy className="w-2.5 h-2.5" />
        {m.trophies.toLocaleString()}
      </div>
    </div>
  );
}

// ── Club detail view ──────────────────────────────────────────────
function ClubDetailView({ tag, onBack }: { tag: string; onBack: () => void }) {
  const { data, isLoading, isError } = useQuery<ClubDetail>({
    queryKey: ["club-detail", tag],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/api/clubs/${encodeURIComponent(tag)}/overview`));
      if (!res.ok) throw new Error("Not available");
      return res.json() as Promise<ClubDetail>;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="py-16 text-center border border-border rounded-xl text-muted-foreground font-mono text-sm">
          Club data not yet available — try again in a moment.
        </div>
      </div>
    );
  }

  const sorted = sortedByRole(data.members);
  const counts = {
    president:     data.members.filter(m => m.role === "president").length,
    vicePresident: data.members.filter(m => m.role === "vicePresident").length,
    senior:        data.members.filter(m => m.role === "senior").length,
    member:        data.members.filter(m => m.role === "member").length,
  };
  const megaPigPlayers = sorted.filter(m => m.megaPig);
  const bpCount = data.members.filter(m => m.brawlPass != null && m.brawlPass >= 0).length;
  const isClosed = (data.type ?? "").toLowerCase() === "closed";
  const isOpen   = (data.type ?? "").toLowerCase() === "open";
  const mpWinRate = data.megaPig && data.megaPig.totalPlayed > 0
    ? Math.round((data.megaPig.totalWins / data.megaPig.totalPlayed) * 100)
    : 0;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground hover:text-white transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> All Clubs
      </button>

      {/* Stale data notice */}
      {data.stale && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 border border-amber-500/20 bg-amber-500/5 text-amber-400 font-mono text-xs">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          Showing last saved data — BrawlTools API daily limit active. Live data resumes after midnight UTC.
        </div>
      )}

      {/* Club hero card */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/4 to-transparent p-6">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-wrap items-start gap-5">
          <ClubBadge badgeId={data.badgeId} name={data.name} size={16} />
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-2xl sm:text-3xl font-black text-white tracking-wider">{data.name}</h2>
            <p className="text-xs font-mono text-primary/60 mt-0.5">{data.tag}</p>
            {data.description && (
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-lg">
                {data.description.replace(/<[^>]+>/g, "").trim()}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              <Chip icon={Users} label={`${data.memberCount}/30`} />
              {data.online > 0 && <Chip icon={Wifi} label={`${data.online} online`} color="text-emerald-400" />}
              {data.type && (
                <Chip
                  icon={isClosed ? Lock : isOpen ? Unlock : Lock}
                  label={data.type}
                  color={isClosed ? "text-red-400" : isOpen ? "text-emerald-400" : "text-amber-400"}
                />
              )}
              {data.regionName && <Chip icon={Globe} label={data.regionName} />}
              {bpCount > 0 && <Chip icon={Ticket} label={`${bpCount} Brawl Pass`} color="text-violet-400" />}
              {data.requiredTrophies != null && <Chip icon={BarChart2} label={`Req. ${data.requiredTrophies.toLocaleString()}`} />}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="font-display font-black text-3xl text-yellow-300 flex items-center gap-1.5 tabular-nums">
              <Trophy className="w-6 h-6" />
              {data.trophies.toLocaleString()}
            </div>
            {data.memberCount > 0 && (
              <p className="text-[11px] font-mono text-muted-foreground">
                avg {Math.round(data.trophies / data.memberCount).toLocaleString()} / member
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Trophies", val: data.trophies.toLocaleString(), color: "text-yellow-300", Icon: Trophy },
          { label: "Avg / Member",   val: data.memberCount > 0 ? Math.round(data.trophies / data.memberCount).toLocaleString() : "—", color: "text-amber-400", Icon: Zap },
          { label: "Members",        val: `${data.memberCount}/30`, color: "text-primary", Icon: Users },
          { label: "Online Now",     val: String(data.online), color: "text-emerald-400", Icon: Wifi },
        ].map(({ label, val, color, Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <div className={cn("flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest mb-2 text-muted-foreground")}>
              <Icon className={cn("w-3 h-3", color)} /> {label}
            </div>
            <div className={cn("font-display text-xl font-black tabular-nums", color)}>{val}</div>
          </div>
        ))}
      </div>

      {/* Mega Pig section */}
      {data.megaPig && (
        <div className="rounded-xl border border-pink-500/20 bg-gradient-to-br from-pink-500/10 to-transparent p-5 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <PiggyBank className="w-5 h-5 text-pink-400" />
            <h3 className="font-display text-sm font-black uppercase tracking-wider text-white">Mega Pig</h3>
            <span className="text-[10px] font-mono bg-pink-400/10 border border-pink-400/20 text-pink-400 px-2 py-0.5 rounded-full">
              Event #{data.megaPig.id}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Wins",   val: data.megaPig.totalWins,   color: "text-pink-400" },
              { label: "Played", val: data.megaPig.totalPlayed, color: "text-pink-300" },
              { label: "Rate",   val: `${mpWinRate}%`,          color: "text-pink-200" },
            ].map(({ label, val, color }) => (
              <div key={label}>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{label}</p>
                <p className={cn("font-display text-2xl font-black tabular-nums mt-0.5", color)}>{val}</p>
              </div>
            ))}
          </div>
          <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${mpWinRate}%`,
                background: mpWinRate >= 60 ? "linear-gradient(90deg,#f472b6,#ec4899)"
                  : mpWinRate >= 40 ? "linear-gradient(90deg,#fbbf24,#f59e0b)"
                  : "linear-gradient(90deg,#f87171,#ef4444)",
              }}
            />
          </div>
        </div>
      )}

      {/* Role breakdown */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <Crown className="w-3.5 h-3.5 text-yellow-300" /> Role Breakdown
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Presidents",  val: counts.president,     color: "text-yellow-300", cls: "border-yellow-300/15 bg-yellow-300/5" },
            { label: "Vice Pres.",  val: counts.vicePresident, color: "text-orange-300", cls: "border-orange-300/15 bg-orange-300/5" },
            { label: "Seniors",     val: counts.senior,        color: "text-sky-300",    cls: "border-sky-300/15 bg-sky-300/5" },
            { label: "Members",     val: counts.member,        color: "text-muted-foreground", cls: "border-border bg-white/3" },
          ].map(({ label, val, color, cls }) => (
            <div key={label} className={cn("rounded-xl border p-4", cls)}>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">{label}</p>
              <p className={cn("font-display text-3xl font-black tabular-nums", color)}>{val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Mega Pig players */}
      {megaPigPlayers.length > 0 && (
        <div className="rounded-xl border border-pink-500/15 bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-pink-500/10 flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-pink-400" />
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-white">Mega Pig Players</h3>
            <span className="text-[10px] font-mono text-muted-foreground">({megaPigPlayers.length})</span>
          </div>
          <div className="divide-y divide-border/40">
            {megaPigPlayers.map((m, i) => <MemberRow key={m.tag} member={m} rank={i + 1} />)}
          </div>
        </div>
      )}

      {/* Top 5 trophies */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Swords className="w-4 h-4 text-yellow-300" />
          <h3 className="font-display text-xs font-bold uppercase tracking-wider text-white">Top 5 by Trophies</h3>
        </div>
        <div className="divide-y divide-border/40">
          {[...data.members].sort((a, b) => b.trophies - a.trophies).slice(0, 5).map((m, i) => (
            <MemberRow key={m.tag} member={m} rank={i + 1} />
          ))}
        </div>
      </div>

      {/* All members */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="font-display text-xs font-bold uppercase tracking-wider text-white">All Members</h3>
          <span className="text-[10px] font-mono text-muted-foreground">({data.memberCount})</span>
          <div className="ml-auto h-1.5 bg-white/8 rounded-full overflow-hidden w-24">
            <div className="h-full bg-primary/50 rounded-full" style={{ width: `${(data.memberCount / 30) * 100}%` }} />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">{data.memberCount}/30</span>
        </div>
        <div className="divide-y divide-border/40 max-h-[480px] overflow-y-auto">
          {sorted.map((m, i) => <MemberRow key={m.tag} member={m} rank={i + 1} />)}
        </div>
      </div>
    </div>
  );
}

// ── Club list card ─────────────────────────────────────────────────
function ClubListCard({ club, onClick }: {
  club: {
    tag: string; name: string; trophies: number; memberCount: number; online: number;
    president?: string | null; megaPig?: { totalWins: number; totalPlayed: number } | null;
    badgeId?: number | null; requiredTrophies?: number | null; type?: string | null;
    regionName?: string | null;
  };
  onClick: () => void;
}) {
  const isClosed = (club.type ?? "").toLowerCase() === "closed";
  const isOpen   = (club.type ?? "").toLowerCase() === "open";

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border bg-card hover:border-primary/35 hover:bg-primary/4 transition-all group p-4"
    >
      <div className="flex items-center gap-3">
        <ClubBadge badgeId={club.badgeId} name={club.name} size={10} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 justify-between">
            <h3 className="font-display font-bold text-white text-sm group-hover:text-primary transition-colors truncate">
              {club.name}
            </h3>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 group-hover:translate-x-0.5" />
          </div>
          <p className="text-[10px] font-mono text-muted-foreground/50 mt-0.5">{club.tag}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 text-xs font-mono">
        <span className="flex items-center gap-1 text-yellow-300/80">
          <Trophy className="w-3 h-3" /> {club.trophies.toLocaleString()}
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Users className="w-3 h-3" /> {club.memberCount}/30
        </span>
        {club.online > 0 && (
          <span className="flex items-center gap-1 text-emerald-400">
            <Wifi className="w-3 h-3" /> {club.online}
          </span>
        )}
        {club.type && (
          <span className={cn("flex items-center gap-0.5",
            isClosed ? "text-red-400" : isOpen ? "text-emerald-400" : "text-amber-400")}>
            {isClosed ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            {club.type}
          </span>
        )}
        {club.megaPig && (
          <span className="flex items-center gap-1 text-pink-400">
            <PiggyBank className="w-3 h-3" /> {club.megaPig.totalWins}W
          </span>
        )}
        {club.regionName && (
          <span className="flex items-center gap-1 text-muted-foreground/60">
            <Globe className="w-3 h-3" /> {club.regionName}
          </span>
        )}
      </div>

      {club.president && (
        <div className="flex items-center gap-1.5 mt-2.5 text-[10px] font-mono text-muted-foreground border-t border-border/50 pt-2.5">
          <Crown className="w-3 h-3 text-yellow-300 shrink-0" />
          <span className="truncate">{club.president}</span>
        </div>
      )}
    </button>
  );
}

// ── Main page ──────────────────────────────────────────────────────
export default function LookupPage() {
  const rawSearch = useSearch();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(rawSearch.startsWith("?") ? rawSearch.slice(1) : rawSearch);
  const selectedTag = params.get("tag");

  const [filter, setFilter] = useState("");

  const { data: clubs, isLoading } = useGetAllClubsOverview({
    query: { refetchInterval: 120_000, staleTime: 60_000 },
  });

  const readyClubs = (clubs ?? []).filter((c) => !(c as any).loading);
  const allClubsLoading = !isLoading && (clubs ?? []).length > 0 && readyClubs.length === 0;

  const filtered = readyClubs.filter((c) =>
    !filter ||
    c.name?.toLowerCase().includes(filter.toLowerCase()) ||
    c.tag?.toLowerCase().includes(filter.toLowerCase()),
  );

  if (selectedTag) {
    return (
      <div className="px-4 sm:px-6 py-8">
        <ClubDetailView
          tag={selectedTag}
          onBack={() => navigate("/lookup", { replace: true })}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-black tracking-wider uppercase text-white flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" /> Club Lookup
        </h1>
        <p className="text-sm text-muted-foreground font-mono mt-1">
          Browse all UPCore clubs or search by tag — click any club for full member details.
        </p>
      </div>

      {/* Join Suggestion Tool */}
      <JoinSuggestion clubs={(clubs ?? []) as any} />

      {/* Search / filter */}
      <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2.5 focus-within:border-primary/40 transition-colors max-w-sm">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          type="text"
          placeholder="Filter clubs..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-transparent text-sm text-white placeholder-muted-foreground/50 focus:outline-none w-full font-mono"
        />
        {filter && (
          <button onClick={() => setFilter("")} className="text-muted-foreground hover:text-white transition-colors text-xs font-mono">
            ✕
          </button>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : allClubsLoading ? (
        <div className="py-16 text-center border border-amber-500/20 rounded-xl bg-amber-500/5">
          <p className="font-mono text-sm text-amber-400">⚠ Club data is warming up</p>
          <p className="font-mono text-xs text-muted-foreground mt-2">BrawlTools API daily limit reached. Data will refresh automatically after midnight UTC.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center border border-border rounded-xl text-muted-foreground">
          <p className="font-mono text-sm">No clubs found.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((club) => (
            <ClubListCard
              key={club.tag}
              club={club as any}
              onClick={() => navigate(`/lookup?tag=${encodeURIComponent(club.tag ?? "")}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
