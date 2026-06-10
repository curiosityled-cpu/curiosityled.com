/**
 * EveningCheckIn — End-of-day reflection check (5 measures) + Big 3 planning for tomorrow.
 * Prompts user to reflect on today and set tomorrow's Big 3 priorities.
 */
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Moon, ChevronRight, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const MEASURES = [
  { key: "energy",     label: "Energy",     emoji: "⚡", desc: "How you finished" },
  { key: "confidence", label: "Confidence", emoji: "🎯", desc: "Decisions made today" },
  { key: "focus",      label: "Focus",      emoji: "🔍", desc: "On your priorities" },
  { key: "load",       label: "Load",       emoji: "🪨", desc: "What drained you" },
  { key: "growth",     label: "Growth",     emoji: "🌱", desc: "Honoured your intentions" },
];

const SCALE_LABELS = { 1: "Low", 2: "Below avg", 3: "Okay", 4: "Good", 5: "Strong" };

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
          <span className="block text-[9px] font-normal leading-tight mt-0.5 opacity-80">{SCALE_LABELS[n]}</span>
        </button>
      ))}
    </div>
  );
}

function Big3Step({ goals, onSave }) {
  const [priorities, setPriorities] = useState([
    { id: "1", title: "", context: "", goal_id: "" },
    { id: "2", title: "", context: "", goal_id: "" },
    { id: "3", title: "", context: "", goal_id: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const activeGoals = (goals || []).filter(g => g.status === "active").slice(0, 15);

  const update = (idx, field, val) => {
    setPriorities(prev => prev.map((p, i) => i === idx ? { ...p, [field]: val } : p));
  };

  const handleSave = async () => {
    const filled = priorities.filter(p => p.title.trim());
    if (!filled.length) { onSave([]); return; }
    setSaving(true);
    await onSave(filled.map(p => ({ ...p, status: "planned" })));
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Big 3 for tomorrow</p>
        <p className="text-xs text-muted-foreground mt-0.5">What will make tomorrow count? Add at least 1 — all 3 are optional.</p>
      </div>

      {priorities.map((p, i) => (
        <div key={p.id} className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#0202ff] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
            <input
              type="text"
              value={p.title}
              onChange={e => update(i, 'title', e.target.value)}
              placeholder={`Priority ${i + 1}`}
              autoComplete="off"
              className="flex-1 text-sm bg-muted/40 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30 placeholder:text-muted-foreground/50"
            />
          </div>
          {p.title.trim() && (
          <div className="ml-7 space-y-1.5">
            {activeGoals.length > 0 && (
              <select
                value={p.goal_id}
                onChange={e => update(i, 'goal_id', e.target.value)}
                tabIndex={p.title ? 0 : -1}
                className="w-full text-xs bg-muted/40 rounded-lg px-2 py-1.5 focus:outline-none text-muted-foreground"
              >
                <option value="">Link to a goal (optional)</option>
                {activeGoals.map(g => (
                  <option key={g.id} value={g.id}>{g.title?.slice(0, 60)}</option>
                ))}
              </select>
            )}
            <textarea
              value={p.context}
              onChange={e => update(i, 'context', e.target.value)}
              placeholder="Any context or intention? (optional)"
              rows={1}
              className="w-full text-xs bg-muted/40 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30 placeholder:text-muted-foreground/50"
            />
          </div>
          )}
        </div>
      ))}

      <Button
        onClick={handleSave}
        disabled={saving || !priorities.some(p => p.title.trim())}
        className="w-full bg-[#0202ff] hover:bg-[#0101dd]"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & complete evening check-in"}
      </Button>
      <button
        onClick={() => onSave([])}
        className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
      >
        Skip for tonight
      </button>
    </div>
  );
}

export default function EveningCheckIn({ onComplete, todayRecord, goals = [] }) {
  const [step, setStep] = useState(0);
  const [questions, setQuestions] = useState(null);
  const [scores, setScores] = useState({ energy: 3, confidence: 3, focus: 3, load: 3, growth: 3 });
  const [notes, setNotes] = useState({ energy: "", confidence: "", focus: "", load: "", growth: "" });
  const [saving, setSaving] = useState(false);
  const [savedBig3, setSavedBig3] = useState(null); // success confirmation state
  const [localBig3, setLocalBig3] = useState(null); // persisted after save for step 7 display
  const [expanded, setExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editStep, setEditStep] = useState(1);

  const alreadyDone = todayRecord?.evening_completed;

  useEffect(() => {
    if (alreadyDone) {
      setStep(7);
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
      return;
    }
    base44.functions.invoke("saveDailyCheckIn", { action: "get_questions", check_in_type: "evening" })
      .then(res => { setQuestions(res.data?.questions || null); setStep(1); })
      .catch(() => setStep(1));
  }, [alreadyDone]);

  const handleMeasureNext = () => {
    if (step < 5) setStep(s => s + 1);
    else setStep(6); // → Big 3
  };

  const handleBig3Save = async (big3Priorities) => {
    setSaving(true);
    try {
      await base44.functions.invoke("saveDailyCheckIn", {
        action: "save",
        check_in_type: "evening",
        energy_score: scores.energy, energy_note: notes.energy,
        confidence_score: scores.confidence, confidence_note: notes.confidence,
        focus_score: scores.focus, focus_note: notes.focus,
        load_score: scores.load, load_note: notes.load,
        growth_score: scores.growth, growth_note: notes.growth,
        big3_priorities: big3Priorities,
        questions_used: questions || {},
      });
      // Show success confirmation for 2s before transitioning
      setSavedBig3(big3Priorities);
      setLocalBig3(big3Priorities);
      setTimeout(() => {
        setStep(7);
        onComplete?.();
      }, 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (step === 0) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-5 h-5 animate-spin text-[#0202ff]" />
    </div>
  );

  const handleEditSave = async (big3Priorities) => {
    setSaving(true);
    try {
      await base44.functions.invoke("saveDailyCheckIn", {
        action: "save", check_in_type: "evening",
        energy_score: scores.energy, energy_note: notes.energy,
        confidence_score: scores.confidence, confidence_note: notes.confidence,
        focus_score: scores.focus, focus_note: notes.focus,
        load_score: scores.load, load_note: notes.load,
        growth_score: scores.growth, growth_note: notes.growth,
        big3_priorities: big3Priorities,
        questions_used: questions || {},
      });
      setEditMode(false); setExpanded(false);
      onComplete?.();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  if (step === 7 && !editMode) {
    const big3 = localBig3 ?? todayRecord?.big3_priorities ?? [];
    return (
      <div className="bg-card rounded-2xl border border-indigo-200/60 overflow-hidden">
        <button className="w-full px-4 py-3.5 flex items-center gap-3 text-left" onClick={() => setExpanded(v => !v)}>
          <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Evening check-in done</p>
            <p className="text-xs text-muted-foreground mt-0.5">{big3.length > 0 ? `Big 3 set for tomorrow` : "No Big 3 set"}</p>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
        </button>
        {expanded && (
          <div className="border-t border-border px-4 py-3 space-y-2">
            {MEASURES.map(m => (
              <div key={m.key} className="flex items-start gap-2">
                <span className="text-sm">{m.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-foreground">{m.label}</p>
                    <span className="text-xs font-bold text-indigo-500">{scores[m.key]}/5</span>
                  </div>
                  {notes[m.key] && <p className="text-[10px] text-muted-foreground mt-0.5">{notes[m.key]}</p>}
                </div>
              </div>
            ))}
            {big3.length > 0 && (
              <div className="pt-2 border-t border-border space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Big 3 tomorrow</p>
                {big3.map((p, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#0202ff] text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                    <p className="text-xs text-foreground">{p.title}</p>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => { setEditMode(true); setEditStep(1); }} className="text-xs text-[#0202ff] font-medium hover:underline mt-1">
              Edit answers
            </button>
          </div>
        )}
      </div>
    );
  }

  // Edit mode — re-steps through measures then Big 3
  if (editMode) {
    if (editStep === 6) {
      return (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-border flex items-center gap-2">
            <Moon className="w-4 h-4 text-indigo-400" />
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Edit Big 3</p>
          </div>
          <div className="px-4 py-5">
            <Big3Step goals={goals} onSave={handleEditSave} />
            <button onClick={() => { setEditMode(false); setExpanded(false); }} className="mt-2 text-xs text-muted-foreground hover:text-foreground w-full text-center">Cancel</button>
          </div>
        </div>
      );
    }
    const measure = MEASURES[editStep - 1];
    const question = questions?.[measure.key] || `How did your ${measure.label.toLowerCase()} hold up today?`;
    return (
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-border flex items-center gap-2">
          <Moon className="w-4 h-4 text-indigo-400" />
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Edit evening check-in</p>
          <span className="ml-auto text-xs text-muted-foreground">{editStep}/5</span>
        </div>
        <div className="h-1 bg-muted"><div className="h-1 bg-indigo-500 transition-all" style={{ width: `${(editStep/5)*100}%` }} /></div>
        <AnimatePresence mode="wait">
          <motion.div key={editStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="px-4 py-5 space-y-4">
            <div className="flex items-center gap-2"><span className="text-xl">{measure.emoji}</span><p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">{measure.label} · {measure.desc}</p></div>
            <p className="text-sm font-medium text-foreground leading-snug">{question}</p>
            <ScorePicker value={scores[measure.key]} onChange={(v) => setScores(s => ({ ...s, [measure.key]: v }))} />
            <textarea value={notes[measure.key]} onChange={(e) => setNotes(n => ({ ...n, [measure.key]: e.target.value }))} placeholder="Add a note (optional)" rows={2} className="w-full text-sm bg-muted/40 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30 placeholder:text-muted-foreground/60" />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => { setEditMode(false); setExpanded(false); }}>Cancel</Button>
              <Button onClick={() => editStep < 5 ? setEditStep(s => s+1) : setEditStep(6)} disabled={saving} className="flex-1 bg-[#0202ff] hover:bg-[#0101dd] text-sm">
                {editStep < 5 ? <><span>Next</span><ChevronRight className="w-3.5 h-3.5" /></> : "Edit Big 3 →"}
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // Big 3 planning step
  if (step === 6) {
    // Success confirmation state
    if (savedBig3 !== null) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-2xl border border-indigo-200/60 shadow-sm overflow-hidden"
        >
          <div className="px-4 py-6 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-indigo-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Evening check-in saved!</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {savedBig3.length > 0 ? `${savedBig3.length} priorit${savedBig3.length === 1 ? 'y' : 'ies'} set for tomorrow` : "Check-in complete"}
              </p>
            </div>
            {savedBig3.length > 0 && (
              <div className="w-full text-left space-y-1.5 pt-1">
                {savedBig3.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#0202ff] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <p className="text-xs text-foreground">{p.title}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      );
    }

    return (
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-border flex items-center gap-2">
          <Moon className="w-4 h-4 text-indigo-400" />
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Plan Tomorrow Today</p>
        </div>
        <div className="px-4 py-5">
          <Big3Step goals={goals} onSave={handleBig3Save} />
        </div>
      </div>
    );
  }

  const measure = MEASURES[step - 1];
  const question = questions?.[measure.key] || `How did your ${measure.label.toLowerCase()} hold up today?`;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-border flex items-center gap-2">
        <Moon className="w-4 h-4 text-indigo-400" />
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Evening check-in</p>
        <span className="ml-auto text-xs text-muted-foreground">{step}/5</span>
      </div>

      <div className="h-1 bg-muted">
        <div className="h-1 bg-indigo-500 transition-all duration-300" style={{ width: `${(step / 5) * 100}%` }} />
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
          <div className="flex items-center gap-2">
            <span className="text-xl">{measure.emoji}</span>
            <div>
              <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">{measure.label} · {measure.desc}</p>
            </div>
          </div>

          <p className="text-sm font-medium text-foreground leading-snug">{question}</p>

          <ScorePicker
            value={scores[measure.key]}
            onChange={(v) => setScores(s => ({ ...s, [measure.key]: v }))}
          />

          <textarea
            value={notes[measure.key]}
            onChange={(e) => setNotes(n => ({ ...n, [measure.key]: e.target.value }))}
            placeholder="Add a note (optional)"
            rows={2}
            className="w-full text-sm bg-muted/40 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30 placeholder:text-muted-foreground/60"
          />

          <Button onClick={handleMeasureNext} className="w-full bg-[#0202ff] hover:bg-[#0101dd] flex items-center gap-1.5">
            {step < 5 ? <><span>Next</span><ChevronRight className="w-3.5 h-3.5" /></> : "Plan tomorrow →"}
          </Button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}