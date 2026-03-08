
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/useAuth";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/common/PageHeader";
import {
  BarChart3,
  Brain,
  TrendingUp,
  Users,
  AlertTriangle,
  Award,
  Target,
  Filter,
  Loader2,
  RefreshCw,
  FileText,
  ChevronUp,
  ChevronDown,
  Send,
  BookOpen,
  Calendar as CalendarIcon,
  CheckCircle
} from "lucide-react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
  LineChart,
  Line,
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
import { format, subDays, isAfter, isBefore, startOfDay, addDays } from "date-fns";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

const COLORS = {
  atRisk: '#ef4444',
  developing: '#f59e0b',
  proficient: '#3b82f6',
  expert: '#10b981'
};

export default function AssessmentAnalytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  
  const [filters, setFilters] = useState({
    timeframe: '6months',
    assessmentType: 'all',
    division: 'all',
    level: 'all',
    tenure: 'all',
    riskLevel: 'all',
    competencyFocus: 'all'
  });
  
  const [showCustomDateDialog, setShowCustomDateDialog] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({ from: null, to: null });
  const [appliedCustomDateRange, setAppliedCustomDateRange] = useState({ from: null, to: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('created_date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  const [rawData, setRawData] = useState({
    assessments: [],
    customAssessments: [],
    assessmentSubmissions: [],
    allUsers: []
  });
  
  const [aiInsights, setAiInsights] = useState([]);

  useEffect(() => {
    if (user) {
      loadAssessmentData();
    }
  }, [user]);

  const loadAssessmentData = async () => {
    setLoading(true);
    try {
      const [assessments, customAssessments, assessmentSubmissions, allUsers] = await Promise.all([
        base44.entities.Assessment.list(),
        base44.entities.CustomAssessment.list(),
        base44.entities.AssessmentSubmission.list(),
        base44.entities.User.list()
      ]);

      setRawData({
        assessments: assessments || [],
        customAssessments: customAssessments || [],
        assessmentSubmissions: assessmentSubmissions || [],
        allUsers: allUsers || []
      });
    } catch (error) {
      console.error('Error loading assessment data:', error);
      toast.error('Failed to load assessment data');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = (value) => {
    if (value === 'custom') {
      setShowCustomDateDialog(true);
    } else {
      setFilters({ ...filters, timeframe: value });
      setCustomDateRange({ from: null, to: null });
      setAppliedCustomDateRange({ from: null, to: null });
    }
  };

  const handleCustomDateApply = () => {
    if (customDateRange.from && customDateRange.to) {
      setAppliedCustomDateRange(customDateRange);
      setFilters({ ...filters, timeframe: 'custom' });
      setShowCustomDateDialog(false);
    } else {
      toast.error('Please select both a start and end date');
    }
  };

  const handleCustomDateCancel = () => {
    setShowCustomDateDialog(false);
    if (!appliedCustomDateRange.from || !appliedCustomDateRange.to) {
      if (filters.timeframe === 'custom') {
        setFilters({ ...filters, timeframe: '6months' });
      }
    }
    setCustomDateRange(appliedCustomDateRange);
  };

  const setQuickRange = (days) => {
    const to = new Date();
    const from = subDays(to, days);
    setCustomDateRange({ from, to });
  };

  const getDateCutoff = () => {
    if (filters.timeframe === 'custom' && appliedCustomDateRange.from) {
      return startOfDay(appliedCustomDateRange.from);
    }
    const now = new Date();
    switch(filters.timeframe) {
      case '3months': return subDays(now, 90);
      case '6months': return subDays(now, 180);
      case '12months': return subDays(now, 365);
      case 'all': return new Date(0);
      default: return subDays(now, 180);
    }
  };

  const getDateEnd = () => {
    if (filters.timeframe === 'custom' && appliedCustomDateRange.to) {
      return startOfDay(addDays(appliedCustomDateRange.to, 1));
    }
    return startOfDay(addDays(new Date(), 1));
  };

  const filteredData = useMemo(() => {
    const { assessments, allUsers } = rawData;
    const cutoffDate = getDateCutoff();
    const endDate = getDateEnd();

    let filtered = [...assessments];

    filtered = filtered.filter(a => {
      const date = new Date(a.created_date || a.submission_ts);
      return isAfter(date, cutoffDate) && isBefore(date, endDate);
    });

    if (filters.assessmentType !== 'all') {
      if (filters.assessmentType === 'leadership_index') {
        filtered = filtered.filter(a => a.overall_pct !== undefined);
      }
    }

    if (filters.division !== 'all') {
      const divisionUsers = allUsers.filter(u => u.department === filters.division);
      const divisionEmails = new Set(divisionUsers.map(u => u.email));
      filtered = filtered.filter(a => divisionEmails.has(a.email));
    }

    if (filters.level !== 'all') {
      const levelUsers = allUsers.filter(u => {
        const role = (u.current_role || '').toLowerCase();
        if (filters.level === 'manager') return role.includes('manager') && !role.includes('director') && !role.includes('vp') && !role.includes('chief');
        if (filters.level === 'director') return role.includes('director');
        if (filters.level === 'vp') return role.includes('vp') || role.includes('vice president');
        if (filters.level === 'c-suite') return role.includes('chief') || role.includes('ceo') || role.includes('cfo') || role.includes('cto') || role.includes('coo');
        return false;
      });
      const levelEmails = new Set(levelUsers.map(u => u.email));
      filtered = filtered.filter(a => levelEmails.has(a.email));
    }

    if (filters.tenure !== 'all') {
      const tenureUsers = allUsers.filter(u => {
        if (!u.start_date) return false;
        const monthsEmployed = Math.floor((new Date() - new Date(u.start_date)) / (1000 * 60 * 60 * 24 * 30));
        if (filters.tenure === '0-6') return monthsEmployed >= 0 && monthsEmployed <= 6;
        if (filters.tenure === '6-12') return monthsEmployed > 6 && monthsEmployed <= 12;
        if (filters.tenure === '1-2') return monthsEmployed > 12 && monthsEmployed <= 24;
        if (filters.tenure === '2-5') return monthsEmployed > 24 && monthsEmployed <= 60;
        if (filters.tenure === '5plus') return monthsEmployed > 60;
        return false;
      });
      const tenureEmails = new Set(tenureUsers.map(u => u.email));
      filtered = filtered.filter(a => tenureEmails.has(a.email));
    }

    if (filters.riskLevel !== 'all') {
      filtered = filtered.filter(a => {
        const score = a.overall_pct || 0;
        if (filters.riskLevel === 'at_risk') return score < 60;
        if (filters.riskLevel === 'developing') return score >= 60 && score < 70;
        if (filters.riskLevel === 'proficient') return score >= 70 && score < 85;
        if (filters.riskLevel === 'expert') return score >= 85;
        return true;
      });
    }

    if (filters.competencyFocus !== 'all') {
      filtered = filtered.filter(a => {
        const score = a[`${filters.competencyFocus}_pct`] || 0;
        return score < 70;
      });
    }

    return filtered;
  }, [rawData, filters, appliedCustomDateRange]);

  const metrics = useMemo(() => {
    const totalAssessments = filteredData.length;
    const avgScore = totalAssessments > 0 ? Math.round(filteredData.reduce((sum, a) => sum + (a.overall_pct || 0), 0) / totalAssessments) : 0;
    const atRisk = filteredData.filter(a => (a.overall_pct || 0) < 60).length;
    const highPotential = filteredData.filter(a => (a.overall_pct || 0) >= 85).length;
    
    // Mock 360 feedback score for now
    const avg360 = 'N/A';
    
    return {
      totalAssessments,
      completionRate: 85, // Mock
      avgScore,
      atRisk,
      highPotential,
      avg360
    };
  }, [filteredData]);

  const chartData = useMemo(() => {
    // Competency averages for radar chart
    const competencyAverages = {
      si: Math.round(filteredData.reduce((sum, a) => sum + (a.si_pct || 0), 0) / (filteredData.length || 1)),
      dm: Math.round(filteredData.reduce((sum, a) => sum + (a.dm_pct || 0), 0) / (filteredData.length || 1)),
      comm: Math.round(filteredData.reduce((sum, a) => sum + (a.comm_pct || 0), 0) / (filteredData.length || 1)),
      rm: Math.round(filteredData.reduce((sum, a) => sum + (a.rm_pct || 0), 0) / (filteredData.length || 1)),
      sm: Math.round(filteredData.reduce((sum, a) => sum + (a.sm_pct || 0), 0) / (filteredData.length || 1)),
      pm: Math.round(filteredData.reduce((sum, a) => sum + (a.pm_pct || 0), 0) / (filteredData.length || 1))
    };

    const radarData = [
      { competency: 'SI', current: competencyAverages.si, target: 80, benchmark: 75 },
      { competency: 'Decision Making', current: competencyAverages.dm, target: 80, benchmark: 75 },
      { competency: 'Communication', current: competencyAverages.comm, target: 80, benchmark: 75 },
      { competency: 'Resource Mgmt', current: competencyAverages.rm, target: 80, benchmark: 75 },
      { competency: 'Stakeholder Mgmt', current: competencyAverages.sm, target: 80, benchmark: 75 },
      { competency: 'Performance Mgmt', current: competencyAverages.pm, target: 80, benchmark: 75 }
    ];

    // Score distribution
    const scoreDistribution = [
      { name: 'At Risk (<60%)', value: filteredData.filter(a => (a.overall_pct || 0) < 60).length, color: COLORS.atRisk },
      { name: 'Developing (60-69%)', value: filteredData.filter(a => (a.overall_pct || 0) >= 60 && (a.overall_pct || 0) < 70).length, color: COLORS.developing },
      { name: 'Proficient (70-84%)', value: filteredData.filter(a => (a.overall_pct || 0) >= 70 && (a.overall_pct || 0) < 85).length, color: COLORS.proficient },
      { name: 'Expert (85%+)', value: filteredData.filter(a => (a.overall_pct || 0) >= 85).length, color: COLORS.expert }
    ];

    // Readiness pipeline by level
    const pipelineData = ['manager', 'director', 'vp', 'c-suite'].map(level => {
      const levelAssessments = filteredData.filter(a => {
        const userRole = (rawData.allUsers.find(u => u.email === a.email)?.current_role || '').toLowerCase();
        if (level === 'manager') return userRole.includes('manager') && !userRole.includes('director') && !userRole.includes('vp') && !userRole.includes('chief');
        if (level === 'director') return userRole.includes('director');
        if (level === 'vp') return userRole.includes('vp');
        if (level === 'c-suite') return userRole.includes('chief') || userRole.includes('ceo');
        return false;
      });

      return {
        level: level.replace('c-suite', 'C-Suite').replace(/^\w/, c => c.toUpperCase()),
        'Ready Now': levelAssessments.filter(a => (a.overall_pct || 0) >= 85).length,
        'High Potential': levelAssessments.filter(a => (a.overall_pct || 0) >= 70 && (a.overall_pct || 0) < 85).length,
        'Developing': levelAssessments.filter(a => (a.overall_pct || 0) >= 60 && (a.overall_pct || 0) < 70).length,
        'At Risk': levelAssessments.filter(a => (a.overall_pct || 0) < 60).length
      };
    });

    // Completion trends (monthly)
    const trendData = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = subDays(new Date(), i * 30);
      const monthEnd = subDays(new Date(), (i - 1) * 30);
      const monthAssessments = filteredData.filter(a => {
        const date = new Date(a.created_date || a.submission_ts);
        return isAfter(date, monthStart) && isBefore(date, monthEnd);
      });
      
      trendData.push({
        month: format(monthStart, 'MMM'),
        assessments: monthAssessments.length,
        avgScore: monthAssessments.length > 0 ? Math.round(monthAssessments.reduce((sum, a) => sum + (a.overall_pct || 0), 0) / monthAssessments.length) : 0
      });
    }

    // Competency deep dive
    const competencyData = [
      { name: 'SI', score: competencyAverages.si, target: 80 },
      { name: 'Decision Making', score: competencyAverages.dm, target: 80 },
      { name: 'Communication', score: competencyAverages.comm, target: 80 },
      { name: 'Resource Mgmt', score: competencyAverages.rm, target: 80 },
      { name: 'Stakeholder Mgmt', score: competencyAverages.sm, target: 80 },
      { name: 'Performance Mgmt', score: competencyAverages.pm, target: 80 }
    ];

    return {
      radarData,
      scoreDistribution,
      pipelineData,
      trendData,
      competencyData
    };
  }, [filteredData, rawData.allUsers]);

  const atRiskLeaders = useMemo(() => {
    return filteredData
      .filter(a => (a.overall_pct || 0) < 60)
      .map(a => {
        const user = rawData.allUsers.find(u => u.email === a.email);
        const lowestCompetency = [
          { name: 'SI', score: a.si_pct || 0 },
          { name: 'DM', score: a.dm_pct || 0 },
          { name: 'Comm', score: a.comm_pct || 0 },
          { name: 'RM', score: a.rm_pct || 0 },
          { name: 'SM', score: a.sm_pct || 0 },
          { name: 'PM', score: a.pm_pct || 0 }
        ].sort((a, b) => a.score - b.score)[0];

        return {
          id: a.id,
          name: user?.full_name || 'Unknown',
          email: a.email,
          department: user?.department || 'N/A',
          role: user?.current_role || 'N/A',
          score: a.overall_pct || 0,
          lowestCompetency: lowestCompetency.name,
          assessmentDate: format(new Date(a.created_date || a.submission_ts), 'MMM d, yyyy')
        };
      });
  }, [filteredData, rawData.allUsers]);

  const generateAIInsights = async () => {
    setGeneratingInsights(true);
    try {
      const prompt = `Analyze this organizational assessment data and provide 3-5 strategic insights:
        - Total Assessments: ${metrics.totalAssessments}
        - Average Score: ${metrics.avgScore}%
        - At-Risk Leaders: ${metrics.atRisk}
        - High Potential: ${metrics.highPotential}
        - Filters Applied: ${JSON.stringify(filters)}
        
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

  const handleExportCSV = () => {
    setExportingCSV(true);
    try {
      const csvData = [
        ['Name', 'Email', 'Department', 'Role', 'Overall Score', 'SI', 'DM', 'Comm', 'RM', 'SM', 'PM', 'Date'],
        ...filteredData.map(a => {
          const user = rawData.allUsers.find(u => u.email === a.email);
          return [
            user?.full_name || '',
            a.email,
            user?.department || '',
            user?.current_role || '',
            a.overall_pct || 0,
            a.si_pct || 0,
            a.dm_pct || 0,
            a.comm_pct || 0,
            a.rm_pct || 0,
            a.sm_pct || 0,
            a.pm_pct || 0,
            format(new Date(a.created_date || a.submission_ts), 'yyyy-MM-dd')
          ];
        })
      ];

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assessment-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('CSV exported successfully');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV');
    } finally {
      setExportingCSV(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedAndFilteredAssessments = () => {
    let results = [...filteredData];
    
    if (searchTerm) {
      results = results.filter(a => {
        const user = rawData.allUsers.find(u => u.email === a.email);
        const searchLower = searchTerm.toLowerCase();
        return (
          a.email.toLowerCase().includes(searchLower) ||
          (user?.full_name || '').toLowerCase().includes(searchLower) ||
          (user?.department || '').toLowerCase().includes(searchLower)
        );
      });
    }

    results.sort((a, b) => {
      let aVal, bVal;
      
      if (sortField === 'name') {
        const aUser = rawData.allUsers.find(u => u.email === a.email);
        const bUser = rawData.allUsers.find(u => u.email === b.email);
        aVal = aUser?.full_name || '';
        bVal = bUser?.full_name || '';
      } else if (sortField === 'score') {
        aVal = a.overall_pct || 0;
        bVal = b.overall_pct || 0;
      } else if (sortField === 'created_date') {
        aVal = new Date(a.created_date || a.submission_ts);
        bVal = new Date(b.created_date || b.submission_ts);
      } else {
        aVal = a[sortField];
        bVal = b[sortField];
      }

      if (sortDirection === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    return results;
  };

  const paginatedAssessments = useMemo(() => {
    const sorted = getSortedAndFilteredAssessments();
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sorted.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, searchTerm, sortField, sortDirection, currentPage, rawData.allUsers]);

  const totalPages = Math.ceil(getSortedAndFilteredAssessments().length / itemsPerPage);

  const getReadinessStatus = (score) => {
    if (score >= 85) return { label: 'Ready Now', color: 'bg-green-100 text-green-800' };
    if (score >= 70) return { label: 'High Potential', color: 'bg-blue-100 text-blue-800' };
    if (score >= 60) return { label: 'Developing', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'At Risk', color: 'bg-red-100 text-red-800' };
  };

  const getPriorityColor = (priority) => {
    if (priority === 'High Risk') return 'bg-red-100 text-red-800 border-red-200';
    if (priority === 'Strategic Priority') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (priority === 'Positive Impact') return 'bg-green-100 text-green-800 border-green-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

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
          title="Organizational Assessment Insights"
          subtitle="Aggregated view of all leadership assessments and surveys"
          badges={[
            { text: `${metrics.totalAssessments} Assessments`, className: "bg-white text-blue-600" },
            metrics.atRisk > 0 && { text: `${metrics.atRisk} At Risk`, className: "bg-red-100 text-red-800" }
          ].filter(Boolean)}
          onRefresh={loadAssessmentData}
          onExportCSV={handleExportCSV}
          loadingExportCSV={exportingCSV}
        />

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Filters:</span>
                </div>

                <Select value={filters.timeframe} onValueChange={handleTimeRangeChange}>
                  <SelectTrigger className="w-48">
                    {filters.timeframe === 'custom' && appliedCustomDateRange.from && appliedCustomDateRange.to ? (
                      <span className="text-sm">
                        {format(appliedCustomDateRange.from, 'MMM d')} - {format(appliedCustomDateRange.to, 'MMM d')}
                      </span>
                    ) : (
                      <SelectValue />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3months">Last 3 Months</SelectItem>
                    <SelectItem value="6months">Last 6 Months</SelectItem>
                    <SelectItem value="12months">Last 12 Months</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="custom">Custom Range...</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.assessmentType} onValueChange={(value) => setFilters({ ...filters, assessmentType: value })}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="leadership_index">Leadership Index</SelectItem>
                    <SelectItem value="360_feedback">360 Feedback</SelectItem>
                    <SelectItem value="team_assessments">Team Assessments</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.division} onValueChange={(value) => setFilters({ ...filters, division: value })}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Divisions</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.level} onValueChange={(value) => setFilters({ ...filters, level: value })}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="manager">Managers</SelectItem>
                    <SelectItem value="director">Directors</SelectItem>
                    <SelectItem value="vp">VPs</SelectItem>
                    <SelectItem value="c-suite">C-Suite</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.riskLevel} onValueChange={(value) => setFilters({ ...filters, riskLevel: value })}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Risk Levels</SelectItem>
                    <SelectItem value="at_risk">At Risk (&lt;60%)</SelectItem>
                    <SelectItem value="developing">Developing (60-69%)</SelectItem>
                    <SelectItem value="proficient">Proficient (70-84%)</SelectItem>
                    <SelectItem value="expert">Expert (85%+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Executive Summary */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <BarChart3 className="w-8 h-8 text-blue-600 mb-4" />
                <div className="text-3xl font-bold text-gray-900">{metrics.totalAssessments}</div>
                <div className="text-sm text-gray-600 mt-1">Total Assessments</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <TrendingUp className="w-8 h-8 text-green-600 mb-4" />
                <div className="text-3xl font-bold text-gray-900">{metrics.completionRate}%</div>
                <div className="text-sm text-gray-600 mt-1">Completion Rate</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <Brain className="w-8 h-8 text-purple-600 mb-4" />
                <div className="text-3xl font-bold text-gray-900">{metrics.avgScore}%</div>
                <div className="text-sm text-gray-600 mt-1">Avg Leadership Score</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <AlertTriangle className="w-8 h-8 text-red-600 mb-4" />
                <div className="text-3xl font-bold text-gray-900">{metrics.atRisk}</div>
                <div className="text-sm text-gray-600 mt-1">Leaders At-Risk</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <Award className="w-8 h-8 text-amber-600 mb-4" />
                <div className="text-3xl font-bold text-gray-900">{metrics.highPotential}</div>
                <div className="text-sm text-gray-600 mt-1">High Potential</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <Users className="w-8 h-8 text-blue-600 mb-4" />
                <div className="text-3xl font-bold text-gray-900">{metrics.avg360}</div>
                <div className="text-sm text-gray-600 mt-1">Avg 360 Feedback</div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* AI Insights */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-8">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    AI-Powered Strategic Insights
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">Data-driven recommendations for your organization</p>
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

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Radar Chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Organizational Competency Profile</CardTitle>
                <p className="text-sm text-gray-600">Current vs Target vs Industry Benchmark</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={chartData.radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="competency" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 100]} />
                    <Radar name="Current" dataKey="current" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                    <Radar name="Target" dataKey="target" stroke="#10b981" fill="#10b981" fillOpacity={0} strokeDasharray="5 5" />
                    <Radar name="Benchmark" dataKey="benchmark" stroke="#6b7280" fill="#6b7280" fillOpacity={0} strokeDasharray="3 3" />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Score Distribution */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Assessment Score Distribution</CardTitle>
                <p className="text-sm text-gray-600">Leaders by performance band</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.scoreDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {chartData.scoreDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Readiness Pipeline */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Leadership Readiness Pipeline</CardTitle>
                <p className="text-sm text-gray-600">Succession planning by level</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.pipelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="level" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Ready Now" stackId="a" fill={COLORS.expert} />
                    <Bar dataKey="High Potential" stackId="a" fill={COLORS.proficient} />
                    <Bar dataKey="Developing" stackId="a" fill={COLORS.developing} />
                    <Bar dataKey="At Risk" stackId="a" fill={COLORS.atRisk} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Completion Trends */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Assessment Completion Trends</CardTitle>
                <p className="text-sm text-gray-600">Monthly activity and average scores</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="assessments" stroke="#3b82f6" strokeWidth={2} name="Assessments" />
                    <Line yAxisId="right" type="monotone" dataKey="avgScore" stroke="#10b981" strokeWidth={2} name="Avg Score %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Competency Deep Dive */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="md:col-span-2">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Competency Deep Dive</CardTitle>
                <p className="text-sm text-gray-600">Average scores vs target proficiency</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.competencyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="score" fill="#3b82f6" name="Current Score">
                      {chartData.competencyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.score >= 80 ? COLORS.expert : entry.score >= 70 ? COLORS.proficient : COLORS.developing} />
                      ))}
                    </Bar>
                    <Bar dataKey="target" fill="#10b981" fillOpacity={0.3} name="Target" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* At-Risk Leaders Panel */}
        {atRiskLeaders.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }} className="mb-8">
            <Card className="border-0 shadow-lg border-l-4 border-l-red-500">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-5 h-5" />
                  At-Risk Leaders ({atRiskLeaders.length})
                </CardTitle>
                <p className="text-sm text-gray-600">Leaders requiring immediate attention and intervention</p>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Lowest Competency</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {atRiskLeaders.map((leader) => (
                        <TableRow key={leader.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`${createPageUrl('AssessmentDetails')}?assessmentId=${leader.id}`)}>
                          <TableCell className="font-medium">{leader.name}</TableCell>
                          <TableCell>{leader.department}</TableCell>
                          <TableCell>{leader.role}</TableCell>
                          <TableCell>
                            <Badge className="bg-red-100 text-red-800">{leader.score}%</Badge>
                          </TableCell>
                          <TableCell>{leader.lowestCompetency}</TableCell>
                          <TableCell className="text-sm text-gray-600">{leader.assessmentDate}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigate(`${createPageUrl('AssessmentDetails')}?assessmentId=${leader.id}`); }}>
                                <FileText className="w-3 h-3 mr-1" />
                                View
                              </Button>
                              <Button size="sm" variant="outline" onClick={(e) => e.stopPropagation()}>
                                <Send className="w-3 h-3 mr-1" />
                                Nudge
                              </Button>
                              <Button size="sm" variant="outline" onClick={(e) => e.stopPropagation()}>
                                <BookOpen className="w-3 h-3 mr-1" />
                                Assign
                              </Button>
                            </div>
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

        {/* Detailed Assessment List */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">All Assessments</CardTitle>
                  <p className="text-sm text-gray-600">Complete assessment records</p>
                </div>
                <Input
                  placeholder="Search by name, email, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-xs"
                />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                        <div className="flex items-center gap-1">
                          Name
                          {sortField === 'name' && (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                        </div>
                      </TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Manager Level</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('created_date')}>
                        <div className="flex items-center gap-1">
                          Date
                          {sortField === 'created_date' && (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('score')}>
                        <div className="flex items-center gap-1">
                          Score
                          {sortField === 'score' && (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                        </div>
                      </TableHead>
                      <TableHead>Readiness</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAssessments.map((assessment) => {
                      const user = rawData.allUsers.find(u => u.email === assessment.email);
                      const readiness = getReadinessStatus(assessment.overall_pct || 0);
                      
                      return (
                        <TableRow key={assessment.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`${createPageUrl('AssessmentDetails')}?assessmentId=${assessment.id}`)}>
                          <TableCell className="font-medium">{user?.full_name || 'Unknown'}</TableCell>
                          <TableCell className="text-sm">{assessment.email}</TableCell>
                          <TableCell>{user?.department || 'N/A'}</TableCell>
                          <TableCell>{user?.current_role || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">Leadership Index</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {format(new Date(assessment.created_date || assessment.submission_ts), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <span className={`font-semibold ${assessment.overall_pct >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                              {assessment.overall_pct || 0}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={readiness.color}>{readiness.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigate(`${createPageUrl('AssessmentDetails')}?assessmentId=${assessment.id}`); }}>
                              View Report
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
              
              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, getSortedAndFilteredAssessments().length)} of {getSortedAndFilteredAssessments().length} assessments
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(page => (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Custom Date Range Dialog */}
      <Dialog open={showCustomDateDialog} onOpenChange={(open) => {
        if (!open) handleCustomDateCancel();
      }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Select Custom Date Range</DialogTitle>
            <p className="text-sm text-gray-600 mt-1">Choose a date range to filter your analytics</p>
          </DialogHeader>
          
          <div className="flex flex-wrap gap-2 py-2 border-b">
            <Button variant="outline" size="sm" onClick={() => setQuickRange(7)} className="text-xs">
              Last 7 Days
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickRange(14)} className="text-xs">
              Last 14 Days
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickRange(30)} className="text-xs">
              Last 30 Days
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickRange(60)} className="text-xs">
              Last 60 Days
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickRange(90)} className="text-xs">
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
            <Button variant="outline" onClick={handleCustomDateCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleCustomDateApply}
              disabled={!customDateRange.from || !customDateRange.to}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Apply Date Range
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
