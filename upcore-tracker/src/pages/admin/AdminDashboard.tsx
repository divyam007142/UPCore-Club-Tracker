import React from "react";
import { Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useGetTrackedClubs, useGetLogsSummary, getApiUrl } from "@/api";
import { useQuery } from "@tanstack/react-query";
import {
  Users, Activity, ScrollText, Settings as SettingsIcon, Trophy,
  ArrowRight, TrendingUp, Radio, UserCircle, Server,
} from "lucide-react";
import { getStoredToken } from "@/lib/auth-utils";

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

async function fetchRecentAudit(): Promise<{ logs: AuditRow[]; total: number }> {
  const token = getStoredToken();
  const res = await fetch(getApiUrl("/api/audit-logs?limit=6"), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to load audit logs");
  return res.json();
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

function actionLabel(action: string): { text: string; color: string } {
  if (action.includes("add"))     return { text: action, color: "#4ade80" };
  if (action.includes("remove"))  return { text: action, color: "#f87171" };
  if (action.includes("rename"))  return { text: action, color: "#38bdf8" };
  if (action.includes("repoll"))  return { text: action, color: "#a78bfa" };
  if (action.includes("toggle"))  return { text: action, color: "#fbbf24" };
  if (action.includes("profile")) return { text: action, color: "#f472b6" };
  return { text: action, color: "#fff" };
}

function AdminPicSmall({ name, picUrl }: { name: string; picUrl: string | null }) {
  const [err, setErr] = React.useState(false);
  const initial = name[0]?.toUpperCase() ?? "?";
  if (picUrl && !err) {
    return (
      <img src={picUrl} alt={name} onError={() => setErr(true)}
        className="w-7 h-7 object-cover border border-white/15 shrink-0" style={{ borderRadius: 0 }} />
    );
  }
  return (
    <div className="w-7 h-7 bg-white flex items-center justify-center shrink-0">
      <span className="text-[10px] font-black text-black">{initial}</span>
    </div>
  );
}

export default function AdminDashboard() {
  const { admin } = useAuth();
  const { data: clubs } = useGetTrackedClubs();
  const { data: summary } = useGetLogsSummary();
  const { data: audit } = useQuery({
    queryKey: ["audit-recent"],
    queryFn: fetchRecentAudit,
    refetchInterval: 30000,
  });

  const enabledCount = clubs?.filter((c) => c.loggingEnabled).length ?? 0;
  const displayName = admin?.displayName || admin?.name;
  const firstName = displayName?.split(" ")[0] ?? "Admin";

  return (
    <div className="space-y-8 max-w-4xl">

      {/* ── Welcome banner ── */}
      <div className="border border-white/10 p-6" style={{ background: "#000" }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[9px] font-mono text-white/30 uppercase tracking-[0.4em] mb-2">
              ● System Online · Admin Access Active
            </p>
            <h1
              className="text-white uppercase leading-none"
              style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "clamp(1.8rem, 4vw, 2.6rem)", letterSpacing: "0.08em" }}
            >
              Welcome Back, {firstName}
            </h1>
            <p className="text-xs font-mono text-white/35 mt-2">
              All actions are logged to the audit trail. Full access granted.
            </p>
          </div>
          <div className="shrink-0 hidden sm:block">
            <img src="/upcore-logo-nobg.png" alt="UPCore" className="w-12 h-12 object-contain opacity-60" style={{ filter: "brightness(0) invert(1)" }} />
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Tracked Clubs"  value={clubs?.length ?? "—"}     icon={Trophy}     />
        <StatCard label="Logging Active" value={enabledCount}              icon={Radio}      />
        <StatCard label="Total Events"   value={summary?.totalLogs ?? "—"} icon={Activity}   />
        <StatCard label="Today's Events" value={summary?.todayLogs ?? "—"} icon={TrendingUp} />
      </div>

      {/* ── Quick actions ── */}
      <div>
        <p className="text-[8px] font-mono text-white/25 uppercase tracking-[0.4em] mb-3">Quick Access</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <QuickLink href="/admin/settings" icon={SettingsIcon} title="Clubs"      sub="Manage tracked clubs"    />
          <QuickLink href="/admin/members"  icon={Users}        title="Members"    sub="Live member roster"       />
          <QuickLink href="/admin/audit"    icon={ScrollText}   title="Audit"      sub="Full action history"      />
          <QuickLink href="/admin/status"   icon={Server}       title="Status"     sub="System health & uptime"   />
          <QuickLink href="/admin/profile"  icon={UserCircle}   title="Profile"    sub="Edit name & avatar"       />
        </div>
      </div>

      {/* ── Recent activity ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[8px] font-mono text-white/25 uppercase tracking-[0.4em]">Recent Activity</p>
          <Link href="/admin/audit">
            <span className="text-[9px] font-mono text-white/40 hover:text-white transition-colors cursor-pointer flex items-center gap-1 uppercase tracking-widest">
              View all <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
        </div>

        <div className="border border-white/10" style={{ background: "#000" }}>
          {!audit || audit.logs.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-xs font-mono text-white/25 uppercase tracking-widest">No admin actions yet.</p>
            </div>
          ) : (
            <div>
              {audit.logs.map((row, i) => {
                const { text, color } = actionLabel(row.action);
                const name = row.adminDisplayName || row.adminName;
                return (
                  <div
                    key={row.id}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/3"
                    style={{ borderBottom: i < audit.logs.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
                  >
                    <AdminPicSmall name={name} picUrl={row.adminProfilePicUrl} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-mono text-white">{name}</span>
                        <span
                          className="text-[9px] font-mono px-2 py-px border uppercase tracking-wider"
                          style={{ color, borderColor: color + "40", background: color + "10" }}
                        >
                          {text}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-white/30 mt-0.5 truncate">{row.details}</p>
                    </div>
                    <span className="text-[10px] font-mono text-white/20 shrink-0 tabular-nums whitespace-nowrap">
                      {timeAgo(row.timestamp)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/6 pt-4">
        <p className="text-[8px] font-mono text-white/15 uppercase tracking-[0.4em]">#RISEUP · UPCore Club Tracker · Admin Control Panel</p>
      </div>

    </div>
  );
}

function StatCard({ label, value, icon: Icon }: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div
      className="border border-white/10 p-4 hover:border-white/25 transition-colors"
      style={{ background: "#000" }}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-[8px] font-mono text-white/30 uppercase tracking-[0.3em] leading-tight">
          {label}
        </span>
        <Icon className="w-3.5 h-3.5 text-white/25 shrink-0" />
      </div>
      <div
        className="text-white tabular-nums"
        style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "2.2rem", lineHeight: 1, letterSpacing: "0.04em" }}
      >
        {value}
      </div>
    </div>
  );
}

function QuickLink({ href, icon: Icon, title, sub }: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  sub: string;
}) {
  return (
    <Link href={href}>
      <div
        className="group border border-white/10 p-4 cursor-pointer hover:border-white/30 hover:bg-white/3 transition-all"
        style={{ background: "#000" }}
      >
        <div className="flex items-center justify-between mb-2">
          <Icon className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
          <ArrowRight className="w-3 h-3 text-white/20 group-hover:text-white/60 transition-colors" />
        </div>
        <div
          className="text-white uppercase"
          style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "1rem", letterSpacing: "0.1em" }}
        >
          {title}
        </div>
        <p className="text-[10px] font-mono text-white/30 mt-0.5">{sub}</p>
      </div>
    </Link>
  );
}
