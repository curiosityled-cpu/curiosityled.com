import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  TrendingUp, CheckCircle2, Clock, BookOpen, Layers, Star, Users,
  AlertTriangle, Search, ChevronRight, X, Map, Target, GraduationCap,
  Activity, Zap, Award
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { format, subMonths, startOfMonth } from "date-fns";

const BLUE = "#0202ff";
const COLORS = [BLUE, "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function StatCard({ icon: Icon, label, value, sub, color = "text-[#0202ff]", bgColor = "bg-blue-50" }) {
  return (
    <Card className="shadow-sm border border-gray-100 rounded-2xl">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl ${bgColor} flex items-center justify-center flex-shrink-0`}>
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

function PillarCard({ icon: Icon, label, completed, total, rate, color, bgColor, extra }) {
  return (
    <Card className="shadow-sm border border-gray-100 rounded-2xl">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          <p className="text-sm font-semibold text-gray-700">{label}</p>
        </div>
        <p className={`text-3xl font-bold ${color}`}>{rate}%</p>
        <p className="text-xs text-gray-400 mt-0.5">{completed} of {total} completed</p>
        {extra && <p className="text-xs text-gray-400 mt-0.5">{extra}</p>}
        {/* Progress bar */}
        <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all`} style={{ width: `${rate}%`, backgroundColor: color.replace('text-', '').includes('[') ? color.match(/\[(.+)\]/)?.[1] : undefined, background: color === 'text-[#0202ff]' ? BLUE : undefined }} />
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
  const [resources, setResources] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allInsights, setAllInsights] = useState({});
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [expandedCategory, setExpandedCategory] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allPlans, allAssignments, allExps, allResources, users, insights, assessments] = await Promise.all([
        base44.entities.DevelopmentPlan.list("-created_date"),
        base44.entities.AssignedLearning.list("-created_date"),
        base44.entities.DevelopmentExperience.list("-created_date"),
        base44.entities.LearningResource.list("-created_date", 500),
        base44.entities.User.filter({ client_id: user.client_id }),
        base44.entities.AssessmentInsights.filter({ client_id: user.client_id, status: 'generated' }),
        base44.entities.Assessment.filter({ client_id: user.client_id }, '-submission_ts'),
      ]);

      const adminRoles = ['Admin Level 1', 'Admin Level 2', 'Super Administrator', 'Platform Admin', 'Partner Business Administrator'];
      const adminEmails = new Set(users.filter(u => adminRoles.includes(u.app_role)).map(u => u.email));

      setPlans(allPlans.filter(p => adminEmails.has(p.created_by)));
      setAssignments(allAssignments.filter(a => adminEmails.has(a.assigned_by)));
      setExperiences(allExps.filter(e => adminEmails.has(e.created_by)));
      setResources(allResources);
      setAllUsers(users);

      const assessmentByEmail = assessments.reduce((acc, a) => {
        if (!acc[a.email]) acc[a.email] = a;
        return acc;
      }, {});
      const insightsMap = insights.reduce((acc, i) => { acc[i.user_email] = i; return acc; }, {});
      Object.entries(assessmentByEmail).forEach(([email, a]) => {
        if (!insightsMap[email] && a.archetype_label) {
          insightsMap[email] = { archetype: a.archetype_label, risk_flags: [] };
        } else if (insightsMap[email] && !insightsMap[email].archetype && a.archetype_label) {
          insightsMap[email] = { ...insightsMap[email], archetype: a.archetype_label };
        }
      });
      setAllInsights(insightsMap);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user.client_id]);

  useEffect(() => { load(); }, [load]);

  // ── Pillar metrics ────────────────────────────────────────────────────────────

  const journeyStats = useMemo(() => {
    const total = plans.length;
    const completed = plans.filter(p => p.status === 'completed').length;
    const active = plans.filter(p => p.status === 'active').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, active, rate };
  }, [plans]);

  const learningStats = useMemo(() => {
    const total = assignments.length;
    const completed = assignments.filter(a => a.status === 'completed').length;
    const inProgress = assignments.filter(a => a.status === 'in_progress' || a.status === 'started').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, rate };
  }, [assignments]);

  const experienceStats = useMemo(() => {
    const total = experiences.length;
    const completed = experiences.filter(e => e.status === 'completed').length;
    const active = experiences.filter(e => e.status === 'active' || e.status === 'in_progress').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, active, rate };
  }, [experiences]);

  // Total hours invested
  const totalHours = useMemo(() => {
    const expHours = experiences.filter(e => e.status === 'completed').length * 8;
    const learningHours = assignments.filter(a => a.status === 'completed').length * 2;
    return expHours + learningHours;
  }, [experiences, assignments]);

  // Unique participants across all development activities
  const uniqueParticipants = useMemo(() => {
    const emails = new Set([
      ...assignments.map(a => a.user_email),
      ...experiences.map(e => e.user_email || e.created_by),
    ].filter(Boolean));
    return emails.size;
  }, [assignments, experiences]);

  // ── Combined activity trend (last 6 months) ────────────────────────────────
  const activityTrend = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = startOfMonth(subMonths(new Date(), 5 - i));
      return { label: format(d, 'MMM'), month: format(d, 'yyyy-MM'), learning: 0, journeys: 0, experiences: 0 };
    });
    assignments.forEach(a => {
      const m = a.created_date?.slice(0, 7);
      const slot = months.find(mo => mo.month === m);
      if (slot) slot.learning++;
    });
    plans.forEach(p => {
      const m = p.created_date?.slice(0, 7);
      const slot = months.find(mo => mo.month === m);
      if (slot) slot.journeys++;
    });
    experiences.forEach(e => {
      const m = e.created_date?.slice(0, 7);
      const slot = months.find(mo => mo.month === m);
      if (slot) slot.experiences++;
    });
    return months;
  }, [assignments, plans, experiences]);

  // ── Competency coverage across all pillars ────────────────────────────────
  const competencyData = useMemo(() => {
    const freq = {};
    plans.forEach(p => p.target_competencies?.forEach(c => { freq[c] = (freq[c] || 0) + 1; }));
    experiences.forEach(e => e.competencies?.forEach(c => { freq[c] = (freq[c] || 0) + 1; }));
    resources.forEach(r => r.competencies?.forEach(c => { freq[c] = (freq[c] || 0) + 1; }));
    return Object.entries(freq)
      .map(([name, count]) => ({ name: name.length > 22 ? name.slice(0, 22) + '…' : name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [plans, experiences, resources]);

  // ── Learning by type ───────────────────────────────────────────────────────
  const resourceTypeData = useMemo(() => {
    const freq = {};
    resources.forEach(r => { freq[r.type] = (freq[r.type] || 0) + 1; });
    return Object.entries(freq)
      .map(([name, value]) => ({ name: name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [resources]);

  // ── Per-user development activity ─────────────────────────────────────────
  const userActivityMap = useMemo(() => {
    const map = {};
    assignments.forEach(a => {
      if (!map[a.user_email]) map[a.user_email] = { learning: 0, learningDone: 0, experiences: 0, journeys: 0 };
      map[a.user_email].learning++;
      if (a.status === 'completed') map[a.user_email].learningDone++;
    });
    experiences.forEach(e => {
      const email = e.user_email || e.created_by;
      if (!email) return;
      if (!map[email]) map[email] = { learning: 0, learningDone: 0, experiences: 0, journeys: 0 };
      map[email].experiences++;
    });
    plans.forEach(p => {
      const email = p.created_by;
      if (!email) return;
      if (!map[email]) map[email] = { learning: 0, learningDone: 0, experiences: 0, journeys: 0 };
      map[email].journeys++;
    });
    return map;
  }, [assignments, experiences, plans]);

  // ── Risk categorization ───────────────────────────────────────────────────
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

  const hasActivity = activityTrend.some(m => m.learning > 0 || m.journeys > 0 || m.experiences > 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Top KPI Summary ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Active Participants" value={uniqueParticipants} sub="enrolled in any activity" color="text-[#0202ff]" bgColor="bg-blue-50" />
        <StatCard icon={BookOpen} label="Learning Assignments" value={assignments.length} sub={`${learningStats.completed} completed`} color="text-emerald-600" bgColor="bg-emerald-50" />
        <StatCard icon={GraduationCap} label="Resources Available" value={resources.filter(r => r.is_active).length} sub={`${resources.length} total`} color="text-purple-600" bgColor="bg-purple-50" />
        <StatCard icon={Clock} label="Est. Hours Invested" value={totalHours.toLocaleString()} sub="across completed activities" color="text-amber-600" bgColor="bg-amber-50" />
      </div>

      {/* ── Development Pillar Breakdown ── */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Development Pillars</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <PillarCard icon={BookOpen} label="Learning" completed={learningStats.completed} total={learningStats.total} rate={learningStats.rate} color="text-emerald-600" bgColor="bg-emerald-50"
            extra={learningStats.inProgress > 0 ? `${learningStats.inProgress} in progress` : null} />
          <PillarCard icon={Map} label="Journeys" completed={journeyStats.completed} total={journeyStats.total} rate={journeyStats.rate} color="text-[#0202ff]" bgColor="bg-blue-50"
            extra={journeyStats.active > 0 ? `${journeyStats.active} active` : null} />
          <PillarCard icon={Star} label="Experiences" completed={experienceStats.completed} total={experienceStats.total} rate={experienceStats.rate} color="text-amber-600" bgColor="bg-amber-50"
            extra={experienceStats.active > 0 ? `${experienceStats.active} active` : null} />
        </div>
      </div>

      {/* ── Combined Activity Trend ── */}
      <Card className="shadow-sm border border-gray-100 rounded-2xl">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#0202ff]" /> Development Activity — Last 6 Months
          </CardTitle>
          <p className="text-xs text-gray-400">New assignments, journeys and experiences created per month</p>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          {!hasActivity ? (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">No activity data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={activityTrend} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="learning" name="Learning" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="journeys" name="Journeys" fill={BLUE} radius={[4, 4, 0, 0]} />
                <Bar dataKey="experiences" name="Experiences" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Competency Coverage + Resource Library Mix ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="shadow-sm border border-gray-100 rounded-2xl">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-500" /> Top Competencies Targeted
            </CardTitle>
            <p className="text-xs text-gray-400">Across journeys, experiences & resources</p>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            {competencyData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-gray-400">No competency data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={competencyData} layout="vertical" barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={115} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="count" name="Resources" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-gray-100 rounded-2xl">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-purple-500" /> Resource Library by Type
            </CardTitle>
            <p className="text-xs text-gray-400">{resources.filter(r => r.is_active).length} active resources across {resourceTypeData.length} types</p>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            {resourceTypeData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-gray-400">No resources yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={resourceTypeData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value"
                    label={({ name, percent }) => percent > 0.07 ? `${name} ${Math.round(percent * 100)}%` : ''}
                    labelLine={false}>
                    {resourceTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── People Section ── */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">People Overview</h3>

        {/* Risk summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
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
                const activity = userActivityMap[m.email] || {};
                return (
                  <div key={m.id} className="flex items-center gap-4 px-5 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <div className="w-8 h-8 rounded-full bg-[#0202ff]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-[#0202ff]">{m.full_name?.[0] || m.email?.[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{m.full_name || m.email}</p>
                      <p className="text-xs text-gray-400">{allInsights[m.email]?.archetype || 'Assessment pending'}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
                      {activity.learning > 0 && <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">{activity.learning} learning</span>}
                      {activity.journeys > 0 && <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{activity.journeys} journeys</span>}
                      {activity.experiences > 0 && <span className="bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">{activity.experiences} exp</span>}
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

        {/* All Users table with development activity */}
        <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0202ff]" /> All Participants
                <span className="text-sm font-normal text-gray-400">({allUsers.length})</span>
              </CardTitle>
            </div>
            <div className="relative mt-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-9 h-9 text-sm bg-gray-50 border-gray-200" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Header row */}
            <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 px-5 py-2 border-b border-gray-100 bg-gray-50/50">
              <span className="text-[10px] font-semibold text-gray-400 uppercase">Name</span>
              <span className="text-[10px] font-semibold text-gray-400 uppercase w-16 text-center">Learning</span>
              <span className="text-[10px] font-semibold text-gray-400 uppercase w-16 text-center">Journeys</span>
              <span className="text-[10px] font-semibold text-gray-400 uppercase w-16 text-center">Experiences</span>
              <span className="text-[10px] font-semibold text-gray-400 uppercase w-20 text-center">Status</span>
              <span className="w-4" />
            </div>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-400"><Users className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No users found</p></div>
            ) : filteredUsers.map(m => {
              const risk = getRiskLevel(allInsights[m.email]);
              const activity = userActivityMap[m.email] || {};
              const totalActivities = (activity.learning || 0) + (activity.journeys || 0) + (activity.experiences || 0);
              return (
                <div key={m.id} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 items-center px-5 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#0202ff]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-[#0202ff]">{m.full_name?.[0] || m.email?.[0]}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{m.full_name || m.email}</p>
                      <p className="text-xs text-gray-400 truncate">{allInsights[m.email]?.archetype || 'Assessment pending'}</p>
                    </div>
                  </div>
                  {/* Activity counts - hidden on mobile */}
                  <div className="hidden sm:flex items-center justify-center w-16">
                    {activity.learning > 0 ? (
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 rounded px-2 py-0.5">{activity.learning}</span>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </div>
                  <div className="hidden sm:flex items-center justify-center w-16">
                    {activity.journeys > 0 ? (
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 rounded px-2 py-0.5">{activity.journeys}</span>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </div>
                  <div className="hidden sm:flex items-center justify-center w-16">
                    {activity.experiences > 0 ? (
                      <span className="text-xs font-semibold text-amber-600 bg-amber-50 rounded px-2 py-0.5">{activity.experiences}</span>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </div>
                  <div className="hidden sm:flex items-center justify-center w-20">
                    <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border ${risk.bg} ${risk.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${risk.dot}`} />{risk.label}
                    </span>
                  </div>
                  {/* Mobile: show risk + chevron */}
                  <div className="flex sm:hidden items-center gap-2">
                    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${risk.bg} ${risk.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${risk.dot}`} />{risk.label}
                    </span>
                  </div>
                  <button onClick={() => navigate(`/manager-detail/${m.id}`, { state: { manager: m, insight: allInsights[m.email] } })} className="text-gray-300 hover:text-[#0202ff]">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}