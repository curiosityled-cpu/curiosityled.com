import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BookOpen, TrendingUp, Clock, CheckCircle2, AlertTriangle,
  Map, Target, Users
} from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function LearningInsightsSection({ assignedLearning, journeyEnrollments, journeys, programs }) {
  const insights = useMemo(() => {
    // Learning assignment metrics
    const totalAssigned = assignedLearning.length;
    const completed = assignedLearning.filter(a => a.status === 'completed').length;
    const inProgress = assignedLearning.filter(a => a.status === 'in_progress' || a.status === 'started').length;
    const notStarted = assignedLearning.filter(a => a.status === 'assigned').length;
    const overdue = assignedLearning.filter(a => 
      a.status !== 'completed' && a.due_date && new Date(a.due_date) < new Date()
    ).length;

    const completionRate = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;

    // Status distribution for pie chart
    const statusDistribution = [
      { name: 'Completed', value: completed, color: '#10b981' },
      { name: 'In Progress', value: inProgress, color: '#3b82f6' },
      { name: 'Not Started', value: notStarted, color: '#9ca3af' },
      { name: 'Overdue', value: overdue, color: '#ef4444' }
    ].filter(s => s.value > 0);

    // Journey progress metrics
    const totalEnrollments = journeyEnrollments.length;
    const completedJourneys = journeyEnrollments.filter(e => e.status === 'completed').length;
    const avgProgress = totalEnrollments > 0
      ? Math.round(journeyEnrollments.reduce((sum, e) => sum + (e.completion_percentage || 0), 0) / totalEnrollments)
      : 0;

    // Journey breakdown
    const journeyStats = journeys.map(j => {
      const enrollments = journeyEnrollments.filter(e => e.journey_id === j.id);
      const avgProg = enrollments.length > 0
        ? Math.round(enrollments.reduce((sum, e) => sum + (e.completion_percentage || 0), 0) / enrollments.length)
        : 0;
      return {
        name: j.name.length > 20 ? j.name.substring(0, 17) + '...' : j.name,
        fullName: j.name,
        enrollments: enrollments.length,
        avgProgress: avgProg,
        completed: enrollments.filter(e => e.status === 'completed').length
      };
    }).sort((a, b) => b.enrollments - a.enrollments).slice(0, 5);

    // Priority breakdown
    const priorityBreakdown = [
      { name: 'Urgent', count: assignedLearning.filter(a => a.priority === 'urgent').length, color: '#ef4444' },
      { name: 'High', count: assignedLearning.filter(a => a.priority === 'high').length, color: '#f59e0b' },
      { name: 'Medium', count: assignedLearning.filter(a => a.priority === 'medium').length, color: '#3b82f6' },
      { name: 'Low', count: assignedLearning.filter(a => a.priority === 'low').length, color: '#10b981' }
    ].filter(p => p.count > 0);

    // Stalled learners (enrolled but no progress in 14+ days)
    const stalledLearners = journeyEnrollments.filter(e => {
      if (e.status === 'completed') return false;
      const lastActivity = e.last_activity_date || e.enrolled_date;
      if (!lastActivity) return false;
      const daysSinceActivity = Math.floor((new Date() - new Date(lastActivity)) / (1000 * 60 * 60 * 24));
      return daysSinceActivity > 14 && (e.completion_percentage || 0) < 100;
    });

    return {
      totalAssigned,
      completed,
      inProgress,
      notStarted,
      overdue,
      completionRate,
      statusDistribution,
      totalEnrollments,
      completedJourneys,
      avgProgress,
      journeyStats,
      priorityBreakdown,
      stalledLearners: stalledLearners.length
    };
  }, [assignedLearning, journeyEnrollments, journeys]);

  if (assignedLearning.length === 0 && journeyEnrollments.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Learning Data</h3>
          <p className="text-gray-500">No learning has been assigned to program participants yet.</p>
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
                  <p className="text-sm text-gray-600">Learning Assigned</p>
                  <p className="text-2xl font-bold">{insights.totalAssigned}</p>
                </div>
                <BookOpen className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-xs text-gray-500 mt-2">{insights.completed} completed</p>
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
                  <p className="text-sm text-gray-600">Avg Journey Progress</p>
                  <p className="text-2xl font-bold">{insights.avgProgress}%</p>
                </div>
                <Map className="w-8 h-8 text-purple-400" />
              </div>
              <p className="text-xs text-gray-500 mt-2">{insights.totalEnrollments} enrollments</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className={insights.overdue > 0 ? 'border-red-200' : ''}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold">{insights.overdue}</p>
                </div>
                <Clock className={`w-8 h-8 ${insights.overdue > 0 ? 'text-red-400' : 'text-gray-300'}`} />
              </div>
              <p className="text-xs text-gray-500 mt-2">{insights.stalledLearners} stalled learners</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Learning Status</CardTitle>
            <CardDescription>Current state of assigned learning</CardDescription>
          </CardHeader>
          <CardContent>
            {insights.statusDistribution.length > 0 ? (
              <div className="flex items-center gap-8">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie
                      data={insights.statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {insights.statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {insights.statusDistribution.map((item, idx) => (
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

        {/* Journey Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Journey Progress</CardTitle>
            <CardDescription>Average completion by journey</CardDescription>
          </CardHeader>
          <CardContent>
            {insights.journeyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={insights.journeyStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                  <Tooltip 
                    formatter={(value, name) => [`${value}%`, 'Avg Progress']}
                    labelFormatter={(label) => {
                      const stat = insights.journeyStats.find(s => s.name === label);
                      return stat?.fullName || label;
                    }}
                  />
                  <Bar dataKey="avgProgress" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No journey data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Priority & Insights */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              By Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insights.priorityBreakdown.length > 0 ? (
              <div className="space-y-3">
                {insights.priorityBreakdown.map((priority, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: priority.color }} />
                      <span className="font-medium">{priority.name}</span>
                    </div>
                    <Badge variant="secondary">{priority.count} items</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No priority data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.overdue > 0 && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                  <p className="text-sm text-red-800">
                    <strong>{insights.overdue} assignments</strong> are past due date
                  </p>
                </div>
              )}
              {insights.stalledLearners > 0 && (
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                  <p className="text-sm text-orange-800">
                    <strong>{insights.stalledLearners} learners</strong> haven't made progress in 14+ days
                  </p>
                </div>
              )}
              {insights.notStarted > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-700">
                    <strong>{insights.notStarted} assignments</strong> haven't been started yet
                  </p>
                </div>
              )}
              {insights.completionRate >= 80 && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                  <p className="text-sm text-green-800">
                    Great progress! {insights.completionRate}% completion rate
                  </p>
                </div>
              )}
              {insights.overdue === 0 && insights.stalledLearners === 0 && insights.notStarted === 0 && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                  <p className="text-sm text-green-800">
                    All learning on track! Keep up the momentum.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}