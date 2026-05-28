/**
 * MyRhythm — Manager's private leadership rhythm dashboard.
 *
 * The "deeper home base" from the Predictive Leadership Intelligence spec.
 * Shows: trend memory, pulse history, follow-through loop, weekly reflection.
 *
 * 100% private to the manager. No HR visibility. Evidence-labelled throughout.
 */
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useAtreusChat } from "@/components/ai/AtreusContext";
import { Link } from "react-router-dom";
import {
  Brain, TrendingUp, TrendingDown, Minus, Shield, Calendar,
  MessageSquare, Target, ChevronRight, Zap, RotateCcw, CheckCircle2,
  Circle, AlertCircle, Info, Flame, BookOpen, ArrowRight, Clock
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";
import WeeklyReflection from "@/components/checkin/WeeklyReflection";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ENERGY_ORDER = { drained: 0, stretched: 1, steady: 2, strong: 3 };
const ENERGY_LABELS = { drained: 'Drained', stretched: 'Stretched', steady: 'Steady', strong: 'Strong' };
const ENERGY_COLORS = {
  drained:   'bg-red-100 text-red-700',
  stretched: 'bg-amber-100 text-amber-700',
  steady:    'bg-blue-100 text-blue-700',
  strong:    'bg-emerald-100 text-emerald-700',
};

const TREND_CONFIG = {
  improving:          { label: 'Trending up',       icon: TrendingUp,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
  stable:             { label: 'Holding steady',     icon: Minus,        color: 'text-gray-500',    bg: 'bg-gray-50' },
  declining:          { label: 'Worth watching',     icon: TrendingDown, color: 'text-amber-600',   bg: 'bg-amber-50' },
  insufficient_data:  { label: 'Building picture',  icon: Info,         color: 'text-gray-400',    bg: 'bg-gray-50' },
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function daysAgo(dateStr) {
  if (!dateStr) return null;
  const days = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TrendPill({ trend }) {
  const cfg = TREND_CONFIG[trend] || TREND_CONFIG.insufficient_data;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

/** Private header badge */
function PrivateTag() {
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full border border-gray-200 text-gray-400">
      <Shield className="w-2.5 h-2.5" /> Private
    </span>
  );
}

/** Trend Memory — the longitudinal intelligence panel */
function TrendMemorySection({ trends }) {
  if (!trends || (trends.data_points_14d || 0) < 3) {
    return (
      <Card className="shadow-sm border border-dashed border-gray-200 bg-white rounded-2xl">
        <CardContent className="px-5 py-5">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
              <Brain className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-0.5">Pattern memory is building</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                After 3 or more check-ins, Atreus will surface observations about your leadership rhythm here.
                Check in a few more times to unlock this.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const energyOk = trends.energy_trend && trends.energy_trend !== 'insufficient_data';
  const confidenceOk = trends.confidence_trend && trends.confidence_trend !== 'insufficient_data';
  const resilienceOk = trends.resilience_trend && trends.resilience_trend !== 'insufficient_data';
  const stretchHeavy = (trends.stretch_frequency_14d || 0) >= 5;
  const overloadHigh = (trends.overload_pattern_strength || 0) >= 60;
  const identityActive = trends.identity_friction_active;

  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0202ff]/8 border border-[#0202ff]/12 flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-[#0202ff]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">What Atreus is noticing</p>
            <p className="text-[10px] text-gray-400">
              Based on {trends.data_points_14d} check-ins over 14 days · Private to you
            </p>
          </div>
        </div>
        <PrivateTag />
      </div>

      <CardContent className="px-5 pt-3 pb-5 space-y-3">
        {/* LLM narrative */}
        {trends.trend_narrative && (
          <div className="bg-[#0202ff]/4 border border-[#0202ff]/10 rounded-xl p-3.5 space-y-2">
            <p className="text-sm text-gray-700 leading-relaxed italic">"{trends.trend_narrative}"</p>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#0202ff]/8 text-[#0202ff]">
              <Brain className="w-2.5 h-2.5" /> Atreus interpretation
            </span>
          </div>
        )}

        {/* 7-day summary */}
        {trends.summary_7d && trends.summary_7d !== 'Not enough signal for a 7-day summary yet.' && (
          <div className="bg-gray-50 rounded-xl p-3 space-y-1">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">7-day summary</p>
            <p className="text-xs text-gray-600 leading-relaxed">{trends.summary_7d}</p>
          </div>
        )}

        {/* Trend signals grid */}
        {(energyOk || confidenceOk || resilienceOk) && (
          <div className="grid grid-cols-3 gap-2">
            {energyOk && (
              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                <p className="text-[10px] text-gray-400 font-medium">Energy</p>
                <TrendPill trend={trends.energy_trend} />
              </div>
            )}
            {confidenceOk && (
              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                <p className="text-[10px] text-gray-400 font-medium">Confidence</p>
                <TrendPill trend={trends.confidence_trend} />
              </div>
            )}
            {resilienceOk && (
              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                <p className="text-[10px] text-gray-400 font-medium">Resilience</p>
                <TrendPill trend={trends.resilience_trend} />
              </div>
            )}
          </div>
        )}

        {/* Overload pattern warning */}
        {overloadHigh && (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl p-3">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-amber-800">Overload pattern detected</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                Over the last 28 days, overload signals have been consistently high (score {trends.overload_pattern_strength}/100).
                This is a pattern worth discussing with Atreus.
              </p>
            </div>
          </div>
        )}

        {/* Stretch frequency */}
        {stretchHeavy && !overloadHigh && (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl p-3">
            <TrendingDown className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              You've reported feeling stretched or drained in {trends.stretch_frequency_14d} of your last {trends.data_points_14d} check-ins.
            </p>
          </div>
        )}

        {/* Identity friction */}
        {identityActive && (
          <div className="flex items-start gap-2.5 bg-purple-50 border border-purple-100 rounded-xl p-3">
            <Zap className="w-3.5 h-3.5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-purple-800">Role identity signal</p>
              <p className="text-xs text-purple-700 leading-relaxed">
                You've recently described some friction around your role or leadership identity.
                This is common in transitions. Atreus can help you work through it.
              </p>
            </div>
          </div>
        )}

        {/* Delegation gap */}
        {(trends.delegation_gap_count_7d || 0) > 0 && (
          <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl p-3">
            <RotateCcw className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 leading-relaxed">
              You've declared delegation as a morning intent {trends.delegation_intent_count_7d || 0} time{(trends.delegation_intent_count_7d || 0) !== 1 ? 's' : ''} this week,
              but your day pattern didn't match {trends.delegation_gap_count_7d} time{trends.delegation_gap_count_7d !== 1 ? 's' : ''}.
              That gap is worth reflecting on.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Pulse History — recent check-in record */
function PulseHistorySection({ pulses }) {
  const [expanded, setExpanded] = useState(false);
  const displayPulses = expanded ? pulses.slice(0, 20) : pulses.slice(0, 5);

  if (!pulses || pulses.length === 0) {
    return (
      <Card className="shadow-sm border border-dashed border-gray-200 bg-white rounded-2xl">
        <CardContent className="px-5 py-5 text-center">
          <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600 mb-1">No check-ins yet</p>
          <p className="text-xs text-gray-400">
            Your check-in history will appear here. Head to My Leadership to do your first one.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center">
            <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Your check-in history</p>
            <p className="text-[10px] text-gray-400">{pulses.length} total · Private to you</p>
          </div>
        </div>
        <PrivateTag />
      </div>

      <CardContent className="px-5 pt-2 pb-5 space-y-2">
        {displayPulses.map((pulse, i) => (
          <div key={pulse.id || i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex-shrink-0">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">{formatDate(pulse.created_date)}</p>
                {pulse.biggest_weight_today && (
                  <p className="text-xs text-gray-400 truncate italic mt-0.5">"{pulse.biggest_weight_today}"</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {pulse.energy_level && (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${ENERGY_COLORS[pulse.energy_level] || 'bg-gray-100 text-gray-600'}`}>
                  {ENERGY_LABELS[pulse.energy_level] || pulse.energy_level}
                </span>
              )}
              <span className="text-[10px] text-gray-300">{daysAgo(pulse.created_date)}</span>
            </div>
          </div>
        ))}

        {pulses.length > 5 && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full text-xs text-[#0202ff] font-medium py-2 hover:underline"
          >
            {expanded ? 'Show less' : `Show ${pulses.length - 5} more check-ins`}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

/** Follow-Through Loop — commitment vs actuals */
function FollowThroughSection({ pulses }) {
  // Find morning intents with commitments
  const intentions = pulses.filter(p =>
    p.prompt_type === 'morning_intent' && p.focus_category && p.focus_intention
  ).slice(0, 5);

  // Find evening actuals that reveal gaps
  const gaps = pulses.filter(p =>
    p.intent_actuals_gap && p.intent_actuals_gap !== 'no_gap_detected' && p.intent_actuals_gap !== 'insufficient_data'
  ).slice(0, 3);

  const GAP_LABELS = {
    declared_delegation_operator_mode_detected:   { label: 'Intended to delegate, reverted to operator mode', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-100' },
    declared_strategic_tactical_overload_detected: { label: 'Planned strategic work, but tactical overload took over', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-100' },
    declared_team_support_low_1on1_detected:       { label: 'Said you\'d support the team, but 1:1s were light', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-100' },
  };

  if (intentions.length === 0 && gaps.length === 0) {
    return (
      <Card className="shadow-sm border border-dashed border-gray-200 bg-white rounded-2xl">
        <CardContent className="px-5 py-5">
          <div className="flex items-start gap-3">
            <RotateCcw className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-600 mb-0.5">The closed loop</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                When you declare morning intentions, Atreus compares them against your actual day.
                Gaps get surfaced here — privately — so you can learn from them.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center">
            <RotateCcw className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Intent vs actuals</p>
            <p className="text-[10px] text-gray-400">Where intent and reality diverged · Private to you</p>
          </div>
        </div>
        <PrivateTag />
      </div>

      <CardContent className="px-5 pt-2 pb-5 space-y-3">
        {/* Recent gaps */}
        {gaps.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Recent gaps detected</p>
            {gaps.map((g, i) => {
              const gapInfo = GAP_LABELS[g.intent_actuals_gap];
              if (!gapInfo) return null;
              return (
                <div key={i} className={`flex items-start gap-2.5 border rounded-xl p-3 ${gapInfo.bg}`}>
                  <AlertCircle className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${gapInfo.color}`} />
                  <div className="space-y-0.5">
                    <p className={`text-xs font-medium ${gapInfo.color}`}>{gapInfo.label}</p>
                    <p className="text-[10px] text-gray-400">{formatDate(g.created_date)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Recent intentions */}
        {intentions.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Recent morning intentions</p>
            {intentions.map((p, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-700 leading-relaxed">{p.focus_intention}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(p.created_date)} · {p.focus_category}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Weekly Reflection CTA — surfaces or launches the weekly ritual */
function WeeklyReflectionSection({ pulses, onComplete }) {
  const [showForm, setShowForm] = useState(false);

  // Check if already done this week (within last 5 days)
  const thisWeekReflection = pulses.find(p => {
    if (p.prompt_type !== 'weekly_reflection') return false;
    const days = Math.floor((Date.now() - new Date(p.created_date)) / 86400000);
    return days < 5;
  });

  if (showForm) {
    return (
      <WeeklyReflection
        onComplete={() => {
          setShowForm(false);
          onComplete?.();
        }}
        onSkip={() => setShowForm(false)}
      />
    );
  }

  return (
    <Card className={`shadow-sm rounded-2xl overflow-hidden ${thisWeekReflection ? 'border border-emerald-100 bg-emerald-50/30' : 'border border-[#0202ff]/15 bg-[#0202ff]/3'}`}>
      <CardContent className="px-5 py-5">
        <div className="flex items-start gap-3">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${thisWeekReflection ? 'bg-emerald-100' : 'bg-[#0202ff]'}`}>
            {thisWeekReflection ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Flame className="w-3.5 h-3.5 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              {thisWeekReflection ? 'Weekly reflection done' : 'Weekly reflection'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              {thisWeekReflection
                ? `Completed ${daysAgo(thisWeekReflection.created_date).toLowerCase()}. Consistency is where patterns live.`
                : 'Wins, setbacks, what stuck, what didn\'t. Takes 2 minutes.'}
            </p>
          </div>
          {!thisWeekReflection && (
            <Button
              size="sm"
              className="flex-shrink-0 bg-[#0202ff] hover:bg-[#0101dd] text-white text-xs h-8"
              onClick={() => setShowForm(true)}
            >
              Start <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function MyRhythm() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { openWithContext } = useAtreusChat();

  const openAtreus = (msg) => openWithContext({
    pageType: 'my-rhythm',
    starter_message: msg || "I want to talk through my leadership patterns.",
    user_name: user?.full_name?.split(' ')[0] || 'there',
  });

  const { data: trends = null, isLoading: loadingTrends } = useQuery({
    queryKey: ['rhythm-trends', user?.email],
    queryFn: async () => {
      const rows = await base44.entities.ManagerTrends.filter({ user_email: user.email }, '-last_trend_computed_at', 1);
      return rows[0] || null;
    },
    enabled: !!user?.email,
    staleTime: 15 * 60 * 1000,
  });

  const { data: pulses = [], isLoading: loadingPulses } = useQuery({
    queryKey: ['rhythm-pulses', user?.email],
    queryFn: () => base44.entities.ManagerPulse.filter({ user_email: user.email }, '-created_date', 30),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = loadingTrends || loadingPulses;

  const onWeeklyComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['rhythm-pulses', user?.email] });
    queryClient.invalidateQueries({ queryKey: ['rhythm-trends', user?.email] });
  };

  return (
    <MVPPageLayout
      title="My leadership rhythm"
      subtitle="Patterns, intentions, and what Atreus is noticing. Only visible to you."
    >
      {/* Privacy note */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl mb-1">
        <Shield className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <p className="text-xs text-gray-500 leading-relaxed">
          Everything on this page is private to you. It is never shared with HR, your manager, or anyone else.{' '}
          <Link to="/PrivacySettings" className="underline hover:text-gray-700">Privacy settings →</Link>
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4 mt-4">
          {[120, 80, 200, 160, 100].map((h, i) => (
            <div key={i} className="w-full rounded-2xl bg-gray-100 animate-pulse" style={{ height: h }} />
          ))}
        </div>
      ) : (
        <div className="space-y-4 mt-2">

          {/* Weekly reflection ritual */}
          <WeeklyReflectionSection pulses={pulses} onComplete={onWeeklyComplete} />

          {/* Trend memory */}
          <TrendMemorySection trends={trends} />

          {/* Atreus CTA */}
          {trends && (trends.data_points_14d || 0) >= 3 && (
            <button
              onClick={() => openAtreus("I want to understand what you've been noticing about my leadership rhythm. Walk me through the patterns.")}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-[#0202ff]/20 text-sm font-medium text-[#0202ff] hover:bg-[#0202ff]/5 transition-colors bg-white"
            >
              <Brain className="w-4 h-4" />
              Talk through my patterns with Atreus
            </button>
          )}

          {/* Intent vs actuals */}
          <FollowThroughSection pulses={pulses} />

          {/* Check-in history */}
          <PulseHistorySection pulses={pulses} />

          {/* Navigation back to full platform */}
          <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl">
            <CardContent className="px-5 py-4 space-y-1">
              <p className="text-xs text-gray-400 font-medium mb-2">Also available</p>
              {[
                { label: 'Daily check-in', sub: 'Today\'s quick pulse', path: '/my-leadership', icon: Flame, color: 'text-[#0202ff]' },
                { label: 'My goals', sub: 'Active leadership goals', path: '/my-goals', icon: Target, color: 'text-emerald-600' },
                { label: 'My development', sub: 'Learning and growth', path: '/my-development', icon: BookOpen, color: 'text-purple-600' },
              ].map((l) => {
                const Icon = l.icon;
                return (
                  <Link key={l.path} to={l.path}>
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
                      <Icon className={`w-4 h-4 flex-shrink-0 ${l.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{l.label}</p>
                        <p className="text-xs text-gray-400">{l.sub}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>

        </div>
      )}
    </MVPPageLayout>
  );
}