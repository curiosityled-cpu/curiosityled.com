/**
 * PatternEvidenceDrawer — Evidence trail drawer for Patterns page.
 * Separates: reported (self-report) vs observed (behavioral) vs interpreted (AI) layers.
 * Brief spec: "Detail drawer or modal for evidence trails" on Patterns.
 */
import React from "react";
import { X, Eye, Activity, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function EvidenceLayer({ icon: Icon, label, color, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className={`w-5 h-5 rounded-md flex items-center justify-center ${color.bg}`}>
          <Icon className={`w-3 h-3 ${color.icon}`} />
        </div>
        <p className={`text-[10px] font-semibold uppercase tracking-widest ${color.label}`}>{label}</p>
      </div>
      <div className="space-y-1.5 ml-7">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: 'hsl(220 10% 14%)' }}>
            <span className={`w-1 h-1 rounded-full flex-shrink-0 mt-1.5 ${color.dot}`} />
            <p className="text-xs leading-relaxed" style={{ color: 'hsl(220 10% 65%)' }}>{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildEvidence(pattern, trends, pulses, goals) {
  const reported = [];
  const observed = [];
  const interpreted = [];

  if (!pattern) return { reported, observed, interpreted };

  // --- REPORTED (self-report from check-ins) ---
  const heavyDays = pulses.filter(p => p.perceived_load === 'heavy' || p.perceived_load === 'unsustainable');
  if (heavyDays.length > 0) {
    reported.push(`${heavyDays.length} check-in${heavyDays.length > 1 ? 's' : ''} reported heavy or unsustainable load in the last 30 days.`);
  }
  const drainedEnergy = pulses.filter(p => p.energy_level === 'drained' || p.energy_level === 'stretched');
  if (drainedEnergy.length > 0) {
    reported.push(`${drainedEnergy.length} session${drainedEnergy.length > 1 ? 's' : ''} reported drained or stretched energy.`);
  }
  const avoidancePulses = pulses.filter(p => p.avoidance_flag === 'yes' || p.avoidance_flag === 'not_sure');
  if (avoidancePulses.length > 0) {
    reported.push(`${avoidancePulses.length} check-in${avoidancePulses.length > 1 ? 's' : ''} flagged avoidance or uncertainty.`);
  }
  const lowConfidence = pulses.filter(p => p.confidence_today === 'uncertain' || p.confidence_today === 'low');
  if (lowConfidence.length > 0) {
    reported.push(`${lowConfidence.length} session${lowConfidence.length > 1 ? 's' : ''} showed lower confidence signals.`);
  }
  if (reported.length === 0) reported.push('Self-report data is still building — check back after a few more check-ins.');

  // --- OBSERVED (behavioral / contextual) ---
  const stalledGoals = goals.filter(g => g.status === 'active' && (g.progress || 0) < 20);
  if (stalledGoals.length > 0) {
    observed.push(`${stalledGoals.length} active goal${stalledGoals.length > 1 ? 's' : ''} with less than 20% progress — consistent with the pattern.`);
  }
  const followThrough = pulses.filter(p => p.prompt_type === 'follow_up');
  const completed = followThrough.filter(p => p.intent_actuals_gap === 'no_gap_detected');
  if (followThrough.length > 0) {
    const rate = Math.round((completed.length / followThrough.length) * 100);
    observed.push(`${rate}% commitment follow-through rate (${completed.length}/${followThrough.length} tracked commitments).`);
  }
  if (trends?.delegation_gap_count_7d > 0) {
    observed.push(`${trends.delegation_gap_count_7d} delegation gap${trends.delegation_gap_count_7d > 1 ? 's' : ''} flagged in the last 7 days.`);
  }
  if (trends?.learning_stall_detected) {
    observed.push('Development activity has stalled — no learning logged in the recent period.');
  }
  if (observed.length === 0) observed.push('Behavioral signals build from goal progress, follow-through, and delegation data over time.');

  // --- INTERPRETED (AI pattern layer) ---
  if (trends?.overload_pattern_strength > 0) {
    interpreted.push(`Overload pattern confidence: ${Math.round(trends.overload_pattern_strength)}% — above 40% triggers active signal.`);
  }
  if (trends?.identity_friction_active) {
    interpreted.push('Role identity friction is active — detected from confidence signals and check-in language patterns.');
  }
  if (trends?.energy_trend === 'declining') {
    interpreted.push('Energy trend is declining over the last 14 days — trajectory detected across multiple data points.');
  }
  if (trends?.trend_narrative) {
    interpreted.push(`System note: "${trends.trend_narrative.slice(0, 120)}${trends.trend_narrative.length > 120 ? '…' : ''}"`);
  }
  if (interpreted.length === 0) interpreted.push('Pattern interpretation builds from at least 7–10 check-ins. The system is still calibrating.');

  return { reported, observed, interpreted };
}

export default function PatternEvidenceDrawer({ isOpen, onClose, pattern, trends, pulses = [], goals = [] }) {
  const { reported, observed, interpreted } = buildEvidence(pattern, trends, pulses, goals);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.6)' }}
          />
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm overflow-y-auto"
            style={{ background: 'hsl(220 12% 10%)', borderLeft: '1px solid hsl(220 10% 18%)' }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4" style={{ background: 'hsl(220 12% 10%)', borderBottom: '1px solid hsl(220 10% 18%)' }}>
              <div>
                <p className="text-sm font-bold" style={{ color: 'hsl(220 15% 88%)' }}>Evidence trail</p>
                <p className="text-[10px]" style={{ color: 'hsl(220 8% 48%)' }}>How this pattern is being read</p>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: 'hsl(220 10% 16%)' }}
              >
                <X className="w-4 h-4" style={{ color: 'hsl(220 8% 55%)' }} />
              </button>
            </div>

            {/* Pattern context */}
            {pattern && (
              <div className="px-5 py-4" style={{ borderBottom: '1px solid hsl(220 10% 18%)' }}>
                <div className="px-3 py-3 rounded-xl space-y-1" style={{ background: 'hsl(270 20% 14%)', border: '1px solid hsl(270 20% 20%)' }}>
                  <p className="text-sm font-bold" style={{ color: 'hsl(270 60% 72%)' }}>{pattern.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'hsl(220 8% 55%)' }}>{pattern.tagline}</p>
                </div>
              </div>
            )}

            {/* Three layers */}
            <div className="px-5 py-5 space-y-5">
              <EvidenceLayer
                icon={Eye}
                label="Self-reported"
                color={{ bg: 'bg-[#0202ff]/15', icon: 'text-[#6699ff]', label: 'text-[#6699ff]', dot: 'bg-[#6699ff]' }}
                items={reported}
              />
              <EvidenceLayer
                icon={Activity}
                label="Observed behavior"
                color={{ bg: 'bg-amber-500/15', icon: 'text-amber-400', label: 'text-amber-400', dot: 'bg-amber-400' }}
                items={observed}
              />
              <EvidenceLayer
                icon={Lightbulb}
                label="AI-interpreted"
                color={{ bg: 'bg-violet-500/15', icon: 'text-violet-400', label: 'text-violet-400', dot: 'bg-violet-400' }}
                items={interpreted}
              />
            </div>

            {/* Privacy note */}
            <div className="px-5 pb-8">
              <div className="px-3 py-3 rounded-xl text-[10px] leading-relaxed" style={{ background: 'hsl(220 10% 13%)', color: 'hsl(220 8% 45%)', border: '1px solid hsl(220 10% 18%)' }}>
                This evidence is private to you. No aggregated view or manager can see your check-in responses or pattern history.
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}