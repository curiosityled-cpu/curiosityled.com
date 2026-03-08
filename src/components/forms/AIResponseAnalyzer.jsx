import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function AIResponseAnalyzer({ submission, form, onUpdate }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(submission.ai_analysis || null);
  const [autoAnalyze, setAutoAnalyze] = useState(form.config?.ai_analysis_enabled || false);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      // Prepare context
      const questions = form.config.sections.flatMap(s => s.questions || []);
      const responsesText = questions.map(q => {
        const answer = submission.responses?.[q.id];
        return `Q: ${q.question_text}\nA: ${answer || "No answer"}`;
      }).join("\n\n");

      // Call LLM
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this form submission and provide insights:

Form: ${form.title}
Type: ${form.form_type}

Responses:
${responsesText}

Provide:
1. Summary of responses
2. Key insights or patterns
3. Sentiment analysis (positive/neutral/negative)
4. Recommendations or follow-up actions
5. Overall quality score (1-10)`,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            key_insights: { type: "array", items: { type: "string" } },
            sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
            recommendations: { type: "array", items: { type: "string" } },
            quality_score: { type: "number" }
          }
        }
      });

      // Save analysis
      await base44.entities.CustomFormSubmission.update(submission.id, {
        ai_analysis: result
      });

      setAnalysis(result);
      toast.success("Analysis complete");
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error analyzing:", error);
      toast.error("Failed to analyze responses");
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleAutoAnalyze = async (checked) => {
    try {
      await base44.entities.CustomForm.update(form.id, {
        config: {
          ...form.config,
          ai_analysis_enabled: checked
        }
      });
      setAutoAnalyze(checked);
      toast.success(checked ? "Auto-analysis enabled" : "Auto-analysis disabled");
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error("Failed to update settings");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          AI Response Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="auto_analyze"
              checked={autoAnalyze}
              onCheckedChange={toggleAutoAnalyze}
            />
            <label htmlFor="auto_analyze" className="text-sm cursor-pointer">
              Auto-analyze all submissions
            </label>
          </div>
          
          <Button
            onClick={runAnalysis}
            disabled={analyzing}
            size="sm"
            style={{ backgroundColor: '#0202ff' }}
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze Now
              </>
            )}
          </Button>
        </div>

        {analysis && (
          <div className="space-y-3 mt-4">
            <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
              <h4 className="font-semibold text-sm mb-2">Summary</h4>
              <p className="text-sm text-gray-700">{analysis.summary}</p>
            </div>

            {analysis.key_insights?.length > 0 && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-sm mb-2">Key Insights</h4>
                <ul className="space-y-1">
                  {analysis.key_insights.map((insight, idx) => (
                    <li key={idx} className="text-sm text-gray-700">• {insight}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center gap-4">
              <div className="flex-1 p-3 bg-white rounded-lg border">
                <p className="text-xs text-gray-500">Sentiment</p>
                <p className="text-sm font-semibold capitalize">{analysis.sentiment}</p>
              </div>
              <div className="flex-1 p-3 bg-white rounded-lg border">
                <p className="text-xs text-gray-500">Quality Score</p>
                <p className="text-sm font-semibold">{analysis.quality_score}/10</p>
              </div>
            </div>

            {analysis.recommendations?.length > 0 && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-semibold text-sm mb-2">Recommendations</h4>
                <ul className="space-y-1">
                  {analysis.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm text-gray-700">✓ {rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}