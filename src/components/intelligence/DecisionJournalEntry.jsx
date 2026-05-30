/**
 * DecisionJournalEntry — log a decision and quick reflection.
 * Stored as a ManagerPulse with prompt_type: 'contextual'
 * and tagged in biggest_weight_today.
 */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { CheckCircle2, ChevronDown, ChevronUp, HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";

const DECISION_TYPES = [
  { label: "Team / people decision", value: "team" },
  { label: "Strategic or direction call", value: "strategic" },
  { label: "Hard conversation I need to have", value: "conversation" },
  { label: "Something I chose not to do", value: "avoidance" },
  { label: "Something I handed off", value: "delegation" },
];

const CONFIDENCE_OPTIONS = [
  { label: "Confident", value: "high" },
  { label: "Uncertain", value: "uncertain" },
  { label: "Second-guessing", value: "low" },
];

export default function DecisionJournalEntry({ onComplete, onDismiss }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0); // 0: type, 1: details, 2: done
  const [decisionType, setDecisionType] = useState(null);
  const [decisionText, setDecisionText] = useState("");
  const [confidence, setConfidence] = useState(null);
  const [showWhy, setShowWhy] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!decisionText.trim() || saving) return;
    setSaving(true);
    const label = DECISION_TYPES.find(d => d.value === decisionType)?.label || decisionType;
    await base44.entities.ManagerPulse.create({
      user_email: user.email,
      source: "web",
      prompt_type: "contextual",
      biggest_weight_today: `[Decision: ${label}] ${decisionText.trim()}`,
      confidence_today: confidence || "steady",
    });
    setSaving(false);
    setStep(2);
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 1800);
  };

  if (step === 2) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 flex items-center gap-3"
      >
        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-gray-900">Logged.</p>
          <p className="text-xs text-gray-500 mt-0.5">Atreus will notice patterns in your decisions over time.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Decision journal</p>
          <p className="text-sm font-semibold text-gray-900 leading-snug mt-0.5">
            {step === 0 ? "What kind of decision are you logging?" : "Tell me a bit more"}
          </p>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-gray-300 hover:text-gray-500 mt-0.5">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="px-4 pb-4 space-y-3">
        <p className="text-xs text-gray-500 leading-relaxed">
          {step === 0
            ? "Logging decisions helps Atreus notice patterns — what pulls you into certain roles, what you avoid, and where confidence wavers."
            : "Just a sentence or two. What did you decide, and how does it feel?"}
        </p>

        {step === 0 && (
          <div className="space-y-2">
            {DECISION_TYPES.map((d) => (
              <button
                key={d.value}
                onClick={() => { setDecisionType(d.value); setStep(1); }}
                className="w-full text-left text-sm px-3 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:border-[#0202ff]/40 hover:bg-[#0202ff]/4 transition-all font-medium"
              >
                {d.label}
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <Textarea
              placeholder="e.g. I told the team we're changing priorities. Felt right but wasn't easy."
              value={decisionText}
              onChange={(e) => setDecisionText(e.target.value)}
              className="text-sm resize-none h-20 rounded-xl border-gray-200 focus:border-[#0202ff]/40"
              autoFocus
            />

            <div>
              <p className="text-xs text-gray-500 mb-2">How confident did you feel?</p>
              <div className="flex gap-2">
                {CONFIDENCE_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setConfidence(c.value)}
                    className={`flex-1 text-xs px-2 py-2 rounded-xl border font-medium transition-all ${
                      confidence === c.value
                        ? "border-[#0202ff] bg-[#0202ff]/5 text-[#0202ff]"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={!decisionText.trim() || saving}
              className="w-full text-xs h-8 bg-gray-900 hover:bg-gray-800 text-white rounded-xl"
            >
              {saving ? "Saving…" : "Log this decision"}
            </Button>

            <button
              onClick={() => setStep(0)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              ← Change type
            </button>
          </div>
        )}

        {/* Why this */}
        <button
          onClick={() => setShowWhy(!showWhy)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <HelpCircle className="w-3 h-3" />
          Why does this matter?
        </button>
        {showWhy && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2.5 leading-relaxed border border-gray-100"
          >
            Decisions reveal what you value, what you fear, and where you lean. Over time, Atreus will notice patterns — like whether confidence drops before strategic decisions, or whether delegation is something you intend but don't quite follow through on.
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}