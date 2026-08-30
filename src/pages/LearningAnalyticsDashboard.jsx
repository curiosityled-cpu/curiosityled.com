import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, TrendingUp, Users, CheckCircle, Clock, AlertCircle, AlertTriangle, Brain, Award, RefreshCw, Target, Loader2, Filter, Calendar as CalendarIcon, UserPlus, Send, Search, Activity, Download, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { useClient } from "@/components/contexts/ClientContext";
import { toast } from "sonner";
import PageHeader from "@/components/common/PageHeader";
import AssignLearningModal from "@/components/learning/AssignLearningModal";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { format, subDays } from "date-fns";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

function LearningAnalyticsDashboard() {
  const { user, isPlatformAdmin, isSuperAdmin, isOrgLeader, appRole } = useAuth();
  const { client } = useClient();
  
  const [loading, setLoading] = useState(true);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [showAssignLearning, setShowAssignLearning] = useState(false);
  
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedCompetency, setSelectedCompetency] = useState('all');
  const [selectedLearningType, setSelectedLearningType] = useState('all');
  const [selectedLeadershipLevel, setSelectedLeadershipLevel] = useState('all');
  const [selectedSkillTopic, setSelectedSkillTopic] = useState('all');
  const [selectedLearningStatus, setSelectedLearningStatus] = useState('all');
  
  const [analytics, setAnalytics] = useState(null);
  const [aiInsights, setAiInsights] = useState([]);

  const [showCustomDateDialog, setShowCustomDateDialog] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({ from: null, to: null });
  const [appliedCustomDateRange, setAppliedCustomDateRange] = useState({ from: null, to: null });

  const [teamMembers, setTeamMembers] = useState([]);
  const [teamProgress, setTeamProgress] = useState([]);
  const [assignedLearning, setAssignedLearning] = useState([]);
  const [atRiskLearners, setAtRiskLearners] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const isManager = appRole === 'User Level 2';
  const isAdmin = ['Admin Level 1', 'Admin Level 2', 'Super Administrator', 'Partner Business Administrator', 'Platform Admin'].includes(appRole);
  const canAssignLearning = isManager || isAdmin;

  useEffect(() => {
    if (timeRange !== 'custom' || (timeRange === 'custom' && appliedCustomDateRange.from && appliedCustomDateRange.to)) {
      loadAnalytics();
    }
  }, [timeRange, appliedCustomDateRange.from, appliedCustomDateRange.to, selectedClient, selectedDepartment, selectedCompetency, selectedLearningType, selectedLeadershipLevel, selectedSkillTopic, selectedLearningStatus]);

  useEffect(() => {
    if (isManager || isAdmin) {
      loadTeamData();
    }
  }, [user]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const params = {
        time_range: timeRange,
        client_id: selectedClient,
        department: selectedDepartment,
        competency: selectedCompetency,
        learning_type: selectedLearningType,
        leadership_level: selectedLeadershipLevel,
        skill_topic: selectedSkillTopic,
        learning_status: selectedLearningStatus
      };

      if (timeRange === 'custom' && appliedCustomDateRange.from && appliedCustomDateRange.to) {
        params.start_date = format(appliedCustomDateRange.from, 'yyyy-MM-dd');
        params.end_date = format(appliedCustomDateRange.to, 'yyyy-MM-dd');
      }

      const response = await base44.functions.invoke('getLearningAnalytics', params);

      if (response?.data?.success) {
        setAnalytics(response.data.data);
      } else {
        toast.error('Failed to load analytics');
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load learning analytics');
    } finally {
      setLoading(false);
    }
  };

  const generateAIInsights = async () => {
    setGeneratingInsights(true);
    try {
      const prompt = `Analyze organizational learning data and provide 3-5 strategic insights:
        - Total Assigned: ${analytics.metrics.totalAssigned}
        - Completion Rate: ${analytics.metrics.completionRate}%
        - Active Learners: ${analytics.metrics.activeLearners}
        - Overdue Items: ${analytics.metrics.overdueCount}
        - Top Competency Gaps: ${analytics.topCompetencyGaps.map(g => `${g.name} (${g.avg_score}%)`).join(', ')}
        
        Provide insights as a JSON array with: title, description, priority (High Risk, Strategic Priority, Positive Impact, or Opportunity), action (suggested action label)`;
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  priority: { type: "string" },
                  action: { type: "string" }
                }
              }
            }
          }
        }
      });

      setAiInsights(result?.insights || []);
      toast.success('Insights generated successfully');
    } catch (error) {
      console.error('Error generating insights:', error);
      toast.error('Failed to generate insights');
    } finally {
      setGeneratingInsights(false);
    }
  };

  const handleExportCSV = async () => {
    setExportingCSV(true);
    try {
      if (!analytics?.metrics) {
        toast.error('No data available to export');
        return;
      }

      let csv = 'Learning Analytics Export\n';
      csv += `Exported: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}\n`;
      csv += `Time Range: ${timeRange === 'custom' && appliedCustomDateRange.from && appliedCustomDateRange.to 
        ? `${format(appliedCustomDateRange.from, 'yyyy-MM-dd')} to ${format(appliedCustomDateRange.to, 'yyyy-MM-dd')}` 
        : timeRange}\n\n`;
      
      csv += 'SUMMARY METRICS\n';
      csv += `Metric,Value\n`;
      csv += `Total Resources,${analytics.metrics.totalResources}\n`;
      csv += `Total Assigned,${analytics.metrics.totalAssigned}\n`;
      csv += `Unique Learners,${analytics.metrics.totalUniqueLearners}\n`;
      csv += `Active Learners,${analytics.metrics.activeLearners}\n`;
      csv += `Completion Rate,${analytics.metrics.completionRate}%\n`;
      csv += `Overdue Items,${analytics.metrics.overdueCount}\n\n`;
      
      if (analytics.topResources) {
        csv += 'TOP RESOURCES\n';
        csv += 'Title,Type,Completions,Provider\n';
        analytics.topResources.forEach(r => {
          csv += `"${r.title.replace(/"/g, '""')}",${r.type},${r.completions},"${r.provider.replace(/"/g, '""')}"\n`;
        });
      }

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `learning-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast.success('CSV exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export CSV');
    } finally {
      setExportingCSV(false);
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      if (!analytics?.metrics) {
        toast.error('No data available to export');
        return;
      }

      const params = {
        analytics: analytics,
        time_range: timeRange,
        filters: {
          client: selectedClient,
          department: selectedDepartment,
          competency: selectedCompetency,
          learning_type: selectedLearningType,
          leadership_level: selectedLeadershipLevel
        },
        generated_by: user.email,
        generated_date: new Date().toISOString()
      };

      const response = await base44.functions.invoke('exportLearningAnalyticsPDF', params);
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `learning-analytics-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleTimeRangeChange = (value) => {
    if (value === 'custom') {
      setCustomDateRange(appliedCustomDateRange.from && appliedCustomDateRange.to ? appliedCustomDateRange : { from: null, to: null });
      setShowCustomDateDialog(true);
    } else {
      setTimeRange(value);
      setCustomDateRange({ from: null, to: null });
      setAppliedCustomDateRange({ from: null, to: null });
    }
  };

  const handleApplyCustomRange = () => {
    if (customDateRange.from && customDateRange.to) {
      setAppliedCustomDateRange(customDateRange);
      setTimeRange('custom');
      setShowCustomDateDialog(false);
    } else {
      toast.error('Please select both a start and end date');
    }
  };

  const handleCancelCustomRange = () => {
    setShowCustomDateDialog(false);
    setCustomDateRange(appliedCustomDateRange.from && appliedCustomDateRange.to ? appliedCustomDateRange : { from: null, to: null });
    if (timeRange === 'custom' && (!appliedCustomDateRange.from || !appliedCustomDateRange.to)) {
      setTimeRange('30d');
    }
  };

  const setQuickRange = (days) => {
    const to = new Date();
    const from = subDays(to, days);
    setCustomDateRange({ from, to });
  };

  const loadTeamData = async () => {
    if (!user) return;

    try {
      const allUsers = await base44.entities.User.list();
      const team = allUsers.filter(u => 
        u.email !== user.email && 
        (user.subordinate_emails?.includes(u.email) || u.department === user.department)
      );

      setTeamMembers(team);

      const teamEmails = team.map(t => t.email);
      const [progress, assigned] = await Promise.all([
        base44.entities.LearnerProgress.filter({ user_email: { $in: teamEmails } }),
        base44.entities.AssignedLearning.filter({ user_email: { $in: teamEmails } })
      ]);

      setTeamProgress(progress);
      setAssignedLearning(assigned);

      const atRisk = team.filter(member => {
        const memberProgress = progress.filter(p => p.user_email === member.email);
        const memberAssigned = assigned.filter(a => a.user_email === member.email);
        
        const overdueCount = memberAssigned.filter(a => 
          a.due_date && new Date(a.due_date) < new Date() && a.status !== 'completed'
        ).length;

        const avgProgress = memberProgress.length > 0
          ? memberProgress.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / memberProgress.length
          : 0;

        return overdueCount > 0 || avgProgress < 30;
      });

      setAtRiskLearners(atRisk);
    } catch (error) {
      console.error('Error loading team data:', error);
    }
  };

  const getMemberStats = (member) => {
    const memberProgress = teamProgress.filter(p => p.user_email === member.email);
    const memberAssigned = assignedLearning.filter(a => a.user_email === member.email);

    const completed = memberProgress.filter(p => p.status === 'completed').length;
    const inProgress = memberProgress.filter(p => p.status === 'in_progress').length;
    const overdue = memberAssigned.filter(a => 
      a.due_date && new Date(a.due_date) < new Date() && a.status !== 'completed'
    ).length;

    const avgProgress = memberProgress.length > 0
      ? Math.round(memberProgress.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / memberProgress.length)
      : 0;

    return { completed, inProgress, overdue, avgProgress, total: memberAssigned.length };
  };

  const sendNudge = async (memberEmail) => {
    try {
      await base44.entities.Notification.create({
        user_email: memberEmail,
        type: 'reminder',
        title: 'Learning Progress Check-In',
        message: `${user.full_name} is checking in on your learning progress. Keep up the great work!`,
        scheduled_for: new Date().toISOString(),
        priority: 'medium'
      });
      toast.success('Nudge sent successfully');
    } catch (error) {
      console.error('Error sending nudge:', error);
      toast.error('Failed to send nudge');
    }
  };

  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filterStatus === "all") return true;
    if (filterStatus === "at-risk") return atRiskLearners.includes(member);
    
    const stats = getMemberStats(member);
    if (filterStatus === "on-track") return stats.avgProgress >= 50 && stats.overdue === 0;
    if (filterStatus === "needs-attention") return stats.avgProgress < 50 || stats.overdue > 0;

    return true;
  });

  const teamMetrics = {
    totalMembers: teamMembers.length,
    avgCompletion: teamMembers.length > 0 
      ? Math.round(teamMembers.reduce((sum, m) => sum + getMemberStats(m).avgProgress, 0) / teamMembers.length)
      : 0,
    atRiskCount: atRiskLearners.length,
    totalAssigned: assignedLearning.length
  };

  const clearFilters = () => {
    setTimeRange('30d');
    setSelectedClient('all');
    setSelectedDepartment('all');
    setSelectedCompetency('all');
    setSelectedLearningType('all');
    setSelectedLeadershipLevel('all');
    setSelectedSkillTopic('all');
    setSelectedLearningStatus('all');
    setCustomDateRange({ from: null, to: null });
    setAppliedCustomDateRange({ from: null, to: null });
    toast.success('Filters cleared');
  };

  const getPriorityColor = (priority) => {
    if (priority === 'High Risk') return 'bg-red-100 text-red-800 border-red-200';
    if (priority === 'Strategic Priority') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (priority === 'Positive Impact') return 'bg-green-100 text-green-800 border-green-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const getPageSubtitle = () => {
    if (analytics?.scopeLabel && analytics.scopeLabel !== 'Platform') {
      return `Analyzing learning engagement and effectiveness for your Team`;
    }
    return 'Aggregated view of learning engagement and effectiveness across the organization';
  };

  const competencies = [
    'Situational Intelligence',
    'Decision Making',
    'Communication',
    'Resource Management',
    'Stakeholder Management',
    'Performance Management'
  ];

  const learningTypes = ['book', 'course', 'article', 'video', 'whitepaper', 'podcast', 'assessment_tool'];
  
  const leadershipLevels = [
    'Individual Contributor to First-Time Manager (entry-level leaders, frontline managers, new supervisors)',
    'Mid-Level Manager (managers of managers, experienced team leads, functional leads)',
    'Senior Manager / Business Unit Leader (leads larger teams, cross-functional groups, or business units)',
    'Director / Senior Director (enterprise-level strategic oversight, multiple functions, major initiatives)',
    'Executive / C-Suite (enterprise leadership, board-level strategy, organizational transformation)'
  ];

  if (loading || !analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const typeChartData = Object.entries(analytics.learningByType || {}).map(([type, count]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    value: count
  }));

  const competencyRadarData = (analytics.competencyLearningActivity || []).map(c => ({
    competency: c.competency,
    activity: c.assigned,
    completed: c.completed,
    target: 100
  }));

  const departmentChartData = Object.entries(analytics.learningByDepartment || {})
    .map(([dept, stats]) => ({
      name: dept,
      completionRate: stats.assigned > 0 ? Math.round((stats.completed / stats.assigned) * 100) : 0,
      assigned: stats.assigned,
      completed: stats.completed
    }))
    .sort((a, b) => b.completionRate - a.completionRate);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        


        {/* Analytics View */}
          <>
        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Filters:</span>
                </div>

                <Select value={timeRange} onValueChange={handleTimeRangeChange}>
                  <SelectTrigger className="w-48">
                    {timeRange === 'custom' && appliedCustomDateRange.from && appliedCustomDateRange.to ? (
                      <span className="text-sm">
                        {format(appliedCustomDateRange.from, 'MMM d')} - {format(appliedCustomDateRange.to, 'MMM d')}
                      </span>
                    ) : (
                      <SelectValue placeholder="Select time range" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="90d">Last 90 Days</SelectItem>
                    <SelectItem value="12mo">Last 12 Months</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="custom">Custom Range...</SelectItem>
                  </SelectContent>
                </Select>

                {analytics.availableClients?.length > 0 && !isOrgLeader && (
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Organizations</SelectItem>
                      {analytics.availableClients.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {analytics.availableDepartments?.length > 0 && (
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {analytics.availableDepartments.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Select value={selectedCompetency} onValueChange={setSelectedCompetency}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Competencies</SelectItem>
                    {competencies.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedLearningType} onValueChange={setSelectedLearningType}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                    </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {learningTypes.map(t => (
                      <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {analytics.availableSkillTopics?.length > 0 && (
                  <Select value={selectedSkillTopic} onValueChange={setSelectedSkillTopic}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-72">
                        <SelectItem value="all">All Skills/Topics</SelectItem>
                        {analytics.availableSkillTopics.map(topic => (
                          <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                )}

                <Select value={selectedLearningStatus} onValueChange={setSelectedLearningStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear All
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

            {/* Executive Summary - Top Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <BookOpen className="w-6 h-6 text-purple-600 mb-2" />
                <div className="text-2xl font-bold text-gray-900">{analytics.metrics.totalAssigned}</div>
                <div className="text-xs text-gray-600">Total Assigned</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <Users className="w-6 h-6 text-blue-600 mb-2" />
                <div className="text-2xl font-bold text-gray-900">{analytics.metrics.totalUniqueLearners}</div>
                <div className="text-xs text-gray-600">Unique Learners</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <CheckCircle className="w-6 h-6 text-green-600 mb-2" />
                <div className="text-2xl font-bold text-gray-900">{analytics.metrics.completionRate}%</div>
                <div className="text-xs text-gray-600">Completion Rate</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <Clock className="w-6 h-6 text-orange-600 mb-2" />
                <div className="text-2xl font-bold text-gray-900">{analytics.metrics.avgTimeToComplete}</div>
                <div className="text-xs text-gray-600">Avg Days</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <AlertCircle className="w-6 h-6 text-red-600 mb-2" />
                <div className="text-2xl font-bold text-gray-900">{analytics.metrics.overdueCount}</div>
                <div className="text-xs text-gray-600">Overdue</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <TrendingUp className="w-6 h-6 text-purple-600 mb-2" />
                <div className="text-2xl font-bold text-gray-900">{analytics.metrics.newLearningItemsAdded}</div>
                <div className="text-xs text-gray-600">New Items</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <Target className="w-6 h-6 text-amber-600 mb-2" />
                <div className="text-2xl font-bold text-gray-900">{analytics.metrics.averageEngagementScore}%</div>
                <div className="text-xs text-gray-600">Engagement</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <AlertTriangle className="w-6 h-6 text-red-600 mb-2" />
                <div className="text-2xl font-bold text-gray-900">{analytics.metrics.atRiskCount || 0}</div>
                <div className="text-xs text-gray-600">At Risk Learners</div>
              </CardContent>
            </Card>
              </motion.div>
            </div>

            {/* Team Management Cards for Managers */}
            {(isManager || isAdmin) && (
              <>
                {/* Actions & Filters */}
                <Card className="border-0 shadow-lg mb-6">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap gap-3 items-center">
                      <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            placeholder="Search team members..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Members</SelectItem>
                          <SelectItem value="on-track">On Track</SelectItem>
                          <SelectItem value="needs-attention">Needs Attention</SelectItem>
                          <SelectItem value="at-risk">At Risk</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={() => setShowAssignLearning(true)} className="bg-blue-600 hover:bg-blue-700">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Assign Learning
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Team Members Table */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>
                  <Card className="border-0 shadow-lg mb-8">
                    <CardHeader>
                      <CardTitle>Team Learning Progress</CardTitle>
                      <p className="text-sm text-gray-600">Monitor and support your team's learning journey</p>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Member</TableHead>
                            <TableHead>Assigned</TableHead>
                            <TableHead>Completed</TableHead>
                            <TableHead>In Progress</TableHead>
                            <TableHead>Overdue</TableHead>
                            <TableHead>Avg Progress</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredMembers.map((member) => {
                            const stats = getMemberStats(member);
                            const isAtRisk = atRiskLearners.includes(member);

                            return (
                              <TableRow key={member.id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{member.full_name}</p>
                                    <p className="text-xs text-gray-500">{member.email}</p>
                                  </div>
                                </TableCell>
                                <TableCell>{stats.total}</TableCell>
                                <TableCell>
                                  <Badge className="bg-green-100 text-green-800">{stats.completed}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className="bg-blue-100 text-blue-800">{stats.inProgress}</Badge>
                                </TableCell>
                                <TableCell>
                                  {stats.overdue > 0 && (
                                    <Badge className="bg-red-100 text-red-800">{stats.overdue}</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Progress value={stats.avgProgress} className="w-20" />
                                    <span className="text-sm font-medium">{stats.avgProgress}%</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    {isAtRisk && (
                                      <Button size="sm" variant="outline" onClick={() => sendNudge(member.email)}>
                                        <Send className="w-4 h-4 mr-1" />
                                        Nudge
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* AI Insights */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="mb-8">
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Brain className="w-5 h-5 text-purple-600" />
                            AI-Powered Strategic Insights
                          </CardTitle>
                          <p className="text-sm text-gray-600 mt-1">Data-driven learning recommendations</p>
                        </div>
                        <Button onClick={generateAIInsights} disabled={generatingInsights}>
                          {generatingInsights ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                          {aiInsights.length > 0 ? 'Regenerate' : 'Generate'} Insights
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {aiInsights.length > 0 ? (
                        <div className="space-y-4">
                          {aiInsights.map((insight, idx) => (
                            <div key={idx} className={`p-4 border rounded-lg ${getPriorityColor(insight.priority)}`}>
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-semibold">{insight.title}</h4>
                                <Badge className={getPriorityColor(insight.priority)}>{insight.priority}</Badge>
                              </div>
                              <p className="text-sm text-gray-700 mb-3">{insight.description}</p>
                              <Button size="sm" variant="outline">
                                {insight.action}
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          Click "Generate Insights" to get AI-powered recommendations
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </>
            )}

                {/* Charts Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Learning Activity Over Time */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85 }}>
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Learning Activity Over Time</CardTitle>
                <p className="text-sm text-gray-600">Assignments, completions, and active learners</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.activityTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => format(new Date(date), 'MMM d')}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis />
                    <Tooltip labelFormatter={(date) => format(new Date(date), 'PPP')} />
                    <Legend />
                    <Line type="monotone" dataKey="assignments" stroke="#8b5cf6" strokeWidth={2} name="Assigned" />
                    <Line type="monotone" dataKey="completions" stroke="#10b981" strokeWidth={2} name="Completed" />
                    <Line type="monotone" dataKey="activeLearners" stroke="#3b82f6" strokeWidth={2} name="Active Learners" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Learning Completion by Department */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Completion by Department</CardTitle>
                <p className="text-sm text-gray-600">Department-level performance</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={departmentChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="completionRate" fill="#10b981" name="Completion Rate %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Competency Development Overview (Radar) */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.95 }}>
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Competency Development Overview</CardTitle>
                <p className="text-sm text-gray-600">Learning activity across competencies</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={competencyRadarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="competency" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis />
                    <Radar name="Assigned" dataKey="activity" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                    <Radar name="Completed" dataKey="completed" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Learning by Leadership Level */}
          {analytics.learningByLeadershipLevel?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Engagement by Leadership Level</CardTitle>
                  <p className="text-sm text-gray-600">Completion rates by management tier</p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.learningByLeadershipLevel}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="level" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="completionRate" fill="#3b82f6" name="Completion Rate %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Learning by Type (Pie) */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05 }}>
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Learning by Type</CardTitle>
                <p className="text-sm text-gray-600">Distribution by content type</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={typeChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {typeChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Learning by Skill/Topic */}
          {analytics.learningBySkillTopic?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}>
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Learning by Skill/Topic</CardTitle>
                  <p className="text-sm text-gray-600">Distribution across topics</p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.learningBySkillTopic.slice(0, 6)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ topic, completionRate }) => `${topic}: ${completionRate}%`}
                        outerRadius={80}
                        dataKey="assigned"
                      >
                        {analytics.learningBySkillTopic.slice(0, 6).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              </motion.div>
            )}
            </div>

                {/* Overdue Learning Table */}
            {analytics.mostOverdueLearning?.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.15 }} className="mb-8">
            <Card className="border-0 shadow-lg border-l-4 border-l-red-500">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  Overdue Learning Items ({analytics.mostOverdueLearning.length})
                </CardTitle>
                <p className="text-sm text-gray-600">Items requiring immediate attention</p>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Learning Item</TableHead>
                        <TableHead>Learner</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Days Overdue</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.mostOverdueLearning.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{item.resource_title}</TableCell>
                          <TableCell>{item.learner_name}</TableCell>
                          <TableCell>{item.learner_department}</TableCell>
                          <TableCell>{format(new Date(item.due_date), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            <Badge className="bg-red-100 text-red-800">{item.days_overdue} days</Badge>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline">Send Nudge</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
                </CardContent>
              </Card>
              </motion.div>
            )}

                {/* Tables Row */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Top Resources */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}>
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-600" />
                  Top Resources by Completion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.topResources?.slice(0, 5).map((resource, index) => (
                    <div key={resource.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{index + 1}</Badge>
                          <p className="font-medium text-sm text-gray-900">{resource.title}</p>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {resource.type} • {resource.provider}
                        </p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        {resource.completions} completed
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Top Learners */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.25 }}>
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Top Learners
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.topLearners?.slice(0, 5).map((learner, index) => (
                    <div key={learner.email} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{index + 1}</Badge>
                          <p className="font-medium text-sm text-gray-900">{learner.full_name}</p>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{learner.department}</p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-purple-100 text-purple-800">
                          {learner.completionRate}%
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          {learner.completed}/{learner.assigned}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              </Card>
            </motion.div>
            </div>

                {/* Users with Pending Learning */}
            {analytics.usersWithPendingLearning?.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3 }}>
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Users with Pending Learning</CardTitle>
                <p className="text-sm text-gray-600">Learners with incomplete assignments</p>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-3">
                  {analytics.usersWithPendingLearning.slice(0, 10).map((userItem) => (
                    <div key={userItem.email} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900">{userItem.full_name}</p>
                        <p className="text-xs text-gray-600">{userItem.department}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {userItem.overdue > 0 && (
                          <Badge className="bg-red-100 text-red-800">
                            {userItem.overdue} overdue
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {userItem.pending} pending
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                </CardContent>
              </Card>
              </motion.div>
            )}
          </>
      </div>

      {/* Custom Date Range Dialog */}
      <Dialog open={showCustomDateDialog} onOpenChange={(open) => {
        if (!open) handleCancelCustomRange();
        else setShowCustomDateDialog(open);
      }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Select Custom Date Range</DialogTitle>
            <p className="text-sm text-gray-600 mt-1">Choose a date range to filter your analytics</p>
          </DialogHeader>
          
          {/* Quick Range Buttons */}
          <div className="flex flex-wrap gap-2 py-2 border-b">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickRange(7)}
              className="text-xs"
            >
              Last 7 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickRange(14)}
              className="text-xs"
            >
              Last 14 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickRange(30)}
              className="text-xs"
            >
              Last 30 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickRange(60)}
              className="text-xs"
            >
              Last 60 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickRange(90)}
              className="text-xs"
            >
              Last 90 Days
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                From Date
              </label>
              <Calendar
                mode="single"
                selected={customDateRange.from}
                onSelect={(date) => setCustomDateRange({ ...customDateRange, from: date })}
                disabled={(date) => date > new Date() || (customDateRange.to && date > customDateRange.to)}
                className="rounded-lg border shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                To Date
              </label>
              <Calendar
                mode="single"
                selected={customDateRange.to}
                onSelect={(date) => setCustomDateRange({ ...customDateRange, to: date })}
                disabled={(date) => date > new Date() || (customDateRange.from && date < customDateRange.from)}
                className="rounded-lg border shadow-sm"
              />
            </div>
          </div>
          
          {customDateRange.from && customDateRange.to && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center"
            >
              <p className="text-sm font-medium text-blue-900">
                Selected Range: {format(customDateRange.from, 'MMM d, yyyy')} - {format(customDateRange.to, 'MMM d, yyyy')}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                {Math.ceil((customDateRange.to - customDateRange.from) / (1000 * 60 * 60 * 24))} days
              </p>
            </motion.div>
          )}
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancelCustomRange}>
              Cancel
            </Button>
            <Button
              onClick={handleApplyCustomRange}
              disabled={!customDateRange.from || !customDateRange.to}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Apply Date Range
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Learning Modal */}
      <AssignLearningModal
        open={showAssignLearning}
        onClose={() => setShowAssignLearning(false)}
        assignedBy={user?.email}
        onSuccess={() => {
          setShowAssignLearning(false);
          loadAnalytics();
          toast.success('Learning content assigned successfully');
        }}
      />
    </div>
  );
}

export default withAuthProtection(LearningAnalyticsDashboard, ['Analyst', 'Admin Level 1', 'Admin Level 2', 'Super Administrator', 'Platform Admin', 'Partner Business Administrator', 'User Level 2']);