import React from "react";
import { Shield, Loader2, AlertTriangle, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * OrgHealthStates — explicit data-availability states for the Organizational
 * Leadership Health section. Replaces the old pattern of hiding the section
 * or leaving an unexplained blank when assessment count is low.
 *
 * States: loading → empty → insufficient-sample → partial-data → decision-ready
 *
 * Props:
 *  - state: one of 'loading' | 'empty' | 'insufficient' | 'partial'
 *  - assessmentCount: number of assessments
 *  - onPromptAtreus: optional handler to prompt Atreus for help
 */
export default function OrgHealthStates({ state, assessmentCount = 0, onPromptAtreus }) {
  if (state === "loading") {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-indigo-400" />
          <div>
            <p className="text-sm font-semibold text-gray-700">Organizational Leadership Health</p>
            <p className="text-xs text-gray-400">Loading capability data…</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
        </div>
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start gap-3 mb-4">
          <Shield className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-700">Organizational Leadership Health</p>
            <p className="text-xs text-gray-500 mt-0.5">No assessment data yet</p>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
          <p className="text-xs text-blue-800 leading-relaxed">
            Run leadership assessments to populate the Manager Effectiveness Index, competency dimensions,
            and risk signals. This section will show capability scores, benchmark comparisons, and an
            AI-generated executive briefing once data is available.
          </p>
          {onPromptAtreus && (
            <button
              onClick={() => onPromptAtreus("Help me set up and run our first leadership assessment.")}
              className="mt-2 text-xs text-[#0202ff] hover:underline font-medium"
            >
              Ask Atreus how to get started →
            </button>
          )}
        </div>
      </div>
    );
  }

  if (state === "insufficient") {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start gap-3 mb-4">
          <Shield className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-700">Organizational Leadership Health</p>
              <Badge className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                Early signals
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {assessmentCount} assessment{assessmentCount !== 1 ? "s" : ""} completed — directional only
            </p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>Limited sample.</strong> Findings from {assessmentCount} assessment{assessmentCount !== 1 ? "s" : ""} are
                directional and should not be treated as representative of the full leadership population.
                Confidence improves as more leaders complete assessments.
              </p>
              <p className="text-[11px] text-amber-600 mt-2">
                Expand assessment coverage to at least 5 leaders for decision-ready insights. The ME Index,
                competency dimensions, and risk signals below are based on the current sample.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-gray-400" />
          <p className="text-[11px] text-gray-500">
            This section will remain visible with whatever data exists — it no longer disappears when
            sample size is low.
          </p>
        </div>
      </div>
    );
  }

  // 'partial' state — shown alongside the real OrgHealthCard when data exists
  // but is below the decision-ready threshold
  if (state === "partial") {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 mb-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Partial data.</strong> {assessmentCount} assessment{assessmentCount !== 1 ? "s" : ""} completed —
            insights are directional. Expand coverage to 5+ leaders for decision-ready confidence.
          </p>
        </div>
      </div>
    );
  }

  return null;
}