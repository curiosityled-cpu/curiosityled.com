import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Loader2, AlertCircle, CheckCircle, Lightbulb, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function PlanSuggestionsPanel({ plan, type = "onboarding", onApplySuggestion }) {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const analyzePlan = async () => {
    if (!plan || (!plan.milestones && !plan.content_structure)) {
      toast.error("Please add content to your plan before getting suggestions");
      return;
    }

    setLoading(true);
    try {
      const prompt = type === "onboarding" 
        ? buildOnboardingAnalysisPrompt(plan)
        : buildJourneyAnalysisPrompt(plan);

      const response = await base44.integrations.invoke('Core', 'InvokeLLM', {
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_assessment: { type: "string" },
            strengths: {
              type: "array",
              items: { type: "string" }
            },
            gaps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  issue: { type: "string" },
                  severity: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            improvement_suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  impact: { type: "string" }
                }
              }
            },
            alternative_structures: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  milestones: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        due_day: { type: "number" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (response.data) {
        setSuggestions(response.data);
        toast.success("AI analysis complete!");
      }
    } catch (error) {
      console.error('Error analyzing plan:', error);
      toast.error('Failed to generate suggestions');
    } finally {
      setLoading(false);
    }
  };

  const buildOnboardingAnalysisPrompt = (plan) => {
    return `You are an expert in employee onboarding and organizational development. Analyze the following onboarding plan and provide comprehensive feedback.

**Onboarding Plan Details:**
- Title: ${plan.title}
- Target Role: ${plan.target_role || 'Not specified'}
- Duration: ${plan.duration_days} days
- Description: ${plan.description || 'No description'}
- Context: ${plan.context || 'No additional context'}
- Number of Milestones: ${plan.milestones?.length || 0}

**Current Milestones:**
${plan.milestones?.map((m, i) => `
${i + 1}. ${m.title} (Day ${m.due_day})
   Description: ${m.description || 'No description'}
   Type: ${m.type || 'Not specified'}
`).join('\n') || 'No milestones defined'}

**Analysis Required:**

1. **Overall Assessment**: Provide a brief evaluation of the plan's effectiveness and comprehensiveness.

2. **Strengths**: Identify 2-4 strong points in the current plan structure.

3. **Gaps**: Identify critical missing elements. For each gap, provide:
   - Issue: What's missing or problematic
   - Severity: "critical", "moderate", or "minor"
   - Recommendation: Specific action to address it

4. **Improvement Suggestions**: Provide 3-5 actionable improvements with:
   - Title: Brief name of the suggestion
   - Description: Detailed explanation
   - Impact: Expected benefit ("high", "medium", "low")

5. **Alternative Structures**: Suggest 1-2 alternative milestone structures that follow different onboarding philosophies (e.g., 30-60-90 day framework, role-specific progression, etc.). For each:
   - Name: Framework name
   - Description: Philosophy and approach
   - Milestones: 5-8 key milestones with titles, descriptions, and suggested day numbers

Focus on:
- Proper sequencing and pacing
- Balance between learning, doing, and connecting
- Clear success criteria
- Stakeholder engagement
- Feedback loops
- Role-specific skills vs. general onboarding
- Cultural integration
- Early wins and confidence building`;
  };

  const buildJourneyAnalysisPrompt = (plan) => {
    return `You are an expert in learning design and curriculum development. Analyze the following learning journey and provide comprehensive feedback.

**Learning Journey Details:**
- Title: ${plan.title}
- Type: ${plan.type === 'curriculum' ? 'Curriculum (any order)' : 'Learning Path (sequential)'}
- Duration: ${plan.estimated_duration_days} days
- Description: ${plan.description || 'No description'}
- Number of Resources: ${plan.content_structure?.length || 0}

**Current Content Structure:**
${plan.content_structure?.map((item, i) => `
${i + 1}. ${item.title}
   Type: ${item.type || 'Not specified'}
   Required: ${item.is_optional ? 'No' : 'Yes'}
   Order: ${item.order || i + 1}
`).join('\n') || 'No resources added'}

**Analysis Required:**

1. **Overall Assessment**: Evaluate the journey's pedagogical effectiveness and coherence.

2. **Strengths**: Identify 2-4 strong aspects of the current design.

3. **Gaps**: Identify missing elements. For each:
   - Issue: What's missing or needs improvement
   - Severity: "critical", "moderate", or "minor"
   - Recommendation: Specific action

4. **Improvement Suggestions**: Provide 3-5 actionable improvements with:
   - Title: Brief name
   - Description: Detailed explanation
   - Impact: Expected benefit ("high", "medium", "low")

5. **Alternative Structures**: Suggest 1-2 alternative sequencing approaches. For each:
   - Name: Framework name
   - Description: Learning design philosophy
   - Milestones: Suggest 5-8 learning checkpoints/milestones that could be created from the content

Focus on:
- Logical progression and scaffolding
- Balance of content types (theory, practice, application)
- Cognitive load management
- Knowledge retention strategies
- Practical application opportunities
- Assessment and reflection points
- Prerequisite relationships
- Optional vs. required content balance`;
  };

  if (!plan || (!plan.milestones && !plan.content_structure)) {
    return null;
  }

  const hasContent = type === "onboarding" 
    ? plan.milestones?.length > 0 
    : plan.content_structure?.length > 0;

  if (!hasContent) {
    return null;
  }

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <CardTitle className="text-lg">AI Suggestions</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {!loading && !suggestions && (
              <Button onClick={analyzePlan} size="sm" className="bg-purple-600 hover:bg-purple-700">
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze Plan
              </Button>
            )}
            {suggestions && !loading && (
              <Button onClick={analyzePlan} size="sm" variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <CardContent>
              {loading && (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">Analyzing your plan with AI...</p>
                </div>
              )}

              {!loading && !suggestions && (
                <div className="text-center py-8">
                  <Lightbulb className="w-12 h-12 text-purple-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-3">
                    Get AI-powered suggestions to improve your {type === "onboarding" ? "onboarding plan" : "learning journey"}
                  </p>
                  <Button onClick={analyzePlan} className="bg-purple-600 hover:bg-purple-700">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analyze with AI
                  </Button>
                </div>
              )}

              {!loading && suggestions && (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-6">
                    {/* Overall Assessment */}
                    {suggestions.overall_assessment && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          Overall Assessment
                        </h3>
                        <p className="text-sm text-gray-700 bg-white p-3 rounded-lg">
                          {suggestions.overall_assessment}
                        </p>
                      </div>
                    )}

                    {/* Strengths */}
                    {suggestions.strengths?.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          Strengths
                        </h3>
                        <div className="space-y-2">
                          {suggestions.strengths.map((strength, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm bg-white p-3 rounded-lg">
                              <span className="text-green-600 font-semibold">✓</span>
                              <span className="text-gray-700">{strength}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Gaps */}
                    {suggestions.gaps?.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-orange-600" />
                          Identified Gaps
                        </h3>
                        <div className="space-y-3">
                          {suggestions.gaps.map((gap, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-lg border-l-4 border-orange-400">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant={
                                  gap.severity === 'critical' ? 'destructive' :
                                  gap.severity === 'moderate' ? 'default' : 'outline'
                                }>
                                  {gap.severity}
                                </Badge>
                              </div>
                              <p className="font-medium text-gray-900 text-sm mb-1">{gap.issue}</p>
                              <p className="text-xs text-gray-600 mb-2">{gap.recommendation}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Improvement Suggestions */}
                    {suggestions.improvement_suggestions?.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-blue-600" />
                          Improvement Suggestions
                        </h3>
                        <div className="space-y-3">
                          {suggestions.improvement_suggestions.map((suggestion, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-lg">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium text-gray-900 text-sm">{suggestion.title}</h4>
                                <Badge variant="outline" className={
                                  suggestion.impact === 'high' ? 'border-green-500 text-green-700' :
                                  suggestion.impact === 'medium' ? 'border-blue-500 text-blue-700' :
                                  'border-gray-500 text-gray-700'
                                }>
                                  {suggestion.impact} impact
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-600">{suggestion.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Alternative Structures */}
                    {suggestions.alternative_structures?.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-purple-600" />
                          Alternative Structures
                        </h3>
                        <div className="space-y-4">
                          {suggestions.alternative_structures.map((structure, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-lg border-2 border-purple-200">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h4 className="font-semibold text-gray-900">{structure.name}</h4>
                                  <p className="text-xs text-gray-600 mt-1">{structure.description}</p>
                                </div>
                                {onApplySuggestion && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onApplySuggestion(structure)}
                                    className="ml-2"
                                  >
                                    Apply
                                  </Button>
                                )}
                              </div>
                              {structure.milestones?.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  <p className="text-xs font-medium text-gray-700">Suggested Milestones:</p>
                                  {structure.milestones.map((milestone, mIdx) => (
                                    <div key={mIdx} className="text-xs bg-purple-50 p-2 rounded">
                                      <p className="font-medium text-purple-900">
                                        {milestone.title}
                                        {milestone.due_day && ` (Day ${milestone.due_day})`}
                                      </p>
                                      {milestone.description && (
                                        <p className="text-purple-700 mt-1">{milestone.description}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}