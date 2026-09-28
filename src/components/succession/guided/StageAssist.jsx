import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, Loader2, X, Check, Lightbulb } from "lucide-react";
import { ASSIST_CONFIG, ASSIST_SCHEMA } from "./stageConfig";

/**
 * StageAssist — the inline ✨ AI Assist button + result panel for a stage.
 *
 * Each stage has a focused InvokeLLM call that returns { summary, recommendations }.
 * AI only drafts/suggests — it never writes to immutable records. The user
 * reads the suggestion and acts manually in the relevant view.
 */
export default function StageAssist({ stageKey, context }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const config = ASSIST_CONFIG[stageKey];
  if (!config) return null;

  const handleAssist = async () => {
    setOpen(true);
    if (result) return; // already loaded
    setLoading(true);
    setError(null);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: config.prompt(context || {}),
        response_json_schema: ASSIST_SCHEMA,
      });
      setResult(res);
    } catch (err) {
      setError("AI assist unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Assist button */}
      <button
        onClick={handleAssist}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 transition-colors"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Sparkles className="w-3.5 h-3.5" />
        )}
        {config.title}
      </button>

      {/* Result panel */}
      {open && (
        <div className="mt-3 border border-indigo-100 bg-indigo-50/40 rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Lightbulb className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{config.title}</p>
                <p className="text-[10px] text-gray-500">AI suggestion — review and act manually</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {loading && (
            <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing…
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 py-2">{error}</div>
          )}

          {result && (
            <div className="space-y-3">
              {result.summary && (
                <p className="text-sm text-gray-700 leading-relaxed">{result.summary}</p>
              )}
              {result.recommendations?.length > 0 && (
                <div className="space-y-2">
                  {result.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-lg p-2.5 border border-indigo-100"
                    >
                      <div className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-semibold mt-0.5">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-900">{rec.title}</p>
                          {rec.rationale && (
                            <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                              {rec.rationale}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-gray-400 italic">
                This is a suggestion only. You remain in control of all decisions and records.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}