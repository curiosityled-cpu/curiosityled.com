import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Target, AlertCircle, CheckCircle, TrendingUp, Link as LinkIcon, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function LeaderGoalProgress({ leader, onSuggestGoals }) {
  if (!leader) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'at_risk':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'strategic':
        return 'bg-purple-100 text-purple-800';
      case 'operational':
        return 'bg-blue-100 text-blue-800';
      case 'people':
        return 'bg-green-100 text-green-800';
      case 'development':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const activeGoals = leader.goals?.filter(g => ['active', 'at_risk', 'overdue'].includes(g.status)) || [];
  const completedGoals = leader.goals?.filter(g => g.status === 'completed') || [];
  const hasGoals = (leader.goals?.length || 0) > 0;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Goal Progress & Development
          </CardTitle>
          {leader.needs_goal_alignment && (
            <Button
              size="sm"
              onClick={() => onSuggestGoals && onSuggestGoals(leader)}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              AI Suggest Goals
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{leader.goals_count || 0}</div>
            <div className="text-xs text-gray-600 mt-1">Total Goals</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{leader.completed_goals_count || 0}</div>
            <div className="text-xs text-gray-600 mt-1">Completed</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{leader.overall_goal_progress || 0}%</div>
            <div className="text-xs text-gray-600 mt-1">Avg Progress</div>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-lg">
            <div className="text-2xl font-bold text-amber-600">{leader.goals_completion_rate || 0}%</div>
            <div className="text-xs text-gray-600 mt-1">Success Rate</div>
          </div>
        </div>

        {/* Development Areas */}
        {leader.development_areas && leader.development_areas.length > 0 && (
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-orange-600" />
              <h4 className="font-semibold text-orange-900 text-sm">Priority Development Areas</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {leader.development_areas.map((area, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {area.replace('_', ' ').toUpperCase()}
                </Badge>
              ))}
            </div>
            {leader.needs_goal_alignment && (
              <p className="text-xs text-orange-700 mt-2">
                ⚠️ No active goals aligned with these development areas. Consider creating targeted goals.
              </p>
            )}
          </div>
        )}

        {/* Active Goals */}
        {activeGoals.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Active Goals ({activeGoals.length})
            </h4>
            <div className="space-y-3">
              {activeGoals.map((goal, idx) => (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-3 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h5 className="font-medium text-sm text-gray-900">{goal.title}</h5>
                      {goal.description && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{goal.description}</p>
                      )}
                    </div>
                    <Badge className={getStatusColor(goal.status)}>
                      {goal.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getCategoryColor(goal.category)} variant="outline">
                      {goal.category}
                    </Badge>
                    {goal.due_date && (
                      <span className="text-xs text-gray-500">
                        Due: {new Date(goal.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium">{goal.completion_percentage || 0}%</span>
                    </div>
                    <Progress value={goal.completion_percentage || 0} className="h-2" />
                  </div>

                  {/* Linked Competencies */}
                  {goal.linked_competencies && goal.linked_competencies.length > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <LinkIcon className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-500">Develops:</span>
                      <div className="flex flex-wrap gap-1">
                        {goal.linked_competencies.map((comp, i) => (
                          <Badge key={i} variant="outline" className="text-xs px-1 py-0">
                            {comp.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                      {goal.alignment_with_development && (
                        <Badge className="bg-green-100 text-green-800 text-xs ml-auto">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Aligned
                        </Badge>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Completed Goals ({completedGoals.length})
            </h4>
            <div className="space-y-2">
              {completedGoals.slice(0, 3).map((goal, idx) => (
                <div key={goal.id} className="p-2 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-900">{goal.title}</span>
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Done
                    </Badge>
                  </div>
                  {goal.linked_competencies && goal.linked_competencies.length > 0 && (
                    <div className="flex items-center gap-2 text-xs mt-1">
                      <span className="text-gray-500">Developed:</span>
                      {goal.linked_competencies.slice(0, 2).map((comp, i) => (
                        <Badge key={i} variant="outline" className="text-xs px-1 py-0">
                          {comp.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {completedGoals.length > 3 && (
                <p className="text-xs text-gray-500 text-center">
                  +{completedGoals.length - 3} more completed
                </p>
              )}
            </div>
          </div>
        )}

        {/* No Goals State */}
        {!hasGoals && (
          <div className="text-center py-8">
            <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h4 className="font-semibold text-gray-900 mb-2">No Goals Set</h4>
            <p className="text-sm text-gray-600 mb-4">
              This leader hasn't set any development goals yet.
            </p>
            {leader.development_areas && leader.development_areas.length > 0 && (
              <Button
                size="sm"
                onClick={() => onSuggestGoals && onSuggestGoals(leader)}
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Generate AI Goal Suggestions
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}