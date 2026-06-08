/**
 * MorningCheckIn — 5-measure morning self-check (Energy, Confidence, Focus, Load, Growth)
 * Uses AI-generated conversational questions from saveDailyCheckIn backend.
 */
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Sun, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const MEASURES = [
  { key: "energy",     label: "Energy",     emoji: "⚡", desc: "Steadiness" },
  { key: "confidence", label: "Confidence", emoji: "🎯", desc: "Clarity" },
  { key: "focus",      label: "Focus",      emoji: "🔍", desc: "Momentum" },
  { key: "load",       label: "Load",       emoji: "🪨", desc: "Pressure" },
  { key: "growth",     label: "Growth",     emoji: "🌱", desc: "Follow-through" },
];

const SCALE_LABELS = {
  1: "Low",
  2: "Below avg",
  3: "Okay",
  4: "Good",
  5: "Strong",
};

function ScorePicker({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all
            ${value === n
              ? "bg-[#0202ff] text-white shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
        >
          {n}
          <span className="block text-[9px] font-normal leading-tight mt-0.5 opacity-80">
            {SCALE_LABELS[n]}
          </span>
        </button>
      ))}
    </div>
  );
}

export default function MorningCheckIn({ onComplete, todayRecord }) {
  const [step, setStep] = useState(0); // 0=loading, 1-5=measures, 6=done
  const [questions, setQuestions] = useState(null);
  const [scores, setScores] = useState({ energy: 3, confidence: 3, focus: 3, load: 3, growth: 3 });
  const [notes, setNotes] = useState({ energy: "", confidence: "", focus: "", load: "", growth: "" });
  const [saving, setSaving] = useState(false);

  const alreadyDone = todayRecord?.morning_completed;

  useEffect(() => {
    if (alreadyDone) { setStep(6); return; }
    // Load AI questions
    base44.functions.invoke("saveDailyCheckIn", { action: "get_questions", check_in_type: "morning" })
      .then(res => {
        setQuestions(res.data?.questions || null);
        setStep(1);
      })
      .catch(() => setStep(1));
  }, [alreadyDone]);

  const currentMeasure = MEASURES[step - 1];

  const handleNext = () => {
    if (step < 5) {
      setStep(s => s + 1);
    } else {
      handleSave();
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke("saveDailyCheckIn", {
        action: "save",
        check_in_type: "morning",
        energy_score: scores.energy,
        energy_note: notes.energy,
        confidence_score: scores.confidence,
        confidence_note: notes.confidence,
        focus_score: scores.focus,
        focus_note: notes.focus,
        load_score: scores.load,
        load_note: notes.load,
        growth_score: scores.growth,
        growth_note: notes.growth,
        questions_used: questions || {},
      });
      setStep(6);
      onComplete?.();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Loading
  if (step === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-[#0202ff]" />
      </div>
    );
  }

  // Done state
  if (step === 6) {
    if (alreadyDone && todayRecord) {
      return (
        <div className="bg-card rounded-2xl border border-emerald-200/60 px-4 py-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Morning check-in done</p>
            <div className="flex gap-3 mt-2 flex-wrap">
              {MEASURES.map(m => (
                <div key={m.key} className="flex items-center gap-1">
                  <span className="text-xs">{m.emoji}</span>
                  <span className="text-xs text-muted-foreground">{m.label}</span>
                  <span className="text-xs font-semibold text-foreground">{todayRecord[`${m.key}_score`] ?? "–"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="bg-card rounded-2xl border border-emerald-200/60 px-4 py-5 text-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
        <p className="text-sm font-semibold text-foreground">Morning check-in complete</p>
        <p className="text-xs text-muted-foreground mt-1">Atreus will use this to shape your day.</p>
      </div>
    );
  }

  const measure = currentMeasure;
  const question = questions?.[measure.key] || `How's your ${measure.label.toLowerCase()} right now?`;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border flex items-center gap-2">
        <Sun className="w-4 h-4 text-amber-400" />
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Morning check-in</p>
        <span className="ml-auto text-xs text-muted-foreground">{step}/5</span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div className="h-1 bg-[#0202ff] transition-all duration-300" style={{ width: `${(step / 5) * 100}%` }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="px-4 py-5 space-y-4"
        >
          {/* Measure label */}
          <div className="flex items-center gap-2">
            <span className="text-xl">{measure.emoji}</span>
            <div>
              <p className="text-xs font-semibold text-[#0202ff] uppercase tracking-wide">{measure.label} · {measure.desc}</p>
            </div>
          </div>

          {/* AI question */}
          <p className="text-sm font-medium text-foreground leading-snug">{question}</p>

          {/* Score picker */}
          <ScorePicker
            value={scores[measure.key]}
            onChange={(v) => setScores(s => ({ ...s, [measure.key]: v }))}
          />

          {/* Optional note */}
          <textarea
            value={notes[measure.key]}
            onChange={(e) => setNotes(n => ({ ...n, [measure.key]: e.target.value }))}
            placeholder="Add a note (optional)"
            rows={2}
            className="w-full text-sm bg-muted/40 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30 placeholder:text-muted-foreground/60"
          />

          <Button
            onClick={handleNext}
            disabled={saving}
            className="w-full bg-[#0202ff] hover:bg-[#0101dd] flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : step < 5 ? <><span>Next</span><ChevronRight className="w-3.5 h-3.5" /></> : "Complete check-in"}
          </Button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}