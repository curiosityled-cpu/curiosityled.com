import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Users, Target, BookOpen, Brain, Loader2, Search, Filter,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, ChevronDown, ChevronUp
} from "lucide-react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
} from "recharts";
import { subDays, isAfter, isBefore, format } from "date-fns";

const COMPETENCY_LABELS = {
  dm: "Decision Making", si: "Situational Intelligence",
  comm: "Communication", rm: "Resource Management",
  sm: "Stakeholder Management", pm: "Performance Management"
};

const INDUSTRY_BENCHMARKS = {
  dm: 77, si: 75, comm: 78, rm: 78, sm: 79, pm: 76
};

function CompetencyGapBar({ label, score, benchmark }) {
  const gap = score - benchmark;
  const isPositive = gap >= 0;
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-xs text-gray-600 w-36 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2 relative">
        <div
          className={`h-2 rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-red-400'}`}
          style={{ width: `${Math.min(100, score)}%` }}
        />
        <div
          className="absolute top-0 h-2 w-0.5 bg-gray-500"
          style={{ left: `${benchmark}%` }}
          title={`Benchmark: ${benchmark}%`}
        />
      </div>
      <span className={`text-xs font-semibold w-12 text-right ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
        {isPositive ? '+' : ''}{gap}%
      </span>
    </div>
  );
}

function LeaderRow({ assessment, allUsers, isExpanded, onToggle }) {
  const email = assessment.email ?? assessment.data?.email;
  const userData = allUsers.find(u => u.email === email);
  const name = userData?.full_name || email?.split('@')[0] || 'Unknown';
  const overall = assessment.overall_pct ?? assessment.data?.overall_pct ?? 0;
  const archetype = assessment.archetype_label ?? assessment.data?.archetype_label ?? assessment.record?.archetype_label ?? '—';

  const riskLevel = overall < 60 ? 'high' : overall < 75 ? 'medium' : 'low';
  const riskConfig = {
    high: "bg-red-100 text-red-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-green-100 text-green-700"
  };

  const competencies = Object.entries(COMPETENCY_LABELS).map(([key, label]) => ({
    key, label,
    score: Math.round(assessment[`${key}_pct`] ?? assessment.data?.[`${key}_pct`] ?? 0),
    benchmark: INDUSTRY_BENCHMARKS[key]
  }));

  return (
    <>
      <tr
        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <td className="py-3 px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700">
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-medium text-sm text-gray-900">{name}</div>
              <div className="text-xs text-gray-400">{email}</div>
            </div>
          </div>
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-gray-100 rounded-full">
              <div
                className={`h-1.5 rounded-full ${overall >= 85 ? 'bg-emerald-500' : overall >= 70 ? 'bg-blue-500' : overall >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                style={{ width: `${overall}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-800">{overall}%</span>
          </div>
        </td>
        <td className="py-3 px-4">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${riskConfig[riskLevel]}`}>
            {riskLevel === 'high' ? 'At Risk' : riskLevel === 'medium' ? 'Developing' : 'Strong'}
          </span>
        </td>
        <td className="py-3 px-4 text-xs text-gray-600">{archetype}</td>
        <td className="py-3 px-4 text-gray-400">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-indigo-50/40">
          <td colSpan={5} className="px-6 py-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-3">Competency Scores vs. Benchmarks</p>
                {competencies.map(c => (
                  <CompetencyGapBar key={c.key} label={c.label} score={c.score} benchmark={c.benchmark} />
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-3">Development Recommendations</p>
                <div className="space-y-2">
                  {competencies
                    .filter(c => c.score < c.benchmark)
                    .sort((a, b) => (a.score - a.benchmark) - (b.score - b.benchmark))
                    .slice(0, 3)
                    .map(c => (
                      <div key={c.key} className="flex items-start gap-2 p-2 bg-white rounded-lg border border-amber-100">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-xs font-medium text-gray-800">{c.label}</span>
                          <span className="text-xs text-gray-500 ml-1">is {Math.abs(c.score - c.benchmark)}% below benchmark — prioritize in development plan.</span>
                        </div>
                      </div>
                    ))}
                  {competencies.filter(c => c.score < c.benchmark).length === 0 && (
                    <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-green-100">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-xs text-gray-700">All competencies meet or exceed industry benchmarks.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function HRAdminDashboardView({ user }) {
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState([]);
  const [goals, setGoals] = useState([]);
  const [assignedLearning, setAssignedLearning] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sortBy, setSortBy] = useState("score_asc");
  const [timeframe, setTimeframe] = useState("all");

  const clientId = user?.client_id || user?.data?.client_id;

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [a, g, l, u] = await Promise.all([
        base44.entities.Assessment.list('-created_date', 500).catch(() => []),
        base44.entities.Goal.list('-created_date', 500).catch(() => []),
        base44.entities.AssignedLearning.list('-created_date', 500).catch(() => []),
        (clientId
          ? base44.entities.User.filter({ client_id: clientId })
          : base44.entities.User.list()
        ).catch(() => [])
      ]);
      setAssessments(a || []);
      setGoals(g || []);
      setAssignedLearning(l || []);
      setAllUsers(Array.isArray(u) ? u : []);
    } finally {
      setLoading(false);
    }
  };

  const cutoffDate = useMemo(() => {
    if (timeframe === 'all') return new Date(0);
    const days = { '30d': 30, '90d': 90, '6m': 180, '12m': 365 }[timeframe] || 0;
    return subDays(new Date(), days);
  }, [timeframe]);

  const filteredAssessments = useMemo(() => {
    let list = assessments.filter(a => {
      if (timeframe !== 'all') {
        const d = new Date(a.created_date);
        if (!isAfter(d, cutoffDate)) return false;
      }
      const email = a.email ?? a.data?.email ?? '';
      const name = allUsers.find(u => u.email === email)?.full_name || '';
      if (search && !name.toLowerCase().includes(search.toLowerCase()) && !email.toLowerCase().includes(search.toLowerCase())) return false;
      const overall = a.overall_pct ?? a.data?.overall_pct ?? 0;
      if (riskFilter === 'at_risk' && overall >= 60) return false;
      if (riskFilter === 'developing' && (overall < 60 || overall >= 85)) return false;
      if (riskFilter === 'strong' && overall < 85) return false;
      return true;
    });

    list.sort((a, b) => {
      const sa = a.overall_pct ?? a.data?.overall_pct ?? 0;
      const sb = b.overall_pct ?? b.data?.overall_pct ?? 0;
      if (sortBy === 'score_asc') return sa - sb;
      if (sortBy === 'score_desc') return sb - sa;
      return 0;
    });

    return list;
  }, [assessments, search, riskFilter, sortBy, timeframe, cutoffDate, allUsers]);

  const competencyGapData = useMemo(() => {
    const total = assessments.length || 1;
    return Object.entries(COMPETENCY_LABELS).map(([key, label]) => ({
      name: label.split(' ')[0],
      fullName: label,
      score: Math.round(assessments.reduce((s, a) => s + (a[`${key}_pct`] ?? a.data?.[`${key}_pct`] ?? 0), 0) / total),
      benchmark: INDUSTRY_BENCHMARKS[key],
    }));
  }, [assessments]);

  const trendData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const monthStart = subDays(new Date(), (5 - i) * 30 + 30);
      const monthEnd = subDays(new Date(), (5 - i) * 30);
      const monthA = assessments.filter(a => {
        const d = new Date(a.created_date);
        return isAfter(d, monthStart) && isBefore(d, monthEnd);
      });
      const avg = monthA.length > 0
        ? Math.round(monthA.reduce((s, a) => s + (a.overall_pct ?? a.data?.overall_pct ?? 0), 0) / monthA.length)
        : null;
      return { month: format(monthEnd, 'MMM'), avg, count: monthA.length };
    });
  }, [assessments]);

  const atRiskCount = useMemo(() => assessments.filter(a => (a.overall_pct ?? a.data?.overall_pct ?? 0) < 60).length, [assessments]);
  const highPotCount = useMemo(() => assessments.filter(a => (a.overall_pct ?? a.data?.overall_pct ?? 0) >= 85).length, [assessments]);
  const goalCompletionRate = useMemo(() => {
    const completed = goals.filter(g => (g.status ?? g.data?.status) === 'completed').length;
    return goals.length > 0 ? Math.round((completed / goals.length) * 100) : 0;
  }, [goals]);
  const learningCompletionRate = useMemo(() => {
    const completed = assignedLearning.filter(l => (l.status ?? l.data?.status) === 'completed').length;
    return assignedLearning.length > 0 ? Math.round((completed / assignedLearning.length) * 100) : 0;
  }, [assignedLearning]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Filters Bar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="w-4 h-4 text-gray-500" />
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search leader..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 w-48 h-8 text-sm"
                />
              </div>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                  <SelectItem value="6m">Last 6 Months</SelectItem>
                  <SelectItem value="12m">Last 12 Months</SelectItem>
                </SelectContent>
              </Select>
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Profiles</SelectItem>
                  <SelectItem value="at_risk">At-Risk Only</SelectItem>
                  <SelectItem value="developing">Developing</SelectItem>
                  <SelectItem value="strong">Strong Performers</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="score_asc">Score: Low → High</SelectItem>
                  <SelectItem value="score_desc">Score: High → Low</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-gray-500 ml-auto">{filteredAssessments.length} of {assessments.length} leaders shown</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "At-Risk Leaders", value: atRiskCount, color: "text-red-600", bg: "bg-red-50", icon: AlertTriangle },
          { label: "High-Potential Leaders", value: highPotCount, color: "text-emerald-600", bg: "bg-emerald-50", icon: TrendingUp },
          { label: "Goal Completion", value: `${goalCompletionRate}%`, color: "text-blue-600", bg: "bg-blue-50", icon: Target },
          { label: "Learning Completion", value: `${learningCompletionRate}%`, color: "text-purple-600", bg: "bg-purple-50", icon: BookOpen },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-0 shadow-md">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${s.bg}`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Competency Gap Analysis</CardTitle>
              <p className="text-xs text-gray-500">Your org vs. industry benchmark (dashed)</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={competencyGapData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v, n) => [`${v}%`, n]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="score" name="Your Org" radius={[4, 4, 0, 0]}>
                    {competencyGapData.map((entry, i) => (
                      <Cell key={i} fill={entry.score >= entry.benchmark ? '#10b981' : '#f87171'} />
                    ))}
                  </Bar>
                  <Bar dataKey="benchmark" name="Benchmark" fill="#cbd5e1" radius={[4, 4, 0, 0]} opacity={0.6} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Leadership Score Trend (6 Months)</CardTitle>
              <p className="text-xs text-gray-500">Average overall score per month</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => [`${v}%`, 'Avg Score']} />
                  <Line
                    type="monotone"
                    dataKey="avg"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    connectNulls={false}
                    name="Avg Score"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Leader Detail Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-700" />
              Individual Leader Diagnostics
            </CardTitle>
            <p className="text-xs text-gray-500">Click any row to expand competency breakdown and development recommendations</p>
          </CardHeader>
          <CardContent className="p-0">
            {filteredAssessments.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                No leaders match the current filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600">Leader</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600">Overall Score</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600">Profile</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600">Archetype</th>
                      <th className="py-3 px-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssessments.map((a) => (
                      <LeaderRow
                        key={a.id}
                        assessment={a}
                        allUsers={allUsers}
                        isExpanded={expandedRow === a.id}
                        onToggle={() => setExpandedRow(expandedRow === a.id ? null : a.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}