import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, Zap, FileText, Play, Pause, Clock, CheckCircle, AlertTriangle, TrendingUp, Award, Activity, Calendar as CalendarIcon, History } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ['#0202ff', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function ReportAnalyticsView({ user }) {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [filters, setFilters] = useState({ timeframe: '6months', reportType: 'all', outputFormat: 'all' });

  useEffect(() => { if (user) loadReports(); }, [user]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.ScheduledReport.list('-created_date');
      setReports(all || []);
    } catch (e) {
      console.error('Error loading reports:', e);
      toast.error('Failed to load report analytics');
    } finally {
      setLoading(false);
    }
  };

  const getDateCutoff = () => {
    const now = new Date();
    switch (filters.timeframe) {
      case '3months': return new Date(now.setMonth(now.getMonth() - 3));
      case '6months': return new Date(now.setMonth(now.getMonth() - 6));
      case '12months': return new Date(now.setMonth(now.getMonth() - 12));
      case 'all': return new Date(0);
      default: return new Date(now.setMonth(now.getMonth() - 6));
    }
  };

  const filteredReports = useMemo(() => {
    const cutoff = getDateCutoff();
    let filtered = reports.filter(r => new Date(r.created_date) >= cutoff);
    if (filters.reportType !== 'all') filtered = filtered.filter(r => r.schedule_interval === filters.reportType);
    if (filters.outputFormat !== 'all') filtered = filtered.filter(r => r.output_format === filters.outputFormat);
    return filtered;
  }, [reports, filters]);

  const metrics = useMemo(() => {
    const totalReports = filteredReports.length;
    const activeReports = filteredReports.filter(r => r.status === 'active').length;
    const pausedReports = filteredReports.filter(r => r.status === 'paused').length;
    const totalGenerations = filteredReports.reduce((sum, r) => sum + (r.total_generations || 0), 0);
    const reportsWithHistory = filteredReports.filter(r => r.generation_history?.length > 0);
    const successfulGenerations = reportsWithHistory.reduce((sum, r) => sum + r.generation_history.filter(h => h.status === 'success').length, 0);
    const failedGenerations = reportsWithHistory.reduce((sum, r) => sum + r.generation_history.filter(h => h.status === 'failed').length, 0);
    const successRate = totalGenerations > 0 ? Math.round((successfulGenerations / totalGenerations) * 100) : 0;
    return { totalReports, activeReports, pausedReports, totalGenerations, successfulGenerations, failedGenerations, successRate, avgGenerationsPerReport: totalReports > 0 ? (totalGenerations / totalReports).toFixed(1) : 0 };
  }, [filteredReports]);

  const reportsBySchedule = useMemo(() => {
    const schedule = {};
    filteredReports.forEach(r => { const i = r.schedule_interval || 'once'; schedule[i] = (schedule[i] || 0) + 1; });
    return Object.entries(schedule).map(([type, count]) => ({ type: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), count }));
  }, [filteredReports]);

  const reportsByFormat = useMemo(() => {
    const formats = {};
    filteredReports.forEach(r => { const fmt = r.output_format || 'pdf'; formats[fmt] = (formats[fmt] || 0) + 1; });
    return Object.entries(formats).map(([fmt, count]) => ({ format: fmt.toUpperCase(), count }));
  }, [filteredReports]);

  const topReports = useMemo(() => {
    return filteredReports.filter(r => r.total_generations > 0).sort((a, b) => (b.total_generations || 0) - (a.total_generations || 0)).slice(0, 5).map(r => ({ id: r.id, name: r.report_name, generations: r.total_generations || 0, format: r.output_format, schedule: r.schedule_interval }));
  }, [filteredReports]);

  const generationTrends = useMemo(() => {
    const trends = [];
    const months = filters.timeframe === '3months' ? 3 : filters.timeframe === '6months' ? 6 : 12;
    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(); monthStart.setMonth(monthStart.getMonth() - i); monthStart.setDate(1);
      const monthEnd = new Date(monthStart); monthEnd.setMonth(monthEnd.getMonth() + 1);
      let successCount = 0, failureCount = 0;
      filteredReports.forEach(r => {
        r.generation_history?.forEach(h => {
          const d = new Date(h.timestamp);
          if (d >= monthStart && d < monthEnd) { if (h.status === 'success') successCount++; else if (h.status === 'failed') failureCount++; }
        });
      });
      trends.push({ month: format(monthStart, 'MMM'), successful: successCount, failed: failureCount, total: successCount + failureCount });
    }
    return trends;
  }, [filteredReports, filters.timeframe]);

  const reportsNeedingAttention = useMemo(() => {
    return filteredReports.filter(r => {
      const last = r.generation_history?.[r.generation_history.length - 1];
      return last?.status === 'failed';
    }).slice(0, 5);
  }, [filteredReports]);

  const allGenerationEvents = useMemo(() => {
    const events = [];
    filteredReports.forEach(r => {
      (r.generation_history || []).forEach(h => {
        events.push({
          reportName: r.report_name,
          timestamp: h.timestamp,
          status: h.status,
          fileUri: h.file_uri,
          errorMessage: h.error_message,
          recipientsCount: h.recipients_count,
          format: r.output_format,
          createdBy: r.created_by_email,
        });
      });
    });
    return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [filteredReports]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={loadReports} variant="ghost" size="icon" title="Refresh data" disabled={loading} className="h-8 w-8">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filters.timeframe} onValueChange={(v) => setFilters({ ...filters, timeframe: v })}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="3months">Last 3 Months</SelectItem><SelectItem value="6months">Last 6 Months</SelectItem><SelectItem value="12months">Last 12 Months</SelectItem><SelectItem value="all">All Time</SelectItem></SelectContent>
        </Select>
        <Select value={filters.reportType} onValueChange={(v) => setFilters({ ...filters, reportType: v })}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="once">One-time</SelectItem><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent>
        </Select>
        <Select value={filters.outputFormat} onValueChange={(v) => setFilters({ ...filters, outputFormat: v })}>
          <SelectTrigger className="h-8 text-xs w-28"><SelectValue placeholder="All Formats" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Formats</SelectItem><SelectItem value="pdf">PDF</SelectItem><SelectItem value="csv">CSV</SelectItem></SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="Total Reports" value={metrics.totalReports} icon={FileText} color="bg-[#0202ff]" />
        <MetricCard title="Active" value={metrics.activeReports} icon={Play} color="bg-green-500" />
        <MetricCard title="Generations" value={metrics.totalGenerations} icon={Zap} color="bg-blue-500" />
        <MetricCard title="Success Rate" value={`${metrics.successRate}%`} icon={CheckCircle} color="bg-emerald-500" />
      </div>

      <Card className="border border-gray-100 shadow-sm rounded-2xl">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[#0202ff]" /> Generation Trends</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={generationTrends}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><ChartTooltip /><Legend />
              <Line type="monotone" dataKey="successful" stroke="#10b981" strokeWidth={2} name="Successful" />
              <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} name="Failed" />
              <Line type="monotone" dataKey="total" stroke="#0202ff" strokeWidth={2} name="Total" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border border-gray-100 shadow-sm rounded-2xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CalendarIcon className="w-4 h-4 text-[#0202ff]" /> By Schedule Type</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={reportsBySchedule} cx="50%" cy="50%" labelLine={false} label={({ type, percent }) => `${type}: ${(percent * 100).toFixed(0)}%`} outerRadius={90} dataKey="count">
                  {reportsBySchedule.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <ChartTooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border border-gray-100 shadow-sm rounded-2xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-[#0202ff]" /> By Output Format</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={reportsByFormat}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="format" /><YAxis /><ChartTooltip /><Bar dataKey="count" fill="#0202ff" /></BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border border-gray-100 shadow-sm rounded-2xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Award className="w-4 h-4 text-yellow-600" /> Most Generated</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topReports.length > 0 ? topReports.map((report, idx) => (
                <div key={report.id} className="flex items-center justify-between p-2.5 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-yellow-500 flex items-center justify-center text-white text-xs font-bold">#{idx + 1}</div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{report.name}</p>
                      <div className="flex gap-1.5 mt-0.5"><Badge variant="outline" className="text-[10px]">{report.format.toUpperCase()}</Badge><Badge variant="outline" className="text-[10px]">{report.schedule}</Badge></div>
                    </div>
                  </div>
                  <div className="text-right"><div className="text-lg font-bold text-yellow-700">{report.generations}</div><p className="text-[10px] text-gray-500">generations</p></div>
                </div>
              )) : <div className="text-center py-6 text-gray-500 text-sm">No generation data yet</div>}
            </div>
          </CardContent>
        </Card>
        <Card className={`border border-gray-100 shadow-sm rounded-2xl ${reportsNeedingAttention.length > 0 ? 'border-l-4 border-l-red-500' : ''}`}>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-600" /> Needs Attention</CardTitle></CardHeader>
          <CardContent>
            {reportsNeedingAttention.length > 0 ? (
              <div className="space-y-2">
                {reportsNeedingAttention.map((report) => {
                  const last = report.generation_history[report.generation_history.length - 1];
                  return (
                    <div key={report.id} className="p-2.5 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900">{report.report_name}</p>
                        <Badge className="bg-red-600 text-white text-xs">Failed</Badge>
                      </div>
                      <p className="text-xs text-red-800 mb-1">Last failed: {format(new Date(last.timestamp), 'MMM d, yyyy HH:mm')}</p>
                      {last.error_message && <p className="text-[10px] text-red-700 bg-red-100 p-1.5 rounded">{last.error_message}</p>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500"><CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" /><p className="text-sm">All reports running smoothly!</p></div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border border-gray-100 shadow-sm rounded-2xl">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-indigo-600" /> Status Overview</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-green-50 rounded-lg"><Play className="w-6 h-6 text-green-600 mx-auto mb-1.5" /><div className="text-xl font-bold text-green-700">{metrics.activeReports}</div><p className="text-xs text-gray-600">Active</p></div>
            <div className="p-3 bg-yellow-50 rounded-lg"><Pause className="w-6 h-6 text-yellow-600 mx-auto mb-1.5" /><div className="text-xl font-bold text-yellow-700">{metrics.pausedReports}</div><p className="text-xs text-gray-600">Paused</p></div>
            <div className="p-3 bg-blue-50 rounded-lg"><Clock className="w-6 h-6 text-blue-600 mx-auto mb-1.5" /><div className="text-xl font-bold text-blue-700">{metrics.avgGenerationsPerReport}</div><p className="text-xs text-gray-600">Avg/Report</p></div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-100 shadow-sm rounded-2xl">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><History className="w-4 h-4 text-[#0202ff]" /> Generation History</CardTitle></CardHeader>
        <CardContent>
          {allGenerationEvents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                    <th className="pb-2 pr-4 font-medium">Timestamp</th>
                    <th className="pb-2 pr-4 font-medium">Report</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Recipients</th>
                    <th className="pb-2 pr-4 font-medium">Format</th>
                    <th className="pb-2 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {allGenerationEvents.slice(0, 50).map((evt, idx) => (
                    <tr key={idx} className="border-b border-gray-50">
                      <td className="py-2 pr-4 text-xs text-gray-600 whitespace-nowrap">{format(new Date(evt.timestamp), 'MMM d, yyyy HH:mm')}</td>
                      <td className="py-2 pr-4 text-xs font-medium text-gray-900">{evt.reportName}</td>
                      <td className="py-2 pr-4">
                        {evt.status === 'success' ? <Badge className="bg-green-100 text-green-700 text-[10px]">Success</Badge> : <Badge className="bg-red-100 text-red-700 text-[10px]">Failed</Badge>}
                      </td>
                      <td className="py-2 pr-4 text-xs text-gray-600">{evt.recipientsCount || '—'}</td>
                      <td className="py-2 pr-4 text-xs text-gray-600">{evt.format?.toUpperCase()}</td>
                      <td className="py-2 text-xs text-gray-500 max-w-xs truncate" title={evt.errorMessage || ''}>{evt.errorMessage || (evt.fileUri ? 'File generated' : '—')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {allGenerationEvents.length > 50 && <p className="text-xs text-gray-400 mt-2 text-center">Showing 50 of {allGenerationEvents.length} events</p>}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <History className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm">No report generations yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color }) {
  return (
    <Card className="border border-gray-100 shadow-sm rounded-2xl">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}><Icon className="w-4 h-4 text-white" /></div>
        </div>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-600 mt-0.5">{title}</p>
      </CardContent>
    </Card>
  );
}