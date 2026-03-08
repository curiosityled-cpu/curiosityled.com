import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Target, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle,
  Clock, Users, Zap
} from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function GoalsInsightsSection({ goals, programs, participantEmails }) {
  const insights = useMemo(() => {
    if (!goals || goals.length === 0) {
      return {
        totalGoals: 0,
        completionRate: 0,
        avgProgress: 0,
        statusBreakdown: [],
        typeBreakdown: [],
        overdueGoals: 0,
        atRiskGoals: 0,
        recentlyCompleted: 0,
        topAchievers: [],
        needsAttention: []
      };
    }

    const totalGoals = goals.length;
    
    // Status calculations
    const completed = goals.filter(g => g.status === 'archived' || (g.progress || 0) >= 100).length;
    const active = goals.filter(g => g.status === 'active').length;
    const draft = goals.filter(g => g.status === 'draft').length;
    
    const completionRate = totalGoals > 0 ? Math.round((completed / totalGoals) * 100) : 0;
    const avgProgress = totalGoals > 0 
      ? Math.round(goals.reduce((sum, g) => sum + (g.progress || 0), 0) / totalGoals)
      : 0;

    // Status breakdown for chart
    const statusBreakdown = [
      { name: 'Completed', value: completed, color: '#10b981' },
      { name: 'Active', value: active, color: '#3b82f6' },
      { name: 'Draft', value: draft, color: '#9ca3af' }
    ].filter(s => s.value > 0);

    // Type breakdown
    const typeBreakdown = [
      { name: 'Standard', count: goals.filter(g => g.goal_type === 'standard' || !g.goal_type).length },
      { name: 'OKR', count: goals.filter(g => g.goal_type === 'okr_objective').length },
      { name: 'Coaching', count: goals.filter(g => g.goal_type === 'coaching_goal').length },
      { name: 'Action Item', count: goals.filter(g => g.goal_type === 'action_item').length }
    ].filter(t => t.count > 0);

    // Overdue goals
    const overdueGoals = goals.filter(g => {
      if (g.status === 'archived' || (g.progress || 0) >= 100) return false;
      if (!g.timeframe_end) return false;
      return new Date(g.timeframe_end) < new Date();
    }).length;

    // At risk (active but low progress with approaching deadline)
    const atRiskGoals = goals.filter(g => {
      if (g.status !== 'active') return false;
      if (!g.timeframe_end) return false;
      const daysUntilDue = Math.floor((new Date(g.timeframe_end) - new Date()) / (1000 * 60 * 60 * 24));
      const progress = g.progress || 0;
      // At risk if less than 14 days left and under 50% progress
      return daysUntilDue < 14 && daysUntilDue > 0 && progress < 50;
    }).length;

    // Recently completed (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentlyCompleted = goals.filter(g => {
      if (g.status !== 'archived' && (g.progress || 0) < 100) return false;
      const updatedDate = g.updated_date ? new Date(g.updated_date) : null;
      return updatedDate && updatedDate > thirtyDaysAgo;
    }).length;

    // Goals per participant
    const goalsByOwner = {};
    goals.forEach(g => {
      const owner = g.created_by || 'Unknown';
      if (!goalsByOwner[owner]) {
        goalsByOwner[owner] = { total: 0, completed: 0 };
      }
      goalsByOwner[owner].total++;
      if (g.status === 'archived' || (g.progress || 0) >= 100) {
        goalsByOwner[owner].completed++;
      }
    });

    // Top achievers (highest completion rate with at least 2 goals)
    const topAchievers = Object.entries(goalsByOwner)
      .filter(([_, data]) => data.total >= 2)
      .map(([email, data]) => ({
        email,
        total: data.total,
        completed: data.completed,
        rate: Math.round((data.completed / data.total) * 100)
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);

    // Needs attention (lowest completion with active goals)
    const needsAttention = Object.entries(goalsByOwner)
      .filter(([_, data]) => data.total >= 2 && (data.completed / data.total) < 0.3)
      .map(([email, data]) => ({
        email,
        total: data.total,
        completed: data.completed,
        rate: Math.round((data.completed / data.total) * 100)
      }))
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 5);

    return {
      totalGoals,
      completionRate,
      avgProgress,
      statusBreakdown,
      typeBreakdown,
      overdueGoals,
      atRiskGoals,
      recentlyCompleted,
      topAchievers,
      needsAttention
    };
  }, [goals]);

  if (goals.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Goals Data</h3>
          <p className="text-gray-500">No goals have been created for program participants yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Goals</p>
                  <p className="text-2xl font-bold">{insights.totalGoals}</p>
                </div>
                <Target className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-xs text-gray-500 mt-2">{insights.recentlyCompleted} completed recently</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completion Rate</p>
                  <p className="text-2xl font-bold">{insights.completionRate}%</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <Progress value={insights.completionRate} className="mt-2 h-1.5" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Progress</p>
                  <p className="text-2xl font-bold">{insights.avgProgress}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-400" />
              </div>
              <Progress value={insights.avgProgress} className="mt-2 h-1.5" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className={(insights.overdueGoals > 0 || insights.atRiskGoals > 0) ? 'border-orange-200' : ''}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">At Risk / Overdue</p>
                  <p className="text-2xl font-bold">{insights.atRiskGoals + insights.overdueGoals}</p>
                </div>
                <AlertTriangle className={`w-8 h-8 ${(insights.overdueGoals > 0 || insights.atRiskGoals > 0) ? 'text-orange-400' : 'text-gray-300'}`} />
              </div>
              <p className="text-xs text-gray-500 mt-2">{insights.overdueGoals} overdue, {insights.atRiskGoals} at risk</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Goal Status</CardTitle>
            <CardDescription>Current state of all goals</CardDescription>
          </CardHeader>
          <CardContent>
            {insights.statusBreakdown.length > 0 ? (
              <div className="flex items-center gap-8">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie
                      data={insights.statusBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {insights.statusBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {insights.statusBreakdown.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-gray-600">{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No status data</p>
            )}
          </CardContent>
        </Card>

        {/* Goal Types */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Goal Types</CardTitle>
            <CardDescription>Distribution by goal type</CardDescription>
          </CardHeader>
          <CardContent>
            {insights.typeBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={insights.typeBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No type data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Performers & Needs Attention */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Top Achievers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insights.topAchievers.length > 0 ? (
              <div className="space-y-3">
                {insights.topAchievers.map((achiever, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{achiever.email}</p>
                      <p className="text-xs text-gray-500">{achiever.completed}/{achiever.total} goals</p>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      {achiever.rate}%
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Not enough data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Needs Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insights.needsAttention.length > 0 ? (
              <div className="space-y-3">
                {insights.needsAttention.map((person, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{person.email}</p>
                      <p className="text-xs text-gray-500">{person.completed}/{person.total} goals</p>
                    </div>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                      {person.rate}%
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Everyone is on track!</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}