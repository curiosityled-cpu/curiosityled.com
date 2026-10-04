import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, addDays, nextDay } from "date-fns";
import { toast } from "sonner";
import {
  Loader2, Mail, Clock, CheckCircle, XCircle, AlertTriangle,
  Calendar as CalendarIcon, Play, Pause, Zap, RefreshCw, Send
} from "lucide-react";

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function computeNextRunDate(report) {
  if (!report || report.status !== 'active') return null;
  const now = new Date();
  const interval = report.schedule_interval;

  if (interval === 'once') {
    return report.next_scheduled_date ? new Date(report.next_scheduled_date) : null;
  }
  if (interval === 'daily') {
    return addDays(now, 1);
  }
  if (interval === 'every_n_days') {
    return addDays(now, report.schedule_every_n_days || 1);
  }
  if (interval === 'weekly') {
    const targetDay = report.schedule_day_of_week ?? 1;
    return nextDay(now, targetDay);
  }
  if (interval === 'monthly') {
    const day = report.schedule_day_of_month || 1;
    const next = new Date(now);
    next.setDate(day);
    next.setHours(9, 0, 0, 0);
    if (next <= now) next.setMonth(next.getMonth() + 1);
    return next;
  }
  if (interval === 'first_weekday_of_month') {
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const day = next.getDay();
    if (day === 0) next.setDate(2);
    else if (day === 6) next.setDate(3);
    return next;
  }
  if (interval === 'specific_dates') {
    const dates = (report.schedule_specific_dates || []).map(d => new Date(d)).filter(d => d > now);
    dates.sort((a, b) => a - b);
    return dates[0] || null;
  }
  return report.next_scheduled_date ? new Date(report.next_scheduled_date) : null;
}

function getScheduleLabel(report) {
  const i = report.schedule_interval;
  if (i === 'once') return 'One-time';
  if (i === 'daily') return 'Daily';
  if (i === 'every_n_days') return `Every ${report.schedule_every_n_days} day${report.schedule_every_n_days > 1 ? 's' : ''}`;
  if (i === 'weekly') return `Weekly on ${DAYS[report.schedule_day_of_week] || 'Mon'}`;
  if (i === 'monthly') return `Monthly on day ${report.schedule_day_of_month}`;
  if (i === 'first_weekday_of_month') return 'First weekday of month';
  if (i === 'specific_dates') return `${report.schedule_specific_dates?.length || 0} specific date${report.schedule_specific_dates?.length !== 1 ? 's' : ''}`;
  return i;
}

