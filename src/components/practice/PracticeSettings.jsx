/**
 * PracticeSettings — settings panel for the Practice studio (/practice).
 *
 * Differs from the Lead page's CheckInSettings: omits check-in preset,
 * cadence, and check-in windows (those belong to the daily rhythm, not the
 * practice studio), and adds Workout settings that drive the pattern-driven
 * workout engine.
 */
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  Shield, Clock, MessageSquare, Pencil, ChevronDown, ChevronUp, Zap, BellOff,
  Dumbbell, RefreshCw, Layers3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import ToneOnboarding from "@/components/checkin/ToneOnboarding";

const TONE_LABELS = {
  gentle_observant: "Gentle and observant",
  warm_candid: "Warm but candid",
  close_friend_candid: "Close-friend candid",
  respectfully_confronting: "Respectfully confronting",
};

const PROACTIVITY_OPTIONS = [
  { value: "reactive", label: "Reactive", sub: "Atreus only responds when you reach out" },
  { value: "suggestive", label: "Suggestive", sub: "Occasionally surfaces patterns or nudges" },
  { value: "proactive", label: "Proactive", sub: "Atreus actively checks in, flags risks, and prompts reflection", recommended: true },
];

const DND_DAYS = [
  { value: "mon", label: "M" }, { value: "tue", label: "T" }, { value: "wed", label: "W" },
  { value: "thu", label: "T" }, { value: "fri", label: "F" }, { value: "sat", label: "S" }, { value: "sun", label: "S" },
];

const REFRESH_OPTIONS = [
  { value: "nightly", label: "Nightly", sub: "Fresh workouts generated every night from your latest patterns" },
  { value: "twice_weekly", label: "Twice weekly", sub: "New workouts on Monday & Thursday" },
  { value: "weekly", label: "Weekly", sub: "One new workout each Monday" },
  { value: "manual", label: "Manual only", sub: "Don't auto-generate — I'll start workouts myself" },
];

const EXPIRY_OPTIONS = [
  { value: 3, label: "3 days" },
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
];

const TYPE_OPTIONS = [
  { value: "both", label: "Both", sub: "Mix skill-building and real-task workouts", recommended: true },
  { value: "skill", label: "Skill-building", sub: "Drills that build a competency" },
  { value: "task", label: "Real tasks", sub: "Work through an actual situation you're facing" },
];

const DEFAULT_WORKOUT_PREFS = {
  refresh_frequency: "nightly",
  max_active_workouts: 3,
  unstarted_expiry_days: 7,
  preferred_workout_type: "both",
};

