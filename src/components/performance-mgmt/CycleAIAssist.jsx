import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Lightbulb } from "lucide-react";
import { toast } from "sonner";

/**
 * AI Assist panel for review cycle creation.
 * Suggests cycle name, focus areas, and timeline tips based on context.
 */
export default function CycleAIAssist({ form, onApply }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  const handleAssist = async () => {
    setLoading(true);
    try {
      const periodDesc = form.period_start && form.period_end
        ? `${form.period_start} to ${form.period_end}`
        : "upcoming review period";

      const phaseLabel = {
        self_review: "Self Review",
        manager_review: "Manager Review",
        peer_review: "Peer Review",
        "360": "360° Review",
      }[form.review_type] || "Performance Review";

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an HR performance management expert. A user is creating a performance review cycle with these details:
- Review Phase: ${phaseLabel}
- Cycle Length: ${form.cycle_length || "annual"}
- Period: ${periodDesc}
- Skip-level review enabled: ${form.skip_level_review_enabled ? "Yes" : "No"}
- Current name: "${form.name || "(none)"}"
- Current description: "${form.description || "(none)"}"

Generate helpful suggestions in JSON format:
{
  "suggested_name": "A clear, professional cycle name (e.g., 'Q4 2026 Manager Performance Review')",
  "suggested_description": "A 1-2 sentence description of the cycle's focus and goals",
  "focus_areas": ["3-4 key focus areas for this review cycle, e.g., 'Goal achievement', 'Leadership behaviors', 'Cross-functional collaboration']",
  "timeline_tips": ["2-3 practical tips for managing the timeline effectively"],
  "communication_tips": ["2-3 tips for communicating the cycle to participants"]
}

Keep suggestions concise, practical, and tailored to the review phase type.`,
        response_json_schema: {
          type: "object",
          properties: {
            suggested_name: { type: "string" },
            suggested_description: { type: "string" },
            focus_areas: { type: "array", items: { type: "string" } },
            timeline_tips: { type: "array", items: { type: "string" } },
            communication_tips: { type: "array", items: { type: "string" } },
          },
        },
      });

      setSuggestions(res);
    } catch (err) {
      toast.error("AI assist failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyName = () => {
    if (suggestions?.suggested_name) {
      onApply({ name: suggestions.suggested_name, description: suggestions.suggested_description || form.description });
      toast.success("AI suggestions applied");
    }
  };

  return (
    <div className="border border-indigo-100 bg-indigo-50/50 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">AI Assist</p>
            <p className="text-[10px] text-gray-500">Get suggestions for this cycle</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleAssist}
          disabled={loading}
          className="h-7 text-xs gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lightbulb className="w-3 h-3" />}
          {loading ? "Thinking..." : "Suggest"}
        </Button>
      </div>

      {suggestions && (
        <div className="space-y-2 pt-1">
          {suggestions.suggested_name && (
            <div className="bg-white rounded-lg p-2 border border-indigo-100">
              <p className="text-[10px] font-medium text-indigo-600 uppercase tracking-wide mb-1">Suggested Name</p>
              <p className="text-xs text-gray-900 font-medium">{suggestions.suggested_name}</p>
              <button onClick={applyName} className="text-[10px] text-[#0202ff] hover:underline mt-1 font-medium">
                Apply name & description →
              </button>
            </div>
          )}
          {suggestions.focus_areas?.length > 0 && (
            <div className="bg-white rounded-lg p-2 border border-indigo-100">
              <p className="text-[10px] font-medium text-indigo-600 uppercase tracking-wide mb-1">Focus Areas</p>
              <ul className="space-y-0.5">
                {suggestions.focus_areas.map((area, i) => (
                  <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                    <span className="text-indigo-400 mt-0.5">•</span> {area}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {suggestions.timeline_tips?.length > 0 && (
            <div className="bg-white rounded-lg p-2 border border-indigo-100">
              <p className="text-[10px] font-medium text-indigo-600 uppercase tracking-wide mb-1">Timeline Tips</p>
              <ul className="space-y-0.5">
                {suggestions.timeline_tips.map((tip, i) => (
                  <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                    <span className="text-indigo-400 mt-0.5">•</span> {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {suggestions.communication_tips?.length > 0 && (
            <div className="bg-white rounded-lg p-2 border border-indigo-100">
              <p className="text-[10px] font-medium text-indigo-600 uppercase tracking-wide mb-1">Communication Tips</p>
              <ul className="space-y-0.5">
                {suggestions.communication_tips.map((tip, i) => (
                  <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                    <span className="text-indigo-400 mt-0.5">•</span> {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}