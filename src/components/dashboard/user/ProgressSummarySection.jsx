import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { 
  BarChart3, 
  BookOpen, 
  Target, 
  Map,
  TrendingUp,
  Award,
  ArrowUpRight
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function ProgressSummarySection({ dashboardData, loading }) {
  const metrics = [
    {
      id: 'assessments',
      label: 'Assessment Score',
      value: dashboardData?.assessment?.overall_score || dashboardData?.assessment?.latestScore || 0,
      suffix: '%',
      subtext: dashboardData?.assessment?.latest_assessment_date 
        ? `Last taken ${new Date(dashboardData.assessment.latest_assessment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        : 'Not yet taken',
      icon: BarChart3,
      color: 'blue',
      link: createPageUrl('Assessments'),
      trend: dashboardData?.assessment?.trend
    },
    {
      id: 'learning',
      label: 'Learning Progress',
      value: dashboardData?.learning?.completion_rate || 0,
      suffix: '%',
      subtext: `${dashboardData?.learning?.completed_count || 0} of ${dashboardData?.learning?.total_count || 0} completed`,
      icon: BookOpen,
      color: 'purple',
      link: createPageUrl('MyLearning'),
      progress: dashboardData?.learning?.completion_rate || 0
    },
    {
      id: 'goals',
      label: 'Goals Completed',
      value: dashboardData?.goals?.completed_count || 0,
      suffix: `/${dashboardData?.goals?.total_count || 0}`,
      subtext: `${dashboardData?.goals?.active_count || 0} in progress`,
      icon: Target,
      color: 'green',
      link: createPageUrl('Performance'),
      progress: dashboardData?.goals?.total_count 
        ? Math.round((dashboardData.goals.completed_count / dashboardData.goals.total_count) * 100)
        : 0
    },
    {
      id: 'journeys',
      label: 'Active Journeys',
      value: dashboardData?.journeys?.in_progress_count || 0,
      suffix: '',
      subtext: `${dashboardData?.journeys?.completed_count || 0} completed`,
      icon: Map,
      color: 'amber',
      link: createPageUrl('MyJourneys')
    }
  ];

  const colorClasses = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
    green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-200' }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Your Progress at a Glance</h2>
        <p className="text-sm text-gray-500">Quick summary of your development journey</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          const colors = colorClasses[metric.color];
          
          return (
            <motion.div
              key={metric.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
            >
              <Link to={metric.link}>
                <Card className={`border-0 shadow-md hover:shadow-lg transition-all cursor-pointer group overflow-hidden`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2 rounded-lg ${colors.bg}`}>
                        <Icon className={`w-4 h-4 ${colors.text}`} />
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </div>
                    
                    <div className="mb-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-gray-900">
                          {loading ? '—' : metric.value}
                        </span>
                        <span className="text-sm text-gray-500">{metric.suffix}</span>
                        {metric.trend && metric.trend > 0 && (
                          <span className="flex items-center text-xs text-green-600 ml-1">
                            <TrendingUp className="w-3 h-3 mr-0.5" />
                            +{metric.trend}%
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-700 mt-0.5">{metric.label}</p>
                    </div>
                    
                    {metric.progress !== undefined && (
                      <Progress 
                        value={metric.progress} 
                        className="h-1.5 mb-2"
                        indicatorClassName={colors.bg.replace('bg-', 'bg-').replace('-100', '-500')}
                      />
                    )}
                    
                    <p className="text-xs text-gray-500">{metric.subtext}</p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}