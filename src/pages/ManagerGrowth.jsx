/**
 * ManagerGrowth — Goals, learning, commitments, profile, journeys.
 * Route: /growth
 */
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { Target, BookOpen, ArrowRight, ChevronRight, CheckCircle2, Clock, Zap, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

function SectionHeader({ title, subtitle }) {
  return (
    <div className="pt-2 pb-1">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function GoalsSection({ goals }) {
  const active = goals.filter(g => g.status === 'active');
  const completed = goals.filter(g => g.status === 'completed').slice(0, 3);

  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <Target className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-sm font-semibold text-gray-900">Goals</p>
        </div>
        <Link to="/my-goals"><span className="text-xs text-[#0202ff] hover:underline font-medium">Manage all →</span></Link>
      </div>
      <CardContent className="px-5 pt-2 pb-5 space-y-3">
        {active.length === 0 ? (
          <div className="text-center py-6">
            <Target className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-3">No active goals yet</p>
            <Link to="/my-goals"><Button size="sm" variant="outline" className="text-xs border-[#0202ff]/30 text-[#0202ff]">Set a goal →</Button></Link>
          </div>
        ) : (
          active.map(g => (
            <div key={g.id} className="p-3 bg-gray-50 rounded-xl space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-gray-800">{g.title}</p>
                <Badge variant="outline" className="text-[10px] flex-shrink-0">{g.status}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={g.progress || 0} className="h-1.5 flex-1" />
                <span className="text-xs text-gray-500 flex-shrink-0">{g.progress || 0}%</span>
              </div>
              {g.due_date && <p className="text-[10px] text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Due {new Date(g.due_date).toLocaleDateString()}</p>}
            </div>
          ))
        )}
        {completed.length > 0 && (
          <div className="pt-1 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2">Recently completed</p>
            {completed.map(g => (
              <div key={g.id} className="flex items-center gap-2 py-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <p className="text-xs text-gray-500 line-through">{g.title}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LearningSection({ assignments, devPlans }) {
  const active = assignments.filter(a => a.status !== 'completed').slice(0, 3);
  const activePlan = devPlans.find(p => p.status === 'active');

  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <p className="text-sm font-semibold text-gray-900">Development</p>
        </div>
        <Link to="/my-development"><span className="text-xs text-[#0202ff] hover:underline font-medium">View all →</span></Link>
      </div>
      <CardContent className="px-5 pt-2 pb-5 space-y-3">
        {activePlan && (
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs text-blue-600 font-medium mb-1">Active journey</p>
            <p className="text-sm font-medium text-gray-800">{activePlan.title}</p>
            {activePlan.target_date && <p className="text-[10px] text-gray-400 mt-1">Target: {new Date(activePlan.target_date).toLocaleDateString()}</p>}
          </div>
        )}
        {active.length === 0 && !activePlan ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 mb-3">No active assignments</p>
            <Link to="/my-development"><Button size="sm" variant="outline" className="text-xs border-[#0202ff]/30 text-[#0202ff]">Explore development →</Button></Link>
          </div>
        ) : (
          active.map(a => (
            <div key={a.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                <Zap className="w-3 h-3 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{a.title}</p>
                {a.due_date && <p className="text-[10px] text-gray-400">Due {new Date(a.due_date).toLocaleDateString()}</p>}
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default function ManagerGrowth() {
  const { user } = useAuth();

  const { data: goals = [] } = useQuery({
    queryKey: ['ml-goals', user?.email],
    queryFn: async () => { try { const r = await base44.entities.Goal.filter({ user_email: user.email }, '-created_date', 20); if (r.length) return r; return await base44.entities.Goal.filter({ created_by: user.email }, '-created_date', 20); } catch { return []; } },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['ml-assignments', user?.email],
    queryFn: async () => { try { return await base44.entities.AssignedLearning.filter({ user_email: user.email }, '-created_date', 10); } catch { return []; } },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  const { data: devPlans = [] } = useQuery({
    queryKey: ['ml-devplans', user?.email],
    queryFn: async () => { try { return await base44.entities.DevelopmentPlan.filter({ user_email: user.email }, '-created_date', 5); } catch { return []; } },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <SectionHeader title="Growth" subtitle="Goals, development, and commitments — your leadership trajectory." />
      <GoalsSection goals={goals} />
      <LearningSection assignments={assignments} devPlans={devPlans} />
      <div className="pt-1">
        <Link to="/LeadershipAssessment">
          <div className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0">
              <Brain className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Leadership Index</p>
              <p className="text-xs text-gray-500">Take or retake your leadership assessment</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400" />
          </div>
        </Link>
      </div>
    </div>
  );
}