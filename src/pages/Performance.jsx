import React, { useState, useEffect, lazy, Suspense } from "react";
import { base44 } from "@/api/base44Client";
import { Target, Users, BarChart3, Briefcase, FileText } from "lucide-react";
import { useAuth } from "@/components/useAuth";
import { useViewToggle } from "@/components/common/ViewToggle";
import { VIEW_SCOPES } from "@/components/constants/permissions";
import { toast } from "sonner";
import PerformanceHeader from "../components/performance/PerformanceHeader";
import DateRangeSelector from "../components/performance/DateRangeSelector";

// Lazy load heavy components
const GoalsSection = lazy(() => import("../components/performance/GoalsSection"));
const TeamGoalsSection = lazy(() => import("../components/performance/TeamGoalsSection"));
const PerformanceAnalytics = lazy(() => import("../components/performance/PerformanceAnalytics"));
const ProgramGoalsOversight = lazy(() => import("../components/performance/ProgramGoalsOversight"));
const ProgramPerformanceReports = lazy(() => import("../components/performance/ProgramPerformanceReports"));

export default function Performance() {
  const [user, setUser] = useState(null);
  const { appRole, isManagerOfManagers, isOrgLeader, isProgramManager, isHRAdmin, isSuperAdmin, isPartnerBusinessAdmin, isPlatformAdmin, hasPermission, hasTeamAccess, hasOrgAnalyticsAccess, hasProgramManagerAccess } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Personal, team, and analytics access require explicit add-on permissions
  const canViewPersonal = hasPermission('personal.performance.view') || hasPermission('personal.goals.view');
  const canViewAnalytics = hasPermission('analytics.performance.view');
  const canViewTeamGoals = hasPermission('team.performance.view') || hasPermission('team.goals.view');
  
  // Program Administrator specific views
  const canViewProgramGoals = isProgramManager || hasPermission('program_goals.view');
  const canViewProgramReports = isProgramManager || hasPermission('program_performance.view');
  
  // Platform Admins should see org-wide analytics by default, not personal views
  const getInitialView = () => {
    if (isPlatformAdmin || isSuperAdmin || isPartnerBusinessAdmin) {
      return canViewAnalytics ? VIEW_SCOPES.ORG : VIEW_SCOPES.MY;
    }
    return VIEW_SCOPES.MY;
  };
  
  // View toggle state
  const [currentView, setCurrentView] = useViewToggle('performance', getInitialView());

  // Metrics state
  const [metrics, setMetrics] = useState({ totalGoals: 0, completedGoals: 0, completionRate: 0 });
  const [loading, setLoading] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  
  // Date range state
  const [dateRange, setDateRange] = useState('6months');
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadMetrics();
    }
  }, [user, currentView]);



  const loadUser = async () => {
    const userData = await base44.auth.me();
    setUser(userData);
  };

  const loadMetrics = async () => {
    setLoading(true);
    try {
      let goals = [];
      if (currentView === VIEW_SCOPES.ORG && canViewAnalytics) {
        goals = await base44.entities.Goal.list();
      } else if (currentView === VIEW_SCOPES.TEAM && canViewTeamGoals) {
        goals = await base44.entities.Goal.filter({ visibility: 'shared' });
      } else {
        goals = await base44.entities.Goal.filter({ created_by: user?.email });
      }

      const completed = goals.filter(g => g.status === 'archived' || g.progress === 100).length;
      const completionRate = goals.length > 0 ? Math.round((completed / goals.length) * 100) : 0;

      setMetrics({
        totalGoals: goals.length,
        completedGoals: completed,
        completionRate
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    loadMetrics();
    toast.success('Data refreshed');
  };

  const handleExportCSV = () => {
    setExportingCSV(true);
    try {
      const viewLabel = currentView === VIEW_SCOPES.ORG ? 'Performance Analytics' 
        : currentView === VIEW_SCOPES.TEAM ? 'Team Performance' 
        : 'My Performance';
      
      const csvData = [
        [`${viewLabel} Report`],
        ['Generated:', new Date().toLocaleString()],
        [''],
        ['Key Metrics'],
        ['Total Goals', metrics.totalGoals],
        ['Completed Goals', metrics.completedGoals],
        ['Completion Rate', `${metrics.completionRate}%`]
      ];

      const csvContent = csvData.map(row => 
        Array.isArray(row) ? row.join(',') : row
      ).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${viewLabel.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
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
      toast.success('PDF export started - feature coming soon');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  const getHeaderConfig = () => {
    if (currentView === VIEW_SCOPES.ORG && canViewAnalytics) {
      return {
        title: 'Organization Performance Analytics',
        subtitle: 'Strategic insights across departments and roles',
        badges: [
          { text: appRole, className: "bg-white text-purple-600" },
          { text: `${metrics.totalGoals} Goals`, className: "bg-white text-blue-600" },
          { text: `${metrics.completionRate}% Complete`, className: "bg-white text-green-600" }
        ]
      };
    } else if (currentView === VIEW_SCOPES.TEAM && canViewTeamGoals) {
      return {
        title: 'Team Goals',
        subtitle: 'Monitor and manage your team\'s goals and progress',
        badges: [
          { text: appRole, className: "bg-white text-purple-600" },
          { text: `${metrics.totalGoals} Team Goals`, className: "bg-white text-blue-600" },
          { text: `${metrics.completionRate}% Complete`, className: "bg-white text-green-600" }
        ]
      };
    } else if (currentView === 'program_goals' && canViewProgramGoals) {
      return {
        title: isProgramManager ? 'Goals' : 'Program Goals',
        subtitle: isProgramManager ? 'Monitor and manage participant goals within your programs' : 'Monitor and manage participant goals within your programs',
        badges: [
          { text: appRole, className: "bg-white text-purple-600" },
          { text: 'Program Oversight', className: "bg-white text-blue-600" }
        ]
      };
    } else if (currentView === 'program_reports' && canViewProgramReports) {
      return {
        title: 'Program Reports',
        subtitle: 'Performance analytics and reporting for your programs',
        badges: [
          { text: appRole, className: "bg-white text-purple-600" },
          { text: 'Program Analytics', className: "bg-white text-blue-600" }
        ]
      };
    } else {
      return {
        title: 'Goals',
        subtitle: 'Track personal goals and achievements',
        badges: [
          { text: appRole, className: "bg-white text-purple-600" },
          { text: `${metrics.totalGoals} Goals`, className: "bg-white text-blue-600" },
          { text: `${metrics.completionRate}% Complete`, className: "bg-white text-green-600" }
        ]
      };
    }
  };

  const headerConfig = getHeaderConfig();



  // Set default view based on available tabs when role changes, also check URL param
  useEffect(() => {
    const tabs = [];
    if (canViewPersonal) tabs.push(VIEW_SCOPES.MY);
    if (canViewTeamGoals) tabs.push(VIEW_SCOPES.TEAM);
    if (canViewProgramGoals) tabs.push('program_goals');
    if (canViewProgramReports) tabs.push('program_reports');
    if (canViewAnalytics) tabs.push(VIEW_SCOPES.ORG);
    
    // Check for ?view=team URL param
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    if (viewParam === 'team' && canViewTeamGoals) {
      setCurrentView(VIEW_SCOPES.TEAM);
      return;
    }
    
    if (tabs.length > 0 && !tabs.includes(currentView)) {
      setCurrentView(tabs[0]);
    }
  }, [appRole, canViewPersonal, canViewTeamGoals, canViewProgramGoals, canViewProgramReports, canViewAnalytics]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderBottomColor: '#0202ff' }}></div>
      </div>
    );
  }

  // Render content based on view toggle
  const renderPerformanceContent = () => {
    const LoadingFallback = () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderBottomColor: '#0202ff' }}></div>
      </div>
    );

    // Team view
    if (currentView === VIEW_SCOPES.TEAM && canViewTeamGoals) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <TeamGoalsSection 
            user={user} 
            refreshTrigger={refreshTrigger}
            onRefresh={handleRefresh}
          />
        </Suspense>
      );
    }

    // Program Goals view (Program Administrator)
    if (currentView === 'program_goals' && canViewProgramGoals) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <ProgramGoalsOversight 
            user={user} 
            refreshTrigger={refreshTrigger}
          />
        </Suspense>
      );
    }

    // Program Reports view (Program Administrator)
    if (currentView === 'program_reports' && canViewProgramReports) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <ProgramPerformanceReports 
            user={user} 
            refreshTrigger={refreshTrigger}
          />
        </Suspense>
      );
    }

    // Org/Analytics view
    if (currentView === VIEW_SCOPES.ORG && canViewAnalytics) {
      return (
        <>
          <div className="flex justify-end mb-4">
            <DateRangeSelector
              dateRange={dateRange}
              customStartDate={customStartDate}
              customEndDate={customEndDate}
              showCustomRange={showCustomRange}
              onDateRangeChange={setDateRange}
              onCustomStartDateChange={setCustomStartDate}
              onCustomEndDateChange={setCustomEndDate}
              onShowCustomRangeChange={setShowCustomRange}
            />
          </div>
          <Suspense fallback={<LoadingFallback />}>
            <PerformanceAnalytics dateRange={dateRange} customStartDate={customStartDate} customEndDate={customEndDate} />
          </Suspense>
        </>
      );
    }

    // My view (default)
    return (
      <Suspense fallback={<LoadingFallback />}>
        <GoalsSection 
          user={user} 
          refreshTrigger={refreshTrigger}
          onRefresh={handleRefresh}
        />
      </Suspense>
    );
  };

  // View toggle tabs - only include tabs user has access to
  // For Program Administrators, simplify to just goal-focused views
  const viewTabs = isProgramManager ? [
    { id: 'program_goals', label: 'Program Goals', icon: Briefcase }
  ] : [
    ...(canViewPersonal ? [{ id: VIEW_SCOPES.MY, label: 'Goals', icon: Target }] : []),
    ...(canViewTeamGoals ? [{ id: VIEW_SCOPES.TEAM, label: 'Team Goals', icon: Users }] : []),
    ...(canViewProgramGoals && !isProgramManager ? [{ id: 'program_goals', label: 'Program Goals', icon: Briefcase }] : []),
    ...(canViewProgramReports && !isProgramManager ? [{ id: 'program_reports', label: 'Program Reports', icon: FileText }] : []),
    ...(canViewAnalytics && !isProgramManager ? [{ id: VIEW_SCOPES.ORG, label: 'Goal Analytics', icon: BarChart3 }] : [])
  ];

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <PerformanceHeader
          headerConfig={headerConfig}
          viewTabs={viewTabs}
          currentView={currentView}
          onViewChange={setCurrentView}
          onRefresh={handleRefresh}
          onExportCSV={handleExportCSV}
          onExportPDF={handleExportPDF}
          loading={loading}
          exportingCSV={exportingCSV}
          exportingPDF={exportingPDF}
        />

        {renderPerformanceContent()}
      </div>
    </div>
  );
}