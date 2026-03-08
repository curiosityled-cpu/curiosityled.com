import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, TrendingUp, Clock, Target, AlertCircle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AdvancedFormInsights({ form }) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);

  const generateInsights = async () => {
    setLoading(true);
    try {
      const submissions = await base44.entities.CustomFormSubmission.filter({
        form_id: form.id
      }, '-created_date', 200);

      if (submissions.length === 0) {
        toast.error("No submissions to analyze");
        setLoading(false);
        return;
      }

      // Calculate completion times
      const completionTimes = submissions
        .filter(s => s.completion_time_seconds)
        .map(s => s.completion_time_seconds);

      const avgCompletionTime = completionTimes.length > 0 
        ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
        : 0;

      // Calculate drop-off rate (in_progress vs submitted)
      const inProgress = submissions.filter(s => s.status === "in_progress").length;
      const submitted = submissions.filter(s => s.status === "submitted").length;
      const dropOffRate = ((inProgress / (inProgress + submitted)) * 100).toFixed(1);

      // Analyze response patterns
      const responseAnalysis = analyzeResponsePatterns(submissions);

      // Generate AI insights
      const aiInsights = await generateAIInsights({
        submissions,
        avgCompletionTime,
        dropOffRate,
        responseAnalysis
      });

      setInsights({
        avgCompletionTime,
        dropOffRate,
        responseAnalysis,
        aiInsights,
        totalSubmissions: submissions.length,
        completionRate: ((submitted / (inProgress + submitted)) * 100).toFixed(1)
      });

      toast.success("Insights generated");
    } catch (error) {
      console.error("Error generating insights:", error);
      toast.error("Failed to generate insights");
    } finally {
      setLoading(false);
    }
  };

  const analyzeResponsePatterns = (submissions) => {
    const patterns = [];

    if (!submissions || submissions.length === 0) return patterns;

    // Analyze first question responses
    const firstResponses = {};
    submissions.forEach(sub => {
      if (!sub.responses) return;
      const firstQuestionId = Object.keys(sub.responses)[0];
      if (firstQuestionId) {
        const answer = sub.responses[firstQuestionId];
        if (answer) {
          firstResponses[answer] = (firstResponses[answer] || 0) + 1;
        }
      }
    });

    if (Object.keys(firstResponses).length > 0) {
      const mostCommon = Object.entries(firstResponses)
        .sort((a, b) => b[1] - a[1])[0];
      patterns.push({
        type: "common_response",
        description: `Most common first response: "${mostCommon[0]}" (${mostCommon[1]} times)`
      });
    }

    // Analyze completion time variance
    const times = submissions
      .filter(s => s.completion_time_seconds)
      .map(s => s.completion_time_seconds);

    if (times.length > 1) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const variance = times.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / times.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev > avg * 0.5) {
        patterns.push({
          type: "high_variance",
          description: "High variance in completion times suggests confusing questions"
        });
      }
    }

    return patterns;
  };

  const generateAIInsights = async (data) => {
    try {
      const prompt = `Analyze this form performance data and provide 3-5 actionable insights:
      
- Average completion time: ${data.avgCompletionTime} seconds
- Drop-off rate: ${data.dropOffRate}%
- Total submissions: ${data.submissions.length}
- Response patterns: ${JSON.stringify(data.responseAnalysis)}

Provide specific, actionable recommendations to improve form performance.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  priority: { type: "string", enum: ["high", "medium", "low"] },
                  action: { type: "string" }
                }
              }
            }
          }
        }
      });

      return response.insights || [];
    } catch (error) {
      console.error("Error generating AI insights:", error);
      return [];
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          AI-Powered Insights
        </CardTitle>
        <p className="text-xs text-gray-600 mt-1">
          Get intelligent recommendations to improve your form
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!insights ? (
          <Button
            onClick={generateInsights}
            disabled={loading}
            className="w-full"
            style={{ backgroundColor: '#0202ff' }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Generate Insights
              </>
            )}
          </Button>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-blue-600">Avg Time</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {Math.floor(insights.avgCompletionTime / 60)}m {insights.avgCompletionTime % 60}s
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-purple-600" />
                    <span className="text-xs text-purple-600">Completion</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-900">
                    {insights.completionRate}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Response Patterns */}
            {insights.responseAnalysis.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Response Patterns</h4>
                {insights.responseAnalysis.map((pattern, idx) => (
                  <Card key={idx} className="border-orange-200 bg-orange-50">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <TrendingUp className="w-4 h-4 text-orange-600 mt-0.5" />
                        <p className="text-sm text-orange-900">{pattern.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* AI Insights */}
            {insights.aiInsights.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">AI Recommendations</h4>
                {insights.aiInsights.map((insight, idx) => (
                  <Card key={idx} className="border">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <AlertCircle className={`w-4 h-4 mt-0.5 ${
                          insight.priority === 'high' ? 'text-red-600' :
                          insight.priority === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{insight.title}</span>
                            <Badge variant={
                              insight.priority === 'high' ? 'destructive' :
                              insight.priority === 'medium' ? 'secondary' : 'outline'
                            } className="text-xs">
                              {insight.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 mb-1">{insight.description}</p>
                          <p className="text-xs text-blue-600 font-medium">→ {insight.action}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Button
              onClick={generateInsights}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              Refresh Insights
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}