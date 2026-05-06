import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/components/useAuth";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import {
  FileText,
  Plus,
  Download,
  Loader2,
  Trash2,
  Edit,
  Pause,
  Play,
  Calendar as CalendarIcon,
  Mail,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  Building2,
  Award,
  AlertTriangle,
  BookOpen,
  ArrowRight,
  CheckCircle,
  Share2,
  Users,
  Eye,
  Zap,
  User,
  XCircle,
  Clock,
  Activity,
  GraduationCap,
  UserCheck,
  Briefcase
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ShareReportDialog from "../components/reports/ShareReportDialog";
import CreateReportDialog from "../components/reports/CreateReportDialog";
import SubNavMenu from "@/components/common/SubNavMenu";
import PageHeader from "@/components/common/PageHeader";
const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
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
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

// Standard Report Templates
const REPORT_TEMPLATES = [
  // Individual Leader Development Reports
  {
    id: 'my_leadership_assessment_summary',
    name: 'My Leadership Assessment Summary',
    description: 'Personal leadership profile with overall score, SI score, top strengths, development areas, and current archetype',
    category: 'Individual Development',
    audience: 'User Level 1',
    icon: Award,
    color: 'bg-purple-500',
    estimatedTime: '1-2 min',
    frequency: 'On-demand',
    metrics: ['avg_leadership_score', 'total_assessments', 'high_potential_leaders', 'at_risk_leaders'],
    filters: {
      timeframe: '6months',
      division: 'all',
      level: 'all',
      tenure: 'all'
    },
    output_format: 'pdf',
    schedule_interval: 'once'
  },
  {
    id: 'my_goal_progress',
    name: 'My Goal Progress Report',
    description: 'Track active goals, completed goals, goal completion rate, overdue goals, and progress on specific objectives',
    category: 'Individual Development',
    audience: 'User Level 1',
    icon: Target,
    color: 'bg-green-500',
    estimatedTime: '1 min',
    frequency: 'Weekly/Monthly',
    metrics: ['total_goals', 'goal_completion_rate', 'overdue_goals'],
    filters: {
      timeframe: '3months',
      division: 'all',
      level: 'all',
      tenure: 'all'
    },
    output_format: 'pdf',
    schedule_interval: 'weekly'
  },
  {
    id: 'my_learning_journey',
    name: 'My Learning Journey Overview',
    description: 'Summary of assigned learning, completed courses, learning completion rate, and progress tracking',
    category: 'Individual Development',
    audience: 'User Level 1',
    icon: BookOpen,
    color: 'bg-blue-500',
    estimatedTime: '1 min',
    frequency: 'Monthly',
    metrics: ['total_learning', 'learning_completion_rate'],
    filters: {
      timeframe: '6months',
      division: 'all',
      level: 'all',
      tenure: 'all'
    },
    output_format: 'pdf',
    schedule_interval: 'monthly'
  },

  // Team/Manager Performance Reports
  {
    id: 'team_leadership_health',
    name: 'Team Leadership Health Report',
    description: 'Comprehensive view of team members, average team leadership score, at-risk leaders, high-potential leaders, and competency distribution',
    category: 'Team Performance',
    audience: 'User Level 2',
    icon: Users, // Changed from UsersIcon to Users
    color: 'bg-indigo-500',
    estimatedTime: '2-3 min',
    frequency: 'Weekly/Monthly',
    metrics: ['total_leaders', 'avg_leadership_score', 'at_risk_leaders', 'high_potential_leaders'],
    filters: {
      timeframe: '6months',
      division: 'all',
      level: 'manager',
      tenure: 'all'
    },
    output_format: 'pdf',
    schedule_interval: 'weekly'
  },
  {
    id: 'team_development_progress',
    name: 'Team Development Progress',
    description: 'Track team goal completion rate, learning completion rate, overdue goals, and overall development momentum',
    category: 'Team Performance',
    audience: 'User Level 2',
    icon: TrendingUp,
    color: 'bg-emerald-500',
    estimatedTime: '2 min',
    frequency: 'Weekly',
    metrics: ['goal_completion_rate', 'learning_completion_rate', 'overdue_goals', 'total_goals', 'total_learning'],
    filters: {
      timeframe: '3months',
      division: 'all',
      level: 'manager',
      tenure: 'all'
    },
    output_format: 'pdf',
    schedule_interval: 'weekly'
  },

  // Organizational Leader / HR Strategic Reports
  {
    id: 'organizational_leadership_index',
    name: 'Organizational Leadership Index Summary',
    description: 'Executive-level view of overall org average leadership score, bench strength, ready-now leaders, high-potential leaders, and at-risk leaders',
    category: 'Organizational Strategy',
    audience: 'User Level 3',
    icon: Building2,
    color: 'bg-purple-600',
    estimatedTime: '3-5 min',
    frequency: 'Monthly',
    metrics: ['total_leaders', 'avg_leadership_score', 'high_potential_leaders', 'at_risk_leaders', 'total_assessments'],
    filters: {
      timeframe: '12months',
      division: 'all',
      level: 'all',
      tenure: 'all'
    },
    output_format: 'pdf',
    schedule_interval: 'monthly'
  },
  {
    id: 'competency_gap_analysis',
    name: 'Competency Gap Analysis',
    description: 'Identify organization-wide competency gaps with average scores for each competency and lowest-scoring areas',
    category: 'Organizational Strategy',
    audience: 'User Level 3',
    icon: BarChart3,
    color: 'bg-orange-500',
    estimatedTime: '3-4 min',
    frequency: 'Quarterly',
    metrics: ['avg_leadership_score', 'total_leaders', 'at_risk_leaders', 'total_assessments'],
    filters: {
      timeframe: '12months',
      division: 'all',
      level: 'all',
      tenure: 'all'
    },
    output_format: 'csv',
    schedule_interval: 'monthly'
  },
  {
    id: 'talent_pipeline_readiness',
    name: 'Talent Pipeline & Succession Readiness',
    description: 'Strategic view of pipeline strength, ready-now candidates for key roles, and high-potential leaders by level',
    category: 'Organizational Strategy',
    audience: 'User Level 3',
    icon: Award,
    color: 'bg-yellow-500',
    estimatedTime: '3-4 min',
    frequency: 'Monthly',
    metrics: ['high_potential_leaders', 'total_leaders', 'avg_leadership_score', 'at_risk_leaders'],
    filters: {
      timeframe: '12months',
      division: 'all',
      level: 'director',
      tenure: 'all'
    },
    output_format: 'pdf',
    schedule_interval: 'monthly'
  },
  {
    id: 'division_performance_comparison',
    name: 'Division Performance Comparison',
    description: 'Compare leadership performance across divisions with average scores, at-risk counts, and high-potential distribution',
    category: 'Organizational Strategy',
    audience: 'User Level 3',
    icon: TrendingUp,
    color: 'bg-blue-600',
    estimatedTime: '2-3 min',
    frequency: 'Monthly',
    metrics: ['total_leaders', 'avg_leadership_score', 'at_risk_leaders', 'high_potential_leaders'],
    filters: {
      timeframe: '6months',
      division: 'all',
      level: 'all',
      tenure: 'all'
    },
    output_format: 'csv',
    schedule_interval: 'monthly'
  },

  // Program Manager Reports
  {
    id: 'program_effectiveness',
    name: 'Program Effectiveness Report',
    description: 'Evaluate ROI of leadership development programs with participant completion rate, score improvement, and goal achievement',
    category: 'Program Management',
    audience: 'Admin Level 1',
    icon: Target,
    color: 'bg-teal-500',
    estimatedTime: '3-4 min',
    frequency: 'Monthly',
    metrics: ['total_leaders', 'avg_leadership_score', 'goal_completion_rate', 'learning_completion_rate', 'total_assessments'],
    filters: {
      timeframe: '6months',
      division: 'all',
      level: 'all',
      tenure: 'all'
    },
    output_format: 'pdf',
    schedule_interval: 'monthly'
  },

  // HR Admin Reports
  {
    id: 'platform_engagement_activity',
    name: 'User Engagement & Activity',
    description: 'Monitor platform adoption with total active users, new users, login frequency, and feature usage',
    category: 'Platform Administration',
    audience: 'Admin Level 2',
    icon: Users, // Changed from UsersIcon to Users
    color: 'bg-indigo-600',
    estimatedTime: '2 min',
    frequency: 'Weekly',
    metrics: ['total_leaders', 'total_assessments', 'total_goals', 'total_learning', 'total_journeys'],
    filters: {
      timeframe: '3months',
      division: 'all',
      level: 'all',
      tenure: 'all'
    },
    output_format: 'csv',
    schedule_interval: 'weekly'
  },
  {
    id: 'assessment_deployment_status',
    name: 'Assessment Deployment Status',
    description: 'Track assessment completion rates, outstanding assessments, and deployment effectiveness',
    category: 'Platform Administration',
    audience: 'Admin Level 2',
    icon: BarChart3,
    color: 'bg-purple-500',
    estimatedTime: '1-2 min',
    frequency: 'Weekly',
    metrics: ['total_assessments', 'total_leaders', 'avg_leadership_score'],
    filters: {
      timeframe: '3months',
      division: 'all',
      level: 'all',
      tenure: 'all'
    },
    output_format: 'pdf',
    schedule_interval: 'weekly'
  },

  // Comprehensive Executive Summary
  {
    id: 'executive_dashboard_summary',
    name: 'Executive Dashboard Summary',
    description: 'Complete organizational overview with all key metrics, trends, risks, and opportunities in a single comprehensive report',
    category: 'Executive Summary',
    audience: 'User Level 3',
    icon: Sparkles,
    color: 'bg-gradient-to-r from-purple-600 to-blue-600',
    estimatedTime: '5-7 min',
    frequency: 'Monthly',
    metrics: ['total_leaders', 'avg_leadership_score', 'goal_completion_rate', 'learning_completion_rate', 'journey_completion_rate', 'at_risk_leaders', 'high_potential_leaders', 'overdue_goals', 'total_assessments', 'total_goals', 'total_learning', 'total_journeys'],
    filters: {
      timeframe: '12months',
      division: 'all',
      level: 'all',
      tenure: 'all'
    },
    output_format: 'pdf',
    schedule_interval: 'monthly'
  },

  // Program Management Reports
  {
    id: 'program_class_attendance',
    name: 'Class Attendance Report',
    description: 'Detailed class attendance tracking including present, absent, late, and excused participants across all classes',
    category: 'Program Management',
    audience: 'Admin Level 1',
    icon: GraduationCap,
    color: 'bg-indigo-500',
    estimatedTime: '2-3 min',
    frequency: 'Weekly',
    metrics: ['total_classes', 'total_participants', 'attendance_rate'],
    filters: {
      timeframe: '3months',
      division: 'all',
      level: 'all',
      tenure: 'all'
    },
    output_format: 'csv',
    schedule_interval: 'weekly'
  },
  {
    id: 'program_coaching_summary',
    name: 'Coaching Engagement Summary',
    description: 'Overview of all coaching engagements including session counts, completion rates, and participant progress',
    category: 'Program Management',
    audience: 'Admin Level 1',
    icon: Users,
    color: 'bg-purple-500',
    estimatedTime: '2-3 min',
    frequency: 'Monthly',
    metrics: ['total_engagements', 'sessions_completed', 'coaching_completion_rate'],
    filters: {
      timeframe: '6months',
      division: 'all',
      level: 'all',
      tenure: 'all'
    },
    output_format: 'pdf',
    schedule_interval: 'monthly'
  },
  {
    id: 'program_participant_progress',
    name: 'Participant Progress Report',
    description: 'Comprehensive view of participant enrollment, completion status, and progress across programs, classes, and coaching',
    category: 'Program Management',
    audience: 'Admin Level 1',
    icon: UserCheck,
    color: 'bg-emerald-500',
    estimatedTime: '3-4 min',
    frequency: 'Weekly',
    metrics: ['total_participants', 'enrollment_rate', 'completion_rate', 'at_risk_participants'],
    filters: {
      timeframe: '3months',
      division: 'all',
      level: 'all',
      tenure: 'all'
    },
    output_format: 'pdf',
    schedule_interval: 'weekly'
  },
  {
    id: 'program_certificate_issuance',
    name: 'Certificate Issuance Report',
    description: 'Track all certificates issued including type, recipient, and associated programs or classes',
    category: 'Program Management',
    audience: 'Admin Level 1',
    icon: Award,
    color: 'bg-yellow-500',
    estimatedTime: '1-2 min',
    frequency: 'Monthly',
    metrics: ['certificates_issued', 'certificates_by_type', 'certificates_by_program'],
    filters: {
      timeframe: '6months',
      division: 'all',
      level: 'all',
      tenure: 'all'
    },
    output_format: 'csv',
    schedule_interval: 'monthly'
  },
  {
    id: 'program_overview_dashboard',
    name: 'Program Overview Dashboard',
    description: 'Executive summary of all program management activities including classes, coaching, participants, and certificates',
    category: 'Program Management',
    audience: 'Admin Level 1',
    icon: Briefcase,
    color: 'bg-blue-600',
    estimatedTime: '3-5 min',
    frequency: 'Monthly',
    metrics: ['total_programs', 'total_classes', 'total_engagements', 'total_participants', 'certificates_issued', 'overall_completion_rate'],
    filters: {
      timeframe: '6months',
      division: 'all',
      level: 'all',
      tenure: 'all'
    },
    output_format: 'pdf',
    schedule_interval: 'monthly'
  }
];

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

