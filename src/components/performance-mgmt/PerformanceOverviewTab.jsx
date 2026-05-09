import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Target, TrendingUp, CheckCircle2, AlertTriangle, Clock, Users, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";
import { toast } from "sonner";

const STATUS_COLORS = {
  active: "#0202ff",
  completed: "#00C875",
  draft: "#C4C4C4",
};

const CHART_COLORS = ["#0202ff", "#00C875", "#FFCB00", "#E2445C", "#A25DDC"];

function KPICard({ label, value, sub, icon: Icon, color }) { // Icon is the destructured prop
  return (
    <Card className="border border-gray-100 shadow-sm rounded-2xl">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PerformanceOverviewTab({ user }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const allGoals = await base44.entities.Goal.filter({ client_id: user.client_id });
      setGoals(allGoals);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await base44.functions.invoke("exportGoalsAnalyticsPDF", { client_id: user.client_id });
      if (res.data?.url) window.open(res.data.url, "_blank");
      else toast.success("Export triggered");
    } catch {
      toast.error("Export failed");
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" /></div>;
  }

  const total = goals.length;
  const completed = goals.filter(g => g.status === "completed").length;
  const active = goals.filter(g => g.status === "active").length;
  const draft = goals.filter(g => g.status === "draft").length;
  const overdue = goals.filter(g => {
    if (!g.timeframe_end || g.status === "completed") return false;
    return new Date(g.timeframe_end) < new Date();
  }).length;
  const onTrack = active - overdue;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Progress distribution
  const avgProgress = goals.length > 0
    ? Math.round(goals.reduce((sum, g) => sum + (g.progress || 0), 0) / goals.length)
    : 0;

  // Pie chart data
  const pieData = [
    { name: "Completed", value: completed },
    { name: "On Track", value: onTrack > 0 ? onTrack : 0 },
    { name: "Overdue", value: overdue },
    { name: "Draft", value: draft },
  ].filter(d => d.value > 0);

  const pieColors = ["#00C875", "#0202ff", "#E2445C", "#C4C4C4"];

  // Monthly trend (last 6 months) — goals created per month
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(new Date(), 5 - i);
    const monthStart = startOfMonth(month);
    const label = format(month, "MMM");
    const count = goals.filter(g => {
      const d = new Date(g.created_date);
      return d.getMonth() === monthStart.getMonth() && d.getFullYear() === monthStart.getFullYear();
    }).length;
    const done = goals.filter(g => {
      if (g.status !== "completed" || !g.updated_date) return false;
      const d = new Date(g.updated_date);
      return d.getMonth() === monthStart.getMonth() && d.getFullYear() === monthStart.getFullYear();
    }).length;
    return { month: label, Created: count, Completed: done };
  });

  // Goal type breakdown
  const typeBreakdown = ["standard", "okr_objective", "coaching_goal", "action_item"].map(type => ({
    name: type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
    value: goals.filter(g => g.goal_type === type).length,
  })).filter(d => d.value > 0);

  // At-risk participants
  const atRiskGoals = goals.filter(g => {
    if (!g.timeframe_end || g.status === "completed") return false;
    return new Date(g.timeframe_end) < new Date();
  }).slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
          <Download className="w-4 h-4" /> Export PDF
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Total Goals" value={total} sub="Across organization" icon={Target} color="#0202ff" />
        <KPICard label="Completion Rate" value={`${completionRate}%`} sub={`${completed} completed`} icon={CheckCircle2} color="#00C875" />
        <KPICard label="Overdue" value={overdue} sub="Past due date" icon={AlertTriangle} color="#E2445C" />
        <KPICard label="Avg Progress" value={`${avgProgress}%`} sub="Across active goals" icon={TrendingUp} color="#A25DDC" />
      </div>

      {/* Status summary badges */}
      <div className="flex flex-wrap gap-3">
        <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-sm py-1 px-3">{active} Active</Badge>
        <Badge className="bg-green-50 text-green-700 border border-green-200 text-sm py-1 px-3">{completed} Completed</Badge>
        <Badge className="bg-red-50 text-red-700 border border-red-200 text-sm py-1 px-3">{overdue} Overdue</Badge>
        <Badge className="bg-gray-50 text-gray-700 border border-gray-200 text-sm py-1 px-3">{draft} Draft</Badge>
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Monthly trend */}
        <Card className="border border-gray-100 shadow-sm rounded-2xl">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Goal Activity (Last 6 Months)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} barSize={14} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="Created" fill="#0202ff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Completed" fill="#00C875" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 justify-center">
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 rounded-sm bg-[#0202ff] inline-block" /> Created</span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 rounded-sm bg-[#00C875] inline-block" /> Completed</span>
            </div>
          </CardContent>
        </Card>

        {/* Status pie */}
        <Card className="border border-gray-100 shadow-sm rounded-2xl">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Goal Status Breakdown</h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-44 text-gray-400 text-sm">No goal data yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Goal type breakdown */}
      {typeBreakdown.length > 0 && (
        <Card className="border border-gray-100 shadow-sm rounded-2xl">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Goals by Type</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={typeBreakdown} layout="vertical" barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={130} />
                <Tooltip />
                <Bar dataKey="value" fill="#0202ff" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* At-risk goals */}
      {atRiskGoals.length > 0 && (
        <Card className="border border-red-100 shadow-sm rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-semibold text-gray-800">Overdue Goals</h3>
              <Badge className="bg-red-50 text-red-600 border border-red-200 text-xs ml-auto">{overdue} total</Badge>
            </div>
            <div className="space-y-2">
              {atRiskGoals.map(g => (
                <div key={g.id} className="flex items-center justify-between py-2 px-3 bg-red-50/50 rounded-lg border border-red-100">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{g.title}</p>
                    <p className="text-xs text-gray-500">
                      {g.assigned_to_emails?.[0] || g.created_by || "—"}
                      {g.timeframe_end && ` · Due ${format(new Date(g.timeframe_end), "MMM d, yyyy")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    <span className="text-xs font-semibold text-red-600">{g.progress || 0}%</span>
                    <Badge className="bg-red-100 text-red-700 border-none text-xs">Overdue</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}