import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

const TIMEFRAME_LABELS = {
  '3months': 'Last 3 Months',
  '6months': 'Last 6 Months',
  '12months': 'Last 12 Months',
  '24months': 'Last 24 Months',
  'all': 'All Time',
  'custom': 'Custom Range'
};

export default function BusinessGoalTrends({ goalData, timeRange }) {
  if (!goalData) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-green-600" />
            Goal Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">No goal data available</p>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    { 
      label: 'Total Goals', 
      value: goalData.totalGoals, 
      icon: Target, 
      color: 'blue',
      bg: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    { 
      label: 'Completion Rate', 
      value: `${goalData.completionRate}%`, 
      icon: CheckCircle, 
      color: 'green',
      bg: 'bg-green-50',
      iconColor: 'text-green-600'
    },
    { 
      label: 'On Track', 
      value: `${goalData.onTrackRate}%`, 
      icon: Clock, 
      color: 'amber',
      bg: 'bg-amber-50',
      iconColor: 'text-amber-600'
    },
    { 
      label: 'Overdue', 
      value: goalData.overdueGoals, 
      icon: AlertTriangle, 
      color: 'red',
      bg: 'bg-red-50',
      iconColor: 'text-red-600'
    }
  ];

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="w-5 h-5 text-green-600" />
          Goal Trends
        </CardTitle>
        <p className="text-sm text-gray-500">
          Aggregated goal performance across the platform
          {timeRange && ` • ${TIMEFRAME_LABELS[timeRange] || timeRange}`}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg ${metric.bg}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-5 h-5 ${metric.iconColor}`} />
                  <span className="text-sm text-gray-600">{metric.label}</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Active Goals</span>
            <Badge variant="outline">{goalData.activeGoals}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-gray-600">Completed Goals</span>
            <Badge className="bg-green-100 text-green-800">{goalData.completedGoals}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}