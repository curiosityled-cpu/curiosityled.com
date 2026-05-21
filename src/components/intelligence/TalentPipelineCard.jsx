import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Layers, Brain, CheckCircle, GitBranch, Shield, Star, AlertTriangle } from "lucide-react";

function PipelineBar({ label, value, target }) {
  const pct = value != null ? Math.min(value, 100) : null;
  const isGood = pct != null && pct >= target;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-700 font-medium">{label}</span>
        <div className="flex items-center gap-1.5">
          {pct != null ? (
            <>
              <span className={`font-bold ${isGood ? "text-emerald-600" : "text-amber-600"}`}>{pct}%</span>
              {isGood
                ? <CheckCircle className="w-3 h-3 text-emerald-500" />
                : <AlertTriangle className="w-3 h-3 text-amber-500" />
              }
            </>
          ) : (
            <span className="text-gray-400">No data</span>
          )}
        </div>
      </div>
      <Progress value={pct ?? 0} className="h-1.5" />
      <div className="text-[10px] text-gray-400">Target: ≥{target}%</div>
    </div>
  );
}

export default function TalentPipelineCard({ metrics, assessments, assignedLearning, journeyEnrollments, allUsers = [], workforceMetrics = [] }) {
  // Leadership Readiness buckets
  const highPerformers = assessments.filter(a => (a.overall_pct ?? a.data?.overall_pct ?? 0) >= 80).length;
  const developing = assessments.filter(a => { const s = a.overall_pct ?? a.data?.overall_pct ?? 0; return s >= 60 && s < 80; }).length;
  const needsSupport = assessments.filter(a => (a.overall_pct ?? a.data?.overall_pct ?? 0) < 60).length;
  const total = assessments.length || 1;
  const readinessScore = Math.round(((highPerformers * 100) + (developing * 70) + (needsSupport * 40)) / total);
  const readinessColor = readinessScore >= 70 ? 'text-green-600' : readinessScore >= 50 ? 'text-yellow-600' : 'text-red-600';

  // Promotion readiness tiers
  const readyNowCount = assessments.filter(a => (a.overall_pct ?? a.data?.overall_pct ?? 0) >= 85).length;
  const ready6m = assessments.filter(a => { const s = a.overall_pct ?? a.data?.overall_pct ?? 0; return s >= 75 && s < 85; }).length;
  const ready12m = assessments.filter(a => { const s = a.overall_pct ?? a.data?.overall_pct ?? 0; return s >= 65 && s < 75; }).length;
  const needsDev = assessments.filter(a => (a.overall_pct ?? a.data?.overall_pct ?? 0) < 65).length;

  // Leadership styles
  const styles = {};
  assessments.forEach(a => {
    const archetype = a.archetype_label ?? a.data?.archetype_label ?? 'Developing Leader';
    styles[archetype] = (styles[archetype] || 0) + 1;
  });
  const topStyles = Object.entries(styles).sort((a, b) => b[1] - a[1]).slice(0, 3);

  // Succession pipeline bar data — use assessments.length as denominator (counts are derived from it)
  const totalPeople = assessments.length || 1;
  const successionTiers = [
    { label: 'Ready Now (≥85%)', count: readyNowCount, color: 'bg-green-500', pct: Math.min(100, Math.round((readyNowCount / totalPeople) * 100)) },
    { label: 'Near-Term (75–84%)', count: ready6m, color: 'bg-blue-400', pct: Math.min(100, Math.round((ready6m / totalPeople) * 100)) },
    { label: 'Developing (65–74%)', count: ready12m, color: 'bg-yellow-400', pct: Math.min(100, Math.round((ready12m / totalPeople) * 100)) },
    { label: 'Early Stage (<65%)', count: needsDev, color: 'bg-gray-300', pct: Math.min(100, Math.round((needsDev / totalPeople) * 100)) },
  ];
  const benchStrength = totalPeople > 0 ? Math.min(100, Math.round(((readyNowCount + ready6m * 0.5) / totalPeople) * 100)) : 0;
  const pipelineHealth = benchStrength >= 25 ? { label: 'Strong', color: 'bg-green-100 text-green-700' } :
                         benchStrength >= 12 ? { label: 'Moderate', color: 'bg-yellow-100 text-yellow-700' } :
                                               { label: 'Needs Attention', color: 'bg-red-100 text-red-700' };

  // HRIS-fed succession metrics
  const latest = workforceMetrics?.[0];
  const hasHRIS = !!latest;
  const getValue = (field) => hasHRIS && latest[field] != null ? latest[field] : null;
  const successionCoverage = getValue("succession_coverage_rate");
  const highPotRetention = getValue("high_potential_retention_rate");
  const internalFillRate = getValue("internal_fill_rate_leadership");
  const readyNowHRIS = getValue("ready_now_successors");

  // Platform-native high potential proxy
  const platformHighPotentials = metrics?.highPotentialLeaders ?? 0;
  const totalAssessed = metrics?.totalAssessments ?? 0;
  const platformReadinessRate = totalAssessed > 0 ? Math.round((platformHighPotentials / totalAssessed) * 100) : null;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-600" />
              Talent Pipeline, Development &amp; Succession
            </CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">Readiness, succession pipeline, leadership styles, and coverage metrics</p>
          </div>
          {readyNowHRIS != null && (
            <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">{readyNowHRIS} Ready Now</Badge>
          )}
        </div>
        {!hasHRIS && (
          <div className="mt-2 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            External succession data not yet connected. Showing platform-native readiness data only.
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Row 1: Readiness Score + Leadership Styles */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <CheckCircle className="w-3.5 h-3.5 text-purple-600" />
              <span className="text-xs font-semibold text-purple-900">Leadership Readiness</span>
            </div>
            <div className={`text-3xl font-bold ${readinessColor} mb-1`}>{readinessScore}%</div>
            <Progress value={readinessScore} className="h-1.5 mb-2" />
            <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
              <div className="bg-green-100 rounded p-1">
                <div className="font-bold text-green-700">{highPerformers}</div>
                <div className="text-green-600">Ready</div>
              </div>
              <div className="bg-yellow-100 rounded p-1">
                <div className="font-bold text-yellow-700">{developing}</div>
                <div className="text-yellow-600">Growing</div>
              </div>
              <div className="bg-red-100 rounded p-1">
                <div className="font-bold text-red-700">{needsSupport}</div>
                <div className="text-red-600">Support</div>
              </div>
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Brain className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-xs font-semibold text-indigo-900">Leadership Styles</span>
            </div>
            {topStyles.length > 0 ? (
              <div className="space-y-1.5">
                {topStyles.map(([style, count], i) => (
                  <div key={i}>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-gray-700 truncate">{style}</span>
                      <span className="text-gray-500 ml-1">{Math.round((count / total) * 100)}%</span>
                    </div>
                    <Progress value={(count / total) * 100} className="h-1" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 pt-2">No assessment data yet</p>
            )}
          </div>
        </div>

        {/* Row 2: Succession Pipeline Bars */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-semibold text-blue-900">Succession Pipeline</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-blue-700">{benchStrength}% bench</span>
              <Badge className={pipelineHealth.color}>{pipelineHealth.label}</Badge>
            </div>
          </div>
          <div className="space-y-1.5">
            {successionTiers.map(({ label, count, color, pct }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[10px] text-gray-600 w-32 flex-shrink-0">{label}</span>
                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color} flex items-center justify-end pr-1.5 transition-all`}
                    style={{ width: `${pct}%`, minWidth: count > 0 ? '24px' : 0 }}
                  >
                    {count > 0 && <span className="text-[9px] text-white font-medium">{count}</span>}
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 w-7 text-right">{pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Row 3: Platform-native high-potentials + HRIS metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Star className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-xs font-semibold text-indigo-800">Platform Readiness</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-2xl font-bold text-indigo-700">{platformHighPotentials}</div>
                <div className="text-[10px] text-indigo-600">High-Potentials (≥85%)</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-indigo-700">
                  {platformReadinessRate != null ? `${platformReadinessRate}%` : "—"}
                </div>
                <div className="text-[10px] text-indigo-600">of Assessed Leaders</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Shield className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-xs font-semibold text-slate-800">HRIS Coverage Metrics</span>
            </div>
            <PipelineBar label="Succession Coverage" value={successionCoverage} target={80} />
            <PipelineBar label="HiPo Retention" value={highPotRetention} target={90} />
            <PipelineBar label="Internal Fill Rate" value={internalFillRate} target={60} />
          </div>
        </div>

      </CardContent>
    </Card>
  );
}