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
  ExternalLink,
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
import FullProfileModal from "./FullProfileModal";
import SuccessionReadinessSection from "./sections/SuccessionReadinessSection";
import BusinessGoalsSection from "./sections/BusinessGoalsSection";
import RecommendedGoalsSection from "./sections/RecommendedGoalsSection";
import AssessmentTrendSection from "./sections/AssessmentTrendSection";
import CompetencyLearningSection from "@/components/mvp/CompetencyLearningSection";
import AddToPlanModal from "@/components/mvp/AddToPlanModal";
import AtreusInsightCard from "./AtreusInsightCard.jsx";

const COMP_SCORE_MAP = {
  "Situational Intelligence": "si_pct",
  "Decision Making": "dm_pct",
  "Communication": "comm_pct",
  "Resource Management": "rm_pct",
  "Stakeholder Management": "sm_pct",
  "Performance Management": "pm_pct",
};

function TopGapCoursesSection({ assessment, user, onAddToPlan }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedGap, setExpandedGap] = useState(null);

  // Identify top 3 competency gaps (lowest scores)
  const gaps = Object.entries(COMP_SCORE_MAP)
    .map(([name, key]) => ({ name, score: assessment[key] ?? 100 }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map(g => g.name);

  useEffect(() => {
    if (!gaps.length) { setLoading(false); return; }
    const load = async () => {
      try {
        const resources = await base44.entities.LearningResource.filter({ provider: "LinkedIn Learning", is_active: true });
        // Keep only courses for the top 3 gap competencies, sorted by gap priority
        const filtered = [];
        gaps.forEach(gap => {
          const gapCourses = resources.filter(r => r.competencies?.includes(gap));
          gapCourses.slice(0, 2).forEach(c => filtered.push({ ...c, _gapName: gap }));
        });
        setCourses(filtered);
      } catch (e) {
        console.warn("[TopGapCoursesSection]", e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [assessment?.id]);

  if (loading || !courses.length) return null;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-100 rounded-lg">
            <BookOpen className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <CardTitle>Recommended Learning</CardTitle>
            <p className="text-sm text-gray-500 mt-0.5">
              Courses matched to your top 3 development areas. Add any to your plan.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {gaps.map(gap => {
          const gapCourses = courses.filter(c => c._gapName === gap);
          if (!gapCourses.length) return null;
          const score = assessment[COMP_SCORE_MAP[gap]];
          const isExpanded = expandedGap === gap;
          return (
            <div key={gap} className="rounded-xl border border-gray-100 overflow-hidden">
              <button
                onClick={() => setExpandedGap(isExpanded ? null : gap)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800">{gap}</span>
                  {score != null && (
                    <span className="text-xs text-amber-600 font-medium bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                      {score}% — development focus
                    </span>
                  )}
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {isExpanded && (
                <div className="divide-y divide-gray-50">
                  {gapCourses.map(course => (
                    <div key={course.id} className="px-4 py-3 flex items-start gap-3 bg-white">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 leading-snug">{course.title}</p>
                        {course.author && <p className="text-xs text-gray-500 mt-0.5">{course.author}</p>}
                        {course.duration_string && <p className="text-xs text-gray-400 mt-0.5">{course.duration_string}</p>}
                        <a
                          href={course.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#0077b5] font-medium hover:underline mt-1.5"
                        >
                          <ExternalLink className="w-3 h-3" /> View on LinkedIn Learning
                        </a>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 shrink-0 text-[#0202ff] border-[#0202ff]/30 hover:bg-blue-50"
                        onClick={() => onAddToPlan(course)}
                      >
                        + Add to Plan
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

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
  const [addToPlanResource, setAddToPlanResource] = useState(null);
  const [generatedNarrative, setGeneratedNarrative] = useState(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [cachedReport, setCachedReport] = useState(null);

  useEffect(() => {
    if (user?.email) loadData();
  }, [user?.email]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [insights, assessments, goalList, assignedLearning] = await Promise.all([
        base44.entities.AssessmentInsights.filter({ user_email: user.email, status: "generated" }, "-created_date", 1).catch(() => []),
        base44.entities.Assessment.filter({ email: user.email }, "-submission_ts", 10).catch(() => []),
        base44.entities.Goal.filter({ created_by: user.email }).catch(() => []),
        base44.entities.AssignedLearning.filter({ user_email: user.email }).catch(() => []),
      ]);

      const best   = insights[0] || null;
      const latest = assessments[0] || null;
      setStoredInsight(best);
      setLatestAssessment(latest);
      setAssessments(assessments);
      setGoals(goalList);

      const completedGoals     = goalList.filter(g => g.status === "completed").length;
      const goalCompletionRate = goalList.length > 0 ? Math.round((completedGoals / goalList.length) * 100) : 0;
      const overdueGoals       = goalList.filter(g => g.status === "overdue").length;

      if (onMetricsUpdate) {
        const insightCount = (best?.top_strengths?.length || 0) + (best?.development_areas?.length || 0) + (best?.recommendations?.length || 0);
        onMetricsUpdate({ totalInsights: insightCount, actionItems: overdueGoals, completionRate: goalCompletionRate });
      }

      // Load cached report in parallel — don't wait for the above to finish first
      if (latest) {
        base44.entities.LeadershipProfileReport.filter({
          user_email: user.email,
          assessment_id: latest.id,
          status: "generated"
        }).then(cachedReports => {
          if (cachedReports[0]) {
            setCachedReport(cachedReports[0]);
            if (!best?.summary && cachedReports[0].leadership_dna?.description) {
              setGeneratedNarrative(cachedReports[0].leadership_dna.description);
            }
          } else if (!best?.summary) {
            generateNarrative(latest);
          }
        }).catch(() => {
          if (!best?.summary) generateNarrative(latest);
        });
      }
    } catch (err) {
      console.error("[MyInsightsView] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateNarrative = async (assessment) => {
    setNarrativeLoading(true);
    try {
      const scores = {
        overall: assessment.overall_pct,
        si: assessment.si_pct,
        dm: assessment.dm_pct,
        comm: assessment.comm_pct,
        rm: assessment.rm_pct,
        sm: assessment.sm_pct,
        pm: assessment.pm_pct,
        band: assessment.band_overall,
        archetype: assessment.archetype_label,
      };

      // Determine archetype from scores if not already set
      const sorted = [
        { name: "Situational Intelligence", score: scores.si },
        { name: "Decision Making", score: scores.dm },
        { name: "Communication", score: scores.comm },
        { name: "Resource Management", score: scores.rm },
        { name: "Stakeholder Management", score: scores.sm },
        { name: "Performance Management", score: scores.pm },
      ].sort((a, b) => b.score - a.score);

      const top2 = sorted.slice(0, 2).map(c => c.name).join(" and ");
      const bottom2 = sorted.slice(-2).map(c => c.name).join(" and ");

      const prompt = `You are an expert leadership development consultant interpreting a leadership competency assessment. Generate a 2–3 sentence personalized narrative summary for a leader based on their scores.

Leader: ${user?.full_name || "the leader"}
Role: ${user?.current_role || "leader"}
Sector: ${user?.sector || "corporate"}
Overall Leadership Index: ${scores.overall}% (${scores.band || "developing"})
Archetype: ${scores.archetype || "not yet determined"}

Competency Scores (out of 100%):
- Situational Intelligence: ${scores.si}%
- Decision Making: ${scores.dm}%
- Communication: ${scores.comm}%
- Resource Management: ${scores.rm}%
- Stakeholder Management: ${scores.sm}%
- Performance Management: ${scores.pm}%

Top strengths: ${top2}
Development areas: ${bottom2}

Leadership Archetype Framework context:
- Scores 80–100% = Mastery (exemplary leadership in that competency)
- Scores 65–79% = Proficient (solid, reliable performance)
- Scores 50–64% = Developing (emerging capability, needs targeted growth)
- Scores below 50% = Awareness (foundational stage)

Write a warm, professional, personalized 2–3 sentence narrative that:
1. Acknowledges their overall standing and dominant leadership strengths
2. Identifies their primary development opportunity with an encouraging, growth-oriented framing
3. Connects their profile to practical leadership impact

Do NOT use bullet points. Write in flowing prose. Be specific to their actual scores and competencies.`;

      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      setGeneratedNarrative(result);
    } catch (e) {
      console.warn("[MyInsightsView] Narrative generation failed:", e.message);
    } finally {
      setNarrativeLoading(false);
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

  // Industry benchmarks (Corporate sector, First-Line manager level targets)
  const BENCHMARKS = { SI: 68, DM: 70, Comm: 72, RM: 71, SM: 72, PM: 69 };

  const radarData = latestAssessment ? [
    { competency: "SI",   score: latestAssessment.si_pct   || 0, benchmark: BENCHMARKS.SI,   fullName: "Situational Intelligence" },
    { competency: "DM",   score: latestAssessment.dm_pct   || 0, benchmark: BENCHMARKS.DM,   fullName: "Decision Making" },
    { competency: "Comm", score: latestAssessment.comm_pct || 0, benchmark: BENCHMARKS.Comm, fullName: "Communication" },
    { competency: "RM",   score: latestAssessment.rm_pct   || 0, benchmark: BENCHMARKS.RM,   fullName: "Resource Management" },
    { competency: "SM",   score: latestAssessment.sm_pct   || 0, benchmark: BENCHMARKS.SM,   fullName: "Stakeholder Management" },
    { competency: "PM",   score: latestAssessment.pm_pct   || 0, benchmark: BENCHMARKS.PM,   fullName: "Performance Management" },
  ] : null;

  const competencies = latestAssessment ? [
    { fieldKey: "si",   score: latestAssessment.si_pct   || 0 },
    { fieldKey: "dm",   score: latestAssessment.dm_pct   || 0 },
    { fieldKey: "comm", score: latestAssessment.comm_pct || 0 },
    { fieldKey: "rm",   score: latestAssessment.rm_pct   || 0 },
    { fieldKey: "sm",   score: latestAssessment.sm_pct   || 0 },
    { fieldKey: "pm",   score: latestAssessment.pm_pct   || 0 },
  ] : [];

  // First name for greeting — prefer display_name, fall back to full_name
  const firstName = (() => {
    const name = user?.display_name || user?.full_name || "";
    if (!name || name.includes("@")) return null;
    return name.split(" ")[0];
  })();

  return (
    <div className="space-y-6">

      {/* ── 1. Leadership Profile Hero ──────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-lg overflow-hidden">
          {/* Top banner */}
          <div className="px-6 py-5" style={{ background: 'linear-gradient(to right, #0012ff, #3b30ff)' }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Leadership Profile{firstName ? ` · ${firstName}` : ""}
                </h2>
                {user?.current_role && (
                  <p className="text-indigo-200 text-sm mt-0.5">
                    {user.current_role}{user?.sector ? ` · ${user.sector}` : ""}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                 {hasInsight && storedInsight.archetype && (
                   <Badge className="bg-white/20 text-white border-white/30 border text-sm px-3 py-1">
                     {storedInsight.archetype}
                   </Badge>
                 )}
                 {latestAssessment?.overall_pct != null && (
                   <div className="text-right shrink-0">
                     <div className="text-3xl font-extrabold text-white leading-none">{latestAssessment.overall_pct}%</div>
                     <div className="text-indigo-200 text-xs mt-0.5">Leadership Index</div>
                   </div>
                 )}
               </div>
            </div>
          </div>

          <CardContent className="p-0">
            {!hasInsight && !latestAssessment ? (
              <div className="px-6 py-8">
                <ProcessingPlaceholder label="Complete an assessment to generate your leadership profile." />
              </div>
            ) : (
              <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">

                {/* Left: Summary + Strengths/Dev Areas */}
                {(() => {
                  // Derive strengths/dev areas from assessment scores if no stored insight
                  const COMP_NAMES = {
                    si_pct: "Situational Intelligence", dm_pct: "Decision Making",
                    comm_pct: "Communication", rm_pct: "Resource Management",
                    sm_pct: "Stakeholder Management", pm_pct: "Performance Management",
                  };
                  const sorted = latestAssessment
                    ? Object.entries(COMP_NAMES)
                        .map(([k, name]) => ({ name, score: latestAssessment[k] ?? null }))
                        .filter(c => c.score !== null)
                        .sort((a, b) => b.score - a.score)
                    : [];
                  const strengths = hasInsight && storedInsight.top_strengths?.length
                    ? storedInsight.top_strengths
                    : sorted.slice(0, 3).map(c => `${c.name} (${c.score}%)`);
                  const devAreas = hasInsight && storedInsight.development_areas?.length
                    ? storedInsight.development_areas
                    : sorted.slice(-3).reverse().map(c => `${c.name} (${c.score}%)`);
                  const summary = hasInsight && storedInsight.summary
                    ? storedInsight.summary
                    : generatedNarrative || (latestAssessment ? `Overall score: ${latestAssessment.overall_pct}% — ${latestAssessment.band_overall || 'results processed'}.` : null);

                  return (
                    <div className="px-6 py-6 space-y-5">
                      {narrativeLoading && !summary && (
                        <div className="flex items-center gap-2 text-gray-400 text-sm py-1">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Generating your leadership narrative…</span>
                        </div>
                      )}
                      {summary && (
                        <p className="text-gray-600 leading-relaxed text-sm">{summary}</p>
                      )}
                      <div className="grid sm:grid-cols-2 gap-5">
                        {strengths.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <div className="p-1.5 bg-green-100 rounded-md">
                                <Star className="w-3.5 h-3.5 text-green-600" />
                              </div>
                              <span className="text-sm font-semibold text-gray-800">Natural Strengths</span>
                            </div>
                            <ul className="space-y-2">
                              {strengths.slice(0, 3).map((s, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {devAreas.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <div className="p-1.5 bg-blue-100 rounded-md">
                                <Target className="w-3.5 h-3.5 text-blue-600" />
                              </div>
                              <span className="text-sm font-semibold text-gray-800">Development Focus</span>
                            </div>
                            <ul className="space-y-2">
                              {devAreas.slice(0, 3).map((d, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                  <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                                  <span>{d}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Right: Radar chart + legend */}
                {radarData && (
                  <div className="px-6 py-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Competency Scores</p>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="inline-block w-3 h-0.5 rounded" style={{ backgroundColor: '#0012ff' }} />
                        Your Score
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="inline-block w-3 h-0.5 rounded border-dashed border border-amber-500" style={{ backgroundColor: 'transparent' }} />
                        Industry Benchmark
                      </div>
                    </div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="#e5e7eb" />
                          <PolarAngleAxis dataKey="competency" tick={{ fontSize: 12, fontWeight: 600, fill: "#0012ff" }} />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar name="Industry Benchmark" dataKey="benchmark" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.08} strokeWidth={1.5} strokeDasharray="4 3" />
                          <Radar name="Your Score" dataKey="score" stroke="#0012ff" fill="#0012ff" fillOpacity={0.25} strokeWidth={2} />
                          <RechartsTooltip formatter={(v, n, p) => [`${v}%`, n === "Your Score" ? p.payload.fullName : `${p.payload.fullName} Benchmark`]} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Legend */}
                    <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 border-t border-gray-100 pt-3">
                      {radarData.map((d) => (
                        <div key={d.competency} className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="font-bold w-8 shrink-0" style={{ color: '#0012ff' }}>{d.competency}</span>
                          <span>{d.score}% <span className="text-gray-400">/ {d.benchmark}% target</span></span>
                        </div>
                      ))}
                    </div>
                    {/* View Full Profile button */}
                    {latestAssessment && (
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <Button
                          size="sm"
                          className="w-full text-white text-xs"
                          style={{ backgroundColor: '#0012ff' }}
                          onClick={() => setShowFullProfile(true)}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> View Full Profile
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── 2. Atreus Insight Card ───────────────────────────────── */}
      {latestAssessment && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <AtreusInsightCard assessment={latestAssessment} user={user} insight={storedInsight} />
        </motion.div>
      )}

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

      {/* ── 5c. Contextual Courses — Top 3 Competency Gaps ───────── */}
      {latestAssessment && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
          <TopGapCoursesSection
            assessment={latestAssessment}
            user={user}
            onAddToPlan={(resource) => setAddToPlanResource(resource)}
          />
        </motion.div>
      )}

      <AddToPlanModal
        isOpen={!!addToPlanResource}
        onClose={() => setAddToPlanResource(null)}
        resource={addToPlanResource}
        userEmail={user?.email}
      />

      <FullProfileModal
        open={showFullProfile}
        onClose={() => setShowFullProfile(false)}
        user={user}
        assessment={latestAssessment}
        insight={storedInsight}
        narrative={generatedNarrative}
        assessmentId={latestAssessment?.id}
        preloadedReport={cachedReport}
      />

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