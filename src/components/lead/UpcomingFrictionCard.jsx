/**
 * UpcomingFrictionCard — Warn without alarming.
 * Renders as a small amber icon in the page header that opens a popover on click.
 */
import React, { useState, useRef, useEffect } from "react";
import { AlertCircle, ArrowRight, Brain, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

function detectFriction(trends, pulses) {
  const frictions = [];

  if (trends?.operator_risk_trajectory === 'increasing' && trends?.overload_pattern_strength > 50) {
    frictions.push({
      signal: "Overload trajectory",
      prediction: "You've been absorbing high load for several days. Without a pattern break, this tends to compress decision quality and increase reactive behavior.",
      suggestion: "Block one hour of protected thinking time this week.",
      cta: "Plan delegation",
      link: "/practice",
    });
  }

  if (trends?.delegation_gap_count_7d > 1) {
    frictions.push({
      signal: "Delegation gap",
      prediction: "You've committed to delegating multiple times this week but the pattern hasn't changed. This gap tends to widen under pressure.",
      suggestion: "Name one specific task and one specific person before the end of today.",
      cta: "Work through it",
      link: "/practice",
    });
  }

  if (trends?.learning_stall_detected) {
    frictions.push({
      signal: "Learning stall",
      prediction: "Development activity has dropped for several weeks. This is often the first thing cut under load — but it's also the first thing that compounds.",
      suggestion: "Schedule 30 minutes for one learning item this week.",
      cta: "View development",
      link: "/my-development",
    });
  }

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

  return frictions[0] || null;
}

export default function UpcomingFrictionCard({ trends, pulses, onOpenAtreus }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const friction = detectFriction(trends, pulses);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!friction) return null;

  return (
    <div className="relative" ref={ref}>
      {/* Icon trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 flex items-center justify-center transition-colors"
        title="Watch this"
      >
        <AlertCircle className="w-4 h-4 text-amber-500" />
        {/* Pulse dot */}
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 border border-white" />
      </button>

      {/* Popover */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-10 z-50 w-72 rounded-2xl border border-amber-100 bg-white shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border-b border-amber-100">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Watch this</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-4 py-4 space-y-3">
              <p className="text-xs font-semibold text-amber-700">{friction.signal}</p>
              <p className="text-sm text-gray-700 leading-relaxed">{friction.prediction}</p>
              <div className="rounded-lg bg-amber-50 px-3 py-2 border border-amber-100">
                <p className="text-xs text-gray-500">
                  <span className="font-medium text-gray-700">Suggested: </span>{friction.suggestion}
                </p>
              </div>
              {friction.atreus ? (
                <Button
                  size="sm"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white text-xs h-8"
                  onClick={() => { onOpenAtreus(friction.atreusMsg); setOpen(false); }}
                >
                  <Brain className="w-3 h-3 mr-1.5" /> {friction.cta}
                </Button>
              ) : (
                <Link to={friction.link} className="block" onClick={() => setOpen(false)}>
                  <Button size="sm" className="w-full bg-amber-500 hover:bg-amber-600 text-white text-xs h-8">
                    {friction.cta} <ArrowRight className="w-3 h-3 ml-1.5" />
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}