export default function ReportBuilder() {
  const { user, appRole, roleDisplayName, isPlatformAdmin, isSuperAdmin, hasPermission } = useAuth();

  const [activeView, setActiveView] = useState('builder');
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedReportForHistory, setSelectedReportForHistory] = useState(null);
  const [editingReport, setEditingReport] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk action states
  const [selectedReports, setSelectedReports] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Share dialog state
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [reportToShare, setReportToShare] = useState(null);

  // Filter and sort states
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFormat, setFilterFormat] = useState('all');
  const [filterInterval, setFilterInterval] = useState('all');
  const [sortBy, setSortBy] = useState('created_date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Form state
  const [reportName, setReportName] = useState('');
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [filters, setFilters] = useState({
    timeframe: '6months',
    division: 'all',
    level: 'all',
    tenure: 'all'
  });
  const [customDateRange, setCustomDateRange] = useState({ from: null, to: null });
  const [outputFormat, setOutputFormat] = useState('pdf');
  const [scheduleInterval, setScheduleInterval] = useState('once');
  const [scheduleEveryNDays, setScheduleEveryNDays] = useState(1);
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState(1);
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = useState(1);
  const [scheduleSpecificDates, setScheduleSpecificDates] = useState([]);
  const [scheduleEndDate, setScheduleEndDate] = useState(null);
  const [recipients, setRecipients] = useState([user?.email || '']);

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
      setSelectedReports([]); // Clear selection when reloading
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template) => {
    setReportName(template.name);
    setSelectedMetrics(template.metrics);
    setFilters(template.filters);
    setOutputFormat(template.output_format);
    setScheduleInterval(template.schedule_interval);
    setRecipients([user?.email || '']);
    setSelectedFields([]);
    setScheduleEveryNDays(1);
    setScheduleSpecificDates([]);
    setScheduleEndDate(null);
    setShowTemplatesDialog(false);
    setShowCreateDialog(true);
    toast.success(`Template "${template.name}" loaded. Customize and save!`);
  };

  const handleCreateReport = async () => {
    if (!reportName.trim()) {
      toast.error('Please enter a report name');
      return;
    }

    if (selectedMetrics.length === 0 && selectedFields.length === 0) {
      toast.error('Please select at least one metric or one field');
      return;
    }

    // Validation for specific scheduling types
    if (scheduleInterval === 'every_n_days' && (!scheduleEveryNDays || scheduleEveryNDays < 1)) {
      toast.error('Please specify the number of days between reports (must be 1 or greater)');
      return;
    }

    if (scheduleInterval === 'specific_dates' && scheduleSpecificDates.length === 0) {
      toast.error('Please select at least one specific date for report generation');
      return;
    }

    try {
      const reportConfig = {
        metrics: selectedMetrics,
        selected_fields: selectedFields,
        filters: {
          ...filters,
          ...(filters.timeframe === 'custom' && customDateRange.from && customDateRange.to
            ? { customDateRange: {
                from: format(customDateRange.from, 'yyyy-MM-dd'),
                to: format(customDateRange.to, 'yyyy-MM-dd')
              }}
            : {})
        }
      };

      const reportData = {
        report_name: reportName,
        created_by_email: user.email,
        client_id: user.client_id,
        report_config: reportConfig,
        output_format: outputFormat,
        schedule_interval: scheduleInterval,
        recipients: recipients.filter(r => r.trim()),
        status: 'active'
      };

      // Add schedule-specific fields
      if (scheduleInterval === 'weekly') {
        reportData.schedule_day_of_week = scheduleDayOfWeek;
      } else if (scheduleInterval === 'monthly') {
        reportData.schedule_day_of_month = scheduleDayOfMonth;
      } else if (scheduleInterval === 'every_n_days') {
        reportData.schedule_every_n_days = scheduleEveryNDays;
      } else if (scheduleInterval === 'specific_dates') {
        reportData.schedule_specific_dates = scheduleSpecificDates.map(d => format(d, 'yyyy-MM-dd'));
      }

      // Add end date if specified for recurring reports
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

      resetForm();
      setShowCreateDialog(false);
      loadReports();
    } catch (error) {
      console.error('Error creating report:', error);
      toast.error('Failed to create report');
    }
  };

  const handleGenerateNow = async (report) => {
    setGeneratingReport(report.id);
    try {
      const result = await base44.functions.invoke('generateCustomReport', {
        report_id: report.id, // Pass report ID for logging history
        report_config: report.report_config,
        output_format: report.output_format,
        recipients: report.recipients,
        created_by_email: report.created_by_email
      });

      if (result.data.success) {
        const signedUrlResult = await base44.integrations.Core.CreateFileSignedUrl({
          file_uri: result.data.file_uri,
          expires_in: 3600
        });

        // Update the report with the latest generation info
        await base44.entities.ScheduledReport.update(report.id, {
          last_generated_date: new Date().toISOString(),
          last_file_uri: result.data.file_uri,
          total_generations: (report.total_generations || 0) + 1,
          generation_history: [...(report.generation_history || []), {
            timestamp: new Date().toISOString(),
            status: 'success',
            file_uri: result.data.file_uri,
            recipients_count: report.recipients?.length || 0,
            triggered_by: user.email // Record who manually triggered it
          }]
        });

        window.open(signedUrlResult.signed_url, '_blank');
        
        toast.success('Report generated successfully');
        loadReports(); // Reload to get updated history and counts
      } else {
        // Log failure to history as well
        await base44.entities.ScheduledReport.update(report.id, {
          last_generated_date: new Date().toISOString(),
          total_generations: (report.total_generations || 0) + 1,
          generation_history: [...(report.generation_history || []), {
            timestamp: new Date().toISOString(),
            status: 'failed',
            error_message: result.data.error || 'Unknown error during generation',
            triggered_by: user.email
          }]
        });
        toast.error('Failed to generate report: ' + (result.data.error || 'Unknown error'));
        loadReports();
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
      // Even if API call itself failed, try to log it if possible, though this might indicate deeper issues
      await base44.entities.ScheduledReport.update(report.id, {
        last_generated_date: new Date().toISOString(),
        total_generations: (report.total_generations || 0) + 1,
        generation_history: [...(report.generation_history || []), {
          timestamp: new Date().toISOString(),
          status: 'failed',
          error_message: error.message || 'API call failed',
          triggered_by: user.email
        }]
      });
      loadReports();
    } finally {
      setGeneratingReport(null);
    }
  };

  const handleDownloadLast = async (report) => {
    if (!report.last_file_uri) {
      toast.error('No previous report available');
      return;
    }

    try {
      const signedUrlResult = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri: report.last_file_uri,
        expires_in: 3600
      });

      window.open(signedUrlResult.signed_url, '_blank');
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Failed to download report');
    }
  };

  const handleToggleStatus = async (report) => {
    try {
      const newStatus = report.status === 'active' ? 'paused' : 'active';
      await base44.entities.ScheduledReport.update(report.id, { status: newStatus });
      toast.success(`Report ${newStatus === 'active' ? 'activated' : 'paused'}`);
      loadReports();
    } catch (error) {
      console.error('Error updating report status:', error);
      toast.error('Failed to update report status');
    }
  };

  const handleDeleteReport = async (report) => {
    if (!confirm(`Are you sure you want to delete "${report.report_name}"?`)) {
      return;
    }

    try {
      await base44.entities.ScheduledReport.delete(report.id);
      toast.success('Report deleted successfully');
      loadReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Failed to delete report');
    }
  };

  const handleEditReport = (report) => {
    setEditingReport(report);
    setShowCreateDialog(true);
  };

  // Clone report function
  const handleCloneReport = async (report) => {
    try {
      const clonedReportData = {
        report_name: `${report.report_name} (Copy)`,
        created_by_email: user.email,
        client_id: user.client_id,
        report_config: report.report_config,
        output_format: report.output_format,
        schedule_interval: report.schedule_interval,
        recipients: report.recipients,
        status: 'active',
        cloned_from_id: report.id
      };

      // Add schedule-specific fields
      if (report.schedule_interval === 'weekly' && report.schedule_day_of_week !== undefined) {
        clonedReportData.schedule_day_of_week = report.schedule_day_of_week;
      } else if (report.schedule_interval === 'monthly' && report.schedule_day_of_month !== undefined) {
        clonedReportData.schedule_day_of_month = report.schedule_day_of_month;
      } else if (report.schedule_interval === 'every_n_days' && report.schedule_every_n_days !== undefined) {
        clonedReportData.schedule_every_n_days = report.schedule_every_n_days;
      } else if (report.schedule_interval === 'specific_dates' && report.schedule_specific_dates) {
        clonedReportData.schedule_specific_dates = report.schedule_specific_dates;
      }

      if (report.schedule_end_date) {
        clonedReportData.schedule_end_date = report.schedule_end_date;
      }

      await base44.entities.ScheduledReport.create(clonedReportData);
      toast.success('Report cloned successfully');
      loadReports();
    } catch (error) {
      console.error('Error cloning report:', error);
      toast.error('Failed to clone report');
    }
  };

  // Bulk action handlers
  const handleSelectAll = (checked) => {
    if (checked) {
      // Only allow selecting reports the user has edit access to
      setSelectedReports(filteredAndSortedReports.filter(canEditReport).map(r => r.id));
    } else {
      setSelectedReports([]);
    }
  };

  const handleSelectReport = (reportId, checked) => {
    if (checked) {
      setSelectedReports(prev => [...prev, reportId]);
    } else {
      setSelectedReports(prev => prev.filter(id => id !== reportId));
    }
  };

  const handleBulkPause = async () => {
    if (selectedReports.length === 0) return;
    
    if (!confirm(`Pause ${selectedReports.length} selected report(s)?`)) return;

    setBulkActionLoading(true);
    try {
      await Promise.all(
        selectedReports.map(id => 
          base44.entities.ScheduledReport.update(id, { status: 'paused' })
        )
      );
      toast.success(`${selectedReports.length} report(s) paused`);
      setSelectedReports([]);
      loadReports();
    } catch (error) {
      console.error('Error pausing reports:', error);
      toast.error('Failed to pause some reports');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkActivate = async () => {
    if (selectedReports.length === 0) return;
    
    if (!confirm(`Activate ${selectedReports.length} selected report(s)?`)) return;

    setBulkActionLoading(true);
    try {
      await Promise.all(
        selectedReports.map(id => 
          base44.entities.ScheduledReport.update(id, { status: 'active' })
        )
      );
      toast.success(`${selectedReports.length} report(s) activated`);
      setSelectedReports([]);
      loadReports();
    } catch (error) {
      console.error('Error activating reports:', error);
      toast.error('Failed to activate some reports');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedReports.length === 0) return;
    
    if (!confirm(`Delete ${selectedReports.length} selected report(s)? This action cannot be undone.`)) {
        setBulkActionLoading(false); // Make sure to reset loading if action is cancelled
        return;
    }

    setBulkActionLoading(true);
    try {
      await Promise.all(
        selectedReports.map(id => base44.entities.ScheduledReport.delete(id))
      );
      toast.success(`${selectedReports.length} report(s) deleted`);
      setSelectedReports([]);
      loadReports();
    } catch (error) {
      console.error('Error deleting reports:', error);
      toast.error('Failed to delete some reports');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleShowHistory = (report) => {
    setSelectedReportForHistory(report);
    setShowHistoryDialog(true);
  };

  const handleShareReport = (report) => {
    setReportToShare(report);
    setShowShareDialog(true);
  };

  // Helper to check user's permission level for a report
  const getUserPermission = (report) => {
    if (!user || !report) return null;
    
    // Owner has full control
    if (report.created_by_email === user.email) {
      return 'owner';
    }

    // Check individual sharing
    const individualShare = report.shared_with?.find(s => s.user_email === user.email);
    if (individualShare) {
      return individualShare.permission_level; // 'view' or 'edit'
    }

    // Check team sharing
    if (report.is_team_shared && report.client_id === user.client_id) {
      return report.team_permission_level || 'view'; // Default to 'view' if not specified
    }

    return null;
  };

  const canEditReport = (report) => {
    const permission = getUserPermission(report);
    return permission === 'owner' || permission === 'edit';
  };

  const canDeleteReport = (report) => {
    const permission = getUserPermission(report);
    return permission === 'owner';
  };

  const canShareReport = (report) => {
    const permission = getUserPermission(report);
    return permission === 'owner';
  };

  const resetForm = () => {
    setEditingReport(null);
    setReportName('');
    setSelectedMetrics([]);
    setSelectedFields([]);
    setFilters({
      timeframe: '6months',
      division: 'all',
      level: 'all',
      tenure: 'all'
    });
    setCustomDateRange({ from: null, to: null });
    setOutputFormat('pdf');
    setScheduleInterval('once');
    setScheduleDayOfWeek(1);
    setScheduleDayOfMonth(1);
    setScheduleEveryNDays(1);
    setScheduleSpecificDates([]);
    setScheduleEndDate(null);
    setRecipients([user?.email || '']);
  };

  const handleMetricToggle = (metricId) => {
    setSelectedMetrics(prev =>
      prev.includes(metricId)
        ? prev.filter(m => m !== metricId)
        : [...prev, metricId]
    );
  };

  const handleFieldToggle = (fieldId) => {
    setSelectedFields(prev =>
      prev.includes(fieldId)
        ? prev.filter(f => f !== fieldId)
        : [...prev, fieldId]
    );
  };

  const addRecipient = () => {
    setRecipients([...recipients, '']);
  };

  const updateRecipient = (index, value) => {
    const newRecipients = [...recipients];
    newRecipients[index] = value;
    setRecipients(newRecipients);
  };

  const removeRecipient = (index) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const getScheduleDescription = (report) => {
    if (report.schedule_interval === 'once') {
      return 'One-time';
    } else if (report.schedule_interval === 'daily') {
      return 'Daily';
    } else if (report.schedule_interval === 'every_n_days') {
      return `Every ${report.schedule_every_n_days} day${report.schedule_every_n_days > 1 ? 's' : ''}`;
    } else if (report.schedule_interval === 'weekly') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `Weekly on ${days[report.schedule_day_of_week]}`;
    } else if (report.schedule_interval === 'monthly') {
      return `Monthly on day ${report.schedule_day_of_month}`;
    } else if (report.schedule_interval === 'first_weekday_of_month') {
      return 'First weekday of month';
    } else if (report.schedule_interval === 'specific_dates') {
      return `${report.schedule_specific_dates?.length || 0} specific date${report.schedule_specific_dates?.length !== 1 ? 's' : ''}`;
    }
    return report.schedule_interval;
  };

  // Template filtering with role-based access
  const categories = ['all', ...new Set(REPORT_TEMPLATES.map(t => t.category))];

  const filteredTemplates = REPORT_TEMPLATES.filter(template => {
    // Role-based filtering - Platform Admin and Super Admin see all templates
    if (!isPlatformAdmin && !isSuperAdmin) {
      // Regular users only see templates for their role level
      if (template.audience !== appRole) {
        return false;
      }
    }
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = !searchQuery ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Filter and sort logic
  const filteredAndSortedReports = useMemo(() => {
    let filtered = [...reports];

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.status === filterStatus);
    }

    // Apply format filter
    if (filterFormat !== 'all') {
      filtered = filtered.filter(r => r.output_format === filterFormat);
    }

    // Apply interval filter
    if (filterInterval !== 'all') {
      filtered = filtered.filter(r => r.schedule_interval === filterInterval);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'name':
          aVal = a.report_name?.toLowerCase() || '';
          bVal = b.report_name?.toLowerCase() || '';
          break;
        case 'created_date':
          aVal = new Date(a.created_date || 0);
          bVal = new Date(b.created_date || 0);
          break;
        case 'last_generated':
          aVal = new Date(a.last_generated_date || 0);
          bVal = new Date(b.last_generated_date || 0);
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [reports, filterStatus, filterFormat, filterInterval, sortBy, sortOrder]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Get role-specific context for page header
  const getPageSubtitle = () => {
    if (isPlatformAdmin || isSuperAdmin) {
      return 'Create and manage platform-wide analytics reports';
    } else if (appRole === 'User Level 3' || appRole === 'Admin Level 2') {
      return 'Create and manage organizational analytics reports';
    } else if (appRole === 'User Level 2' || appRole === 'Admin Level 1') {
      return 'Create and manage team analytics reports';
    } else {
      return 'Create and manage personal development reports';
    }
  };

  // View toggle tabs - hide analytics for User Level 1 and User Level 2 (Team Leaders)
  const showAnalyticsTab = appRole !== 'User Level 1' && appRole !== 'User Level 2';
  
  const viewTabs = [
    { id: 'builder', label: 'Report Builder', icon: FileText },
    ...(showAnalyticsTab ? [{ id: 'analytics', label: 'Report Analytics', icon: BarChart3 }] : [])
  ];

  // If viewing analytics, render ReportAnalytics component
  if (activeView === 'analytics') {
    return <ReportAnalyticsView user={user} appRole={appRole} roleDisplayName={roleDisplayName} onBack={() => setActiveView('builder')} viewTabs={viewTabs} activeView={activeView} setActiveView={setActiveView} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">
              Report Builder
            </h1>
            <p className="text-sm text-gray-600 mt-1">{getPageSubtitle()}</p>
          </div>
          <div className="flex-shrink-0">
            <Button
              onClick={loadReports}
              variant="ghost"
              size="icon"
              className="text-gray-600 hover:bg-gray-200"
              title="Refresh data"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex gap-3"
        >
          <Button
            onClick={() => setShowTemplatesDialog(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Use Template
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setShowCreateDialog(true);
            }}
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            Start from Scratch
          </Button>
        </motion.div>

        {/* Bulk Actions Bar */}
        <AnimatePresence>
          {selectedReports.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4"
            >
              <Card className="border-2 border-blue-500 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-blue-600 text-white">
                        {selectedReports.length} Selected
                      </Badge>
                      <span className="text-sm text-gray-600">
                        Bulk Actions:
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleBulkActivate}
                        disabled={bulkActionLoading}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Activate
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleBulkPause}
                        disabled={bulkActionLoading}
                      >
                        <Pause className="w-4 h-4 mr-1" />
                        Pause
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleBulkDelete}
                        disabled={bulkActionLoading}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedReports([])}
                      >
                        Clear Selection
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reports List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-lg">Your Reports</CardTitle>
                <div className="flex gap-2">
                   <Select value={filterStatus} onValueChange={setFilterStatus}>
                     <SelectTrigger className="w-32">
                       <SelectValue placeholder="All Status" />
                     </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterFormat} onValueChange={setFilterFormat}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Formats</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterInterval} onValueChange={setFilterInterval}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Schedule" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Schedules</SelectItem>
                      <SelectItem value="once">One-time</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="every_n_days">Every N Days</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="first_weekday_of_month">First Weekday</SelectItem>
                      <SelectItem value="specific_dates">Specific Dates</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Sort dropdown */}
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_date">Date Created</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="last_generated">Last Generated</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortOrder === 'asc' ? (
                      <ArrowRight className="w-4 h-4 rotate-[-90deg]" />
                    ) : (
                      <ArrowRight className="w-4 h-4 rotate-90" />
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredAndSortedReports.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {reports.length === 0 ? 'No Reports Yet' : 'No Reports Match Filters'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {reports.length === 0 
                      ? 'Create your first report from a template or start from scratch'
                      : 'Try adjusting your filters to see more reports'}
                  </p>
                  {reports.length === 0 && (
                    <div className="flex gap-3 justify-center">
                      <Button onClick={() => setShowTemplatesDialog(true)} className="bg-purple-600 hover:bg-purple-700">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Browse Templates
                      </Button>
                      <Button onClick={() => setShowCreateDialog(true)} variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Report
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedReports.length === filteredAndSortedReports.length && filteredAndSortedReports.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Report Name</TableHead>
                      <TableHead>Schedule</TableHead>
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
                          <TableCell>
                            <Checkbox
                              checked={selectedReports.includes(report.id)}
                              onCheckedChange={(checked) => handleSelectReport(report.id, checked)}
                              disabled={!hasEditAccess}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span>{report.report_name}</span>
                              {!isOwner && permission && (
                                <Badge variant="outline" className="text-xs">
                                  {permission === 'edit' ? (
                                    <><Edit className="w-3 h-3 mr-1" />Shared - Edit</>
                                  ) : (
                                    <><Eye className="w-3 h-3 mr-1" />Shared - View</>
                                  )}
                                </Badge>
                              )}
                              {isOwner && sharedCount > 0 && (
                                <Badge variant="outline" className="text-xs bg-blue-50">
                                  <Users className="w-3 h-3 mr-1" /> {/* Changed from UsersIcon to Users */}
                                  {sharedCount} {sharedCount === 1 ? 'collaborator' : 'collaborators'}
                                </Badge>
                              )}
                              {report.cloned_from_id && (
                                <Badge variant="outline" className="text-xs">
                                  Cloned
                                </Badge>
                              )}
                            </div>
                            {report.schedule_end_date && (
                              <div className="text-xs text-gray-500 mt-1">
                                Ends: {format(new Date(report.schedule_end_date), 'MMM d, yyyy')}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getScheduleDescription(report)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge>{report.output_format.toUpperCase()}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              report.status === 'active' ? 'bg-green-100 text-green-800' :
                              report.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                              report.status === 'failed' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {report.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              {report.last_generated_date
                                ? format(new Date(report.last_generated_date), 'MMM d, yyyy HH:mm')
                                : 'Never'}
                            </div>
                            {report.total_generations > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                {report.total_generations} generation{report.total_generations !== 1 ? 's' : ''}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleGenerateNow(report)}
                                disabled={generatingReport === report.id}
                                title="Generate Now"
                              >
                                {generatingReport === report.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Download className="w-3 h-3" />
                                )}
                              </Button>
                              
                              {report.last_file_uri && (
                                <Button
                                 size="sm"
                                 variant="outline"
                                 onClick={() => handleDownloadLast(report)}
                                 title="Download Last Report"
                                >
                                 <FileText className="w-3 h-3" />
                                </Button>
                              )}

                              {report.generation_history && report.generation_history.length > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleShowHistory(report)}
                                  title="View History"
                                >
                                  <CalendarIcon className="w-3 h-3" />
                                </Button>
                              )}

                              {hasEditAccess && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCloneReport(report)}
                                  title="Clone Report"
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              )}

                              {hasEditAccess && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleToggleStatus(report)}
                                  title={report.status === 'active' ? 'Pause' : 'Resume'}
                                >
                                  {report.status === 'active' ? (
                                    <Pause className="w-3 h-3" />
                                  ) : (
                                    <Play className="w-3 h-3" />
                                  )}
                                </Button>
                              )}

                              {canShareReport(report) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleShareReport(report)}
                                  title="Share Report"
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  <Share2 className="w-3 h-3" />
                                </Button>
                              )}
                              
                              {hasEditAccess && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditReport(report)}
                                  title="Edit Report"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                              )}
                              
                              {canDeleteReport(report) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteReport(report)}
                                  className="text-red-600 hover:text-red-700"
                                  title="Delete Report"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Templates Dialog */}
      <Dialog open={showTemplatesDialog} onOpenChange={setShowTemplatesDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              Standard Report Templates
            </DialogTitle>
            <p className="text-sm text-gray-600">Choose a pre-configured template to get started quickly</p>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Search and Filter */}
            <div className="flex gap-4">
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Template Cards */}
            <div className="grid md:grid-cols-2 gap-4">
              {filteredTemplates.map((template, index) => {
                const TemplateIcon = template.icon;
                return (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-purple-300" onClick={() => handleSelectTemplate(template)}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className={`w-12 h-12 ${template.color} rounded-lg flex items-center justify-center`}>
                            <TemplateIcon className="w-6 h-6 text-white" />
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {template.audience}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <p className="text-sm text-gray-600">{template.description}</p>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            <span>{template.metrics.length} metrics</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3" />
                            <span>{template.frequency}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {template.metrics.slice(0, 3).map(metric => {
                            const metricInfo = AVAILABLE_METRICS.find(m => m.id === metric);
                            return metricInfo ? (
                              <Badge key={metric} variant="secondary" className="text-xs">
                                {metricInfo.label}
                              </Badge>
                            ) : null;
                          })}
                          {template.metrics.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{template.metrics.length - 3} more
                            </Badge>
                          )}
                        </div>
                        <Button className="w-full" size="sm">
                          Use This Template
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {filteredTemplates.length === 0 && (
              <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No templates found matching your criteria</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Report Dialog */}
      <CreateReportDialog
        open={showCreateDialog}
        onOpenChange={(open) => { if (!open) resetForm(); setShowCreateDialog(open); }}
        editingReport={editingReport}
        userEmail={user?.email}
        clientId={user?.client_id}
        onSuccess={() => { resetForm(); loadReports(); }}
      />

      {/* Generation History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Generation History: {selectedReportForHistory?.report_name}</DialogTitle>
            <p className="text-sm text-gray-600 mt-2">
              Last {selectedReportForHistory?.generation_history?.length || 0} generations
            </p>
          </DialogHeader>

          <div className="py-4 max-h-96 overflow-y-auto">
            {selectedReportForHistory?.generation_history && selectedReportForHistory.generation_history.length > 0 ? (
              <div className="space-y-3">
                {/* Sort history by timestamp descending for most recent first */}
                {[...selectedReportForHistory.generation_history]
                  .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                  .map((entry, index) => (
                  <Card key={index} className={
                    entry.status === 'success' 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-red-200 bg-red-50'
                  }>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {entry.status === 'success' ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <AlertTriangle className="w-5 h-5 text-red-600" />
                            )}
                            <span className={`font-semibold ${
                              entry.status === 'success' ? 'text-green-900' : 'text-red-900'
                            }`}>
                              {entry.status === 'success' ? 'Success' : 'Failed'}
                            </span>
                            <span className="text-sm text-gray-600">
                              {format(new Date(entry.timestamp), 'MMM d, yyyy HH:mm:ss')}
                            </span>
                          </div>
                          
                          {entry.status === 'success' ? (
                            <div className="text-sm text-gray-700">
                              Report generated and sent to (entry.recipients_count || 0) recipient{entry.recipients_count !== 1 ? 's' : ''}.
                              {entry.triggered_by && (
                                <span className="ml-2 text-gray-500">Triggered by: {entry.triggered_by}</span>
                              )}
                            </div>
                          ) : (
                            <div className="text-sm text-red-700">
                              <strong>Error:</strong> {entry.error_message || 'Unknown error occurred'}
                              {entry.triggered_by && (
                                <span className="ml-2 text-gray-500">Triggered by: {entry.triggered_by}</span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {entry.status === 'success' && entry.file_uri && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                const signedUrlResult = await base44.integrations.Core.CreateFileSignedUrl({
                                  file_uri: entry.file_uri,
                                  expires_in: 3600
                                });
                                window.open(signedUrlResult.signed_url, '_blank');
                              } catch (error) {
                                toast.error('Failed to download report');
                              }
                            }}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No generation history available yet</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Report Dialog */}
      <ShareReportDialog
        report={reportToShare}
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        onSuccess={loadReports}
      />
    </div>
  );
}

// Report Analytics View Component
function ReportAnalyticsView({ user, appRole, roleDisplayName, onBack, viewTabs, activeView, setActiveView }) {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [filters, setFilters] = useState({
    timeframe: '6months',
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
      case '3months': return new Date(now.setMonth(now.getMonth() - 3));
      case '6months': return new Date(now.setMonth(now.getMonth() - 6));
      case '12months': return new Date(now.setMonth(now.getMonth() - 12));
      case 'all': return new Date(0);
      default: return new Date(now.setMonth(now.getMonth() - 6));
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

  const reportsByFormat = useMemo(() => {
    const formats = {};
    filteredReports.forEach(r => {
      const fmt = r.output_format || 'pdf';
      formats[fmt] = (formats[fmt] || 0) + 1;
    });
    
    return Object.entries(formats).map(([fmt, count]) => ({
      format: fmt.toUpperCase(),
      count
    }));
  }, [filteredReports]);

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

  const generationTrends = useMemo(() => {
    const trends = [];
    const months = filters.timeframe === '3months' ? 3 : filters.timeframe === '6months' ? 6 : 12;
    
    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      
      let successCount = 0;
      let failureCount = 0;
      
      filteredReports.forEach(r => {
        if (!r.generation_history) return;
        
        r.generation_history.forEach(h => {
          const historyDate = new Date(h.timestamp);
          if (historyDate >= monthStart && historyDate < monthEnd) {
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

  const reportsNeedingAttention = useMemo(() => {
    return filteredReports.filter(r => {
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
          additionalHeaderContent={
            viewTabs.length > 1 && (
              <SubNavMenu
                items={viewTabs}
                activeId={activeView}
                onItemClick={setActiveView}
              />
            )
          }
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
          <MetricCard title="Total Reports" value={metrics.totalReports} icon={FileText} color="bg-purple-500" />
          <MetricCard title="Active Reports" value={metrics.activeReports} icon={Play} color="bg-green-500" />
          <MetricCard title="Total Generations" value={metrics.totalGenerations} icon={Zap} color="bg-blue-500" />
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
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Report Generation Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={generationTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip />
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
                    <ChartTooltip />
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
                    <ChartTooltip />
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