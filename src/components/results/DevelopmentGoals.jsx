
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Play, 
  Clock,
  TrendingUp,
  Users,
  DollarSign,
  BarChart3,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function DevelopmentGoals() {
  const [expandedGoal, setExpandedGoal] = useState(null);

  const developmentGoals = [
    {
      id: 1,
      title: "Build a stakeholder influence map with key decision makers",
      description: "Create comprehensive mapping of internal and external stakeholders to improve decision-making effectiveness",
      category: "Strategic",
      competency: "Stakeholder Management",
      progress: 25,
      dueDate: "2025-02-15",
      status: "in_progress",
      priority: "high",
      assignedLearning: "Stakeholder Mapping Masterclass",
      businessImpact: {
        outcome: "Increase project approval rate by 30%",
        kpi: "Project Success Rate",
        rationale: "Better stakeholder alignment leads to smoother project execution and higher success rates"
      },
      tasks: [
        { id: 1, text: "Identify all internal stakeholders", completed: true },
        { id: 2, text: "Map external client relationships", completed: true },
        { id: 3, text: "Analyze influence levels and interests", completed: false },
        { id: 4, text: "Create engagement strategy", completed: false }
      ]
    },
    {
      id: 2,
      title: "Practice the 3x3 comms framework in weekly updates (3 bullets, 3 impacts, 3 asks)",
      description: "Implement structured communication approach to improve message clarity and team alignment",
      category: "Operational",
      competency: "Communication",
      progress: 10,
      dueDate: "2025-03-01",
      status: "not_started",
      priority: "medium",
      assignedLearning: "Executive Communication Excellence",
      businessImpact: {
        outcome: "Reduce meeting time by 25% through clearer communication",
        kpi: "Meeting Efficiency",
        rationale: "Structured communication reduces confusion and follow-up meetings"
      },
      tasks: [
        { id: 1, text: "Create 3x3 framework template", completed: false },
        { id: 2, text: "Apply to next 3 team updates", completed: false },
        { id: 3, text: "Gather team feedback", completed: false },
        { id: 4, text: "Refine approach based on results", completed: false }
      ]
    },
    {
      id: 3,
      title: "Shadow 2 senior leaders for situational intelligence development",
      description: "Observe senior leadership decision-making in complex situations to develop situational awareness",
      category: "Development",
      competency: "Situational Intelligence",
      progress: 75,
      dueDate: "2025-01-31",
      status: "in_progress",
      priority: "high",
      assignedLearning: "Situational Leadership in Action",
      businessImpact: {
        outcome: "Improve team response time to market changes by 40%",
        kpi: "Market Responsiveness",
        rationale: "Enhanced situational intelligence enables faster recognition and response to opportunities"
      },
      tasks: [
        { id: 1, text: "Schedule shadowing sessions with VP of Operations", completed: true },
        { id: 2, text: "Observe 3 strategic planning meetings", completed: true },
        { id: 3, text: "Document key decision-making patterns", completed: true },
        { id: 4, text: "Create personal action plan", completed: false }
      ]
    }
  ];

  const businessGoals = [
    {
      id: 1,
      title: "Increase Q1 Customer Satisfaction Score to 4.2/5.0",
      owner: "Customer Success Team",
      progress: 68,
      dueDate: "2025-03-31",
      supportingDevelopment: ["Communication", "Collaboration"],
      impact: "$450K revenue retention"
    },
    {
      id: 2,
      title: "Launch New Product Feature by February 28th",
      owner: "Product Development",
      progress: 45,
      dueDate: "2025-02-28",
      supportingDevelopment: ["Decision-Making", "Time/Resource Management"],
      impact: "$200K new revenue opportunity"
    },
    {
      id: 3,
      title: "Reduce Employee Turnover to <8% in Healthcare Division",
      owner: "HR & Division Leadership",
      progress: 33,
      dueDate: "2025-06-30",
      supportingDevelopment: ["Performance Management", "Communication"],
      impact: "$125K cost savings from reduced hiring"
    }
  ];

  const getCategoryColor = (category) => {
    const colors = {
      Strategic: "bg-blue-100 text-blue-800 border-blue-200",
      Operational: "bg-emerald-100 text-emerald-800 border-emerald-200",
      Development: "bg-purple-100 text-purple-800 border-purple-200"
    };
    return colors[category] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: "text-red-600",
      medium: "text-yellow-600",
      low: "text-green-600"
    };
    return colors[priority] || "text-gray-600";
  };

  const getStatusIcon = (status, progress) => {
    if (progress === 100) return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    if (status === "in_progress") return <Play className="w-5 h-5 text-blue-500" />;
    return <Circle className="w-5 h-5 text-gray-400" />;
  };

  return (
    <div className="space-y-8">
      {/* Business Goals Context */}
      <Card className="shadow-lg border-0 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Business Goals Your Development Supports
          </CardTitle>
          <p className="text-gray-600">How your leadership development directly impacts organizational success</p>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {businessGoals.map((goal) => (
              <div key={goal.id} className="p-4 bg-white rounded-lg border">
                <h4 className="font-semibold text-sm text-gray-900 mb-2">{goal.title}</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">{goal.progress}%</span>
                  </div>
                  <Progress value={goal.progress} className="h-2" />
                  <div className="flex items-center gap-1 text-green-600">
                    <DollarSign className="w-3 h-3" />
                    <span className="font-medium">{goal.impact}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {goal.supportingDevelopment.map((competency, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs px-1 py-0">
                        {competency}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Development Goals */}
      <Card className="shadow-lg border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Target className="w-6 h-6 text-purple-600" />
            Recommended Development Goals
          </CardTitle>
          <p className="text-gray-600">AI-suggested goals based on your assessment results</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {developmentGoals.map((goal, index) => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border rounded-lg hover:shadow-md transition-all duration-200"
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(goal.status, goal.progress)}
                    <div className="flex-1 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{goal.title}</h4>
                          <p className="text-sm text-gray-600 mb-2">{goal.description}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={getCategoryColor(goal.category)}>
                              {goal.category}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {goal.competency}
                            </Badge>
                            <div className={`flex items-center gap-1 text-xs ${getPriorityColor(goal.priority)}`}>
                              <Circle className="w-2 h-2 fill-current" />
                              {goal.priority} priority
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              {new Date(goal.dueDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedGoal(expandedGoal === goal.id ? null : goal.id)}
                        >
                          {expandedGoal === goal.id ? 
                            <ChevronUp className="w-4 h-4" /> : 
                            <ChevronDown className="w-4 h-4" />
                          }
                        </Button>
                      </div>

                      {/* Progress */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-medium">{goal.progress}%</span>
                        </div>
                        <Progress value={goal.progress} className="h-2" />
                      </div>

                      {/* Business Impact */}
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-green-800 text-sm">Business Impact</span>
                        </div>
                        <p className="text-green-700 text-sm font-medium">{goal.businessImpact.outcome}</p>
                        <p className="text-green-600 text-xs mt-1">{goal.businessImpact.rationale}</p>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {expandedGoal === goal.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-gray-200"
                      >
                        <div className="grid md:grid-cols-2 gap-6">
                          {/* Task List */}
                          <div>
                            <h5 className="font-medium text-gray-900 mb-3">Action Items</h5>
                            <div className="space-y-2">
                              {goal.tasks.map((task) => (
                                <div key={task.id} className="flex items-center gap-2 text-sm">
                                  {task.completed ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-gray-400" />
                                  )}
                                  <span className={task.completed ? "text-gray-500 line-through" : "text-gray-700"}>
                                    {task.text}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Learning Resource */}
                          <div>
                            <h5 className="font-medium text-gray-900 mb-3">Assigned Learning</h5>
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <p className="font-medium text-blue-800 text-sm">{goal.assignedLearning}</p>
                              <p className="text-blue-600 text-xs mt-1">15 minutes • Interactive module</p>
                              <Button size="sm" variant="outline" className="mt-2 text-blue-600 border-blue-300">
                                <Play className="w-3 h-3 mr-1" />
                                Start Learning
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-purple-900">Overall Development Progress</h4>
                <p className="text-purple-700 text-sm">You're on track! 37% complete across all goals</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-600">37%</div>
                <div className="text-xs text-purple-500">vs 25% expected at this stage</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
