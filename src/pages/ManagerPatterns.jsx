/**
 * ManagerPatterns — Longitudinal memory, trends, interpretations.
 * Route: /patterns
 */
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useAtreusChat } from "@/components/ai/AtreusContext";
import { TrendingUp, AlertCircle, Info, Brain, BarChart3, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
// Button kept for EmptyState CTA
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import EnergyTimeline from "@/components/rhythm/EnergyTimeline";
import OperatorModeAlert from "@/components/rhythm/OperatorModeAlert";
import WhatsImprovingCard from "@/components/patterns/WhatsImprovingCard";
import WatchlistCard from "@/components/patterns/WatchlistCard";
import TriggerMapCard from "@/components/patterns/TriggerMapCard";
import LeadingPatternCard from "@/components/patterns/LeadingPatternCard";
import TrendSignalsChart from "@/components/patterns/TrendSignalsChart";

function PatternCard({ insight, goals }) {
  const patterns = [];
  if (insight?.top_strengths?.[0]) patterns.push({ type: 'supporting', text: `${insight.top_strengths[0].split(' (')[0]} appears to be a current strength you can lean on.`, tag: 'Assessment-based', tagColor: 'bg-emerald-50 text-emerald-700', icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> });
  if (insight?.development_areas?.[0]) patterns.push({ type: 'watch', text: `${insight.development_areas[0].split(' (')[0]} may benefit from more intentional focus — this pattern has appeared in recent signals.`, tag: 'AI-interpreted', tagColor: 'bg-amber-50 text-amber-700', icon: <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> });
  const stalled = goals.filter(g => g.status === 'active' && (g.progress || 0) < 20);
  if (stalled.length > 0) patterns.push({ type: 'watch', text: `${stalled.length === 1 ? 'One active goal has' : `${stalled.length} active goals have`} made little progress. A momentum check may help.`, tag: 'Goal tracker', tagColor: 'bg-blue-50 text-blue-700', icon: <BarChart3 className="w-3.5 h-3.5 text-blue-400" /> });
  if (patterns.length === 0) patterns.push({ type: 'neutral', text: 'Patterns build as you engage — check-ins, goals, and assessment results all contribute to what appears here.', tag: 'How this works', tagColor: 'bg-gray-100 text-gray-500', icon: <Info className="w-3.5 h-3.5 text-gray-400" /> });

  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-2 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center">
          <Eye className="w-3.5 h-3.5 text-purple-500" />
        </div>
        <p className="text-sm font-semibold text-gray-900">What we're noticing</p>
      </div>
      <CardContent className="px-5 pt-2 pb-5 space-y-3">
        {patterns.map((p, i) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="mt-0.5 flex-shrink-0">{p.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 leading-relaxed">{p.text}</p>
              <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mt-1.5 ${p.tagColor}`}>{p.tag}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function MemoryNarrativeCard({ trends }) {
  const narrative = trends?.trend_narrative || trends?.summary_28d;
  const computedAt = trends?.last_trend_computed_at;
  const dataPoints = trends?.data_points_28d;

  if (!narrative) return null;

  const timeLabel = computedAt
    ? new Date(computedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0202ff] flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-white" />
          </div>
          <p className="text-sm font-semibold text-gray-900">What Atreus has noticed — last 28 days</p>
        </div>
        {timeLabel && <span className="text-[10px] text-gray-400">Updated {timeLabel}</span>}
      </div>
      <CardContent className="px-5 pt-2 pb-5">
        <p className="text-sm text-gray-700 leading-relaxed">{narrative}</p>
        <p className="text-[10px] text-gray-400 mt-2">
          {dataPoints > 0 ? `Based on ${dataPoints} check-in${dataPoints !== 1 ? 's' : ''} · ` : ''}Private to you
        </p>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="shadow-sm border border-dashed border-gray-200 bg-white rounded-2xl">
      <CardContent className="py-12 px-6 text-center">
        <Brain className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="text-sm font-semibold text-gray-700 mb-1">Patterns appear over time</p>
        <p className="text-xs text-gray-400 max-w-xs mx-auto mb-4 leading-relaxed">
          Daily check-ins, your Leadership Index, and goal activity all feed into what you'll see here. Come back after a few days of use.
        </p>
        <Link to="/today">
          <Button size="sm" variant="outline" className="text-xs border-[#0202ff]/30 text-[#0202ff] hover:bg-blue-50">
            Start your daily check-in →
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function ManagerPatterns() {
  const { user } = useAuth();
  const { openWithContext } = useAtreusChat();
  const openAtreus = (msg) => openWithContext({ context: { pageType: 'patterns', user_name: user?.full_name }, starterMessage: msg || "Help me understand my recent patterns." });

  const { data: trends = null } = useQuery({
    queryKey: ['ml-trends', user?.email],
    queryFn: async () => { try { const rows = await base44.entities.ManagerTrends.filter({ user_email: user.email }, '-last_trend_computed_at', 1); return rows[0] || null; } catch { return null; } },
    enabled: !!user?.email, staleTime: 30 * 60 * 1000,
  });

  const { data: recentPulses = [] } = useQuery({
    queryKey: ['ml-pulses', user?.email],
    queryFn: async () => { try { return await base44.entities.ManagerPulse.filter({ user_email: user.email }, '-created_date', 50); } catch { return []; } },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  const { data: insight = null } = useQuery({
    queryKey: ['ml-insight', user?.email],
    queryFn: async () => {
      try { const rows = await base44.entities.AssessmentInsights.filter({ user_email: user.email }, '-created_date', 1); return rows[0] || null; } catch { return null; }
    },
    enabled: !!user?.email, staleTime: 0,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['ml-goals', user?.email],
    queryFn: async () => { try { return await base44.entities.Goal.filter({ user_email: user.email }, '-created_date', 15); } catch { return []; } },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['ml-activities', user?.email],
    queryFn: async () => { try { return await base44.entities.UserActivity.filter({ user_email: user.email }, '-date', 14); } catch { return []; } },
    enabled: !!user?.email, staleTime: 15 * 60 * 1000,
  });

  const hasData = trends || recentPulses.length > 0 || insight;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="pt-2 pb-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Patterns</p>
        <h1 className="text-2xl font-bold text-gray-900">What we're noticing</h1>
        <p className="text-sm text-gray-500 mt-1">Longitudinal memory — how you lead over time.</p>
      </div>

      {hasData ? (
        <>
          <MemoryNarrativeCard trends={trends} />
          <LeadingPatternCard trends={trends} pulses={recentPulses} goals={goals} onOpenAtreus={openAtreus} />
          <OperatorModeAlert pulses={recentPulses} onOpenAtreus={openAtreus} />
          <TrendSignalsChart trends={trends} pulses={recentPulses} />
          <EnergyTimeline pulses={recentPulses} />
          {insight && <PatternCard insight={insight} goals={goals} />}
          <WhatsImprovingCard trends={trends} pulses={recentPulses} goals={goals} />
          <TriggerMapCard trends={trends} pulses={recentPulses} activities={activities} onOpenAtreus={openAtreus} />
          <WatchlistCard trends={trends} pulses={recentPulses} goals={goals} onOpenAtreus={openAtreus} />

          <div className="pt-1 pb-2 flex justify-center">
            <button
              onClick={() => openAtreus("Help me make sense of my patterns over the past month.")}
              className="flex items-center gap-1.5 text-sm text-[#0202ff] hover:underline"
            >
              <Brain className="w-3.5 h-3.5" /> Explore patterns with Atreus
            </button>
          </div>
        </>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}