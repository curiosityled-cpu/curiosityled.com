import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/useAuth";

export default function AIGamificationAssistant() {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [formData, setFormData] = useState({
    organizational_goals: "",
    target_behaviors: "",
    existing_programs: ""
  });
  const [recommendation, setRecommendation] = useState(null);
  const [optimization, setOptimization] = useState(null);

  const handleGenerate = async () => {
    if (!formData.organizational_goals || !formData.target_behaviors) {
      toast.error("Please provide organizational goals and target behaviors");
      return;
    }

    setGenerating(true);
    try {
      const { data } = await base44.functions.invoke('aiGenerateGamificationStructure', formData);
      setRecommendation(data.recommendation);
      toast.success("AI recommendations generated successfully");
    } catch (error) {
      console.error("Error generating recommendations:", error);
      toast.error("Failed to generate recommendations");
    } finally {
      setGenerating(false);
    }
  };

  const handleOptimize = async () => {
    setOptimizing(true);
    try {
      const { data } = await base44.functions.invoke('aiOptimizeGamification', {
        client_id: user.client_id
      });
      setOptimization(data.optimization);
      toast.success("Optimization analysis complete");
    } catch (error) {
      console.error("Error optimizing gamification:", error);
      toast.error("Failed to generate optimization recommendations");
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Gamification Assistant
          </CardTitle>
          <CardDescription>Use AI to design and optimize your gamification system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Generate Gamification Structure</h3>
            
            <div>
              <Label>Organizational Goals</Label>
              <Textarea
                placeholder="Describe your organization's key goals (e.g., increase course completion, improve manager engagement, reduce turnover)"
                value={formData.organizational_goals}
                onChange={(e) => setFormData({ ...formData, organizational_goals: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label>Target Behaviors</Label>
              <Textarea
                placeholder="What behaviors do you want to encourage? (e.g., daily learning, peer recognition, goal setting)"
                value={formData.target_behaviors}
                onChange={(e) => setFormData({ ...formData, target_behaviors: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label>Existing Programs (Optional)</Label>
              <Textarea
                placeholder="Describe any existing leadership or learning programs"
                value={formData.existing_programs}
                onChange={(e) => setFormData({ ...formData, existing_programs: e.target.value })}
                rows={2}
              />
            </div>

            <Button onClick={handleGenerate} disabled={generating} className="flex items-center gap-2">
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Recommendations
                </>
              )}
            </Button>
          </div>

          {recommendation && (
            <div className="border-t pt-6 space-y-4">
              <h3 className="font-semibold text-lg">AI Recommendations</h3>
              
              {recommendation.badges && (
                <div>
                  <h4 className="font-medium mb-2">Suggested Badges</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {recommendation.badges.map((badge, index) => (
                      <div key={index} className="border rounded-lg p-3 bg-gray-50">
                        <h5 className="font-semibold">{badge.badge_name}</h5>
                        <p className="text-sm text-gray-600">{badge.description}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">{badge.rarity}</span>
                          <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">{badge.points_awarded} pts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recommendation.levels && (
                <div>
                  <h4 className="font-medium mb-2">Suggested Levels</h4>
                  <div className="space-y-2">
                    {recommendation.levels.map((level, index) => (
                      <div key={index} className="border rounded-lg p-3 bg-gray-50 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                          {level.level_order}
                        </div>
                        <div className="flex-1">
                          <h5 className="font-semibold">{level.level_name}</h5>
                          <p className="text-sm text-gray-600">{level.points_threshold.toLocaleString()} points</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recommendation.implementation_notes && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Implementation Notes</h4>
                  <p className="text-sm text-gray-700">{recommendation.implementation_notes}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Optimize Existing System</CardTitle>
          <CardDescription>Get AI-powered recommendations to improve your current gamification</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleOptimize} disabled={optimizing} className="flex items-center gap-2">
            {optimizing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analyze & Optimize
              </>
            )}
          </Button>

          {optimization && (
            <div className="border-t pt-4 space-y-4">
              {optimization.key_insights && (
                <div>
                  <h4 className="font-medium mb-2">Key Insights</h4>
                  <div className="space-y-2">
                    {optimization.key_insights.working_well?.length > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded p-3">
                        <p className="font-medium text-sm text-green-800 mb-1">✓ Working Well:</p>
                        <ul className="list-disc list-inside text-sm text-green-700">
                          {optimization.key_insights.working_well.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {optimization.key_insights.needs_improvement?.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                        <p className="font-medium text-sm text-yellow-800 mb-1">⚠ Needs Improvement:</p>
                        <ul className="list-disc list-inside text-sm text-yellow-700">
                          {optimization.key_insights.needs_improvement.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {optimization.recommendations && (
                <div>
                  <h4 className="font-medium mb-2">Recommendations</h4>
                  <div className="space-y-2">
                    {optimization.recommendations.map((rec, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <h5 className="font-semibold text-sm">{rec.title}</h5>
                        <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                        <p className="text-xs text-gray-500 mt-1"><strong>Impact:</strong> {rec.expected_impact}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}