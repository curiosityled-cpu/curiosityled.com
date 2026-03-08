import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, TrendingUp, TrendingDown, Minus, Loader2, 
  RefreshCw, CheckCircle2, AlertTriangle, Target, Map
} from "lucide-react";
import { motion } from "framer-motion";

export default function ProgramHealthNarrative({ programs, journeyEnrollments, goals, metrics }) {
  const [narrative, setNarrative] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    generateNarrative();
  }, [programs, journeyEnrollments, goals]);

  const generateNarrative = async () => {
    setLoading(true);
    setError(null);

    try {
      const programSummaries = programs.map(p => ({
        name: p.name,
        participants: p.participant_emails?.length || 0,
        journeys: p.journey_ids?.length || 0,
        status: p.status
      }));

      const enrollmentStats = {
        total: journeyEnrollments.length,
        completed: journeyEnrollments.filter(e => e.status === 'completed').length,
        inProgress: journeyEnrollments.filter(e => e.status === 'in_progress').length,
        notStarted: journeyEnrollments.filter(e => e.status === 'not_started' || !e.status).length,
        avgCompletion: metrics.avgJourneyProgress
      };

      const goalStats = {
        total: goals.length,
        completed: goals.filter(g => g.progress >= 100).length,
        avgProgress: goals.length > 0 
          ? Math.round(goals.reduce((sum, g) => sum + (g.progress || 0), 0) / goals.length)
          : 0
      };

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI assistant for a leadership development platform. Generate a concise, actionable health summary for a Program Administrator.

Program Data:
- Programs: ${JSON.stringify(programSummaries)}
- Journey Enrollments: ${JSON.stringify(enrollmentStats)}
- Goal Progress: ${JSON.stringify(goalStats)}
- At-Risk Learners: ${metrics.atRiskCount}

Generate a JSON response with:
1. overall_health: "excellent" | "good" | "needs_attention" | "critical"
2. health_score: number 0-100
3. summary: 2-3 sentence executive summary
4. key_insights: array of 3-4 specific insights (each 1 sentence)
5. trends: array of objects with {metric: string, direction: "up" | "down" | "stable", description: string}
6. priority_focus: single most important area to focus on

Be specific and actionable. Reference actual numbers from the data.`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_health: { type: "string" },
            health_score: { type: "number" },
            summary: { type: "string" },
            key_insights: { type: "array", items: { type: "string" } },
            trends: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  metric: { type: "string" },
                  direction: { type: "string" },
                  description: { type: "string" }
                }
              } 
            },
            priority_focus: { type: "string" }
          }
        }
      });

      setNarrative(response);
    } catch (err) {
      console.error("Error generating narrative:", err);
      setError("Unable to generate insights. Please try again.");
    }
    setLoading(false);
  };

  const getHealthColor = (health) => {
    switch (health) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'needs_attention': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTrendIcon = (direction) => {
    switch (direction) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-4" />
            <p className="text-gray-500">Analyzing program health...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto mb-3" />
          <p className="text-gray-600 mb-4">{error}</p>
          <Button variant="outline" onClick={generateNarrative}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Health Score Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-purple-600" />
                <div>
                  <CardTitle>AI Health Summary</CardTitle>
                  <CardDescription>Generated insights for your programs</CardDescription>
                </div>
              </div>
              <Badge className={getHealthColor(narrative?.overall_health)}>
                {narrative?.overall_health?.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Health Score Visual */}
            <div className="flex items-center gap-6 mb-6">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke={narrative?.health_score >= 70 ? '#22c55e' : narrative?.health_score >= 50 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${(narrative?.health_score || 0) * 2.51} 251`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">{narrative?.health_score || 0}</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-gray-700 leading-relaxed">{narrative?.summary}</p>
              </div>
            </div>

            {/* Priority Focus */}
            {narrative?.priority_focus && (
              <div className="p-4 bg-white rounded-lg border border-purple-200 mb-6">
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-purple-800">Priority Focus</p>
                    <p className="text-gray-700">{narrative.priority_focus}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Key Insights */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Key Insights
              </h4>
              <div className="grid gap-2">
                {narrative?.key_insights?.map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-3 bg-white rounded-lg border">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-sm text-gray-700">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Trends */}
      {narrative?.trends?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Trend Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {narrative.trends.map((trend, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    {getTrendIcon(trend.direction)}
                    <div>
                      <p className="font-medium text-gray-900">{trend.metric}</p>
                      <p className="text-sm text-gray-600">{trend.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}