import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { AlertTriangle, TrendingUp, CheckCircle, BarChart2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = {
  'At Risk': '#ef4444',
  'Developing': '#f59e0b',
  'On Track': '#10b981',
  'No Data': '#e5e7eb'
};

function StatCard({ label, pct, count, icon: Icon, iconBg, iconColor, valueColor }) {
  return (
    <Card className="border-0 shadow-sm text-center rounded-2xl">
      <CardContent className="py-6">
        <div className={`flex items-center justify-center w-11 h-11 ${iconBg} rounded-full mx-auto mb-3`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <p className={`text-3xl font-bold ${valueColor}`}>{pct}%</p>
        <p className="text-xs font-medium text-gray-600 mt-1">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{count} manager{count !== 1 ? 's' : ''}</p>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
      </div>
      <Skeleton className="h-56 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
    </div>
  );
}

export default function LeadershipIntelligenceHub() {
  const { user } = useAuth();

  // client_id may be top-level or nested under data (depending on role/auth path)
  const clientId = user?.client_id || user?.data?.client_id;

  const { data: managers = [], isLoading: loadingManagers } = useQuery({
    queryKey: ['exec-managers', clientId],
    queryFn: async () => base44.entities.User.filter({
      client_id: clientId,
      app_role: { $in: ['User Level 1', 'User Level 2'] }
    }),
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: insightsList = [], isLoading: loadingInsights } = useQuery({
    queryKey: ['exec-insights', clientId],
    queryFn: async () => base44.entities.AssessmentInsights.filter({
      client_id: clientId,
      status: 'generated'
    }),
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = loadingManagers || loadingInsights;

  // Also pull ALL org users (any role) so analytics show even without managers
  const { data: allOrgUsers = [] } = useQuery({
    queryKey: ['exec-all-users', clientId],
    queryFn: async () => base44.entities.User.filter({ client_id: clientId }),
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });

  // Also pull ALL assessments for the org to compute stats when insights are missing
  const { data: allAssessments = [] } = useQuery({
    queryKey: ['exec-assessments', clientId],
    queryFn: async () => base44.entities.Assessment.filter({ client_id: clientId }),
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });

  const stats = React.useMemo(() => {
    // Use managers if available, fall back to all users with relevant roles
    const population = managers.length > 0
      ? managers
      : allOrgUsers.filter(u => ['User Level 1', 'User Level 2'].includes(u.app_role));

    if (!population.length) return null;
    const insightMap = insightsList.reduce((acc, i) => { acc[i.user_email] = i; return acc; }, {});
    // Also build a map from assessments for scoring fallback
    const assessmentMap = allAssessments.reduce((acc, a) => {
      if (!acc[a.email] || new Date(a.submission_ts) > new Date(acc[a.email].submission_ts)) {
        acc[a.email] = a;
      }
      return acc;
    }, {});

    let atRisk = 0, developing = 0, onTrack = 0, noData = 0;
    population.forEach(m => {
      const insight = insightMap[m.email];
      if (insight) {
        const flags = insight.risk_flags?.length || 0;
        if (flags === 0) onTrack++;
        else if (flags === 1) developing++;
        else atRisk++;
      } else {
        // Fall back to assessment score
        const assessment = assessmentMap[m.email];
        if (!assessment) { noData++; return; }
        const score = assessment.overall_pct || 0;
        if (score >= 70) onTrack++;
        else if (score >= 50) developing++;
        else atRisk++;
      }
    });
    const total = population.length;
    const pct = (n) => total > 0 ? Math.round((n / total) * 100) : 0;
    return { atRisk, developing, onTrack, noData, total, pctAtRisk: pct(atRisk), pctDeveloping: pct(developing), pctOnTrack: pct(onTrack) };
  }, [managers, insightsList, allOrgUsers, allAssessments]);

  const chartData = stats ? [
    { name: 'At Risk', value: stats.atRisk },
    { name: 'Developing', value: stats.developing },
    { name: 'On Track', value: stats.onTrack },
    { name: 'No Data', value: stats.noData },
  ].filter(d => d.value > 0) : [];

  return (
    <MVPPageLayout
      title="Leadership Intelligence"
      subtitle={stats
        ? `Org-wide view across ${stats.total} leader${stats.total !== 1 ? 's' : ''} in your organisation.`
        : clientId ? 'Organizational leadership health at a glance.' : 'No organisation linked to your account yet.'}
    >

      {isLoading ? <LoadingSkeleton /> : !stats || stats.total === 0 ? (
        <Card className="border border-dashed border-gray-200 shadow-sm rounded-2xl">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">No Leadership Data Yet</h2>
            <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
              Manager assessments and insights will appear here once your team completes their leadership assessment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              label="At Risk" pct={stats.pctAtRisk} count={stats.atRisk}
              icon={AlertTriangle} iconBg="bg-red-50" iconColor="text-red-500" valueColor="text-red-600"
            />
            <StatCard
              label="Progressing" pct={stats.pctDeveloping} count={stats.developing}
              icon={TrendingUp} iconBg="bg-amber-50" iconColor="text-amber-500" valueColor="text-amber-600"
            />
            <StatCard
              label="Ready" pct={stats.pctOnTrack} count={stats.onTrack}
              icon={CheckCircle} iconBg="bg-emerald-50" iconColor="text-emerald-500" valueColor="text-emerald-600"
            />
          </div>

          {/* Distribution Chart */}
          {chartData.length > 0 && (
            <Card className="border border-gray-100 shadow-sm rounded-2xl">
              <CardHeader className="pb-2 pt-5 px-6">
                <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-[#0202ff]" />
                  Leadership Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={chartData} barSize={44}>
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        border: 'none', borderRadius: '10px', fontSize: '12px',
                        boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)'
                      }}
                      cursor={{ fill: '#f9fafb' }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#e5e7eb'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Narrative Summary */}
          <Card className="border-0 shadow-sm rounded-2xl bg-gray-50">
            <CardContent className="py-5 px-6">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">90-Day Leadership Story</p>
              <p className="text-sm text-gray-900 leading-relaxed">
                {stats.atRisk > 0
                  ? `${stats.atRisk} manager${stats.atRisk !== 1 ? 's are' : ' is'} showing risk signals that warrant early intervention. `
                  : 'No managers currently showing critical risk signals — strong foundation across the board. '}
                {stats.onTrack > 0
                  ? `${stats.onTrack} manager${stats.onTrack !== 1 ? 's are' : ' is'} progressing well on their leadership journey. `
                  : ''}
                {stats.noData > 0
                  ? `${stats.noData} manager${stats.noData !== 1 ? 's have' : ' has'} not yet completed their assessment.`
                  : 'All managers have completed their assessments.'}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </MVPPageLayout>
  );
}