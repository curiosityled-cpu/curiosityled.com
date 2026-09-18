/**
 * PracticeHubTab — the "Practice" tab in the Development Manager.
 *
 * A full practice hub with three sections:
 *   1. Active recommendations — pattern-driven workouts ready to start
 *   2. In progress — started but not completed (resume)
 *   3. History — completed workouts + coaching flows (long-term record)
 *
 * Workouts launch through Atreus (Path B). Coaching-flow history is pulled
 * from ManagerPulse records tagged as practice sessions.
 */
import React, { useState, useEffect, useMemo } from "react";
import {
  Dumbbell, Brain, CheckCircle2, Clock, Target, Zap, Play, RotateCcw,
  ChevronDown, ChevronUp, History, Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { useAtreusChat } from "@/components/ai/AtreusContext";
import {
  loadActiveWorkouts, loadInProgressWorkouts, loadCompletedWorkouts,
  buildWorkoutCoachingFlow, buildWorkoutStarterMessage, completeWorkout,
} from "@/components/practice/workoutUtils";

const STORAGE_KEY = 'cl_practice_hub_collapsed';

function useCollapsibleState(sectionId) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return stored[sectionId] ?? false;
    } catch { return false; }
  });
  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        stored[sectionId] = next;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      } catch {}
      return next;
    });
  };
  return [collapsed, toggle];
}

