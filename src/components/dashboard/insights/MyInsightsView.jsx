import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  TrendingUp,
  Target,
  BookOpen,
  BarChart3,
  Map,
  Zap,
  AlertTriangle,
  Star,
  Eye,
  Clock,
  Loader2,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Brain,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";

// Section components
import CompetencyExpandableCard from "./sections/CompetencyExpandableCard";
import SuccessionReadinessSection from "./sections/SuccessionReadinessSection";
import BusinessGoalsSection from "./sections/BusinessGoalsSection";
import RecommendedGoalsSection from "./sections/RecommendedGoalsSection";
import AssessmentTrendSection from "./sections/AssessmentTrendSection";

function ProcessingPlaceholder({ label }) {
  return (
    <div className="flex items-center gap-2 py-6 text-gray-400 text-sm">
      <Clock className="w-4 h-4 shrink-0" />
      <span>{label || "Insights processing..."}</span>
    </div>
  );
}

export default function MyInsightsView({ user, onMetricsUpdate }) {
  const [loading, setLoading]             = useState(true);
  const [storedInsight, setStoredInsight] = useState(null);
  const [latestAssessment, setLatestAssessment] = useState(null);
  const [assessments, setAssessments]     = useState([]);
  const [goals, setGoals]                 = useState([]);

  useEffect(() => {
    if (user?.email) loadData();
  }, [user?.email]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [insights, assessments, goalList, assignedLearning, journeyEnrollments] = await Promise.all([
        base44.entities.AssessmentInsights.filter({ user_email: user.email, status: "generated" }, "-created_date", 1).catch(() => []),
        base44.entities.Assessment.filter({ email: user.email }, "-submission_ts", 10).catch(() => []),
        base44.entities.Goal.filter({ created_by: user.email }).catch(() => []),
        base44.entities.AssignedLearning.filter({ user_email: user.email }).catch(() => []),
        base44.entities.JourneyEnrollment.filter({ user_email: user.email }).catch(() => []),
      ]);

      const best   = insights[0] || null;
      const latest = assessments[0] || null;
      setStoredInsight(best);
      setLatestAssessment(latest);
      setAssessments(assessments);
      setGoals(goalList);

      const completedGoals  = goalList.filter(g => g.status === "completed").length;
      const goalCompletionRate = goalList.length > 0 ? Math.round((completedGoals / goalList.length) * 100) : 0;
      const completedLearning  = assignedLearning.filter(l => l.status === "completed").length;
      const learningRate       = assignedLearning.length > 0 ? Math.round((completedLearning / assignedLearning.length) * 100) : 0;
      const overdueGoals       = goalList.filter(g => g.status === "overdue").length;

      if (onMetricsUpdate) {
        const insightCount = (best?.top_strengths?.length || 0) + (best?.development_areas?.length || 0) + (best?.recommendations?.length || 0);
        onMetricsUpdate({ totalInsights: insightCount, actionItems: overdueGoals, completionRate: goalCompletionRate });
      }
    } catch (err) {
      console.error("[MyInsightsView] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action) => {
    const routes = {
      take_assessment:  "LeadershipAssessment",
      update_goals:     "Performance",
      view_learning:    "LearningLibrary",
      view_career_path: "CareerPathExplorer",
    };
    const page = routes[action];
    if (page) window.location.href = createPageUrl(page);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const hasInsight = !!storedInsight;

  const radarData = latestAssessment ? [
    { competency: "SI",   score: latestAssessment.si_pct   || 0, fullName: "Situational Intelligence" },
    { competency: "DM",   score: latestAssessment.dm_pct   || 0, fullName: "Decision Making" },
    { competency: "Comm", score: latestAssessment.comm_pct || 0, fullName: "Communication" },
    { competency: "RM",   score: latestAssessment.rm_pct   || 0, fullName: "Resource Management" },
    { competency: "SM",   score: latestAssessment.sm_pct   || 0, fullName: "Stakeholder Management" },
    { competency: "PM",   score: latestAssessment.pm_pct   || 0, fullName: "Performance Management" },
  ] : null;

  const competencies = latestAssessment ? [
    { fieldKey: "si",   score: latestAssessment.si_pct   || 0 },
    { fieldKey: "dm",   score: latestAssessment.dm_pct   || 0 },
    { fieldKey: "comm", score: latestAssessment.comm_pct || 0 },
    { fieldKey: "rm",   score: latestAssessment.rm_pct   || 0 },
    { fieldKey: "sm",   score: latestAssessment.sm_pct   || 0 },
    { fieldKey: "pm",   score: latestAssessment.pm_pct   || 0 },
  ] : [];

  // First name for greeting
  const firstName = (() => {
    const name = user?.full_name || "";
    if (!name || name.includes("@")) return null;
    return name.split(" ")[0];
  })();

  return (
    <div className="space-y-6">

      {/* ── 1. Leadership Profile Hero ──────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              {/* Left: Profile */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">
                  Leadership Profile{firstName ? ` for ${firstName}` : ""}
                </h2>
                {user?.current_role && (
                  <p className="text-sm text-gray-500 mt-1">
                    {user.current_role}{user?.sector ? ` · ${user.sector}` : ""}
                  </p>
                )}

                {hasInsight && storedInsight.archetype && (
                  <div className="mt-4">
                    <Badge className="bg-purple-100 text-purple-800 text-sm px-3 py-1 mb-3">
                      {storedInsight.archetype}
                    </Badge>
                    <p className="text-gray-700 leading-relaxed text-sm mt-2">
                      {storedInsight.summary || "Your personalized summary is ready."}
                    </p>
                  </div>
                )}

                {!hasInsight && (
                  <ProcessingPlaceholder label="Complete an assessment to generate your leadership profile." />
                )}

                {/* Strengths & Dev Areas inline */}
                {hasInsight && (
                  <div className="mt-4 grid sm:grid-cols-2 gap-4">
                    {storedInsight.top_strengths?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1 mb-2">
                          <Star className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-semibold text-green-800">Natural Strengths</span>
                        </div>
                        <ul className="space-y-1">
                          {storedInsight.top_strengths.slice(0, 3).map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                              <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {storedInsight.development_areas?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1 mb-2">
                          <Target className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-semibold text-blue-800">Primary Development Focus</span>
                        </div>
                        <ul className="space-y-1">
                          {storedInsight.development_areas.slice(0, 3).map((d, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                              <Lightbulb className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                              {d}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right: Radar + Score */}
              {radarData && (
                <div className="md:w-72 shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-700">Competency Scores</span>
                    {latestAssessment?.overall_pct != null && (
                      <div className="text-right">
                        <span className="text-3xl font-bold text-indigo-700">{latestAssessment.overall_pct}%</span>
                        <p className="text-xs text-gray-400">Leadership Index</p>
                      </div>
                    )}
                  </div>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="competency" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                        <Radar name="Your Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.5} />
                        <RechartsTooltip formatter={(v, n, p) => [`${v}%`, p.payload.fullName]} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── 3. Understanding Your Competencies (expandable) ─────── */}
      {competencies.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Brain className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <CardTitle>Understanding Your Competencies</CardTitle>
                  <p className="text-sm text-gray-500 mt-0.5">Each competency reflects specific leadership behaviors. Expand to see details.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {competencies.map((c) => (
                <CompetencyExpandableCard
                  key={c.fieldKey}
                  fieldKey={c.fieldKey}
                  score={c.score}
                  leadershipLevel={user?.leadership_level || null}
                />
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── 4. Business Goals Your Development Supports ─────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <BusinessGoalsSection user={user} />
      </motion.div>

      {/* ── 5. Recommended Development Goals (actionable) ───────── */}
      {hasInsight && storedInsight.recommendations?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <RecommendedGoalsSection
            recommendations={storedInsight.recommendations}
            userEmail={user?.email}
            goals={goals}
            assessment={latestAssessment}
          />
        </motion.div>
      )}

      {/* ── 5b. Assessment Trend (only if multiple assessments) ──── */}
      {assessments.length >= 2 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
          <AssessmentTrendSection assessments={assessments} />
        </motion.div>
      )}

      {/* ── 6. Succession Readiness Profile ─────────────────────── */}
      {latestAssessment && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <SuccessionReadinessSection user={user} assessment={latestAssessment} />
        </motion.div>
      )}

      {/* ── 7. Quick Actions footer ──────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button variant="outline" className="h-auto py-4 flex-col items-start hover:bg-blue-50" onClick={() => handleQuickAction("update_goals")}>
                <Target className="w-5 h-5 text-blue-600 mb-2" />
                <span className="font-semibold">Update Goals</span>
                <span className="text-xs text-gray-500 mt-1">Track your progress</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col items-start hover:bg-purple-50" onClick={() => handleQuickAction("take_assessment")}>
                <BarChart3 className="w-5 h-5 text-purple-600 mb-2" />
                <span className="font-semibold">Take Assessment</span>
                <span className="text-xs text-gray-500 mt-1">Measure your growth</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col items-start hover:bg-green-50" onClick={() => handleQuickAction("view_learning")}>
                <BookOpen className="w-5 h-5 text-green-600 mb-2" />
                <span className="font-semibold">Browse Learning</span>
                <span className="text-xs text-gray-500 mt-1">Find resources</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col items-start hover:bg-indigo-50" onClick={() => handleQuickAction("view_career_path")}>
                <Map className="w-5 h-5 text-indigo-600 mb-2" />
                <span className="font-semibold">Explore Careers</span>
                <span className="text-xs text-gray-500 mt-1">Plan your path</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

    </div>
  );
}