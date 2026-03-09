import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, Send, Calendar, BookOpen, Target, Users, 
  Loader2, CheckCircle2, AlertTriangle, Lightbulb, RefreshCw
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function RecommendationsPanel({ 
  programs, 
  journeyEnrollments, 
  goals, 
  assignedLearning,
  metrics,
  onRefresh 
}) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [executingAction, setExecutingAction] = useState(null);

  useEffect(() => {
    generateRecommendations();
  }, [programs, journeyEnrollments, goals, metrics]);

  const generateRecommendations = async () => {
    setLoading(true);
    try {
      // Calculate at-risk participants
      const allParticipantEmails = [...new Set(programs.flatMap(p => p.participant_emails || []))];
      const atRiskParticipants = allParticipantEmails.filter(email => {
        const userEnrollments = journeyEnrollments.filter(e => e.user_email === email);
        return userEnrollments.some(e => {
          if (e.status === 'completed') return false;
          const daysSinceEnrolled = e.enrolled_date 
            ? Math.floor((new Date() - new Date(e.enrolled_date)) / (1000 * 60 * 60 * 24))
            : 0;
          return (e.completion_percentage || 0) < 30 && daysSinceEnrolled > 14;
        });
      });

      // Stalled goals
      const stalledGoals = goals.filter(g => {
        if (g.status === 'archived' || g.progress >= 100) return false;
        const daysSinceUpdate = g.updated_date 
          ? Math.floor((new Date() - new Date(g.updated_date)) / (1000 * 60 * 60 * 24))
          : 30;
        return daysSinceUpdate > 14;
      });

      // Overdue learning
      const overdueLearning = assignedLearning.filter(a => {
        if (a.status === 'completed') return false;
        if (!a.due_date) return false;
        return new Date(a.due_date) < new Date();
      });

      // Low engagement programs
      const lowEngagementPrograms = programs.filter(p => {
        const programEnrollments = journeyEnrollments.filter(e => 
          p.journey_ids?.includes(e.journey_id)
        );
        if (programEnrollments.length === 0) return false;
        const avgProgress = programEnrollments.reduce((sum, e) => sum + (e.completion_percentage || 0), 0) / programEnrollments.length;
        return avgProgress < 30;
      });

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI advisor for a leadership development platform. Generate specific, actionable recommendations for a Program Administrator based on this data:

Data Summary:
- Total Programs: ${programs.length}
- Total Participants: ${allParticipantEmails.length}
- At-Risk Participants: ${atRiskParticipants.length}
- Stalled Goals: ${stalledGoals.length}
- Overdue Learning Assignments: ${overdueLearning.length}
- Low Engagement Programs: ${lowEngagementPrograms.length}
- Average Journey Progress: ${metrics.avgJourneyProgress}%
- Goal Completion Rate: ${metrics.goalCompletionRate}%

Generate a JSON array of 4-6 specific recommendations. Each recommendation should have:
1. id: unique string
2. title: short action title (5-8 words)
3. description: specific, actionable description (1-2 sentences)
4. impact: "high" | "medium" | "low"
5. effort: "quick" | "moderate" | "significant"
6. category: "engagement" | "intervention" | "recognition" | "planning"
7. actionType: "send_nudge" | "schedule_checkin" | "assign_resource" | "review_goals" | "celebrate_wins" | "other"
8. targetCount: number of people/items this affects (use actual numbers from data)

Prioritize recommendations by impact. Be specific and reference actual numbers.`,
        response_json_schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  impact: { type: "string" },
                  effort: { type: "string" },
                  category: { type: "string" },
                  actionType: { type: "string" },
                  targetCount: { type: "number" }
                }
              }
            }
          }
        }
      });

      setRecommendations(response.recommendations || []);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      // Fallback recommendations
      setRecommendations([
        {
          id: "1",
          title: "Review at-risk participants",
          description: `${metrics.atRiskCount} participants are falling behind. Consider sending personalized check-in messages.`,
          impact: "high",
          effort: "moderate",
          category: "intervention",
          actionType: "send_nudge",
          targetCount: metrics.atRiskCount
        },
        {
          id: "2",
          title: "Celebrate recent completions",
          description: "Recognize participants who recently completed their journeys to boost motivation.",
          impact: "medium",
          effort: "quick",
          category: "recognition",
          actionType: "celebrate_wins",
          targetCount: journeyEnrollments.filter(e => e.status === 'completed').length
        }
      ]);
    }
    setLoading(false);
  };

  const handleExecuteAction = async (recommendation) => {
    setExecutingAction(recommendation.id);
    
    try {
      switch (recommendation.actionType) {
        case 'send_nudge':
          // Send nudges to at-risk participants
          const allParticipantEmails = [...new Set(programs.flatMap(p => p.participant_emails || []))];
          const atRiskEmails = allParticipantEmails.filter(email => {
            const userEnrollments = journeyEnrollments.filter(e => e.user_email === email);
            return userEnrollments.some(e => {
              if (e.status === 'completed') return false;
              const daysSinceEnrolled = e.enrolled_date 
                ? Math.floor((new Date() - new Date(e.enrolled_date)) / (1000 * 60 * 60 * 24))
                : 0;
              return (e.completion_percentage || 0) < 30 && daysSinceEnrolled > 14;
            });
          }).slice(0, 5); // Limit to 5 emails

          for (const email of atRiskEmails) {
            await base44.integrations.Core.SendEmail({
              to: email,
              subject: "We're Here to Support Your Leadership Journey",
              body: `Hi there,

We noticed you've been busy, and we wanted to check in on your leadership development progress.

Taking small, consistent steps can make a big difference. Would you like to schedule a quick chat with your program facilitator to get back on track?

We're here to help you succeed!

Best regards,
Your Leadership Development Team`
            });
          }
          toast.success(`Sent ${atRiskEmails.length} nudge emails`);
          break;

        case 'celebrate_wins':
          const completedRecently = journeyEnrollments.filter(e => {
            if (e.status !== 'completed' || !e.completed_date) return false;
            const daysSinceCompleted = Math.floor((new Date() - new Date(e.completed_date)) / (1000 * 60 * 60 * 24));
            return daysSinceCompleted < 14;
          }).slice(0, 5);

          for (const enrollment of completedRecently) {
            await base44.integrations.Core.SendEmail({
              to: enrollment.user_email,
              subject: "Congratulations on Your Achievement! 🎉",
              body: `Hi there,

Congratulations on completing your learning journey! This is a significant achievement in your leadership development.

Your dedication to growth and learning sets a great example. Keep up the amazing work!

Best regards,
Your Leadership Development Team`
            });
          }
          toast.success(`Sent ${completedRecently.length} celebration emails`);
          break;

        default:
          toast.info("This action requires manual follow-up. Check your program dashboard for details.");
      }

      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error executing action:", error);
      toast.error("Failed to execute action");
    }
    
    setExecutingAction(null);
  };

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEffortColor = (effort) => {
    switch (effort) {
      case 'quick': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'significant': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'engagement': return <Users className="w-4 h-4" />;
      case 'intervention': return <AlertTriangle className="w-4 h-4" />;
      case 'recognition': return <CheckCircle2 className="w-4 h-4" />;
      case 'planning': return <Calendar className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'send_nudge': return <Send className="w-4 h-4" />;
      case 'schedule_checkin': return <Calendar className="w-4 h-4" />;
      case 'assign_resource': return <BookOpen className="w-4 h-4" />;
      case 'review_goals': return <Target className="w-4 h-4" />;
      case 'celebrate_wins': return <CheckCircle2 className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-4" />
            <p className="text-gray-500">Generating recommendations...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-purple-600" />
              <div>
                <CardTitle>AI-Powered Recommendations</CardTitle>
                <CardDescription>Prioritized actions to improve your programs</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={generateRecommendations}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.map((rec, idx) => (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-4 bg-white rounded-lg border shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="p-1.5 bg-purple-100 rounded">
                        {getCategoryIcon(rec.category)}
                      </span>
                      <h4 className="font-medium text-gray-900">{rec.title}</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={getImpactColor(rec.impact)}>
                        {rec.impact} impact
                      </Badge>
                      <Badge className={getEffortColor(rec.effort)}>
                        {rec.effort}
                      </Badge>
                      {rec.targetCount > 0 && (
                        <Badge variant="outline">
                          {rec.targetCount} {rec.targetCount === 1 ? 'person' : 'people'}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => handleExecuteAction(rec)}
                    disabled={executingAction === rec.id}
                    className="ml-4"
                    style={{ backgroundColor: '#0202ff' }}
                  >
                    {executingAction === rec.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        {getActionIcon(rec.actionType)}
                        <span className="ml-2">Execute</span>
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            ))}

            {recommendations.length === 0 && (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-600">All programs are performing well!</p>
                <p className="text-sm text-gray-500">No urgent recommendations at this time.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}