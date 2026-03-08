import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, User, Mail, Building2, Award, TrendingUp, Target, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import LeaderGoalProgress from "./LeaderGoalProgress";

export default function DrillDownPanel({ isOpen, onClose, data, title, type }) {
  const [selectedLeader, setSelectedLeader] = useState(null);
  const [showGoalSuggestions, setShowGoalSuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);

  const getReadinessBadge = (readiness) => {
    const colors = {
      ready_now: 'bg-green-100 text-green-800',
      high_potential: 'bg-blue-100 text-blue-800',
      developing: 'bg-yellow-100 text-yellow-800',
      at_risk: 'bg-red-100 text-red-800',
      not_assessed: 'bg-gray-100 text-gray-800'
    };
    
    return colors[readiness] || colors.not_assessed;
  };

  const handleSuggestGoals = async (leader) => {
    setShowGoalSuggestions(true);
    
    // In a real implementation, this would call an AI endpoint
    // For now, generate suggestions based on development areas
    const suggestions = generateGoalSuggestions(leader);
    setAiSuggestions(suggestions);
  };

  const generateGoalSuggestions = (leader) => {
    const competencyGoals = {
      decision_making: [
        {
          title: "Master data-driven decision framework using 3x3 analysis",
          description: "Implement structured decision-making process for high-stakes choices, documenting rationale and outcomes.",
          category: "strategic",
          competencies: ["decision_making", "stakeholder_management"]
        },
        {
          title: "Lead 2 strategic planning sessions using scenario analysis",
          description: "Facilitate strategic discussions with cross-functional teams, evaluating multiple scenarios before final decisions.",
          category: "strategic",
          competencies: ["decision_making", "communication"]
        }
      ],
      communication: [
        {
          title: "Practice executive storytelling in 5 stakeholder presentations",
          description: "Develop and deliver compelling narratives that drive alignment and action across leadership teams.",
          category: "people",
          competencies: ["communication", "stakeholder_management"]
        },
        {
          title: "Implement weekly team communication cadence",
          description: "Establish structured communication rhythm with clear updates, asks, and impact statements.",
          category: "operational",
          competencies: ["communication", "performance_management"]
        }
      ],
      resource_management: [
        {
          title: "Optimize team resource allocation for 20% efficiency gain",
          description: "Analyze current resource distribution, identify bottlenecks, and implement reallocation strategy.",
          category: "operational",
          competencies: ["resource_management", "performance_management"]
        },
        {
          title: "Develop quarterly budget forecasting model",
          description: "Create data-driven approach to resource planning with variance analysis and adjustment protocols.",
          category: "strategic",
          competencies: ["resource_management", "decision_making"]
        }
      ],
      stakeholder_management: [
        {
          title: "Build stakeholder influence map for key initiatives",
          description: "Identify and analyze all stakeholders, their interests, and develop targeted engagement strategies.",
          category: "strategic",
          competencies: ["stakeholder_management", "communication"]
        },
        {
          title: "Establish quarterly executive stakeholder reviews",
          description: "Create structured touchpoints with key stakeholders to align on priorities and address concerns.",
          category: "people",
          competencies: ["stakeholder_management", "communication"]
        }
      ],
      performance_management: [
        {
          title: "Implement OKR framework for team goal alignment",
          description: "Roll out Objectives and Key Results methodology to drive clarity, accountability, and outcomes.",
          category: "operational",
          competencies: ["performance_management", "communication"]
        },
        {
          title: "Conduct bi-weekly 1:1s with focus on development",
          description: "Establish consistent coaching rhythm focused on growth, feedback, and career progression.",
          category: "people",
          competencies: ["performance_management", "communication"]
        }
      ]
    };

    const suggestions = [];
    
    if (leader.development_areas && leader.development_areas.length > 0) {
      leader.development_areas.forEach(area => {
        const goals = competencyGoals[area] || [];
        suggestions.push(...goals);
      });
    }

    // Remove duplicates and limit to 3
    const uniqueSuggestions = Array.from(
      new Map(suggestions.map(s => [s.title, s])).values()
    ).slice(0, 3);

    return uniqueSuggestions;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1">{title}</h2>
                <p className="text-blue-100">
                  {data?.length || 0} leader{data?.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            {selectedLeader ? (
              <div className="p-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedLeader(null);
                    setShowGoalSuggestions(false);
                    setAiSuggestions(null);
                  }}
                  className="mb-4"
                >
                  ← Back to list
                </Button>

                <div className="grid lg:grid-cols-3 gap-6 mb-6">
                  <Card className="lg:col-span-1">
                    <CardContent className="p-6">
                      <div className="text-center mb-4">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
                          {selectedLeader.full_name?.split(' ').map(n => n[0]).join('')}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">{selectedLeader.full_name}</h3>
                        <p className="text-sm text-gray-600">{selectedLeader.current_role || selectedLeader.app_role}</p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{selectedLeader.email}</span>
                        </div>
                        {selectedLeader.department && (
                          <div className="flex items-center gap-2 text-sm">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">{selectedLeader.department}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                          <Award className="w-4 h-4 text-gray-400" />
                          <Badge className={getReadinessBadge(selectedLeader.readiness)}>
                            {selectedLeader.readiness?.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-6 space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-600">SI Score</span>
                            <span className="font-bold">{selectedLeader.si_score}%</span>
                          </div>
                          <Progress value={selectedLeader.si_score} className="h-2" />
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-600">Overall Score</span>
                            <span className="font-bold">{selectedLeader.overall_score}%</span>
                          </div>
                          <Progress value={selectedLeader.overall_score} className="h-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="lg:col-span-2">
                    <LeaderGoalProgress 
                      leader={selectedLeader} 
                      onSuggestGoals={handleSuggestGoals}
                    />
                  </div>
                </div>

                {/* AI Goal Suggestions */}
                {showGoalSuggestions && aiSuggestions && (
                  <Card className="border-2 border-purple-200 shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                          <Target className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">AI-Generated Goal Suggestions</h3>
                        <Badge className="bg-purple-100 text-purple-800 ml-auto">
                          Aligned with development needs
                        </Badge>
                      </div>

                      <div className="space-y-4">
                        {aiSuggestions.map((suggestion, idx) => (
                          <div key={idx} className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-gray-900 flex-1">{suggestion.title}</h4>
                              <Badge className="bg-purple-100 text-purple-800">
                                {suggestion.category}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-700 mb-3">{suggestion.description}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-600">Develops:</span>
                              {suggestion.competencies.map((comp, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {comp.replace('_', ' ')}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <p className="text-xs text-gray-500 mt-4 text-center">
                        These suggestions are based on identified development areas and organizational best practices.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="p-6">
                {data && data.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {data.map((leader, idx) => (
                      <motion.div
                        key={leader.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedLeader(leader)}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 mb-1">{leader.full_name}</h3>
                                <p className="text-sm text-gray-600">{leader.current_role || leader.app_role}</p>
                                {leader.department && (
                                  <p className="text-xs text-gray-500 mt-1">{leader.department}</p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge className={getReadinessBadge(leader.readiness)}>
                                  {leader.readiness?.replace('_', ' ')}
                                </Badge>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div>
                                <div className="text-xs text-gray-600 mb-1">SI Score</div>
                                <div className="flex items-center gap-2">
                                  <Progress value={leader.si_score} className="h-2 flex-1" />
                                  <span className="text-xs font-medium">{leader.si_score}%</span>
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-600 mb-1">Goal Progress</div>
                                <div className="flex items-center gap-2">
                                  <Progress value={leader.overall_goal_progress || 0} className="h-2 flex-1" />
                                  <span className="text-xs font-medium">{leader.overall_goal_progress || 0}%</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-3">
                                <span className="text-gray-600">
                                  <Target className="w-3 h-3 inline mr-1" />
                                  {leader.active_goals_count || 0} active
                                </span>
                                <span className="text-green-600">
                                  {leader.completed_goals_count || 0} done
                                </span>
                              </div>
                              {leader.needs_goal_alignment && (
                                <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-300">
                                  Needs alignment
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No leaders found matching the selected criteria.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}