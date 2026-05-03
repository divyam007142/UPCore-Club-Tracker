import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getStoredToken } from "@/context/AuthContext";
import {
  CheckCircle2, XCircle, AlertCircle, Database, Globe, Radio,
  Clock, Activity, RefreshCw, Server, Trophy, ScrollText, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ApiStatus {
  status: "ok" | "degraded";
  uptimeSeconds: number;
  db: { connected: boolean; trackedClubs: number; totalLogs: number };
  brawlTools: { reachable: boolean; latencyMs: number | null };
  poller: { clubsInCache: number; trackedClubs: number; allCached: boolean; pollIntervalSeconds: number };
}

async function fetchStatus(): Promise<ApiStatus> {
  const token = getStoredToken();
  const res = await fetch("/api/api-status", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to fetch status");
  return res.json();
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function StatusIcon({ ok, size = 4 }: { ok: boolean; size?: number }) {
  if (ok) return <CheckCircle2 className={`w-${size} h-${size} text-emerald-400 shrink-0`} />;
  return <XCircle className={`w-${size} h-${size} text-red-400 shrink-0`} />;
}

function StatusBadge({ ok, label }: { ok: boolean; label?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border uppercase tracking-widest",
      ok
        ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
        : "text-red-400 bg-red-400/10 border-red-400/20",
    )}>
      {ok ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
      {label ?? (ok ? "Online" : "Offline")}
    </span>
  );
}

function CheckRow({
  icon: Icon, label, value, ok, detail, color = "text-primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  ok: boolean;
  detail?: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-border/50 last:border-0 hover:bg-white/2 transition-colors">
      <div className={cn("w-8 h-8 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center shrink-0")}>
        <Icon className={cn("w-4 h-4", color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-white">{label}</span>
          {detail && <span className="text-[11px] font-mono text-muted-foreground">{detail}</span>}
        </div>
        <p className={cn("text-xs font-mono mt-0.5", ok ? "text-emerald-400" : "text-red-400")}>{value}</p>
      </div>
      <StatusIcon ok={ok} />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, bg, border }: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <div className={cn("rounded-xl border p-4 bg-gradient-to-br to-transparent", bg, border)}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className={cn("w-4 h-4 shrink-0", color)} />
      </div>
      <div className={cn("font-display text-2xl font-black tabular-nums", color)}>{value}</div>
    </div>
  );
}

export default function SystemStatusPage() {
  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useQuery<ApiStatus>({
    queryKey: ["admin-status"],
    queryFn: fetchStatus,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const allOk = data
    ? data.db.connected && data.brawlTools.reachable && data.poller.allCached
    : false;

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : "—";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {isLoading ? (
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Checking…</span>
              ) : isError ? (
                <span className="flex items-center gap-1.5 text-[10px] font-mono text-red-400 uppercase tracking-widest">
                  <AlertCircle className="w-3 h-3" /> Error fetching status
                </span>
              ) : (
                <>
                  <span className="flex h-1.5 w-1.5 relative">
                    <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", allOk ? "bg-emerald-400" : "bg-red-400")} />
                    <span className={cn("relative inline-flex rounded-full h-1.5 w-1.5", allOk ? "bg-emerald-400" : "bg-red-400")} />
                  </span>
                  <span className={cn("text-[10px] font-mono uppercase tracking-widest", allOk ? "text-emerald-400" : "text-red-400")}>
                    {allOk ? "All systems operational" : "Degraded — check below"}
                  </span>
                </>
              )}
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-black text-white tracking-wider uppercase">
              System Status
            </h2>
            <p className="text-sm text-muted-foreground font-mono mt-1.5 max-w-sm">
              Real-time health of every subsystem powering the tracker.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
              <Server className="w-6 h-6 text-primary" />
            </div>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground hover:text-white transition-colors uppercase tracking-widest"
            >
              <RefreshCw className={cn("w-3 h-3", isFetching && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground/50 mt-4 relative">
          Last checked: {lastUpdated} · Auto-refreshes every 30s
        </p>
      </div>

      {/* Stat cards */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Uptime"
            value={formatUptime(data.uptimeSeconds)}
            icon={Clock}
            color="text-primary"
            bg="from-primary/10"
            border="border-primary/15"
          />
          <StatCard
            label="Tracked Clubs"
            value={data.db.trackedClubs}
            icon={Trophy}
            color="text-yellow-300"
            bg="from-yellow-500/10"
            border="border-yellow-500/15"
          />
          <StatCard
            label="Clubs Cached"
            value={`${data.poller.clubsInCache}/${data.poller.trackedClubs}`}
            icon={Radio}
            color="text-emerald-400"
            bg="from-emerald-500/10"
            border="border-emerald-500/15"
          />
          <StatCard
            label="Total Logs"
            value={data.db.totalLogs.toLocaleString()}
            icon={ScrollText}
            color="text-violet-400"
            bg="from-violet-500/10"
            border="border-violet-500/15"
          />
        </div>
      )}

      {/* Subsystem checks */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="font-display text-sm uppercase tracking-wider text-white">Subsystem Health</h3>
          {data && (
            <StatusBadge ok={allOk} label={allOk ? "All Good" : "Issues Detected"} />
          )}
        </div>

        {isLoading ? (
          <div className="divide-y divide-border/50">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/8 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/10 rounded w-32 animate-pulse" />
                  <div className="h-2 bg-white/5 rounded w-20 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="px-5 py-10 text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <p className="text-sm font-mono text-muted-foreground">Could not reach the backend API.</p>
            <p className="text-xs font-mono text-muted-foreground/60 mt-1">Ensure the API server workflow is running.</p>
          </div>
        ) : data ? (
          <div>
            <CheckRow
              icon={Server}
              label="API Server"
              value="Running and responding"
              ok={true}
              detail="Backend Express server"
              color="text-primary"
            />
            <CheckRow
              icon={Database}
              label="Database (MongoDB)"
              value={data.db.connected ? "Connected" : "Connection failed"}
              ok={data.db.connected}
              detail={data.db.connected ? `${data.db.trackedClubs} clubs · ${data.db.totalLogs.toLocaleString()} logs` : "Check DB connection string"}
              color="text-sky-400"
            />
            <CheckRow
              icon={Globe}
              label="BrawlTools API"
              value={data.brawlTools.reachable
                ? `Reachable — ${data.brawlTools.latencyMs}ms`
                : "Unreachable"}
              ok={data.brawlTools.reachable}
              detail="https://api.brawltools.net"
              color="text-amber-400"
            />
            <CheckRow
              icon={Radio}
              label="Club Poller"
              value={data.poller.allCached
                ? `All ${data.poller.trackedClubs} clubs cached`
                : data.poller.clubsInCache === 0
                  ? "Warming up — no clubs cached yet"
                  : `${data.poller.clubsInCache}/${data.poller.trackedClubs} clubs cached (still warming)`}
              ok={data.poller.allCached}
              detail={`Runs every ${data.poller.pollIntervalSeconds / 60}min`}
              color="text-emerald-400"
            />
            <CheckRow
              icon={Zap}
              label="Data Flow"
              value={data.db.totalLogs > 0
                ? `${data.db.totalLogs.toLocaleString()} events logged — data is flowing`
                : "No events yet — poller may still be on first run"}
              ok={data.db.totalLogs > 0}
              detail="Member joins, leaves, promotions"
              color="text-violet-400"
            />
          </div>
        ) : null}
      </div>

      {/* Info cards */}
      {data && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h4 className="font-display text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-primary" /> Server Uptime
            </h4>
            <p className="font-display text-3xl font-black text-white tabular-nums">
              {formatUptime(data.uptimeSeconds)}
            </p>
            <p className="text-[11px] font-mono text-muted-foreground">
              API server has been running continuously for this duration since last restart.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h4 className="font-display text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-emerald-400" /> Poller Status
            </h4>
            <div className="flex items-end gap-2">
              <p className="font-display text-3xl font-black text-white tabular-nums">
                {data.poller.clubsInCache}
              </p>
              <p className="font-display text-lg font-black text-muted-foreground mb-0.5">
                / {data.poller.trackedClubs}
              </p>
            </div>
            <p className="text-[11px] font-mono text-muted-foreground">
              Clubs fully cached in memory. Poller runs every {data.poller.pollIntervalSeconds / 60} minutes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