export default function PracticeSettings() {
  const { user } = useAuth();
  const [tonePref, setTonePref] = useState(null);
  const [workoutPrefs, setWorkoutPrefs] = useState(DEFAULT_WORKOUT_PREFS);
  const [prefId, setPrefId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingTone, setEditingTone] = useState(false);
  const [openSection, setOpenSection] = useState(null);
  const [dndEnabled, setDndEnabled] = useState(false);
  const [dndDays, setDndDays] = useState([]);
  const [dndStart, setDndStart] = useState("18:00");
  const [dndEnd, setDndEnd] = useState("09:00");

  const toggleSection = (key) => setOpenSection((prev) => (prev === key ? null : key));

  useEffect(() => {
    if (!user?.email) return;
    let active = true;
    (async () => {
      try {
        const [toneRows, prefRows] = await Promise.all([
          base44.entities.TonePreference.filter({ user_email: user.email }, null, 1),
          base44.entities.UserPreference.filter({ user_email: user.email }, null, 1),
        ]);
        if (!active) return;
        const tone = toneRows[0] || { tone_mode: "warm_candid" };
        setTonePref(tone);
        if (tone.dnd_enabled !== undefined) setDndEnabled(tone.dnd_enabled);
        if (tone.dnd_days) setDndDays(tone.dnd_days);
        if (tone.dnd_start) setDndStart(tone.dnd_start);
        if (tone.dnd_end) setDndEnd(tone.dnd_end);
        const pref = prefRows[0];
        if (pref) {
          setPrefId(pref.id);
          if (pref.workout_preferences) {
            setWorkoutPrefs({ ...DEFAULT_WORKOUT_PREFS, ...pref.workout_preferences });
          }
        }
      } catch {
        if (active) setTonePref({ tone_mode: "warm_candid" });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user?.email]);

  const saveToneField = async (fields) => {
    const updated = { ...tonePref, ...fields };
    if (tonePref?.id) {
      await base44.entities.TonePreference.update(tonePref.id, fields);
    } else {
      const created = await base44.entities.TonePreference.create({ user_email: user.email, tone_mode: "warm_candid", ...fields });
      updated.id = created.id;
    }
    setTonePref(updated);
  };

  const saveWorkoutPrefs = async (patch) => {
    const next = { ...workoutPrefs, ...patch };
    setWorkoutPrefs(next);
    try {
      if (prefId) {
        await base44.entities.UserPreference.update(prefId, { workout_preferences: next });
      } else {
        const created = await base44.entities.UserPreference.create({ user_email: user.email, workout_preferences: next });
        setPrefId(created.id);
      }
    } catch (e) {
      console.warn("Failed to save workout preferences:", e);
    }
  };

  const handleToneComplete = (newTone) => {
    setTonePref((prev) => ({ ...prev, tone_mode: newTone }));
    setEditingTone(false);
  };

  if (loading) return <div className="h-32 rounded-2xl bg-gray-100 animate-pulse" />;

  return (
    <div className="space-y-4">
      {/* Workout settings */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-2 flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-[#0202ff]" />
          <p className="text-sm font-semibold text-gray-900">Workout settings</p>
        </div>
        <div className="px-5 pb-5 space-y-5">

          {/* Refresh frequency */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
              <p className="text-xs font-semibold text-gray-600">Refresh frequency</p>
            </div>
            <div className="space-y-2">
              {REFRESH_OPTIONS.map((opt) => {
                const isSelected = workoutPrefs.refresh_frequency === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => saveWorkoutPrefs({ refresh_frequency: opt.value })}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                      isSelected ? "border-[#0202ff] bg-[#0202ff]/5" : "border-gray-200 hover:border-gray-300 bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? "border-[#0202ff] bg-[#0202ff]" : "border-gray-300"}`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${isSelected ? "text-[#0202ff]" : "text-gray-800"}`}>{opt.label}</p>
                        <p className="text-xs text-gray-500">{opt.sub}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preferred workout type */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Layers3 className="w-3.5 h-3.5 text-gray-500" />
              <p className="text-xs font-semibold text-gray-600">Preferred workout type</p>
            </div>
            <div className="space-y-2">
              {TYPE_OPTIONS.map((opt) => {
                const isSelected = workoutPrefs.preferred_workout_type === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => saveWorkoutPrefs({ preferred_workout_type: opt.value })}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                      isSelected ? "border-[#0202ff] bg-[#0202ff]/5" : "border-gray-200 hover:border-gray-300 bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? "border-[#0202ff] bg-[#0202ff]" : "border-gray-300"}`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className={`text-sm font-medium ${isSelected ? "text-[#0202ff]" : "text-gray-800"}`}>{opt.label}</p>
                          {opt.recommended && (
                            <span className="text-[10px] font-medium bg-[#0202ff] text-white px-1.5 py-0.5 rounded-full">Recommended</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{opt.sub}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Max active workouts */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-gray-600">Max active workouts</p>
              <span className="text-xs font-semibold text-[#0202ff]">{workoutPrefs.max_active_workouts}</span>
            </div>
            <p className="text-xs text-gray-500 mb-2">How many unstarted workouts to keep available at once.</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => saveWorkoutPrefs({ max_active_workouts: n })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    workoutPrefs.max_active_workouts === n
                      ? "bg-[#0202ff] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Unstarted expiry */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1">Expire unstarted workouts after</p>
            <p className="text-xs text-gray-500 mb-2">Workouts you haven't started are auto-removed after this long.</p>
            <div className="flex gap-2">
              {EXPIRY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => saveWorkoutPrefs({ unstarted_expiry_days: opt.value })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    workoutPrefs.unstarted_expiry_days === opt.value
                      ? "bg-[#0202ff] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tone */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#0202ff]" />
            <p className="text-sm font-semibold text-gray-900">Atreus tone</p>
          </div>
          {!editingTone && (
            <button onClick={() => setEditingTone(true)} className="flex items-center gap-1 text-xs text-[#0202ff] hover:underline">
              <Pencil className="w-3 h-3" /> Change
            </button>
          )}
        </div>
        <div className="px-5 pb-5">
          {editingTone ? (
            <ToneOnboarding existingTone={tonePref?.tone_mode} onComplete={handleToneComplete} onCancel={() => setEditingTone(false)} />
          ) : (
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-gray-800">{TONE_LABELS[tonePref?.tone_mode] || "Warm but candid"}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {tonePref?.tone_mode === "gentle_observant" && "Atreus will mostly observe and ask questions, rarely push."}
                {tonePref?.tone_mode === "warm_candid" && "Supportive, but will point out patterns when it sees them."}
                {tonePref?.tone_mode === "close_friend_candid" && "Atreus talks like a trusted peer who tells you what they really think."}
                {tonePref?.tone_mode === "respectfully_confronting" && "Atreus will challenge you directly when you keep getting stuck."}
                {!tonePref?.tone_mode && "Supportive, but will point out patterns when it sees them."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Proactivity */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-2 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <p className="text-sm font-semibold text-gray-900">Proactivity level</p>
        </div>
        <div className="px-5 pb-5 space-y-2">
          {PROACTIVITY_OPTIONS.map((opt) => {
            const isSelected = (tonePref?.proactivity_level || "proactive") === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => saveToneField({ proactivity_level: opt.value })}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                  isSelected ? "border-[#0202ff] bg-[#0202ff]/5" : "border-gray-200 hover:border-gray-300 bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? "border-[#0202ff] bg-[#0202ff]" : "border-gray-300"}`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={`text-sm font-medium ${isSelected ? "text-[#0202ff]" : "text-gray-800"}`}>{opt.label}</p>
                      {opt.recommended && (
                        <span className="text-[10px] font-medium bg-[#0202ff] text-white px-1.5 py-0.5 rounded-full">Recommended</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{opt.sub}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Do Not Disturb */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellOff className="w-4 h-4 text-rose-500" />
            <p className="text-sm font-semibold text-gray-900">Do Not Disturb</p>
          </div>
          <Switch
            checked={dndEnabled}
            onCheckedChange={(v) => { setDndEnabled(v); saveToneField({ dnd_enabled: v }); }}
          />
        </div>
        {dndEnabled && (
          <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Block check-ins on these days</p>
              <div className="flex gap-2">
                {DND_DAYS.map((d) => {
                  const active = dndDays.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      onClick={() => {
                        const next = active ? dndDays.filter((x) => x !== d.value) : [...dndDays, d.value];
                        setDndDays(next);
                        saveToneField({ dnd_days: next });
                      }}
                      className={`w-9 h-9 rounded-full text-xs font-semibold transition-all ${
                        active ? "bg-[#0202ff] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">From</p>
                <input type="time" value={dndStart}
                  onChange={(e) => { setDndStart(e.target.value); saveToneField({ dnd_start: e.target.value }); }}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Until</p>
                <input type="time" value={dndEnd}
                  onChange={(e) => { setDndEnd(e.target.value); saveToneField({ dnd_end: e.target.value }); }}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Privacy */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-2 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500" />
          <p className="text-sm font-semibold text-gray-900">What Atreus uses & what stays private</p>
        </div>
        <div className="divide-y divide-gray-100">
          <button onClick={() => toggleSection("uses")} className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50 transition-colors">
            <p className="text-xs font-semibold text-gray-700">What Atreus uses</p>
            {openSection === "uses" ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
          </button>
          {openSection === "uses" && (
            <div className="px-5 py-3">
              <ul className="space-y-1.5">
                {["What you tell it in quick check-ins", "Your goals and learning activity in Curiosity Led", "Themes from past Atreus conversations"].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button onClick={() => toggleSection("private")} className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50 transition-colors">
            <p className="text-xs font-semibold text-gray-700">What stays private</p>
            {openSection === "private" ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
          </button>
          {openSection === "private" && (
            <div className="px-5 py-3">
              <p className="text-xs text-gray-500 leading-relaxed">
                Your check-ins, reflections, and conversations with Atreus are private to you. They are not shared with HR or your manager and are not used in performance reviews.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}