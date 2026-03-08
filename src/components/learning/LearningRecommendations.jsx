import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ThumbsUp, ThumbsDown, X, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function LearningRecommendations() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, [user]);

  const loadRecommendations = async () => {
    if (!user) return;

    try {
      const recs = await base44.entities.LearningRecommendation.filter({
        user_email: user.email,
        status: { $in: ["pending", "viewed"] }
      }, "-relevance_score");
      
      setRecommendations(recs);
    } catch (error) {
      console.error("Error loading recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = async () => {
    setGenerating(true);
    try {
      const [assessments, progress, goals] = await Promise.all([
        base44.entities.Assessment.filter({ email: user.email }),
        base44.entities.LearnerProgress.filter({ user_email: user.email }),
        base44.entities.Goal.filter({ created_by: user.email, status: "active" })
      ]);

      const latestAssessment = assessments.sort((a, b) => 
        new Date(b.submission_ts) - new Date(a.submission_ts)
      )[0];

      const competencyGaps = latestAssessment ? [
        { name: "Communication", score: latestAssessment.comm_pct },
        { name: "Decision-Making", score: latestAssessment.dm_pct },
        { name: "Stakeholder Management", score: latestAssessment.sm_pct }
      ].filter(c => c.score < 70) : [];

      // Get all available learning content
      const [resources, modules] = await Promise.all([
        base44.entities.LearningResource.filter({ is_active: true }),
        base44.entities.ConversationalLearningModule.filter({ is_active: true })
      ]);

      // Use AI to generate personalized recommendations
      const prompt = `As an AI learning advisor, analyze this user profile and recommend the most relevant learning resources:

**User Profile:**
- Current Role: ${user.app_role}
- Assessment Scores: ${latestAssessment ? JSON.stringify({
  overall: latestAssessment.overall_pct,
  communication: latestAssessment.comm_pct,
  decision_making: latestAssessment.dm_pct,
  stakeholder_mgmt: latestAssessment.sm_pct
}) : "No assessment yet"}
- Active Goals: ${goals.length} goals
- Completed Learning: ${progress.filter(p => p.status === "completed").length} items

**Competency Gaps:** ${competencyGaps.map(c => `${c.name} (${c.score}%)`).join(", ")}

**Available Resources:**
${resources.slice(0, 10).map(r => `- ${r.title} (${r.type}) - Competencies: ${r.competencies.join(", ")}`).join("\n")}

**Available Modules:**
${modules.map(m => `- ${m.title} - Competencies: ${m.competencies.join(", ")}`).join("\n")}

Provide 3-5 personalized recommendations in JSON format:
{
  "recommendations": [
    {
      "resource_type": "learning_resource" or "conversational_learning_module",
      "resource_title": "exact title from list",
      "reason": "why this is recommended (2-3 sentences)",
      "relevance_score": 0-100,
      "target_competencies": ["competency1", "competency2"]
    }
  ]
}`;

      const response = await base44.integrations.invoke("Core", "InvokeLLM", {
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  resource_type: { type: "string" },
                  resource_title: { type: "string" },
                  reason: { type: "string" },
                  relevance_score: { type: "number" },
                  target_competencies: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        }
      });

      // Create recommendation records
      const newRecs = [];
      for (const rec of response.recommendations) {
        let resourceId = null;
        if (rec.resource_type === "learning_resource") {
          const resource = resources.find(r => r.title === rec.resource_title);
          resourceId = resource?.id;
        } else {
          const module = modules.find(m => m.title === rec.resource_title);
          resourceId = module?.id;
        }

        if (resourceId) {
          const created = await base44.entities.LearningRecommendation.create({
            user_email: user.email,
            resource_type: rec.resource_type,
            resource_id: resourceId,
            recommendation_reason: rec.reason,
            relevance_score: rec.relevance_score,
            target_competencies: rec.target_competencies,
            based_on: ["assessment_results", "competency_gaps", "active_goals"],
            status: "pending",
            generated_date: new Date().toISOString(),
            expires_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          });
          newRecs.push(created);
        }
      }

      setRecommendations(newRecs);
      toast.success(`Generated ${newRecs.length} personalized recommendations!`);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      toast.error("Failed to generate recommendations");
    } finally {
      setGenerating(false);
    }
  };

  const handleRecommendationAction = async (recId, status) => {
    try {
      await base44.entities.LearningRecommendation.update(recId, { status });
      setRecommendations(prev => prev.filter(r => r.id !== recId));
      toast.success(status === "accepted" ? "Recommendation accepted!" : "Recommendation dismissed");
    } catch (error) {
      console.error("Error updating recommendation:", error);
      toast.error("Failed to update recommendation");
    }
  };

  if (loading) return null;

  return (
    <Card className="border-0 shadow-lg border-l-4 border-l-purple-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Recommendations
          </CardTitle>
          <Button 
            onClick={generateRecommendations} 
            disabled={generating}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700"
          >
            {generating ? "Generating..." : "Generate New"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 mb-3">No recommendations yet</p>
            <Button onClick={generateRecommendations} disabled={generating}>
              Generate Personalized Recommendations
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {recommendations.map((rec) => (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-purple-600 text-white">
                          {rec.relevance_score}% Match
                        </Badge>
                        <Badge variant="outline">
                          {rec.resource_type.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 mt-2">{rec.recommendation_reason}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {rec.target_competencies?.map(comp => (
                          <Badge key={comp} variant="outline" className="text-xs">
                            {comp}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRecommendationAction(rec.id, "dismissed")}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={() => handleRecommendationAction(rec.id, "accepted")}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <ThumbsUp className="w-4 h-4 mr-1" />
                      Accept
                    </Button>
                    <Button size="sm" variant="outline">
                      <ExternalLink className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}