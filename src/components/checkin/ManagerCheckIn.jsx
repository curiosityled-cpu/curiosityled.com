/**
 * ManagerCheckIn — the in-product micro check-in surface.
 * Mirrors the Teams card UX so the experience is consistent
 * whether the manager taps in via Teams or opens the platform directly.
 *
 * Used on: MyLeadership (Today zone), and as a standalone modal.
 */
import React, { useState, useEffect } from "react";
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
  clarity_check: {
    title: "Clear, stretched, or already behind?",
    body: "When you look at today, which of these feels closest to where you actually are?",
    why: "I'm watching for stretches where you keep feeling 'behind' before the day even starts. Those are often the weeks where leadership takes the biggest hit.",
    options: [
      { label: "I feel clear", value: "steady", field_value: "steady" },
      { label: "I feel stretched", value: "stretched", field_value: "stretched" },
      { label: "Already behind", value: "drained", field_value: "drained" }
    ],
    optional_text: "What's making it feel that way?",
    field: "energy_level",
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
    prompt_type: "contextual"
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
  },
  morning_intent: {
    title: "What's your intent for today?",
    body: "Before the day takes over — what's the one thing you actually want to protect time for or lead well today?",
    why: "Declared intentions help me understand when days match up and when they don't. It's the gap between what you planned and what happened that's most useful.",
    options: [
      { label: "Delegate something meaningful", value: "delegation", field_value: "delegation" },
      { label: "Protect time for strategic work", value: "strategic_work", field_value: "strategic_work" },
      { label: "Prioritise my team", value: "team_support", field_value: "team_support" },
      { label: "Something personal / learning", value: "personal_development", field_value: "personal_development" }
    ],
    optional_text: "What specifically do you want to protect or do?",
    field: "focus_category",
    prompt_type: "morning_intent"
  },
  weekly_reflection: {
    title: "How did this week actually go?",
    body: "Not the output — the experience of it. Did you lead the way you wanted to this week?",
    why: "Weekly reflection is one of the most reliable ways to build self-awareness over time. Even a quick honest answer is useful.",
    options: [
      { label: "Mostly yes", value: "strong", field_value: "strong" },
      { label: "Mixed", value: "steady", field_value: "steady" },
      { label: "Mostly in survival mode", value: "stretched", field_value: "stretched" },
      { label: "Not at all", value: "drained", field_value: "drained" }
    ],
    optional_text: "What's one thing you'd do differently?",
    field: "energy_level",
    prompt_type: "weekly_reflection"
  },
  motivation_check: {
    title: "What's your drive like today?",
    body: "Not about what's on your list — just how much energy you actually have to lead right now.",
    why: "Motivation naturally dips and surges. Tracking it over time helps me understand what drains you and what fuels you.",
    options: [
      { label: "Genuinely fired up", value: "high", field_value: "high" },
      { label: "Getting on with it", value: "moderate", field_value: "moderate" },
      { label: "Running on fumes", value: "low", field_value: "low" },
      { label: "Flat today", value: "flat", field_value: "flat" }
    ],
    optional_text: "What's affecting your motivation today?",
    field: "motivation_today",
    prompt_type: "baseline_energy"
  },
  avoidance_check: {
    title: "Is there something you're quietly putting off?",
    body: "Most of us have something sitting on the edge of our awareness that we haven't quite got to. Anything like that today?",
    why: "Avoidance is one of the most honest signals of where leadership is actually hard. Noticing it is the first step.",
    options: [
      { label: "Yes, definitely", value: "yes", field_value: "yes" },
      { label: "Maybe — not sure", value: "not_sure", field_value: "not_sure" },
      { label: "Not really today", value: "no", field_value: "no" }
    ],
    optional_text: "What is it, if you want to name it?",
    field: "avoidance_flag",
    prompt_type: "contextual"
  },
  optimism_check: {
    title: "How does the near future feel from where you're sitting?",
    body: "Not about outcomes — just your gut sense of what's coming. Does it feel open, uncertain, or closed off?",
    why: "Optimism about what's ahead affects how you lead today. Tracking it over time helps me understand your cycles and support you at the right moments.",
    options: [
      { label: "Genuinely hopeful", value: "optimistic", field_value: "optimistic" },
      { label: "Cautiously okay", value: "hopeful", field_value: "hopeful" },
      { label: "Uncertain", value: "uncertain", field_value: "uncertain" },
      { label: "Flat or bleak", value: "pessimistic", field_value: "pessimistic" }
    ],
    optional_text: "What's shaping how you see things right now?",
    field: "optimism_today",
    prompt_type: "contextual"
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
  // storageKey computed lazily inside the initializer to avoid stale-date closure
  const getStorageKey = () => `cl_checkin_done_${promptType}_${new Date().toISOString().split('T')[0]}`;
  const [selected, setSelected] = useState(() => sessionStorage.getItem(getStorageKey() + '_val') || null);
  const [optionalText, setOptionalText] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(() => sessionStorage.getItem(getStorageKey()) === '1');
  const [followUp, setFollowUp] = useState(null);

  // Reset state when promptType changes (e.g. day rotation)
  useEffect(() => {
    setSelected(sessionStorage.getItem(getStorageKey() + '_val') || null);
    setOptionalText("");
    setShowOptional(false);
    setShowWhy(false);
    setFollowUp(null);
    setDone(sessionStorage.getItem(getStorageKey()) === '1');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptType]);

  const handleSelect = (option) => {
    if (saving || done) return;
    setSelected(option.value);
    // Determine follow-up message but don't save yet — wait for "Done" action
    const fu = FOLLOWUPS[promptType]?.[option.value] || null;
    setFollowUp(fu);
  };

  const handleDone = async () => {
    if (!selected || saving || done) return;
    setSaving(true);
    const pulseData = {
      user_email: user.email,
      source: "web",
      prompt_type: prompt.prompt_type,
      [prompt.field]: prompt.options.find(o => o.value === selected)?.field_value,
    };
    if (optionalText.trim()) {
      pulseData.biggest_weight_today = optionalText.trim();
    }
    await base44.entities.ManagerPulse.create(pulseData);
    setSaving(false);
    setDone(true);
    sessionStorage.setItem(getStorageKey(), '1');
    sessionStorage.setItem(getStorageKey() + '_val', selected);
    setTimeout(() => {
      if (onComplete) onComplete({ selected, optionalText, followUp });
    }, 1800);
  };

  // Find the selected option label for the summary
  const selectedOption = prompt.options.find(o => o.value === selected);

  if (done) {
    // Collapsed summary state
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
      >
        <div className="px-4 py-3.5 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Check-in done</p>
            <p className="text-sm font-medium text-gray-800 leading-snug">
              {selectedOption?.label || 'Checked in'}
              {optionalText && <span className="text-gray-500 font-normal"> · "{optionalText.slice(0, 60)}{optionalText.length > 60 ? '…' : ''}"</span>}
            </p>
          </div>
          <span className="text-[10px] text-gray-400 flex-shrink-0">Today</span>
        </div>
        {followUp && (
          <div className="px-4 pb-3.5">
            <div className="bg-[#0202ff]/5 border border-[#0202ff]/15 rounded-xl px-3 py-2.5">
              <p className="text-xs text-gray-700 leading-relaxed">{followUp}</p>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

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

        {/* Optional note + confirm (shown after selection, before done) */}
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
              <Textarea
                placeholder={prompt.optional_text}
                value={optionalText}
                onChange={(e) => setOptionalText(e.target.value)}
                className="text-sm resize-none h-20 rounded-xl border-gray-200 focus:border-[#0202ff]/40"
              />
            )}
            <Button
              size="sm"
              onClick={handleDone}
              disabled={saving}
              className="w-full text-xs h-8 bg-gray-900 hover:bg-gray-800 text-white rounded-xl"
            >
              {saving ? "Saving…" : "Done"}
            </Button>
          </div>
        )}

        {/* Why this today? */}
        <button
          onClick={() => setShowWhy(!showWhy)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <HelpCircle className="w-3 h-3" />
          Why this today?
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