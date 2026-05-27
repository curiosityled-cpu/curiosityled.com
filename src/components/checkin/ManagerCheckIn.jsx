/**
 * ManagerCheckIn — the in-product micro check-in surface.
 * Mirrors the Teams card UX so the experience is consistent
 * whether the manager taps in via Teams or opens the platform directly.
 *
 * Used on: MyLeadership (Today zone), and as a standalone modal.
 */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { MessageSquare, X, ChevronDown, ChevronUp, HelpCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";

// Prompt definitions — kept in sync with sendTeamsPrompt.js
const PROMPTS = {
  baseline_energy: {
    title: "How's today really feel?",
    body: "Before the day runs away from you — how much room do you actually have right now?",
    why: "I'm trying to understand how loaded your days feel over time, not just what's on your calendar. That helps me spot when you're at risk of carrying too much yourself.",
    options: [
      { label: "No room at all", value: "none", field_value: "unsustainable" },
      { label: "Pretty tight", value: "tight", field_value: "heavy" },
      { label: "Enough to breathe", value: "some", field_value: "manageable" },
      { label: "Lots of space", value: "plenty", field_value: "light" }
    ],
    optional_text: "What's weighing on you most, if anything?",
    field: "perceived_load",
    prompt_type: "baseline_energy"
  },
  confidence_check: {
    title: "How steady are you feeling today?",
    body: "Not 'are you doing your job' — just, how settled do you feel in yourself as a leader right now?",
    why: "Confidence ebbs and flows. Checking in helps me support you at the right moments, not just when things are already hard.",
    options: [
      { label: "Solid", value: "high", field_value: "high" },
      { label: "Okay, mostly", value: "steady", field_value: "steady" },
      { label: "A bit shaky", value: "uncertain", field_value: "uncertain" },
      { label: "Not great", value: "low", field_value: "low" }
    ],
    optional_text: "What's shaking it, if anything?",
    field: "confidence_today",
    prompt_type: "baseline_energy"
  },
  overload_check: {
    title: "Are you in 'I'll just do it' mode?",
    body: "When things pile up like this, it's easy to start grabbing more work yourself instead of letting your team carry it.",
    why: "Some of your longer-term goals haven't moved much lately. On heavy weeks, that's usually when you end up carrying more than you planned.",
    options: [
      { label: "Very much", value: "very_much", field_value: "very_much" },
      { label: "Somewhat", value: "somewhat", field_value: "somewhat" },
      { label: "Not really", value: "not_really", field_value: "not_really" },
      { label: "Skip today", value: "skipped", field_value: "skipped" }
    ],
    optional_text: "What are you holding that probably shouldn't all sit with you?",
    field: "operator_mode_response",
    prompt_type: "overload_check"
  }
};

const FOLLOWUPS = {
  overload_check: {
    very_much: "Okay — let's take some weight off. Want help picking one thing to hand off or say no to before tomorrow?",
    somewhat: "You're catching it early. We could turn one task into a small delegation experiment this week.",
    not_really: "Good. If that changes, just say 'I'm sliding into doing it all again' and we'll sort it out.",
    skipped: null
  }
};

export default function ManagerCheckIn({ promptType = "baseline_energy", onComplete, onDismiss, compact = false }) {
  const { user } = useAuth();
  const prompt = PROMPTS[promptType] || PROMPTS.baseline_energy;

  // Persist "done today" in sessionStorage so re-mounts don't re-prompt
  const storageKey = `cl_checkin_done_${promptType}_${new Date().toISOString().split('T')[0]}`;
  const [selected, setSelected] = useState(null);
  const [optionalText, setOptionalText] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(() => sessionStorage.getItem(storageKey) === '1');
  const [followUp, setFollowUp] = useState(null);

  const handleSelect = async (option) => {
    if (saving || done) return;
    setSelected(option.value);

    // Determine follow-up message
    const fu = FOLLOWUPS[promptType]?.[option.value] || null;
    setFollowUp(fu);

    // Save to ManagerPulse
    setSaving(true);
    const pulseData = {
      user_email: user.email,
      source: "web",
      prompt_type: prompt.prompt_type,
      [prompt.field]: option.field_value,
    };
    if (optionalText.trim()) {
      pulseData.biggest_weight_today = optionalText.trim();
    }

    await base44.entities.ManagerPulse.create(pulseData);
    setSaving(false);
    setDone(true);
    sessionStorage.setItem(storageKey, '1');

    // Bubble up after a short moment
    setTimeout(() => {
      if (onComplete) onComplete({ selected: option, optionalText, followUp: fu });
    }, 1800);
  };

  const handleSubmitText = async () => {
    if (!selected || !optionalText.trim()) return;
    // Update the most recent pulse with the optional text
    setSaving(true);
    const recent = await base44.entities.ManagerPulse.filter(
      { user_email: user.email, prompt_type: prompt.prompt_type }, '-created_date', 1
    );
    if (recent[0]) {
      await base44.entities.ManagerPulse.update(recent[0].id, {
        biggest_weight_today: optionalText.trim()
      });
    }
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Quick check-in</p>
            <p className="text-sm font-semibold text-gray-900 leading-snug">{prompt.title}</p>
          </div>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-gray-300 hover:text-gray-500 mt-0.5">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="px-4 pb-4 space-y-3">
        {/* Body */}
        <p className="text-sm text-gray-600 leading-relaxed">{prompt.body}</p>

        {/* Options */}
        {!done ? (
          <div className="grid grid-cols-2 gap-2">
            {prompt.options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option)}
                disabled={saving}
                className={`text-left text-sm px-3 py-2.5 rounded-xl border transition-all font-medium leading-snug
                  ${selected === option.value
                    ? 'border-[#0202ff] bg-[#0202ff]/5 text-[#0202ff]'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100'
                  }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Got it — thanks for checking in.</span>
              </div>
              {followUp && (
                <div className="bg-[#0202ff]/5 border border-[#0202ff]/15 rounded-xl px-3 py-3">
                  <p className="text-sm text-gray-800 leading-relaxed">{followUp}</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Optional text (shown after selection, before done) */}
        {selected && !done && (
          <div className="space-y-2">
            <button
              onClick={() => setShowOptional(!showOptional)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showOptional ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showOptional ? "Never mind" : "Add a note (optional)"}
            </button>
            {showOptional && (
              <div className="space-y-2">
                <Textarea
                  placeholder={prompt.optional_text}
                  value={optionalText}
                  onChange={(e) => setOptionalText(e.target.value)}
                  className="text-sm resize-none h-20 rounded-xl border-gray-200 focus:border-[#0202ff]/40"
                />
                {optionalText.trim() && (
                  <Button
                    size="sm"
                    onClick={handleSubmitText}
                    disabled={saving}
                    className="text-xs h-7 bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    Save note
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Why this? */}
        <button
          onClick={() => setShowWhy(!showWhy)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <HelpCircle className="w-3 h-3" />
          Why am I being asked this?
        </button>
        {showWhy && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2.5 leading-relaxed border border-gray-100"
          >
            {prompt.why}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}