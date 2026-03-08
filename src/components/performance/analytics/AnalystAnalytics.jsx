
import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, Building2, AlertCircle, Download, Loader2, PieChart as PieChartIcon, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";

export default function AnalystAnalytics({ user }) {
  const [loading, setLoading] = useState(true);
  const [orgGoals, setOrgGoals] = useState([]);
  const [orgItems, setOrgItems] = useState([]);

  useEffect(() => {
    loadOrgData();
  }, [user]);

  const loadOrgData = async () => {
    setLoading(true);
    try {
      const [goalsData, itemsData] = await Promise.all([
        base44.entities.Goal.filter({ client_id: user.client_id }, "-updated_date"),
        base44.entities.Item.list("-updated_date")
      ]);

      setOrgGoals(goalsData);
      setOrgItems(itemsData);
    } catch (error) {
      console.error("Error loading org data:", error);
    }
    setLoading(false);
  };

  const metrics = useMemo(() => {
    const totalGoals = orgGoals.length;
    const totalTasks = orgItems.length;
    const completedTasks = orgItems.filter(item => item.data?.status === 'completed').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const atRiskGoals = orgGoals.filter(g => {
      const progress = g.progress || 0;
      const endDate = g.timeframe_end;
      if (!endDate) return false;
      
      const daysUntilEnd = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
      return progress < 50 && daysUntilEnd < 30 && daysUntilEnd > 0;
    }).length;

    const deptDistribution = {};
    orgGoals.forEach(goal => {
      const dept = goal.department || 'Unassigned';
      deptDistribution[dept] = (deptDistribution[dept] || 0) + 1;
    });

    const deptPerformance = Object.entries(deptDistribution).map(([dept, count]) => {
      const deptGoals = orgGoals.filter(g => (g.department || 'Unassigned') === dept);
      const avgProgress = deptGoals.length > 0
        ? Math.round(deptGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / deptGoals.length)
        : 0;
      
      return { department: dept, count, avgProgress };
    }).sort((a, b) => b.avgProgress - a.avgProgress);

    const priorityBreakdown = {};
    orgItems.forEach(item => {
      const priority = item.priority || 'medium';
      priorityBreakdown[priority] = (priorityBreakdown[priority] || 0) + 1;
    });

    const goalTypeBreakdown = orgGoals.reduce((acc, goal) => {
      const type = goal.goal_type === 'okr_objective' ? 'OKR' : 'Standard';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return {
      totalGoals,
      totalTasks,
      completedTasks,
      completionRate,
      atRiskGoals,
      deptPerformance,
      priorityBreakdown: Object.entries(priorityBreakdown).map(([name, value]) => ({ name, value })),
      goalTypeBreakdown: Object.entries(goalTypeBreakdown).map(([name, value]) => ({ name, value }))
    };
  }, [orgGoals, orgItems]);

  const handleExport = () => {
    toast.success("Export functionality coming soon");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Organization Performance Analytics</h2>
          <p className="text-gray-600 mt-1">Read-only analytics across the organization</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 font-medium">
                <Building2 className="w-5 h-5" />
                Total Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.totalGoals}</div>
              <p className="text-blue-100 text-sm mt-1">Organization-wide</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 font-medium">
                <BarChart3 className="w-5 h-5" />
                Completion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.completionRate}%</div>
              <Progress value={metrics.completionRate} className="mt-2 bg-green-300 h-1.5" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 font-medium">
                <PieChartIcon className="w-5 h-5" />
                Total Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.totalTasks}</div>
              <p className="text-purple-100 text-sm mt-1">{metrics.completedTasks} completed</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className={`bg-gradient-to-br ${metrics.atRiskGoals > 0 ? 'from-red-500 to-red-600' : 'from-gray-400 to-gray-500'} text-white border-0`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 font-medium">
                <AlertCircle className="w-5 h-5" />
                At-Risk Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.atRiskGoals}</div>
              <p className={`${metrics.atRiskGoals > 0 ? 'text-red-100' : 'text-gray-200'} text-sm mt-1`}>
                {metrics.atRiskGoals > 0 ? 'Below 50% near deadline' : 'All on track'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Department Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" />
            Department Performance Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.deptPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.deptPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="department" />
                <YAxis label={{ value: 'Avg Progress %', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="avgProgress" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No department data available</p>
          )}
        </CardContent>
      </Card>

      {/* Additional Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              Task Priority Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.priorityBreakdown.length > 0 ? (
              <div className="space-y-3">
                {metrics.priorityBreakdown.map(({ name, value }) => {
                  const percentage = metrics.totalTasks > 0 ? Math.round((value / metrics.totalTasks) * 100) : 0;
                  return (
                    <div key={name} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-orange-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-12 text-right">{value}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No priority data</p>
            )}
          </CardContent>
        </Card>

        {/* Goal Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-purple-500" />
              Strategic vs Operational Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.goalTypeBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={metrics.goalTypeBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {metrics.goalTypeBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#8b5cf6' : '#3b82f6'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No goal type data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
