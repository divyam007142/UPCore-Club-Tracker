import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStoredToken } from "@/context/AuthContext";

interface AuditRow {
  id: string;
  adminEmail: string;
  adminName: string;
  adminDisplayName: string;
  adminProfilePicUrl: string | null;
  action: string;
  details: string;
  timestamp: string;
}

async function fetchAudit(): Promise<{ logs: AuditRow[]; total: number }> {
  const token = getStoredToken();
  const res = await fetch("/api/audit-logs?limit=300", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to load audit logs");
  return res.json();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
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

function actionMeta(action: string): { color: string; dot: string } {
  if (action.includes("add"))     return { color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/25", dot: "bg-emerald-400" };
  if (action.includes("remove"))  return { color: "text-red-400 bg-red-400/10 border-red-400/25",           dot: "bg-red-400" };
  if (action.includes("rename"))  return { color: "text-sky-400 bg-sky-400/10 border-sky-400/25",           dot: "bg-sky-400" };
  if (action.includes("repoll"))  return { color: "text-violet-400 bg-violet-400/10 border-violet-400/25",  dot: "bg-violet-400" };
  if (action.includes("toggle"))  return { color: "text-amber-400 bg-amber-400/10 border-amber-400/25",     dot: "bg-amber-400" };
  if (action.includes("profile")) return { color: "text-pink-400 bg-pink-400/10 border-pink-400/25",        dot: "bg-pink-400" };
  return { color: "text-primary bg-primary/10 border-primary/25", dot: "bg-primary" };
}

const ALL = "__all__";

function AdminPic({ name, picUrl }: { name: string; picUrl: string | null }) {
  const [err, setErr] = useState(false);
  const initial = name[0]?.toUpperCase() ?? "?";
  if (picUrl && !err) {
    return (
      <img
        src={picUrl}
        alt={name}
        onError={() => setErr(true)}
        className="w-8 h-8 rounded-full object-cover border border-primary/20 shrink-0"
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
      <span className="text-xs font-bold text-primary">{initial}</span>
    </div>
  );
}

export default function AuditLogsPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["audit-full"],
    queryFn: fetchAudit,
    refetchInterval: 30000,
  });

  const [search, setSearch]           = useState("");
  const [adminFilter, setAdminFilter] = useState(ALL);
  const [actionFilter, setActionFilter] = useState(ALL);

  const allLogs = data?.logs ?? [];
  const admins  = [...new Set(allLogs.map((r) => r.adminDisplayName || r.adminName))];
  const actions = [...new Set(allLogs.map((r) => r.action))];

  const filtered = allLogs.filter((row) => {
    const displayName = row.adminDisplayName || row.adminName;
    if (adminFilter !== ALL && displayName !== adminFilter) return false;
    if (actionFilter !== ALL && row.action !== actionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!row.details.toLowerCase().includes(q) && !displayName.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const hasFilters = search || adminFilter !== ALL || actionFilter !== ALL;

  return (
    <div className="space-y-5 max-w-4xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-xl font-black tracking-wider uppercase text-white flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-primary" />
            Audit Logs
          </h2>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            {allLogs.length} total record{allLogs.length !== 1 ? "s" : ""}
            {filtered.length !== allLogs.length && ` · ${filtered.length} shown`}
            {" "}· auto-refreshes
          </p>
        </div>
        <button
          onClick={() => void refetch()}
          disabled={isFetching}
          className="text-xs font-mono px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50 shrink-0"
        >
          {isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-[180px] bg-card border border-border rounded-lg px-3 py-2 focus-within:border-primary/40 transition-colors">
          <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm text-white placeholder-muted-foreground focus:outline-none w-full font-mono"
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X className="w-3 h-3 text-muted-foreground hover:text-white transition-colors" />
            </button>
          )}
        </div>

        <select
          value={adminFilter}
          onChange={(e) => setAdminFilter(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-primary/40 transition-colors"
        >
          <option value={ALL}>All Admins</option>
          {admins.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-primary/40 transition-colors"
        >
          <option value={ALL}>All Actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>

        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setAdminFilter(ALL); setActionFilter(ALL); }}
            className="flex items-center gap-1.5 text-xs font-mono px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-white hover:border-white/20 transition-colors"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Log list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-border rounded-xl">
          <ScrollText className="w-8 h-8 mb-3 opacity-30" />
          <p className="font-mono text-sm">No matching records.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="divide-y divide-border/50">
            {filtered.map((row) => {
              const meta = actionMeta(row.action);
              const displayName = row.adminDisplayName || row.adminName;
              return (
                <div
                  key={row.id}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-white/2 transition-colors"
                >
                  <AdminPic name={displayName} picUrl={row.adminProfilePicUrl} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">{displayName}</span>
                      {displayName !== row.adminName && (
                        <span className="text-[10px] font-mono text-muted-foreground/50">{row.adminName}</span>
                      )}
                      <span className={cn(
                        "text-[10px] font-mono px-2 py-0.5 rounded-full border",
                        meta.color,
                      )}>
                        {row.action}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 leading-snug">{row.details}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[11px] font-mono text-muted-foreground">{timeAgo(row.timestamp)}</div>
                    <div className="text-[10px] font-mono text-muted-foreground/50 mt-0.5">{formatTime(row.timestamp)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
