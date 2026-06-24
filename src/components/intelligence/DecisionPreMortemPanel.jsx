/**
 * DecisionPreMortemPanel
 *
 * Shown inside the NewDecisionForm when the manager has typed a decision title.
 * Calls analyzeDecisionQuality (premortem mode) and surfaces a personalized
 * challenge question + confidence calibration insight.
 */
import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Brain, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAtreusChat } from '@/components/ai/AtreusContext';

export default function DecisionPreMortemPanel({ decisionText, userEmail }) {
  const { openWithContext } = useAtreusChat();
  const [question, setQuestion] = useState(null);
  const [calibrationNote, setCalibrationNote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const lastFetchedText = useRef('');
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!decisionText || decisionText.trim().length < 15) {
      setQuestion(null);
      setCalibrationNote(null);
      return;
    }

    // Debounce — only fetch after user stops typing for 1.5s
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (decisionText.trim() === lastFetchedText.current) return;
      lastFetchedText.current = decisionText.trim();

      setLoading(true);
      try {
        const res = await base44.functions.invoke('analyzeDecisionQuality', {
          mode: 'premortem',
          decision_text: decisionText.trim(),
        });

        const data = res.data;
        setQuestion(data.premortem_question || null);

        // Build a brief calibration note if a pattern exists
        if (data.overconfidence_detected) {
          setCalibrationNote('Pattern noticed: your high-confidence decisions have often changed course. Worth pausing here.');
        } else if (data.pattern_flags?.includes('underconfidence_bias')) {
          setCalibrationNote('Pattern noticed: your low-confidence decisions tend to work out better than expected. Trust yourself more.');
        } else {
          setCalibrationNote(null);
        }
      } catch {
        // silent — pre-mortem is enhancement only
      } finally {
        setLoading(false);
      }
    }, 1500);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [decisionText]);

  if (!decisionText || decisionText.trim().length < 15) return null;

  return (
    <div className="rounded-xl border border-[#0202ff]/20 bg-[#0202ff]/5 overflow-hidden">
      <button
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="w-5 h-5 rounded-md bg-[#0202ff] flex items-center justify-center flex-shrink-0">
          <Brain className="w-3 h-3 text-white" />
        </div>
        <span className="text-xs font-semibold text-[#0202ff] flex-1">
          Atreus Pre-Mortem
        </span>
        {loading && (
          <div className="w-3 h-3 border border-[#0202ff]/40 border-t-[#0202ff] rounded-full animate-spin" />
        )}
        {!loading && (expanded ? <ChevronUp className="w-3.5 h-3.5 text-[#0202ff]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#0202ff]" />)}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2.5">
          {loading && !question && (
            <p className="text-[11px] text-[#0202ff]/60 italic">Atreus is reading your decision history…</p>
          )}

          {calibrationNote && (
            <div className="px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-[11px] text-amber-700 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> {calibrationNote}
              </p>
            </div>
          )}

          {question && (
            <div className="space-y-2">
              <p className="text-[11px] text-[#0202ff]/70 font-medium uppercase tracking-wide">Before you commit — consider this:</p>
              <p className="text-xs text-gray-800 leading-relaxed font-medium">{question}</p>
              <Button
                size="sm"
                variant="outline"
                className="text-[11px] h-7 border-[#0202ff]/30 text-[#0202ff] hover:bg-[#0202ff]/5"
                onClick={() => openWithContext({
                  context: { pageType: 'practice', flow: 'decision_premortem' },
                  starterMessage: `I'm about to commit to a decision and want to think it through with you: "${decisionText}". Here's the pre-mortem question I want to work through: ${question}`,
                })}
              >
                <Brain className="w-3 h-3 mr-1" /> Explore this with Atreus
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}