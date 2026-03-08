import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Map, TrendingUp, TrendingDown, Clock, Users, 
  CheckCircle2, AlertTriangle, BarChart3
} from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function JourneyEffectivenessInsights({ programs, journeys, journeyEnrollments }) {
  
  const journeyMetrics = useMemo(() => {
    return journeys.map(journey => {
      const enrollments = journeyEnrollments.filter(e => e.journey_id === journey.id);
      const completedCount = enrollments.filter(e => e.status === 'completed').length;
      const inProgressCount = enrollments.filter(e => e.status === 'in_progress').length;
      const notStartedCount = enrollments.filter(e => !e.status || e.status === 'not_started').length;
      
      const completionRate = enrollments.length > 0 
        ? Math.round((completedCount / enrollments.length) * 100)
        : 0;
      
      const avgProgress = enrollments.length > 0
        ? Math.round(enrollments.reduce((sum, e) => sum + (e.completion_percentage || 0), 0) / enrollments.length)
        : 0;

      // Calculate average time to completion (for completed enrollments)
      const completedEnrollments = enrollments.filter(e => e.status === 'completed' && e.enrolled_date && e.completed_date);
      const avgCompletionDays = completedEnrollments.length > 0
        ? Math.round(completedEnrollments.reduce((sum, e) => {
            const days = Math.floor((new Date(e.completed_date) - new Date(e.enrolled_date)) / (1000 * 60 * 60 * 24));
            return sum + days;
          }, 0) / completedEnrollments.length)
        : null;

      // At-risk count for this journey
      const atRiskCount = enrollments.filter(e => {
        if (e.status === 'completed') return false;
        const daysSinceEnrolled = e.enrolled_date 
          ? Math.floor((new Date() - new Date(e.enrolled_date)) / (1000 * 60 * 60 * 24))
          : 0;
        return (e.completion_percentage || 0) < 30 && daysSinceEnrolled > 14;
      }).length;

      // Determine effectiveness rating
      let effectiveness = 'good';
      if (completionRate >= 70) effectiveness = 'excellent';
      else if (completionRate >= 50) effectiveness = 'good';
      else if (completionRate >= 30) effectiveness = 'needs_improvement';
      else effectiveness = 'poor';

      // Find which program this journey belongs to
      const program = programs.find(p => p.journey_ids?.includes(journey.id));

      return {
        id: journey.id,
        title: journey.title || 'Untitled Journey',
        description: journey.description,
        programName: program?.name || 'Unassigned',
        totalEnrolled: enrollments.length,
        completedCount,
        inProgressCount,
        notStartedCount,
        completionRate,
        avgProgress,
        avgCompletionDays,
        atRiskCount,
        effectiveness,
        resourceCount: journey.resources?.length || 0,
        estimatedDuration: journey.estimated_duration_days || null
      };
    }).sort((a, b) => b.totalEnrolled - a.totalEnrolled);
  }, [journeys, journeyEnrollments, programs]);

  const chartData = journeyMetrics
    .filter(j => j.totalEnrolled > 0)
    .slice(0, 8)
    .map(j => ({
      name: j.title.length > 20 ? j.title.substring(0, 20) + '...' : j.title,
      completionRate: j.completionRate,
      avgProgress: j.avgProgress,
      enrolled: j.totalEnrolled
    }));

  const getEffectivenessColor = (effectiveness) => {
    switch (effectiveness) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'needs_improvement': return 'bg-yellow-100 text-yellow-800';
      case 'poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBarColor = (completionRate) => {
    if (completionRate >= 70) return '#22c55e';
    if (completionRate >= 50) return '#3b82f6';
    if (completionRate >= 30) return '#f59e0b';
    return '#ef4444';
  };

  // Summary stats
  const totalJourneys = journeyMetrics.length;
  const avgCompletionRate = journeyMetrics.length > 0
    ? Math.round(journeyMetrics.reduce((sum, j) => sum + j.completionRate, 0) / journeyMetrics.length)
    : 0;
  const topPerformer = journeyMetrics.find(j => j.totalEnrolled > 0 && j.completionRate === Math.max(...journeyMetrics.filter(jj => jj.totalEnrolled > 0).map(jj => jj.completionRate)));
  const needsAttention = journeyMetrics.filter(j => j.effectiveness === 'poor' || j.effectiveness === 'needs_improvement');

  if (journeyMetrics.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Map className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Journeys Found</h3>
          <p className="text-gray-500">No learning journeys are assigned to your programs yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Map className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{totalJourneys}</p>
                <p className="text-sm text-gray-600">Total Journeys</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{avgCompletionRate}%</p>
                <p className="text-sm text-gray-600">Avg Completion</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{topPerformer?.completionRate || 0}%</p>
                <p className="text-sm text-green-700">Top Performer</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={needsAttention.length > 0 ? "border-orange-200 bg-orange-50" : ""}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className={`w-8 h-8 ${needsAttention.length > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
              <div>
                <p className="text-2xl font-bold">{needsAttention.length}</p>
                <p className="text-sm text-gray-600">Need Attention</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Completion Rate Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Journey Completion Rates
            </CardTitle>
            <CardDescription>Comparison across your managed journeys</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip 
                  formatter={(value, name) => [
                    `${value}%`,
                    name === 'completionRate' ? 'Completion Rate' : 'Avg Progress'
                  ]}
                />
                <Bar dataKey="completionRate" name="Completion Rate">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.completionRate)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Journey Details */}
      <Card>
        <CardHeader>
          <CardTitle>Journey Details</CardTitle>
          <CardDescription>Detailed metrics for each learning journey</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {journeyMetrics.map((journey, idx) => (
              <motion.div
                key={journey.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="p-4 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{journey.title}</h4>
                    <p className="text-sm text-gray-500">{journey.programName}</p>
                  </div>
                  <Badge className={getEffectivenessColor(journey.effectiveness)}>
                    {journey.effectiveness.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Enrolled</p>
                    <p className="font-medium flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {journey.totalEnrolled}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Completed</p>
                    <p className="font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                      {journey.completedCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">In Progress</p>
                    <p className="font-medium">{journey.inProgressCount}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Avg Time</p>
                    <p className="font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {journey.avgCompletionDays ? `${journey.avgCompletionDays}d` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">At Risk</p>
                    <p className={`font-medium ${journey.atRiskCount > 0 ? 'text-orange-600' : ''}`}>
                      {journey.atRiskCount}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <span className="text-xs text-gray-500">Completion Rate:</span>
                  <Progress value={journey.completionRate} className="h-2 flex-1" />
                  <span className="text-sm font-medium">{journey.completionRate}%</span>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}