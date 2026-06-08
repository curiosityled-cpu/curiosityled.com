/**
 * ToneOnboarding — first-time tone selection flow.
 * Shows 4 modes with descriptions and example lines.
 * Saves to TonePreference entity and marks onboarding complete.
 */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const TONE_OPTIONS = [
  {
    value: "gentle_observant",
    label: "Gentle and observant",
    description: "I'll mostly notice things and ask questions. I rarely push.",
    example: "\"I'm noticing your days seem heavy lately — want to unpack that a bit?\"",
    color: "border-sky-200 bg-sky-50",
    activeColor: "border-sky-400 bg-sky-50",
    labelColor: "text-sky-700"
  },
  {
    value: "warm_candid",
    label: "Warm but candid",
    description: "Supportive, but I'll point out patterns when I see them. Default.",
    example: "\"It looks like you're slipping back into doing everything yourself — want to catch it early?\"",
    color: "border-gray-200 bg-gray-50",
    activeColor: "border-[#0202ff] bg-[#0202ff]/5",
    labelColor: "text-[#0202ff]",
    recommended: true
  },
  {
    value: "close_friend_candid",
    label: "Close-friend candid",
    description: "More like a trusted peer who tells you what they really think.",
    example: "\"You know this 'I'll just do it' pattern. We've been here before.\"",
    color: "border-amber-200 bg-amber-50",
    activeColor: "border-amber-400 bg-amber-50",
    labelColor: "text-amber-700"
  },
  {
    value: "respectfully_confronting",
    label: "Respectfully confronting",
    description: "I'll challenge you directly when you keep getting stuck.",
    example: "\"You said you wanted to lead differently, but this week looks exactly the same. Ready to change something, or not yet?\"",
    color: "border-rose-200 bg-rose-50",
    activeColor: "border-rose-400 bg-rose-50",
    labelColor: "text-rose-700"
  }
];

export default function ToneOnboarding({ existingTone, onComplete, onCancel }) {
  const { user } = useAuth();
  const [selected, setSelected] = useState(existingTone || "warm_candid");
  const [acknowledged, setAcknowledged] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const existing = await base44.entities.TonePreference.filter({ user_email: user.email }, null, 1);
      if (existing[0]) {
        await base44.entities.TonePreference.update(existing[0].id, {
          tone_mode: selected,
          user_understanding_ack: true,
          teams_onboarding_complete: true
        });
      } else {
        await base44.entities.TonePreference.create({
          user_email: user.email,
          tone_mode: selected,
          cadence_preference: "every_other_day",
          user_understanding_ack: true,
          teams_onboarding_complete: true
        });
      }
      if (onComplete) onComplete(selected);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-gray-900 mb-1">How do you want Atreus to talk to you?</p>
        <p className="text-xs text-gray-500 leading-relaxed">
          I usually talk like a supportive colleague who's honest but on your side.
          You can keep that, ask me to be softer, or ask me to be more direct.
        </p>
      </div>

      <div className="space-y-2">
        {TONE_OPTIONS.map((opt) => {
          const isSelected = selected === opt.value;
          return (
            <motion.button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              whileTap={{ scale: 0.99 }}
              className={`w-full text-left p-3.5 rounded-xl border-2 transition-all ${isSelected ? opt.activeColor : opt.color + ' border-transparent'}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 flex items-center justify-center transition-all ${isSelected ? 'border-current bg-current' : 'border-gray-300'}`}>
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-sm font-semibold ${isSelected ? opt.labelColor : 'text-gray-800'}`}>
                      {opt.label}
                    </span>
                    {opt.recommended && (
                       <span className="text-[10px] font-medium bg-[#0202ff] text-white px-1.5 py-0.5 rounded-full">
                         Recommended
                       </span>
                     )}
                  </div>
                  <p className="text-xs text-gray-500 mb-1.5">{opt.description}</p>
                  <p className="text-xs text-gray-600 italic leading-snug">{opt.example}</p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Acknowledgement */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <div
          onClick={() => setAcknowledged(!acknowledged)}
          className={`w-4 h-4 rounded border-2 mt-0.5 flex-shrink-0 flex items-center justify-center transition-all ${acknowledged ? 'border-[#0202ff] bg-[#0202ff]' : 'border-gray-300 group-hover:border-gray-400'}`}
        >
          {acknowledged && <CheckCircle2 className="w-3 h-3 text-white" />}
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          I understand this will shape how direct Atreus is with me, and I can change it any time in Settings.
        </p>
      </label>

      <Button
        onClick={handleSave}
        disabled={!acknowledged || saving}
        className="w-full bg-[#0202ff] hover:bg-[#0101dd] text-white text-sm h-10"
      >
        {saving ? "Saving…" : "Save my choice"}
        {!saving && <ArrowRight className="w-4 h-4 ml-2" />}
      </Button>
      {onCancel && (
        <button
          onClick={onCancel}
          className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
  );
}