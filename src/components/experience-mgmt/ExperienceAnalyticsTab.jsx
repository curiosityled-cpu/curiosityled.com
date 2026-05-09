import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  TrendingUp, CheckCircle2, Clock, BookOpen, Layers, Star, Users,
  AlertTriangle, Search, ChevronRight, X
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { format, subMonths, startOfMonth } from "date-fns";

const BLUE = "#0202ff";
const COLORS = [BLUE, "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function StatCard({ icon: Icon, label, value, sub, color = "text-[#0202ff]" }) {
  return (
    <Card className="shadow-sm border border-gray-100 rounded-2xl">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          <p className="text-xs text-gray-500 leading-snug">{label}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

const getRiskLevel = (insight) => {
  if (!insight) return { label: 'No Data', color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200', dot: 'bg-gray-400' };
  const flags = insight.risk_flags?.length || 0;
  if (flags === 0) return { label: 'On Track', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' };
  if (flags === 1) return { label: 'Developing', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' };
  return { label: 'At Risk', color: 'text-red-700', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' };
};

export default function ExperienceAnalyticsTab({ user }) {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allInsights, setAllInsights] = useState({});
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [expandedCategory, setExpandedCategory] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allPlans, allAssignments, allExps, users, insights] = await Promise.all([
        base44.entities.DevelopmentPlan.list("-created_date"),
        base44.entities.AssignedLearning.list("-created_date"),
        base44.entities.DevelopmentExperience.list("-created_date"),
        base44.entities.User.filter({ client_id: user.client_id }),
        base44.entities.AssessmentInsights.filter({ client_id: user.client_id, status: 'generated' }),
      ]);
      const adminRoles = ['Admin Level 1', 'Admin Level 2', 'Super Administrator', 'Platform Admin', 'Partner Business Administrator'];
      const adminEmails = new Set(users.filter(u => adminRoles.includes(u.app_role)).map(u => u.email));
      setPlans(allPlans.filter(p => adminEmails.has(p.created_by)));
      setAssignments(allAssignments.filter(a => adminEmails.has(a.assigned_by)));
      setExperiences(allExps.filter(e => adminEmails.has(e.created_by)));
      setAllUsers(users);
      setAllInsights(insights.reduce((acc, i) => { acc[i.user_email] = i; return acc; }, {}));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user.client_id]);

  useEffect(() => { load(); }, [load]);

  // ── Derived metrics ──────────────────────────────────────────────────────────

  const journeyCompletion = useMemo(() => {
    const total = plans.length;
    const completed = plans.filter(p => p.status === 'completed').length;
    const active = plans.filter(p => p.status === 'active').length;
    const paused = plans.filter(p => p.status === 'paused').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, active, paused, rate };
  }, [plans]);

  const learningStats = useMemo(() => {
    const total = assignments.length;
    const completed = assignments.filter(a => a.status === 'completed').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, rate };
  }, [assignments]);

  // Journey status breakdown for pie chart
  const journeyStatusData = useMemo(() => [
    { name: 'Active', value: journeyCompletion.active },
    { name: 'Completed', value: journeyCompletion.completed },
    { name: 'Paused', value: journeyCompletion.paused },
  ].filter(d => d.value > 0), [journeyCompletion]);

  // Competency frequency across all plans & experiences
  const competencyData = useMemo(() => {
    const freq = {};
    plans.forEach(p => p.target_competencies?.forEach(c => { freq[c] = (freq[c] || 0) + 1; }));
    experiences.forEach(e => e.competencies?.forEach(c => { freq[c] = (freq[c] || 0) + 1; }));
    return Object.entries(freq)
      .map(([name, count]) => ({ name: name.length > 22 ? name.slice(0, 22) + '…' : name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [plans, experiences]);

  // Journey completions over last 6 months
  const completionTrend = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = startOfMonth(subMonths(new Date(), 5 - i));
      return { label: format(d, 'MMM'), month: format(d, 'yyyy-MM'), completed: 0, started: 0 };
    });
    plans.forEach(p => {
      const m = p.updated_date?.slice(0, 7) || p.created_date?.slice(0, 7);
      const slot = months.find(mo => mo.month === m);
      if (!slot) return;
      if (p.status === 'completed') slot.completed++;
      else if (p.status === 'active') slot.started++;
    });
    return months;
  }, [plans]);

  // Learning assignment completions over last 6 months
  const learningTrend = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = startOfMonth(subMonths(new Date(), 5 - i));
      return { label: format(d, 'MMM'), month: format(d, 'yyyy-MM'), assigned: 0, completed: 0 };
    });
    assignments.forEach(a => {
      const m = a.created_date?.slice(0, 7);
      const slot = months.find(mo => mo.month === m);
      if (!slot) return;
      slot.assigned++;
      if (a.status === 'completed') slot.completed++;
    });
    return months;
  }, [assignments]);

  // Experience type breakdown
  const expTypeData = useMemo(() => {
    const EXP_LABELS = {
      leadership_coaching: "Coaching", stretch_project: "Stretch Project",
      leadership_opportunity: "Leadership Opp.", mentorship: "Mentorship",
      conference_event: "Conference", volunteer_leadership: "Volunteer",
      cross_functional_project: "Cross-Functional", speaking_opportunity: "Speaking", other: "Other",
    };
    const freq = {};
    experiences.forEach(e => { const k = EXP_LABELS[e.type] || e.type; freq[k] = (freq[k] || 0) + 1; });
    return Object.entries(freq).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [experiences]);

  // Estimated total hours (assume 8h per experience, 2h per learning item)
  const totalHours = useMemo(() => {
    const expHours = experiences.filter(e => e.status === 'completed').length * 8;
    const learningHours = assignments.filter(a => a.status === 'completed').length * 2;
    return expHours + learningHours;
  }, [experiences, assignments]);

  // Unique users enrolled
  const uniqueUsers = useMemo(() => {
    const emails = new Set([
      ...plans.map(p => p.created_by),
      ...assignments.map(a => a.user_email),
      ...experiences.map(e => e.user_email || e.created_by),
    ].filter(Boolean));
    return emails.size;
  }, [plans, assignments, experiences]);

  // Users categorized by risk
  const categorized = useMemo(() => {
    const atRisk = [], developing = [], onTrack = [];
    allUsers.forEach(m => {
      const flags = allInsights[m.email]?.risk_flags?.length;
      if (flags == null) return;
      if (flags === 0) onTrack.push(m);
      else if (flags === 1) developing.push(m);
      else atRisk.push(m);
    });
    return { atRisk, developing, onTrack };
  }, [allUsers, allInsights]);

  const filteredUsers = useMemo(() =>
    allUsers.filter(m => !userSearch || m.full_name?.toLowerCase().includes(userSearch.toLowerCase()) || m.email?.toLowerCase().includes(userSearch.toLowerCase())),
    [allUsers, userSearch]);

  const riskStatCards = [
    { key: 'atRisk', label: 'At Risk', value: categorized.atRisk.length, icon: AlertTriangle, iconBg: 'bg-red-50', iconColor: 'text-red-500', list: categorized.atRisk, activeBg: 'ring-2 ring-red-200' },
    { key: 'developing', label: 'Developing', value: categorized.developing.length, icon: TrendingUp, iconBg: 'bg-amber-50', iconColor: 'text-amber-500', list: categorized.developing, activeBg: 'ring-2 ring-amber-200' },
    { key: 'onTrack', label: 'On Track', value: categorized.onTrack.length, icon: CheckCircle2, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', list: categorized.onTrack, activeBg: 'ring-2 ring-emerald-200' },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── All Users Section ── */}
      <div>
        {/* Risk stat cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
...
          {riskStatCards.map(({ key, label, value, icon: Icon, iconBg, iconColor, list, activeBg }) => (
            <Card key={key} onClick={() => setExpandedCategory(prev => prev === key ? null : key)}
              className={`border-0 shadow-sm text-center rounded-2xl cursor-pointer hover:shadow-md transition-all ${expandedCategory === key ? activeBg : ''}`}>
              <CardContent className="py-5">
                <div className={`flex items-center justify-center w-9 h-9 ${iconBg} rounded-full mx-auto mb-2`}>
                  <Icon className={`w-4 h-4 ${iconColor}`} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                {value > 0 && <p className="text-[10px] text-[#0202ff] mt-1 font-medium">{expandedCategory === key ? 'Hide ▲' : 'View ▼'}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Expanded category */}
        {expandedCategory && (
          <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden mb-4">
            <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-900">
                {riskStatCards.find(s => s.key === expandedCategory)?.label} Users
                <span className="ml-1.5 text-gray-400 font-normal">({riskStatCards.find(s => s.key === expandedCategory)?.list.length})</span>
              </CardTitle>
              <button onClick={() => setExpandedCategory(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </CardHeader>
            <CardContent className="p-0">
              {riskStatCards.find(s => s.key === expandedCategory)?.list.map(m => {
                const risk = getRiskLevel(allInsights[m.email]);
                return (
                  <div key={m.id} className="flex items-center gap-4 px-5 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <div className="w-8 h-8 rounded-full bg-[#0202ff]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-[#0202ff]">{m.full_name?.[0] || m.email?.[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{m.full_name || m.email}</p>
                      <p className="text-xs text-gray-400">{allInsights[m.email]?.archetype || 'Assessment pending'}</p>
                    </div>
                    <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${risk.bg} ${risk.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${risk.dot}`} />{risk.label}
                    </span>
                    <button onClick={() => navigate(`/manager-detail/${m.id}`, { state: { manager: m, insight: allInsights[m.email] } })} className="text-gray-300 hover:text-[#0202ff]">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* All Users list */}
        <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0202ff]" /> All Users
              <span className="text-sm font-normal text-gray-400">({allUsers.length})</span>
            </CardTitle>
            <div className="relative mt-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-9 h-9 text-sm bg-gray-50 border-gray-200" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-400"><Users className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No users found</p></div>
            ) : filteredUsers.map(m => {
              const risk = getRiskLevel(allInsights[m.email]);
              return (
                <div key={m.id} className="flex items-center gap-4 px-5 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <div className="w-8 h-8 rounded-full bg-[#0202ff]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-[#0202ff]">{m.full_name?.[0] || m.email?.[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{m.full_name || m.email}</p>
                    <p className="text-xs text-gray-400 truncate">{allInsights[m.email]?.archetype || 'Assessment pending'}</p>
                  </div>
                  <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${risk.bg} ${risk.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${risk.dot}`} />{risk.label}
                  </span>
                  <button onClick={() => navigate(`/manager-detail/${m.id}`, { state: { manager: m, insight: allInsights[m.email] } })} className="text-gray-300 hover:text-[#0202ff]">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Layers} label="Journey Completion Rate" value={`${journeyCompletion.rate}%`} sub={`${journeyCompletion.completed} of ${journeyCompletion.total} journeys`} color="text-[#0202ff]" />
        <StatCard icon={BookOpen} label="Learning Completion Rate" value={`${learningStats.rate}%`} sub={`${learningStats.completed} of ${learningStats.total} assignments`} color="text-emerald-600" />
        <StatCard icon={Clock} label="Est. Hours Invested" value={totalHours.toLocaleString()} sub="across completed activities" color="text-amber-600" />
        <StatCard icon={Users} label="Active Participants" value={uniqueUsers} sub="unique users enrolled" color="text-purple-600" />
      </div>

      {/* ── Journey Completion Trend ── */}
      <Card className="shadow-sm border border-gray-100 rounded-2xl">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#0202ff]" /> Journey Activity — Last 6 Months
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          {completionTrend.every(m => m.completed === 0 && m.started === 0) ? (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">No journey data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={completionTrend} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="started" name="Active" fill={BLUE} fillOpacity={0.3} radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill={BLUE} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Competency Growth + Journey Status side by side ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Competency frequency */}
        <Card className="shadow-sm border border-gray-100 rounded-2xl">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" /> Top Targeted Competencies
            </CardTitle>
            <p className="text-xs text-gray-400">Frequency across journeys & experiences</p>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            {competencyData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-gray-400">No competency data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={competencyData} layout="vertical" barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={110} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="count" name="Programs" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Journey status pie */}
        <Card className="shadow-sm border border-gray-100 rounded-2xl">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#0202ff]" /> Journey Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4 flex flex-col items-center">
            {journeyStatusData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-gray-400">No journey data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={journeyStatusData}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                    labelLine={false}
                  >
                    {journeyStatusData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Learning Assignments Trend ── */}
      <Card className="shadow-sm border border-gray-100 rounded-2xl">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-500" /> Learning Assignments — Last 6 Months
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          {learningTrend.every(m => m.assigned === 0) ? (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">No learning assignment data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={learningTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="assigned" name="Assigned" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Experience Type Distribution ── */}
      {expTypeData.length > 0 && (
        <Card className="shadow-sm border border-gray-100 rounded-2xl">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" /> Experience Type Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={expTypeData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="value" name="Experiences" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

    </div>
  );
}