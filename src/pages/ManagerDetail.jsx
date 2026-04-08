import React from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Star, TrendingUp, AlertTriangle, Target, Loader2, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";

const getRiskLevel = (insight) => {
  if (!insight) return { label: 'No Data', color: 'text-gray-500', bg: 'bg-gray-100' };
  const flags = insight.risk_flags?.length || 0;
  if (flags === 0) return { label: 'On Track', color: 'text-emerald-700', bg: 'bg-emerald-100' };
  if (flags === 1) return { label: 'Developing', color: 'text-amber-700', bg: 'bg-amber-100' };
  return { label: 'At Risk', color: 'text-red-700', bg: 'bg-red-100' };
};

export default function ManagerDetail() {
  const location = useLocation();
  const { id } = useParams();
  const navigate = useNavigate();

  // Prefer data passed via navigation state (fast), fallback to fetch
  const passedManager = location.state?.manager;
  const passedInsight = location.state?.insight;

  const { data: fetchedManager, isLoading: loadingManager } = useQuery({
    queryKey: ['manager-detail', id],
    queryFn: async () => {
      const results = await base44.entities.User.filter({ id });
      return results[0] || null;
    },
    enabled: !!id && !passedManager,
  });

  const { data: fetchedInsight, isLoading: loadingInsight } = useQuery({
    queryKey: ['manager-insight', id],
    queryFn: async () => {
      const manager = passedManager || fetchedManager;
      if (!manager?.email) return null;
      const results = await base44.entities.AssessmentInsights.filter(
        { user_email: manager.email, status: 'generated' },
        '-created_date',
        1
      );
      return results[0] || null;
    },
    enabled: !!id && !passedInsight,
  });

  const { data: goals, isLoading: loadingGoals } = useQuery({
    queryKey: ['manager-goals', id],
    queryFn: async () => {
      const manager = passedManager || fetchedManager;
      if (!manager?.email) return [];
      return await base44.entities.Goal.filter(
        { created_by: manager.email },
        '-created_date',
        5
      );
    },
    enabled: !!id,
  });

  const manager = passedManager || fetchedManager;
  const insight = passedInsight || fetchedInsight;
  const risk = getRiskLevel(insight);

  if (!manager || (loadingManager && !passedManager)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" />
      </div>
    );
  }

  const initial = manager.full_name?.[0] || manager.email?.[0] || '?';

  return (
    <MVPPageLayout>
      {/* Back + Header */}
      <div>
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Overview
        </button>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#0202ff]/10 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-bold text-[#0202ff]">{initial}</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{manager.full_name || manager.email}</h1>
            <div className="flex items-center gap-2 mt-1">
              {manager.current_role && <span className="text-sm text-gray-500">{manager.current_role}</span>}
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${risk.bg} ${risk.color}`}>
                {risk.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Insight */}
      {insight ? (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900">Leadership Insight</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {insight.archetype && (
              <div className="bg-[#0202ff]/5 rounded-xl p-3">
                <p className="text-xs text-[#0202ff] font-semibold uppercase tracking-wide mb-0.5">Archetype</p>
                <p className="text-base font-bold text-gray-900">{insight.archetype}</p>
              </div>
            )}
            {insight.summary && <p className="text-sm text-gray-600 leading-relaxed">{insight.summary}</p>}

            <div className="grid grid-cols-2 gap-4">
              {insight.top_strengths?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-500" /> Strengths
                  </p>
                  <ul className="space-y-1">
                    {insight.top_strengths.slice(0, 3).map((s, i) => (
                      <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {insight.development_areas?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-blue-500" /> Growth Areas
                  </p>
                  <ul className="space-y-1">
                    {insight.development_areas.slice(0, 3).map((d, i) => (
                      <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />{d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {insight.risk_flags?.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-red-700 mb-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Risk Signals
                </p>
                <ul className="space-y-1">
                  {insight.risk_flags.map((f, i) => (
                    <li key={i} className="text-xs text-red-600 capitalize">{f.replace(/_/g, ' ')}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm border-dashed">
          <CardContent className="py-8 text-center text-gray-400">
            <p className="text-sm">No assessment insight available yet.</p>
          </CardContent>
        </Card>
      )}

      {/* Goals Activity */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Target className="w-4 h-4 text-[#0202ff]" /> Recent Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingGoals ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : goals?.length > 0 ? (
            <ul className="space-y-2">
              {goals.map(goal => (
                <li key={goal.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
                  {goal.status === 'active' ? (
                    <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  ) : goal.status === 'archived' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <Target className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                  <span className="text-sm text-gray-800 flex-1 truncate">{goal.title}</span>
                  <Badge variant="outline" className="text-xs capitalize flex-shrink-0">{goal.status}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No goals set yet.</p>
          )}
        </CardContent>
      </Card>
    </MVPPageLayout>
  );
}