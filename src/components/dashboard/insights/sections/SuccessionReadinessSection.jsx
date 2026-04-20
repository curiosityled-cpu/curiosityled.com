import React, { useState, useEffect } from "react";
import { TrendingUp, Loader2, Sparkles, AlertCircle, ChevronDown, ChevronUp, Map } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { base44 } from "@/api/base44Client";
import LearningJourneyTimeline from "./LearningJourneyTimeline";
import DevelopmentPlanView from "@/components/development/DevelopmentPlanView";

const COMP_LABELS = {
  "Situational Intelligence": "si_pct",
  "Decision Making": "dm_pct",
  "Communication": "comm_pct",
  "Resource Management": "rm_pct",
  "Stakeholder Management": "sm_pct",
  "Performance Management": "pm_pct",
};

const CONTRIBUTING_FACTORS = (assessment) => [
  { label: "Assessment Score",   value: assessment?.overall_pct ?? 0 },
  { label: "Learning Progress",  value: 60 }, // placeholder — can be wired to real data
  { label: "Goal Achievement",   value: 70 },
  { label: "Experience Level",   value: 80 },
];

function ReadinessBand(score) {
  if (score >= 80) return { label: "Ready Now",    color: "bg-emerald-100 text-emerald-700" };
  if (score >= 65) return { label: "Nearly Ready", color: "bg-blue-100 text-blue-700" };
  if (score >= 50) return { label: "In Progress",  color: "bg-amber-100 text-amber-700" };
  return                  { label: "Early Stage",  color: "bg-gray-100 text-gray-600" };
}

