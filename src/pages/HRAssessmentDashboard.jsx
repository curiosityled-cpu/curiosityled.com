
import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
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
import {
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  Search,
  Loader2,
  BarChart3,
  Award,
  Mail,
  Eye,
  UserPlus
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "framer-motion";
import UserDetailPanel from "../components/command/UserDetailPanel";
import { AnimatePresence } from "framer-motion";
import PageHeader from "@/components/common/PageHeader";
import { usePageContext } from "../Layout";
import { useViewportTracking } from "@/components/hooks/useViewportTracking";
import AssignAssessmentModal from "@/components/assignment/AssignAssessmentModal";

function HRAssessmentDashboard() {
  const { user, hasRole, appRole } = useAuth();
  const { updatePageContext } = usePageContext();

  const [assessments, setAssessments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAssessments, setSelectedAssessments] = useState([]);
  const [selectedUserEmail, setSelectedUserEmail] = useState(null);

  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  // Assignment modal
  const [showAssignAssessmentModal, setShowAssignAssessmentModal] = useState(false);

  const canAssign = ['User Level 2', 'Admin Level 1', 'Admin Level 2', 'Super Administrator', 'Partner Business Administrator', 'Platform Admin'].includes(appRole);

  const [filters, setFilters] = useState({
    department: 'all',
    roleLevel: 'all',
    status: 'all',
    scoreRange: 'all'
  });

  const sectionIds = [
    'section-filters-actions',
    'section-metrics',
    'section-score-distribution',
    'section-competency-breakdown',
    'section-archetype-distribution',
    'section-user-list'
  ];

  const { visibleSections, focusedSection } = useViewportTracking(
    sectionIds,
    (viewportData) => {
      updatePageContext({
        viewport_focus: {
          focused_section: viewportData.focused,
          visible_sections: viewportData.visible,
          section_labels: {
            'section-filters-actions': 'Filters & Actions',
            'section-metrics': 'Key Metrics',
            'section-score-distribution': 'Score Distribution',
            'section-competency-breakdown': 'Competency Analysis',
            'section-archetype-distribution': 'Leadership Archetypes',
            'section-user-list': 'User Details'
          }
        }
      });
    }
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assessmentsData, usersData] = await Promise.all([
        base44.entities.Assessment.list(),
        base44.entities.User.list()
      ]);

      setAssessments(assessmentsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load assessment data');
    } finally {
      setLoading(false);
    }
  };

  const enrichedAssessments = useMemo(() => {
    return assessments.map(assessment => {
      const user = users.find(u => u.email === assessment.email);
      return {
        ...assessment,
        user_name: user?.full_name || assessment.email,
        department: user?.department || 'Unknown',
        role_level: user?.current_role || 'Unknown',
        status: assessment.submission_ts ? 'completed' : 'pending'
      };
    });
  }, [assessments, users]);

  const filteredAssessments = useMemo(() => {
    let filtered = enrichedAssessments;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        a.user_name.toLowerCase().includes(term) ||
        a.email.toLowerCase().includes(term) ||
        a.department.toLowerCase().includes(term)
      );
    }

    if (filters.department !== 'all') {
      filtered = filtered.filter(a => a.department === filters.department);
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(a => a.status === filters.status);
    }

    if (filters.scoreRange !== 'all') {
      filtered = filtered.filter(a => {
        if (!a.overall_pct) return filters.scoreRange === 'none';
        if (filters.scoreRange === 'high') return a.overall_pct >= 85;
        if (filters.scoreRange === 'medium') return a.overall_pct >= 70 && a.overall_pct < 85;
        if (filters.scoreRange === 'low') return a.overall_pct >= 55 && a.overall_pct < 70;
        if (filters.scoreRange === 'at_risk') return a.overall_pct < 55;
        return true;
      });
    }

    return filtered;
  }, [enrichedAssessments, searchTerm, filters]);

  const metrics = useMemo(() => {
    const completed = enrichedAssessments.filter(a => a.status === 'completed');
    const validScores = completed.filter(a => a.overall_pct !== undefined && a.overall_pct !== null);

    return {
      totalDeployed: enrichedAssessments.length,
      completionRate: enrichedAssessments.length > 0
        ? Math.round((completed.length / enrichedAssessments.length) * 100)
        : 0,
      avgOverallScore: validScores.length > 0
        ? Math.round(validScores.reduce((sum, a) => sum + a.overall_pct, 0) / validScores.length)
        : 0,
      avgSIScore: validScores.length > 0
        ? Math.round(validScores.reduce((sum, a) => sum + (a.si_pct || 0), 0) / validScores.length)
        : 0,
      pendingCount: enrichedAssessments.filter(a => a.status === 'pending').length,
      highPerformers: validScores.filter(a => a.overall_pct >= 85).length,
      atRisk: validScores.filter(a => a.overall_pct < 55).length
    };
  }, [enrichedAssessments]);

  const scoreDistribution = useMemo(() => {
    const completed = enrichedAssessments.filter(a => a.overall_pct !== undefined && a.overall_pct !== null);

    return [
      { name: 'Expert (85-100%)', count: completed.filter(a => a.overall_pct >= 85).length, fill: '#10b981' },
      { name: 'Proficient (70-84%)', count: completed.filter(a => a.overall_pct >= 70 && a.overall_pct < 85).length, fill: '#3b82f6' },
      { name: 'Developing (55-69%)', count: completed.filter(a => a.overall_pct >= 55 && a.overall_pct < 70).length, fill: '#f59e0b' },
      { name: 'Needs Support (<55%)', count: completed.filter(a => a.overall_pct < 55).length, fill: '#ef4444' }
    ];
  }, [enrichedAssessments]);

  const competencyAverages = useMemo(() => {
    const completed = enrichedAssessments.filter(a => a.overall_pct !== undefined);
    if (completed.length === 0) return [];

    return [
      { name: 'SI', score: Math.round(completed.reduce((sum, a) => sum + (a.si_pct || 0), 0) / completed.length) },
      { name: 'DM', score: Math.round(completed.reduce((sum, a) => sum + (a.dm_pct || 0), 0) / completed.length) },
      { name: 'Comm', score: Math.round(completed.reduce((sum, a) => sum + (a.comm_pct || 0), 0) / completed.length) },
      { name: 'RM', score: Math.round(completed.reduce((sum, a) => sum + (a.rm_pct || 0), 0) / completed.length) },
      { name: 'SM', score: Math.round(completed.reduce((sum, a) => sum + (a.sm_pct || 0), 0) / completed.length) },
      { name: 'PM', score: Math.round(completed.reduce((sum, a) => sum + (a.pm_pct || 0), 0) / completed.length) }
    ];
  }, [enrichedAssessments]);

  const archetypeDistribution = useMemo(() => {
    const completed = enrichedAssessments.filter(a => a.archetype_label);
    const archetypeCounts = {};

    completed.forEach(a => {
      archetypeCounts[a.archetype_label] = (archetypeCounts[a.archetype_label] || 0) + 1;
    });

    return Object.entries(archetypeCounts).map(([name, value]) => ({ name, value }));
  }, [enrichedAssessments]);

  const exportData = useMemo(() => {
    const completedAssessmentsWithScore = enrichedAssessments.filter(a => a.overall_pct !== undefined && a.overall_pct !== null);
    const topPerformers = enrichedAssessments
        .filter(a => a.overall_pct >= 85)
        .map(a => ({ full_name: a.user_name, email: a.email, overall_pct: a.overall_pct, si_pct: a.si_pct }))
        .sort((a, b) => b.overall_pct - a.overall_pct)
        .slice(0, 10); // Limit to top 10 for export example

    return {
      summary: {
        totalAssessments: enrichedAssessments.length,
        completionRate: metrics.completionRate,
        averageScore: metrics.avgOverallScore,
        averageSIScore: metrics.avgSIScore,
      },
      scoreDistribution: scoreDistribution.reduce((acc, item) => {
        acc[item.name] = item.count;
        return acc;
      }, {}),
      competencyAverages: competencyAverages,
      archetypeDistribution: archetypeDistribution,
      topPerformers: topPerformers,
      allFilteredAssessments: filteredAssessments // Include filtered list if needed for detailed report
    };
  }, [enrichedAssessments, metrics, scoreDistribution, competencyAverages, archetypeDistribution, filteredAssessments]);

  const handleSelectAll = (checked) => {
    if (checked) {
      const pending = filteredAssessments.filter(a => a.status === 'pending');
      setSelectedAssessments(pending.map(a => a.id));
    } else {
      setSelectedAssessments([]);
    }
  };

  const handleSelectAssessment = (assessmentId, checked) => {
    setSelectedAssessments(prev =>
      checked ? [...prev, assessmentId] : prev.filter(id => id !== assessmentId)
    );
  };

  const handleSendReminders = async () => {
    if (selectedAssessments.length === 0) {
      toast.error("Please select assessments to send reminders for");
      return;
    }

    const selectedData = enrichedAssessments.filter(a => selectedAssessments.includes(a.id));

    try {
      const emailPromises = selectedData.map(assessment =>
        base44.integrations.Core.SendEmail({
          to: assessment.email,
          subject: 'Reminder: Complete Your Leadership Assessment',
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; border-radius: 10px 10px 0 0;">
                <h2 style="color: white; margin: 0;">⏰ Assessment Reminder</h2>
              </div>

              <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="color: #374151; line-height: 1.6;">Hi ${assessment.user_name},</p>

                <p style="color: #374151; line-height: 1.6; margin: 20px 0;">
                  This is a friendly reminder to complete your Leadership Index Assessment. Taking this assessment is an important step in your leadership development journey.
                </p>

                <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="color: #374151; font-weight: 600; margin: 0 0 10px 0;">Why complete this assessment?</p>
                  <ul style="color: #6b7280; margin: 0; padding-left: 20px;">
                    <li>Gain insights into your leadership strengths</li>
                    <li>Identify development opportunities</li>
                    <li>Receive personalized learning recommendations</li>
                    <li>Track your leadership growth over time</li>
                  </ul>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="[ASSESSMENT_LINK]" style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                    Start Assessment
                  </a>
                </div>

                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                  Questions? Reply to this email and we'll be happy to help.
                </p>
              </div>
            </div>
          `,
          from_name: 'Curiosity Led Platform'
        })
      );

      await Promise.all(emailPromises);
      toast.success(`Reminders sent to ${selectedData.length} user(s)`);
      setSelectedAssessments([]);
    } catch (error) {
      console.error('Error sending reminders:', error);
      toast.error('Failed to send some reminders');
    }
  };

  const handleExportCSV = () => {
    setExportingCSV(true);
    try {
      const csvData = [
        ['Assessment Analytics Report'],
        ['Generated:', new Date().toLocaleString()],
        [''],
        ['Summary Metrics'],
        ['Total Assessments', enrichedAssessments.length],
        ['Completion Rate', `${metrics.completionRate}%`],
        ['Average Overall Score', `${metrics.avgOverallScore}%`],
        ['Average SI Score', `${metrics.avgSIScore}%`]
      ];

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assessment-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('CSV exported successfully!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV');
    } finally {
      setExportingCSV(false);
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      // Prepare the analytics object to be sent
      const analyticsToSend = {
        summary: exportData.summary,
        scoreDistribution: exportData.scoreDistribution,
        competencyAverages: exportData.competencyAverages,
        archetypeDistribution: exportData.archetypeDistribution,
        topPerformers: exportData.topPerformers,
        allFilteredAssessments: exportData.allFilteredAssessments // Pass the detailed list
      };

      const { data: pdfData } = await base44.functions.invoke('exportAssessmentAnalyticsPDF', {
        analytics: analyticsToSend,
        filters: { department: filters.department, status: filters.status, scoreRange: filters.scoreRange } // Pass relevant filters
      });
      
      const blob = new Blob([pdfData], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assessment-analytics-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessment analytics...</p>
        </div>
      </div>
    );
  }

  const pageHeaderBadges = [
    { text: `${filteredAssessments.length} Assessments`, className: 'bg-purple-100 text-purple-800' }
  ];

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <PageHeader
              title="Assessment Analytics Dashboard"
              subtitle="Comprehensive leadership assessment insights"
              badges={pageHeaderBadges}
              onRefresh={loadData}
              onExportCSV={handleExportCSV}
              onExportPDF={handleExportPDF}
              loadingRefresh={loading}
              loadingExportCSV={exportingCSV}
              loadingExportPDF={exportingPDF}
              icon={BarChart3}
            />

            {/* Assignment Action Button */}
            {canAssign && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-0 shadow-lg bg-gradient-to-r from-green-50 to-blue-50">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Assign Assessments</h3>
                        <p className="text-sm text-gray-600">Send assessment invitations to your team members</p>
                      </div>
                      <Button
                        onClick={() => setShowAssignAssessmentModal(true)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Assign Assessment
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Filters and Actions */}
            <div id="section-filters-actions">
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Filter className="w-5 h-5" />
                      Filter & Search
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSendReminders}
                        disabled={selectedAssessments.length === 0}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Send Reminders ({selectedAssessments.length})
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="md:col-span-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Search by name or email..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <Select value={filters.department} onValueChange={(value) => setFilters({...filters, department: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        <SelectItem value="Engineering">Engineering</SelectItem>
                        <SelectItem value="Product">Product</SelectItem>
                        <SelectItem value="Sales">Sales</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                        <SelectItem value="Operations">Operations</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filters.scoreRange} onValueChange={(value) => setFilters({...filters, scoreRange: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Score Range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Scores</SelectItem>
                        <SelectItem value="high">High (≥85%)</SelectItem>
                        <SelectItem value="medium">Medium (70-84%)</SelectItem>
                        <SelectItem value="low">Low (55-69%)</SelectItem>
                        <SelectItem value="at_risk">At Risk (&lt;55%)</SelectItem>
                        <SelectItem value="none">No Score</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Key Metrics */}
            <div id="section-metrics">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <FileText className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{metrics.totalDeployed}</p>
                    <p className="text-xs text-gray-600">Total Deployed</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{metrics.completionRate}%</p>
                    <p className="text-xs text-gray-600">Completion Rate</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <BarChart3 className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{metrics.avgOverallScore}%</p>
                    <p className="text-xs text-gray-600">Avg Overall</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{metrics.avgSIScore}%</p>
                    <p className="text-xs text-gray-600">Avg SI Score</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <Clock className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{metrics.pendingCount}</p>
                    <p className="text-xs text-gray-600">Pending</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <Award className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{metrics.highPerformers}</p>
                    <p className="text-xs text-gray-600">High Performers</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{metrics.atRisk}</p>
                    <p className="text-xs text-gray-600">At Risk</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6">
              <div id="section-score-distribution">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Score Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={scoreDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, count }) => `${name}: ${count}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {scoreDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <div id="section-competency-breakdown">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Average Scores by Competency</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={competencyAverages}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Bar dataKey="score" fill="#8b5cf6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Archetype Distribution */}
            {archetypeDistribution.length > 0 && (
              <div id="section-archetype-distribution">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Leadership Archetype Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={archetypeDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Assessments Table */}
            <div id="section-user-list">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Assessments ({filteredAssessments.length})
                    </CardTitle>
                    {filteredAssessments.some(a => a.status === 'pending') && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedAssessments.length > 0 &&
                                   selectedAssessments.length === filteredAssessments.filter(a => a.status === 'pending').length}
                          onCheckedChange={handleSelectAll}
                        />
                        <span className="text-sm text-gray-600">Select All Pending</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Overall</TableHead>
                          <TableHead className="text-right">SI</TableHead>
                          <TableHead>Archetype</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAssessments.slice(0, 50).map(assessment => (
                          <TableRow key={assessment.id} className="hover:bg-gray-50">
                            <TableCell>
                              {assessment.status === 'pending' && (
                                <Checkbox
                                  checked={selectedAssessments.includes(assessment.id)}
                                  onCheckedChange={(checked) => handleSelectAssessment(assessment.id, checked)}
                                />
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{assessment.user_name}</TableCell>
                            <TableCell className="text-sm text-gray-600">{assessment.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{assessment.department}</Badge>
                            </TableCell>
                            <TableCell>
                              {assessment.status === 'completed' ? (
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Completed
                                </Badge>
                              ) : (
                                <Badge className="bg-yellow-100 text-yellow-800">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {assessment.overall_pct ? `${assessment.overall_pct}%` : '-'}
                            </TableCell>
                            <TableCell className="text-right font-bold text-purple-600">
                              {assessment.si_pct ? `${assessment.si_pct}%` : '-'}
                            </TableCell>
                            <TableCell>
                              {assessment.archetype_label ? (
                                <Badge variant="outline" className="text-xs">{assessment.archetype_label}</Badge>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {assessment.submission_ts
                                ? format(new Date(assessment.submission_ts), 'MMM d, yyyy')
                                : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedUserEmail(assessment.email)}
                              >
                                <Eye className="w-4 h-4 text-blue-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {filteredAssessments.length > 50 && (
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-600">
                        Showing 50 of {filteredAssessments.length} assessments
                      </p>
                    </div>
                  )}

                  {filteredAssessments.length === 0 && (
                    <div className="text-center py-12">
                      <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-600">No assessments match your filters</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* User Detail Panel */}
      <AnimatePresence>
        {selectedUserEmail && (
          <UserDetailPanel
            userEmail={selectedUserEmail}
            onClose={() => setSelectedUserEmail(null)}
            viewContext="program"
          />
        )}
      </AnimatePresence>

      {/* Assignment Modals */}
      <AssignAssessmentModal
        isOpen={showAssignAssessmentModal}
        onClose={() => setShowAssignAssessmentModal(false)}
        onSuccess={loadData}
      />
    </>
  );
}

export default withAuthProtection(HRAssessmentDashboard, ['Analyst', 'Admin Level 1', 'Admin Level 2', 'Super Administrator', 'Platform Admin', 'Partner Business Administrator', 'User Level 2']);
