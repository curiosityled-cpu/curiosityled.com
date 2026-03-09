import React, { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Target,
  BarChart3,
  Calendar,
  Users
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";

export default function GoalAnalyticsModal({ isOpen, onClose, goal, milestones = [], kpis = [] }) {
  const analytics = useMemo(() => {
    // Task analytics
    const totalTasks = milestones.length;
    const completedTasks = milestones.filter(milestone => milestone.data?.status === 'completed').length;
    const inProgressTasks = milestones.filter(milestone => milestone.data?.status === 'in_progress').length;
    const notStartedTasks = milestones.filter(milestone => milestone.data?.status === 'not_started').length;
    const onHoldTasks = milestones.filter(milestone => milestone.data?.status === 'on_hold').length;
    
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Priority breakdown
    const criticalTasks = milestones.filter(milestone => milestone.priority === 'critical').length;
    const highTasks = milestones.filter(milestone => milestone.priority === 'high').length;
    const mediumTasks = milestones.filter(milestone => milestone.priority === 'medium').length;
    const lowTasks = milestones.filter(milestone => milestone.priority === 'low').length;

    // Overdue tasks (tasks with due_date in the past and not completed)
    const today = new Date();
    const overdueTasks = milestones.filter(milestone => {
      if (milestone.data?.status === 'completed') return false;
      if (!milestone.data?.due_date) return false;
      try {
        const dueDate = parseISO(milestone.data.due_date);
        return dueDate < today;
      } catch {
        return false;
      }
    }).length;

    // Group analytics
    const groupStats = (goal.groups || []).map(group => {
      const groupMilestones = milestones.filter(milestone => milestone.group_id === group.id);
      const groupCompleted = groupMilestones.filter(milestone => milestone.data?.status === 'completed').length;
      return {
        id: group.id,
        title: group.title,
        color: group.color,
        total: groupMilestones.length,
        completed: groupCompleted,
        completionRate: groupMilestones.length > 0 ? Math.round((groupCompleted / groupMilestones.length) * 100) : 0
      };
    });

    // KPI analytics
    const totalKpis = kpis?.length || 0;
    const kpisOnTrack = kpis?.filter(kpi => kpi.status === 'on_track').length || 0;
    const kpisAtRisk = kpis?.filter(kpi => kpi.status === 'at_risk').length || 0;
    const kpisBehind = kpis?.filter(kpi => kpi.status === 'behind').length || 0;
    const kpisAchieved = kpis?.filter(kpi => kpi.status === 'achieved').length || 0;

    const avgKpiProgress = kpis && kpis.length > 0 
      ? Math.round(kpis.reduce((sum, kpi) => {
          const progress = kpi.target_value > 0 
            ? Math.min(100, (kpi.current_value / kpi.target_value) * 100)
            : 0;
          return sum + progress;
        }, 0) / kpis.length)
      : 0;

    // Timeline analytics
    let daysRemaining = null;
    let totalDays = null;
    let timeProgress = 0;
    
    if (goal.timeframe_start && goal.timeframe_end) {
      try {
        const startDate = parseISO(goal.timeframe_start);
        const endDate = parseISO(goal.timeframe_end);
        const today = new Date();
        
        totalDays = differenceInDays(endDate, startDate);
        daysRemaining = differenceInDays(endDate, today);
        
        if (totalDays > 0) {
          const daysElapsed = totalDays - daysRemaining;
          timeProgress = Math.min(100, Math.max(0, Math.round((daysElapsed / totalDays) * 100)));
        }
      } catch (error) {
        console.warn('Date parsing error:', error);
      }
    }

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      notStartedTasks,
      onHoldTasks,
      completionRate,
      criticalTasks,
      highTasks,
      mediumTasks,
      lowTasks,
      overdueTasks,
      groupStats,
      totalKpis,
      kpisOnTrack,
      kpisAtRisk,
      kpisBehind,
      kpisAchieved,
      avgKpiProgress,
      daysRemaining,
      totalDays,
      timeProgress
    };
  }, [milestones, kpis, goal]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'not_started': return 'bg-gray-400';
      case 'on_hold': return 'bg-yellow-500';
      default: return 'bg-gray-300';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-300';
    }
  };

  const getHealthStatus = () => {
    if (analytics.completionRate >= 80) return { label: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-50' };
    if (analytics.completionRate >= 60) return { label: 'Good', color: 'text-blue-600', bgColor: 'bg-blue-50' };
    if (analytics.completionRate >= 40) return { label: 'Fair', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    return { label: 'Needs Attention', color: 'text-red-600', bgColor: 'bg-red-50' };
  };

  const healthStatus = getHealthStatus();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#323338]">
            Goal Analytics
          </DialogTitle>
          <p className="text-sm text-gray-500">{goal.title}</p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Overall Health */}
          <div className={`p-4 rounded-lg ${healthStatus.bgColor}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Goal Health</p>
                <p className={`text-2xl font-bold ${healthStatus.color}`}>{healthStatus.label}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-[#323338]">{analytics.completionRate}%</p>
                <p className="text-sm text-gray-500">Complete</p>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-blue-600" />
                <p className="text-xs text-gray-600">Total Tasks</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">{analytics.totalTasks}</p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <p className="text-xs text-gray-600">Completed</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{analytics.completedTasks}</p>
            </div>

            <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-orange-600" />
                <p className="text-xs text-gray-600">In Progress</p>
              </div>
              <p className="text-2xl font-bold text-orange-600">{analytics.inProgressTasks}</p>
            </div>

            <div className="p-4 bg-red-50 rounded-lg border border-red-100">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <p className="text-xs text-gray-600">Overdue</p>
              </div>
              <p className="text-2xl font-bold text-red-600">{analytics.overdueTasks}</p>
            </div>
          </div>

          {/* Timeline Progress */}
          {goal.timeframe_start && goal.timeframe_end && (
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#323338]" />
                  <h3 className="font-semibold text-[#323338]">Timeline Progress</h3>
                </div>
                {analytics.daysRemaining !== null && (
                  <Badge variant={analytics.daysRemaining < 0 ? "destructive" : "outline"}>
                    {analytics.daysRemaining < 0 
                      ? `${Math.abs(analytics.daysRemaining)} days overdue`
                      : `${analytics.daysRemaining} days remaining`
                    }
                  </Badge>
                )}
              </div>
              <Progress value={analytics.timeProgress} className="h-2 mb-2" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{format(parseISO(goal.timeframe_start), 'MMM d, yyyy')}</span>
                <span>{analytics.timeProgress}% elapsed</span>
                <span>{format(parseISO(goal.timeframe_end), 'MMM d, yyyy')}</span>
              </div>
            </div>
          )}

          {/* Status Breakdown */}
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-[#323338]" />
              <h3 className="font-semibold text-[#323338]">Task Status Distribution</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Completed', count: analytics.completedTasks, color: 'bg-green-500' },
                { label: 'In Progress', count: analytics.inProgressTasks, color: 'bg-blue-500' },
                { label: 'Not Started', count: analytics.notStartedTasks, color: 'bg-gray-400' },
                { label: 'On Hold', count: analytics.onHoldTasks, color: 'bg-yellow-500' }
              ].map(({ label, count, color }) => {
                const percentage = analytics.totalTasks > 0 
                  ? Math.round((count / analytics.totalTasks) * 100) 
                  : 0;
                
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">{label}</span>
                      <span className="text-sm font-semibold text-[#323338]">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${color}`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Priority Breakdown */}
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-[#323338]" />
              <h3 className="font-semibold text-[#323338]">Priority Distribution</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Critical', count: analytics.criticalTasks, color: 'bg-red-500' },
                { label: 'High', count: analytics.highTasks, color: 'bg-orange-500' },
                { label: 'Medium', count: analytics.mediumTasks, color: 'bg-yellow-500' },
                { label: 'Low', count: analytics.lowTasks, color: 'bg-blue-500' }
              ].map(({ label, count, color }) => (
                <div key={label} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className={`w-3 h-3 ${color} rounded-full mx-auto mb-2`} />
                  <p className="text-xs text-gray-600 mb-1">{label}</p>
                  <p className="text-lg font-bold text-[#323338]">{count}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Group Performance */}
          {analytics.groupStats.length > 0 && (
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-[#323338]" />
                <h3 className="font-semibold text-[#323338]">Group Performance</h3>
              </div>
              <div className="space-y-3">
                {analytics.groupStats.map(group => (
                  <div key={group.id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: group.color }}
                        />
                        <span className="text-sm font-medium text-[#323338]">{group.title}</span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {group.completed}/{group.total} tasks ({group.completionRate}%)
                      </span>
                    </div>
                    <Progress value={group.completionRate} className="h-2" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* KPI Performance */}
          {analytics.totalKpis > 0 && (
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-[#323338]" />
                <h3 className="font-semibold text-[#323338]">KPI Performance</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Total KPIs</p>
                  <p className="text-2xl font-bold text-blue-600">{analytics.totalKpis}</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Avg Progress</p>
                  <p className="text-2xl font-bold text-green-600">{analytics.avgKpiProgress}%</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'On Track', count: analytics.kpisOnTrack, color: 'text-green-600' },
                  { label: 'At Risk', count: analytics.kpisAtRisk, color: 'text-yellow-600' },
                  { label: 'Behind', count: analytics.kpisBehind, color: 'text-red-600' },
                  { label: 'Achieved', count: analytics.kpisAchieved, color: 'text-blue-600' }
                ].map(({ label, count, color }) => (
                  <div key={label} className="text-center p-2 bg-gray-50 rounded">
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p className={`text-lg font-bold ${color}`}>{count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}