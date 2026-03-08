import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building2, Target, AlertTriangle, TrendingUp, CheckCircle2, Link as LinkIcon, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function SuperAdminAnalytics({ user }) {
  const [loading, setLoading] = useState(true);
  const [orgGoals, setOrgGoals] = useState([]);
  const [orgItems, setOrgItems] = useState([]);
  const [okrs, setOkrs] = useState([]);

  useEffect(() => {
    loadOrgData();
  }, [user]);

  const loadOrgData = async () => {
    setLoading(true);
    try {
      const [goalsData, itemsData, okrsData] = await Promise.all([
        base44.entities.Goal.filter({ client_id: user.client_id }, "-updated_date"),
        base44.entities.Item.list("-updated_date"),
        base44.entities.OKR.list("-updated_date")
      ]);

      const goalIds = goalsData.map(g => g.id);
      const orgItemsData = itemsData.filter(item => goalIds.includes(item.board_id));

      setOrgGoals(goalsData);
      setOrgItems(orgItemsData);
      setOkrs(okrsData);
    } catch (error) {
      console.error("Error loading org data:", error);
    }
    setLoading(false);
  };

  const metrics = useMemo(() => {
    const totalGoals = orgGoals.length;
    const strategicGoals = orgGoals.filter(g => g.goal_type === 'okr_objective').length;
    const totalTasks = orgItems.length;
    const completedTasks = orgItems.filter(item => item.data?.status === 'completed').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const atRiskGoals = orgGoals.filter(g => {
      const progress = g.progress || 0;
      return progress < 50 && g.timeframe_end && new Date(g.timeframe_end) > new Date();
    }).length;

    const blockedTasks = orgItems.filter(item => {
      if (!item.depends_on || item.depends_on.length === 0) return false;
      return item.depends_on.some(depId => {
        const depTask = orgItems.find(t => t.id === depId);
        return depTask && depTask.data?.status !== 'completed';
      });
    }).length;

    const overdueTasks = orgItems.filter(item => {
      const dueDate = item.data?.due_date;
      const status = item.data?.status;
      if (!dueDate || status === 'completed') return false;
      return new Date(dueDate) < new Date();
    }).length;

    const deptGoals = {};
    orgGoals.forEach(goal => {
      const dept = goal.department || 'Unassigned';
      if (!deptGoals[dept]) {
        deptGoals[dept] = { total: 0, avgProgress: 0, totalProgress: 0 };
      }
      deptGoals[dept].total++;
      deptGoals[dept].totalProgress += (goal.progress || 0);
    });

    const deptData = Object.entries(deptGoals).map(([dept, data]) => ({
      department: dept,
      goals: data.total,
      avgProgress: Math.round(data.totalProgress / data.total)
    }));

    const okrProgress = okrs.map(okr => {
      const totalKRs = okr.key_results?.length || 0;
      const completedKRs = okr.key_results?.filter(kr => kr.current_value >= kr.target_value).length || 0;
      return {
        objective: okr.objective,
        progress: totalKRs > 0 ? Math.round((completedKRs / totalKRs) * 100) : 0
      };
    }).slice(0, 5);

    return {
      totalGoals,
      strategicGoals,
      completionRate,
      atRiskGoals,
      blockedTasks,
      overdueTasks,
      deptData,
      okrProgress
    };
  }, [orgGoals, orgItems, okrs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Strategic Performance Dashboard</h2>
        <p className="text-gray-600 mt-1">Full organizational visibility and strategic initiatives</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 font-medium">
                <Target className="w-4 h-4" />
                Total Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalGoals}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 font-medium">
                <TrendingUp className="w-4 h-4" />
                Strategic
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.strategicGoals}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Completion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.completionRate}%</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className={`bg-gradient-to-br ${metrics.atRiskGoals > 0 ? 'from-red-500 to-red-600' : 'from-gray-400 to-gray-500'} text-white border-0`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4" />
                At Risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.atRiskGoals}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className={`bg-gradient-to-br ${metrics.blockedTasks > 0 ? 'from-orange-500 to-orange-600' : 'from-gray-400 to-gray-500'} text-white border-0`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 font-medium">
                <LinkIcon className="w-4 h-4" />
                Blocked
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.blockedTasks}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className={`bg-gradient-to-br ${metrics.overdueTasks > 0 ? 'from-red-500 to-red-600' : 'from-gray-400 to-gray-500'} text-white border-0`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4" />
                Overdue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.overdueTasks}</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Department Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" />
            Cross-Department Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.deptData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.deptData}>
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

      {/* OKR Progress */}
      {metrics.okrProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-green-500" />
              Strategic OKR Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.okrProgress.map((okr, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-sm flex-1 truncate">{okr.objective}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500"
                        style={{ width: `${okr.progress}%` }}
                      />
                    </div>
                    <Badge variant="outline" className="min-w-[3rem] justify-center">
                      {okr.progress}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}