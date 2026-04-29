import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Loader2, Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/useAuth';

/**
 * AtreusGoalRefiner
 * Shown inside goal create/edit forms when title or description has content.
 * Calls LLM inline (no need to open the full Atreus chat) and renders a suggestion
 * panel the user can accept or ignore.
 *
 * Props:
 *   title        - current goal title string
 *   description  - current goal description string
 *   dueDate      - optional ISO date string
 *   competency   - optional competency label string
 *   onAccept     - callback({ title, description, milestones, successMeasure })
 *   resetKey     - increment this (e.g. openCount) to flush suggestion state on modal reopen
 */
export default function AtreusGoalRefiner({ title = '', description = '', dueDate, competency, onAccept, resetKey }) {
  const { appRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState(false);
  // mountedRef: prevents setState calls after unmount during in-flight LLM requests
  const mountedRef = useRef(true);
  // isFirstMount: skips the resetKey effect on initial mount (state already at defaults)
  const isFirstMount = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // Reset internal state whenever the parent signals a fresh session (e.g. modal reopened).
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    setLoading(false);
    setSuggestion(null);
    setAccepted(false);
    setError(false);
  }, [resetKey]);

  const handleRefine = async () => {
    setLoading(true);
    setSuggestion(null);
    setAccepted(false);
    setError(false);

    const prompt = `You are a goal quality coach helping a ${appRole || 'professional'} sharpen their development goal.

Current goal draft:
- Title: "${title || '(none)'}"
- Description: "${description || '(none)'}"
${dueDate ? `- Due date: ${dueDate}` : ''}
${competency ? `- Related competency: ${competency}` : ''}

Analyze this goal and return a JSON object with:
1. "vague_parts": array of short strings describing what is vague or weak (max 3)
2. "improved_title": a tighter, more specific, measurable version of the title (1 sentence)
3. "improved_description": a clearer, actionable description (2-3 sentences max)
4. "milestones": array of 2-3 concrete milestone strings
5. "success_measure": a single sentence describing how success will be measured

Keep language direct and professional. Do not add unnecessary preamble.`;

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            vague_parts: { type: 'array', items: { type: 'string' } },
            improved_title: { type: 'string' },
            improved_description: { type: 'string' },
            milestones: { type: 'array', items: { type: 'string' } },
            success_measure: { type: 'string' },
          },
        },
      });
      if (mountedRef.current) setSuggestion(result);
    } catch (err) {
      console.error('AtreusGoalRefiner error:', err);
      if (mountedRef.current) setError(true);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const handleAccept = () => {
    if (!suggestion || !onAccept) return;
    onAccept({
      title: suggestion.improved_title,
      description: suggestion.improved_description,
      milestones: suggestion.milestones,
      successMeasure: suggestion.success_measure,
    });
    setAccepted(true);
    setSuggestion(null);
  };

  const handleDismiss = () => {
    setSuggestion(null);
    setAccepted(false);
  };

  if (accepted) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2">
        <Check className="w-4 h-4 flex-shrink-0" />
        Atreus refinement applied to your goal.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 overflow-hidden">
      {/* Trigger row */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-800">Ask Atreus to tighten this goal</span>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={loading || (!title.trim() && !description.trim())}
          onClick={handleRefine}
          className="text-white text-xs h-8 px-3"
          style={{ background: 'linear-gradient(to right, #A25DDC, #0202ff)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(to right, #9147cc, #0101dd)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(to right, #A25DDC, #0202ff)'}
        >
          {loading ? (
            <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Refining…</>
          ) : (
            'Refine'
          )}
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="border-t border-purple-200 px-4 py-2 flex items-center gap-2 text-xs text-red-600">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          Could not get suggestions. Please try again.
        </div>
      )}

      {/* Suggestion panel */}
      {suggestion && (
        <div className="border-t border-purple-200 px-4 py-3 space-y-3">
          {/* What's vague */}
          {suggestion.vague_parts?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-purple-700 mb-1">What's vague</p>
              <ul className="space-y-0.5">
                {suggestion.vague_parts.map((v, i) => (
                  <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                    <span className="text-purple-400 mt-0.5">•</span>{v}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improved wording */}
          <div>
            <p className="text-xs font-semibold text-purple-700 mb-1">Improved goal</p>
            <p className="text-sm font-medium text-gray-800">{suggestion.improved_title}</p>
            {suggestion.improved_description && (
              <p className="text-xs text-gray-600 mt-1">{suggestion.improved_description}</p>
            )}
          </div>

          {/* Milestones */}
          {suggestion.milestones?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-purple-700 mb-1">Suggested milestones</p>
              <ul className="space-y-0.5">
                {suggestion.milestones.map((m, i) => (
                  <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                    <span className="text-blue-400 mt-0.5">→</span>{m}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Success measure */}
          {suggestion.success_measure && (
            <div className="bg-white border border-purple-100 rounded-lg px-3 py-2">
              <p className="text-xs font-semibold text-purple-700 mb-0.5">Success measure</p>
              <p className="text-xs text-gray-700">{suggestion.success_measure}</p>
            </div>
          )}

          {/* Accept / Ignore */}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              onClick={handleAccept}
              className="text-white text-xs h-8 px-3 flex-1"
              style={{ backgroundColor: '#0202ff' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0101dd'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0202ff'}
            >
              <Check className="w-3 h-3 mr-1" /> Accept refined version
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleDismiss}
              className="text-xs h-8 px-3"
            >
              <X className="w-3 h-3 mr-1" /> Ignore
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}