import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Trash2, Mail, Loader2, Wand2 } from "lucide-react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const AVAILABLE_METRICS = [
  { id: 'total_leaders', label: 'Total Leaders', category: 'Leadership' },
  { id: 'avg_leadership_score', label: 'Average Leadership Score', category: 'Leadership' },
  { id: 'at_risk_leaders', label: 'At-Risk Leaders', category: 'Leadership' },
  { id: 'high_potential_leaders', label: 'High-Potential Leaders', category: 'Leadership' },
  { id: 'goal_completion_rate', label: 'Goal Completion Rate', category: 'Goals' },
  { id: 'overdue_goals', label: 'Overdue Goals', category: 'Goals' },
  { id: 'total_goals', label: 'Total Goals', category: 'Goals' },
  { id: 'learning_completion_rate', label: 'Learning Completion Rate', category: 'Learning' },
  { id: 'total_learning', label: 'Total Learning Assignments', category: 'Learning' },
  { id: 'journey_completion_rate', label: 'Journey Completion Rate', category: 'Journeys' },
  { id: 'total_journeys', label: 'Total Journey Enrollments', category: 'Journeys' },
  { id: 'total_assessments', label: 'Total Assessments', category: 'Assessments' }
];

const AVAILABLE_FIELDS = [
  { id: 'user.full_name', label: 'Full Name', category: 'User Information', description: "User's full name", dataType: 'text' },
  { id: 'user.email', label: 'Email Address', category: 'User Information', description: "User's email address", dataType: 'text' },
  { id: 'user.app_role', label: 'Role', category: 'User Information', description: "User's role in the platform", dataType: 'text' },
  { id: 'user.department', label: 'Department', category: 'User Information', description: "User's department", dataType: 'text' },
  { id: 'assessment.overall_pct', label: 'Overall Score (%)', category: 'Assessment Results', description: 'Overall leadership assessment score', dataType: 'number' },
  { id: 'assessment.si_pct', label: 'Situational Intelligence (%)', category: 'Assessment Results', description: 'SI competency score', dataType: 'number' },
  { id: 'assessment.dm_pct', label: 'Decision Making (%)', category: 'Assessment Results', description: 'Decision-making competency score', dataType: 'number' },
  { id: 'goal.title', label: 'Goal Title', category: 'Goals & Development', description: 'Title of the development goal', dataType: 'text' },
  { id: 'goal.status', label: 'Goal Status', category: 'Goals & Development', description: 'Current status of the goal', dataType: 'text' },
  { id: 'learning.title', label: 'Learning Title', category: 'Learning & Development', description: 'Title of learning assignment', dataType: 'text' },
  { id: 'learning.status', label: 'Learning Status', category: 'Learning & Development', description: 'Current learning status', dataType: 'text' },
];

export default function CreateReportDialog({
  open,
  onOpenChange,
  editingReport,
  userEmail,
  clientId,
  onSuccess
}) {
  const [reportName, setReportName] = useState(editingReport?.report_name || '');
  const [selectedMetrics, setSelectedMetrics] = useState(editingReport?.report_config?.metrics || []);
  const [selectedFields, setSelectedFields] = useState(editingReport?.report_config?.selected_fields || []);
  const [filters, setFilters] = useState(editingReport?.report_config?.filters || { timeframe: '6months', division: 'all', level: 'all', tenure: 'all' });
  const [customDateRange, setCustomDateRange] = useState({ from: null, to: null });
  const [outputFormat, setOutputFormat] = useState(editingReport?.output_format || 'pdf');
  const [scheduleInterval, setScheduleInterval] = useState(editingReport?.schedule_interval || 'once');
  const [scheduleEveryNDays, setScheduleEveryNDays] = useState(editingReport?.schedule_every_n_days || 1);
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState(editingReport?.schedule_day_of_week || 1);
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = useState(editingReport?.schedule_day_of_month || 1);
  const [scheduleSpecificDates, setScheduleSpecificDates] = useState([]);
  const [scheduleEndDate, setScheduleEndDate] = useState(null);
  const [recipients, setRecipients] = useState(editingReport?.recipients || [userEmail || '']);
  const [saving, setSaving] = useState(false);

  // AI Assistant state
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');
  const [aiGenerating, setAIGenerating] = useState(false);

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please describe what report you need');
      return;
    }
    setAIGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a report builder assistant for a leadership development platform. Based on the user's request below, suggest a report name and which metrics to include.

