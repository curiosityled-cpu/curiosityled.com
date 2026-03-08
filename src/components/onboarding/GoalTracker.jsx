import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Calendar, ExternalLink, Play, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function GoalTracker() {
  const goals = [
    {
      id: 1,
      title: "Complete onboarding framework by Day 60",
      category: "strategic",
      completion: 45,
      dueDate: "2025-02-15",
      status: "in_progress",
      assignedLearning: "Change Management Masterclass",
      learningLink: "https://example.com/change-management"
    },
    {
      id: 2,
      title: "Hold 1:1 with all direct reports in first month", 
      category: "people",
      completion: 80,
      dueDate: "2025-01-31",
      status: "in_progress", 
      assignedLearning: "Effective 1:1 Conversations",
      learningLink: "https://example.com/one-on-ones"
    },
    {
      id: 3,
      title: "Launch pilot onboarding with 2 managers",
      category: "operational",
      completion: 25,
      dueDate: "2025-02-28",
      status: "in_progress",
      assignedLearning: "Pilot Program Best Practices",
      learningLink: "https://example.com/pilot-programs"
    },
    {
      id: 4,
      title: "Stakeholder mapping exercise completion",
      category: "strategic", 
      completion: 100,
      dueDate: "2025-01-15",
      status: "completed",
      assignedLearning: "Advanced Stakeholder Analysis",
      learningLink: "https://example.com/stakeholder-analysis"
    }
  ];

  const getCategoryColor = (category) => {
    const colors = {
      strategic: "bg-blue-100 text-blue-800",
      people: "bg-purple-100 text-purple-800", 
      operational: "bg-emerald-100 text-emerald-800"
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  const getStatusIcon = (status, completion) => {
    if (status === "completed" || completion === 100) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    return <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>;
  };

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          Smart Goals & Progress Tracking
        </CardTitle>
        <p className="text-gray-600">AI-generated goals with automatic progress tracking</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {goals.map((goal, index) => (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  {getStatusIcon(goal.status, goal.completion)}
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{goal.title}</h4>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getCategoryColor(goal.category)}>
                        {goal.category}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {new Date(goal.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-medium">{goal.completion}%</span>
                </div>
                <Progress value={goal.completion} className="h-2" />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-gray-600">Assigned Learning: </span>
                  <span className="font-medium">{goal.assignedLearning}</span>
                </div>
                <Button variant="outline" size="sm" className="text-blue-600">
                  <Play className="w-3 h-3 mr-1" />
                  Watch
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900">Overall Progress</h4>
              <p className="text-sm text-blue-700">You're ahead of schedule! 62% complete</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">62%</div>
              <div className="text-xs text-blue-500">vs 45% expected</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}