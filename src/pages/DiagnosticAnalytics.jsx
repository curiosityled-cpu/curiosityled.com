import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Users, TrendingUp, FileText, Award, Search, Lock } from "lucide-react";
import DiagnosticDetailDrawer from "@/components/diagnostic/DiagnosticDetailDrawer";

const GENERAL_LABELS = {
  signal_delay: "Early Signal Detection",
  support_friction: "Flow-of-Work Support",
  proof_defensibility: "Proof & Defensibility",
  fragmentation_admin: "System Cohesion",
  cost_of_inaction: "Proactive Cost Awareness",
};
const BPO_LABELS = {
  performance_response: "Performance Response",
  coaching_cadence: "Coaching Cadence & Quality",
  operational_control: "Operational Control",
  follow_through: "Follow-through & Accountability",
  team_stability: "Team Stability Risk",
};

function variantForSession(s) {
  return s?.construct_scores?.performance_response ? "bpo" : "general";
}
function constructLabel(key, variant) {
  return (variant === "bpo" ? BPO_LABELS : GENERAL_LABELS)[key] || key;
}
function weekKey(d) {
  const date = new Date(d);
  const day = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#EEF2FF" }}>
            <Icon className="w-5 h-5" style={{ color: "#0202ff" }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DiagnosticAnalytics() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [variantFilter, setVariantFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [sess, pros] = await Promise.all([
          base44.entities.DiagnosticSession.list("-created_date", 500),
          base44.entities.Prospect.list("-created_date", 500),
        ]);
        const pmap = {};
        pros.forEach((p) => { pmap[p.id] = p; });
        setSessions(sess.map((s) => ({ ...s, prospect: s.prospect_id ? pmap[s.prospect_id] : null })));
      } catch (e) {
        setError(e.message || "Unable to load diagnostic data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const total = sessions.length;
  const avgScore = total
    ? Math.round(sessions.reduce((a, s) => a + (s.overall_score || 0), 0) / total)
    : 0;
  const reportsGenerated = sessions.filter((s) => s.pdf_url).length;

  const bandCounts = useMemo(() => {
    const counts = {};
    sessions.forEach((s) => {
      const l = s.overall_label || "Unknown";
      counts[l] = (counts[l] || 0) + 1;
    });
    return counts;
  }, [sessions]);

  const topBand = Object.entries(bandCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  const pressureCounts = useMemo(() => {
    const counts = {};
    sessions.forEach((s) => {
      const variant = variantForSession(s);
      (s.top_2_pressure_points || []).forEach((k) => {
        const label = constructLabel(k, variant);
        counts[label] = (counts[label] || 0) + 1;
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [sessions]);

  const trendData = useMemo(() => {
    const buckets = {};
    sessions.forEach((s) => {
      const wk = weekKey(s.created_date);
      if (!buckets[wk]) buckets[wk] = { week: wk, count: 0, scoreSum: 0, scoreN: 0 };
      buckets[wk].count++;
      if (typeof s.overall_score === "number") {
        buckets[wk].scoreSum += s.overall_score;
        buckets[wk].scoreN++;
      }
    });
    return Object.values(buckets)
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-12)
      .map((b) => ({
        week: b.week.slice(5),
        completions: b.count,
        avgScore: b.scoreN ? Math.round(b.scoreSum / b.scoreN) : 0,
      }));
  }, [sessions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sessions.filter((s) => {
      if (variantFilter !== "all" && variantForSession(s) !== variantFilter) return false;
      if (!q) return true;
      const name = (s.respondent_name || s.prospect?.name || "").toLowerCase();
      const email = (s.prospect?.email || "").toLowerCase();
      const org = (s.prospect?.organization || "").toLowerCase();
      return name.includes(q) || email.includes(q) || org.includes(q);
    });
  }, [sessions, search, variantFilter]);

  const openDetail = (s) => {
    setSelected(s);
    setDrawerOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <Lock className="w-10 h-10 text-gray-400 mb-3" />
        <p className="text-lg font-semibold text-gray-800">Unable to load diagnostic data</p>
        <p className="text-sm text-gray-500 mt-1">{error}</p>
        <p className="text-xs text-gray-400 mt-3">Only Curiosity Led administrators can view diagnostic completions.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Diagnostic Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">
          All diagnostic completions and participant information. Restricted to Curiosity Led administrators.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Completions" value={total} />
        <StatCard icon={TrendingUp} label="Avg Overall Score" value={`${avgScore}/100`} />
        <StatCard icon={FileText} label="Reports Generated" value={reportsGenerated} sub={`${total - reportsGenerated} pending`} />
        <StatCard icon={Award} label="Most Common Band" value={topBand} />
      </div>

      {/* Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Completions per Week</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip />
                <Bar dataKey="completions" fill="#0202ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Avg Overall Score per Week</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip />
                <Line type="monotone" dataKey="avgScore" stroke="#0202ff" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Aggregate: bands + pressure points */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Score Band Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(bandCounts).length === 0 ? (
              <p className="text-sm text-gray-400">No data yet.</p>
            ) : (
              Object.entries(bandCounts).sort((a, b) => b[1] - a[1]).map(([label, count]) => {
                const pct = total ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{label}</span>
                      <span className="text-gray-500">{count} · {pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: "#0202ff" }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Top Pressure Points</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {pressureCounts.length === 0 ? (
              <p className="text-sm text-gray-400">No data yet.</p>
            ) : (
              pressureCounts.map(([label, count]) => {
                const pct = total ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{label}</span>
                      <span className="text-gray-500">{count} responses</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Completions table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm">All Completions ({filtered.length})</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search name, email, org…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 w-full sm:w-64"
                />
              </div>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                {["all", "general", "bpo"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setVariantFilter(v)}
                    className="px-3 h-9 text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: variantFilter === v ? "#0202ff" : "transparent",
                      color: variantFilter === v ? "#fff" : "#6b7280",
                    }}
                  >
                    {v === "all" ? "All" : v === "general" ? "Reboot" : "BPO"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Respondent</th>
                  <th className="px-4 py-3 font-medium">Organization</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Variant</th>
                  <th className="px-4 py-3 font-medium text-right">Overall</th>
                  <th className="px-4 py-3 font-medium">Band</th>
                  <th className="px-4 py-3 font-medium">PDF</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-gray-400">No completions found.</td>
                  </tr>
                ) : (
                  filtered.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => openDetail(s)}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {s.created_date ? new Date(s.created_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{s.respondent_name || s.prospect?.name || "—"}</p>
                        <p className="text-xs text-gray-500">{s.prospect?.email || ""}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{s.prospect?.organization || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{s.prospect?.role || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{variantForSession(s) === "bpo" ? "BPO" : "Reboot"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">{s.overall_score ?? 0}</td>
                      <td className="px-4 py-3 text-gray-600">{s.overall_label || "—"}</td>
                      <td className="px-4 py-3">
                        {s.pdf_url ? (
                          <a
                            href={s.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs font-medium"
                            style={{ color: "#0202ff" }}
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <DiagnosticDetailDrawer session={selected} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}