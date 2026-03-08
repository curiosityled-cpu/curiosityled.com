import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, BookOpen, Target, Users, TrendingUp, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ProactiveInsightsAlert({ insights = [], onActionClick }) {
  if (insights.length === 0) return null;

  const highPriorityInsights = insights.filter(i => i.priority === 'high').slice(0, 3);
  
  if (highPriorityInsights.length === 0) return null;

  const getIcon = (type) => {
    switch(type) {
      case 'goals_at_risk': return <Target className="w-5 h-5 text-amber-600" />;
      case 'learning_overdue': return <BookOpen className="w-5 h-5 text-red-600" />;
      case 'team_needs_attention': return <Users className="w-5 h-5 text-orange-600" />;
      case 'upcoming_assessment': return <CheckCircle className="w-5 h-5 text-blue-600" />;
      case 'learning_opportunity': return <TrendingUp className="w-5 h-5 text-green-600" />;
      default: return <AlertTriangle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'bg-red-50 border-red-200';
      case 'medium': return 'bg-amber-50 border-amber-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 space-y-2"
    >
      {highPriorityInsights.map((insight, idx) => (
        <div
          key={idx}
          className={`flex items-start gap-3 p-3 rounded-lg border ${getPriorityColor(insight.priority)}`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {getIcon(insight.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 mb-1">
              {insight.message}
            </p>
            {insight.action_suggestion && (
              <button
                onClick={() => onActionClick(insight.action_suggestion)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                {insight.action_suggestion} →
              </button>
            )}
          </div>
          <Badge 
            variant="outline" 
            className={`text-xs flex-shrink-0 ${
              insight.priority === 'high' ? 'border-red-300 text-red-700' :
              insight.priority === 'medium' ? 'border-amber-300 text-amber-700' :
              'border-blue-300 text-blue-700'
            }`}
          >
            {insight.priority}
          </Badge>
        </div>
      ))}
    </motion.div>
  );
}