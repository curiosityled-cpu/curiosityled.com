/**
 * ManagerPractice — The active coaching studio.
 * Route: /practice
 * Where managers actively work on leadership: prepare, reflect, work through, and grow.
 */
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useAtreusChat } from "@/components/ai/AtreusContext";
import { Link } from "react-router-dom";
import {
  Brain, Target, BookOpen, ArrowRight, ChevronRight,
  MessageSquare, Layers, Users, CheckCircle2,
  Lightbulb, FileText, Zap, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import GrowProgressCard from "@/components/patterns/GrowProgressCard";
import GrowExperiencesCard from "@/components/patterns/GrowExperiencesCard";
import ActiveFocusSection from "@/components/patterns/ActiveFocusSection";
import PracticeFlow from "@/components/practice/PracticeFlow";
import WorkoutsSection from "@/components/practice/WorkoutsSection";
import DecisionJournalOutcomeReview from "@/components/practice/DecisionJournalOutcomeReview";


// Flow keys that use the structured PracticeFlow; others open Atreus directly
const FLOW_KEYS = { Prepare: 'prepare', Debrief: 'debrief', 'Work through something': 'work_through', Reflect: 'reflect' };

function PracticeActionTile({ icon: Icon, iconBg, iconColor, title, description, prompt, to, onStartFlow }) {
  const { openWithContext } = useAtreusChat();
  const [expanded, setExpanded] = React.useState(false);
  const flowKey = FLOW_KEYS[title];

  const handleStart = () => {
    if (flowKey && onStartFlow) {
      onStartFlow(flowKey);
    } else {
      openWithContext({ context: { pageType: 'practice' }, starterMessage: prompt });
    }
    setExpanded(false);
  };

  if (to) {
    return (
      <Link to={to}>
        <div className="flex items-center gap-4 p-5 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all group cursor-pointer">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-card-foreground">{title}</p>
            <p className="text-xs mt-0.5 leading-relaxed text-muted-foreground">{description}</p>
          </div>
          <ChevronRight className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
        </div>
      </Link>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center gap-4 p-5 transition-colors text-left hover:bg-muted/50"
        onClick={() => setExpanded(e => !e)}
      >
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-card-foreground">{title}</p>
          <p className="text-xs mt-0.5 leading-relaxed text-muted-foreground">{description}</p>
        </div>
        <ChevronRight className={`w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      {expanded && (
        <div className="px-5 pb-4 pt-0 border-t border-border bg-muted/30 flex items-center justify-between gap-3">
          <p className="text-xs flex-1 text-muted-foreground">
            {flowKey ? 'A structured guide walks you through this step by step.' : 'Atreus will guide you through this session.'}
          </p>
          <Button size="sm" className="bg-[#0202ff] hover:bg-[#0101dd] text-white text-xs px-4" onClick={handleStart}>
            {flowKey ? 'Start guided flow →' : 'Start session →'}
          </Button>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }) {
  return <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-1 pt-2">{children}</p>;
}

function GrowSection({ goals, assignments, devPlans, pulses, trends, insight, onOpenAtreus }) {
  const active = assignments.filter(a => a.status !== 'completed').slice(0, 2);
  const activePlan = devPlans.find(p => p.status === 'active');

  return (
    <div className="space-y-2">
      <SectionLabel>Grow</SectionLabel>
      <ActiveFocusSection goals={goals} trends={trends} insight={insight} onOpenAtreus={onOpenAtreus} />

      {/* Workouts — recommended exercises */}
      <WorkoutsSection goals={goals} trends={trends} insight={insight} />

      {/* Learning */}
      {(active.length > 0 || activePlan) && (
        <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
          <div className="px-5 pt-5 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <p className="text-sm font-semibold text-gray-900">Learning</p>
            </div>
            <Link to="/my-development"><span className="text-xs text-[#0202ff] font-medium">View all →</span></Link>
          </div>
          <CardContent className="px-5 pt-2 pb-5 space-y-2">
            {activePlan && (
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wide mb-0.5">Active journey</p>
                <p className="text-sm font-medium text-gray-800">{activePlan.title}</p>
              </div>
            )}
            {active.map(a => {
              // Build "because of" reason
              let because = null;
              if (trends?.overload_pattern_strength > 40) because = "Because of your overload pattern";
              else if (trends?.identity_friction_active) because = "Linked to your current role clarity signals";
              else if (insight?.development_areas?.[0]) because = `Linked to your ${insight.development_areas[0].split(' (')[0]} development area`;
              else if (goals.filter(g => g.status === 'active').length > 0) because = `Supports your active growth focus`;
              return (
                <div key={a.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <Zap className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{a.title}</p>
                    {because && <p className="text-[10px] text-[#0202ff]/70 font-medium mt-0.5">{because}</p>}
                    {a.due_date && <p className="text-[10px] text-gray-400">Due {new Date(a.due_date).toLocaleDateString()}</p>}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Assessment entry */}
      <Link to="/LeadershipAssessment">
        <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">Leadership Index</p>
            <p className="text-xs text-gray-500">Take or retake your leadership assessment</p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400" />
        </div>
      </Link>

      {/* Goals full manager */}
      <Link to="/my-goals">
        <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
            <Target className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">My Goals</p>
            <p className="text-xs text-gray-500">Active goals, progress, and commitments</p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400" />
        </div>
      </Link>

      {/* Experiences */}
      <GrowExperiencesCard goals={goals} trends={trends} onOpenAtreus={onOpenAtreus} />

      {/* Progress */}
      <GrowProgressCard goals={goals} pulses={pulses} assignments={assignments} />
    </div>
  );
}

export default function ManagerPractice() {
  const { user } = useAuth();
  const { openWithContext } = useAtreusChat();
  const [activeFlow, setActiveFlow] = useState(null);
  const openAtreus = (msg) => openWithContext({ context: { pageType: 'practice', user_name: user?.full_name }, starterMessage: msg });

  const { data: goals = [] } = useQuery({
    queryKey: ['ml-goals', user?.email],
    queryFn: async () => {
      try {
        const r = await base44.entities.Goal.filter({ user_email: user.email }, '-created_date', 20);
        if (r.length) return r;
        return await base44.entities.Goal.filter({ created_by: user.email }, '-created_date', 20);
      } catch { return []; }
    },
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

  const { data: pulses = [] } = useQuery({
    queryKey: ['ml-pulses', user?.email],
    queryFn: async () => { try { return await base44.entities.ManagerPulse.filter({ user_email: user.email }, '-created_date', 30); } catch { return []; } },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  const { data: trends = null } = useQuery({
    queryKey: ['ml-trends', user?.email],
    queryFn: async () => { try { const r = await base44.entities.ManagerTrends.filter({ user_email: user.email }, '-last_trend_computed_at', 1); return r[0] || null; } catch { return null; } },
    enabled: !!user?.email, staleTime: 30 * 60 * 1000,
  });

  const { data: insight = null } = useQuery({
    queryKey: ['ml-insight', user?.email],
    queryFn: async () => {
      try { const rows = await base44.entities.AssessmentInsights.filter({ user_email: user.email }, '-created_date', 1); return rows[0] || null; } catch { return null; }
    },
    enabled: !!user?.email, staleTime: 0,
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="pt-2 pb-1">
        <h1 className="text-2xl font-bold text-foreground">Practice</h1>
        <p className="text-sm text-muted-foreground mt-1">Work on your leadership in the moment.</p>
      </div>

      {/* Active flow overlay */}
      {activeFlow && (
        <PracticeFlow flowKey={activeFlow} onClose={() => setActiveFlow(null)} />
      )}

      {/* Coach flows */}
      {!activeFlow && (
        <>
          <div className="space-y-2">
            <SectionLabel>Coaching flows</SectionLabel>
            <PracticeActionTile
              icon={MessageSquare}
              iconBg="bg-[#0202ff]/10"
              iconColor="text-[#0202ff]"
              title="Prepare"
              description="Get ready for a hard conversation, 1:1, feedback, or stakeholder meeting."
              prompt="I want to prepare for an upcoming conversation or meeting. Can you help me think through it?"
              onStartFlow={setActiveFlow}
            />
            <PracticeActionTile
              icon={CheckCircle2}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              title="Debrief"
              description="Reflect after a difficult interaction, missed commitment, or important meeting."
              prompt="I want to debrief something that just happened. Can we walk through it together?"
              onStartFlow={setActiveFlow}
            />
            <PracticeActionTile
              icon={Lightbulb}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
              title="Work through something"
              description="Feeling stuck, avoiding something, or overwhelmed? Let's name it and find a next step."
              prompt="I'm stuck on something and want to work through it. Can you help me think it out?"
              onStartFlow={setActiveFlow}
            />
            <PracticeActionTile
              icon={FileText}
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
              title="Reflect"
              description="Weekly reflection, end-of-day debrief, or momentum review."
              prompt="I want to do a leadership reflection. Can you guide me through it?"
              onStartFlow={setActiveFlow}
            />
            <PracticeActionTile
              icon={Brain}
              iconBg="bg-rose-50"
              iconColor="text-rose-600"
              title="Decision journal"
              description="Capture a high-stakes decision — context, risks, and outcome review later."
              prompt="I want to log a decision I'm working through. Can you help me capture the context and key considerations?"
            />
          </div>

          {/* Team flows */}
          <div className="space-y-2">
            <SectionLabel>Team</SectionLabel>
            <PracticeActionTile
              icon={Users}
              iconBg="bg-sky-50"
              iconColor="text-sky-600"
              title="1:1 prep & notes"
              description="Prepare questions, review commitments, and track conversation notes."
              to="/team"
            />
            <PracticeActionTile
              icon={Layers}
              iconBg="bg-orange-50"
              iconColor="text-orange-600"
              title="Delegation planner"
              description="Identify what to hand off and how to set your team up for success."
              prompt="I want to think through what I should delegate. Can you help me work through it?"
            />
          </div>

          {/* Decision Journal outcome review */}
          <DecisionJournalOutcomeReview />

          {/* Grow section */}
          <GrowSection goals={goals} assignments={assignments} devPlans={devPlans} pulses={pulses} trends={trends} insight={insight} onOpenAtreus={openAtreus} />

        </>
      )}
    </div>
  );
}