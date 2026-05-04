import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Layers, Brain, CheckCircle, GitBranch } from "lucide-react";

/**
 * Talent Pipeline & Development Card
 * Consolidates: Leadership Readiness Score, Promotion Readiness Timeline,
 * Learning Velocity, Leadership Style Distribution
 */
export default function TalentPipelineCard({ metrics, assessments, assignedLearning, journeyEnrollments, allUsers = [] }) {
  // Leadership Readiness
  const highPerformers = assessments.filter(a => (a.overall_pct ?? a.data?.overall_pct ?? 0) >= 80).length;
  const developing = assessments.filter(a => { const s = a.overall_pct ?? a.data?.overall_pct ?? 0; return s >= 60 && s < 80; }).length;
  const needsSupport = assessments.filter(a => (a.overall_pct ?? a.data?.overall_pct ?? 0) < 60).length;
  const total = assessments.length || 1;
  const readinessScore = Math.round(((highPerformers * 100) + (developing * 70) + (needsSupport * 40)) / total);

  // Promotion Readiness
  const readyNow = assessments.filter(a => (a.overall_pct ?? a.data?.overall_pct ?? 0) >= 85).length;
  const ready6m = assessments.filter(a => { const s = a.overall_pct ?? a.data?.overall_pct ?? 0; return s >= 75 && s < 85; }).length;
  const ready12m = assessments.filter(a => { const s = a.overall_pct ?? a.data?.overall_pct ?? 0; return s >= 65 && s < 75; }).length;
  const needsDev = assessments.filter(a => (a.overall_pct ?? a.data?.overall_pct ?? 0) < 65).length;

  // Leadership Style Distribution (top 3 archetypes)
  const styles = {};
  assessments.forEach(a => {
    const archetype = a.archetype_label ?? a.data?.archetype_label ?? 'Developing Leader';
    styles[archetype] = (styles[archetype] || 0) + 1;
  });
  const topStyles = Object.entries(styles).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const dominantStyle = topStyles[0]?.[0] || null;

  const readinessColor = readinessScore >= 70 ? 'text-green-600' : readinessScore >= 50 ? 'text-yellow-600' : 'text-red-600';

  // Succession Pipeline
  const totalPeople = allUsers.length || assessments.length || 1;
  const successionTiers = [
    { label: 'Ready Now (≥85%)', count: readyNow, color: 'bg-green-500', pct: Math.round((readyNow / totalPeople) * 100) },
    { label: 'Near-Term (75–84%)', count: ready6m, color: 'bg-blue-400', pct: Math.round((ready6m / totalPeople) * 100) },
    { label: 'Developing (65–74%)', count: ready12m, color: 'bg-yellow-400', pct: Math.round((ready12m / totalPeople) * 100) },
    { label: 'Early Stage (<65%)', count: needsDev, color: 'bg-gray-300', pct: Math.round((needsDev / totalPeople) * 100) },
  ];
  const benchStrength = totalPeople > 0 ? Math.round(((readyNow + ready6m * 0.5) / totalPeople) * 100) : 0;
  const pipelineHealth = benchStrength >= 25 ? { label: 'Strong', color: 'bg-green-100 text-green-700' } :
                         benchStrength >= 12 ? { label: 'Moderate', color: 'bg-yellow-100 text-yellow-700' } :
                                               { label: 'Needs Attention', color: 'bg-red-100 text-red-700' };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Layers className="w-5 h-5 text-purple-600" />
          Talent Pipeline &amp; Development
        </CardTitle>
        <p className="text-xs text-gray-500">Readiness, succession pipeline, learning velocity, and leadership styles</p>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Leadership Readiness + Style row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Readiness Score */}
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

          {/* Dominant Style */}
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

        {/* Succession Pipeline Health */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-semibold text-blue-900">Succession Pipeline</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-blue-700">{benchStrength}% bench</span>
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

      </CardContent>
    </Card>
  );
}