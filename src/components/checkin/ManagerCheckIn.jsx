/**
 * ManagerCheckIn — 3-question daily companion check-in.
 * Each session draws one question from three distinct state dimensions:
 *   1. Operational state   — load, energy, capacity
 *   2. Inner state         — confidence, motivation, optimism, emotional tone
 *   3. Behavioral signal   — avoidance, delegation mode, intent, follow-through
 *
 * This ensures we measure the whole person, not just busyness.
 */
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { MessageSquare, X, ChevronDown, ChevronUp, HelpCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import TodaysRead from "@/components/lead/TodaysRead";

// ── Question bank organised by state dimension ────────────────────────────────

const OPERATIONAL = [
  {
    id: "baseline_energy",
    title: "How loaded does today feel?",
    body: "Before the day runs away from you — how much room do you actually have right now?",
    why: "I'm tracking how heavy your days feel over time, not just what's on your calendar. That helps me spot when you're at risk of carrying too much.",
    options: [
      { label: "No room at all", value: "none", field_value: "unsustainable" },
      { label: "Pretty tight", value: "tight", field_value: "heavy" },
      { label: "Enough to breathe", value: "some", field_value: "manageable" },
      { label: "Lots of space", value: "plenty", field_value: "light" },
    ],
    optional_text: "What's weighing on you most, if anything?",
    field: "perceived_load",
    prompt_type: "baseline_energy",
  },
  {
    id: "clarity_check",
    title: "Clear, stretched, or already behind?",
    body: "When you look at today, which of these feels closest to where you actually are?",
    why: "Stretches of 'behind before the day starts' are often where leadership takes the biggest hit.",
    options: [
      { label: "I feel clear", value: "steady", field_value: "steady" },
      { label: "Stretched", value: "stretched", field_value: "stretched" },
      { label: "Already behind", value: "drained", field_value: "drained" },
    ],
    optional_text: "What's making it feel that way?",
    field: "energy_level",
    prompt_type: "baseline_energy",
  },
  {
    id: "weekly_reflection",
    title: "How did this week actually go?",
    body: "Not the output — the experience. Did you lead the way you wanted to?",
    why: "Weekly reflection is one of the most reliable ways to build self-awareness over time.",
    options: [
      { label: "Mostly yes", value: "strong", field_value: "strong" },
      { label: "Mixed", value: "steady", field_value: "steady" },
      { label: "Survival mode", value: "stretched", field_value: "stretched" },
      { label: "Not at all", value: "drained", field_value: "drained" },
    ],
    optional_text: "What's one thing you'd do differently?",
    field: "energy_level",
    prompt_type: "weekly_reflection",
  },
];

const INNER_STATE = [
  {
    id: "confidence_check",
    title: "How steady are you feeling today?",
    body: "Not 'are you doing your job' — just how settled do you feel in yourself as a leader right now?",
    why: "Confidence ebbs and flows. Checking in helps me support you at the right moments, not just when things are already hard.",
    options: [
      { label: "Solid", value: "high", field_value: "high" },
      { label: "Okay, mostly", value: "steady", field_value: "steady" },
      { label: "A bit shaky", value: "uncertain", field_value: "uncertain" },
      { label: "Not great", value: "low", field_value: "low" },
    ],
    optional_text: "What's shaking it, if anything?",
    field: "confidence_today",
    prompt_type: "contextual",
  },
  {
    id: "motivation_check",
    title: "What's your drive like today?",
    body: "Not about your task list — how much energy do you actually have to lead right now?",
    why: "Motivation naturally dips and surges. Tracking it helps me understand what drains you and what fuels you.",
    options: [
      { label: "Genuinely fired up", value: "high", field_value: "high" },
      { label: "Getting on with it", value: "moderate", field_value: "moderate" },
      { label: "Running on fumes", value: "low", field_value: "low" },
      { label: "Flat today", value: "flat", field_value: "flat" },
    ],
    optional_text: "What's affecting your motivation today?",
    field: "motivation_today",
    prompt_type: "baseline_energy",
  },
  {
    id: "optimism_check",
    title: "How does the near future feel?",
    body: "Not about outcomes — just your gut sense of what's coming. Open, uncertain, or closed off?",
    why: "Optimism about what's ahead affects how you lead today. Tracking it helps me understand your cycles.",
    options: [
      { label: "Genuinely hopeful", value: "optimistic", field_value: "optimistic" },
      { label: "Cautiously okay", value: "hopeful", field_value: "hopeful" },
      { label: "Uncertain", value: "uncertain", field_value: "uncertain" },
      { label: "Flat or bleak", value: "pessimistic", field_value: "pessimistic" },
    ],
    optional_text: "What's shaping how you see things right now?",
    field: "optimism_today",
    prompt_type: "contextual",
  },
];

const BEHAVIORAL = [
  {
    id: "avoidance_check",
    title: "Is there something you're quietly putting off?",
    body: "Most of us have something sitting on the edge of awareness we haven't quite got to. Anything like that today?",
    why: "Avoidance is one of the most honest signals of where leadership is actually hard. Naming it is the first step.",
    options: [
      { label: "Yes, definitely", value: "yes", field_value: "yes" },
      { label: "Maybe — not sure", value: "not_sure", field_value: "not_sure" },
      { label: "Not really today", value: "no", field_value: "no" },
    ],
    optional_text: "What is it, if you want to name it?",
    field: "avoidance_flag",
    prompt_type: "contextual",
  },
  {
    id: "overload_check",
    title: "Are you in 'I'll just do it myself' mode?",
    body: "When things pile up, it's easy to start grabbing more work rather than letting your team carry it.",
    why: "This often surfaces on heavy weeks. Spotting it early gives you a chance to course-correct.",
    options: [
      { label: "Very much", value: "very_much", field_value: "very_much" },
      { label: "Somewhat", value: "somewhat", field_value: "somewhat" },
      { label: "Not really", value: "not_really", field_value: "not_really" },
    ],
    optional_text: "What are you holding that shouldn't all sit with you?",
    field: "operator_mode_response",
    prompt_type: "overload_check",
  },
  {
    id: "morning_intent",
    title: "What's your intent for today?",
    body: "Before the day takes over — what's the one thing you want to protect time for or lead well today?",
    why: "Declared intentions help me understand the gap between what you planned and what actually happened.",
    options: [
      { label: "Delegate something meaningful", value: "delegation", field_value: "delegation" },
      { label: "Protect strategic work", value: "strategic_work", field_value: "strategic_work" },
      { label: "Prioritise my team", value: "team_support", field_value: "team_support" },
      { label: "Personal or learning focus", value: "personal_development", field_value: "personal_development" },
    ],
    optional_text: "What specifically do you want to protect or do?",
    field: "focus_category",
    prompt_type: "morning_intent",
  },
];

// ── Deterministic daily selection — same 3 questions all day, rotate each day ─

function pickDailySet(email) {
  const d = new Date();
  const dayIndex = Math.floor(d.getFullYear() * 366 + d.getMonth() * 31 + d.getDate() + (email?.charCodeAt(0) || 0));
  const op = OPERATIONAL[dayIndex % OPERATIONAL.length];
  const inner = INNER_STATE[(dayIndex + 1) % INNER_STATE.length];
  const behavioral = BEHAVIORAL[(dayIndex + 2) % BEHAVIORAL.length];
  return [op, inner, behavioral];
}

// ── Storage helpers ───────────────────────────────────────────────────────────

function getDateKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getSessionKey(email) {
  return `cl_checkin3_done_${getDateKey()}_${email || 'anon'}`;
}

// ── Single question step component ───────────────────────────────────────────

function QuestionStep({ question, stepIndex, totalSteps, onAnswer }) {
  const [selected, setSelected] = useState(null);
  const [optionalText, setOptionalText] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  const handleNext = () => {
    if (!selected) return;
    onAnswer({
      question,
      selected,
      optionalText: optionalText.trim(),
      field_value: question.options.find(o => o.value === selected)?.field_value,
    });
  };

  const dimensionLabel = stepIndex === 0 ? "Operational state" : stepIndex === 1 ? "Inner state" : "Behavioral signal";
  const dimensionColor = stepIndex === 0 ? "text-amber-500" : stepIndex === 1 ? "text-violet-500" : "text-blue-500";
  const dotColor = stepIndex === 0 ? "bg-amber-400" : stepIndex === 1 ? "bg-violet-400" : "bg-blue-400";

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.22 }}
      className="space-y-3"
    >
      {/* Step indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${dimensionColor}`}>{dimensionLabel}</span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`h-1.5 w-5 rounded-full transition-all ${i === stepIndex ? dotColor : i < stepIndex ? 'bg-emerald-400' : 'bg-muted'}`} />
          ))}
        </div>
      </div>

      {/* Question */}
      <div>
        <p className="text-sm font-semibold text-foreground leading-snug">{question.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{question.body}</p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-2">
        {question.options.map((option) => (
          <button
            key={option.value}
            onClick={() => setSelected(option.value)}
            className={`text-left text-sm px-3 py-2.5 rounded-xl border transition-all font-medium leading-snug
              ${selected === option.value
                ? 'border-[#0202ff] bg-[#0202ff]/5 text-[#0202ff]'
                : 'border-border text-foreground hover:border-muted-foreground hover:bg-muted/50 active:bg-muted'
              }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Optional note */}
      {selected && (
        <div className="space-y-2">
          <button
            onClick={() => setShowOptional(!showOptional)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showOptional ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showOptional ? "Never mind" : "Add a note (optional)"}
          </button>
          {showOptional && (
            <Textarea
              placeholder={question.optional_text}
              value={optionalText}
              onChange={(e) => setOptionalText(e.target.value)}
              className="text-sm resize-none h-20 rounded-xl border-border focus:border-[#0202ff]/40"
            />
          )}
          <Button
            size="sm"
            onClick={handleNext}
            className="w-full text-xs h-8 bg-foreground hover:bg-foreground/90 text-background rounded-xl flex items-center justify-center gap-1"
          >
            {stepIndex < totalSteps - 1 ? (
              <><span>Next</span><ChevronRight className="w-3 h-3" /></>
            ) : (
              <span>Done</span>
            )}
          </Button>
        </div>
      )}

      {/* Why this today */}
      <button
        onClick={() => setShowWhy(!showWhy)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#0202ff] transition-colors"
      >
        <HelpCircle className="w-3 h-3" />
        Why this today?
      </button>
      {showWhy && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="text-xs text-muted-foreground bg-muted rounded-xl px-3 py-2.5 leading-relaxed border border-border"
        >
          {question.why}
        </motion.div>
      )}
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ManagerCheckIn({ promptType, onComplete, onDismiss, trends, goals, pulses }) {
  const { user } = useAuth();
  const questions = useMemo(() => pickDailySet(user?.email), [user?.email]);

  const sessionKey = getSessionKey(user?.email);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(() => sessionStorage.getItem(sessionKey) === '1');

  const handleAnswer = async (answer) => {
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    if (stepIndex < questions.length - 1) {
      setStepIndex(stepIndex + 1);
      return;
    }

    // All 3 answered — persist as a single pulse record
    setSaving(true);
    const pulseData = { user_email: user.email, source: "web", prompt_type: "daily_triad" };
    newAnswers.forEach(({ question, field_value, optionalText }) => {
      pulseData[question.field] = field_value;
      if (optionalText) pulseData.biggest_weight_today = optionalText;
    });
    // Also mark the primary intent if morning_intent was one of the questions
    const intentAnswer = newAnswers.find(a => a.question.id === 'morning_intent');
    if (intentAnswer) pulseData.focus_category = intentAnswer.field_value;

    await base44.entities.ManagerPulse.create(pulseData).catch(() => {});
    setSaving(false);
    setDone(true);
    sessionStorage.setItem(sessionKey, '1');
    setTimeout(() => {
      if (onComplete) onComplete({ answers: newAnswers });
    }, 1800);
  };

  const handleReset = () => {
    sessionStorage.removeItem(sessionKey);
    setDone(false);
    setStepIndex(0);
    setAnswers([]);
  };

  if (done) {
    return (
      <TodaysRead
        selectedValue={answers[0]?.selected}
        promptType={answers[0]?.question?.prompt_type || "baseline_energy"}
        optionalText={answers.find(a => a.optionalText)?.optionalText || ''}
        followUp={null}
        trends={trends}
        goals={goals || []}
        pulses={pulses || []}
        onReset={handleReset}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick check-in</p>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground mt-0.5">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="px-4 pb-4">
        <AnimatePresence mode="wait">
          {!saving ? (
            <QuestionStep
              key={stepIndex}
              question={questions[stepIndex]}
              stepIndex={stepIndex}
              totalSteps={questions.length}
              onAnswer={handleAnswer}
            />
          ) : (
            <motion.div
              key="saving"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-6 text-center text-sm text-muted-foreground"
            >
              Saving your check-in…
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}