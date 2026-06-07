/**
 * TodaysRead — The "Today's Read" hero card shown after check-in is complete.
 * A real synthesized situational summary, not just a confirmation chip.
 * Brief spec: "Today's check-in or Today's Read" toggle based on done state.
 */
import React, { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, Brain } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { useAtreusChat } from "@/components/ai/AtreusContext";

function getSynthesis(selectedValue, promptType, trends, goals, pulses) {
  // Build a situational read from what we know
  const activeGoals = goals.filter(g => g.status === 'active');
  const overloaded = trends?.overload_pattern_strength > 40 || selectedValue === 'none' || selectedValue === 'tight' || selectedValue === 'very_much';
  const energyLow = selectedValue === 'drained' || selectedValue === 'flat' || selectedValue === 'low';
  const focused = promptType === 'morning_intent';
  const avoidance = selectedValue === 'yes' || selectedValue === 'not_sure';
  const confident = selectedValue === 'high' || selectedValue === 'solid';

  // Headline
  let headline = "You've checked in. Here's the read.";
  let body = "The day is in front of you. What matters now is clear.";
  let signal = null;

  if (focused) {
    headline = "Intent set. The day has a shape.";
    body = "You've declared what matters. The best use of this moment is protecting that intention as the calendar fills.";
  } else if (overloaded) {
    headline = "Load is high. Watch for the pull-back.";
    body = "When this feeling builds, the typical pattern is to grab more yourself rather than pass it out. One move: name one thing you can put down today.";
    signal = "High load detected";
  } else if (energyLow) {
    headline = "Low energy day. Protect the essentials.";
    body = "This isn't the day to push through a heavy agenda. Pick the one thing that actually needs you today and protect it.";
    signal = "Energy signal flagged";
  } else if (avoidance) {
    headline = "Something's being avoided. Worth naming.";
    body = "The thing you're quietly not doing often matters more than the tasks you are. If you can name it in the next 10 minutes, it loses half its weight.";
    signal = "Avoidance cue noted";
  } else if (confident) {
    headline = "You're steady. Use it.";
    body = "Good days are the right time to have the conversations you've been putting off or to move something forward that needs your full presence.";
  } else if (activeGoals.length > 0) {
    const g = activeGoals[0];
    headline = `Today could move "${g.title}".`;
    body = `You have an active growth focus that hasn't hit its stride yet. One small move today — even 10 minutes — builds the pattern.`;
  }

  return { headline, body, signal };
}

function getAccentColor(selectedValue, promptType) {
  if (promptType === 'morning_intent') return { border: 'border-amber-500/20', dot: 'bg-amber-400', label: 'text-amber-400', header: 'bg-amber-500/8' };
  if (selectedValue === 'none' || selectedValue === 'tight' || selectedValue === 'very_much') return { border: 'border-rose-500/20', dot: 'bg-rose-400', label: 'text-rose-400', header: 'bg-rose-500/8' };
  if (selectedValue === 'drained' || selectedValue === 'flat') return { border: 'border-amber-500/20', dot: 'bg-amber-400', label: 'text-amber-400', header: 'bg-amber-500/8' };
  if (selectedValue === 'high' || selectedValue === 'solid') return { border: 'border-emerald-500/20', dot: 'bg-emerald-400', label: 'text-emerald-400', header: 'bg-emerald-500/8' };
  return { border: 'border-[#0202ff]/20', dot: 'bg-[#0202ff]', label: 'text-[#6699ff]', header: 'bg-[#0202ff]/8' };
}

