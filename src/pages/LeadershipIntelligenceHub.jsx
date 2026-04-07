import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { AlertTriangle, TrendingUp, CheckCircle, BarChart2, Loader2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = { 'At Risk': '#ef4444', 'Developing': '#f59e0b', 'On Track': '#10b981', 'No Data': '#d1d5db' };

export default function LeadershipIntelligenceHub() {
  const { user } = useAuth();

  const { data: managers, isLoading: loadingManagers } = useQuery({
    queryKey: ['exec-managers', user?.client_id],
    queryFn: async () => {
      return await base44.entities.User.filter({
        client_id: user.client_id,
        app_role: { $in: ['User Level 1', 'User Level 2'] }
      });
    },
    enabled: !!user?.client_id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: insights, isLoading: loadingInsights } = useQuery({
    queryKey: ['exec-insights', user?.client_id],
    queryFn: async () => {
      return await base44.entities.AssessmentInsights.filter({
        client_id: user.client_id,
        status: 'generated'
      });
    },
    enabled: !!user?.client_id,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = loadingManagers || loadingInsights;

  const stats = React.useMemo(() => {
    if (!managers || !insights) return null;
    const insightMap = insights.reduce((acc, i) => { acc[i.user_email] = i; return acc; }, {});
    let atRisk = 0, developing = 0, onTrack = 0, noData = 0;
    managers.forEach(m => {
      const insight = insightMap[m.email];
      const flags = insight?.risk_flags?.length || 0;
      if (!insight) noData++;
      else if (flags === 0) onTrack++;
      else if (flags === 1) developing++;
      else atRisk++;
    });
    const total = managers.length;
    const pct = (n) => total > 0 ? Math.round((n / total) * 100) : 0;
    return { atRisk, developing, onTrack, noData, total, pctAtRisk: pct(atRisk), pctDeveloping: pct(developing), pctOnTrack: pct(onTrack) };
  }, [managers, insights]);

  const chartData = stats ? [
    { name: 'At Risk', value: stats.atRisk },
    { name: 'Developing', value: stats.developing },
    { name: 'On Track', value: stats.onTrack },
    { name: 'No Data', value: stats.noData },
  ].filter(d => d.value > 0) : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" />
      </div>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">No Leadership Data Yet</h2>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          Manager assessments and insights will appear here once your team completes their leadership assessment.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leadership Intelligence</h1>
        <p className="text-sm text-gray-500 mt-1">
          Real-time view of leadership strength and risk across {stats.total} manager{stats.total !== 1 ? 's' : ''}.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm text-center">
          <CardContent className="py-5">
            <div className="flex items-center justify-center w-10 h-10 bg-red-50 rounded-full mx-auto mb-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.pctAtRisk}%</p>
            <p className="text-xs text-gray-500 mt-1 font-medium">At Risk</p>
            <p className="text-xs text-gray-400">{stats.atRisk} manager{stats.atRisk !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm text-center">
          <CardContent className="py-5">
            <div className="flex items-center justify-center w-10 h-10 bg-amber-50 rounded-full mx-auto mb-3">
              <TrendingUp className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.pctDeveloping}%</p>
            <p className="text-xs text-gray-500 mt-1 font-medium">Progressing</p>
            <p className="text-xs text-gray-400">{stats.developing} manager{stats.developing !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm text-center">
          <CardContent className="py-5">
            <div className="flex items-center justify-center w-10 h-10 bg-emerald-50 rounded-full mx-auto mb-3">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.pctOnTrack}%</p>
            <p className="text-xs text-gray-500 mt-1 font-medium">Ready</p>
            <p className="text-xs text-gray-400">{stats.onTrack} manager{stats.onTrack !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Chart */}
      {chartData.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#0202ff]" />
              Leadership Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} barSize={40}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ border: 'none', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f3f4f6' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#d1d5db'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Narrative */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-[#0202ff]/5 to-blue-50">
        <CardContent className="py-5">
          <p className="text-sm font-semibold text-gray-800 mb-1">90-Day Leadership Story</p>
          <p className="text-sm text-gray-600 leading-relaxed">
            {stats.atRisk > 0
              ? `${stats.atRisk} manager${stats.atRisk !== 1 ? 's' : ''} showing risk signals that warrant early intervention. `
              : 'No managers currently showing critical risk signals. '}
            {stats.onTrack > 0
              ? `${stats.onTrack} manager${stats.onTrack !== 1 ? 's' : ''} progressing well on their leadership journey.`
              : ''}
            {stats.noData > 0
              ? ` ${stats.noData} manager${stats.noData !== 1 ? 's' : ''} have not yet completed assessment.`
              : ''}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}