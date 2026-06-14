/**
 * MorningCheckIn — 5-measure morning self-check (Energy, Confidence, Focus, Load, Growth)
 * Uses AI-generated conversational questions from saveDailyCheckIn backend.
 */
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Sun, ChevronRight, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
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

function getTodayET() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

function getDraftKey(userEmail) {
  return `morning_draft_${userEmail}_${getTodayET()}`;
}

const COMPLETED_KEY = "morning_checkin_completed";

function wasCompletedToday(userEmail) {
  try {
    const raw = localStorage.getItem(COMPLETED_KEY);
    if (!raw) return false;
    const { date, email } = JSON.parse(raw);
    return date === getTodayET() && email === userEmail;
  } catch { return false; }
}

function markCompletedToday(userEmail) {
  try {
    localStorage.setItem(COMPLETED_KEY, JSON.stringify({ date: getTodayET(), email: userEmail }));
  } catch {}
}

export default function MorningCheckIn({ onComplete, todayRecord, userEmail }) {
  const alreadyDone = todayRecord?.morning_completed || wasCompletedToday(userEmail);

  // Initialize step to 6 immediately if we already know it's done — prevents flash of step 1
  const [step, setStep] = useState(() => alreadyDone ? 6 : 0);
  const [questions, setQuestions] = useState(null);
  const [scores, setScores] = useState(() => alreadyDone ? {
    energy:     todayRecord.energy_score     || 3,
    confidence: todayRecord.confidence_score || 3,
    focus:      todayRecord.focus_score      || 3,
    load:       todayRecord.load_score       || 3,
    growth:     todayRecord.growth_score     || 3,
  } : { energy: 3, confidence: 3, focus: 3, load: 3, growth: 3 });
  const [notes, setNotes] = useState(() => alreadyDone ? {
    energy:     todayRecord.energy_note     || "",
    confidence: todayRecord.confidence_note || "",
    focus:      todayRecord.focus_note      || "",
    load:       todayRecord.load_note       || "",
    growth:     todayRecord.growth_note     || "",
  } : { energy: "", confidence: "", focus: "", load: "", growth: "" });
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editStep, setEditStep] = useState(1);

  // Guard against re-fetching questions on every re-render
  const fetchInitiatedRef = useRef(false);
  const stepRef = useRef(alreadyDone ? 6 : 0);

  // Persist in-progress draft to localStorage on every step/score/note change
  useEffect(() => {
    if (!userEmail || alreadyDone || step < 1 || step > 5) return;
    const draft = { step, scores, notes, questions };
    localStorage.setItem(getDraftKey(userEmail), JSON.stringify(draft));
  }, [step, scores, notes, questions, userEmail, alreadyDone]);

  // Keep stepRef in sync so the effect can read current step without being a dependency
  useEffect(() => { stepRef.current = step; }, [step]);

  useEffect(() => {
    // Wait until we know the user and today's record status
    if (!userEmail) return;

    if (alreadyDone) {
      setStep(6);
      setScores({
        energy:     todayRecord.energy_score     || 3,
        confidence: todayRecord.confidence_score || 3,
        focus:      todayRecord.focus_score      || 3,
        load:       todayRecord.load_score       || 3,
        growth:     todayRecord.growth_score     || 3,
      });
      setNotes({
        energy:     todayRecord.energy_note     || "",
        confidence: todayRecord.confidence_note || "",
        focus:      todayRecord.focus_note      || "",
        load:       todayRecord.load_note       || "",
        growth:     todayRecord.growth_note     || "",
      });
      localStorage.removeItem(getDraftKey(userEmail));
      return;
    }

    // todayRecord is still loading (undefined) — don't start the fetch yet
    if (todayRecord === undefined) return;

    // Don't reset step if we're already in the done state
    if (stepRef.current >= 6) return;

    // Try to rehydrate an in-progress draft first
    try {
      const raw = localStorage.getItem(getDraftKey(userEmail));
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.step >= 1 && draft.step <= 5) {
          setStep(draft.step);
          setScores(draft.scores);
          setNotes(draft.notes);
          if (draft.questions) setQuestions(draft.questions);
          fetchInitiatedRef.current = true;
          return;
        }
      }
    } catch { /* ignore parse errors */ }

    // Only fetch once per mount
    if (fetchInitiatedRef.current) return;
    fetchInitiatedRef.current = true;

    let cancelled = false;
    const timeout = setTimeout(() => { if (!cancelled) setStep(1); }, 8000);

    base44.functions.invoke("saveDailyCheckIn", { action: "get_questions", check_in_type: "morning", client_date: getTodayET() })
      .then(res => {
        clearTimeout(timeout);
        if (!cancelled) { setQuestions(res.data?.questions || null); setStep(1); }
      })
      .catch(() => {
        clearTimeout(timeout);
        if (!cancelled) setStep(1);
      });

    return () => { cancelled = true; clearTimeout(timeout); };
  }, [alreadyDone, userEmail, todayRecord]);

  const currentMeasure = MEASURES[step - 1];

  const handleNext = () => {
    if (step < 5) {
      setStep(s => s + 1);
    } else {
      handleSave();
    }
  };

  const handleSave = () => {
    setSaving(true);
    // Immediately update UI and notify parent — don't wait for the API round-trip
    setStep(6);
    if (userEmail) {
      localStorage.removeItem(getDraftKey(userEmail));
      markCompletedToday(userEmail); // Persist completion so remounts after navigation show "done"
    }
    try { onComplete?.([], 'morning'); } catch (cbErr) { console.error('onComplete error:', cbErr); }

    base44.functions.invoke("saveDailyCheckIn", {
      action: "save",
      check_in_type: "morning",
      client_date: getTodayET(),
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
    }).catch(err => {
      console.error('Save error:', err);
    }).finally(() => setSaving(false));
  };

  // Loading
  if (step === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-[#0202ff]" />
      </div>
    );
  }

  const handleEditSave = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke("saveDailyCheckIn", {
        action: "save", check_in_type: "morning",
        client_date: getTodayET(),
        energy_score: scores.energy, energy_note: notes.energy,
        confidence_score: scores.confidence, confidence_note: notes.confidence,
        focus_score: scores.focus, focus_note: notes.focus,
        load_score: scores.load, load_note: notes.load,
        growth_score: scores.growth, growth_note: notes.growth,
        questions_used: questions || {},
      });
      setEditMode(false); setExpanded(false);
      onComplete?.([], 'morning');
    } catch (err) { console.error('Edit save error:', err); }
    finally { setSaving(false); }
  };

  // Done state — collapsible
  if (step === 6 && !editMode) {
    return (
      <div className="bg-card rounded-2xl border border-emerald-200/60 overflow-hidden">
        <div className="px-4 py-3.5 flex items-center gap-3">
          <button
            className="flex items-center gap-3 flex-1 min-w-0 text-left"
            onClick={() => setExpanded(v => !v)}
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Morning check-in done</p>
              <div className="flex gap-3 mt-1 flex-wrap">
                {MEASURES.map(m => (
                  <div key={m.key} className="flex items-center gap-1">
                    <span className="text-xs">{m.emoji}</span>
                    <span className="text-xs font-semibold text-foreground">{scores[m.key]}</span>
                  </div>
                ))}
              </div>
            </div>
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
          </button>
          <button
            onClick={() => { setEditMode(true); setEditStep(1); }}
            className="text-xs text-[#0202ff] font-medium hover:underline flex-shrink-0 ml-1"
          >
            Edit
          </button>
        </div>
        {expanded && (
          <div className="border-t border-border px-4 py-3 space-y-2">
            {MEASURES.map(m => (
              <div key={m.key} className="flex items-start gap-2">
                <span className="text-sm">{m.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-foreground">{m.label}</p>
                    <span className="text-xs font-bold text-[#0202ff]">{scores[m.key]}/5</span>
                  </div>
                  {notes[m.key] && <p className="text-[10px] text-muted-foreground mt-0.5">{notes[m.key]}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Edit mode
  if (editMode) {
    const measure = MEASURES[editStep - 1];
    const question = questions?.[measure.key] || `How's your ${measure.label.toLowerCase()} right now?`;
    return (
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-border flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-400" />
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Edit morning check-in</p>
          <span className="ml-auto text-xs text-muted-foreground">{editStep}/5</span>
        </div>
        <div className="h-1 bg-muted"><div className="h-1 bg-[#0202ff] transition-all" style={{ width: `${(editStep/5)*100}%` }} /></div>
        <AnimatePresence mode="wait">
          <motion.div key={editStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="px-4 py-5 space-y-4">
            <div className="flex items-center gap-2"><span className="text-xl">{measure.emoji}</span><p className="text-xs font-semibold text-[#0202ff] uppercase tracking-wide">{measure.label} · {measure.desc}</p></div>
            <p className="text-sm font-medium text-foreground leading-snug">{question}</p>
            <ScorePicker value={scores[measure.key]} onChange={(v) => setScores(s => ({ ...s, [measure.key]: v }))} />
            <textarea value={notes[measure.key]} onChange={(e) => setNotes(n => ({ ...n, [measure.key]: e.target.value }))} placeholder="Add a note (optional)" rows={2} className="w-full text-sm bg-muted/40 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30 placeholder:text-muted-foreground/60" />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => { setEditMode(false); setExpanded(false); }}>Cancel</Button>
              <Button onClick={() => editStep < 5 ? setEditStep(s => s+1) : handleEditSave()} disabled={saving} className="flex-1 bg-[#0202ff] hover:bg-[#0101dd] text-sm">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editStep < 5 ? <><span>Next</span><ChevronRight className="w-3.5 h-3.5" /></> : "Save changes"}
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
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