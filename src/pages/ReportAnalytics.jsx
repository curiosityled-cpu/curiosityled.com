import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/components/useAuth";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/common/PageHeader";
import {
  FileText,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Calendar as CalendarIcon,
  Zap,
  AlertTriangle,
  Award,
  BarChart3,
  Activity,
  Download,
  Loader2,
  Play,
  Pause,
  Target
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { motion } from "framer-motion";
import { format, subDays, isAfter, isBefore, startOfDay, addMonths } from "date-fns";
import { toast } from "sonner";

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function ReportAnalytics() {
  const { user, appRole, roleDisplayName, isPlatformAdmin, isSuperAdmin } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [filters, setFilters] = useState({
    timeframe: '6months',
    division: 'all',
    reportType: 'all',
    outputFormat: 'all'
  });

  useEffect(() => {
    if (user) {
      loadReports();
    }
  }, [user]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const allReports = await base44.entities.ScheduledReport.list('-created_date');
      setReports(allReports || []);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Failed to load report analytics');
    } finally {
      setLoading(false);
    }
  };

  const getDateCutoff = () => {
    const now = new Date();
    switch(filters.timeframe) {
      case '3months': return subDays(now, 90);
      case '6months': return subDays(now, 180);
      case '12months': return subDays(now, 365);
      case 'all': return new Date(0);
      default: return subDays(now, 180);
    }
  };

  const filteredReports = useMemo(() => {
    const cutoffDate = getDateCutoff();
    let filtered = reports.filter(r => new Date(r.created_date) >= cutoffDate);

    if (filters.reportType !== 'all') {
      filtered = filtered.filter(r => r.schedule_interval === filters.reportType);
    }

    if (filters.outputFormat !== 'all') {
      filtered = filtered.filter(r => r.output_format === filters.outputFormat);
    }

    return filtered;
  }, [reports, filters]);

  const metrics = useMemo(() => {
    const totalReports = filteredReports.length;
    const activeReports = filteredReports.filter(r => r.status === 'active').length;
    const pausedReports = filteredReports.filter(r => r.status === 'paused').length;
    
    const totalGenerations = filteredReports.reduce((sum, r) => sum + (r.total_generations || 0), 0);
    
    const reportsWithHistory = filteredReports.filter(r => r.generation_history && r.generation_history.length > 0);
    const successfulGenerations = reportsWithHistory.reduce((sum, r) => 
      sum + r.generation_history.filter(h => h.status === 'success').length, 0
    );
    const failedGenerations = reportsWithHistory.reduce((sum, r) => 
      sum + r.generation_history.filter(h => h.status === 'failed').length, 0
    );
    
    const successRate = totalGenerations > 0 
      ? Math.round((successfulGenerations / totalGenerations) * 100) 
      : 0;

    return {
      totalReports,
      activeReports,
      pausedReports,
      totalGenerations,
      successfulGenerations,
      failedGenerations,
      successRate,
      avgGenerationsPerReport: totalReports > 0 ? (totalGenerations / totalReports).toFixed(1) : 0
    };
  }, [filteredReports]);

  // Reports by schedule type
  const reportsBySchedule = useMemo(() => {
    const schedule = {};
    filteredReports.forEach(r => {
      const interval = r.schedule_interval || 'once';
      schedule[interval] = (schedule[interval] || 0) + 1;
    });
    
    return Object.entries(schedule).map(([type, count]) => ({
      type: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count
    }));
  }, [filteredReports]);

  // Reports by output format
  const reportsByFormat = useMemo(() => {
    const formats = {};
    filteredReports.forEach(r => {
      const format = r.output_format || 'pdf';
      formats[format] = (formats[format] || 0) + 1;
    });
    
    return Object.entries(formats).map(([format, count]) => ({
      format: format.toUpperCase(),
      count
    }));
  }, [filteredReports]);

  // Reports by creator role
  const reportsByRole = useMemo(() => {
    const roles = {};
    filteredReports.forEach(r => {
      // Would need to fetch user data to get actual roles
      // For now, group by creator email domain
      const role = 'User'; // Placeholder
      roles[role] = (roles[role] || 0) + 1;
    });
    
    return Object.entries(roles).map(([role, count]) => ({
      role,
      count
    }));
  }, [filteredReports]);

  // Most popular templates/report configs
  const topReports = useMemo(() => {
    return filteredReports
      .filter(r => r.total_generations > 0)
      .sort((a, b) => (b.total_generations || 0) - (a.total_generations || 0))
      .slice(0, 5)
      .map(r => ({
        id: r.id,
        name: r.report_name,
        generations: r.total_generations || 0,
        format: r.output_format,
        schedule: r.schedule_interval
      }));
  }, [filteredReports]);

  // Generation trends over time
  const generationTrends = useMemo(() => {
    const trends = [];
    const months = filters.timeframe === '3months' ? 3 : filters.timeframe === '6months' ? 6 : 12;
    
    for (let i = months - 1; i >= 0; i--) {
      const monthStart = startOfDay(subDays(new Date(), i * 30));
      const monthEnd = startOfDay(subDays(new Date(), (i - 1) * 30));
      
      let successCount = 0;
      let failureCount = 0;
      
      filteredReports.forEach(r => {
        if (!r.generation_history) return;
        
        r.generation_history.forEach(h => {
          const historyDate = new Date(h.timestamp);
          if (isAfter(historyDate, monthStart) && isBefore(historyDate, monthEnd)) {
            if (h.status === 'success') successCount++;
            else if (h.status === 'failed') failureCount++;
          }
        });
      });
      
      trends.push({
        month: format(monthStart, 'MMM'),
        successful: successCount,
        failed: failureCount,
        total: successCount + failureCount
      });
    }
    
    return trends;
  }, [filteredReports, filters.timeframe]);

  // Reports needing attention
  const reportsNeedingAttention = useMemo(() => {
    return filteredReports.filter(r => {
      // Failed last generation
      const lastHistory = r.generation_history && r.generation_history.length > 0
        ? r.generation_history[r.generation_history.length - 1]
        : null;
      
      return lastHistory?.status === 'failed';
    }).slice(0, 5);
  }, [filteredReports]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <PageHeader
          title="Report Analytics"
          subtitle="Reporting trends and performance metrics across the platform"
          badges={[
            { text: roleDisplayName || appRole, className: "bg-white text-purple-600" },
            { text: `${metrics.totalReports} Reports`, className: "bg-white text-blue-600" },
            { text: `${metrics.successRate}% Success Rate`, className: "bg-white text-green-600" }
          ]}
          onRefresh={loadReports}
          loadingRefresh={loading}
        />

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm font-medium text-gray-700">Filters:</span>

                <Select value={filters.timeframe} onValueChange={(value) => setFilters({ ...filters, timeframe: value })}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3months">Last 3 Months</SelectItem>
                    <SelectItem value="6months">Last 6 Months</SelectItem>
                    <SelectItem value="12months">Last 12 Months</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.reportType} onValueChange={(value) => setFilters({ ...filters, reportType: value })}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Report Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="once">One-time</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.outputFormat} onValueChange={(value) => setFilters({ ...filters, outputFormat: value })}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Formats" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Formats</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <MetricCard 
            title="Total Reports" 
            value={metrics.totalReports} 
            icon={FileText} 
            color="bg-purple-500" 
          />
          <MetricCard 
            title="Active Reports" 
            value={metrics.activeReports} 
            icon={Play} 
            color="bg-green-500" 
          />
          <MetricCard 
            title="Total Generations" 
            value={metrics.totalGenerations} 
            icon={Zap} 
            color="bg-blue-500" 
          />
          <MetricCard 
            title="Success Rate" 
            value={`${metrics.successRate}%`} 
            icon={CheckCircle} 
            color="bg-emerald-500"
            trend={metrics.successRate >= 95 ? 'up' : metrics.successRate < 80 ? 'down' : null}
          />
        </div>

        {/* Generation Trends */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-0 shadow-lg mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                Report Generation Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={generationTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="successful" stroke="#10b981" strokeWidth={2} name="Successful" />
                  <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} name="Failed" />
                  <Line type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={2} name="Total" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Reports by Schedule Type */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-purple-600" />
                  Reports by Schedule Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={reportsBySchedule}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ type, percent }) => `${type}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      dataKey="count"
                    >
                      {reportsBySchedule.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Reports by Output Format */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Reports by Output Format
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportsByFormat}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="format" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Most Generated Reports */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="border-0 shadow-lg mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-600" />
                Most Generated Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topReports.length > 0 ? topReports.map((report, idx) => (
                  <div key={report.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-white font-bold">
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{report.name}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{report.format.toUpperCase()}</Badge>
                          <Badge variant="outline" className="text-xs">{report.schedule}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-yellow-700">{report.generations}</div>
                      <p className="text-xs text-gray-600">Generations</p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-500">
                    No report generation data available yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Generation Success Breakdown */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                  Generation Success Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <span className="font-medium text-gray-900">Successful</span>
                    </div>
                    <span className="text-2xl font-bold text-green-700">{metrics.successfulGenerations}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <XCircle className="w-6 h-6 text-red-600" />
                      <span className="font-medium text-gray-900">Failed</span>
                    </div>
                    <span className="text-2xl font-bold text-red-700">{metrics.failedGenerations}</span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Target className="w-6 h-6 text-blue-600" />
                      <span className="font-medium text-gray-900">Avg per Report</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-700">{metrics.avgGenerationsPerReport}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Reports Needing Attention */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card className={`border-0 shadow-lg ${reportsNeedingAttention.length > 0 ? 'border-l-4 border-l-red-500' : ''}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Reports Needing Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reportsNeedingAttention.length > 0 ? (
                  <div className="space-y-3">
                    {reportsNeedingAttention.map((report) => {
                      const lastHistory = report.generation_history[report.generation_history.length - 1];
                      return (
                        <div key={report.id} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-medium text-gray-900">{report.report_name}</p>
                            <Badge className="bg-red-600 text-white">Failed</Badge>
                          </div>
                          <p className="text-sm text-red-800 mb-2">
                            Last failed: {format(new Date(lastHistory.timestamp), 'MMM d, yyyy HH:mm')}
                          </p>
                          {lastHistory.error_message && (
                            <p className="text-xs text-red-700 bg-red-100 p-2 rounded">
                              {lastHistory.error_message}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p>All reports are running smoothly!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Report Status Overview */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-8">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                Report Status Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6 text-center">
                <div className="p-6 bg-green-50 rounded-lg">
                  <Play className="w-8 h-8 text-green-600 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-green-700">{metrics.activeReports}</div>
                  <p className="text-sm text-gray-600 mt-1">Active Reports</p>
                </div>
                
                <div className="p-6 bg-yellow-50 rounded-lg">
                  <Pause className="w-8 h-8 text-yellow-600 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-yellow-700">{metrics.pausedReports}</div>
                  <p className="text-sm text-gray-600 mt-1">Paused Reports</p>
                </div>

                <div className="p-6 bg-blue-50 rounded-lg">
                  <Clock className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-blue-700">{metrics.avgGenerationsPerReport}</div>
                  <p className="text-sm text-gray-600 mt-1">Avg Generations/Report</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color, trend }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            {trend && (
              <div className="flex items-center gap-1">
                {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-600" />}
                {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-600" />}
              </div>
            )}
          </div>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-600 mt-1">{title}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}