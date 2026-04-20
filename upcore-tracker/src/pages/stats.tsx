import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { useGetAllClubsOverview, useGetLogsSummary, useGetLogs } from "../api";
import { keepPreviousData } from "@tanstack/react-query";
import { BarChart2, TrendingUp, Users, Activity, Trophy, RefreshCw } from "lucide-react";
import { usePageTransition } from "@/context/TransitionContext";

const CYAN    = "hsl(199,100%,50%)";
const PURPLE  = "hsl(275,87%,65%)";
const PINK    = "hsl(340,75%,60%)";
const AMBER   = "hsl(43,74%,66%)";
const GREEN   = "hsl(145,60%,50%)";

const EVENT_COLORS: Record<string, string> = {
  join:        GREEN,
  leave:       AMBER,
  kick:        PINK,
  promotion:   CYAN,
  demotion:    PURPLE,
  role_change: "hsl(199,40%,55%)",
};

const EVENT_LABELS: Record<string, string> = {
  join: "Joins", leave: "Leaves", kick: "Kicks",
  promotion: "Promotions", demotion: "Demotions", role_change: "Role Changes",
};

const cardStyle: React.CSSProperties = {
  background: "hsl(0,0%,5%)",
  border: "1px solid hsl(0,0%,10%)",
  borderRadius: 6,
  padding: "20px 24px",
};

const tooltipStyle = {
  contentStyle: {
    background: "#0a0a0a",
    border: "1px solid hsl(199,100%,50%,0.3)",
    borderRadius: 4,
    fontFamily: "'Space Mono', monospace",
    fontSize: 11,
    color: "#ccc",
  },
  itemStyle: { color: CYAN },
  cursor: { fill: "rgba(0,200,255,0.04)" },
};

function StatCard({ label, value, sub, color = CYAN }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: "0.4em", textTransform: "uppercase", color: "hsl(0,0%,40%)" }}>{label}</span>
      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, color, lineHeight: 1 }}>{value}</span>
      {sub && <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: "hsl(0,0%,35%)" }}>{sub}</span>}
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <Icon style={{ width: 16, height: 16, color: CYAN }} />
      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, letterSpacing: "0.1em", color: "#fff" }}>{title}</span>
    </div>
  );
}

const CustomTooltipPie = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { fill: string } }[] }) => {
  if (!active || !payload?.length) return null;
  const { name, value, payload: p } = payload[0];
  return (
    <div style={{ background: "#0a0a0a", border: `1px solid ${p.fill}44`, borderRadius: 4, padding: "8px 12px", fontFamily: "'Space Mono',monospace", fontSize: 11 }}>
      <div style={{ color: p.fill, marginBottom: 2 }}>{EVENT_LABELS[name] ?? name}</div>
      <div style={{ color: "#ccc" }}>{value} events</div>
    </div>
  );
};

