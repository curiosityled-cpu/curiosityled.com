import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, AlertCircle, CheckCircle, Plus, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

const GoalsOverview = React.memo(({ goalsData, loading }) => {
  const { activeGoals, completedGoals, atRiskGoals, metrics, all } = useMemo(() => {
    if (!goalsData) return { 
      activeGoals: [], 
      completedGoals: [], 
      atRiskGoals: [], 
      metrics: { total: 0, activeCount: 0, completedCount: 0, atRiskCount: 0, successRate: 0 },
      all: []
    };
    
    return {
      activeGoals: goalsData.active || [],
      completedGoals: goalsData.completed || [],
      atRiskGoals: goalsData.atRisk || [],
      metrics: goalsData.metrics || { total: 0, activeCount: 0, completedCount: 0, atRiskCount: 0, successRate: 0 },
      all: goalsData.all || []
    };
  }, [goalsData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0202ff' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Your Goals</h2>
          <p className="text-gray-600">Track and achieve your development objectives</p>
        </div>
        <Link to={createPageUrl("Performance")}>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            View All Goals
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Goals</p>
                <p className="text-2xl font-bold" style={{ color: '#0202ff' }}>{metrics.activeCount}</p>
              </div>
              <Target className="w-8 h-8" style={{ color: '#0202ff' }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{metrics.completedCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">At Risk</p>
                <p className="text-2xl font-bold text-orange-600">{metrics.atRiskCount}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold" style={{ color: '#A25DDC' }}>{metrics.successRate}%</p>
              </div>
              <TrendingUp className="w-8 h-8" style={{ color: '#A25DDC' }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goals List */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Goals</h3>
        {all.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Goals Yet</h3>
              <p className="text-gray-600 mb-4">Start setting development goals to track your progress</p>
              <Link to={createPageUrl("Performance")}>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Goal
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {all.slice(0, 3).map((goal, index) => {
              if (!goal || !goal.id) return null;
              
              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{goal.title || 'Untitled Goal'}</h4>
                          <p className="text-sm text-gray-600 line-clamp-2">{goal.description || 'No description'}</p>
                        </div>
                        <Badge
                          className={
                            goal.status === 'completed' ? 'bg-green-100 text-green-800' :
                            goal.status === 'at_risk' || goal.status === 'overdue' ? 'bg-orange-100 text-orange-800' :
                            ''
                          }
                          style={!['completed', 'at_risk', 'overdue'].includes(goal.status) ? { backgroundColor: 'rgba(2, 2, 255, 0.1)', color: '#0202ff' } : {}}
                        >
                          {goal.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {(goal.status === 'at_risk' || goal.status === 'overdue') && <AlertCircle className="w-3 h-3 mr-1" />}
                          {goal.status ? goal.status.replace('_', ' ') : 'Unknown'}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-medium">{goal.completion_percentage || 0}%</span>
                        </div>
                        <Progress value={goal.completion_percentage || 0} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
            
            {all.length > 3 && (
              <Link to={createPageUrl("Performance")}>
                <Button variant="outline" className="w-full">
                  View All {all.length} Goals
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

GoalsOverview.displayName = 'GoalsOverview';

export default GoalsOverview;