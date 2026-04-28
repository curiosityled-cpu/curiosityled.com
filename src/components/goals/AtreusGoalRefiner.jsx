import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, CheckCircle, X, ChevronDown, ChevronUp } from "lucide-react";
import { base44 } from "@/api/base44Client";

/**
 * Inline Atreus refinement panel for goal forms.
 * Evaluates the goal for clarity, actionability, measurable outcome, and timeline.
 * Shows the improved version and lets the user accept or ignore it — never overwrites automatically.
 */
export default function AtreusGoalRefiner({ title, description, onAccept }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { what_is_vague, improved_title, improved_description, milestones }
  const [expanded, setExpanded] = useState(true);

  const canRefine = title?.trim().length > 3;

  const handleRefine = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a leadership development coach helping a professional refine their goal.

Evaluate the following goal for clarity, actionability, measurable outcome, and timeline.

Goal Title: "${title}"
Goal Description: "${description || '(none provided)'}"

Return a JSON object with:
- "what_is_vague": a short sentence (max 20 words) identifying the main weakness
- "improved_title": a sharper, more specific version of the title
- "improved_description": a rewritten description that is concrete, measurable, and time-bound
- "milestones": an array of 3 short milestone strings the user could track

Be direct and constructive. Do not pad the response.`,
        response_json_schema: {
          type: "object",
          properties: {
            what_is_vague: { type: "string" },
            improved_title: { type: "string" },
            improved_description: { type: "string" },
            milestones: { type: "array", items: { type: "string" } }
          }
        }
      });
      setResult(response);
      setExpanded(true);
    } catch (err) {
      console.error('Atreus refinement error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (!result) return;
    onAccept({
      title: result.improved_title,
      description: result.improved_description
    });
    setResult(null);
  };

  const handleDismiss = () => setResult(null);

  // Trigger button only — shown when no result yet
  if (!result) {
    return (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRefine}
          disabled={loading || !canRefine}
          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 text-xs px-2 py-1 h-auto"
        >
          {loading ? (
            <>
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              Atreus is reviewing…
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3 mr-1.5" />
              Ask Atreus to tighten this goal
            </>
          )}
        </Button>
      </div>
    );
  }

  // Result panel
  return (
    <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-purple-100">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-semibold text-purple-900">Atreus Refinement</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="p-1 text-purple-400 hover:text-purple-600 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 text-purple-400 hover:text-purple-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-3 space-y-3 text-sm">
          {/* What's vague */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <p className="text-xs font-medium text-amber-700 mb-0.5">What's vague</p>
            <p className="text-amber-900">{result.what_is_vague}</p>
          </div>

          {/* Improved version */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Improved version</p>
            <div className="bg-white border border-purple-100 rounded-lg px-3 py-2 space-y-1">
              <p className="font-semibold text-gray-900">{result.improved_title}</p>
              {result.improved_description && (
                <p className="text-gray-600 text-xs leading-relaxed">{result.improved_description}</p>
              )}
            </div>
          </div>

          {/* Suggested milestones */}
          {result.milestones?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Suggested milestones</p>
              <ul className="space-y-1">
                {result.milestones.map((m, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                    <span className="mt-0.5 w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold flex-shrink-0 text-[10px]">
                      {i + 1}
                    </span>
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              onClick={handleAccept}
              className="text-white text-xs h-8"
              style={{ backgroundColor: '#A25DDC' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9147cc'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#A25DDC'}
            >
              <CheckCircle className="w-3 h-3 mr-1.5" />
              Apply this version
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-gray-500 text-xs h-8 hover:text-gray-700"
            >
              Keep mine
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}