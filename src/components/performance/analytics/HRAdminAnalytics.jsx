import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building2, Users, TrendingUp, Brain, Target, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function HRAdminAnalytics({ user }) {
  const [loading, setLoading] = useState(true);
  const [orgGoals, setOrgGoals] = useState([]);
  const [orgItems, setOrgItems] = useState([]);
  const [orgUsers, setOrgUsers] = useState([]);
  const [competencies, setCompetencies] = useState([]);

  useEffect(() => {
    loadOrgData();
  }, [user]);

  const loadOrgData = async () => {
    setLoading(true);
    try {
      const [goalsData, itemsData, usersData, competenciesData] = await Promise.all([
        base44.entities.Goal.filter({ client_id: user.client_id }, "-updated_date"),
        base44.entities.Item.list("-updated_date"),
        base44.entities.User.filter({ client_id: user.client_id }),
        base44.entities.Competency.filter({
          $or: [
            { client_id: user.client_id },
            { is_platform_default: true }
          ]
        })
      ]);

      const goalIds = goalsData.map(g => g.id);
      const orgItemsData = itemsData.filter(item => goalIds.includes(item.board_id));

      setOrgGoals(goalsData);
      setOrgItems(orgItemsData);
      setOrgUsers(usersData);
      setCompetencies(competenciesData);
    } catch (error) {
      console.error("Error loading org data:", error);
    }
    setLoading(false);
  };

  const metrics = useMemo(() => {
    const totalGoals = orgGoals.length;
    const totalTasks = orgItems.length;
    const completedTasks = orgItems.filter(item => item.data?.status === 'completed').length;
    const avgCompletion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const deptHeatmap = {};
    orgGoals.forEach(goal => {
      const dept = goal.department || 'Unassigned';
      if (!deptHeatmap[dept]) {
        deptHeatmap[dept] = { goals: 0, totalProgress: 0 };
      }
      deptHeatmap[dept].goals++;
      deptHeatmap[dept].totalProgress += (goal.progress || 0);
    });

    const deptPerformance = Object.entries(deptHeatmap).map(([dept, data]) => ({
      department: dept,
      avgProgress: Math.round(data.totalProgress / data.goals),
      goalsCount: data.goals
    })).sort((a, b) => b.avgProgress - a.avgProgress);

    const rolePerformance = {};
    orgUsers.forEach(u => {
      const role = u.app_role || 'User Level 1';
      const userGoals = orgGoals.filter(g => g.created_by === u.email);
      const avgProgress = userGoals.length > 0
        ? Math.round(userGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / userGoals.length)
        : 0;
      
      if (!rolePerformance[role]) {
        rolePerformance[role] = { total: 0, totalProgress: 0 };
      }
      rolePerformance[role].total++;
      rolePerformance[role].totalProgress += avgProgress;
    });

    const roleData = Object.entries(rolePerformance).map(([role, data]) => ({
      role,
      avgProgress: Math.round(data.totalProgress / data.total),
      users: data.total
    }));

    const competencyAlignment = competencies.map(comp => {
      const linkedGoals = orgGoals.filter(g => 
        g.linked_competency_ids?.includes(comp.id)
      );
      return {
        name: comp.name,
        goalsCount: linkedGoals.length
      };
    }).filter(c => c.goalsCount > 0).sort((a, b) => b.goalsCount - a.goalsCount);

    return {
      totalGoals,
      totalTasks,
      avgCompletion,
      totalUsers: orgUsers.length,
      deptPerformance,
      rolePerformance: roleData,
      competencyAlignment
    };
  }, [orgGoals, orgItems, orgUsers, competencies]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 font-medium">
                <Users className="w-5 h-5" />
                Team Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.totalUsers}</div>
              <p className="text-purple-100 text-sm mt-1">Active users</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-5 h-5" />
                Avg Completion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.avgCompletion}%</div>
              <Progress value={metrics.avgCompletion} className="mt-2 bg-green-300 h-1.5" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 font-medium">
                <Target className="w-5 h-5" />
                Total Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.totalTasks}</div>
              <p className="text-orange-100 text-sm mt-1">Active tasks</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Department Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" />
            Department Performance Heatmap
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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Role-Based Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              Performance by Role
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.rolePerformance.length > 0 ? (
              <div className="space-y-3">
                {metrics.rolePerformance.map((role, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{role.role}</p>
                      <p className="text-xs text-gray-500">{role.users} users</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500"
                          style={{ width: `${role.avgProgress}%` }}
                        />
                      </div>
                      <Badge variant="outline" className="min-w-[3rem] justify-center">
                        {role.avgProgress}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No role data available</p>
            )}
          </CardContent>
        </Card>

        {/* Competency Alignment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-green-500" />
              Goals by Competency
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.competencyAlignment.length > 0 ? (
              <div className="space-y-3">
                {metrics.competencyAlignment.slice(0, 8).map((comp, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate flex-1">{comp.name}</span>
                    <Badge variant="outline">{comp.goalsCount} goals</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No competency data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}