export default function Stats() {
  const { triggerTransition } = usePageTransition();

  const { data: clubs, isFetching: clubsFetching, refetch: refetchClubs } = useGetAllClubsOverview({
    query: { staleTime: 5 * 60 * 1000, placeholderData: keepPreviousData },
  });

  const { data: summary, isFetching: summaryFetching, refetch: refetchSummary } = useGetLogsSummary({
    query: { staleTime: 60_000 },
  });

  /* Last 14 days of logs for trend chart */
  const dateFrom = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 13);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const { data: recentLogs } = useGetLogs(
    { dateFrom, limit: 1000 },
    { query: { staleTime: 60_000 } },
  );

  const handleRefresh = () => {
    triggerTransition(1400);
    void refetchClubs();
    void refetchSummary();
  };

  /* ── Derived chart data ─────────────────────────────────────── */

  const trophyData = useMemo(
    () =>
      [...(clubs ?? [])]
        .sort((a, b) => b.trophies - a.trophies)
        .map((c) => ({ name: c.name.length > 14 ? c.name.slice(0, 14) + "…" : c.name, trophies: c.trophies, members: c.memberCount })),
    [clubs],
  );

  const memberData = useMemo(
    () =>
      [...(clubs ?? [])]
        .sort((a, b) => b.memberCount - a.memberCount)
        .map((c) => ({ name: c.name.length > 14 ? c.name.slice(0, 14) + "…" : c.name, members: c.memberCount, online: c.online })),
    [clubs],
  );

  const pieData = useMemo(() => {
    if (!summary) return [];
    return [
      { name: "join",        value: summary.joinCount },
      { name: "leave",       value: summary.leaveCount },
      { name: "kick",        value: summary.kickCount },
      { name: "promotion",   value: summary.promotionCount },
      { name: "demotion",    value: summary.demotionCount },
      { name: "role_change", value: summary.roleChangeCount },
    ].filter((d) => d.value > 0);
  }, [summary]);

  /* Group recent logs by date (last 14 days) */
  const trendData = useMemo(() => {
    const map: Record<string, { date: string; joins: number; leaves: number; kicks: number; other: number }> = {};
    const logs = recentLogs?.logs ?? [];

    /* Seed all 14 days */
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      map[key] = { date: key, joins: 0, leaves: 0, kicks: 0, other: 0 };
    }

    logs.forEach((log) => {
      const key = new Date(log.timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      if (!map[key]) return;
      if (log.eventType === "join")        map[key].joins++;
      else if (log.eventType === "leave")  map[key].leaves++;
      else if (log.eventType === "kick")   map[key].kicks++;
      else                                 map[key].other++;
    });

    return Object.values(map);
  }, [recentLogs]);

  /* Top members across all clubs by trophies */
  const topMembers = useMemo(() => {
    const all = (clubs ?? []).flatMap((c) =>
      c.members.map((m) => ({ ...m, clubName: c.name })),
    );
    return all.sort((a, b) => b.trophies - a.trophies).slice(0, 10);
  }, [clubs]);

  const isLoading = !clubs && clubsFetching;
  const isFetching = clubsFetching || summaryFetching;

  const axisStyle = { fontFamily: "'Space Mono',monospace", fontSize: 9, fill: "hsl(0,0%,40%)" };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="min-w-0">
          <h1 className="font-display text-xl sm:text-2xl font-bold tracking-wider uppercase text-white flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary shrink-0" />
            Club Statistics
          </h1>
          <p className="text-muted-foreground text-sm mt-1 font-mono">
            Analytics across all {clubs?.length ?? "—"} tracked clubs
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isFetching}
          className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors disabled:opacity-60 self-start sm:self-auto shrink-0"
        >
          <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} />
          {isFetching ? "Updating…" : "Refresh"}
        </button>
      </div>

      {/* Summary stat cards */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
          <StatCard label="Total Events"  value={summary.totalLogs.toLocaleString()} />
          <StatCard label="Today"         value={summary.todayLogs} color={CYAN} />
          <StatCard label="Joins"         value={summary.joinCount} color={GREEN} />
          <StatCard label="Leaves"        value={summary.leaveCount} color={AMBER} />
          <StatCard label="Kicks"         value={summary.kickCount} color={PINK} />
          <StatCard label="Promotions"    value={summary.promotionCount} color={PURPLE} />
        </div>
      )}

      {/* Trophy rankings + Pie side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Trophy bar */}
        <div style={cardStyle}>
          <SectionTitle icon={Trophy} title="Club Trophy Rankings" />
          {isLoading ? (
            <div style={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(0,0%,30%)", fontFamily: "'Space Mono',monospace", fontSize: 11 }}>Loading…</div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={trophyData} layout="vertical" margin={{ left: 8, right: 60, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,10%)" horizontal={false} />
                <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <YAxis type="category" dataKey="name" tick={{ ...axisStyle, fontSize: 10, fill: "hsl(0,0%,65%)" }} axisLine={false} tickLine={false} width={110} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [v.toLocaleString(), "Trophies"]} />
                <Bar dataKey="trophies" fill={CYAN} radius={[0, 3, 3, 0]} maxBarSize={16}
                  label={{ position: "right", fontFamily: "'Space Mono',monospace", fontSize: 9, fill: "hsl(0,0%,55%)",
                    formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Activity pie */}
        <div style={cardStyle}>
          <SectionTitle icon={Activity} title="Activity Breakdown" />
          {!summary ? (
            <div style={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(0,0%,30%)", fontFamily: "'Space Mono',monospace", fontSize: 11 }}>Loading…</div>
          ) : pieData.length === 0 ? (
            <div style={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(0,0%,30%)", fontFamily: "'Space Mono',monospace", fontSize: 11 }}>No events yet</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <PieChart width={260} height={260}>
                <Pie
                  data={pieData.length === 1
                    ? [...pieData, { name: "__filler__", value: 0.001 }]
                    : pieData}
                  dataKey="value" nameKey="name" cx={130} cy={130}
                  innerRadius={55} outerRadius={100} isAnimationActive={false}>
                  {(pieData.length === 1
                    ? [...pieData, { name: "__filler__", value: 0.001 }]
                    : pieData
                  ).map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.name === "__filler__" ? "transparent" : (EVENT_COLORS[entry.name] ?? CYAN)}
                      stroke={entry.name === "__filler__" ? "none" : "hsl(0,0%,5%)"}
                      strokeWidth={entry.name === "__filler__" ? 0 : 2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltipPie />} />
              </PieChart>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", justifyContent: "center", marginTop: 4, paddingBottom: 8 }}>
                {pieData.map((d) => (
                  <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'Space Mono',monospace", fontSize: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: EVENT_COLORS[d.name] ?? CYAN, flexShrink: 0 }} />
                    <span style={{ color: "hsl(0,0%,55%)" }}>{EVENT_LABELS[d.name]}</span>
                    <span style={{ color: "hsl(0,0%,80%)", fontWeight: "bold" }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 14-day trend */}
      <div style={cardStyle}>
        <SectionTitle icon={TrendingUp} title="Activity Trend — Last 14 Days" />
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trendData} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,10%)" />
            <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} interval={1} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: "hsl(0,0%,45%)" }} />
            <Line type="monotone" dataKey="joins"  stroke={GREEN}  strokeWidth={2} dot={false} name="Joins" />
            <Line type="monotone" dataKey="leaves" stroke={AMBER}  strokeWidth={2} dot={false} name="Leaves" />
            <Line type="monotone" dataKey="kicks"  stroke={PINK}   strokeWidth={2} dot={false} name="Kicks" />
            <Line type="monotone" dataKey="other"  stroke={PURPLE} strokeWidth={1.5} dot={false} name="Other" strokeDasharray="4 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Members per club */}
      <div style={cardStyle}>
        <SectionTitle icon={Users} title="Members &amp; Online per Club" />
        {isLoading ? (
          <div style={{ height: 480, display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(0,0%,30%)", fontFamily: "'Space Mono',monospace", fontSize: 11 }}>Loading…</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={480}>
              <BarChart data={memberData} layout="vertical" margin={{ left: 8, right: 56, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,10%)" horizontal={false} />
                <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ ...axisStyle, fontSize: 10, fill: "hsl(0,0%,65%)" }} axisLine={false} tickLine={false} width={116} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="members" fill={CYAN}   radius={[0,3,3,0]} maxBarSize={10} name="Members"
                  label={{ position: "right", fontFamily: "'Space Mono',monospace", fontSize: 9, fill: "hsl(0,0%,50%)" }} />
                <Bar dataKey="online"  fill={PURPLE} radius={[0,3,3,0]} maxBarSize={10} name="Online"
                  label={{ position: "right", fontFamily: "'Space Mono',monospace", fontSize: 9, fill: "hsl(0,0%,50%)" }} />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8, fontFamily: "'Space Mono',monospace", fontSize: 10 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5, color: "hsl(0,0%,55%)" }}>
                <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: CYAN }} /> Members
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5, color: "hsl(0,0%,55%)" }}>
                <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: PURPLE }} /> Online
              </span>
            </div>
          </>
        )}
      </div>

      {/* Top members table */}
      <div style={cardStyle}>
        <SectionTitle icon={Trophy} title="Top 10 Members by Trophies" />
        {isLoading ? (
          <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(0,0%,30%)", fontFamily: "'Space Mono',monospace", fontSize: 11 }}>Loading…</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Space Mono',monospace", fontSize: 10 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid hsl(0,0%,15%)" }}>
                  {["#", "Player", "Club", "Role", "Trophies"].map((h) => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "hsl(0,0%,60%)", fontWeight: "bold", letterSpacing: "0.2em", fontSize: 9, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topMembers.map((m, i) => (
                  <tr key={m.tag} style={{ borderBottom: "1px solid hsl(0,0%,7%)", transition: "background 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "hsl(0,0%,7%)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                    <td style={{ padding: "8px 12px", color: i < 3 ? CYAN : "hsl(0,0%,35%)", fontWeight: "bold" }}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </td>
                    <td style={{ padding: "8px 12px", color: "#ddd" }}>{m.name}</td>
                    <td style={{ padding: "8px 12px", color: "hsl(0,0%,45%)" }}>{m.clubName.length > 16 ? m.clubName.slice(0, 16) + "…" : m.clubName}</td>
                    <td style={{ padding: "8px 12px" }}>
                      <span style={{
                        display: "inline-block", padding: "2px 6px", borderRadius: 3, fontSize: 8,
                        background: m.role === "president" ? `${CYAN}22` : m.role === "vicePresident" ? `${PURPLE}22` : "hsl(0,0%,10%)",
                        color: m.role === "president" ? CYAN : m.role === "vicePresident" ? PURPLE : "hsl(0,0%,45%)",
                        letterSpacing: "0.25em", textTransform: "uppercase",
                      }}>
                        {m.role === "vicePresident" ? "VP" : m.role}
                      </span>
                    </td>
                    <td style={{ padding: "8px 12px", color: AMBER, fontWeight: "bold" }}>{m.trophies.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
