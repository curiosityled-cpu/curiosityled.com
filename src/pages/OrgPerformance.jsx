import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  TrendingUp, 
  Target, 
  Award,
  Download,
  BarChart3,
  PieChart,
  Activity
} from "lucide-react";
import { motion } from "framer-motion";

export default function OrgPerformance() {
  const [user, setUser] = useState(null);
  const [allGoals, setAllGoals] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30");
  const [selectedDepartment, setSelectedDepartment] = useState("all");

  useEffect(() => {
    loadOrgData();
  }, []);

  const loadOrgData = async () => {
    setIsLoading(true);
    const currentUser = await base44.auth.me();
    setUser(currentUser);

    // Only admins should access this page
    if (currentUser.role !== 'admin') {
      setIsLoading(false);
      return;
    }

    const [goalsData, usersData] = await Promise.all([
      base44.entities.Goal.list("-updated_date"),
      base44.entities.User.list()
    ]);

    setAllGoals(goalsData);
    setAllUsers(usersData);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto text-center py-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">Only administrators can access organizational performance data.</p>
        </div>
      </div>
    );
  }

  // Calculate org-wide metrics
  const totalGoals = allGoals.length;
  const completedGoals = allGoals.filter(g => g.status === 'completed' || g.status === 'archived').length;
  const activeUsers = allUsers.filter(u => u.role === 'user').length;

  const goalCompletionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;
  const activeGoals = allGoals.filter(g => g.status === 'active').length;

  // Group by user
  const userPerformance = allUsers
    .filter(u => u.role === 'user')
    .map(u => {
      const userGoals = allGoals.filter(g => g.created_by === u.email);
      const completed = userGoals.filter(g => g.status === 'completed' || g.status === 'archived').length;
      const completionRate = userGoals.length > 0 ? Math.round((completed / userGoals.length) * 100) : 0;
      return { ...u, goalsCount: userGoals.length, completedGoals: completed, completionRate };
    })
    .sort((a, b) => b.completionRate - a.completionRate);

  const goalStatusDistribution = allGoals.reduce((acc, g) => {
    acc[g.status] = (acc[g.status] || 0) + 1;
    return acc;
  }, {});

  const handleExportData = () => {
    const csvData = userPerformance.map(u => ({
      Name: u.full_name,
      Email: u.email,
      Goals: u.goalsCount,
      Completed: u.completedGoals,
      'Completion Rate': `${u.completionRate}%`
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `org-performance-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Organization Performance</h1>
            <p className="text-gray-600 mt-2">Company-wide performance metrics and insights</p>
          </div>
          <Button onClick={handleExportData} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <Select value={timeRange} onValueChange={setTimeRange}>
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

          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="engineering">Engineering</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Active Users</span>
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900">{activeUsers}</div>
                <p className="text-xs text-gray-500 mt-1">Team members</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Total Goals</span>
                  <Target className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900">{totalGoals}</div>
                <p className="text-xs text-gray-500 mt-1">Across organization</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Active Goals</span>
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900">{activeGoals}</div>
                <p className="text-xs text-gray-500 mt-1">In progress</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Goal Completion</span>
                  <Award className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900">{goalCompletionRate}%</div>
                <Progress value={goalCompletionRate} className="mt-2 h-1" />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList>
            <TabsTrigger value="users">User Performance</TabsTrigger>
            <TabsTrigger value="goals">Goal Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userPerformance.map((u, index) => (
                    <motion.div
                      key={u.email}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {u.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{u.full_name}</h4>
                          <p className="text-sm text-gray-500">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Goals</p>
                          <p className="font-semibold">{u.goalsCount}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Completed</p>
                          <p className="font-semibold">{u.completedGoals}</p>
                        </div>
                        <div className="w-32">
                          <Progress value={u.completionRate} className="h-2" />
                          <p className="text-xs text-gray-500 mt-1 text-center">
                            {u.completionRate}% done
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {userPerformance.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No user performance data available.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="goals" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Goal Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(goalStatusDistribution).map(([status, count]) => {
                      const percentage = totalGoals > 0 ? Math.round((count / totalGoals) * 100) : 0;
                      const colors = {
                        active: 'bg-blue-500',
                        completed: 'bg-green-500',
                        archived: 'bg-gray-400',
                        draft: 'bg-yellow-500'
                      };
                      return (
                        <div key={status}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium capitalize">{status}</span>
                            <span className="text-sm text-gray-600">{count} ({percentage}%)</span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${colors[status] || 'bg-gray-500'} transition-all duration-500`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {Object.keys(goalStatusDistribution).length === 0 && (
                      <p className="text-center text-gray-500 py-4">No goals data available.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Goals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {allGoals.slice(0, 5).map((goal) => (
                      <div key={goal.id} className="p-3 border rounded-lg">
                        <h4 className="font-medium text-gray-900 text-sm">{goal.title}</h4>
                        {goal.description && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{goal.description}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs capitalize">{goal.status}</Badge>
                          {goal.priority && <Badge className="text-xs capitalize">{goal.priority}</Badge>}
                        </div>
                      </div>
                    ))}
                    {allGoals.length === 0 && (
                      <p className="text-center text-gray-500 py-4">No goals found.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}