/**
 * CheckInSettings — the "Atreus Settings" panel for check-in preferences.
 * Covers: tone, cadence, and privacy explanation.
 * Designed to be embedded in the Settings page or a Teams tab.
 */
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Shield, Clock, MessageSquare, Pencil, Eye } from "lucide-react";
import VisibilityShareFlags from "@/components/privacy/VisibilityShareFlags";
import { Button } from "@/components/ui/button";
import ToneOnboarding from "./ToneOnboarding";

const TONE_LABELS = {
  gentle_observant: "Gentle and observant",
  warm_candid: "Warm but candid",
  close_friend_candid: "Close-friend candid",
  respectfully_confronting: "Respectfully confronting"
};

const CADENCE_OPTIONS = [
  { value: "daily", label: "Daily", sub: "Check in every day to stay close to your patterns" },
  { value: "every_other_day", label: "Every other day", sub: "Recommended — a light rhythm without feeling constant" },
  { value: "important_only", label: "Only when it really matters", sub: "Contextual only — when patterns or load signals are significant" },
  { value: "paused", label: "Pause for now", sub: "No check-ins until I turn this back on" }
];

export default function CheckInSettings() {
  const { user } = useAuth();
  const [tonePref, setTonePref] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingTone, setEditingTone] = useState(false);
  const [savingCadence, setSavingCadence] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    base44.entities.TonePreference.filter({ user_email: user.email }, null, 1)
      .then(rows => {
        setTonePref(rows[0] || { tone_mode: 'warm_candid', cadence_preference: 'daily' });
      })
      .catch(() => {
        setTonePref({ tone_mode: 'warm_candid', cadence_preference: 'daily' });
      })
      .finally(() => setLoading(false));
  }, [user?.email]);

  const handleCadenceChange = async (value) => {
    setSavingCadence(true);
    const updated = { ...tonePref, cadence_preference: value };
    if (tonePref?.id) {
      await base44.entities.TonePreference.update(tonePref.id, { cadence_preference: value });
    } else {
      const created = await base44.entities.TonePreference.create({
        user_email: user.email,
        tone_mode: 'warm_candid',
        cadence_preference: value
      });
      updated.id = created.id;
    }
    setTonePref(updated);
    setSavingCadence(false);
  };

  const handleToneComplete = (newTone) => {
    setTonePref(prev => ({ ...prev, tone_mode: newTone }));
    setEditingTone(false);
  };

  if (loading) return <div className="h-32 rounded-2xl bg-gray-100 animate-pulse" />;

  return (
    <div className="space-y-4">

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
            <ToneOnboarding existingTone={tonePref?.tone_mode} onComplete={handleToneComplete} />
          ) : (
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-gray-800">{TONE_LABELS[tonePref?.tone_mode] || 'Warm but candid'}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {tonePref?.tone_mode === 'gentle_observant' && "Atreus will mostly observe and ask questions, rarely push."}
                {tonePref?.tone_mode === 'warm_candid' && "Supportive, but will point out patterns when it sees them."}
                {tonePref?.tone_mode === 'close_friend_candid' && "Atreus talks like a trusted peer who tells you what they really think."}
                {tonePref?.tone_mode === 'respectfully_confronting' && "Atreus will challenge you directly when you keep getting stuck."}
                {!tonePref?.tone_mode && "Supportive, but will point out patterns when it sees them."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Cadence */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-2 flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-500" />
          <p className="text-sm font-semibold text-gray-900">Check-in cadence</p>
        </div>
        <div className="px-5 pb-5 space-y-2">
          {CADENCE_OPTIONS.map((opt) => {
            const isSelected = tonePref?.cadence_preference === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => handleCadenceChange(opt.value)}
                disabled={savingCadence}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                  isSelected ? 'border-[#0202ff] bg-[#0202ff]/5' : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? 'border-[#0202ff] bg-[#0202ff]' : 'border-gray-300'}`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isSelected ? 'text-[#0202ff]' : 'text-gray-800'}`}>{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.sub}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Privacy */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-2 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500" />
          <p className="text-sm font-semibold text-gray-900">What Atreus uses & what stays private</p>
        </div>
        <div className="px-5 pb-5 space-y-4">

          <div>
            <p className="text-xs font-semibold text-gray-700 mb-1.5">What Atreus uses</p>
            <ul className="space-y-1.5">
              {[
                "What you tell it in quick check-ins",
                "Outlook & Google Calendar — how packed your days are",
                "Your goals and learning activity in Curiosity Led",
                "Themes from past Atreus conversations"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-700 mb-1.5">What stays private</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Your check-ins, reflections, and conversations with Atreus are private to you.
              They are not shared with HR or your manager and are not used in performance reviews.
            </p>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-700 mb-1.5">What HR sees</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              HR can only see aggregated, anonymous patterns across groups — for example, "managers in this unit report high load frequently" — and standard development data like program participation and Leadership Index results.
              Not your private conversations or check-ins.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}