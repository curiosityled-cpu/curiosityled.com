import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/common/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Building2,
  Target,
  BarChart3,
  TrendingUp,
  Activity,
  Calendar as CalendarIcon, // Renamed to avoid conflict with UI Calendar component
  Download,
  Filter,
  CheckCircle, // Added for apply button
  Clock,
  Zap,
  Eye,
  Settings,
  Palette,
  CreditCard,
  ArrowRight,
  X,
  RefreshCw, // Added for retry/refresh button
  AlertTriangle // Added for error display
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
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
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format, subDays, startOfDay, endOfDay, isAfter } from "date-fns";
import { useAuth } from "@/components/useAuth";
import { useClient } from "@/components/contexts/ClientContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

export default function PlatformAdminDashboard() {
  const { user } = useAuth();
  const { client: currentClient } = useClient();

  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedOrg, setSelectedOrg] = useState('all');
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0); // New state for retry count
  
  const [showCustomDateDialog, setShowCustomDateDialog] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({ from: null, to: null });
  const [appliedCustomDateRange, setAppliedCustomDateRange] = useState({ from: null, to: null });

  // Data states
  const [users, setUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [goals, setGoals] = useState([]);
  const [assignedLearning, setAssignedLearning] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);

  // Memoized function for data loading
  const loadData = async (isRetry = false) => {
    if (!isRetry) {
      setLoading(true); // Only show full loading spinner for initial load
    }
    setError(null); // Clear any previous errors on new load attempt

    try {
      console.log('Fetching platform analytics...', { attempt: retryCount + 1, isRetry });
      
      // Implement request timeout using Promise.race and AbortController
      const controller = new AbortController();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => {
          controller.abort();
          reject(new Error('Request timed out after 30 seconds. The platform may have a large amount of data. Try refreshing or contact support if this persists.'));
        }, 30000) // 30 second timeout
      );

      const response = await Promise.race([
        base44.functions.invoke('getPlatformAnalytics', { signal: controller.signal }),
        timeoutPromise
      ]);
      
      if (response?.data?.success) {
        const { data } = response.data;
        setUsers(data?.users || []);
        setOrganizations(data?.organizations || []);
        setAssessments(data?.assessments || []);
        setGoals(data?.goals || []);
        setAssignedLearning(data?.assignedLearning || []);
        setPrograms(data?.programs || []);
        setActivityLogs(data?.activityLogs || []);
        setRetryCount(0); // Reset retry count on success
        
        if (isRetry) {
          toast.success('Data loaded successfully!');
        }
      } else {
        const errorMsg = response?.data?.error || 'Failed to load analytics data';
        const errorDetails = response?.data?.details || '';
        console.error('API Error:', errorMsg, errorDetails);
        throw new Error(`${errorMsg}${errorDetails ? ': ' + errorDetails : ''}`);
      }
    } catch (error) {
      console.error('Error loading platform data:', error);
      
      let errorMessage = error.message || 'Unknown error';
      
      if (errorMessage.includes('Request timed out')) {
        // Specific timeout message already set in timeoutPromise
      } else if (errorMessage.includes('Network') || errorMessage.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (errorMessage.includes('Unauthorized')) {
        errorMessage = 'You do not have permission to view platform analytics. Please check your role.';
      } else if (errorMessage.includes('Authentication')) {
        errorMessage = 'Authentication failed. Please refresh and try again.';
      }
      
      setError(errorMessage);
      
      // Set empty arrays to prevent crashes or display of partial/stale data
      setUsers([]);
      setOrganizations([]);
      setAssessments([]);
      setGoals([]);
      setAssignedLearning([]);
      setPrograms([]);
      setActivityLogs([]);

      // Show toast only if it's the initial load or a new error
      if (!isRetry) { // Changed condition to `!isRetry`
        toast.error('Failed to load platform analytics');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Set up interval for refreshing data every 60 seconds
    const interval = setInterval(() => loadData(true), 60000); // Pass true to avoid toast on every automated refresh
    
    return () => {
      clearInterval(interval);
    };
  }, []); // Empty dependency array means this effect runs once on mount

  useEffect(() => {
    if (!loading) {
      setFilterLoading(true);
      const timer = setTimeout(() => setFilterLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [timeRange, selectedOrg, selectedIndustry, loading, customDateRange, appliedCustomDateRange]); // Added appliedCustomDateRange

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    loadData(true); // Call loadData with isRetry = true
  };

  const handleTimeRangeChange = (value) => {
    if (value === 'custom') {
      setShowCustomDateDialog(true);
    } else {
      setTimeRange(value);
      setCustomDateRange({ from: null, to: null });
      setAppliedCustomDateRange({ from: null, to: null }); // Clear applied range if selecting predefined
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
    // If no custom range was previously applied, revert to '30d' if 'custom' was selected.
    // Otherwise, restore the currently applied custom range to the dialog's state.
    if (!appliedCustomDateRange.from || !appliedCustomDateRange.to) {
      if (timeRange === 'custom') { // Only reset if custom was the current range
        setTimeRange('30d');
      }
    }
    setCustomDateRange(appliedCustomDateRange); // This ensures the dialog opens with the *applied* range next time.
  };

  const setQuickRange = (days) => {
    const to = new Date();
    const from = subDays(to, days);
    setCustomDateRange({ from, to });
  };

  // Update getDateCutoff to handle custom range
  const getDateCutoff = () => {
    if (timeRange === 'custom' && appliedCustomDateRange.from) {
      return startOfDay(appliedCustomDateRange.from);
    }
    const now = new Date();
    switch(timeRange) {
      case '7d': return subDays(now, 7);
      case '30d': return subDays(now, 30);
      case '90d': return subDays(now, 90);
      case '12mo': return subDays(now, 365);
      case 'all': return new Date(0);
      default: return subDays(now, 30);
    }
  };

  const filteredData = useMemo(() => {
    // If there's an error and data is cleared, these memos should gracefully handle empty arrays.
    // The main error display will block rendering of the dashboard, so this is mostly for robustness.
    if (error) {
        return {
            users: [], assessments: [], goals: [], assignedLearning: [],
            stats: {
                totalUsers: 0, activeUsers: 0, activeUserRate: 0, totalAssessments: 0, avgScore: 0,
                totalGoals: 0, completedGoals: 0, goalCompletionRate: 0, activeGoals: 0,
                totalLearning: 0, completedLearning: 0, learningCompletionRate: 0,
                totalOrganizations: 0, totalPrograms: 0
            }
        };
    }

    let currentFilteredUsers = [...users];
    let currentFilteredAssessments = [...assessments];
    let currentFilteredGoals = [...goals];
    let currentFilteredLearning = [...assignedLearning];

    if (selectedOrg !== 'all') {
      currentFilteredUsers = currentFilteredUsers.filter(u => u.client_id === selectedOrg);
      const orgUserEmails = currentFilteredUsers.map(u => u.email);
      currentFilteredAssessments = currentFilteredAssessments.filter(a => orgUserEmails.includes(a.email));
      currentFilteredGoals = currentFilteredGoals.filter(g => orgUserEmails.includes(g.user_email));
      currentFilteredLearning = currentFilteredLearning.filter(l => orgUserEmails.includes(l.user_email));
    }

    if (selectedIndustry !== 'all') {
      const industryOrgs = organizations.filter(o => o.industry === selectedIndustry).map(o => o.id);
      currentFilteredUsers = currentFilteredUsers.filter(u => industryOrgs.includes(u.client_id));
      const orgUserEmails = currentFilteredUsers.map(u => u.email);
      currentFilteredAssessments = currentFilteredAssessments.filter(a => orgUserEmails.includes(a.email));
      currentFilteredGoals = currentFilteredGoals.filter(g => orgUserEmails.includes(g.user_email));
      currentFilteredLearning = currentFilteredLearning.filter(l => orgUserEmails.includes(l.user_email));
    }

    // Date Filtering
    if (timeRange === 'all') {
        // No date filtering needed
    } else if (timeRange === 'custom' && appliedCustomDateRange.from && appliedCustomDateRange.to) { // Use appliedCustomDateRange
        const customStart = startOfDay(appliedCustomDateRange.from);
        const customEnd = endOfDay(appliedCustomDateRange.to);

        const filterByCustomDateRange = (item) => {
            const created = new Date(item.created_date);
            return created >= customStart && created <= customEnd;
        };

        currentFilteredUsers = currentFilteredUsers.filter(filterByCustomDateRange);
        currentFilteredAssessments = currentFilteredAssessments.filter(filterByCustomDateRange);
        currentFilteredGoals = currentFilteredGoals.filter(filterByCustomDateRange);
        currentFilteredLearning = currentFilteredLearning.filter(filterByCustomDateRange);
    } else { // All other predefined ranges (7d, 30d, etc.)
        const cutoff = getDateCutoff(); // This is `subDays(now, X)`

        const filterByPredefinedDateRange = (item) => {
            const created = new Date(item.created_date);
            return isAfter(created, cutoff);
        };
        currentFilteredUsers = currentFilteredUsers.filter(filterByPredefinedDateRange);
        currentFilteredAssessments = currentFilteredAssessments.filter(filterByPredefinedDateRange);
        currentFilteredGoals = currentFilteredGoals.filter(filterByPredefinedDateRange);
        currentFilteredLearning = currentFilteredLearning.filter(filterByPredefinedDateRange);
    }

    // Calculate stats
    const totalUsersCount = currentFilteredUsers.length;
    const activeUsersCount = currentFilteredUsers.filter(u => {
      const lastActivity = new Date(u.updated_date || u.created_date);
      return isAfter(lastActivity, subDays(new Date(), 30));
    }).length;
    const activeUserRate = totalUsersCount > 0 ? Math.round((activeUsersCount / totalUsersCount) * 100) : 0;

    const totalAssessmentsCount = currentFilteredAssessments.length;
    const avgScore = totalAssessmentsCount > 0
      ? Math.round(currentFilteredAssessments.reduce((sum, a) => sum + (a.overall_pct || 0), 0) / totalAssessmentsCount)
      : 0;

    const totalGoalsCount = currentFilteredGoals.length;
    const completedGoalsCount = currentFilteredGoals.filter(g => g.status === 'completed').length;
    const activeGoalsCount = currentFilteredGoals.filter(g => g.status !== 'completed').length;
    const goalCompletionRate = totalGoalsCount > 0 ? Math.round((completedGoalsCount / totalGoalsCount) * 100) : 0;

    const totalLearningCount = currentFilteredLearning.length;
    const completedLearningCount = currentFilteredLearning.filter(l => l.status === 'completed').length;
    const learningCompletionRate = totalLearningCount > 0 ? Math.round((completedLearningCount / totalLearningCount) * 100) : 0;

    return {
      users: currentFilteredUsers,
      assessments: currentFilteredAssessments,
      goals: currentFilteredGoals,
      assignedLearning: currentFilteredLearning,
      stats: {
        totalUsers: totalUsersCount,
        activeUsers: activeUsersCount,
        activeUserRate: activeUserRate,
        totalAssessments: totalAssessmentsCount,
        avgScore: avgScore,
        totalGoals: totalGoalsCount,
        completedGoals: completedGoalsCount,
        goalCompletionRate: goalCompletionRate,
        activeGoals: activeGoalsCount,
        totalLearning: totalLearningCount,
        completedLearning: completedLearningCount,
        learningCompletionRate: learningCompletionRate,
        totalOrganizations: selectedOrg === 'all' ? organizations.length : 1,
        totalPrograms: programs.length
      }
    };
  }, [users, assessments, goals, assignedLearning, organizations, programs, timeRange, selectedOrg, selectedIndustry, error, customDateRange, appliedCustomDateRange]); // Add appliedCustomDateRange to dependencies

  // The previous 'metrics' useMemo is now integrated into 'filteredData.stats'
  // So, 'metrics' object directly used before should now reference 'filteredData.stats'

  const chartData = useMemo(() => {
    // If there's an error, return empty/default data for charts
    if (error) {
        return {
            assessmentDistribution: [],
            competencyAverages: [],
            activityTrend: []
        };
    }

    const assessmentScores = filteredData.assessments.reduce((acc, a) => {
      const score = a.overall_pct || 0;
      if (score < 50) acc.low++;
      else if (score < 70) acc.medium++;
      else if (score < 85) acc.good++;
      else acc.excellent++;
      return acc;
    }, { low: 0, medium: 0, good: 0, excellent: 0 });

    const competencyData = [
      { competency: 'SI', avg: Math.round(filteredData.assessments.reduce((sum, a) => sum + (a.si_pct || 0), 0) / (filteredData.assessments.length || 1)) },
      { competency: 'DM', avg: Math.round(filteredData.assessments.reduce((sum, a) => sum + (a.dm_pct || 0), 0) / (filteredData.assessments.length || 1)) },
      { competency: 'Comm', avg: Math.round(filteredData.assessments.reduce((sum, a) => sum + (a.comm_pct || 0), 0) / (filteredData.assessments.length || 1)) },
      { competency: 'RM', avg: Math.round(filteredData.assessments.reduce((sum, a) => sum + (a.rm_pct || 0), 0) / (filteredData.assessments.length || 1)) },
      { competency: 'SM', avg: Math.round(filteredData.assessments.reduce((sum, a) => sum + (a.sm_pct || 0), 0) / (filteredData.assessments.length || 1)) },
      { competency: 'PM', avg: Math.round(filteredData.assessments.reduce((sum, a) => sum + (a.pm_pct || 0), 0) / (filteredData.assessments.length || 1)) }
    ];

    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'MMM d');
      
      const dayUsers = filteredData.users.filter(u => {
        const created = startOfDay(new Date(u.created_date));
        return format(created, 'MMM d') === dateStr;
      }).length;

      const dayAssessments = filteredData.assessments.filter(a => {
        const created = startOfDay(new Date(a.created_date));
        return format(created, 'MMM d') === dateStr;
      }).length;

      last30Days.push({
        date: dateStr,
        users: dayUsers,
        assessments: dayAssessments
      });
    }

    return {
      assessmentDistribution: [
        { name: 'Needs Development (<50%)', value: assessmentScores.low, color: COLORS[0] },
        { name: 'Developing (50-69%)', value: assessmentScores.medium, color: COLORS[1] },
        { name: 'Proficient (70-84%)', value: assessmentScores.good, color: COLORS[2] },
        { name: 'Expert (85%+)', value: assessmentScores.excellent, color: COLORS[3] }
      ],
      competencyAverages: competencyData,
      activityTrend: last30Days
    };
  }, [filteredData, error]); // Add error to dependencies

  const industries = useMemo(() => {
    // This is no longer dynamically fetched, but used for type inference if needed elsewhere.
    // For the UI, the industries are hardcoded as per the outline.
    const uniqueIndustries = [...new Set(organizations.map(o => o.industry).filter(Boolean))];
    return uniqueIndustries.sort();
  }, [organizations]);

  const handleExportCSV = () => {
    setExportingCSV(true);
    try {
      const csvData = [
        ['Metric', 'Value'],
        ['Total Users', filteredData.stats.totalUsers],
        ['Active Users', filteredData.stats.activeUsers],
        ['Active User Rate', `${filteredData.stats.activeUserRate}%`],
        ['Total Organizations', filteredData.stats.totalOrganizations],
        ['Total Assessments', filteredData.stats.totalAssessments],
        ['Average Score', `${filteredData.stats.avgScore}%`],
        ['Total Goals', filteredData.stats.totalGoals],
        ['Completed Goals', filteredData.stats.completedGoals],
        ['Goal Completion Rate', `${filteredData.stats.goalCompletionRate}%`],
        ['Total Learning', filteredData.stats.totalLearning],
        ['Completed Learning', filteredData.stats.completedLearning],
        ['Learning Completion Rate', `${filteredData.stats.learningCompletionRate}%`]
      ];

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `platform-analytics-${new Date().toISOString().split('T')[0]}.csv`;
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
      const { data } = await base44.functions.invoke('exportPlatformAnalyticsPDF', {
        stats: filteredData.stats,
        timeRange,
        selectedOrg,
        selectedIndustry
      });
      
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `platform-analytics-${new Date().toISOString().split('T')[0]}.pdf`;
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading platform analytics...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a moment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Analytics</h3>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button 
                onClick={handleRetry} 
                className="bg-purple-600 hover:bg-purple-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry {retryCount > 0 && `(${retryCount})`}
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
              >
                Reload Page
              </Button>
            </div>
            {retryCount > 2 && (
              <p className="text-xs text-gray-500 mt-4">
                If this persists, please contact support or check your internet connection.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>

            <Select value={timeRange} onValueChange={handleTimeRangeChange}>
              <SelectTrigger className="w-40">
                {timeRange === 'custom' && appliedCustomDateRange.from && appliedCustomDateRange.to ? (
                  <span className="text-sm">
                    {format(appliedCustomDateRange.from, 'MMM d')} - {format(appliedCustomDateRange.to, 'MMM d')}
                  </span>
                ) : (
                  <SelectValue />
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

            <Select value={selectedOrg} onValueChange={setSelectedOrg}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizations</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                {/* Hardcoded common industries */}
                <SelectItem value="healthcare">Healthcare</SelectItem>
                <SelectItem value="technology">Technology</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="manufacturing">Manufacturing</SelectItem>
                <SelectItem value="retail">Retail</SelectItem>
                {/* Dynamically generated industries from data */}
                {industries.length > 0 && <hr className="my-1" />}
                {industries.map(industry => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Platform Management Section - ENHANCED */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-2 border-purple-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
            <CardTitle className="text-xl flex items-center gap-2">
              <Zap className="w-6 h-6 text-purple-600" />
              Platform Management
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link to={createPageUrl("BusinessManager")}>
                <Button 
                  variant="outline" 
                  className="w-full justify-between h-auto py-4 hover:bg-purple-50 hover:border-purple-300"
                >
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 mt-0.5 text-purple-600" />
                    <div className="text-left">
                      <div className="font-semibold">Business Manager</div>
                      <div className="text-xs text-gray-500 mt-1">Manage clients & partners</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>

              <Link to={createPageUrl("UserManagement")}>
                <Button 
                  variant="outline" 
                  className="w-full justify-between h-auto py-4 hover:bg-purple-50 hover:border-purple-300"
                >
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 mt-0.5 text-blue-600" />
                    <div className="text-left">
                      <div className="font-semibold">User Management</div>
                      <div className="text-xs text-gray-500 mt-1">All platform users</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>

              <Link to={createPageUrl("CommandCenter")}>
                <Button 
                  variant="outline" 
                  className="w-full justify-between h-auto py-4 hover:bg-purple-50 hover:border-purple-300"
                >
                  <div className="flex items-start gap-3">
                    <Target className="w-5 h-5 mt-0.5 text-orange-600" />
                    <div className="text-left">
                      <div className="font-semibold">Programs & Cohorts</div>
                      <div className="text-xs text-gray-500 mt-1">All platform programs</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>

              {/* Removed Journey Analytics button */}

              <Link to={createPageUrl("WhiteLabel")}>
                <Button 
                  variant="outline" 
                  className="w-full justify-between h-auto py-4 hover:bg-purple-50 hover:border-purple-300"
                >
                  <div className="flex items-start gap-3">
                    <Palette className="w-5 h-5 mt-0.5 text-pink-600" />
                    <div className="text-left">
                      <div className="font-semibold">White Label Settings</div>
                      <div className="text-xs text-gray-500 mt-1">Platform branding</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>

              <Link to={createPageUrl("Billing")}>
                <Button 
                  variant="outline" 
                  className="w-full justify-between h-auto py-4 hover:bg-purple-50 hover:border-purple-300"
                >
                  <div className="flex items-start gap-3">
                    <CreditCard className="w-5 h-5 mt-0.5 text-emerald-600" />
                    <div className="text-left">
                      <div className="font-semibold">Payment Portal</div>
                      <div className="text-xs text-gray-500 mt-1">Manage all subscriptions</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>

              <Link to={createPageUrl("StripeDiagnostic")}>
                <Button 
                  variant="outline" 
                  className="w-full justify-between h-auto py-4 hover:bg-purple-50 hover:border-purple-300"
                >
                  <div className="flex items-start gap-3">
                    <Activity className="w-5 h-5 mt-0.5 text-red-600" />
                    <div className="text-left">
                      <div className="font-semibold">Stripe Diagnostics</div>
                      <div className="text-xs text-gray-500 mt-1">Payment system health</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>

              <Link to={createPageUrl("UATAdminDashboard")}>
                <Button 
                  variant="outline" 
                  className="w-full justify-between h-auto py-4 hover:bg-purple-50 hover:border-purple-300"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 mt-0.5 text-indigo-600" />
                    <div className="text-left">
                      <div className="font-semibold">UAT Admin Dashboard</div>
                      <div className="text-xs text-gray-500 mt-1">Manage test cases</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Global Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Users className="w-8 h-8 text-blue-600" />
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{filteredData.stats.totalUsers.toLocaleString()}</div>
              <div className="text-sm text-gray-600 mt-1">Total Users</div>
              <div className="text-xs text-green-600 mt-2">Platform-wide</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Building2 className="w-8 h-8 text-purple-600" />
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{organizations.length}</div>
              <div className="text-sm text-gray-600 mt-1">Organizations</div>
              <div className="text-xs text-purple-600 mt-2">Active clients</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <BarChart3 className="w-8 h-8 text-green-600" />
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{filteredData.stats.totalAssessments.toLocaleString()}</div>
              <div className="text-sm text-gray-600 mt-1">Assessments</div>
              <div className="text-xs text-green-600 mt-2">Completed</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Target className="w-8 h-8 text-orange-600" />
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{filteredData.stats.activeGoals.toLocaleString()}</div>
              <div className="text-sm text-gray-600 mt-1">Active Goals</div>
              <div className="text-xs text-orange-600 mt-2">In progress</div>
            </CardContent>
          </Card>
        </motion.div>

      </div>

      {/* Leadership Index Results */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assessment Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.assessmentDistribution.length > 0 && chartData.assessmentDistribution.some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.assessmentDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.assessmentDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500">No assessment data available.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Average Competency Scores</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.competencyAverages.length > 0 && chartData.competencyAverages.some(d => d.avg > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.competencyAverages}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="competency" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="avg" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500">No competency data available.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Engagement Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Platform Activity Trend (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.activityTrend.length > 0 && chartData.activityTrend.some(d => d.users > 0 || d.assessments > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData.activityTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="users" stroke="#3b82f6" name="New Users" />
                  <Line type="monotone" dataKey="assessments" stroke="#8b5cf6" name="Assessments" />
                </LineChart>
              </ResponsiveContainer>
          ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">No activity trend data available for the selected period.</div>
          )}
        </CardContent>
      </Card>

      {/* Organization Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Organization Overview</CardTitle>
            <Badge>{filteredData.stats.totalOrganizations} Organizations</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {organizations.length > 0 ? (
                organizations.slice(0, 5).map(org => {
                  const orgUsers = users.filter(u => u.client_id === org.id);
                  const orgAssessments = assessments.filter(a => orgUsers.some(u => u.email === a.email));
                  const avgOrgScore = orgAssessments.length > 0
                    ? Math.round(orgAssessments.reduce((sum, a) => sum + (a.overall_pct || 0), 0) / orgAssessments.length)
                    : 0;

                  return (
                    <div key={org.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-900">{org.name}</p>
                          <p className="text-sm text-gray-600">{org.industry} • {orgUsers.length} users</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={
                          avgOrgScore >= 80 ? 'bg-green-100 text-green-800' :
                          avgOrgScore >= 60 ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {avgOrgScore}% avg
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">{orgAssessments.length} assessments</p>
                      </div>
                    </div>
                  );
                })
            ) : (
                <div className="p-4 text-gray-500 text-center">No organizations found.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card className="border-2 border-green-200 bg-green-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <div>
              <p className="font-semibold text-green-900">System Status: Operational</p>
              <p className="text-sm text-green-700">All systems running normally • Last checked: {new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Platform Activity */}
      {activityLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Platform Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activityLogs.map((log, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{log.initiator_user_email}</span> {log.action_type.toLowerCase().replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(log.timestamp), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Date Range Dialog */}
      <Dialog open={showCustomDateDialog} onOpenChange={(open) => {
        if (!open) handleCancelCustomRange();
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
    </div>
  );
}