function SectionHeader({ icon: Icon, title, subtitle, count, collapsed, onToggle }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 cursor-pointer select-none border-b border-border bg-muted/30 hover:bg-muted/50 transition-colors"
      onClick={onToggle}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-[#0202ff]/5 border border-[#0202ff]/15 flex items-center justify-center flex-shrink-0">
          <Icon className="w-3.5 h-3.5 text-[#0202ff]" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground">{title}</p>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {count > 0 && <span className="text-[10px] font-medium text-muted-foreground bg-muted border border-border rounded-full px-2 py-0.5">{count}</span>}
        {collapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
      </div>
    </div>
  );
}

function WorkoutRow({ workout, onStart, onComplete, showStatus }) {
  const m = workout.module;
  const typeLabel = m.workout_type === 'task' ? 'Real task' : 'Skill';
  const TypeIcon = m.workout_type === 'task' ? Target : Zap;
  return (
    <div className="p-4 rounded-xl border border-border bg-card hover:border-[#0202ff]/20 transition-all">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-sm font-semibold text-card-foreground">{m.title}</p>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${m.workout_type === 'task' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-[#0202ff]/5 text-[#0202ff] border-[#0202ff]/15'}`}>
              <TypeIcon className="w-2.5 h-2.5" /> {typeLabel}
            </span>
            {m.estimated_duration_minutes && (
              <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" /> {m.estimated_duration_minutes} min
              </span>
            )}
            {showStatus && workout.progress?.progress_percentage != null && (
              <span className="text-[10px] text-muted-foreground">{workout.progress.progress_percentage}%</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{m.description}</p>
          {workout.recommendation?.recommendation_reason && (
            <p className="text-[10px] text-muted-foreground mt-1 italic">{workout.recommendation.recommendation_reason}</p>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Button size="sm" className="flex-1 bg-[#0202ff] hover:bg-[#0101dd] text-white text-xs h-8" onClick={onStart}>
          <Brain className="w-3 h-3 mr-1" /> {showStatus ? 'Resume with Atreus' : 'Start with Atreus'}
        </Button>
        {!showStatus && (
          <Button size="sm" variant="outline" className="text-xs h-8 border-border" onClick={onComplete}>
            Mark done
          </Button>
        )}
      </div>
    </div>
  );
}

export default function PracticeHubTab({ user }) {
  const { openWithContext } = useAtreusChat();
  const [active, setActive] = useState([]);
  const [inProgress, setInProgress] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [flowHistory, setFlowHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState(null);
  const [commitment, setCommitment] = useState('');
  const [commitmentSaving, setCommitmentSaving] = useState(false);

  const [activeCollapsed, toggleActive] = useCollapsibleState('active');
  const [inProgressCollapsed, toggleInProgress] = useCollapsibleState('inprogress');
  const [historyCollapsed, toggleHistory] = useCollapsibleState('history');

  const loadAll = async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const [a, ip, c] = await Promise.all([
        loadActiveWorkouts(user.email).catch(() => []),
        loadInProgressWorkouts(user.email).catch(() => []),
        loadCompletedWorkouts(user.email).catch(() => []),
      ]);
      setActive(a);
      setInProgress(ip);
      setCompleted(c);

      // Coaching flow history from ManagerPulse
      try {
        const pulses = await base44.entities.ManagerPulse.filter({ user_email: user.email }, '-created_date', 50);
        const flows = pulses.filter((p) => {
          const f = (p.focus_intention || '').toLowerCase();
          return f.startsWith('workout completed') ||
                 f.startsWith('workout commitment') ||
                 f.startsWith('flow completed') ||
                 f.startsWith('practice session') ||
                 (p.focus_intention || '').includes('coaching flow');
        });
        setFlowHistory(flows);
      } catch { setFlowHistory([]); }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, [user?.email]);

  const startWorkout = (module) => {
    openWithContext({
      context: { pageType: 'practice', coaching_flow: buildWorkoutCoachingFlow(module) },
      starterMessage: buildWorkoutStarterMessage(module),
    });
  };

  const handleComplete = async (workout) => {
    if (!commitment.trim() || commitmentSaving) return;
    setCommitmentSaving(true);
    await completeWorkout({
      user,
      module: workout.module,
      recommendationId: workout.recommendation?.id,
      commitment,
    });
    setCommitmentSaving(false);
    setCompletingId(null);
    setCommitment('');
    loadAll();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-[#0202ff] rounded-full animate-spin" />
      </div>
    );
  }

  const totalHistory = completed.length + flowHistory.length;

  return (
    <div className="space-y-4">
      {/* ── Active recommendations ── */}
      <Card className="shadow-sm border border-border bg-card rounded-2xl overflow-hidden">
        <SectionHeader
          icon={Sparkles}
          title="Active recommendations"
          subtitle="Pattern-driven workouts ready when you are"
          count={active.length}
          collapsed={activeCollapsed}
          onToggle={toggleActive}
        />
        {!activeCollapsed && (
          <CardContent className="px-4 py-4 space-y-2">
            {active.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                No active workouts right now. New ones appear here as patterns are detected.
              </p>
            ) : (
              active.map((w) => (
                <div key={w.module.id}>
                  {completingId === w.module.id ? (
                    <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-2">
                      <p className="text-xs font-semibold text-foreground">What's one concrete move you'll make today?</p>
                      <textarea
                        placeholder="e.g. Open with the impact, not the behavior. Delegate the Q3 report by Friday…"
                        value={commitment}
                        onChange={(e) => setCommitment(e.target.value)}
                        className="w-full text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30 leading-relaxed rounded-lg px-3 py-2 bg-background text-foreground border border-border placeholder:text-muted-foreground"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" className="text-xs h-8" onClick={() => { setCompletingId(null); setCommitment(''); }}>
                          Cancel
                        </Button>
                        <Button size="sm" className="text-xs h-8 gap-1.5 bg-[#0202ff] hover:bg-[#0101dd] text-white" onClick={() => handleComplete(w)} disabled={!commitment.trim() || commitmentSaving}>
                          {commitmentSaving ? 'Saving…' : (<><CheckCircle2 className="w-3 h-3" /> Save commitment</>)}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <WorkoutRow
                      workout={w}
                      onStart={() => startWorkout(w.module)}
                      onComplete={() => setCompletingId(w.module.id)}
                    />
                  )}
                </div>
              ))
            )}
          </CardContent>
        )}
      </Card>

      {/* ── In progress ── */}
      <Card className="shadow-sm border border-border bg-card rounded-2xl overflow-hidden">
        <SectionHeader
          icon={RotateCcw}
          title="In progress"
          subtitle="Started — pick up where you left off"
          count={inProgress.length}
          collapsed={inProgressCollapsed}
          onToggle={toggleInProgress}
        />
        {!inProgressCollapsed && (
          <CardContent className="px-4 py-4 space-y-2">
            {inProgress.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                Nothing in progress right now.
              </p>
            ) : (
              inProgress.map((w) => (
                <WorkoutRow key={w.module.id} workout={w} onStart={() => startWorkout(w.module)} onComplete={() => {}} showStatus />
              ))
            )}
          </CardContent>
        )}
      </Card>

      {/* ── History ── */}
      <Card className="shadow-sm border border-border bg-card rounded-2xl overflow-hidden">
        <SectionHeader
          icon={History}
          title="History"
          subtitle="Completed workouts and coaching flows"
          count={totalHistory}
          collapsed={historyCollapsed}
          onToggle={toggleHistory}
        />
        {!historyCollapsed && (
          <CardContent className="px-4 py-4">
            {totalHistory === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                Your completed practice will show up here over time.
              </p>
            ) : (
              <div className="space-y-1.5">
                {completed.map((w) => (
                  <div key={`c-${w.module.id}`} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/20">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-semibold text-foreground">{w.module.title}</p>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${w.module.workout_type === 'task' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-[#0202ff]/5 text-[#0202ff] border-[#0202ff]/15'}`}>
                          {w.module.workout_type === 'task' ? 'Task' : 'Skill'}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Completed {w.progress.completed_date ? new Date(w.progress.completed_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                        {(w.module.competencies || []).length > 0 && ` · ${w.module.competencies.join(', ')}`}
                      </p>
                    </div>
                  </div>
                ))}
                {flowHistory.map((p, i) => (
                  <div key={`f-${p.id || i}`} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/20">
                    <Dumbbell className="w-4 h-4 text-[#0202ff] flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{p.focus_intention || 'Practice session'}</p>
                      {p.description && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{p.description}</p>}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {p.created_date ? new Date(p.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}