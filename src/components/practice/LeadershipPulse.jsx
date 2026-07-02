/**
 * LeadershipPulse — Compact progress summary that bridges to
 * /my-performance and /my-development. Replaces the Growth Plan tab.
 */
import React from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Target, ArrowRight, BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

function getPulseScore(goals, pulses, assignments) {
  const activeGoals = goals.filter(g => g.status === 'active');
  const movingGoals = activeGoals.filter(g => (g.progress || 0) >= 30);
  const recent7 = pulses.filter(p => (Date.now() - new Date(p.created_date).getTime()) < 7 * 86400000);
  const completedLearning = assignments.filter(a => a.status === 'completed');

  let activity = 0;
  if (recent7.length >= 4) activity += 30;
  else if (recent7.length >= 2) activity += 15;
  if (activeGoals.length > 0) activity += 10;

  let change = 0;
  if (movingGoals.length > 0) change += 35;
  if (completedLearning.length >= 2) change += 25;
  else if (completedLearning.length === 1) change += 12;
  const followThrough = pulses.filter(p => p.prompt_type === 'follow_up' && p.intent_actuals_gap === 'no_gap_detected');
  if (followThrough.length >= 2) change += 25;
  else if (followThrough.length === 1) change += 12;

  return Math.min(Math.round((activity * 0.35) + (change * 0.65)), 100);
}

function getPulseLabel(score) {
  if (score >= 70) return { label: 'Strong momentum', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' };
  if (score >= 40) return { label: 'Building', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' };
  if (score >= 15) return { label: 'Getting started', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' };
  return { label: 'Early stage', color: 'text-muted-foreground', bg: 'bg-muted/50' };
}

export default function LeadershipPulse({ goals = [], pulses = [], assignments = [] }) {
  const score = getPulseScore(goals, pulses, assignments);
  const { label, color, bg } = getPulseLabel(score);
  const activeGoals = goals.filter(g => g.status === 'active').length;
  const stalledGoals = goals.filter(g => g.status === 'active' && (g.progress || 0) < 20).length;

  return (
    <div className="space-y-2.5">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Leadership Pulse</p>

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Momentum bar */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#0202ff]/10 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-[#0202ff]" />
              </div>
              <p className="text-sm font-semibold text-card-foreground">Development momentum</p>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${bg} ${color}`}>{label}</span>
          </div>
          <Progress value={score} className="h-2" />
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1">
              <Target className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{activeGoals} active goal{activeGoals !== 1 ? 's' : ''}</span>
            </div>
            {stalledGoals > 0 && (
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-[10px] text-amber-600">{stalledGoals} stalled</span>
              </div>
            )}
          </div>
        </div>

        {/* Bridge links */}
        <div className="border-t border-border divide-y divide-border">
          <Link to="/my-performance" className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-card-foreground">My Performance</p>
              <p className="text-[10px] text-muted-foreground">Goals, progress, and commitments</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link to="/my-development" className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-card-foreground">My Development</p>
              <p className="text-[10px] text-muted-foreground">Learning journeys and growth plans</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}