export default function TodaysRead({ selectedValue, promptType, optionalText, followUp, trends, goals = [], pulses = [], onReset }) {
  const { openWithContext } = useAtreusChat();
  const [expanded, setExpanded] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const { headline, body, signal } = getSynthesis(selectedValue, promptType, trends, goals, pulses);
  const accent = getAccentColor(selectedValue, promptType);

  const handleTalkThrough = () => {
    openWithContext({
      context: { pageType: 'today', signal },
      starterMessage: `I've checked in. Here's my read of today: ${headline} — ${body}${optionalText ? ` My note: ${optionalText}` : ''}. Help me think about what to prioritise and what to watch out for.`,
    });
  };

  // Collapsed summary label — what was selected
  const PROMPT_LABELS = {
    morning_intent: { delegation: "Delegate something", strategic_work: "Strategic work", team_support: "Team support", personal_development: "Personal development" },
    baseline_energy: { none: "No room at all", tight: "Pretty tight", some: "Enough to breathe", plenty: "Lots of space" },
    clarity_check: { steady: "Feeling clear", stretched: "Feeling stretched", drained: "Already behind" },
    confidence_check: { high: "Solid", steady: "Okay, mostly", uncertain: "A bit shaky", low: "Not great" },
    overload_check: { very_much: "Very much", somewhat: "Somewhat", not_really: "Not really", skipped: "Skipped" },
    weekly_reflection: { strong: "Mostly yes", steady: "Mixed", stretched: "Survival mode", drained: "Not at all" },
    motivation_check: { high: "Genuinely fired up", moderate: "Getting on with it", low: "Running on fumes", flat: "Flat today" },
    avoidance_check: { yes: "Yes, definitely", not_sure: "Maybe", no: "Not really" },
    optimism_check: { optimistic: "Genuinely hopeful", hopeful: "Cautiously okay", uncertain: "Uncertain", pessimistic: "Flat or bleak" },
  };
  const selectedLabel = PROMPT_LABELS[promptType]?.[selectedValue] || selectedValue || "Checked in";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border ${accent.border} overflow-hidden bg-card`}
    >
      {/* Header bar — always visible, acts as the tap target to expand */}
      <button
        onClick={() => setExpanded(s => !s)}
        className={`w-full px-4 py-3 flex items-center justify-between border-b border-border ${accent.header} hover:opacity-80 transition-opacity`}
      >
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${accent.dot}`} />
          <p className={`text-[10px] font-semibold uppercase tracking-widest ${accent.label}`}>Today's read</p>
          {!expanded && (
            <span className="text-[10px] text-muted-foreground font-normal ml-1">· {selectedLabel}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {signal && expanded && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${accent.border} ${accent.label} font-medium`}>
              {signal}
            </span>
          )}
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Main synthesis */}
            <div className="px-4 pt-4 pb-3 space-y-2">
              <p className="text-base font-bold leading-snug text-foreground">{headline}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>

              {/* Optional note */}
              {optionalText && (
                <div className="mt-2 px-3 py-2 rounded-lg italic text-xs bg-muted text-muted-foreground border border-border">
                  "{optionalText.slice(0, 100)}{optionalText.length > 100 ? '…' : ''}"
                </div>
              )}
            </div>

            {/* Follow-up message */}
            {followUp && (
              <div className="px-4 pb-3">
                <p className={`text-[11px] font-medium leading-relaxed ${accent.label}`}>{followUp}</p>
              </div>
            )}

            {/* Context signals — collapsible */}
            {(goals.length > 0 || trends) && (
              <div className="px-4 py-2 border-t border-border">
                <button
                  onClick={() => setShowDetail(s => !s)}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showDetail ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  What's feeding this read
                </button>
                {showDetail && (
                  <div className="mt-2 space-y-1.5">
                    {goals.filter(g => g.status === 'active').slice(0, 2).map(g => (
                      <div key={g.id} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${accent.dot}`} />
                        Active goal: {g.title}
                      </div>
                    ))}
                    {signal && (
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${accent.dot}`} />
                        Self-reported signal: {signal}
                      </div>
                    )}
                    {trends?.overload_pattern_strength > 40 && (
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                        Pattern: overload tendency active
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="px-4 pb-4 pt-1 space-y-2">
              <button
                onClick={handleTalkThrough}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-colors bg-muted hover:bg-muted/80 text-[#0202ff] border border-border"
              >
                <Brain className="w-3.5 h-3.5" /> Talk this through with Atreus
              </button>
              {onReset && (
                <button
                  onClick={onReset}
                  className="w-full flex items-center justify-center gap-2 py-1.5 rounded-xl text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Change my response
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}