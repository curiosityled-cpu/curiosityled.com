/**
 * CheckInSettings — the "Atreus Settings" panel for personal check-in preferences.
 * Covers: tone, proactivity, and privacy.
 *
 * Check-in preset, cadence, Do Not Disturb, and check-in windows are controlled
 * at the organization level (Settings > Organization > Check-In Rhythm).
 */
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  Shield,
  MessageSquare,
  Pencil,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import ToneOnboarding from "./ToneOnboarding";

const TONE_LABELS = {
  gentle_observant: "Gentle and observant",
  warm_candid: "Warm but candid",
  close_friend_candid: "Close-friend candid",
  respectfully_confronting: "Respectfully confronting",
};

const PROACTIVITY_OPTIONS = [
  {
    value: "reactive",
    label: "Reactive",
    sub: "Atreus only responds when you reach out",
  },
  {
    value: "suggestive",
    label: "Suggestive",
    sub: "Occasionally surfaces patterns or nudges",
  },
  {
    value: "proactive",
    label: "Proactive",
    sub: "Atreus actively checks in, flags risks, and prompts reflection",
    recommended: true,
  },
];

export default function CheckInSettings() {
  const { user } = useAuth();
  const [tonePref, setTonePref] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingTone, setEditingTone] = useState(false);
  const [openSection, setOpenSection] = useState(null);

  const toggleSection = (key) =>
    setOpenSection((prev) => (prev === key ? null : key));

  useEffect(() => {
    if (!user?.email) return;
    base44.entities.TonePreference.filter({ user_email: user.email }, null, 1)
      .then((rows) => {
        const row = rows[0] || {
          tone_mode: "warm_candid",
          cadence_preference: "daily",
        };
        setTonePref(row);
      })
      .catch(() => {
        setTonePref({ tone_mode: "warm_candid", cadence_preference: "daily" });
      })
      .finally(() => setLoading(false));
  }, [user?.email]);

  const saveField = async (fields) => {
    const updated = { ...tonePref, ...fields };
    if (tonePref?.id) {
      await base44.entities.TonePreference.update(tonePref.id, fields);
    } else {
      const created = await base44.entities.TonePreference.create({
        user_email: user.email,
        tone_mode: "warm_candid",
        cadence_preference: "daily",
        ...fields,
      });
      updated.id = created.id;
    }
    setTonePref(updated);
  };

  const handleToneComplete = (newTone) => {
    setTonePref((prev) => ({ ...prev, tone_mode: newTone }));
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
            <button
              onClick={() => setEditingTone(true)}
              className="flex items-center gap-1 text-xs text-[#0202ff] hover:underline"
            >
              <Pencil className="w-3 h-3" /> Change
            </button>
          )}
        </div>
        <div className="px-5 pb-5">
          {editingTone ? (
            <ToneOnboarding
              existingTone={tonePref?.tone_mode}
              onComplete={handleToneComplete}
              onCancel={() => setEditingTone(false)}
            />
          ) : (
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-semibold text-gray-800">
                  {TONE_LABELS[tonePref?.tone_mode] || "Warm but candid"}
                </p>
                {(tonePref?.tone_mode === "warm_candid" ||
                  !tonePref?.tone_mode) && (
                  <span className="text-[10px] font-medium bg-[#0202ff] text-white px-1.5 py-0.5 rounded-full">
                    Recommended
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {tonePref?.tone_mode === "gentle_observant" &&
                  "Atreus will mostly observe and ask questions, rarely push."}
                {tonePref?.tone_mode === "warm_candid" &&
                  "Supportive, but will point out patterns when it sees them."}
                {tonePref?.tone_mode === "close_friend_candid" &&
                  "Atreus talks like a trusted peer who tells you what they really think."}
                {tonePref?.tone_mode === "respectfully_confronting" &&
                  "Atreus will challenge you directly when you keep getting stuck."}
                {!tonePref?.tone_mode &&
                  "Supportive, but will point out patterns when it sees them."}
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
            const isSelected =
              (tonePref?.proactivity_level || "proactive") === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => saveField({ proactivity_level: opt.value })}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                  isSelected
                    ? "border-[#0202ff] bg-[#0202ff]/5"
                    : "border-gray-200 hover:border-gray-300 bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      isSelected
                        ? "border-[#0202ff] bg-[#0202ff]"
                        : "border-gray-300"
                    }`}
                  >
                    {isSelected && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p
                        className={`text-sm font-medium ${
                          isSelected ? "text-[#0202ff]" : "text-gray-800"
                        }`}
                      >
                        {opt.label}
                      </p>
                      {opt.recommended && (
                        <span className="text-[10px] font-medium bg-[#0202ff] text-white px-1.5 py-0.5 rounded-full">
                          Recommended
                        </span>
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

      {/* Privacy */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-2 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500" />
          <p className="text-sm font-semibold text-gray-900">
            What Atreus uses & what stays private
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          {/* What Atreus uses */}
          <button
            onClick={() => toggleSection("uses")}
            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50 transition-colors"
          >
            <p className="text-xs font-semibold text-gray-700">
              What Atreus uses
            </p>
            {openSection === "uses" ? (
              <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            )}
          </button>
          {openSection === "uses" && (
            <div className="px-5 py-3 space-y-3">
              <ul className="space-y-1.5">
                {[
                  "What you tell it in quick check-ins",
                  "Your goals and learning activity in Curiosity Led",
                  "Themes from past Atreus conversations",
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-gray-600"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-600 mb-1.5">
                  From your calendar (if connected):
                </p>
                <ul className="space-y-1">
                  {[
                    "Meeting titles and subject lines",
                    "Start and end times",
                    "Number of attendees (not who they are)",
                    "Whether a meeting is recurring",
                    "Whether a meeting was accepted, tentative, or cancelled",
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-xs text-gray-500"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="text-xs font-semibold text-gray-500 mt-2 mb-1">
                  Never from your calendar:
                </p>
                <ul className="space-y-1">
                  {[
                    "Meeting notes or agenda content",
                    "Email messages of any kind",
                    "Who specifically is in your meetings",
                    "Any content outside your calendar",
                    "Attachments or linked files",
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-xs text-gray-400"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* What stays private */}
          <button
            onClick={() => toggleSection("private")}
            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50 transition-colors"
          >
            <p className="text-xs font-semibold text-gray-700">
              What stays private
            </p>
            {openSection === "private" ? (
              <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            )}
          </button>
          {openSection === "private" && (
            <div className="px-5 py-3">
              <p className="text-xs text-gray-500 leading-relaxed">
                Your check-ins, reflections, and conversations with Atreus are
                private to you. They are not shared with HR or your manager and
                are not used in performance reviews.
              </p>
            </div>
          )}

          {/* What HR sees */}
          <button
            onClick={() => toggleSection("hr")}
            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50 transition-colors"
          >
            <p className="text-xs font-semibold text-gray-700">What HR sees</p>
            {openSection === "hr" ? (
              <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            )}
          </button>
          {openSection === "hr" && (
            <div className="px-5 py-3">
              <p className="text-xs text-gray-500 leading-relaxed">
                HR can only see aggregated, anonymous patterns across groups —
                for example, "managers in this unit report high load
                frequently" — and standard development data like program
                participation and Leadership Index results. Not your private
                conversations or check-ins.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}