export default function DeliveryTab({ user }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterTimeframe, setFilterTimeframe] = useState('6months');
  const [generatingReport, setGeneratingReport] = useState(null);

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.ScheduledReport.list('-created_date');
      setReports(all || []);
    } catch (e) {
      console.error('Error loading reports:', e);
      toast.error('Failed to load delivery data');
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = useMemo(() => {
    let filtered = [...reports];
    if (filterStatus !== 'all') filtered = filtered.filter(r => r.status === filterStatus);

    const cutoff = new Date();
    if (filterTimeframe === '3months') cutoff.setMonth(cutoff.getMonth() - 3);
    else if (filterTimeframe === '6months') cutoff.setMonth(cutoff.getMonth() - 6);
    else if (filterTimeframe === '12months') cutoff.setMonth(cutoff.getMonth() - 12);
    else if (filterTimeframe === 'all') return filtered;

    filtered = filtered.filter(r => {
      const lastGen = r.last_generated_date ? new Date(r.last_generated_date) : new Date(r.created_date || 0);
      return lastGen >= cutoff;
    });
    return filtered;
  }, [reports, filterStatus, filterTimeframe]);

  // Compute stats
  const stats = useMemo(() => {
    const active = filteredReports.filter(r => r.status === 'active');
    const totalRuns = filteredReports.reduce((sum, r) => sum + (r.total_generations || 0), 0);
    const allHistory = filteredReports.flatMap(r => r.generation_history || []);
    const successful = allHistory.filter(h => h.status === 'success').length;
    const failed = allHistory.filter(h => h.status === 'failed').length;
    const successRate = totalRuns > 0 ? Math.round((successful / totalRuns) * 100) : 0;
    const upcomingRuns = active.map(computeNextRunDate).filter(Boolean).length;
    return { activeCount: active.length, totalRuns, successful, failed, successRate, upcomingRuns };
  }, [filteredReports]);

  const handleRetry = async (report) => {
    setGeneratingReport(report.id);
    try {
      const result = await base44.functions.invoke('generateCustomReport', {
        report_id: report.id,
        report_config: report.report_config,
        output_format: report.output_format,
        recipients: report.recipients,
        created_by_email: report.created_by_email
      });
      if (result.data.success) {
        await base44.entities.ScheduledReport.update(report.id, {
          last_generated_date: new Date().toISOString(),
          last_file_uri: result.data.file_uri,
          total_generations: (report.total_generations || 0) + 1,
          generation_history: [...(report.generation_history || []), {
            timestamp: new Date().toISOString(), status: 'success', file_uri: result.data.file_uri,
            recipients_count: report.recipients?.length || 0, triggered_by: user.email
          }]
        });
        toast.success('Report regenerated and sent');
        loadReports();
      } else {
        toast.error('Retry failed: ' + (result.data.error || 'Unknown error'));
      }
    } catch (e) {
      toast.error('Failed to retry generation');
    } finally {
      setGeneratingReport(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border border-gray-100 shadow-sm rounded-2xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-8 h-8 rounded-lg bg-[#0202ff] flex items-center justify-center"><Play className="w-4 h-4 text-white" /></div>
            </div>
            <p className="text-xl font-bold text-gray-900">{stats.activeCount}</p>
            <p className="text-xs text-gray-600">Active Reports</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-100 shadow-sm rounded-2xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-white" /></div>
            </div>
            <p className="text-xl font-bold text-gray-900">{stats.successRate}%</p>
            <p className="text-xs text-gray-600">Success Rate</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-100 shadow-sm rounded-2xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center"><Zap className="w-4 h-4 text-white" /></div>
            </div>
            <p className="text-xl font-bold text-gray-900">{stats.totalRuns}</p>
            <p className="text-xs text-gray-600">Total Runs</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-100 shadow-sm rounded-2xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center"><Clock className="w-4 h-4 text-white" /></div>
            </div>
            <p className="text-xl font-bold text-gray-900">{stats.upcomingRuns}</p>
            <p className="text-xs text-gray-600">Upcoming Runs</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem><SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterTimeframe} onValueChange={setFilterTimeframe}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="3months">Last 3 Months</SelectItem><SelectItem value="6months">Last 6 Months</SelectItem>
            <SelectItem value="12months">Last 12 Months</SelectItem><SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={loadReports} variant="ghost" size="icon" className="h-8 w-8" title="Refresh"><RefreshCw className="w-4 h-4" /></Button>
      </div>

      {/* Delivery list */}
      {filteredReports.length === 0 ? (
        <div className="text-center py-12 border border-gray-100 rounded-2xl bg-white">
          <Send className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No scheduled reports in this timeframe</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => {
            const nextRun = computeNextRunDate(report);
            const lastHistory = report.generation_history?.[report.generation_history.length - 1];
            const lastFailed = lastHistory?.status === 'failed';
            return (
              <div key={report.id} className="border border-gray-100 shadow-sm rounded-2xl bg-white p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">{report.report_name}</h4>
                      <Badge className={report.status === 'active' ? 'bg-green-100 text-green-800' : report.status === 'paused' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}>{report.status}</Badge>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
                      <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" />{getScheduleLabel(report)}</span>
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{report.recipients?.length || 0} recipient{report.recipients?.length !== 1 ? 's' : ''}</span>
                      <span>{report.output_format.toUpperCase()}</span>
                    </div>
                  </div>
                  {nextRun && report.status === 'active' && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-500">Next Run</p>
                      <p className="text-sm font-semibold text-[#0202ff]">{format(nextRun, 'MMM d, yyyy')}</p>
                      <p className="text-xs text-gray-400">{format(nextRun, 'h:mm a')}</p>
                    </div>
                  )}
                </div>

                {/* Recipients */}
                {report.recipients?.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap mb-3">
                    {report.recipients.slice(0, 4).map((r, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] bg-gray-50">{r}</Badge>
                    ))}
                    {report.recipients.length > 4 && <Badge variant="outline" className="text-[10px]">+{report.recipients.length - 4} more</Badge>}
                  </div>
                )}

                {/* Last delivery status */}
                {lastHistory && (
                  <div className={`rounded-lg p-2.5 ${lastFailed ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {lastFailed ? <XCircle className="w-4 h-4 text-red-600" /> : <CheckCircle className="w-4 h-4 text-green-600" />}
                        <div>
                          <p className="text-xs font-medium text-gray-900">
                            {lastFailed ? 'Last delivery failed' : 'Last delivery successful'}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            {format(new Date(lastHistory.timestamp), 'MMM d, yyyy HH:mm')}
                            {lastFailed && lastHistory.error_message && ` · ${lastHistory.error_message}`}
                          </p>
                        </div>
                      </div>
                      {lastFailed && (
                        <Button size="sm" variant="outline" onClick={() => handleRetry(report)} disabled={generatingReport === report.id} className="h-7 text-xs">
                          {generatingReport === report.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                          Retry
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Recent history mini-list */}
                {report.generation_history?.length > 1 && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">View all {report.generation_history.length} runs</summary>
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                      {[...report.generation_history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10).map((h, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs py-1">
                          {h.status === 'success' ? <CheckCircle className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-red-500" />}
                          <span className="text-gray-600">{format(new Date(h.timestamp), 'MMM d, HH:mm')}</span>
                          <span className="text-gray-400">{h.recipients_count || 0} sent</span>
                          {h.triggered_by && <span className="text-gray-400">· by {h.triggered_by}</span>}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}