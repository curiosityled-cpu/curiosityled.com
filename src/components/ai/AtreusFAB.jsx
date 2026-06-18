/**
 * AtreusFAB — State-aware Floating Action Button for Atreus.
 *
 * Implements buildFABState() from the spec (Part 4):
 * The label and opening message adapt deterministically based on current context —
 * no LLM call, just a priority cascade.
 *
 * Priority order (spec):
 *   1. Morning check-in not done → "Start your day"
 *   2. Critical KPI off-track → "Team signal"
 *   3. Active pattern streak ≥ 3 days → "Let's talk"
 *   4. Big 3 not set → "Plan your day"
 *   5. Default → "Atreus"
 */
import React, { useEffect, useState } from "react";
import { Brain } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { motion } from "framer-motion";

function buildFABState({ checkIn, trends, kpis, lastCardFocus }) {
  // Rule 1: morning check-in not yet done today
  if (checkIn && !checkIn.morning_completed) {
    return {
      label: "Start your day",
      openingMessage: "Let's do your morning check-in. How are you feeling heading into today?"
    };
  }

  // Rule 2: any KPI critically off-track
  const criticalKPI = kpis?.find(k => k.status === 'active' && k.current_value != null && k.target_value != null && (
    k.direction === 'higher_better' ? (k.current_value / k.target_value) < 0.7 :
    k.direction === 'lower_better' ? (k.current_value / k.target_value) > 1.3 :
    false
  ));
  if (criticalKPI) {
    return {
      label: "Team signal",
      openingMessage: `Your ${criticalKPI.title} is below target. Before you react, let's think about what's actually driving it. What's your read on the last 24 hours?`
    };
  }

  // Rule 3: active pattern streak ≥ 3 days
  if (trends && trends.stretch_frequency_14d >= 3) {
    return {
      label: "Let's talk",
      openingMessage: `I've been noticing a pattern over the last ${trends.stretch_frequency_14d} days that's worth a conversation. Are you up for it?`
    };
  }

  // Rule 4: card focus — user just spent time on a specific card
  if (lastCardFocus && lastCardFocus.action === 'dwell') {
    const labels = {
      'leading-pattern': 'Unpack this pattern',
      'watchlist': 'Explore signals',
      'checkin-trends': 'Review trends',
    };
    const label = labels[lastCardFocus.card_id];
    if (label) {
      return {
        label,
        openingMessage: `I see you're looking at the ${lastCardFocus.card_id?.replace(/-/g, ' ')} section. Want to explore what's behind it together?`
      };
    }
  }

  // Rule 5: Big 3 not set for today
  if (checkIn && checkIn.morning_completed && (!checkIn.big3_priorities || checkIn.big3_priorities.length === 0)) {
    return {
      label: "Plan your day",
      openingMessage: "You haven't set your Big 3 yet. Want to think through what matters most today?"
    };
  }

  // Default
  return {
    label: "Atreus",
    openingMessage: null // use default contextual greeting
  };
}

export default function AtreusFAB({ onOpen, lastCardFocus }) {
  const { user } = useAuth();
  const [fabState, setFabState] = useState({ label: "Atreus", openingMessage: null });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;

    const loadContext = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [checkIns, trendsRows, kpis] = await Promise.all([
          base44.entities.DailyCheckIn.filter({ user_email: user.email, check_in_date: today }, '-created_date', 1),
          base44.entities.ManagerTrends.filter({ user_email: user.email }, '-last_trend_computed_at', 1),
          base44.entities.KPI.filter({ status: 'active' }, '-created_date', 10),
        ]);

        if (cancelled) return;

        const state = buildFABState({
          checkIn: checkIns[0] || null,
          trends: trendsRows[0] || null,
          kpis,
          lastCardFocus,
        });

        setFabState(state);
        setLoaded(true);
      } catch {
        setLoaded(true);
      }
    };

    loadContext();
    return () => { cancelled = true; };
  }, [user?.email, lastCardFocus?.emitted_at]);

  const isCustomLabel = fabState.label !== "Atreus";

  return (
    <motion.button
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      onClick={() => onOpen?.(fabState.openingMessage)}
      className="fixed bottom-6 right-6 z-40 rounded-full transition-all flex items-center justify-center gap-2 select-none"
      style={{
        backgroundColor: '#0202ff',
        boxShadow: '0 4px 20px rgba(2,2,255,0.35)',
        height: '3.5rem',
        paddingLeft: isCustomLabel ? '1.25rem' : '0',
        paddingRight: isCustomLabel ? '1.25rem' : '0',
        width: isCustomLabel ? 'auto' : '3.5rem',
        maxWidth: '220px',
      }}
      onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#0101dd'; }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0202ff'; }}
      title={fabState.openingMessage || "Ask Atreus — your leadership companion"}
    >
      <Brain className="w-6 h-6 text-white flex-shrink-0" />
      {isCustomLabel && (
        <span className="text-white text-sm font-semibold whitespace-nowrap">{fabState.label}</span>
      )}
    </motion.button>
  );
}