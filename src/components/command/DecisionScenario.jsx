import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Brain, AlertTriangle, CheckCircle, TrendingUp, Zap, Clock, Users, Target, AlertCircle } from 'lucide-react';
import { motion } from "framer-motion";
import AILoadingAnimation from '../demo/AILoadingAnimation';

export default function DecisionScenario({ onBack }) {
  const [scenario, setScenario] = useState("Team conflict over project scope between A. Nguyen and C. Rivera regarding Leadership Index rollout timeline");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setShowResults(true);
    }, 3500);
  };

  const decisionSupportData = {
    scenario_id: "scn-001",
    title: "Team conflict over project scope",
    context: {
      urgency: 3,
      stakeholder_count: 5,
      relationship_complexity: 4,
      information_completeness: 3,
      resource_constraints: 2
    },
    approaches: [
      {
        id: "A",
        label: "Facilitate direct mediation with both parties",
        predicted_outcome: {
          success_probability_pct: 62,
          primary_risks: [
            "Power imbalance may surface",
            "Time-boxing required"
          ],
          timeline_estimate_days: 5,
          competency_gaps: [
            "Communication"
          ]
        }
      },
      {
        id: "B",
        label: "1:1s first, then group resolution",
        predicted_outcome: {
          success_probability_pct: 74,
          primary_risks: [
            "Delay may entrench positions"
          ],
          timeline_estimate_days: 7,
          competency_gaps: [
            "Stakeholder Management"
          ]
        }
      },
      {
        id: "C",
        label: "Escalate to senior leadership",
        predicted_outcome: {
          success_probability_pct: 48,
          primary_risks: [
            "Loss of team ownership",
            "Trust erosion"
          ],
          timeline_estimate_days: 3,
          competency_gaps: []
        }
      },
      {
        id: "D",
        label: "Define roles, separate responsibilities",
        predicted_outcome: {
          success_probability_pct: 70,
          primary_risks: [
            "Creativity trade-offs"
          ],
          timeline_estimate_days: 4,
          competency_gaps: [
            "Decision-Making"
          ]
        }
      }
    ]
  };

  const getContextLabel = (key, value) => {
    const labels = {
      urgency: ["Low", "Low-Med", "Medium", "Med-High", "High"],
      stakeholder_count: value,
      relationship_complexity: ["Simple", "Low", "Medium", "Complex", "Very Complex"],
      information_completeness: ["Poor", "Limited", "Adequate", "Good", "Complete"],
      resource_constraints: ["None", "Minimal", "Some", "Significant", "Severe"]
    };
    
    if (key === "stakeholder_count") return value;
    return labels[key][value - 1] || value;
  };

  const getSuccessBadgeStyle = (probability) => {
    if (probability >= 70) return "bg-green-100 text-green-800";
    if (probability >= 60) return "bg-yellow-100 text-yellow-800"; 
    return "bg-red-100 text-red-800";
  };

  const getRecommendedApproach = () => {
    return decisionSupportData.approaches.reduce((best, current) => 
      current.predicted_outcome.success_probability_pct > best.predicted_outcome.success_probability_pct ? current : best
    );
  };

  if (isAnalyzing) {
    return (
      <div className="space-y-6">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
        <AILoadingAnimation 
          message="Analyzing scenario complexity and team dynamics..."
          submessage="Calculating success probabilities across multiple approaches"
        />
      </div>
    );
  }

  if (showResults) {
    const recommendedApproach = getRecommendedApproach();
    
    return (
      <div className="space-y-6">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>

        {/* Context Analysis */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                Scenario Context Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(decisionSupportData.context).map(([key, value]) => (
                  <div key={key} className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{getContextLabel(key, value)}</div>
                    <div className="text-sm text-gray-500 capitalize">
                      {key.replace(/_/g, ' ')}
                    </div>
                    {key !== "stakeholder_count" && (
                      <Progress value={value * 20} className="h-1 mt-1" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Approach Analysis */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-600" />
                Decision Approach Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {decisionSupportData.approaches
                .sort((a, b) => b.predicted_outcome.success_probability_pct - a.predicted_outcome.success_probability_pct)
                .map((approach, index) => (
                <motion.div
                  key={approach.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`border rounded-lg p-4 ${
                    approach.id === recommendedApproach.id ? 'border-green-300 bg-green-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-white ${
                        approach.id === recommendedApproach.id ? 'bg-green-600' : 'bg-gray-400'
                      }`}>
                        {approach.id}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{approach.label}</h4>
                        {approach.id === recommendedApproach.id && (
                          <Badge className="mt-1 bg-green-200 text-green-800">
                            <Zap className="w-3 h-3 mr-1" />
                            AI Recommended
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge className={getSuccessBadgeStyle(approach.predicted_outcome.success_probability_pct)}>
                      {approach.predicted_outcome.success_probability_pct}% Success
                    </Badge>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    {/* Timeline */}
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="font-medium">Timeline</div>
                        <div className="text-gray-600">{approach.predicted_outcome.timeline_estimate_days} days</div>
                      </div>
                    </div>

                    {/* Risks */}
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 mt-1" />
                      <div>
                        <div className="font-medium">Primary Risks</div>
                        <ul className="text-gray-600 text-xs">
                          {approach.predicted_outcome.primary_risks.map((risk, idx) => (
                            <li key={idx}>• {risk}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Competency Gaps */}
                    <div className="flex items-start gap-2">
                      <Users className="w-4 h-4 text-blue-500 mt-1" />
                      <div>
                        <div className="font-medium">Skills Needed</div>
                        <div className="text-gray-600">
                          {approach.predicted_outcome.competency_gaps.length > 0 
                            ? approach.predicted_outcome.competency_gaps.join(', ')
                            : 'None specific'
                          }
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Success Probability Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-gray-600">Success Probability</span>
                      <span className="font-medium">{approach.predicted_outcome.success_probability_pct}%</span>
                    </div>
                    <Progress 
                      value={approach.predicted_outcome.success_probability_pct} 
                      className="h-2"
                    />
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Recommendation Summary */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.8 }}
          className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg"
        >
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-green-600" />
            <h4 className="font-semibold text-green-800">AI Recommendation: Approach {recommendedApproach.id}</h4>
          </div>
          <p className="text-green-700 text-sm mb-2">{recommendedApproach.label}</p>
          <div className="flex items-center gap-4 text-xs text-green-600">
            <span>✓ {recommendedApproach.predicted_outcome.success_probability_pct}% success rate</span>
            <span>✓ {recommendedApproach.predicted_outcome.timeline_estimate_days} day timeline</span>
            {recommendedApproach.predicted_outcome.competency_gaps.length > 0 && (
              <span>⚡ Focus on {recommendedApproach.predicted_outcome.competency_gaps.join(', ')}</span>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button 
        variant="outline" 
        onClick={onBack}
        className="flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Button>

      <Card className="shadow-lg border-0">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Real-Time Decision Support
          </CardTitle>
          <p className="text-gray-600">Enter a leadership scenario and get AI-powered outcome predictions</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Describe your leadership challenge:
            </label>
            <Textarea
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              placeholder="E.g., Team disagreement over project timeline, performance issue with direct report, budget allocation conflict..."
              rows={4}
              className="w-full"
            />
          </div>
          
          <Button 
            onClick={handleAnalyze}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={!scenario.trim()}
          >
            <Brain className="w-4 h-4 mr-2" />
            Analyze Scenario & Predict Outcomes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}