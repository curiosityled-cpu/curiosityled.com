import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  FileText, Plus, Download, Loader2, Trash2, Edit, Pause, Play,
  Calendar as CalendarIcon, Mail, ArrowRight, CheckCircle, Share2,
  Users, Eye, Zap, XCircle, Clock
} from "lucide-react";
import CreateReportDialog from "./CreateReportDialog";
import ShareReportDialog from "./ShareReportDialog";
import ReportTemplatePicker from "./ReportTemplatePicker";

export default function MyReportsTab({ user, onUseTemplate }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(null);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedReportForHistory, setSelectedReportForHistory] = useState(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [reportToShare, setReportToShare] = useState(null);
  const [selectedReports, setSelectedReports] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFormat, setFilterFormat] = useState('all');
  const [filterInterval, setFilterInterval] = useState('all');
  const [sortBy, setSortBy] = useState('created_date');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const allReports = await base44.entities.ScheduledReport.list('-created_date');
      setReports(allReports || []);
      setSelectedReports([]);
    } catch (e) {
      console.error('Error loading reports:', e);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedReports = useMemo(() => {
    let filtered = [...reports];
    if (filterStatus !== 'all') filtered = filtered.filter(r => r.status === filterStatus);
    if (filterFormat !== 'all') filtered = filtered.filter(r => r.output_format === filterFormat);
    if (filterInterval !== 'all') filtered = filtered.filter(r => r.schedule_interval === filterInterval);
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'name': aVal = a.report_name?.toLowerCase() || ''; bVal = b.report_name?.toLowerCase() || ''; break;
        case 'created_date': aVal = new Date(a.created_date || 0); bVal = new Date(b.created_date || 0); break;
        case 'last_generated': aVal = new Date(a.last_generated_date || 0); bVal = new Date(b.last_generated_date || 0); break;
        case 'status': aVal = a.status || ''; bVal = b.status || ''; break;
        default: return 0;
      }
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [reports, filterStatus, filterFormat, filterInterval, sortBy, sortOrder]);

  const getUserPermission = (report) => {
    if (!user || !report) return null;
    if (report.created_by_email === user.email) return 'owner';
    const individualShare = report.shared_with?.find(s => s.user_email === user.email);
    if (individualShare) return individualShare.permission_level;
    if (report.is_team_shared && report.client_id === user.client_id) return report.team_permission_level || 'view';
    return null;
  };

  const canEditReport = (report) => {
    const p = getUserPermission(report);
    return p === 'owner' || p === 'edit';
  };
  const canDeleteReport = (report) => getUserPermission(report) === 'owner';
  const canShareReport = (report) => getUserPermission(report) === 'owner';

  const getScheduleDescription = (report) => {
    if (report.schedule_interval === 'once') return 'One-time';
    if (report.schedule_interval === 'daily') return 'Daily';
    if (report.schedule_interval === 'every_n_days') return `Every ${report.schedule_every_n_days} day${report.schedule_every_n_days > 1 ? 's' : ''}`;
    if (report.schedule_interval === 'weekly') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `Weekly on ${days[report.schedule_day_of_week] || 'Mon'}`;
    }
    if (report.schedule_interval === 'monthly') return `Monthly on day ${report.schedule_day_of_month}`;
    if (report.schedule_interval === 'first_weekday_of_month') return 'First weekday of month';
    if (report.schedule_interval === 'specific_dates') return `${report.schedule_specific_dates?.length || 0} specific date${report.schedule_specific_dates?.length !== 1 ? 's' : ''}`;
    return report.schedule_interval;
  };

  const handleGenerateNow = async (report) => {
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
        const signedUrlResult = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: result.data.file_uri, expires_in: 3600 });
        await base44.entities.ScheduledReport.update(report.id, {
          last_generated_date: new Date().toISOString(),
          last_file_uri: result.data.file_uri,
          total_generations: (report.total_generations || 0) + 1,
          generation_history: [...(report.generation_history || []), {
            timestamp: new Date().toISOString(), status: 'success', file_uri: result.data.file_uri,
            recipients_count: report.recipients?.length || 0, triggered_by: user.email
          }]
        });
        window.open(signedUrlResult.signed_url, '_blank');
        toast.success('Report generated successfully');
        loadReports();
      } else {
        await base44.entities.ScheduledReport.update(report.id, {
          last_generated_date: new Date().toISOString(),
          total_generations: (report.total_generations || 0) + 1,
          generation_history: [...(report.generation_history || []), {
            timestamp: new Date().toISOString(), status: 'failed',
            error_message: result.data.error || 'Unknown error', triggered_by: user.email
          }]
        });
        toast.error('Failed to generate report: ' + (result.data.error || 'Unknown error'));
        loadReports();
      }
    } catch (e) {
      console.error('Error generating report:', e);
      toast.error('Failed to generate report');
    } finally {
      setGeneratingReport(null);
    }
  };

  const handleDownloadLast = async (report) => {
    if (!report.last_file_uri) { toast.error('No previous report available'); return; }
    try {
      const signedUrlResult = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: report.last_file_uri, expires_in: 3600 });
      window.open(signedUrlResult.signed_url, '_blank');
    } catch (e) { toast.error('Failed to download report'); }
  };

  const handleToggleStatus = async (report) => {
    try {
      const newStatus = report.status === 'active' ? 'paused' : 'active';
      await base44.entities.ScheduledReport.update(report.id, { status: newStatus });
      toast.success(`Report ${newStatus === 'active' ? 'activated' : 'paused'}`);
      loadReports();
    } catch (e) { toast.error('Failed to update report status'); }
  };

  const handleDeleteReport = async (report) => {
    if (!confirm(`Are you sure you want to delete "${report.report_name}"?`)) return;
    try {
      await base44.entities.ScheduledReport.delete(report.id);
      toast.success('Report deleted successfully');
      loadReports();
    } catch (e) { toast.error('Failed to delete report'); }
  };

  const handleEditReport = (report) => {
    setEditingReport(report);
    setShowCreateDialog(true);
  };

  const handleCloneReport = async (report) => {
    try {
      const cloned = {
        report_name: `${report.report_name} (Copy)`,
        created_by_email: user.email, client_id: user.client_id,
        report_config: report.report_config, output_format: report.output_format,
        schedule_interval: report.schedule_interval, recipients: report.recipients,
        status: 'active', cloned_from_id: report.id
      };
      if (report.schedule_interval === 'weekly') cloned.schedule_day_of_week = report.schedule_day_of_week;
      else if (report.schedule_interval === 'monthly') cloned.schedule_day_of_month = report.schedule_day_of_month;
      else if (report.schedule_interval === 'every_n_days') cloned.schedule_every_n_days = report.schedule_every_n_days;
      else if (report.schedule_interval === 'specific_dates') cloned.schedule_specific_dates = report.schedule_specific_dates;
      if (report.schedule_end_date) cloned.schedule_end_date = report.schedule_end_date;
      await base44.entities.ScheduledReport.create(cloned);
      toast.success('Report cloned successfully');
      loadReports();
    } catch (e) { toast.error('Failed to clone report'); }
  };

  const handleBulkPause = async () => {
    if (selectedReports.length === 0) return;
    if (!confirm(`Pause ${selectedReports.length} selected report(s)?`)) return;
    setBulkActionLoading(true);
    try {
      await Promise.all(selectedReports.map(id => base44.entities.ScheduledReport.update(id, { status: 'paused' })));
      toast.success(`${selectedReports.length} report(s) paused`);
      setSelectedReports([]); loadReports();
    } catch (e) { toast.error('Failed to pause some reports'); }
    finally { setBulkActionLoading(false); }
  };

  const handleBulkActivate = async () => {
    if (selectedReports.length === 0) return;
    if (!confirm(`Activate ${selectedReports.length} selected report(s)?`)) return;
    setBulkActionLoading(true);
    try {
      await Promise.all(selectedReports.map(id => base44.entities.ScheduledReport.update(id, { status: 'active' })));
      toast.success(`${selectedReports.length} report(s) activated`);
      setSelectedReports([]); loadReports();
    } catch (e) { toast.error('Failed to activate some reports'); }
    finally { setBulkActionLoading(false); }
  };

  const handleBulkDelete = async () => {
    if (selectedReports.length === 0) return;
    if (!confirm(`Delete ${selectedReports.length} selected report(s)? This action cannot be undone.`)) return;
    setBulkActionLoading(true);
    try {
      await Promise.all(selectedReports.map(id => base44.entities.ScheduledReport.delete(id)));
      toast.success(`${selectedReports.length} report(s) deleted`);
      setSelectedReports([]); loadReports();
    } catch (e) { toast.error('Failed to delete some reports'); }
    finally { setBulkActionLoading(false); }
  };

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold text-gray-700">Your Reports</h3>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowTemplatePicker(true)} variant="outline" size="sm" className="h-8">
            <FileText className="w-3.5 h-3.5 mr-1.5" /> Use Template
          </Button>
          <Button onClick={() => { setEditingReport(null); setShowCreateDialog(true); }} className="bg-[#0202ff] hover:bg-[#0101dd] text-white" size="sm">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New Report
          </Button>
          <Button onClick={loadReports} variant="ghost" size="icon" title="Refresh" disabled={loading} className="h-8 w-8">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Bulk actions bar */}
      <AnimatePresence>
        {selectedReports.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="flex items-center justify-between bg-[#0202ff]/5 border border-[#0202ff]/15 rounded-lg p-2.5">
              <Badge className="bg-[#0202ff] text-white text-xs">{selectedReports.length} Selected</Badge>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" onClick={handleBulkActivate} disabled={bulkActionLoading} className="h-7 text-xs"><Play className="w-3 h-3 mr-1" /> Activate</Button>
                <Button size="sm" variant="outline" onClick={handleBulkPause} disabled={bulkActionLoading} className="h-7 text-xs"><Pause className="w-3 h-3 mr-1" /> Pause</Button>
                <Button size="sm" variant="outline" onClick={handleBulkDelete} disabled={bulkActionLoading} className="h-7 text-xs text-red-600 hover:text-red-700"><Trash2 className="w-3 h-3 mr-1" /> Delete</Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedReports([])} className="h-7 text-xs">Clear</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter strip */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 text-xs w-28"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem><SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterFormat} onValueChange={setFilterFormat}>
          <SelectTrigger className="h-8 text-xs w-28"><SelectValue placeholder="Format" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Formats</SelectItem><SelectItem value="pdf">PDF</SelectItem><SelectItem value="csv">CSV</SelectItem></SelectContent>
        </Select>
        <Select value={filterInterval} onValueChange={setFilterInterval}>
          <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="Schedule" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Schedules</SelectItem><SelectItem value="once">One-time</SelectItem>
            <SelectItem value="daily">Daily</SelectItem><SelectItem value="every_n_days">Every N Days</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="first_weekday_of_month">First Weekday</SelectItem><SelectItem value="specific_dates">Specific Dates</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="Sort by" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="created_date">Date Created</SelectItem><SelectItem value="name">Name</SelectItem>
            <SelectItem value="last_generated">Last Generated</SelectItem><SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="ghost" className="h-8" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
          {sortOrder === 'asc' ? <ArrowRight className="w-4 h-4 rotate-[-90deg]" /> : <ArrowRight className="w-4 h-4 rotate-90" />}
        </Button>
      </div>

      {/* Reports table */}
      <div className="border border-gray-100 shadow-sm rounded-2xl bg-white overflow-hidden">
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" /></div>
          ) : filteredAndSortedReports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{reports.length === 0 ? 'No Reports Yet' : 'No Reports Match Filters'}</h3>
              <p className="text-xs text-gray-500 mb-3">{reports.length === 0 ? 'Create your first report from a template or start from scratch' : 'Try adjusting your filters to see more reports'}</p>
              {reports.length === 0 && (
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => setShowTemplatePicker(true)} size="sm" className="bg-[#0202ff] hover:bg-[#0101dd] text-white"><FileText className="w-3.5 h-3.5 mr-1.5" /> Browse Templates</Button>
                  <Button onClick={() => { setEditingReport(null); setShowCreateDialog(true); }} variant="outline" size="sm"><Plus className="w-3.5 h-3.5 mr-1.5" /> Create Report</Button>
                </div>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox checked={selectedReports.length === filteredAndSortedReports.length && filteredAndSortedReports.length > 0} onCheckedChange={(checked) => { if (checked) setSelectedReports(filteredAndSortedReports.filter(canEditReport).map(r => r.id)); else setSelectedReports([]); }} />
                  </TableHead>
                  <TableHead>Report Name</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Generated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedReports.map((report) => {
                  const permission = getUserPermission(report);
                  const isOwner = permission === 'owner';
                  const hasEditAccess = permission === 'owner' || permission === 'edit';
                  const sharedCount = (report.shared_with?.length || 0) + (report.is_team_shared ? 1 : 0);
                  return (
                    <TableRow key={report.id}>
                      <TableCell><Checkbox checked={selectedReports.includes(report.id)} onCheckedChange={(checked) => { if (checked) setSelectedReports(prev => [...prev, report.id]); else setSelectedReports(prev => prev.filter(id => id !== report.id)); }} disabled={!hasEditAccess} /></TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{report.report_name}</span>
                          {!isOwner && permission && (<Badge variant="outline" className="text-xs">{permission === 'edit' ? <><Edit className="w-3 h-3 mr-1" />Shared - Edit</> : <><Eye className="w-3 h-3 mr-1" />Shared - View</>}</Badge>)}
                          {isOwner && sharedCount > 0 && (<Badge variant="outline" className="text-xs bg-[#0202ff]/5"><Users className="w-3 h-3 mr-1" />{sharedCount} {sharedCount === 1 ? 'collaborator' : 'collaborators'}</Badge>)}
                          {report.cloned_from_id && (<Badge variant="outline" className="text-xs">Cloned</Badge>)}
                        </div>
                        {report.schedule_end_date && (<div className="text-xs text-gray-500 mt-1">Ends: {format(new Date(report.schedule_end_date), 'MMM d, yyyy')}</div>)}
                      </TableCell>
                      <TableCell><Badge variant="outline">{getScheduleDescription(report)}</Badge></TableCell>
                      <TableCell><span className="text-xs text-gray-600 flex items-center gap-1"><Mail className="w-3 h-3" />{report.recipients?.length || 0}</span></TableCell>
                      <TableCell><Badge>{report.output_format.toUpperCase()}</Badge></TableCell>
                      <TableCell>
                        <Badge className={report.status === 'active' ? 'bg-green-100 text-green-800' : report.status === 'paused' ? 'bg-yellow-100 text-yellow-800' : report.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}>{report.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>{report.last_generated_date ? format(new Date(report.last_generated_date), 'MMM d, yyyy HH:mm') : 'Never'}</div>
                        {report.total_generations > 0 && (<div className="text-xs text-gray-500 mt-1">{report.total_generations} generation{report.total_generations !== 1 ? 's' : ''}</div>)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => handleGenerateNow(report)} disabled={generatingReport === report.id} title="Generate Now" className="h-7 w-7 p-0">{generatingReport === report.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}</Button>
                          {report.last_file_uri && (<Button size="sm" variant="outline" onClick={() => handleDownloadLast(report)} title="Download Last Report" className="h-7 w-7 p-0"><FileText className="w-3 h-3" /></Button>)}
                          {report.generation_history?.length > 0 && (<Button size="sm" variant="outline" onClick={() => { setSelectedReportForHistory(report); setShowHistoryDialog(true); }} title="View History" className="h-7 w-7 p-0"><CalendarIcon className="w-3 h-3" /></Button>)}
                          {hasEditAccess && (<Button size="sm" variant="outline" onClick={() => handleCloneReport(report)} title="Clone Report" className="h-7 w-7 p-0"><Plus className="w-3 h-3" /></Button>)}
                          {hasEditAccess && (<Button size="sm" variant="outline" onClick={() => handleToggleStatus(report)} title={report.status === 'active' ? 'Pause' : 'Resume'} className="h-7 w-7 p-0">{report.status === 'active' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}</Button>)}
                          {canShareReport(report) && (<Button size="sm" variant="outline" onClick={() => { setReportToShare(report); setShowShareDialog(true); }} title="Share Report" className="h-7 w-7 p-0 text-[#0202ff] hover:text-[#0101dd]"><Share2 className="w-3 h-3" /></Button>)}
                          {hasEditAccess && (<Button size="sm" variant="outline" onClick={() => handleEditReport(report)} title="Edit Report" className="h-7 w-7 p-0"><Edit className="w-3 h-3" /></Button>)}
                          {canDeleteReport(report) && (<Button size="sm" variant="outline" onClick={() => handleDeleteReport(report)} title="Delete Report" className="h-7 w-7 p-0 text-red-600 hover:text-red-700"><Trash2 className="w-3 h-3" /></Button>)}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <ReportTemplatePicker
        open={showTemplatePicker}
        onOpenChange={setShowTemplatePicker}
        onSelect={(template) => {
          setShowTemplatePicker(false);
          onUseTemplate(template);
        }}
      />
      <CreateReportDialog
        open={showCreateDialog}
        onOpenChange={(open) => { if (!open) setEditingReport(null); setShowCreateDialog(open); }}
        editingReport={editingReport}
        userEmail={user?.email}
        clientId={user?.client_id}
        onSuccess={() => { setEditingReport(null); setShowCreateDialog(false); loadReports(); }}
      />
      <ShareReportDialog report={reportToShare} open={showShareDialog} onOpenChange={setShowShareDialog} onSuccess={loadReports} />

      {/* History Dialog */}
      {showHistoryDialog && selectedReportForHistory && (
        <HistoryDialog report={selectedReportForHistory} onClose={() => setShowHistoryDialog(false)} />
      )}
    </div>
  );
}

function HistoryDialog({ report, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold">Generation History: {report.report_name}</h3>
          <p className="text-xs text-gray-500 mt-1">Last {report.generation_history?.length || 0} generations</p>
        </div>
        <div className="p-4 space-y-3">
          {report.generation_history?.length > 0 ? (
            [...report.generation_history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map((entry, i) => (
              <div key={i} className={`border rounded-lg p-3 ${entry.status === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {entry.status === 'success' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                      <span className={`text-sm font-semibold ${entry.status === 'success' ? 'text-green-900' : 'text-red-900'}`}>{entry.status === 'success' ? 'Success' : 'Failed'}</span>
                      <span className="text-xs text-gray-600">{format(new Date(entry.timestamp), 'MMM d, yyyy HH:mm:ss')}</span>
                    </div>
                    {entry.status === 'success' ? (
                      <p className="text-xs text-gray-700">Sent to {entry.recipients_count || 0} recipient{entry.recipients_count !== 1 ? 's' : ''}.{entry.triggered_by && <span className="ml-2 text-gray-500">Triggered by: {entry.triggered_by}</span>}</p>
                    ) : (
                      <p className="text-xs text-red-700"><strong>Error:</strong> {entry.error_message || 'Unknown error'}{entry.triggered_by && <span className="ml-2 text-gray-500">Triggered by: {entry.triggered_by}</span>}</p>
                    )}
                  </div>
                  {entry.status === 'success' && entry.file_uri && (
                    <Button size="sm" variant="outline" onClick={async () => {
                      try {
                        const signed = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: entry.file_uri, expires_in: 3600 });
                        window.open(signed.signed_url, '_blank');
                      } catch { toast.error('Failed to download'); }
                    }}><Download className="w-3 h-3 mr-1" />Download</Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500"><FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" /><p className="text-sm">No generation history available yet</p></div>
          )}
        </div>
        <div className="p-4 border-t border-gray-100 text-right">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}