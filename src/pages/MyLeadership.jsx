/**
 * MyLeadership — "Flo for managers" redesign.
 * Structure: Today → Patterns → Plan → Profile
 * The home surfaces what matters NOW, not what was measured.
 */
import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useAtreusChat } from "@/components/ai/AtreusContext";
import { Link, useNavigate } from "react-router-dom";
import {
  Brain, Target, BookOpen, ArrowRight, ChevronRight,
  Sparkles, TrendingUp, Clock, CheckCircle2, Zap, Shield,
  Settings, BarChart3, Layers, Star, MessageSquare, RefreshCw,
  Eye, EyeOff, Info, AlertCircle, Circle, Flame, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getFirstName(user) {
  const raw = user?.display_name || user?.data?.display_name || user?.full_name;
  return raw && raw.trim() && !raw.includes('@') ? raw.split(' ')[0] : 'there';
}

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const days = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

// Derive a personalized "Today's Focus" from available signals
function buildTodayFocus(insight, goals, assignments) {
  // Priority 1: most urgent active goal
  const urgentGoal = goals.find(g => g.status === 'active' && g.progress < 50);
  if (urgentGoal) {
    return {
      focus: urgentGoal.title,
      why: "This active goal is less than halfway complete.",
      action: "Review your progress",
      actionPath: '/my-goals',
      source: 'Goal tracker',
    };
  }
  // Priority 2: overdue learning
  const overdueLearning = assignments.find(a => a.status === 'assigned' && a.due_date && new Date(a.due_date) < new Date());
  if (overdueLearning) {
    return {
      focus: `Complete: ${overdueLearning.title}`,
      why: "You have a learning assignment that's past its due date.",
      action: "Go to My Development",
      actionPath: '/my-development',
      source: 'Learning tracker',
    };
  }
  // Priority 3: top growth area from insight
  if (insight?.development_areas?.[0]) {
    const area = insight.development_areas[0].split(' (')[0]; // strip percentage
    return {
      focus: `Strengthen ${area}`,
      why: "A pattern from your recent Leadership Index signals this is your highest-leverage growth area right now.",
      action: "See what supports this",
      actionPath: '/my-development',
      source: 'Leadership Index · AI-interpreted pattern',
    };
  }
  // Fallback
  return {
    focus: "Prepare one coaching question for your next 1:1",
    why: "Intentional questions before team conversations are one of the most consistent differentiators of effective managers.",
    action: "Open Atreus to prep",
    actionPath: null,
    atreus: true,
    source: 'Practice library',
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Privacy banner — visible trust layer */
function PrivacyBanner({ onDismiss }) {
  return (
    <div className="flex items-start gap-3 bg-[#0202ff]/5 border border-[#0202ff]/15 rounded-2xl px-4 py-3">
      <Shield className="w-4 h-4 text-[#0202ff] flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[#0202ff]">Your private leadership space</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
          Archetype, patterns, and development insights are visible only to you unless you choose to share them.
          Curiosity Led is using your recent Leadership Index results and activity to personalise support.{" "}
          <Link to="/Settings" className="underline hover:text-gray-700">Adjust how proactive it is →</Link>
        </p>
      </div>
      <button onClick={onDismiss} className="text-gray-300 hover:text-gray-500 text-xs flex-shrink-0">✕</button>
    </div>
  );
}

/** Today card — the primary habit surface */
function TodayCard({ focus, insight, onOpenAtreus }) {
  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0202ff] flex items-center justify-center">
            <Flame className="w-3.5 h-3.5 text-white" />
          </div>
          <p className="text-sm font-semibold text-gray-900">Today's Focus</p>
        </div>
        {insight?.created_date && (
          <span className="text-[10px] text-gray-400">
            Signals updated {timeAgo(insight.created_date)}
          </span>
        )}
      </div>

      <CardContent className="px-5 pt-4 pb-5 space-y-4">
        {/* Main focus */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <p className="text-base font-semibold text-gray-900 leading-snug">{focus.focus}</p>
          <p className="text-sm text-gray-500 leading-relaxed">{focus.why}</p>
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[10px] text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
              {focus.source}
            </span>
          </div>
        </div>

        {/* Action row */}
        <div className="flex gap-2">
          {focus.atreus ? (
            <Button
              size="sm"
              className="flex-1 bg-[#0202ff] hover:bg-[#0101dd] text-white text-xs h-8"
              onClick={onOpenAtreus}
            >
              <MessageSquare className="w-3 h-3 mr-1.5" /> {focus.action}
            </Button>
          ) : (
            <Link to={focus.actionPath} className="flex-1">
              <Button size="sm" className="w-full bg-[#0202ff] hover:bg-[#0101dd] text-white text-xs h-8">
                {focus.action} <ArrowRight className="w-3 h-3 ml-1.5" />
              </Button>
            </Link>
          )}
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 border-gray-200 text-gray-600 hover:bg-gray-50"
            onClick={onOpenAtreus}
          >
            <Brain className="w-3 h-3 mr-1.5 text-[#0202ff]" /> Ask Atreus
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Quick check-in — feeds pattern awareness */
function CheckInCard({ onOpenAtreus }) {
  const prompts = [
    "How are you showing up in your team this week?",
    "What's one thing you're carrying that you could hand off?",
    "When did you last give clear, specific feedback?",
    "How much of today felt intentional vs reactive?",
  ];
  const prompt = prompts[new Date().getDay() % prompts.length];

  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      onClick={onOpenAtreus}>
      <CardContent className="px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Quick check-in</p>
            <p className="text-sm text-gray-800 leading-snug font-medium">{prompt}</p>
            <p className="text-xs text-gray-400 mt-1.5">Tap to reflect with Atreus · 2 min</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
        </div>
      </CardContent>
    </Card>
  );
}

/** Patterns — what CL is noticing, evidence-tagged */
function PatternsCard({ insight, goals }) {
  const patterns = [];

  if (insight?.top_strengths?.[0]) {
    patterns.push({
      type: 'supporting',
      text: `${insight.top_strengths[0].split(' (')[0]} appears to be a current strength you can lean on.`,
      tag: 'Assessment-based',
      tagColor: 'bg-emerald-50 text-emerald-700',
      icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />,
    });
  }
  if (insight?.development_areas?.[0]) {
    const area = insight.development_areas[0].split(' (')[0];
    patterns.push({
      type: 'watch',
      text: `${area} may benefit from more intentional focus — this pattern has appeared in recent signals.`,
      tag: 'AI-interpreted pattern',
      tagColor: 'bg-amber-50 text-amber-700',
      icon: <AlertCircle className="w-3.5 h-3.5 text-amber-500" />,
    });
  }

  const activeGoals = goals.filter(g => g.status === 'active');
  if (activeGoals.length > 0) {
    const stalled = activeGoals.filter(g => (g.progress || 0) < 20);
    if (stalled.length > 0) {
      patterns.push({
        type: 'watch',
        text: `${stalled.length === 1 ? 'One active goal' : `${stalled.length} active goals`} ${stalled.length === 1 ? 'has' : 'have'} made little progress. Momentum check may be worth it.`,
        tag: 'Goal tracker',
        tagColor: 'bg-blue-50 text-blue-700',
        icon: <Circle className="w-3.5 h-3.5 text-blue-400" />,
      });
    }
  }

  if (patterns.length === 0) {
    patterns.push({
      type: 'neutral',
      text: 'Patterns build as you engage — check-ins, goals, and assessment results all contribute to what Curiosity Led surfaces here.',
      tag: 'How this works',
      tagColor: 'bg-gray-100 text-gray-500',
      icon: <Info className="w-3.5 h-3.5 text-gray-400" />,
    });
  }

  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center">
            <Eye className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <p className="text-sm font-semibold text-gray-900">What we're noticing</p>
        </div>
        <span className="text-[10px] text-gray-400">Calibrated for your level & context</span>
      </div>

      <CardContent className="px-5 pt-2 pb-5 space-y-3">
        {patterns.map((p, i) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="mt-0.5 flex-shrink-0">{p.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 leading-relaxed">{p.text}</p>
              <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mt-1.5 ${p.tagColor}`}>
                {p.tag}
              </span>
            </div>
          </div>
        ))}

        <Link to="/Insights" className="block">
          <div className="flex items-center justify-between text-xs text-[#0202ff] font-medium pt-1 hover:underline">
            Understand my patterns <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}

/** Suggested support — one best next action */
function SuggestedSupportCard({ assignments, devPlans }) {
  // Find the most relevant support
  const urgent = assignments.find(a => a.status === 'assigned' && a.priority === 'urgent');
  const active = assignments.find(a => a.status !== 'completed');
  const plan = devPlans.find(p => p.status === 'active');

  let support = null;
  if (urgent) {
    support = {
      title: urgent.title,
      why: 'This is your highest-priority learning assignment.',
      time: 'Check in now',
      source: 'Assigned learning',
      path: '/my-development',
    };
  } else if (active) {
    support = {
      title: active.title,
      why: 'Continuing this supports your current development focus.',
      time: active.due_date ? `Due ${new Date(active.due_date).toLocaleDateString()}` : 'No deadline',
      source: 'Assigned learning',
      path: '/my-development',
    };
  } else if (plan) {
    support = {
      title: plan.title,
      why: 'This journey aligns with your active development goals.',
      time: plan.target_date ? `Target ${new Date(plan.target_date).toLocaleDateString()}` : 'Ongoing',
      source: 'Development journey',
      path: '/my-development',
    };
  }

  if (!support) {
    return (
      <Card className="shadow-sm border border-dashed border-gray-200 bg-white rounded-2xl overflow-hidden">
        <CardContent className="px-5 py-6 text-center">
          <BookOpen className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600 mb-1">No active development yet</p>
          <p className="text-xs text-gray-400 mb-3">Start a journey or browse learning to get personalised support suggestions.</p>
          <Link to="/my-development">
            <Button size="sm" variant="outline" className="text-xs border-[#0202ff]/30 text-[#0202ff] hover:bg-blue-50">
              Explore Development <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-2 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
          <Zap className="w-3.5 h-3.5 text-blue-500" />
        </div>
        <p className="text-sm font-semibold text-gray-900">Suggested support</p>
      </div>
      <CardContent className="px-5 pt-2 pb-5">
        <div className="bg-gray-50 rounded-xl p-4 mb-3 space-y-1">
          <p className="text-sm font-semibold text-gray-900">{support.title}</p>
          <p className="text-xs text-gray-500">{support.why}</p>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">{support.source}</span>
            <span className="text-[10px] text-gray-400">{support.time}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={support.path} className="flex-1">
            <Button size="sm" className="w-full bg-[#0202ff] hover:bg-[#0101dd] text-white text-xs h-8">
              Continue <ArrowRight className="w-3 h-3 ml-1.5" />
            </Button>
          </Link>
          <Link to="/my-development">
            <Button size="sm" variant="outline" className="text-xs h-8 border-gray-200 text-gray-600 hover:bg-gray-50">
              View all
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

/** Goals pulse — lightweight, not administrative */
function GoalsPulseCard({ goals }) {
  const active = goals.filter(g => g.status === 'active');
  const topGoal = active.sort((a, b) => (b.progress || 0) - (a.progress || 0))[0];

  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <Target className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-sm font-semibold text-gray-900">Active focus</p>
        </div>
        <Link to="/my-goals">
          <span className="text-xs text-[#0202ff] hover:underline font-medium">View all →</span>
        </Link>
      </div>
      <CardContent className="px-5 pt-2 pb-5">
        {active.length === 0 ? (
          <div className="flex items-center gap-3 py-3">
            <div className="flex-1">
              <p className="text-sm text-gray-500">No active goals yet.</p>
              <Link to="/my-goals">
                <p className="text-xs text-[#0202ff] hover:underline mt-1">Set your first leadership goal →</p>
              </Link>
            </div>
          </div>
        ) : topGoal ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-gray-800">{topGoal.title}</p>
              <div className="flex items-center gap-2">
                <Progress value={topGoal.progress || 0} className="h-1.5 flex-1" />
                <span className="text-xs text-gray-500 flex-shrink-0">{topGoal.progress || 0}%</span>
              </div>
              <p className="text-xs text-gray-400">
                {active.length > 1 ? `+${active.length - 1} more active goal${active.length > 2 ? 's' : ''}` : 'Your only active goal'}
              </p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Explore deeper — links to full layers */
function ExploreDeeperCard() {
  const links = [
    { label: 'Open full leadership profile', sub: 'Archetype, competencies, style', path: '/Insights', icon: Brain, color: 'text-[#0202ff]' },
    { label: 'My development plan', sub: 'Journeys, learning, experiences', path: '/my-development', icon: Layers, color: 'text-purple-600' },
    { label: 'Goals & progress', sub: 'Active goals and milestones', path: '/my-goals', icon: Target, color: 'text-emerald-600' },
  ];

  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-2">
        <p className="text-sm font-semibold text-gray-900">Explore deeper</p>
        <p className="text-xs text-gray-400 mt-0.5">When you have more time</p>
      </div>
      <CardContent className="px-5 pt-2 pb-5 space-y-1">
        {links.map((l) => {
          const Icon = l.icon;
          return (
            <Link key={l.path} to={l.path}>
              <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors group">
                <Icon className={`w-4 h-4 flex-shrink-0 ${l.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 group-hover:text-gray-900">{l.label}</p>
                  <p className="text-xs text-gray-400">{l.sub}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400" />
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

/** Loading skeleton */
function Skeleton() {
  return (
    <div className="space-y-4">
      {[72, 56, 48, 80, 56].map((h, i) => (
        <div key={i} className={`h-${h === 72 ? '72' : h === 56 ? '56' : h === 48 ? '48' : h === 80 ? '80' : '56'} w-full rounded-2xl bg-gray-100 animate-pulse`} style={{ height: h * 0.9 }} />
      ))}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function MyLeadership() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { openWithContext } = useAtreusChat();
  const [privacyDismissed, setPrivacyDismissed] = useState(() =>
    localStorage.getItem('cl_privacy_banner_dismissed') === '1'
  );

  const dismissPrivacy = () => {
    localStorage.setItem('cl_privacy_banner_dismissed', '1');
    setPrivacyDismissed(true);
  };

  const openAtreus = (starterMessage) => openWithContext({
    pageType: 'my-leadership',
    starter_message: starterMessage || "I'd like to reflect on my leadership this week.",
    user_name: getFirstName(user),
  });

  useEffect(() => {
    if (user?.email) queryClient.invalidateQueries({ queryKey: ['ml-insight', user.email] });
  }, [user?.email]);

  const { data: insight, isLoading: loadingInsight } = useQuery({
    queryKey: ['ml-insight', user?.email],
    queryFn: async () => {
      try {
        const rows = await base44.entities.AssessmentInsights.filter({ user_email: user.email }, '-created_date', 1);
        if (rows[0]) return rows[0];
      } catch {}
      try {
        const assessments = await base44.entities.Assessment.filter({ email: user.email }, '-created_date', 1);
        if (!assessments[0]) return null;
        const a = assessments[0];
        const competencies = [
          { key: 'Situational Intelligence', pct: a.si_pct },
          { key: 'Decision Making', pct: a.dm_pct },
          { key: 'Communication', pct: a.comm_pct },
          { key: 'Resource Management', pct: a.rm_pct },
          { key: 'Stakeholder Management', pct: a.sm_pct },
          { key: 'Performance Management', pct: a.pm_pct },
        ].filter(c => c.pct != null).sort((a, b) => b.pct - a.pct);
        return {
          id: a.id,
          created_date: a.created_date,
          archetype: a.archetype_label,
          top_strengths: competencies.slice(0, 2).map(c => `${c.key} (${c.pct}%)`),
          development_areas: competencies.slice(-2).reverse().map(c => `${c.key} (${c.pct}%)`),
          recommendations: [],
        };
      } catch {}
      return null;
    },
    enabled: !!user?.email,
    staleTime: 0,
  });

  const { data: goals = [], isLoading: loadingGoals } = useQuery({
    queryKey: ['ml-goals', user?.email],
    queryFn: () => base44.entities.Goal.filter({ created_by: user.email }, '-created_date', 15),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['ml-assignments', user?.email],
    queryFn: () => base44.entities.AssignedLearning.filter({ user_email: user.email }, '-created_date', 10),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  const { data: devPlans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['ml-devplans', user?.email],
    queryFn: () => base44.entities.DevelopmentPlan.filter({ user_email: user.email }, '-created_date', 5),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = loadingInsight || loadingGoals || loadingAssignments || loadingPlans;
  const firstName = getFirstName(user);
  const todayFocus = buildTodayFocus(insight, goals, assignments);

  return (
    <MVPPageLayout
      title={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, ${firstName}.`}
      subtitle="Here's what matters right now."
    >
      {isLoading ? (
        <Skeleton />
      ) : (
        <div className="space-y-4">

          {/* 0. Privacy / trust banner */}
          {!privacyDismissed && <PrivacyBanner onDismiss={dismissPrivacy} />}

          {/* 1. TODAY — primary habit surface */}
          <TodayCard
            focus={todayFocus}
            insight={insight}
            onOpenAtreus={() => openAtreus(todayFocus.atreus ? todayFocus.action : undefined)}
          />

          {/* 2. Quick check-in */}
          <CheckInCard onOpenAtreus={() => openAtreus()} />

          {/* 3. PATTERNS — what CL is noticing */}
          {insight && (
            <PatternsCard insight={insight} goals={goals} />
          )}

          {/* No assessment yet */}
          {!insight && (
            <Card className="shadow-sm border border-dashed border-gray-200 bg-white rounded-2xl">
              <CardContent className="py-10 px-6 text-center">
                <Brain className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-700 mb-1">Take your Leadership Index to unlock patterns</p>
                <p className="text-xs text-gray-400 max-w-xs mx-auto mb-4 leading-relaxed">
                  The Leadership Index gives Curiosity Led the signals it needs to personalise your support. It takes about 20 minutes.
                </p>
                <Link to="/LeadershipAssessment">
                  <Button size="sm" className="bg-[#0202ff] hover:bg-[#0101dd] text-white text-xs">
                    Take the Assessment <ArrowRight className="w-3 h-3 ml-1.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* 4. PLAN — goals pulse + suggested support */}
          <GoalsPulseCard goals={goals} />
          <SuggestedSupportCard assignments={assignments} devPlans={devPlans} />

          {/* 5. EXPLORE DEEPER — full profile, plan, goals */}
          <ExploreDeeperCard />

        </div>
      )}
    </MVPPageLayout>
  );
}