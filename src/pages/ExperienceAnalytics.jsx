import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/components/useAuth";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/common/PageHeader";
import SubNavMenu from "@/components/common/SubNavMenu";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import AssignOnboardingPlanModal from "@/components/assignment/AssignOnboardingPlanModal";
import AssignJourneyModal from "@/components/assignment/AssignJourneyModal";
import MyJourneysView from "@/components/dashboard/journeys/MyJourneysView";
import TeamJourneysView from "@/components/dashboard/journeys/TeamJourneysView";
import JourneyManagementDashboard from "@/components/program-manager/JourneyManagementDashboard";
import ExperienceAnalyticsView from "@/components/dashboard/journeys/JourneyAnalyticsView";
import RequestDashboard from "./RequestDashboard";
import {
  Users,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
  Award,
  BookOpen,
  Map,
  UserPlus,
  Target,
  AlertTriangle,
  Loader2,
  Calendar as CalendarIcon,
  XCircle,
  Activity,
  Zap,
  FileText,
  RefreshCw,
  ArrowRight,
  User,
  BarChart3,
  Route,
  GraduationCap,
  MessageSquare,
  ClipboardList
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
  ResponsiveContainer
} from "recharts";
import { motion } from "framer-motion";
import { format, subDays, isAfter, isBefore, startOfDay, addMonths, addDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

function ExperienceAnalytics() {
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
  
  const navigate = useNavigate();
  
  // ALL useState hooks must come first
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [showAssignOnboardingModal, setShowAssignOnboardingModal] = useState(false);
  const [showAssignJourneyModal, setShowAssignJourneyModal] = useState(false);
  const [activeView, setActiveView] = useState('my');
  const [filters, setFilters] = useState({
    timeframe: '6months',
    division: 'all',
    level: 'all',
    experienceType: 'all',
    userSegment: 'all',
    client: 'all'
  });

  // Custom date range states
  const [showCustomDateDialog, setShowCustomDateDialog] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({ from: null, to: null });
  const [appliedCustomDateRange, setAppliedCustomDateRange] = useState({ from: null, to: null });

  // Analytics data from backend
  const [analytics, setAnalytics] = useState(null);
  
  // Separate metrics for each view
  const [myMetrics, setMyMetrics] = useState({
    totalExperiences: 0,
    totalEnrollments: 0,
    activeLearners: 0,
    completionRate: 0,
    avgTimeToCompletion: 0
  });
  const [teamMetrics, setTeamMetrics] = useState({
    totalExperiences: 0,
    totalEnrollments: 0,
    activeLearners: 0,
    completionRate: 0,
    avgTimeToCompletion: 0
  });
  const [orgMetrics, setOrgMetrics] = useState({
    totalExperiences: 0,
    totalEnrollments: 0,
    activeLearners: 0,
    completionRate: 0,
    avgTimeToCompletion: 0,
    atRiskLearners: 0
  });
  const [rawData, setRawData] = useState({
    learningJourneys: [],
    enrollments: [],
    myEnrollments: [],
    teamEnrollments: [],
    onboardingPlans: [],
    myOnboardingPlans: [],
    teamOnboardingPlans: [],
    careerPaths: [],
    allUsers: [],
    teamMembers: []
  });
  const [enrollmentTrends, setEnrollmentTrends] = useState([]);
  const [completionByType, setCompletionByType] = useState([]);
  const [topExperiences, setTopExperiences] = useState([]);
  const [availableExperienceTypes, setAvailableExperienceTypes] = useState([]);
  const [availableClients, setAvailableClients] = useState([]);

  // Calculate permissions with useMemo to ensure proper initialization
  const canViewPersonal = useMemo(() => !isOrgLeader && !isProgramManager, [isOrgLeader, isProgramManager]);
  const canViewTeam = useMemo(() => isManagerOfManagers || isHRAdmin || isSuperAdmin || isPartnerBusinessAdmin || isPlatformAdmin, [isManagerOfManagers, isHRAdmin, isSuperAdmin, isPartnerBusinessAdmin, isPlatformAdmin]);
  const canViewExperienceManagement = useMemo(() => isProgramManager || isPlatformAdmin || isSuperAdmin || isHRAdmin || isPartnerBusinessAdmin, [isProgramManager, isPlatformAdmin, isSuperAdmin, isHRAdmin, isPartnerBusinessAdmin]);
  const canViewAnalytics = useMemo(() => isOrgLeader || isProgramManager || isHRAdmin || isSuperAdmin || isPartnerBusinessAdmin || isPlatformAdmin, [isOrgLeader, isProgramManager, isHRAdmin, isSuperAdmin, isPartnerBusinessAdmin, isPlatformAdmin]);

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
    if (isHRAdmin || isSuperAdmin) tabs.push('requests');
    if (canViewExperienceManagement) tabs.push('experience-management');
    if (canViewAnalytics) tabs.push('analytics');
    
    if (tabs.length > 0 && !tabs.includes(activeView)) {
      setActiveView(tabs[0]);
    } else if (tabs.length > 0 && activeView === 'my') {
      // Set initial view based on role
      if (canViewAnalytics) {
        setActiveView('analytics');
      } else if (canViewTeam) {
        setActiveView('team');
      }
    }
  }, [canViewPersonal, canViewTeam, canViewExperienceManagement, canViewAnalytics, isHRAdmin, isSuperAdmin, activeView]);

  // Re-calculate metrics when filters change
  useEffect(() => {
    if (!loading && rawData.enrollments.length > 0) {
      calculateScopedMetrics(rawData.myEnrollments || [], rawData.myOnboardingPlans || [], 'my');
      calculateScopedMetrics(rawData.teamEnrollments || [], rawData.teamOnboardingPlans || [], 'team');
      calculateScopedMetrics(rawData.enrollments || [], rawData.onboardingPlans || [], 'org', rawData.learningJourneys);
    }
  }, [filters, appliedCustomDateRange, loading]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    
    const scope = isPlatformAdmin ? 'platform' 
      : isPartnerBusinessAdmin ? 'partner'
      : (isSuperAdmin || isHRAdmin || isOrgLeader) ? 'org'
      : isManagerOfManagers ? 'team'
      : isProgramManager ? 'program'
      : 'personal';
    const isPersonalScope = scope === 'personal';
    
    try {
      if (isPersonalScope) {
        await loadLocalData();
      } else {
        const response = await base44.functions.invoke('getPlatformJourneyAnalytics', {
          scope: scope,
          filters: {
            timeframe: filters.timeframe,
            client: filters.client
          }
        });
        
        if (response?.data?.success) {
          setAnalytics(response.data.analytics);
          
          if (isPartnerBusinessAdmin && response.data.analytics?.availableClients) {
            setAvailableClients(response.data.analytics.availableClients);
          }
          
          setRetryCount(0);
        } else {
          throw new Error(response?.data?.error || 'Failed to load analytics');
        }
      }
    } catch (err) {
      console.error('Error loading experience analytics:', err);
      setError(err.message || 'Failed to load experience analytics');
      toast.error('Failed to load experience analytics');
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const loadLocalData = async () => {
    try {
      const [learningJourneys, allEnrollments, allOnboardingPlans, careerPaths, allUsers] = await Promise.all([
        base44.entities.LearningJourney.list(),
        base44.entities.JourneyEnrollment.list(),
        base44.entities.OnboardingPlan.list(),
        base44.entities.CareerPath.list(),
        base44.entities.User.list()
      ]);

      const myEnrollments = allEnrollments.filter(e => e.user_email === user.email);
      const myOnboardingPlans = allOnboardingPlans.filter(p => p.assigned_to_email === user.email);

      const subordinateEmails = user.subordinate_emails || [];
      const teamEnrollments = allEnrollments.filter(e => subordinateEmails.includes(e.user_email));
      const teamOnboardingPlans = allOnboardingPlans.filter(p => subordinateEmails.includes(p.assigned_to_email));
      const teamMembers = allUsers.filter(u => subordinateEmails.includes(u.email));

      setRawData({ 
        learningJourneys, 
        enrollments: allEnrollments, 
        myEnrollments,
        teamEnrollments,
        onboardingPlans: allOnboardingPlans, 
        myOnboardingPlans,
        teamOnboardingPlans,
        careerPaths, 
        allUsers,
        teamMembers
      });

      calculateScopedMetrics(myEnrollments, myOnboardingPlans, 'my');
      calculateScopedMetrics(teamEnrollments, teamOnboardingPlans, 'team');
      calculateScopedMetrics(allEnrollments, allOnboardingPlans, 'org', learningJourneys);

      const experienceTypes = new Set();
      learningJourneys.forEach(j => { if (j.type) experienceTypes.add(j.type); });
      if (learningJourneys.length > 0) experienceTypes.add('custom');
      if (allOnboardingPlans.length > 0) experienceTypes.add('onboarding');
      if (careerPaths.length > 0) experienceTypes.add('career_path');
      setAvailableExperienceTypes(Array.from(experienceTypes));

    } catch (error) {
      console.error('Error loading local data:', error);
      throw error;
    }
  };

  const calculateScopedMetrics = (enrollments, onboardingPlans, scopeType, experiences = []) => {
    const completed = enrollments.filter(e => e.status === 'completed').length +
                      onboardingPlans.filter(p => p.status === 'completed').length;
    const inProgress = enrollments.filter(e => e.status === 'in_progress').length +
                       onboardingPlans.filter(p => p.status === 'in_progress').length;
    const total = enrollments.length + onboardingPlans.filter(p => p.status !== 'draft').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const metrics = {
      totalExperiences: experiences.length || rawData.learningJourneys?.length || 0,
      totalEnrollments: total,
      activeLearners: inProgress,
      completionRate,
      avgTimeToCompletion: 45
    };

    if (scopeType === 'org') {
      const atRisk = enrollments.filter(e => {
        if (!e.enrolled_date) return false;
        const daysSinceEnrollment = Math.floor((new Date() - new Date(e.enrolled_date)) / (1000 * 60 * 60 * 24));
        return daysSinceEnrollment > 14 && (e.progress || 0) < 25;
      }).length;
      metrics.atRiskLearners = atRisk;
      setOrgMetrics(metrics);
    } else if (scopeType === 'team') {
      setTeamMetrics(metrics);
    } else {
      setMyMetrics(metrics);
    }
  };

  const handleRefresh = () => {
    loadAnalytics();
  };

  const handleTimeRangeChange = (value) => {
    const scope = isPlatformAdmin ? 'platform' 
      : isPartnerBusinessAdmin ? 'partner'
      : (isSuperAdmin || isHRAdmin || isOrgLeader) ? 'org'
      : isManagerOfManagers ? 'team'
      : isProgramManager ? 'program'
      : 'personal';
    const isPersonalScope = scope === 'personal';
    
    if (value === 'custom') {
      setCustomDateRange(appliedCustomDateRange.from ? { ...appliedCustomDateRange } : { from: null, to: null });
      setShowCustomDateDialog(true);
    } else {
      setFilters({ ...filters, timeframe: value });
      setCustomDateRange({ from: null, to: null });
      setAppliedCustomDateRange({ from: null, to: null });
      if (!isPersonalScope) {
        loadAnalytics();
      }
    }
  };

  const handleCustomDateApply = () => {
    const scope = isPlatformAdmin ? 'platform' 
      : isPartnerBusinessAdmin ? 'partner'
      : (isSuperAdmin || isHRAdmin || isOrgLeader) ? 'org'
      : isManagerOfManagers ? 'team'
      : isProgramManager ? 'program'
      : 'personal';
    const isPersonalScope = scope === 'personal';
    
    if (customDateRange.from && customDateRange.to) {
      setAppliedCustomDateRange(customDateRange);
      setFilters({ ...filters, timeframe: 'custom' });
      setShowCustomDateDialog(false);
      if (!isPersonalScope) {
        loadAnalytics();
      }
    }
  };

  const handleCustomDateCancel = () => {
    setShowCustomDateDialog(false);
    if (!appliedCustomDateRange.from && filters.timeframe === 'custom') {
      setFilters({ ...filters, timeframe: '6months' });
    }
    setCustomDateRange(appliedCustomDateRange);
  };

  const setQuickRange = (days) => {
    const to = new Date();
    const from = subDays(to, days);
    setCustomDateRange({ from, to });
  };

  const getActiveMetrics = () => {
    switch (activeView) {
      case 'my': return myMetrics;
      case 'team': return teamMetrics;
      case 'analytics': return orgMetrics;
      default: return orgMetrics;
    }
  };

  const getViewLabel = () => {
    switch (activeView) {
      case 'my': return 'My Experiences';
      case 'team': return 'Team Experiences';
      case 'analytics': return 'Experience Analytics';
      default: return 'Analytics';
    }
  };

  const getActiveEnrollments = () => {
    switch (activeView) {
      case 'my': return rawData.myEnrollments || [];
      case 'team': return rawData.teamEnrollments || [];
      case 'analytics': return rawData.enrollments || [];
      default: return rawData.enrollments || [];
    }
  };

  const handleExportCSV = () => {
    setExportingCSV(true);
    try {
      const activeMetrics = getActiveMetrics();
      const activeEnrollments = getActiveEnrollments();
      
      const csvData = [
        [`Experience Report - ${getViewLabel()}`],
        ['Generated:', new Date().toLocaleString()],
        [''],
        ['Key Metrics'],
        ['Total Enrollments', activeMetrics.totalEnrollments || 0],
        ['Active Learners', activeMetrics.activeLearners || 0],
        ['Completion Rate', `${activeMetrics.completionRate || 0}%`],
        [''],
        ['Enrollment Details'],
        ['User Email', 'Experience ID', 'Status', 'Progress', 'Enrolled Date']
      ];

      activeEnrollments.forEach(e => {
        csvData.push([
          e.user_email || '',
          e.journey_id || '',
          e.status || '',
          `${e.progress || 0}%`,
          e.enrolled_date ? format(new Date(e.enrolled_date), 'yyyy-MM-dd') : ''
        ]);
      });

      const csvContent = csvData.map(row => 
        Array.isArray(row) ? row.join(',') : row
      ).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeView}-experiences-${new Date().toISOString().split('T')[0]}.csv`;
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
      const scope = isPlatformAdmin ? 'platform' 
        : isPartnerBusinessAdmin ? 'partner'
        : (isSuperAdmin || isHRAdmin || isOrgLeader) ? 'org'
        : isManagerOfManagers ? 'team'
        : isProgramManager ? 'program'
        : 'personal';
      const activeMetrics = getActiveMetrics();
      
      const response = await base44.functions.invoke('exportJourneyAnalyticsPDF', {
        scope: scope,
        filters: filters,
        viewType: activeView,
        viewLabel: getViewLabel(),
        metrics: {
          totalExperiences: activeMetrics.totalExperiences || 0,
          totalEnrollments: activeMetrics.totalEnrollments || 0,
          completionRate: activeMetrics.completionRate || 0,
          activeLearners: activeMetrics.activeLearners || 0
        }
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeView}-experiences-${new Date().toISOString().split('T')[0]}.pdf`;
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
    const scope = isPlatformAdmin ? 'platform' 
      : isPartnerBusinessAdmin ? 'partner'
      : (isSuperAdmin || isHRAdmin || isOrgLeader) ? 'org'
      : isManagerOfManagers ? 'team'
      : isProgramManager ? 'program'
      : 'personal';
    switch(scope) {
      case 'platform': return 'Platform-Wide';
      case 'partner': return 'Partner Clients';
      case 'org': return 'Organization';
      case 'team': return 'Team';
      case 'program': return 'Programs & Team';
      default: return 'Personal';
    }
  };

  const getPageTitle = () => {
    const scope = isPlatformAdmin ? 'platform' 
      : isPartnerBusinessAdmin ? 'partner'
      : (isSuperAdmin || isHRAdmin || isOrgLeader) ? 'org'
      : isManagerOfManagers ? 'team'
      : isProgramManager ? 'program'
      : 'personal';
    switch(scope) {
      case 'platform': return 'Experience Analytics';
      case 'partner': return 'Experience Analytics';
      case 'org': return 'Experience Analytics';
      case 'team': return 'Experience Analytics';
      case 'program': return 'Experience Analytics';
      default: return 'My Experience Progress';
    }
  };

  const getPageSubtitle = () => {
    const scope = isPlatformAdmin ? 'platform' 
      : isPartnerBusinessAdmin ? 'partner'
      : (isSuperAdmin || isHRAdmin || isOrgLeader) ? 'org'
      : isManagerOfManagers ? 'team'
      : isProgramManager ? 'program'
      : 'personal';
    switch(scope) {
      case 'platform': return 'Performance and engagement metrics across all experience types';
      case 'partner': return 'Experience analytics across your partner clients';
      case 'org': return 'Organization-wide insights for journeys, programs, classes, and coaching';
      case 'team': return 'Track your team\'s experience progress and completion';
      case 'program': return 'Program and team experience performance analytics';
      default: return 'Track your personal experience progress';
    }
  };

  // Get metrics based on scope - includes all experience types now
  const metrics = analytics ? {
    totalExperiences: analytics?.summary?.totalExperiences || analytics?.contentHealth?.totalJourneys || orgMetrics.totalExperiences || 0,
    totalEnrollments: analytics?.coverage?.totalEnrollments || orgMetrics.totalEnrollments || 0,
    activeLearners: analytics?.engagement?.activeLearners || orgMetrics.activeLearners || 0,
    completionRate: analytics?.completion?.completionRate || orgMetrics.completionRate || 0,
    avgTimeToCompletion: analytics?.completion?.avgDaysToCompletion || 0,
    atRiskLearners: analytics?.intervention?.atRiskLearners || orgMetrics.atRiskLearners || 0,
    // New experience type counts
    totalPrograms: analytics?.programs?.totalPrograms || 0,
    totalClasses: analytics?.classes?.totalClasses || 0,
    totalCoaching: analytics?.coaching?.totalEngagements || 0
  } : orgMetrics;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#0202ff' }} />
          <p className="text-gray-600">Loading experience analytics...</p>
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
              Retry {retryCount > 0 && `(${retryCount})`}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Build available view tabs based on permissions (using early-declared permission variables)
  const viewTabs = [];
  if (canViewPersonal) {
    viewTabs.push({ id: 'my', label: 'My Experiences', icon: User });
  }
  if (canViewTeam) {
    viewTabs.push({ id: 'team', label: 'Team Experiences', icon: Users });
  }
  // Add Requests toggle between Team Experiences and Experience Management
  if (isHRAdmin || isSuperAdmin) {
    viewTabs.push({ id: 'requests', label: 'Requests', icon: ClipboardList });
  }
  if (canViewExperienceManagement) {
    viewTabs.push({ id: 'experience-management', label: 'Experience Management', icon: Route });
  }
  if (canViewAnalytics) {
    viewTabs.push({ id: 'analytics', label: 'Experience Analytics', icon: BarChart3 });
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

  // If viewing My Experiences or Team Experiences, render those components directly
  if (activeView === 'my') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PageHeader
            title="My Experiences"
            subtitle="Your personal experience performance and insights"
            badges={[
              { text: roleDisplayName || appRole, className: "bg-white text-purple-600" },
              { text: `${myMetrics.totalEnrollments} Enrollments`, className: "bg-white text-blue-600" },
              { text: `${myMetrics.completionRate}% Completion`, className: "bg-white text-green-600" }
            ]}
            onRefresh={handleRefresh}
            onExportCSV={handleExportCSV}
            onExportPDF={handleExportPDF}
            loadingRefresh={loading}
            loadingExportCSV={exportingCSV}
            loadingExportPDF={exportingPDF}
            additionalHeaderContent={
            viewTabs.length > 1 && (
              <SubNavMenu
                items={viewTabs}
                activeId={activeView}
                onItemClick={(id) => id === 'experience-management' ? navigate(createPageUrl('ExperienceManagement')) : setActiveView(id)}
                variant="header"
              />
            )
            }
            />
            <MyJourneysView />
        </div>
      </div>
    );
  }

  if (activeView === 'team') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PageHeader
            title="Team Experiences"
            subtitle="Track your team's experience progress and completion"
            badges={[
              { text: roleDisplayName || appRole, className: "bg-white text-purple-600" },
              { text: `${teamMetrics.totalEnrollments} Enrollments`, className: "bg-white text-blue-600" },
              { text: `${teamMetrics.completionRate}% Completion`, className: "bg-white text-green-600" }
            ]}
            onRefresh={handleRefresh}
            onExportCSV={handleExportCSV}
            onExportPDF={handleExportPDF}
            loadingRefresh={loading}
            loadingExportCSV={exportingCSV}
            loadingExportPDF={exportingPDF}
            additionalHeaderContent={
              viewTabs.length > 1 && (
                <SubNavMenu
                  items={viewTabs}
                  activeId={activeView}
                  onItemClick={(id) => id === 'experience-management' ? navigate(createPageUrl('ExperienceManagement')) : setActiveView(id)}
                  variant="header"
                />
              )
            }
          />
          <TeamJourneysView />
        </div>
      </div>
    );
  }

  if (activeView === 'requests') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PageHeader
            title="Development Requests"
            subtitle="Manage development requests and assignments"
            badges={[
              { text: roleDisplayName || appRole, className: "bg-white text-purple-600" }
            ]}
            onRefresh={handleRefresh}
            loadingRefresh={loading}
            additionalHeaderContent={
              viewTabs.length > 1 && (
                <SubNavMenu
                  items={viewTabs}
                  activeId={activeView}
                  onItemClick={(id) => id === 'experience-management' ? navigate(createPageUrl('ExperienceManagement')) : setActiveView(id)}
                  variant="header"
                />
              )
            }
          />
          <RequestDashboard />
        </div>
      </div>
    );
  }

  if (activeView === 'experience-management') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PageHeader
            title="Experience Management"
            subtitle="Manage programs, journeys, classes, coaching, and participants"
            badges={[
              { text: roleDisplayName || appRole, className: "bg-white text-purple-600" }
            ]}
            onRefresh={handleRefresh}
            loadingRefresh={loading}
            additionalHeaderContent={
              viewTabs.length > 1 && (
                <SubNavMenu
                  items={viewTabs}
                  activeId={activeView}
                  onItemClick={(id) => id === 'experience-management' ? navigate(createPageUrl('ExperienceManagement')) : setActiveView(id)}
                  variant="header"
                />
              )
            }
          />
          <JourneyManagementDashboard />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <PageHeader
          title={getPageTitle()}
          subtitle={getPageSubtitle()}
          badges={[
            { text: roleDisplayName || appRole, className: "bg-white text-purple-600" },
            { text: `${metrics.totalEnrollments} Enrollments`, className: "bg-white text-blue-600" },
            { text: `${metrics.completionRate}% Completion`, className: "bg-white text-green-600" }
          ]}
          onRefresh={handleRefresh}
          onExportCSV={handleExportCSV}
          onExportPDF={handleExportPDF}
          loadingRefresh={loading}
          loadingExportCSV={exportingCSV}
          loadingExportPDF={exportingPDF}
          additionalHeaderContent={
            viewTabs.length > 1 && (
              <SubNavMenu
                items={viewTabs}
                activeId={activeView}
                onItemClick={setActiveView}
                variant="header"
              />
            )
          }
        />

        {/* Use the comprehensive ExperienceAnalyticsView component which now includes all experience types */}
        <ExperienceAnalyticsView />
      </div>

      {/* Custom Date Range Dialog */}
      <Dialog open={showCustomDateDialog} onOpenChange={(open) => {
        if (!open) handleCustomDateCancel();
        else setShowCustomDateDialog(true);
      }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Select Custom Date Range</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-wrap gap-2 py-2 border-b">
            {[7, 14, 30, 60, 90].map(days => (
              <Button key={days} variant="outline" size="sm" onClick={() => setQuickRange(days)} className="text-xs">
                Last {days} Days
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" /> From Date
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
                <CalendarIcon className="w-4 h-4" /> To Date
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <p className="text-sm font-medium text-blue-900">
                {format(customDateRange.from, 'MMM d, yyyy')} - {format(customDateRange.to, 'MMM d, yyyy')}
              </p>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCustomDateCancel}>Cancel</Button>
            <Button
              onClick={handleCustomDateApply}
              disabled={!customDateRange.from || !customDateRange.to}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Apply Date Range
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AssignOnboardingPlanModal
        isOpen={showAssignOnboardingModal}
        onClose={() => setShowAssignOnboardingModal(false)}
        onSuccess={loadAnalytics}
      />

      <AssignJourneyModal
        isOpen={showAssignJourneyModal}
        onClose={() => setShowAssignJourneyModal(false)}
        onSuccess={loadAnalytics}
      />
    </div>
  );
}

export default withAuthProtection(ExperienceAnalytics, [
  'User Level 1',
  'User Level 2', 
  'Analyst', 
  'Admin Level 1', 
  'Admin Level 2', 
  'Super Administrator', 
  'Partner Business Administrator', 
  'Platform Admin'
]);