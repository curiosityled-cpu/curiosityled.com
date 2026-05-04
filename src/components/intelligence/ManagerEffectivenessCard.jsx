import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { UserCheck, TrendingUp, Brain, GitBranch, Target } from "lucide-react";

/**
 * Manager Effectiveness Index Card
 * Composite score derived from DM (40%), SI (35%), and PM (25%) scores,
 * aligned with Curiosity Led's core focus on Decision Making + Situational Intelligence
 * as the primary drivers of Manager Effectiveness.
 */
export default function ManagerEffectivenessCard({ metrics, assessments }) {
  const { competencyAverages } = metrics;

  const dmScore  = competencyAverages.dm  || 0;
  const siScore  = competencyAverages.si  || 0;
  const pmScore  = competencyAverages.pm  || 0;
  const commScore = competencyAverages.comm || 0;

  // Weighted composite: DM (35%) + SI (30%) + Comm (20%) + PM (15%)
  const meIndex = Math.round(
    dmScore  * 0.35 +
    siScore  * 0.30 +
    commScore * 0.20 +
    pmScore  * 0.15
  );

  const tier =
    meIndex >= 80 ? { label: "High Effectiveness", color: "bg-green-100 text-green-700" } :
    meIndex >= 65 ? { label: "Developing",          color: "bg-yellow-100 text-yellow-700" } :
                    { label: "Needs Intervention",   color: "bg-red-100 text-red-700" };

  // DM + SI combined = "Decision Quality" — the platform's north star
  const decisionQuality = Math.round(dmScore * 0.55 + siScore * 0.45);

  const components = [
    { label: "Decision Making",       score: dmScore,   weight: "35%", icon: GitBranch, color: "text-teal-600",   bg: "bg-teal-50"   },
    { label: "Situational Intel.",     score: siScore,   weight: "30%", icon: Brain,     color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Communication",         score: commScore, weight: "20%", icon: Target,    color: "text-blue-600",   bg: "bg-blue-50"   },
    { label: "Performance Mgmt",      score: pmScore,   weight: "15%", icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50"  },
  ];

  return (
    <Card className="border-0 shadow-lg border-l-4 border-l-indigo-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-indigo-600" />
          Manager Effectiveness Index
        </CardTitle>
        <p className="text-xs text-gray-500">
          Composite score driven by Decision Making &amp; Situational Intelligence
        </p>
      </CardHeader>
      <CardContent>
        {/* Hero score */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-4xl font-bold text-indigo-600">{meIndex}%</div>
            <div className="text-xs text-gray-500 mt-1">Org-wide ME Index</div>
          </div>
          <Badge className={tier.color}>{tier.label}</Badge>
        </div>

        <Progress value={meIndex} className="h-3 mb-4" />

        {/* Decision Quality callout */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-semibold text-indigo-800">Decision Quality Score</span>
            </div>
            <span className="text-lg font-bold text-indigo-700">{decisionQuality}%</span>
          </div>
          <p className="text-xs text-indigo-600 mt-1">
            Combined DM + SI — the primary driver of Manager Effectiveness
          </p>
        </div>

        {/* Component breakdown */}
        <div className="space-y-2">
          {components.map((c, i) => {
            const Icon = c.icon;
            return (
              <div key={i} className={`flex items-center gap-3 p-2 rounded-lg ${c.bg}`}>
                <Icon className={`w-4 h-4 ${c.color} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-gray-700 font-medium truncate">{c.label}</span>
                    <span className="text-gray-500 ml-2">{c.weight} weight</span>
                  </div>
                  <Progress value={c.score} className="h-1.5" />
                </div>
                <span className={`text-sm font-bold ${c.color} w-10 text-right`}>{c.score}%</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}