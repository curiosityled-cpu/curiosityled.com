import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  AlertTriangle,
  Shield,
  Gauge,
  Layers,
  UserCheck,
  Zap,
  GitBranch,
  Award,
  Brain,
  BarChart3,
  Target,
  Lightbulb
} from "lucide-react";

// Leadership Readiness Score Card
const pct = (a, field) => a[field] ?? a.data?.[field] ?? 0;

export function LeadershipReadinessCard({ metrics, assessments }) {
  const highPerformers = assessments.filter(a => pct(a, 'overall_pct') >= 80).length;
  const developing = assessments.filter(a => pct(a, 'overall_pct') >= 60 && pct(a, 'overall_pct') < 80).length;
  const needsSupport = assessments.filter(a => pct(a, 'overall_pct') < 60).length;
  const total = assessments.length || 1;
  
  const readinessScore = Math.round(
    ((highPerformers * 100) + (developing * 70) + (needsSupport * 40)) / total
  );

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Gauge className="w-5 h-5 text-indigo-600" />
          Leadership Readiness Score
        </CardTitle>
        <p className="text-xs text-gray-500">Platform-wide readiness for next-level roles</p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <div className="text-4xl font-bold text-indigo-600">{readinessScore}%</div>
          <div className="flex-1">
            <Progress value={readinessScore} className="h-3" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="bg-green-50 rounded-lg p-2">
            <div className="font-bold text-green-700">{highPerformers}</div>
            <div className="text-xs text-green-600">Ready Now</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-2">
            <div className="font-bold text-yellow-700">{developing}</div>
            <div className="text-xs text-yellow-600">Developing</div>
          </div>
          <div className="bg-red-50 rounded-lg p-2">
            <div className="font-bold text-red-700">{needsSupport}</div>
            <div className="text-xs text-red-600">Needs Support</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Succession Pipeline Health Card
export function SuccessionPipelineCard({ assessments, allUsers }) {
  const totalLeaders = allUsers.filter(u => 
    u.current_role?.toLowerCase().includes('manager') ||
    u.current_role?.toLowerCase().includes('director') ||
    u.current_role?.toLowerCase().includes('vp')
  ).length;
  
  const highPotential = assessments.filter(a => pct(a, 'overall_pct') >= 85).length;
  const successorRatio = totalLeaders > 0 ? Math.round((highPotential / totalLeaders) * 100) : 0;
  
  const pipelineHealth = successorRatio >= 50 ? 'Strong' : successorRatio >= 30 ? 'Moderate' : 'At Risk';
  const healthColor = successorRatio >= 50 ? 'text-green-600' : successorRatio >= 30 ? 'text-yellow-600' : 'text-red-600';
  const healthBg = successorRatio >= 50 ? 'bg-green-100' : successorRatio >= 30 ? 'bg-yellow-100' : 'bg-red-100';

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Layers className="w-5 h-5 text-purple-600" />
          Succession Pipeline Health
        </CardTitle>
        <p className="text-xs text-gray-500">Bench strength across the platform</p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <Badge className={`${healthBg} ${healthColor} text-sm px-3 py-1`}>
            {pipelineHealth}
          </Badge>
          <span className="text-2xl font-bold text-gray-900">{successorRatio}%</span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Leadership Positions</span>
            <span className="font-medium">{totalLeaders}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">High-Potential Successors</span>
            <span className="font-medium">{highPotential}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Successor Ratio</span>
            <span className="font-medium">{successorRatio}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Skills Gap Analysis Card
export function SkillsGapCard({ metrics }) {
  const { competencyAverages } = metrics;
  const threshold = 70;
  
  const gaps = [
    { name: 'Situational Intelligence', score: competencyAverages.si, gap: threshold - competencyAverages.si },
    { name: 'Decision Making', score: competencyAverages.dm, gap: threshold - competencyAverages.dm },
    { name: 'Communication', score: competencyAverages.comm, gap: threshold - competencyAverages.comm },
    { name: 'Resource Management', score: competencyAverages.rm, gap: threshold - competencyAverages.rm },
    { name: 'Stakeholder Mgmt', score: competencyAverages.sm, gap: threshold - competencyAverages.sm },
    { name: 'Performance Mgmt', score: competencyAverages.pm, gap: threshold - competencyAverages.pm }
  ].sort((a, b) => b.gap - a.gap);

  const criticalGaps = gaps.filter(g => g.gap > 0);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="w-5 h-5 text-orange-600" />
          Skills Gap Analysis
        </CardTitle>
        <p className="text-xs text-gray-500">Current vs. required competencies (70% threshold)</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {gaps.slice(0, 4).map((skill, idx) => (
            <div key={idx}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">{skill.name}</span>
                <span className={skill.gap > 0 ? 'text-red-600' : 'text-green-600'}>
                  {skill.score}%
                </span>
              </div>
              <div className="relative h-2 bg-gray-200 rounded-full">
                <div 
                  className={`absolute h-full rounded-full ${skill.gap > 0 ? 'bg-orange-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(skill.score, 100)}%` }}
                />
                <div 
                  className="absolute h-full w-0.5 bg-gray-800"
                  style={{ left: '70%' }}
                />
              </div>
            </div>
          ))}
        </div>
        {criticalGaps.length > 0 && (
          <div className="mt-3 p-2 bg-orange-50 rounded-lg text-xs text-orange-800">
            <strong>{criticalGaps.length} competencies</strong> below target threshold
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Flight Risk Indicators Card
export function FlightRiskCard({ assessments, goals, assignedLearning }) {
  // Calculate risk based on low engagement patterns
  const lowScorers = assessments.filter(a => pct(a, 'overall_pct') < 50).length;
  const staleGoals = goals.filter(g => (g.status ?? g.data?.status) === 'overdue' || (g.status ?? g.data?.status) === 'on_hold').length;
  const incompleteLearning = assignedLearning.filter(l => (l.status ?? l.data?.status) !== 'completed').length;
  
  const totalUsers = new Set([
    ...assessments.map(a => a.email ?? a.data?.email),
    ...goals.map(g => g.user_email ?? g.data?.user_email)
  ]).size;

  const riskIndicators = [
    { label: 'Low Assessment Scores', count: lowScorers, severity: 'high' },
    { label: 'Stale/Overdue Goals', count: staleGoals, severity: 'medium' },
    { label: 'Incomplete Learning', count: incompleteLearning, severity: 'low' }
  ];

  const overallRisk = totalUsers > 0 ? Math.round((lowScorers / totalUsers) * 100) : 0;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          Flight Risk Indicators
        </CardTitle>
        <p className="text-xs text-gray-500">Early warning signals for potential turnover</p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 mb-4">
          <div className={`text-3xl font-bold ${overallRisk > 20 ? 'text-red-600' : overallRisk > 10 ? 'text-yellow-600' : 'text-green-600'}`}>
            {overallRisk}%
          </div>
          <span className="text-sm text-gray-600">at elevated risk</span>
        </div>
        <div className="space-y-2">
          {riskIndicators.map((indicator, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  indicator.severity === 'high' ? 'bg-red-500' : 
                  indicator.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                }`} />
                <span className="text-gray-600">{indicator.label}</span>
              </div>
              <span className="font-medium">{indicator.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Promotion Readiness Timeline Card
export function PromotionReadinessCard({ assessments, allUsers }) {
  const readyNow = assessments.filter(a => pct(a, 'overall_pct') >= 85).length;
  const ready6Months = assessments.filter(a => pct(a, 'overall_pct') >= 75 && pct(a, 'overall_pct') < 85).length;
  const ready12Months = assessments.filter(a => pct(a, 'overall_pct') >= 65 && pct(a, 'overall_pct') < 75).length;
  const needsDevelopment = assessments.filter(a => pct(a, 'overall_pct') < 65).length;

  const total = assessments.length || 1;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Promotion Readiness Timeline
        </CardTitle>
        <p className="text-xs text-gray-500">Estimated time to next role readiness</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-24 text-sm text-gray-600">Ready Now</div>
            <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 flex items-center justify-end pr-2"
                style={{ width: `${(readyNow / total) * 100}%` }}
              >
                <span className="text-xs text-white font-medium">{readyNow}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-24 text-sm text-gray-600">6 Months</div>
            <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 flex items-center justify-end pr-2"
                style={{ width: `${(ready6Months / total) * 100}%` }}
              >
                <span className="text-xs text-white font-medium">{ready6Months}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-24 text-sm text-gray-600">12 Months</div>
            <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-yellow-500 flex items-center justify-end pr-2"
                style={{ width: `${(ready12Months / total) * 100}%` }}
              >
                <span className="text-xs text-white font-medium">{ready12Months}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-24 text-sm text-gray-600">12+ Months</div>
            <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gray-400 flex items-center justify-end pr-2"
                style={{ width: `${(needsDevelopment / total) * 100}%` }}
              >
                <span className="text-xs text-white font-medium">{needsDevelopment}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Learning Velocity Card
export function LearningVelocityCard({ assignedLearning, journeyEnrollments }) {
  const completedLearning = assignedLearning.filter(l => (l.status ?? l.data?.status) === 'completed').length;
  const totalLearning = assignedLearning.length || 1;
  const learningRate = Math.round((completedLearning / totalLearning) * 100);

  const completedJourneys = journeyEnrollments.filter(j => (j.status ?? j.data?.status) === 'completed').length;
  const totalJourneys = journeyEnrollments.length || 1;
  const journeyRate = Math.round((completedJourneys / totalJourneys) * 100);

  const avgVelocity = Math.round((learningRate + journeyRate) / 2);
  const velocityTrend = avgVelocity >= 70 ? 'High' : avgVelocity >= 50 ? 'Moderate' : 'Low';

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-600" />
          Learning Velocity
        </CardTitle>
        <p className="text-xs text-gray-500">Development speed across platform</p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 mb-4">
          <div className="text-3xl font-bold text-yellow-600">{avgVelocity}%</div>
          <Badge className={`${
            velocityTrend === 'High' ? 'bg-green-100 text-green-700' :
            velocityTrend === 'Moderate' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {velocityTrend} Velocity
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-xl font-bold text-blue-700">{learningRate}%</div>
            <div className="text-xs text-blue-600">Learning Completion</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-xl font-bold text-purple-700">{journeyRate}%</div>
            <div className="text-xs text-purple-600">Journey Completion</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Leadership Style Distribution Card
export function LeadershipStyleCard({ assessments }) {
  // Derive styles from assessment archetypes
  const styles = {};
  assessments.forEach(a => {
    const archetype = a.archetype_label ?? a.data?.archetype_label ?? 'Developing Leader';
    styles[archetype] = (styles[archetype] || 0) + 1;
  });

  const sortedStyles = Object.entries(styles)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const total = assessments.length || 1;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          Leadership Style Distribution
        </CardTitle>
        <p className="text-xs text-gray-500">Dominant leadership approaches across platform</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedStyles.length > 0 ? sortedStyles.map(([style, count], idx) => (
            <div key={idx}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 truncate">{style}</span>
                <span className="text-gray-500">{count} ({Math.round((count / total) * 100)}%)</span>
              </div>
              <Progress value={(count / total) * 100} className="h-2" />
            </div>
          )) : (
            <div className="text-center text-gray-500 py-4">
              No assessment data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Decision Making Quality Card
export function DecisionMakingCard({ metrics }) {
  const dmScore = metrics.competencyAverages.dm || 0;
  const siScore = metrics.competencyAverages.si || 0;
  
  // Combined decision quality index
  const decisionQuality = Math.round((dmScore * 0.6 + siScore * 0.4));
  
  const qualityLevel = decisionQuality >= 75 ? 'Strong' : decisionQuality >= 60 ? 'Developing' : 'Needs Focus';

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-teal-600" />
          Decision-Making Quality
        </CardTitle>
        <p className="text-xs text-gray-500">Platform-wide decision effectiveness</p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="text-3xl font-bold text-teal-600">{decisionQuality}%</div>
          <Badge className={`${
            qualityLevel === 'Strong' ? 'bg-green-100 text-green-700' :
            qualityLevel === 'Developing' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {qualityLevel}
          </Badge>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Decision Making Score</span>
            <span className="font-medium">{dmScore}%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Situational Intelligence</span>
            <span className="font-medium">{siScore}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Industry Benchmark Card
// Benchmarks sourced from IndustryBenchmarks.pdf (Corporate/Private sector, Mid-Level target scores)
export function IndustryBenchmarkCard({ metrics }) {
  const benchmarks = {
    dm:   { org: metrics.competencyAverages.dm,   industry: 77, label: 'Decision Making',        source: 'Corporate Mid-Level Target' },
    si:   { org: metrics.competencyAverages.si,   industry: 75, label: 'Situational Intelligence', source: 'Corporate Mid-Level Target' },
    comm: { org: metrics.competencyAverages.comm, industry: 78, label: 'Communication',           source: 'Corporate Mid-Level Target' },
    sm:   { org: metrics.competencyAverages.sm,   industry: 79, label: 'Stakeholder Mgmt',        source: 'Corporate Mid-Level Target' },
    rm:   { org: metrics.competencyAverages.rm,   industry: 78, label: 'Resource Management',     source: 'Corporate Mid-Level Target' },
    pm:   { org: metrics.competencyAverages.pm,   industry: 76, label: 'Performance Mgmt',        source: 'Corporate Mid-Level Target' },
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Industry Benchmark Comparison
        </CardTitle>
        <p className="text-xs text-gray-500">Your platform vs. industry standards</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Object.entries(benchmarks).map(([key, data]) => {
            const diff = data.org - data.industry;
            const isAbove = diff >= 0;
            
            return (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{data.label}</span>
                  <div className="flex items-center gap-2">
                    <span className={isAbove ? 'text-green-600' : 'text-red-600'}>
                      {isAbove ? '+' : ''}{diff}%
                    </span>
                    {isAbove ? 
                      <TrendingUp className="w-3 h-3 text-green-600" /> : 
                      <TrendingDown className="w-3 h-3 text-red-600" />
                    }
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden relative">
                    <div 
                      className="absolute h-full bg-blue-500"
                      style={{ width: `${Math.min(data.org, 100)}%` }}
                    />
                    <div 
                      className="absolute h-full w-0.5 bg-gray-800"
                      style={{ left: `${Math.min(data.industry, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-10">{data.org}%</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
          <div className="w-3 h-0.5 bg-gray-800" /> Corporate Mid-Level Industry Target (Research-validated)
        </div>
      </CardContent>
    </Card>
  );
}

// Team Impact Score Card
export function TeamImpactCard({ metrics, goals }) {
  // Calculate correlation between leadership and team performance
  const completedGoals = goals.filter(g => (g.status ?? g.data?.status) === 'completed').length;
  const activeGoals = goals.filter(g => ['active', 'in_progress'].includes(g.status ?? g.data?.status)).length;
  
  const impactScore = Math.round(
    (metrics.avgLeadershipScore * 0.4) + 
    (metrics.goalCompletionRate * 0.4) + 
    (metrics.learningCompletionRate * 0.2)
  );

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600" />
          Team Impact Score
        </CardTitle>
        <p className="text-xs text-gray-500">Leadership correlation with team performance</p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="35"
                stroke="#e5e7eb"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="40"
                cy="40"
                r="35"
                stroke="#6366f1"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${(impactScore / 100) * 220} 220`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-indigo-600">{impactScore}</span>
            </div>
          </div>
          <div className="flex-1 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Active Initiatives</span>
              <span className="font-medium">{activeGoals}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Completed</span>
              <span className="font-medium text-green-600">{completedGoals}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Recommended Development Focus Card
export function DevelopmentFocusCard({ metrics }) {
  const { competencyAverages } = metrics;
  
  // Identify top 3 areas needing focus
  const areas = [
    { name: 'Situational Intelligence', score: competencyAverages.si, icon: Brain },
    { name: 'Decision Making', score: competencyAverages.dm, icon: GitBranch },
    { name: 'Communication', score: competencyAverages.comm, icon: Users },
    { name: 'Resource Management', score: competencyAverages.rm, icon: Layers },
    { name: 'Stakeholder Management', score: competencyAverages.sm, icon: UserCheck },
    { name: 'Performance Management', score: competencyAverages.pm, icon: Target }
  ].sort((a, b) => a.score - b.score).slice(0, 3);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-600" />
          Platform Development Focus
        </CardTitle>
        <p className="text-xs text-gray-500">Priority areas for organizational development</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {areas.map((area, idx) => {
            const Icon = area.icon;
            return (
              <div key={idx} className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                  <Icon className="w-4 h-4 text-amber-700" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-amber-900">{area.name}</div>
                  <div className="text-xs text-amber-700">Current: {area.score}%</div>
                </div>
                <Badge className="bg-amber-200 text-amber-800">#{idx + 1}</Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}