Available metrics: ${AVAILABLE_METRICS.map(m => `${m.id} (${m.label})`).join(', ')}

User request: "${aiPrompt}"

Respond with JSON only:
{
  "report_name": "...",
  "metrics": ["metric_id_1", "metric_id_2"],
  "timeframe": "3months|6months|12months|all",
  "rationale": "1-2 sentence explanation"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            report_name: { type: "string" },
            metrics: { type: "array", items: { type: "string" } },
            timeframe: { type: "string" },
            rationale: { type: "string" }
          }
        }
      });

      if (result?.report_name) {
        setReportName(result.report_name);
        const validMetrics = result.metrics?.filter(m => AVAILABLE_METRICS.some(am => am.id === m)) || [];
        setSelectedMetrics(validMetrics);
        if (result.timeframe) setFilters(f => ({ ...f, timeframe: result.timeframe }));
        setShowAIAssistant(false);
        setAIPrompt('');
        toast.success('Report configured by AI! Review and adjust as needed.');
      }
    } catch (err) {
      toast.error('AI generation failed. Please try again.');
    } finally {
      setAIGenerating(false);
    }
  };

  const handleMetricToggle = (id) => {
    setSelectedMetrics(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const handleFieldToggle = (id) => {
    setSelectedFields(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const handleSelectAllFieldsInCategory = (category) => {
    const ids = AVAILABLE_FIELDS.filter(f => f.category === category).map(f => f.id);
    const allSelected = ids.every(id => selectedFields.includes(id));
    setSelectedFields(prev => allSelected ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])]);
  };

  const handleSave = async () => {
    if (!reportName.trim()) { toast.error('Please enter a report name'); return; }
    if (selectedMetrics.length === 0 && selectedFields.length === 0) { toast.error('Please select at least one metric or field'); return; }

    setSaving(true);
    try {
      const reportConfig = {
        metrics: selectedMetrics,
        selected_fields: selectedFields,
        filters: {
          ...filters,
          ...(filters.timeframe === 'custom' && customDateRange.from && customDateRange.to
            ? { customDateRange: { from: format(customDateRange.from, 'yyyy-MM-dd'), to: format(customDateRange.to, 'yyyy-MM-dd') } }
            : {})
        }
      };

      const reportData = {
        report_name: reportName,
        created_by_email: userEmail,
        client_id: clientId,
        report_config: reportConfig,
        output_format: outputFormat,
        schedule_interval: scheduleInterval,
        recipients: recipients.filter(r => r.trim()),
        status: 'active'
      };

      if (scheduleInterval === 'weekly') reportData.schedule_day_of_week = scheduleDayOfWeek;
      else if (scheduleInterval === 'monthly') reportData.schedule_day_of_month = scheduleDayOfMonth;
      else if (scheduleInterval === 'every_n_days') reportData.schedule_every_n_days = scheduleEveryNDays;
      else if (scheduleInterval === 'specific_dates') reportData.schedule_specific_dates = scheduleSpecificDates.map(d => format(d, 'yyyy-MM-dd'));

      if (scheduleEndDate && scheduleInterval !== 'once' && scheduleInterval !== 'specific_dates') {
        reportData.schedule_end_date = format(scheduleEndDate, 'yyyy-MM-dd');
      }

      if (editingReport) {
        await base44.entities.ScheduledReport.update(editingReport.id, reportData);
        toast.success('Report updated successfully');
      } else {
        await base44.entities.ScheduledReport.create(reportData);
        toast.success('Report created successfully');
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      toast.error('Failed to save report');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingReport ? 'Edit Report' : 'Create New Report'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* AI Assistant Button */}
          <div>
            <Button
              type="button"
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold py-3 h-auto"
              onClick={() => setShowAIAssistant(!showAIAssistant)}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Use Smart Report Assistant
            </Button>
            <p className="text-center text-xs text-gray-500 mt-1">Let AI help you build the right report</p>

            <AnimatePresence>
              {showAIAssistant && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mt-3"
                >
                  <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-violet-600" />
                      <span className="text-sm font-semibold text-violet-900">Describe the report you need</span>
                    </div>
                    <Textarea
                      placeholder="e.g., I need a monthly report showing at-risk leaders and goal completion rates for our sales division..."
                      value={aiPrompt}
                      onChange={(e) => setAIPrompt(e.target.value)}
                      className="bg-white border-violet-200 focus:border-violet-400 min-h-[80px] text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleAIGenerate}
                        disabled={aiGenerating || !aiPrompt.trim()}
                        className="bg-violet-600 hover:bg-violet-700 text-white"
                        size="sm"
                      >
                        {aiGenerating ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                        ) : (
                          <><Sparkles className="w-4 h-4 mr-2" />Generate Report Config</>
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowAIAssistant(false)}>Cancel</Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Report Name */}
          <div>
            <Label>Report Name</Label>
            <Input
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              placeholder="e.g., Q1 Leadership Summary"
            />
          </div>

          {/* Metrics Selection */}
          <div>
            <Label>Select Metrics</Label>
            <div className="mt-2 space-y-2 max-h-64 overflow-y-auto border rounded-lg p-4">
              {Object.entries(
                AVAILABLE_METRICS.reduce((acc, metric) => {
                  if (!acc[metric.category]) acc[metric.category] = [];
                  acc[metric.category].push(metric);
                  return acc;
                }, {})
              ).map(([category, metrics]) => (
                <div key={category} className="mb-4">
                  <h4 className="font-semibold text-sm text-gray-700 mb-2">{category}</h4>
                  {metrics.map((metric) => (
                    <div key={metric.id} className="flex items-center space-x-2 ml-4 mb-2">
                      <Checkbox
                        id={`metric-${metric.id}`}
                        checked={selectedMetrics.includes(metric.id)}
                        onCheckedChange={() => handleMetricToggle(metric.id)}
                      />
                      <Label htmlFor={`metric-${metric.id}`} className="cursor-pointer">{metric.label}</Label>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Field Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base font-semibold">Select Report Fields (Optional)</Label>
              <Badge variant="outline" className="text-xs">
                {selectedFields.length === 0 ? 'All Fields' : `${selectedFields.length} Selected`}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-3">Choose specific data fields to include. Leaving this empty will include all relevant data for the selected metrics.</p>
            <div className="border rounded-lg p-4 max-h-96 overflow-y-auto bg-gray-50">
              {Object.entries(
                AVAILABLE_FIELDS.reduce((acc, field) => {
                  if (!acc[field.category]) acc[field.category] = [];
                  acc[field.category].push(field);
                  return acc;
                }, {})
              ).map(([category, fields]) => {
                const categoryIds = fields.map(f => f.id);
                const allSelected = categoryIds.every(id => selectedFields.includes(id));
                return (
                  <div key={category} className="mb-6 last:mb-0">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b">
                      <h4 className="font-semibold text-sm text-gray-900">{category}</h4>
                      <Button type="button" variant="ghost" size="sm" onClick={() => handleSelectAllFieldsInCategory(category)} className="text-xs h-7">
                        {allSelected ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {fields.map((field) => (
                        <div
                          key={field.id}
                          className={`flex items-start space-x-3 p-3 rounded-lg transition-colors ${
                            selectedFields.includes(field.id) ? 'bg-blue-50 border border-blue-200' : 'bg-white border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <Checkbox
                            id={`field-${field.id}`}
                            checked={selectedFields.includes(field.id)}
                            onCheckedChange={() => handleFieldToggle(field.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <Label htmlFor={`field-${field.id}`} className="cursor-pointer text-sm font-medium text-gray-900 block mb-1">{field.label}</Label>
                            <p className="text-xs text-gray-600 leading-tight">{field.description}</p>
                            <Badge variant="outline" className="mt-1 text-xs">{field.dataType}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filters */}
          <div>
            <Label>Filters</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <Label className="text-xs">Timeframe</Label>
                <Select value={filters.timeframe} onValueChange={(v) => setFilters({ ...filters, timeframe: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3months">Last 3 Months</SelectItem>
                    <SelectItem value="6months">Last 6 Months</SelectItem>
                    <SelectItem value="12months">Last 12 Months</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Division</Label>
                <Select value={filters.division} onValueChange={(v) => setFilters({ ...filters, division: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Divisions</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Level</Label>
                <Select value={filters.level} onValueChange={(v) => setFilters({ ...filters, level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="manager">Managers</SelectItem>
                    <SelectItem value="director">Directors</SelectItem>
                    <SelectItem value="vp">VPs</SelectItem>
                    <SelectItem value="c-suite">C-Suite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tenure</Label>
                <Select value={filters.tenure} onValueChange={(v) => setFilters({ ...filters, tenure: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tenure</SelectItem>
                    <SelectItem value="0-6">0-6 months</SelectItem>
                    <SelectItem value="6-12">6-12 months</SelectItem>
                    <SelectItem value="1-2">1-2 years</SelectItem>
                    <SelectItem value="2-5">2-5 years</SelectItem>
                    <SelectItem value="5plus">5+ years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {filters.timeframe === 'custom' && (
                <div className="col-span-2 flex gap-4">
                  <div className="flex-1">
                    <Label className="text-xs">From Date</Label>
                    <Calendar mode="single" selected={customDateRange.from} onSelect={(d) => setCustomDateRange({ ...customDateRange, from: d })} className="rounded-lg border w-full" />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">To Date</Label>
                    <Calendar mode="single" selected={customDateRange.to} onSelect={(d) => setCustomDateRange({ ...customDateRange, to: d })} className="rounded-lg border w-full" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Output Format */}
          <div>
            <Label>Output Format</Label>
            <Select value={outputFormat} onValueChange={setOutputFormat}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Schedule */}
          <div>
            <Label>Schedule</Label>
            <Select value={scheduleInterval} onValueChange={setScheduleInterval}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="once">One-time</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="every_n_days">Every N Days</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="first_weekday_of_month">First Weekday of Month</SelectItem>
                <SelectItem value="specific_dates">Specific Dates</SelectItem>
              </SelectContent>
            </Select>

            {scheduleInterval === 'every_n_days' && (
              <div className="mt-3 flex items-center gap-2">
                <Input type="number" min="1" max="365" value={scheduleEveryNDays} onChange={(e) => setScheduleEveryNDays(parseInt(e.target.value) || 1)} className="w-24" />
                <span className="text-sm text-gray-600">day(s)</span>
              </div>
            )}
            {scheduleInterval === 'weekly' && (
              <div className="mt-3">
                <Label className="text-xs">Day of Week</Label>
                <Select value={scheduleDayOfWeek.toString()} onValueChange={(v) => setScheduleDayOfWeek(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d, i) => (
                      <SelectItem key={i} value={i.toString()}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {scheduleInterval === 'monthly' && (
              <div className="mt-3">
                <Label className="text-xs">Day of Month</Label>
                <Input type="number" min="1" max="31" value={scheduleDayOfMonth} onChange={(e) => setScheduleDayOfMonth(parseInt(e.target.value))} />
              </div>
            )}
            {scheduleInterval === 'specific_dates' && (
              <div className="mt-3">
                <Calendar mode="multiple" selected={scheduleSpecificDates} onSelect={setScheduleSpecificDates} disabled={(d) => d < new Date()} className="rounded-lg border" />
              </div>
            )}
          </div>

          {/* Recipients */}
          <div>
            <Label>Email Recipients</Label>
            <div className="space-y-2 mt-2">
              {recipients.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={r} onChange={(e) => { const n = [...recipients]; n[i] = e.target.value; setRecipients(n); }} placeholder="email@example.com" />
                  <Button variant="outline" size="sm" onClick={() => setRecipients(recipients.filter((_, idx) => idx !== i))} disabled={recipients.length === 1}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setRecipients([...recipients, ''])}>
                <Mail className="w-3 h-3 mr-2" />Add Recipient
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {editingReport ? 'Update Report' : 'Create Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}