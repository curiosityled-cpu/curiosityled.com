import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  Users, Star, BookOpen, Clock, ClipboardList, Activity
} from "lucide-react";
import { base44 } from "@/api/base44Client";

const BLUE = "#0202ff";
const COLORS = [BLUE, "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const STATUS_LABELS = {
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const TYPE_LABELS = {
  leadership_coaching: 'Leadership Coaching',
  team_coaching: 'Team Coaching',
  workshop: 'Workshop',
  consultation: 'Consultation',
  assessment: 'Assessment',
  stretch_project: 'Stretch Project',
  leadership_opportunity: 'Leadership Opportunity',
  mentorship: 'Mentorship',
  conference_event: 'Conference/Event',
  volunteer_leadership: 'Volunteer Leadership',
  cross_functional_project: 'Cross-Functional Project',
  speaking_opportunity: 'Speaking Opportunity',
  other: 'Other',
};

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

export default function CoachAnalyticsTab({ user, coacheeEmails }) {
  const isConsultant = user?.app_role === 'Consultant';
  const [experiences, setExperiences] = useState([]);
  const [engagements, setEngagements] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allExps, allEngagements] = await Promise.all([
        base44.entities.DevelopmentExperience.list("-created_date"),
        base44.entities.CoachingEngagement.filter({
          coach_email: user.email,
          status: { $in: ['pending', 'active', 'on_hold', 'completed', 'terminated'] },
        }),
      ]);
      // RLS already filters to coach's records, but double-filter for safety
      const coacheeSet = new Set(coacheeEmails);
      setExperiences(allExps.filter(e => e.coach_email === user.email || coacheeSet.has(e.user_email)));
      setEngagements(allEngagements);
    } catch (e) {
      console.error('Coach analytics load error:', e);
    } finally {
      setLoading(false);
    }
  }, [user.email, coacheeEmails]);

  useEffect(() => { load(); }, [load]);

  // Active coachees count (active engagements only)
  const activeCoacheeCount = useMemo(() => {
    const active = engagements.filter(e => ['pending', 'active', 'on_hold'].includes(e.status));
    const emails = new Set();
    active.forEach(eng => {
      if (eng.coachee_email) emails.add(eng.coachee_email);
      (eng.team_member_emails || []).forEach(e => emails.add(e));
    });
    return emails.size;
  }, [engagements]);

  // Active experiences (planned or in progress) — primary metric for consultants
  const activeExperienceCount = useMemo(() => {
    return experiences.filter(e => e.status === 'planned' || e.status === 'in_progress').length;
  }, [experiences]);

  // Recommended learning stats
  const learningStats = useMemo(() => {
    let total = 0, adopted = 0;
    experiences.forEach(exp => {
      (exp.recommended_learning || []).forEach(r => {
        total++;
        if (r.adopted_by_coachee) adopted++;
      });
    });
    return { total, adopted, rate: total > 0 ? Math.round((adopted / total) * 100) : 0 };
  }, [experiences]);

  // Experience status breakdown
  const statusData = useMemo(() => {
    const freq = { planned: 0, in_progress: 0, completed: 0, cancelled: 0 };
    experiences.forEach(e => { if (freq[e.status] != null) freq[e.status]++; });
    return Object.entries(freq).map(([key, value]) => ({ name: STATUS_LABELS[key], value }));
  }, [experiences]);

  // Experience type breakdown
  const typeData = useMemo(() => {
    const freq = {};
    experiences.forEach(e => {
      const label = TYPE_LABELS[e.type] || 'Other';
      freq[label] = (freq[label] || 0) + 1;
    });
    return Object.entries(freq).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [experiences]);

  // Per-coachee breakdown (coaches only)
  const coacheeBreakdown = useMemo(() => {
    const map = {};
    experiences.forEach(exp => {
      const email = exp.user_email;
      if (!email) return;
      if (!map[email]) {
        map[email] = {
          email,
          experiences: 0,
          completed: 0,
          learningRecommended: 0,
          learningAdopted: 0,
        };
      }
      const c = map[email];
      c.experiences++;
      if (exp.status === 'completed') c.completed++;
      (exp.recommended_learning || []).forEach(r => {
        c.learningRecommended++;
        if (r.adopted_by_coachee) c.learningAdopted++;
      });
    });
    return Object.values(map).sort((a, b) => b.experiences - a.experiences);
  }, [experiences]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {isConsultant ? (
          <StatCard icon={Activity} label="Active Experiences" value={activeExperienceCount} sub="planned or in progress" color="text-[#0202ff]" bgColor="bg-blue-50" />
        ) : (
          <StatCard icon={Users} label="Active Coachees" value={activeCoacheeCount} sub="across active engagements" color="text-[#0202ff]" bgColor="bg-blue-50" />
        )}
        <StatCard icon={Star} label="Experiences Logged" value={experiences.length} sub={`${experiences.filter(e => e.status === 'completed').length} completed`} color="text-amber-600" bgColor="bg-amber-50" />
        <StatCard icon={BookOpen} label="Recommended Learning" value={learningStats.total} sub={`${learningStats.adopted} adopted (${learningStats.rate}%)`} color="text-purple-600" bgColor="bg-purple-50" />
      </div>

      {/* Recommended Learning Adoption */}
      <Card className="shadow-sm border border-gray-100 rounded-2xl">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-500" /> Recommended Learning Adoption
          </CardTitle>
          <p className="text-xs text-gray-400">Learning resources you recommended that participants opted into</p>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          {learningStats.total === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">No recommendations yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[
                { name: 'Adopted', value: learningStats.adopted },
                { name: 'Not Adopted', value: learningStats.total - learningStats.adopted },
              ]} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="value" name="Resources" radius={[4, 4, 0, 0]}>
                  <Cell fill="#8b5cf6" />
                  <Cell fill="#e5e7eb" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Experience Status + Type Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="shadow-sm border border-gray-100 rounded-2xl">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#0202ff]" /> Experience Status
            </CardTitle>
            <p className="text-xs text-gray-400">Where your logged experiences stand</p>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            {experiences.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-gray-400">No experiences logged yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusData.filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value"
                    label={({ name, percent }) => percent > 0.07 ? `${name} ${Math.round(percent * 100)}%` : ''}
                    labelLine={false}>
                    {statusData.filter(d => d.value > 0).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-gray-100 rounded-2xl">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-amber-500" /> Experience Types
            </CardTitle>
            <p className="text-xs text-gray-400">What kinds of development you're logging</p>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            {typeData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-gray-400">No experiences yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={typeData} layout="vertical" barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={130} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="value" name="Count" fill={BLUE} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-Coachee Breakdown (coaches only) */}
      {!isConsultant && (
      <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0202ff]" /> Coachee Breakdown
            <span className="text-sm font-normal text-gray-400">({coacheeBreakdown.length})</span>
          </CardTitle>
          <p className="text-xs text-gray-400 mt-1">Development progress for each coachee you've logged experiences for</p>
        </CardHeader>
        <CardContent className="p-0">
          {coacheeBreakdown.length === 0 ? (
            <div className="text-center py-10">
              <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No coachee activity yet</p>
            </div>
          ) : (
            <>
              <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-3 px-5 py-2 border-b border-gray-100 bg-gray-50/50">
                <span className="text-[10px] font-semibold text-gray-400 uppercase">Coachee</span>
                <span className="text-[10px] font-semibold text-gray-400 uppercase w-20 text-center">Experiences</span>
                <span className="text-[10px] font-semibold text-gray-400 uppercase w-20 text-center">Completed</span>
                <span className="text-[10px] font-semibold text-gray-400 uppercase w-24 text-center">Learning Adopted</span>
              </div>
              {coacheeBreakdown.map(c => (
                <div key={c.email} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto_auto] gap-3 items-center px-5 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#0202ff]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-[#0202ff]">{c.email?.[0]?.toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.email}</p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center justify-center w-20">
                    <span className="text-xs font-semibold text-amber-600 bg-amber-50 rounded px-2 py-0.5">{c.experiences}</span>
                  </div>
                  <div className="hidden sm:flex items-center justify-center w-20">
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 rounded px-2 py-0.5">{c.completed}</span>
                  </div>
                  <div className="hidden sm:flex items-center justify-center w-24">
                    {c.learningRecommended > 0 ? (
                      <span className="text-xs font-semibold text-purple-600 bg-purple-50 rounded px-2 py-0.5">{c.learningAdopted}/{c.learningRecommended}</span>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </div>
                  {/* Mobile summary */}
                  <div className="flex sm:hidden items-center gap-1.5 flex-wrap justify-end">
                    <span className="text-xs font-semibold text-amber-600 bg-amber-50 rounded px-1.5 py-0.5">{c.experiences} exp</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
}