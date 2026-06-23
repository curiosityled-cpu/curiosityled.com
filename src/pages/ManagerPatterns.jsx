/**
 * ManagerPatterns — Longitudinal memory, trends, interpretations.
 * Route: /patterns
 */
import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { loadCheckInHistory } from "@/lib/checkInStore";
import { useAtreusChat } from "@/components/ai/AtreusContext";
import { Brain, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import IntentLoopCard from "@/components/checkin/IntentLoopCard";
import { Link } from "react-router-dom";
import WhatsImprovingCard from "@/components/patterns/WhatsImprovingCard";
import WatchlistCard from "@/components/patterns/WatchlistCard";
import LeadingPatternCard from "@/components/patterns/LeadingPatternCard";
import LeadershipNarrativeCard from "@/components/patterns/LeadershipNarrativeCard";
import SwipeableSections from "@/components/patterns/SwipeableSections";
import CheckInTrendDashboard from "@/components/patterns/CheckInTrendDashboard";
import BpoHeroPatternCard from "@/components/patterns/BpoHeroPatternCard";
import BpoWatchRow from "@/components/patterns/BpoWatchRow";
import { runBpoPatternEngine } from "@/components/patterns/bpoPatternEngine";
import DecisionJournalCard from "@/components/decisions/DecisionJournalCard";



function EmptyState() {
  return (
    <Card className="shadow-sm border border-dashed border-border bg-card rounded-2xl">
      <CardContent className="py-12 px-6 text-center">
        <Brain className="w-10 h-10 text-muted mx-auto mb-3" />
        <p className="text-sm font-semibold text-card-foreground mb-1">Patterns appear over time</p>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-4 leading-relaxed">
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

  const { data: trends = null, isLoading: trendsLoading } = useQuery({
    queryKey: ['ml-trends', user?.email],
    queryFn: async () => { try { const rows = await base44.entities.ManagerTrends.filter({ user_email: user.email }, '-last_trend_computed_at', 1); return rows[0] || null; } catch { return null; } },
    enabled: !!user?.email, staleTime: 30 * 60 * 1000,
  });

  const { data: recentPulses = [], isLoading: pulsesLoading } = useQuery({
    queryKey: ['ml-pulses', user?.email],
    queryFn: async () => { try { return await base44.entities.ManagerPulse.filter({ user_email: user.email }, '-created_date', 50); } catch { return []; } },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  const { data: insight = null, isLoading: insightLoading } = useQuery({
    queryKey: ['ml-insight', user?.email],
    queryFn: async () => {
      try { const rows = await base44.entities.AssessmentInsights.filter({ user_email: user.email }, '-created_date', 1); return rows[0] || null; } catch { return null; }
    },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['ml-goals', user?.email],
    queryFn: async () => {
      try {
        const r = await base44.entities.Goal.filter({ created_by: user.email, status: 'active' }, '-created_date', 15);
        if (r.length) return r;
        return await base44.entities.Goal.filter({ assigned_to_emails: { $in: [user.email] } }, '-created_date', 15);
      } catch { return []; }
    },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['ml-activities', user?.email],
    queryFn: async () => { try { return await base44.entities.UserActivity.filter({ user_email: user.email }, '-date', 14); } catch { return []; } },
    enabled: !!user?.email, staleTime: 15 * 60 * 1000,
  });

  const { data: entityCheckIns = [] } = useQuery({
    queryKey: ['daily-checkin-history', user?.email],
    queryFn: async () => { try { return await base44.entities.DailyCheckIn.filter({ user_email: user.email }, '-check_in_date', 120); } catch { return []; } },
    enabled: !!user?.email, staleTime: 0,
  });

  // Merge localStorage check-in history (same source as ManagerToday) so the chart is always current
  const [localHistory, setLocalHistory] = useState([]);
  useEffect(() => {
    if (!user?.email) return;
    setLocalHistory(loadCheckInHistory(user.email));
  }, [user?.email]);

  // Merge: prefer localStorage records (more current), fill gaps with entity records
  const checkInHistory = useMemo(() => {
    const map = new Map();
    entityCheckIns.forEach(r => map.set(r.check_in_date, r));
    localHistory.forEach(r => { if (r.check_in_date) map.set(r.check_in_date, r); });
    return Array.from(map.values()).sort((a, b) => b.check_in_date.localeCompare(a.check_in_date));
  }, [entityCheckIns, localHistory]);

  // Today's live record (same query key as ManagerToday so it reuses cached data)
  const todayET = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());

  const { data: todayData } = useQuery({
    queryKey: ['daily-checkin-today', user?.email],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke("saveDailyCheckIn", { action: "get_today", client_date: todayET });
        return { record: res.data?.record || null };
      } catch { return { record: null }; }
    },
    enabled: !!user?.email, staleTime: 10 * 60 * 1000, refetchOnWindowFocus: false, refetchOnMount: false,
  });
  const todayRecord = todayData?.record ?? null;

  // Final check-in list passed to the chart: inject todayRecord if not already in history
  const mergedCheckIns = useMemo(() => {
    if (!todayRecord) return checkInHistory;
    const ids = new Set(checkInHistory.map(r => r.check_in_date));
    const hasScores = todayRecord.energy_score != null || todayRecord.confidence_score != null;
    return (!ids.has(todayET) && hasScores) ? [todayRecord, ...checkInHistory] : checkInHistory;
  }, [checkInHistory, todayRecord, todayET]);

  const { data: latestAssessment = null } = useQuery({
    queryKey: ['ml-assessment-latest', user?.email],
    queryFn: async () => { try { const rows = await base44.entities.Assessment.filter({ email: user.email }, '-created_date', 1); return rows[0] || null; } catch { return null; } },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  const { data: memory = null } = useQuery({
    queryKey: ['ml-memory', user?.email],
    queryFn: async () => { try { const rows = await base44.entities.ManagerMemory.filter({ user_email: user.email }, '-last_synthesized_at', 1); return rows[0] || null; } catch { return null; } },
    enabled: !!user?.email, staleTime: 30 * 60 * 1000,
  });

  // BPO pattern engine — must be before any early returns (Rules of Hooks)
  const rankedPatterns = useMemo(() =>
    runBpoPatternEngine({
      trends,
      checkIns: mergedCheckIns,
      goals,
      activities,
      pulses: recentPulses,
    }),
    [trends, mergedCheckIns, goals, activities, recentPulses]
  );
  const heroPattern = rankedPatterns[0] || null;

  const isLoadingInitial = trendsLoading || pulsesLoading || insightLoading;
  const hasData = trends || recentPulses.length > 0 || insight || checkInHistory.length > 0 || latestAssessment;

  const header = (
    <div className="pt-2 pb-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Patterns</p>
      <h1 className="text-2xl font-bold text-foreground">What we're noticing</h1>
      <p className="text-sm text-muted-foreground mt-1">Longitudinal memory — how you lead over time.</p>
    </div>
  );

  if (isLoadingInitial) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-[#0202ff]" />
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {header}
        <EmptyState />
      </div>
    );
  }

  // Gate: only show Intentions Loop if 5+ days of Big 3 data
  const big3DaysCount = checkInHistory.filter(c =>
    c.big3_priorities?.length > 0
  ).length;

  // Left column — BPO hero + watch row + narrative
  const leftColumn = (
    <div className="space-y-4">
      {heroPattern ? (
        <>
          <BpoHeroPatternCard pattern={heroPattern} onOpenAtreus={openAtreus} />
          <BpoWatchRow patterns={rankedPatterns} onOpenAtreus={openAtreus} />
        </>
      ) : (
        <LeadingPatternCard
          trends={trends}
          pulses={recentPulses}
          goals={goals}
          recentCheckIns={checkInHistory}
          recentPulses={recentPulses}
          onOpenAtreus={openAtreus}
        />
      )}
      <LeadershipNarrativeCard
        trends={trends}
        insight={insight}
        goals={goals}
        onOpenAtreus={openAtreus}
      />
      {big3DaysCount >= 5 && (
        <IntentLoopCard pulses={recentPulses} trends={trends} onOpenAtreus={openAtreus} />
      )}
      <WhatsImprovingCard trends={trends} pulses={recentPulses} goals={goals} />
      <DecisionJournalCard />
    </div>
  );

  // Right column — signal rail (2 cards)
  const rightColumn = (
    <div className="space-y-4">
      <CheckInTrendDashboard checkIns={mergedCheckIns} assessment={latestAssessment} />
      <WatchlistCard trends={trends} pulses={recentPulses} goals={goals} onOpenAtreus={openAtreus} />
    </div>
  );

  return (
    <div className="px-4 py-6">
      {/* Mobile: swipeable two-section layout */}
      <div className="md:hidden max-w-2xl mx-auto space-y-4">
        {header}
        <SwipeableSections
          sections={[
            { label: "Patterns", content: leftColumn },
            { label: "Signals", content: rightColumn },
          ]}
        />
      </div>

      {/* Desktop: two-column */}
      <div className="hidden md:block max-w-6xl mx-auto">
        {header}
        <div className="mt-4 grid grid-cols-[1fr_360px] gap-6 items-start">
          <div>{leftColumn}</div>
          <div className="sticky top-4">{rightColumn}</div>
        </div>
      </div>
    </div>
  );
}