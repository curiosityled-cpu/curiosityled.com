import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/useAuth";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/common/PageHeader";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import MyAssessmentsView from "@/components/dashboard/assessments/MyAssessmentsView";
import TeamAssessmentsView from "@/components/dashboard/assessments/TeamAssessmentsView";
import OrgAssessmentsView from "@/components/dashboard/assessments/OrgAssessmentsView";
import {
  Users,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
  Brain,
  BarChart3,
  AlertTriangle,
  Loader2,
  User,
  RefreshCw,
  Award
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
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from "recharts";
import { motion } from "framer-motion";
import { format, subDays } from "date-fns";
import { toast } from "sonner";

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

function AssessmentAnalyticsDashboard() {
  const { 
    user, 
    appRole,
    roleDisplayName,
    isManagerOfManagers,
    isOrgLeader,
    isProgramManager,
    isHRAdmin,
    isSuperAdmin,
    isPartnerBusinessAdmin,
    isPlatformAdmin
  } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  
  // View toggle state - default based on role
  const getDefaultView = () => {
    if (isOrgLeader || isProgramManager) return 'analytics'; // Analysts and Program Admins default to analytics
    return 'my'; // Others default to my assessments
  };
  const [activeView, setActiveView] = useState(getDefaultView());

  // Determine scope based on role
  const getAnalyticsScope = () => {
    if (isPlatformAdmin) return 'platform';
    if (isPartnerBusinessAdmin) return 'partner';
    if (isSuperAdmin || isHRAdmin || isOrgLeader) return 'org';
    if (isManagerOfManagers) return 'team';
    if (isProgramManager) return 'program';
    return 'personal';
  };

  const scope = getAnalyticsScope();
  const isPersonalScope = scope === 'personal';
  
  // Determine which view tabs to show based on role
  // Analysts and Program Administrators don't have personal/team access by default - they're analytics-focused
  const canViewPersonal = !isOrgLeader && !isProgramManager; // Analysts and Program Admins don't see personal view
  const canViewTeam = isManagerOfManagers || isHRAdmin || isSuperAdmin || isPartnerBusinessAdmin || isPlatformAdmin; // Program Admins don't see team view
  const canViewAnalytics = isOrgLeader || isProgramManager || isHRAdmin || isSuperAdmin || isPartnerBusinessAdmin || isPlatformAdmin;

  const [filters, setFilters] = useState({
    timeframe: '6months',
    department: 'all',
    scoreRange: 'all'
  });

  // Analytics data - separate for each view
  const [myAnalytics, setMyAnalytics] = useState(null);
  const [teamAnalytics, setTeamAnalytics] = useState(null);
  const [orgAnalytics, setOrgAnalytics] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [myAssessments, setMyAssessments] = useState([]);
  const [teamAssessments, setTeamAssessments] = useState([]);
  const [users, setUsers] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user]);

  // Set default view based on available tabs when role changes
  useEffect(() => {
    const tabs = [];
    if (canViewPersonal) tabs.push('my');
    if (canViewTeam) tabs.push('team');
    if (canViewAnalytics) tabs.push('analytics');
    
    if (tabs.length > 0 && !tabs.includes(activeView)) {
      setActiveView(tabs[0]);
    }
  }, [appRole, canViewPersonal, canViewTeam, canViewAnalytics]);

  const calculateAnalytics = (assessmentsList) => {
    const completed = assessmentsList.filter(a => a.overall_pct != null);
    const avgScore = completed.length > 0 
      ? Math.round(completed.reduce((sum, a) => sum + a.overall_pct, 0) / completed.length)
      : 0;
    
    return {
      totalAssessments: assessmentsList.length,
      completedCount: completed.length,
      completionRate: assessmentsList.length > 0 
        ? Math.round((completed.length / assessmentsList.length) * 100) 
        : 0,
      avgScore,
      atRiskCount: completed.filter(a => a.overall_pct < 55).length,
      highPerformers: completed.filter(a => a.overall_pct >= 85).length
    };
  };

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [assessmentsData, usersData] = await Promise.all([
        base44.entities.Assessment.list('-created_date'),
        base44.entities.User.list()
      ]);
      
      setAssessments(assessmentsData || []);
      setUsers(usersData || []);
      
      // Filter for personal assessments
      const personalAssessments = assessmentsData.filter(a => a.email === user.email);
      setMyAssessments(personalAssessments);
      setMyAnalytics(calculateAnalytics(personalAssessments));
      
      // Filter for team assessments (direct reports)
      const subordinateEmails = user.subordinate_emails || [];
      const teamAssessmentsData = assessmentsData.filter(a => subordinateEmails.includes(a.email));
      setTeamAssessments(teamAssessmentsData);
      setTeamAnalytics(calculateAnalytics(teamAssessmentsData));
      setTeamMembers(usersData.filter(u => subordinateEmails.includes(u.email)));
      
      // Org-level analytics (all assessments user can see)
      setOrgAnalytics(calculateAnalytics(assessmentsData));
      
    } catch (err) {
      console.error('Error loading assessment analytics:', err);
      setError(err.message || 'Failed to load assessment analytics');
      toast.error('Failed to load assessment analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadAnalytics();
  };

  // Get analytics based on current view
  const getActiveAnalytics = () => {
    switch (activeView) {
      case 'my': return myAnalytics;
      case 'team': return teamAnalytics;
      case 'analytics': return orgAnalytics;
      default: return orgAnalytics;
    }
  };

  // Get assessments based on current view
  const getActiveAssessments = () => {
    switch (activeView) {
      case 'my': return myAssessments;
      case 'team': return teamAssessments;
      case 'analytics': return assessments;
      default: return assessments;
    }
  };

  // Get view label for exports
  const getViewLabel = () => {
    switch (activeView) {
      case 'my': return 'My Assessments';
      case 'team': return 'Team Assessments';
      case 'analytics': return 'Organization Analytics';
      default: return 'Analytics';
    }
  };

  const handleExportCSV = () => {
    setExportingCSV(true);
    try {
      const analytics = getActiveAnalytics();
      const activeAssessments = getActiveAssessments();
      
      const csvData = [
        [`Assessment Report - ${getViewLabel()}`],
        ['Generated:', new Date().toLocaleString()],
        [''],
        ['Key Metrics'],
        ['Total Assessments', analytics?.totalAssessments || 0],
        ['Completion Rate', `${analytics?.completionRate || 0}%`],
        ['Average Score', `${analytics?.avgScore || 0}%`],
        ['High Performers', analytics?.highPerformers || 0],
        ['At Risk', analytics?.atRiskCount || 0],
        [''],
        ['Assessment Details'],
        ['Email', 'Overall Score', 'SI Score', 'DM Score', 'Comm Score', 'RM Score', 'SM Score', 'PM Score', 'Date']
      ];

      // Add individual assessment rows
      activeAssessments.forEach(a => {
        csvData.push([
          a.email || '',
          a.overall_pct || 0,
          a.si_pct || 0,
          a.dm_pct || 0,
          a.comm_pct || 0,
          a.rm_pct || 0,
          a.sm_pct || 0,
          a.pm_pct || 0,
          a.submission_ts ? format(new Date(a.submission_ts), 'yyyy-MM-dd') : ''
        ]);
      });

      const csvContent = csvData.map(row => 
        Array.isArray(row) ? row.join(',') : row
      ).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeView}-assessments-${new Date().toISOString().split('T')[0]}.csv`;
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
      const analytics = getActiveAnalytics();
      
      const response = await base44.functions.invoke('exportAssessmentAnalyticsPDF', {
        analytics: {
          summary: {
            totalAssessments: analytics?.totalAssessments || 0,
            completionRate: analytics?.completionRate || 0,
            averageScore: analytics?.avgScore || 0,
            highPerformers: analytics?.highPerformers || 0,
            atRisk: analytics?.atRiskCount || 0
          },
          viewType: activeView,
          viewLabel: getViewLabel()
        },
        filters: filters
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeView}-assessments-${new Date().toISOString().split('T')[0]}.pdf`;
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

  const getScopeLabel = () => {
    switch(scope) {
      case 'platform': return 'Platform-Wide';
      case 'partner': return 'Partner Clients';
      case 'org': return 'Organization';
      case 'team': return 'Team';
      case 'program': return 'Programs & Team';
      default: return 'Personal';
    }
  };

  // Build available view tabs based on permissions
  const viewTabs = [];
  if (canViewPersonal) {
    viewTabs.push({ id: 'my', label: 'My Assessments', icon: User });
  }
  if (canViewTeam) {
    viewTabs.push({ id: 'team', label: 'Team Assessments', icon: Users });
  }
  if (canViewAnalytics) {
    viewTabs.push({ id: 'analytics', label: 'Assessment Analytics', icon: BarChart3 });
  }

  // Render the view toggle tabs component
  const renderViewToggle = () => {
    if (viewTabs.length <= 1) return null;
    return (
      <div className="inline-flex bg-white border border-gray-200 rounded-lg shadow-sm mb-6 p-1">
        {viewTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors rounded-md ${
                isActive 
                  ? 'text-gray-900 bg-gray-100' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-gray-700' : 'text-gray-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#0202ff' }} />
          <p className="text-gray-600">Loading assessment analytics...</p>
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
            <Button onClick={handleRefresh} className="bg-purple-600 hover:bg-purple-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // My Assessments View
  if (activeView === 'my') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PageHeader
            title="My Assessments"
            subtitle="Your personal assessment performance and insights"
            badges={[
              { text: roleDisplayName || appRole, className: "bg-white text-purple-600" },
              { text: `${myAnalytics?.totalAssessments || 0} Assessments`, className: "bg-white text-blue-600" },
              { text: `${myAnalytics?.avgScore || 0}% Avg Score`, className: "bg-white text-green-600" }
            ]}
            onRefresh={handleRefresh}
            onExportCSV={handleExportCSV}
            onExportPDF={handleExportPDF}
            loadingRefresh={loading}
            loadingExportCSV={exportingCSV}
            loadingExportPDF={exportingPDF}
          />
          {renderViewToggle()}
          <MyAssessmentsView />
        </div>
      </div>
    );
  }

  // Team Assessments View
  if (activeView === 'team') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PageHeader
            title="Team Assessments"
            subtitle="Track your team's assessment progress and results"
            badges={[
              { text: roleDisplayName || appRole, className: "bg-white text-purple-600" },
              { text: `${teamAnalytics?.totalAssessments || 0} Assessments`, className: "bg-white text-blue-600" },
              { text: `${teamAnalytics?.avgScore || 0}% Avg Score`, className: "bg-white text-green-600" }
            ]}
            onRefresh={handleRefresh}
            onExportCSV={handleExportCSV}
            onExportPDF={handleExportPDF}
            loadingRefresh={loading}
            loadingExportCSV={exportingCSV}
            loadingExportPDF={exportingPDF}
          />
          {renderViewToggle()}
          <TeamAssessmentsView />
        </div>
      </div>
    );
  }

  // Full Analytics View (for admins)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Assessment Analytics"
          subtitle="Assessment performance and engagement metrics"
          badges={[
            { text: roleDisplayName || appRole, className: "bg-white text-purple-600" },
            { text: `${orgAnalytics?.totalAssessments || 0} Assessments`, className: "bg-white text-blue-600" },
            { text: `${orgAnalytics?.avgScore || 0}% Avg Score`, className: "bg-white text-green-600" }
          ]}
          onRefresh={handleRefresh}
          onExportCSV={handleExportCSV}
          onExportPDF={handleExportPDF}
          loadingRefresh={loading}
          loadingExportCSV={exportingCSV}
          loadingExportPDF={exportingPDF}
        />

        {renderViewToggle()}

        <OrgAssessmentsView />
      </div>
    </div>
  );
}

export default withAuthProtection(AssessmentAnalyticsDashboard, [
  'User Level 1',
  'User Level 2', 
  'Analyst', 
  'Admin Level 1', 
  'Admin Level 2', 
  'Super Administrator', 
  'Partner Business Administrator', 
  'Platform Admin'
]);