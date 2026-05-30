/**
 * PreConversationPrep — "Before a difficult conversation" ritual.
 *
 * The doc explicitly calls out this as a key context-triggered intervention:
 * "before difficult conversations" as a core check-in type.
 * Connects to the existing triggerPreMeetingPrompt backend function.
 *
 * Saves as a ManagerPulse, also triggers the backend debrief linkage.
 */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { MessageCircle, CheckCircle2, ChevronDown, ChevronUp, HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";

const CONVO_TYPES = [
  { label: "Performance or feedback conversation", value: "feedback" },
  { label: "Conflict or difficult dynamic", value: "conflict" },
  { label: "Delivering bad news", value: "bad_news" },
  { label: "Stakeholder or upward conversation", value: "stakeholder" },
  { label: "Setting a new expectation", value: "expectation_setting" },
];

const READINESS_OPTIONS = [
  { label: "I feel prepared", value: "prepared" },
  { label: "A bit anxious but ready", value: "anxious_ready" },
  { label: "Not sure how it'll go", value: "uncertain" },
  { label: "Dreading it, honestly", value: "dreading" },
];

export default function PreConversationPrep({ onComplete, onDismiss }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [convoType, setConvoType] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [intention, setIntention] = useState("");
  const [showIntention, setShowIntention] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [followUp, setFollowUp] = useState(null);

  const FOLLOWUPS = {
    prepared: "You're ready. Keep that grounded feeling when the conversation gets hard — it will.",
    anxious_ready: "That mix of nerves and readiness often means you care about getting it right. That's actually useful.",
    uncertain: "That's an honest place to be. What's one thing you want to make sure you say, regardless of how it goes?",
    dreading: "That's worth paying attention to. What's the thing underneath the dread — is it the outcome, the dynamic, or something about you in it?",
  };

  const handleConvoType = (val) => {
    setConvoType(val);
    setStep(2);
  };

  const handleReadiness = (val) => {
    setReadiness(val);
    setFollowUp(FOLLOWUPS[val] || null);
  };

  const handleSubmit = async () => {
    if (!readiness || saving) return;
    setSaving(true);
    await base44.entities.ManagerPulse.create({
      user_email: user.email,
      source: "web",
      prompt_type: "contextual",
      description: `Pre-conversation prep: type=${convoType}, readiness=${readiness}${intention ? `, intention=${intention}` : ''}`,
      confidence_today: readiness === 'prepared' ? 'steady' : readiness === 'anxious_ready' ? 'uncertain' : 'low',
    });
    setSaving(false);
    setDone(true);
    setTimeout(() => { if (onComplete) onComplete(); }, 2000);
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 space-y-3"
      >
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>Good luck with it. Atreus will check in with you afterwards.</span>
        </div>
        {followUp && (
          <div className="bg-[#0202ff]/5 border border-[#0202ff]/15 rounded-xl px-3 py-3">
            <p className="text-sm text-gray-800 leading-relaxed">{followUp}</p>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pre-conversation prep</p>
            <p className="text-sm font-semibold text-gray-900">
              {step === 1 ? "What kind of conversation is this?" : "How are you walking into it?"}
            </p>
          </div>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-gray-300 hover:text-gray-500 mt-0.5">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="px-4 pb-4 space-y-3">
        <p className="text-sm text-gray-600 leading-relaxed">
          {step === 1
            ? "Naming what it is often makes it feel less abstract."
            : "Not how you want to come across — how you actually feel right now."}
        </p>

        {/* Step 1 — conversation type */}
        {step === 1 && (
          <div className="grid grid-cols-1 gap-2">
            {CONVO_TYPES.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleConvoType(opt.value)}
                className="text-left text-sm px-3 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 transition-all font-medium leading-snug"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Step 2 — readiness + intention */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {READINESS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleReadiness(opt.value)}
                  className={`text-left text-sm px-3 py-2.5 rounded-xl border transition-all font-medium leading-snug
                    ${readiness === opt.value
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-800'
                      : 'border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {readiness && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowIntention(!showIntention)}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showIntention ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showIntention ? "Never mind" : "What do you want to make sure happens? (optional)"}
                </button>
                {showIntention && (
                  <Textarea
                    placeholder="One thing I want to be sure I say or do..."
                    value={intention}
                    onChange={(e) => setIntention(e.target.value)}
                    className="text-sm resize-none h-16 rounded-xl border-gray-200"
                  />
                )}
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="w-full text-xs h-8 bg-gray-900 hover:bg-gray-800 text-white rounded-xl"
                >
                  {saving ? "Saving…" : "I'm ready"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Why this */}
        <button
          onClick={() => setShowWhy(!showWhy)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <HelpCircle className="w-3 h-3" />
          Why does this help?
        </button>
        {showWhy && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2.5 leading-relaxed border border-gray-100"
          >
            Leaders who pause and name what they're walking into handle difficult conversations significantly better than those who just push through. This also lets Atreus follow up with you afterwards — closing the loop between what you intended and what actually happened.
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}