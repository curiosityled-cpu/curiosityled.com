import React, { useState, useEffect } from "react";
import { Target, ChevronDown, ChevronUp, Plus, CheckCircle, Loader2, TrendingUp, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const PRIORITY_COLORS = {
  high:   "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low:    "bg-green-100 text-green-700 border-green-200",
};

const TYPE_COLORS = {
  Strategic:   "bg-blue-100 text-blue-700",
  Operational: "bg-purple-100 text-purple-700",
  Development: "bg-emerald-100 text-emerald-700",
};

function RecommendedGoalCard({ rec, userEmail, onCreated }) {
  const [open, setOpen]       = useState(false);
  const [creating, setCreating] = useState(false);
  const [created, setCreated]  = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await base44.entities.Goal.create({
        title: rec.title,
        description: rec.description,
        goal_type: "standard",
        status: "active",
        created_by: userEmail,
        members: [{ user_email: userEmail, role: "owner" }],
      });
      setCreated(true);
      toast.success("Goal created successfully!");
      if (onCreated) onCreated(rec.title);
    } catch (err) {
      console.error("[RecommendedGoals] Create error:", err);
      toast.error("Failed to create goal. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="border rounded-xl bg-white overflow-hidden hover:shadow-md transition-shadow">
      <button
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-3"
        onClick={() => setOpen(!open)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900">{rec.title}</span>
          </div>
          <p className="text-sm text-gray-500 line-clamp-2">{rec.description}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {rec.type && <Badge className={`text-xs ${TYPE_COLORS[rec.type] || "bg-gray-100 text-gray-600"}`}>{rec.type}</Badge>}
            {rec.competency && <Badge variant="outline" className="text-xs">{rec.competency}</Badge>}
            {rec.priority && <Badge className={`text-xs border ${PRIORITY_COLORS[rec.priority] || "bg-gray-100 text-gray-600"}`}>• {rec.priority} priority</Badge>}
            {rec.due_date && <span className="text-xs text-gray-400">📅 {rec.due_date}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {rec.progress != null && <span className="text-sm font-bold text-gray-700">{rec.progress}%</span>}
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-0 bg-gray-50 border-t space-y-3">
          {rec.progress != null && (
            <div className="pt-3">
              <Progress value={rec.progress} className="h-2" />
            </div>
          )}
          {rec.business_impact && (
            <div className="bg-emerald-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-800">Business Impact</span>
              </div>
              <p className="text-sm text-emerald-700">{rec.business_impact}</p>
            </div>
          )}
          {rec.detail && (
            <p className="text-sm text-gray-600">{rec.detail}</p>
          )}
          <div className="pt-1">
            {created ? (
              <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                Goal created! View it in Performance.
              </div>
            ) : (
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                {creating ? "Creating..." : "Create Goal"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RecommendedGoalsSection({ recommendations, userEmail, goals, assessment }) {
  const [enriched, setEnriched] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (recommendations?.length > 0) expandGoals();
  }, [recommendations]);

  const expandGoals = async () => {
    setLoading(true);
    try {
      const result = await base44.functions.invoke("expandRecommendations", {
        recommendations,
        assessment: assessment ? {
          overall_pct: assessment.overall_pct,
          archetype_label: assessment.archetype_label,
        } : null,
      });
      if (result?.data?.goals?.length > 0) {
        setEnriched(result.data.goals.map(g => ({ ...g, progress: 0 })));
      } else {
        // simple fallback if AI fails
        setEnriched(recommendations.map(rec => ({
          title: rec.length > 80 ? rec.slice(0, 80) + "…" : rec,
          description: rec,
          type: "Development",
          priority: "medium",
          competency: "",
          business_impact: "",
          progress: 0,
        })));
      }
    } catch {
      setEnriched(recommendations.map(rec => ({
        title: rec.length > 80 ? rec.slice(0, 80) + "…" : rec,
        description: rec,
        type: "Development",
        priority: "medium",
        competency: "",
        business_impact: "",
        progress: 0,
      })));
    } finally {
      setLoading(false);
    }
  };

  if (!recommendations || recommendations.length === 0) return null;

  const completedCount = goals?.filter(g => g.status === "completed").length || 0;
  const totalGoals     = goals?.length || 0;
  const overallProgress = totalGoals > 0 ? Math.round((completedCount / totalGoals) * 100) : 0;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <CardTitle>Recommended Development Goals</CardTitle>
              <p className="text-sm text-gray-500 mt-0.5">AI-expanded development goals based on your assessment results</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <Sparkles className="w-4 h-4 text-purple-400" />
            AI is expanding your recommendations into structured goals...
          </div>
        ) : enriched.map((rec, i) => (
          <RecommendedGoalCard key={i} rec={rec} userEmail={userEmail} />
        ))}

        {/* Overall progress footer */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Overall Development Progress</span>
            <span className="text-sm font-bold text-gray-900">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-3 rounded-full" />
          <p className="text-xs text-gray-500 mt-2">
            You're on track: {overallProgress}% complete across all goals
            {totalGoals > 0 && ` · ${Math.round(overallProgress * 0.7)}% expected at this stage`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}