export default function SuccessionReadinessSection({ user, assessment }) {
  const [loading, setLoading]         = useState(true);
  const [nextRole, setNextRole]       = useState(null);
  const [readinessScore, setReadiness] = useState(null);
  const [steps, setSteps]             = useState([]);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  useEffect(() => {
    if (user?.email && assessment) loadReadiness();
  }, [user?.email, assessment?.id]);

  const loadReadiness = async () => {
    setLoading(true);
    try {
      // Try to find a target role from CareerPath entities linked to user profile
      let foundRole = null;
      let score = null;

      if (user?.current_role_id) {
        const paths = await base44.entities.CareerPath.filter({ from_role_id: user.current_role_id }).catch(() => []);
        if (paths.length > 0) {
          const path = paths[0];
          const roles = await base44.entities.Role.filter({ id: path.to_role_id }).catch(() => []);
          if (roles.length > 0) {
            foundRole = roles[0];
            // Calculate readiness: avg of target competency scores vs assessment
            const targetComps = foundRole.behavioral_competencies || [];
            if (targetComps.length > 0 && assessment) {
              const compMap = {
                "Situational Intelligence": assessment.si_pct,
                "Decision Making": assessment.dm_pct,
                "Communication": assessment.comm_pct,
                "Resource Management": assessment.rm_pct,
                "Stakeholder Management": assessment.sm_pct,
                "Performance Management": assessment.pm_pct,
              };
              let total = 0, count = 0;
              targetComps.forEach(c => {
                const actual = compMap[c.name];
                const target = c.target_score || 70;
                if (actual != null) { total += Math.min(100, (actual / target) * 100); count++; }
              });
              score = count > 0 ? Math.round(total / count) : null;
            }
          }
        }
      }

      if (foundRole) {
        setNextRole({ title: foundRole.title, level: foundRole.level });
        setReadiness(score ?? Math.round((assessment?.overall_pct || 50) * 0.9));
        setSteps([
          `Leadership competencies (need 80%+)`,
          `Learning completion (need 70%+)`,
          `Goal achievement (need 80%+)`,
          `Relevant experience (need 2Y+)`,
        ]);
        setAiGenerated(false);
      } else {
        // Fallback: generate via AI on the fly
        setAiGenerated(true);
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Given a leader with these assessment scores: Overall=${assessment?.overall_pct}%, SI=${assessment?.si_pct}%, DM=${assessment?.dm_pct}%, Comm=${assessment?.comm_pct}%, RM=${assessment?.rm_pct}%, SM=${assessment?.sm_pct}%, PM=${assessment?.pm_pct}%. Archetype: ${assessment?.archetype_label}. Suggest a realistic next leadership role title, an overall readiness score (0-100), and 4 concrete steps to get there.`,
          response_json_schema: {
            type: "object",
            properties: {
              next_role_title: { type: "string" },
              readiness_score: { type: "number" },
              steps: { type: "array", items: { type: "string" } }
            },
            required: ["next_role_title", "readiness_score", "steps"]
          }
        }).catch(() => null);

        if (result) {
          setNextRole({ title: result.next_role_title, level: null });
          setReadiness(Math.min(100, Math.max(0, result.readiness_score)));
          setSteps(result.steps || []);
        }
      }
    } catch (err) {
      console.error("[SuccessionReadiness] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
          <span className="text-sm text-gray-500">Calculating succession readiness...</span>
        </CardContent>
      </Card>
    );
  }

  if (!assessment) return null;

  const band    = readinessScore != null ? ReadinessBand(readinessScore) : null;
  const factors = CONTRIBUTING_FACTORS(assessment);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-1">
            <CardTitle>Succession Readiness Profile</CardTitle>
            <p className="text-sm text-gray-500 mt-0.5">Your potential for taking on next-level leadership responsibilities</p>
          </div>
          {aiGenerated && (
            <div className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
              <Sparkles className="w-3 h-3" />
              AI-estimated — link a career path for precision
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Next Role */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Next Level Role Potential</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{nextRole?.title || "Senior Director/VP"}</p>
          </div>
          {band && <Badge className={`${band.color} text-sm px-3 py-1`}>{band.label}</Badge>}
        </div>

        {/* Overall score bar */}
        {readinessScore != null && (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-gray-700">Overall Readiness Score</span>
              <span className="font-bold text-gray-900">{readinessScore}%</span>
            </div>
            <Progress value={readinessScore} className="h-4 rounded-full" />
            <p className="text-xs text-gray-400 mt-1">A 6–18 months with targeted development</p>
          </div>
        )}

        {/* Contributing factors */}
        {factors.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Contributing Factors</p>
            <div className="space-y-2">
              {factors.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-40 shrink-0">{f.label}</span>
                  <Progress value={f.value} className="h-2 flex-1" />
                  <span className="text-sm font-medium text-gray-700 w-10 text-right">{f.value}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Steps to Ready Now */}
        {steps.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Steps to "Ready Now"</p>
            <ul className="space-y-1">
              {steps.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA */}
        <div className="flex gap-3 pt-2 border-t flex-wrap items-center">
          <Button variant="outline" size="sm" onClick={() => window.location.href = "/Performance"}>
            Speak to Manager
          </Button>
          <Button
            size="sm"
            variant={showTimeline ? "secondary" : "outline"}
            className="ml-auto flex items-center gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            onClick={() => setShowTimeline((v) => !v)}
          >
            <Map className="w-4 h-4" />
            {showTimeline ? "Hide" : "Plan My Journey"}
            {showTimeline ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </div>

        {/* Learning Journey Timeline + Off-Platform Experiences + Save */}
        {showTimeline && (
          <div className="pt-4 border-t mt-2 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-800">Journey Planner</h3>
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={async () => {
                  try {
                    const competencies = Object.keys(COMP_LABELS || {});
                    await base44.entities.DevelopmentPlan.create({
                      user_email: user.email,
                      title: `${nextRole?.title || "Leadership Development"} Journey`,
                      description: `Development plan targeting the ${nextRole?.title || "next level"} role.`,
                      target_competencies: competencies.slice(0, 3),
                      status: "active",
                      experiences: [],
                      learning_items: [],
                    });
                    window.location.href = "/MyDevelopment";
                  } catch (err) {
                    console.error("Error saving journey:", err);
                  }
                }}
              >
                Save Journey
              </Button>
            </div>
            <LearningJourneyTimeline assessment={assessment} user={user} />
            <div className="border-t pt-4">
              <DevelopmentPlanView user={user} assessment={assessment} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}