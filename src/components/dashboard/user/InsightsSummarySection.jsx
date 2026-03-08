import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { 
  Sparkles, 
  TrendingUp, 
  Award,
  Lightbulb,
  ArrowRight,
  Brain,
  Target,
  BookOpen,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function InsightsSummarySection({ user, dashboardData }) {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    if (user?.email) {
      generateInsights();
    }
  }, [user?.email, dashboardData]);

  const generateInsights = async () => {
    setLoading(true);
    try {
      // Generate insights based on dashboard data
      const generatedInsights = [];
      const generatedRecommendations = [];

      // Assessment insights
      if (dashboardData?.assessment?.overall_score) {
        const score = dashboardData.assessment.overall_score;
        if (score >= 80) {
          generatedInsights.push({
            id: 'assessment-high',
            type: 'achievement',
            icon: Award,
            title: 'Strong Leadership Score',
            description: `Your assessment score of ${score}% puts you in the top tier of leaders.`,
            color: 'green'
          });
        } else if (score >= 60) {
          generatedInsights.push({
            id: 'assessment-mid',
            type: 'insight',
            icon: TrendingUp,
            title: 'Room for Growth',
            description: `Your ${score}% score shows solid foundations with opportunities to develop.`,
            color: 'blue'
          });
        }
      } else {
        generatedRecommendations.push({
          id: 'take-assessment',
          icon: Brain,
          title: 'Complete Your Leadership Assessment',
          description: 'Get personalized insights about your leadership style and competencies.',
          link: createPageUrl('Assessments'),
          priority: 'high'
        });
      }

      // Learning progress insights
      const learningCompletion = dashboardData?.learning?.completion_rate || 0;
      if (learningCompletion >= 75) {
        generatedInsights.push({
          id: 'learning-strong',
          type: 'achievement',
          icon: BookOpen,
          title: 'Dedicated Learner',
          description: `You've completed ${learningCompletion}% of your assigned learning. Keep it up!`,
          color: 'purple'
        });
      } else if (learningCompletion > 0 && learningCompletion < 50) {
        generatedRecommendations.push({
          id: 'continue-learning',
          icon: BookOpen,
          title: 'Continue Your Learning',
          description: `You're ${learningCompletion}% through your assignments. Pick up where you left off.`,
          link: createPageUrl('MyLearning'),
          priority: 'medium'
        });
      }

      // Goals insights
      const goalsCompleted = dashboardData?.goals?.completed_count || 0;
      const goalsTotal = dashboardData?.goals?.total_count || 0;
      if (goalsCompleted > 0) {
        generatedInsights.push({
          id: 'goals-progress',
          type: 'insight',
          icon: Target,
          title: 'Making Progress',
          description: `You've achieved ${goalsCompleted} of ${goalsTotal} goals. Stay focused!`,
          color: 'green'
        });
      } else if (goalsTotal === 0) {
        generatedRecommendations.push({
          id: 'set-goals',
          icon: Target,
          title: 'Set Your First Goal',
          description: 'Create goals to track your professional development journey.',
          link: createPageUrl('Performance'),
          priority: 'medium'
        });
      }

      // Journey recommendations
      if ((dashboardData?.journeys?.in_progress_count || 0) === 0) {
        generatedRecommendations.push({
          id: 'start-journey',
          icon: Lightbulb,
          title: 'Explore Learning Journeys',
          description: 'Structured paths to develop your leadership skills.',
          link: createPageUrl('MyJourneys'),
          priority: 'low'
        });
      }

      setInsights(generatedInsights.slice(0, 3));
      setRecommendations(generatedRecommendations.slice(0, 3));
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const colorClasses = {
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    amber: 'bg-amber-100 text-amber-600'
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (insights.length === 0 && recommendations.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-6"
    >
      {/* Insights */}
      {insights.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Your Insights</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.map((insight, index) => {
              const Icon = insight.icon;
              return (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                >
                  <Card className="border-0 shadow-md h-full">
                    <CardContent className="p-4">
                      <div className={`inline-flex p-2 rounded-lg ${colorClasses[insight.color]} mb-3`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <h3 className="font-medium text-gray-900 mb-1">{insight.title}</h3>
                      <p className="text-sm text-gray-500">{insight.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-gray-900">Recommended for You</h2>
          </div>
          
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {recommendations.map((rec, index) => {
                  const Icon = rec.icon;
                  return (
                    <motion.div
                      key={rec.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + index * 0.05 }}
                    >
                      <Link 
                        to={rec.link}
                        className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors group"
                      >
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <Icon className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900">{rec.title}</h4>
                          <p className="text-sm text-gray-500">{rec.description}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all" />
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Link to full insights */}
      <div className="text-center">
        <Link to={createPageUrl('Insights')}>
          <Button variant="link" className="text-[#0202ff] hover:text-[#0101dd] gap-1">
            View All Insights
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}