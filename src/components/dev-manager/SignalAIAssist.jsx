import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, X, Lightbulb, ArrowRight, Wand2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: [
                    "short_text",
                    "long_text",
                    "multiple_choice",
                    "checkboxes",
                    "dropdown",
                    "rating_scale",
                    "linear_scale",
                    "yes_no",
                    "number",
                  ],
                },
                question_text: { type: "string" },
                required: { type: "boolean" },
                options: { type: "array", items: { type: "string" } },
                min_value: { type: "number" },
                max_value: { type: "number" },
                correct_answer_index: { type: "number" },
                points: { type: "number" },
              },
              required: ["type", "question_text"],
            },
          },
        },
        required: ["title", "questions"],
      },
    },
    recommended_passing_score: { type: "number" },
    rationale: { type: "string" },
  },
  required: ["sections"],
};

/**
 * SignalAIAssist — recommends sections/questions + scoring for a signal.
 * Calls InvokeLLM with the signal's title, description, and type, then
 * merges the recommended sections into FormBuilderEditor on Apply.
 *
 * Props:
 *   signalType  — one of the SIGNAL_TYPE_CONFIG keys
 *   title       — current signal title
 *   description — current signal description
 *   onApply     — (sections, recommendedPassingScore?) => void
 */
export default function SignalAIAssist({ signalType, title, description, onApply }) {
  const [isOpen, setIsOpen] = useState(false);
  const [extra, setExtra] = useState("");
  const [processing, setProcessing] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  const typeLabel =
    {
      assessment: "competency-mapped assessment",
      quiz: "scored quiz",
      knowledge_check: "knowledge check",
      survey: "feedback survey",
      pulse: "pulse check",
      feedback: "experience feedback form",
      custom: "custom form",
    }[signalType] || "signal";

  const handleGenerate = async () => {
    if (!title.trim()) {
      toast.error("Add a title first so AI knows what to build");
      return;
    }
    setProcessing(true);
    setSuggestions(null);
    try {
      const prompt = `You are an expert instructional designer building a ${typeLabel} titled "${title}".
${description ? `Purpose: ${description}` : "No description provided — infer from the title."}
${extra ? `Additional guidance from the author: ${extra}` : ""}

Generate a complete set of sections and questions for this ${typeLabel}.
Guidelines:
- Use 1-4 sections, each with a clear title.
- Choose question types appropriate to the signal type:
  * assessment → linear_scale (1-5) or rating_scale per competency area; include a competency_id placeholder via question_text context.
  * quiz / knowledge_check → multiple_choice with a correct_answer_index (0-based) and points.
  * survey → mix of linear_scale, multiple_choice, long_text.
  * pulse → a single linear_scale (1-5) sentiment question.
  * feedback → linear_scale satisfaction + long_text "what could be improved".
  * custom → whatever fits.
- For multiple_choice/checkboxes/dropdown, provide 2-5 realistic options.
- For linear_scale/rating_scale, set min_value=1 and max_value=5 unless a wider scale is clearly better.
- Mark only essential questions as required: true.
- For scored types (quiz, knowledge_check, assessment), set points per question (default 1) and recommend a passing score percentage.

Return ONLY valid JSON matching the schema.`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: RESPONSE_SCHEMA,
      });

      // Normalize: assign ids to sections/questions for the editor
      const normalized = {
        sections: (res?.sections || []).map((s) => ({
          id: `ai_section_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          title: s.title || "Section",
          description: s.description || "",
          questions: (s.questions || []).map((q) => ({
            id: `ai_q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            type: q.type,
            question_text: q.question_text,
            required: q.required ?? false,
            options: q.options,
            min_value: q.min_value,
            max_value: q.max_value,
            correct_answer_index: q.correct_answer_index,
            points: q.points,
          })),
        })),
        recommended_passing_score: res?.recommended_passing_score,
        rationale: res?.rationale,
      };

      if (!normalized.sections.length) {
        toast.error("AI returned no questions — try refining your title or description");
        return;
      }

      setSuggestions(normalized);
      toast.success("AI suggestions ready — review and apply");
    } catch (e) {
      console.error("SignalAIAssist error:", e);
      toast.error("AI assist failed — please try again");
    } finally {
      setProcessing(false);
    }
  };

  const handleApply = () => {
    if (!suggestions) return;
    onApply(suggestions.sections, suggestions.recommended_passing_score);
    setIsOpen(false);
    setSuggestions(null);
    setExtra("");
  };

  const handleDiscard = () => {
    setSuggestions(null);
  };

  return (
    <div className="space-y-3">
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          variant="outline"
          className="w-full border-dashed border-purple-300 hover:border-purple-400 hover:bg-purple-50/50 text-[#7c3aed]"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          AI Assist — Recommend Questions
        </Button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50/60 to-blue-50/40">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Wand2 className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm text-gray-900 truncate">AI Question Designer</h4>
                      <p className="text-xs text-gray-500">Generates sections & questions for your {typeLabel}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={() => {
                      setIsOpen(false);
                      setSuggestions(null);
                      setExtra("");
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {!suggestions ? (
                  <>
                    <Textarea
                      value={extra}
                      onChange={(e) => setExtra(e.target.value)}
                      placeholder="Optional: add focus areas, audience, or topics to guide the AI…"
                      rows={2}
                      className="bg-white text-sm"
                    />
                    <Button
                      onClick={handleGenerate}
                      disabled={processing || !title.trim()}
                      className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Designing questions…
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate Questions
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-white rounded-lg p-3 border border-purple-200">
                      <div className="flex items-start gap-2 mb-2">
                        <Lightbulb className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm font-medium text-gray-900">
                          {suggestions.sections.length} section{suggestions.sections.length !== 1 ? "s" : ""},{" "}
                          {suggestions.sections.reduce((n, s) => n + s.questions.length, 0)} questions
                        </p>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {suggestions.sections.map((s, i) => (
                          <div key={i} className="text-xs">
                            <p className="font-medium text-gray-700">{s.title}</p>
                            <ul className="ml-3 list-disc text-gray-500 space-y-0.5">
                              {s.questions.map((q, j) => (
                                <li key={j}>{q.question_text}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                      {suggestions.recommended_passing_score != null && (
                        <div className="mt-2 pt-2 border-t border-purple-100">
                          <Badge variant="secondary" className="text-xs">
                            Recommended pass: {suggestions.recommended_passing_score}%
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleApply}
                        className="flex-1 bg-[#0202ff] hover:bg-[#0101dd] text-white"
                      >
                        Apply to Builder
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                      <Button variant="outline" onClick={handleDiscard}>
                        Discard
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}