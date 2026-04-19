import React, { useState, useEffect } from "react";
import { Building2, Loader2, Settings, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { base44 } from "@/api/base44Client";

const INDUSTRY_BENCHMARKS = [
  { title: "Improve Manager Effectiveness Score",   target: "Top Quartile",  progress: 45, competencies: ["Performance Management", "Communication"],        impact: "Linked to 21% higher team productivity" },
  { title: "Reduce Employee Turnover by 15%",        target: "Industry Avg",  progress: 30, competencies: ["Stakeholder Management", "Performance Management"], impact: "Avg $8K savings per retained employee" },
  { title: "Increase Internal Promotion Rate to 40%",target: "Benchmark",     progress: 20, competencies: ["Decision Making", "Situational Intelligence"],      impact: "Reduces external hiring costs by 35%" },
];

function GoalCard({ goal, isBenchmark }) {
  return (
    <div className={`rounded-xl border p-4 ${isBenchmark ? "bg-gray-50 border-dashed" : "bg-white"}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{goal.title}</p>
          {goal.target_metric && <p className="text-xs text-gray-500 mt-0.5">{goal.target_metric}</p>}
        </div>
        <span className="text-sm font-bold text-gray-700 shrink-0">{goal.progress ?? 0}%</span>
      </div>
      <Progress value={goal.progress ?? 0} className="h-2 mb-3" />
      <div className="flex flex-wrap gap-1 mb-2">
        {(goal.linked_competencies || goal.competencies || []).map((c, i) => (
          <Badge key={i} variant="outline" className="text-xs text-blue-700 border-blue-200 bg-blue-50">{c}</Badge>
        ))}
      </div>
      {(goal.business_impact || goal.impact) && (
        <p className="text-xs text-gray-500 italic">{goal.business_impact || goal.impact}</p>
      )}
    </div>
  );
}

export default function BusinessGoalsSection({ user }) {
  const [loading, setLoading]   = useState(true);
  const [goals, setGoals]       = useState([]);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    if (user?.client_id) loadGoals();
    else setLoading(false);
  }, [user?.client_id]);

  const loadGoals = async () => {
    setLoading(true);
    try {
      const results = await base44.entities.OrgBusinessGoal.filter({
        client_id: user.client_id,
        is_active: true,
      }).catch(() => []);
      if (results.length > 0) {
        setGoals(results);
        setConfigured(true);
      }
    } catch (err) {
      console.error("[BusinessGoals] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <CardTitle>Business Goals Your Development Supports</CardTitle>
            <p className="text-sm text-gray-500 mt-0.5">How your leadership development directly impacts organizational success</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading business goals...
          </div>
        ) : configured ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map((g, i) => <GoalCard key={i} goal={g} isBenchmark={false} />)}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Not configured notice */}
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <Settings className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Business goals have not yet been configured</p>
                <p className="text-sm text-amber-700 mt-1">
                  An admin can add organizational goals that will cascade to all users in your organization.
                  In the meantime, here are industry benchmarks for your sector:
                </p>
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-600">Industry Benchmarks (Similar Organizations)</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {INDUSTRY_BENCHMARKS.map((g, i) => <GoalCard key={i} goal={g} isBenchmark={true} />)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}