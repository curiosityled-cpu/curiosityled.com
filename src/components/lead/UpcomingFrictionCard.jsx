/**
 * UpcomingFrictionCard — Warn without alarming.
 * Collapsed amber icon by default; expands to show friction detail on click.
 */
import React, { useState } from "react";
import { AlertCircle, ArrowRight, Brain, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

function detectFriction(trends, goals, pulses) {
  const frictions = [];

  // Overload trajectory
  if (trends?.operator_risk_trajectory === 'increasing' && trends?.overload_pattern_strength > 50) {
    frictions.push({
      signal: "Overload trajectory",
      prediction: "You've been absorbing high load for several days. Without a pattern break, this tends to compress decision quality and increase reactive behavior.",
      suggestion: "Block one hour of protected thinking time this week.",
      cta: "Plan delegation",
      link: "/practice",
    });
  }

  // Delegation gap
  if (trends?.delegation_gap_count_7d > 1) {
    frictions.push({
      signal: "Delegation gap",
      prediction: "You've committed to delegating multiple times this week but the pattern hasn't changed. This gap tends to widen under pressure.",
      suggestion: "Name one specific task and one specific person before the end of today.",
      cta: "Work through it",
      link: "/practice",
    });
  }

  // Learning stall
  if (trends?.learning_stall_detected) {
    frictions.push({
      signal: "Learning stall",
      prediction: "Development activity has dropped for several weeks. This is often the first thing cut under load — but it's also the first thing that compounds.",
      suggestion: "Schedule 30 minutes for one learning item this week.",
      cta: "View development",
      link: "/my-development",
    });
  }

  // Resilience depletion
  if (pulses?.length > 0) {
    const recent = pulses.slice(0, 5);
    const drainedCount = recent.filter(p => p.resilience_signal === 'depleted' || p.resilience_signal === 'fragile').length;
    if (drainedCount >= 3) {
      frictions.push({
        signal: "Resilience depleted",
        prediction: "3 of your last 5 check-ins show depleted or fragile resilience. This is a signal worth naming, not pushing through.",
        suggestion: "Talk it through with Atreus or block recovery time.",
        cta: "Talk it through",
        link: "/practice",
        atreus: true,
        atreusMsg: "I've been feeling resilience-depleted recently. Can we talk about what's driving it?",
      });
    }
  }

  return frictions[0] || null; // Show only the most urgent
}

export default function UpcomingFrictionCard({ trends, pulses, onOpenAtreus }) {
  const [expanded, setExpanded] = useState(false);
  const friction = detectFriction(trends, null, pulses);
  if (!friction) return null;

  return (
    <div className="w-full">
      {/* Collapsed chip */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors w-full text-left"
      >
        <div className="w-5 h-5 rounded-md bg-amber-400 flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-3 h-3 text-white" />
        </div>
        <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide flex-1">Watch this</span>
        <span className="text-[11px] text-amber-600/80 truncate max-w-[120px] hidden sm:block">{friction.signal}</span>
        {expanded
          ? <ChevronUp className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          : <ChevronDown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
      </button>

      {/* Expanded panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white px-4 py-4 space-y-3">
              <p className="text-xs font-medium text-amber-700">{friction.signal}</p>
              <p className="text-sm text-gray-700 leading-relaxed">{friction.prediction}</p>
              <div className="bg-white/70 rounded-lg px-3 py-2 border border-amber-100">
                <p className="text-xs text-gray-500">
                  <span className="font-medium text-gray-700">Suggested: </span>{friction.suggestion}
                </p>
              </div>
              <div className="flex gap-2">
                {friction.atreus ? (
                  <Button
                    size="sm"
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs h-8"
                    onClick={() => { onOpenAtreus(friction.atreusMsg); setExpanded(false); }}
                  >
                    <Brain className="w-3 h-3 mr-1.5" /> {friction.cta}
                  </Button>
                ) : (
                  <Link to={friction.link} className="flex-1" onClick={() => setExpanded(false)}>
                    <Button size="sm" className="w-full bg-amber-500 hover:bg-amber-600 text-white text-xs h-8">
                      {friction.cta} <ArrowRight className="w-3 h-3 ml-1.5" />
                    </Button>
                  </Link>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-gray-400 hover:text-gray-600 h-8 px-2"
                  onClick={() => setExpanded(false)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}