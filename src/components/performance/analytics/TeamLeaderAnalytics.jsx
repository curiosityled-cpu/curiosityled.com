import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, TrendingUp, Target, AlertTriangle, Award, CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function TeamLeaderAnalytics({ user }) {
  const [loading, setLoading] = useState(true);
  const [teamGoals, setTeamGoals] = useState([]);
  const [teamItems, setTeamItems] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    loadTeamData();
  }, [user]);

  const loadTeamData = async () => {
    setLoading(true);
    try {
      const subordinateEmails = user.subordinate_emails || [];
      const allTeamEmails = [user.email, ...subordinateEmails];

      const [goalsData, itemsData, membersData] = await Promise.all([
        base44.entities.Goal.list("-updated_date"),
        base44.entities.Item.list("-updated_date"),
        base44.entities.User.filter({ email: { $in: subordinateEmails } })
      ]);

      const teamGoalsData = goalsData.filter(g => 
        allTeamEmails.includes(g.created_by) || 
        g.assigned_to_emails?.some(e => allTeamEmails.includes(e))
      );

      const teamGoalIds = teamGoalsData.map(g => g.id);
      const teamItemsData = itemsData.filter(item => teamGoalIds.includes(item.board_id));

      setTeamGoals(teamGoalsData);
      setTeamItems(teamItemsData);
      setTeamMembers(membersData);
    } catch (error) {
      console.error("Error loading team data:", error);
    }
    setLoading(false);
  };

  const metrics = useMemo(() => {
    const totalGoals = teamGoals.length;
    const totalTasks = teamItems.length;
    const completedTasks = teamItems.filter(item => item.data?.status === 'completed').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const overdueTasks = teamItems.filter(item => {
      const dueDate = item.data?.due_date;
      const status = item.data?.status;
      if (!dueDate || status === 'completed') return false;
      return new Date(dueDate) < new Date();
    }).length;

    const avgGoalProgress = teamGoals.length > 0 
      ? Math.round(teamGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / teamGoals.length)
      : 0;

    const statusBreakdown = {};
    teamItems.forEach(item => {
      const status = item.data?.status || 'not_started';
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    });

    const memberPerformance = teamMembers.map(member => {
      const memberGoals = teamGoals.filter(g => g.created_by === member.email);
      const memberTasks = teamItems.filter(item => {
        const goalBelongsToMember = memberGoals.some(g => g.id === item.board_id);
        return goalBelongsToMember;
      });
      const memberCompleted = memberTasks.filter(t => t.data?.status === 'completed').length;
      const memberProgress = memberTasks.length > 0 
        ? Math.round((memberCompleted / memberTasks.length) * 100)
        : 0;

      return {
        name: member.full_name,
        email: member.email,
        goalsCount: memberGoals.length,
        tasksCount: memberTasks.length,
        progress: memberProgress
      };
    }).sort((a, b) => b.progress - a.progress);

    return {
      totalGoals,
      totalTasks,
      completedTasks,
      completionRate,
      overdueTasks,
      avgGoalProgress,
      statusBreakdown: Object.entries(statusBreakdown).map(([name, value]) => ({ name, value })),
      memberPerformance
    };
  }, [teamGoals, teamItems, teamMembers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const COLORS = ['#00C875', '#FFCB00', '#E2445C', '#C4C4C4'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Team Performance Analytics</h2>
        <p className="text-gray-600 mt-1">Track your team's goal completion and productivity</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 font-medium">
                <Users className="w-5 h-5" />
                Direct Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{teamMembers.length}</div>
              <p className="text-purple-100 text-sm mt-1">Team members</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 font-medium">
                <Target className="w-5 h-5" />
                Team Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.totalGoals}</div>
              <p className="text-blue-100 text-sm mt-1">Active goals</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-5 h-5" />
                Completion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.completionRate}%</div>
              <Progress value={metrics.completionRate} className="mt-2 bg-green-300 h-1.5" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className={`bg-gradient-to-br ${metrics.overdueTasks > 0 ? 'from-red-500 to-red-600' : 'from-gray-400 to-gray-500'} text-white border-0`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 font-medium">
                <AlertTriangle className="w-5 h-5" />
                Overdue Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.overdueTasks}</div>
              <p className={`${metrics.overdueTasks > 0 ? 'text-red-100' : 'text-gray-200'} text-sm mt-1`}>
                {metrics.overdueTasks > 0 ? 'Need attention' : 'All on track'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Task Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Task Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.statusBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={metrics.statusBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {metrics.statusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No task data available</p>
            )}
          </CardContent>
        </Card>

        {/* Team Member Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-green-500" />
              Team Member Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.memberPerformance.length > 0 ? (
              <div className="space-y-3 max-h-[250px] overflow-y-auto">
                {metrics.memberPerformance.map((member, idx) => (
                  <div key={member.email} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-600' : 'bg-gray-300'
                    } text-white text-sm font-bold`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.tasksCount} tasks</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${member.progress}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-700 w-10 text-right">{member.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No team member data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Goals by Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            Team Goals Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {teamGoals.slice(0, 10).map((goal) => (
              <div key={goal.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: goal.color || '#0073EA' }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{goal.title}</p>
                    <p className="text-xs text-gray-500">
                      Created by {goal.created_by === user.email ? 'You' : goal.created_by}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${goal.progress || 0}%` }}
                    />
                  </div>
                  <Badge variant="outline" className="min-w-[3rem] justify-center">
                    {goal.progress || 0}%
                  </Badge>
                </div>
              </div>
            ))}
            {teamGoals.length === 0 && (
              <p className="text-gray-500 text-center py-8">No team goals found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}