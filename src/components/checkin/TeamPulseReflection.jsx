/**
 * TeamPulseReflection — Active team reflection ritual.
 *
 * The doc specifies "Team Pulse Reflection" as a Core Module where managers
 * actively reflect on their team's state — not just a passive chart.
 * "How is your team doing this week? Who needs support?"
 *
 * Saves response as a ManagerPulse with source='web' and prompt_type='contextual'
 * so it becomes part of the behavioral telemetry for Atreus.
 */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Users, CheckCircle2, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";

const TEAM_OPTIONS = [
  { label: "Strong — everyone seems engaged", value: "strong" },
  { label: "Mostly okay, one person I'm watching", value: "mostly_okay" },
  { label: "Mixed — a few things need attention", value: "mixed" },
  { label: "Struggling — team feels heavy right now", value: "struggling" },
];

const SUPPORT_NEEDED = [
  { label: "A 1:1 I've been putting off", value: "1on1_needed" },
  { label: "Someone who seems overloaded", value: "someone_overloaded" },
  { label: "A conflict I haven't addressed yet", value: "unresolved_conflict" },
  { label: "Recognition I haven't given", value: "recognition_gap" },
  { label: "Nothing obvious right now", value: "none" },
];

export default function TeamPulseReflection({ onComplete }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1); // 1=team state, 2=who needs support
  const [teamState, setTeamState] = useState(null);
  const [supportNeeded, setSupportNeeded] = useState(null);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const storageKey = `cl_team_pulse_${new Date().toISOString().split('T')[0]}`;

  const handleTeamState = (val) => {
    setTeamState(val);
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!supportNeeded || saving) return;
    setSaving(true);
    await base44.entities.ManagerPulse.create({
      user_email: user.email,
      source: "web",
      prompt_type: "contextual",
      description: `Team pulse: team_state=${teamState}, support_needed=${supportNeeded}${note ? `, note=${note}` : ''}`,
    });
    sessionStorage.setItem(storageKey, '1');
    setSaving(false);
    setDone(true);
    setTimeout(() => { if (onComplete) onComplete(); }, 1500);
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4"
      >
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>Team reflection saved — Atreus has it.</span>
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
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center flex-shrink-0">
          <Users className="w-3.5 h-3.5 text-teal-500" />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Team pulse</p>
          <p className="text-sm font-semibold text-gray-900">
            {step === 1 ? "How's your team doing this week?" : "Who needs your attention?"}
          </p>
        </div>
      </div>

      <div className="px-4 pb-4 space-y-3">
        <p className="text-sm text-gray-600 leading-relaxed">
          {step === 1
            ? "Not performance — just how they seem to you right now. Your gut read matters."
            : "Is there someone on your team who'd benefit from some support this week?"}
        </p>

        {/* Step 1 — Team state */}
        {step === 1 && (
          <div className="grid grid-cols-1 gap-2">
            {TEAM_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleTeamState(opt.value)}
                className="text-left text-sm px-3 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:border-teal-300 hover:bg-teal-50 transition-all font-medium leading-snug"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Step 2 — Who needs support */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
              {SUPPORT_NEEDED.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSupportNeeded(opt.value)}
                  className={`text-left text-sm px-3 py-2.5 rounded-xl border transition-all font-medium leading-snug
                    ${supportNeeded === opt.value
                      ? 'border-teal-400 bg-teal-50 text-teal-800'
                      : 'border-gray-200 text-gray-700 hover:border-teal-300 hover:bg-teal-50'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {supportNeeded && supportNeeded !== 'none' && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowNote(!showNote)}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showNote ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showNote ? "Never mind" : "Add context (optional)"}
                </button>
                {showNote && (
                  <Textarea
                    placeholder="What's going on? You don't have to be precise..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="text-sm resize-none h-16 rounded-xl border-gray-200"
                  />
                )}
              </div>
            )}

            {supportNeeded && (
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={saving}
                className="w-full text-xs h-8 bg-gray-900 hover:bg-gray-800 text-white rounded-xl"
              >
                {saving ? "Saving…" : "Done"}
              </Button>
            )}
          </div>
        )}

        {/* Why this */}
        <button
          onClick={() => setShowWhy(!showWhy)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <HelpCircle className="w-3 h-3" />
          Why does this matter?
        </button>
        {showWhy && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2.5 leading-relaxed border border-gray-100"
          >
            How you perceive your team's state affects how you lead. Atreus uses this alongside your own check-ins to understand what's asking for your attention — and whether your bandwidth matches that need.
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}