import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Users, Calendar, Target, Clock, Folder, Activity, CheckCircle2 } from "lucide-react";
import { format, differenceInDays, subDays, isAfter, isBefore } from 'date-fns';
import { motion } from "framer-motion";

export default function AnalyticsPage() {
  const [goals, setGoals] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedGoal, setSelectedGoal] = useState('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState('30');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [goalsData, itemsData] = await Promise.all([
      base44.entities.Goal.list("-updated_date"),
      base44.entities.Item.list("-updated_date")
    ]);
    setGoals(goalsData);
    setItems(itemsData);
    setIsLoading(false);
  };

  // Filter data based on selections
  const filteredItems = items.filter(item => {
    // Filter by goal
    if (selectedGoal !== 'all' && item.board_id !== selectedGoal) {
      return false;
    }
    
    // Filter by time range
    const daysAgo = parseInt(selectedTimeRange);
    const cutoffDate = subDays(new Date(), daysAgo);
    return isAfter(new Date(item.updated_date), cutoffDate);
  });

  const filteredGoals = selectedGoal === 'all' ? goals : goals.filter(g => g.id === selectedGoal);

  // Calculate analytics
  const totalTasks = filteredItems.length;
  const completedTasks = filteredItems.filter(item => {
    const statusColumn = goals.find(g => g.id === item.board_id)?.columns?.find(col => col.type === 'status');
    return item.data?.[statusColumn?.id] === 'Done';
  }).length;
  
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Overdue tasks
  const overdueTasks = filteredItems.filter(item => {
    const goal = goals.find(g => g.id === item.board_id);
    const dueDateColumn = goal?.columns?.find(col => col.type === 'date');
    const statusColumn = goal?.columns?.find(col => col.type === 'status');
    
    const dueDate = item.data?.[dueDateColumn?.id];
    const status = item.data?.[statusColumn?.id];
    
    if (!dueDate || status === 'Done') return false;
    return isBefore(new Date(dueDate), new Date());
  }).length;

  // Goal performance
  const goalStats = filteredGoals.map(goal => {
    const goalItems = filteredItems.filter(item => item.board_id === goal.id);
    const statusColumn = goal.columns?.find(col => col.type === 'status');
    const completed = goalItems.filter(item => item.data?.[statusColumn?.id] === 'Done').length;
    const total = goalItems.length;
    
    return {
      ...goal,
      totalTasks: total,
      completedTasks: completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  });

  // Status distribution
  const statusDistribution = {};
  filteredItems.forEach(item => {
    const goal = goals.find(g => g.id === item.board_id);
    const statusColumn = goal?.columns?.find(col => col.type === 'status');
    const status = item.data?.[statusColumn?.id] || 'Not Started';
    statusDistribution[status] = (statusDistribution[status] || 0) + 1;
  });

  // Priority distribution
  const priorityDistribution = {};
  filteredItems.forEach(item => {
    const goal = goals.find(g => g.id === item.board_id);
    const priorityColumn = goal?.columns?.find(col => col.type === 'priority');
    const priority = item.data?.[priorityColumn?.id] || 'Medium';
    priorityDistribution[priority] = (priorityDistribution[priority] || 0) + 1;
  });

  if (isLoading) {
    return (
      <div className="p-6 bg-[#F5F6F8] min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#F5F6F8] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#323338]">Analytics Dashboard</h1>
            <p className="text-[#676879] mt-2">Insights and metrics across your goals and tasks</p>
          </div>
          
          <div className="flex gap-3">
            <Select value={selectedGoal} onValueChange={setSelectedGoal}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select goal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Goals</SelectItem>
                {goals.map(goal => (
                  <SelectItem key={goal.id} value={goal.id}>
                    {goal.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Total Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalTasks}</div>
                <p className="text-blue-100 text-sm">Active tasks tracked</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Completion Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{completionRate}%</div>
                <Progress value={completionRate} className="mt-2 bg-green-300" />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Overdue Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{overdueTasks}</div>
                <p className="text-red-100 text-sm">Need attention</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Folder className="w-5 h-5" />
                  Active Goals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{filteredGoals.length}</div>
                <p className="text-purple-100 text-sm">Goals in use</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts and detailed analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                Task Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(statusDistribution).map(([status, count]) => {
                  const percentage = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
                  const color = getStatusColor(status);
                  
                  return (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm font-medium">{status}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full transition-all duration-500"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: color 
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-12">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Priority Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                Priority Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(priorityDistribution).map(([priority, count]) => {
                  const percentage = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
                  const color = getPriorityColor(priority);
                  
                  return (
                    <div key={priority} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm font-medium">{priority}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full transition-all duration-500"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: color 
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-12">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Goal Performance */}
        {selectedGoal === 'all' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-green-500" />
                Goal Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {goalStats.map((goal, index) => (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-lg"
                        style={{ backgroundColor: goal.color || '#0073EA' }}
                      />
                      <div>
                        <h4 className="font-medium text-gray-900">{goal.title}</h4>
                        <p className="text-sm text-gray-500">
                          {goal.completedTasks} of {goal.totalTasks} tasks completed
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all duration-500"
                          style={{ width: `${goal.completionRate}%` }}
                        />
                      </div>
                      <Badge variant="outline" className="min-w-[3rem] justify-center">
                        {goal.completionRate}%
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function getStatusColor(status) {
  switch (status.toLowerCase()) {
    case 'done':
    case 'completed':
      return '#00C875';
    case 'working on it':
    case 'working':
    case 'in progress':
      return '#FFCB00';
    case 'stuck':
      return '#E2445C';
    default:
      return '#C4C4C4';
  }
}

function getPriorityColor(priority) {
  switch (priority.toLowerCase()) {
    case 'critical':
      return '#E2445C';
    case 'high':
      return '#FDAB3D';
    case 'medium':
      return '#FFCB00';
    case 'low':
      return '#787D80';
    default:
      return '#C4C4C4';
  }
}