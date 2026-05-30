/**
 * PostConversationDebrief — in-product surface for the post-event/post-meeting ritual.
 * Mirrors the backend triggerPostMeetingDebrief automation but allows proactive logging.
 * Stored as ManagerPulse with prompt_type: 'follow_up'
 */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { CheckCircle2, X, HelpCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";

const CONVERSATION_TYPES = [
  { label: "Performance conversation", value: "performance" },
  { label: "1:1 with a team member", value: "one_on_one" },
  { label: "Hard or tense discussion", value: "conflict" },
  { label: "Stakeholder meeting", value: "stakeholder" },
  { label: "Feedback I gave or received", value: "feedback" },
];

const ENERGY_AFTER = [
  { label: "Energised", value: "strong" },
  { label: "Neutral", value: "steady" },
  { label: "Drained", value: "drained" },
];

const WENT_WELL = [
  { label: "Yes, mostly", value: "yes" },
  { label: "Mixed", value: "mixed" },
  { label: "Not really", value: "no" },
];

export default function PostConversationDebrief({ onComplete, onDismiss }) {
  const { user } = useAuth();
  const [convType, setConvType] = useState(null);
  const [wentWell, setWentWell] = useState(null);
  const [energyAfter, setEnergyAfter] = useState(null);
  const [reflection, setReflection] = useState("");
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  const handleSave = async () => {
    if (saving || done) return;
    setSaving(true);
    const label = CONVERSATION_TYPES.find(c => c.value === convType)?.label || convType;
    await base44.entities.ManagerPulse.create({
      user_email: user.email,
      source: "web",
      prompt_type: "follow_up",
      energy_level: energyAfter || "steady",
      avoidance_flag: wentWell === "no" ? "yes" : "no",
      biggest_weight_today: `[Debrief: ${label}] ${reflection.trim() || `Went ${wentWell || 'okay'}`}`,
    });
    setSaving(false);
    setDone(true);
    setTimeout(() => { if (onComplete) onComplete(); }, 1800);
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 flex items-center gap-3"
      >
        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-gray-900">Captured.</p>
          <p className="text-xs text-gray-500 mt-0.5">Atreus will use this to understand how these conversations feel over time.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
    >
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Post-conversation</p>
            <p className="text-sm font-semibold text-gray-900 leading-snug">How did that go?</p>
          </div>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-gray-300 hover:text-gray-500">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="px-4 pb-4 space-y-3">

        {step === 0 && (
          <>
            <p className="text-sm text-gray-600 leading-relaxed">What kind of conversation was it?</p>
            <div className="space-y-2">
              {CONVERSATION_TYPES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => { setConvType(c.value); setStep(1); }}
                  className="w-full text-left text-sm px-3 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50/50 transition-all font-medium"
                >
                  {c.label}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-sm text-gray-600">Did it go the way you hoped?</p>
            <div className="grid grid-cols-3 gap-2">
              {WENT_WELL.map((w) => (
                <button
                  key={w.value}
                  onClick={() => setWentWell(w.value)}
                  className={`text-sm px-2 py-2.5 rounded-xl border font-medium transition-all ${
                    wentWell === w.value
                      ? "border-purple-400 bg-purple-50 text-purple-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>

            <p className="text-sm text-gray-600 pt-1">How do you feel right after?</p>
            <div className="grid grid-cols-3 gap-2">
              {ENERGY_AFTER.map((e) => (
                <button
                  key={e.value}
                  onClick={() => setEnergyAfter(e.value)}
                  className={`text-sm px-2 py-2.5 rounded-xl border font-medium transition-all ${
                    energyAfter === e.value
                      ? "border-purple-400 bg-purple-50 text-purple-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>

            <Textarea
              placeholder="Anything worth capturing? One sentence is enough."
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              className="text-sm resize-none h-16 rounded-xl border-gray-200 focus:border-purple-300"
            />

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!wentWell || !energyAfter || saving}
                className="flex-1 text-xs h-8 bg-gray-900 hover:bg-gray-800 text-white rounded-xl"
              >
                {saving ? "Saving…" : "Log debrief"}
              </Button>
              <button
                onClick={() => setStep(0)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2"
              >
                ← Back
              </button>
            </div>
          </>
        )}

        <button
          onClick={() => setShowWhy(!showWhy)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <HelpCircle className="w-3 h-3" />
          Why debrief?
        </button>
        {showWhy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2.5 leading-relaxed border border-gray-100"
          >
            Difficult conversations are where leadership patterns are most visible. Noticing how they feel — before, during, after — helps Atreus understand your tendencies, not just your calendar.
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}