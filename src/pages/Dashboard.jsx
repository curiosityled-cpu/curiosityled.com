import React, { useState, useEffect, lazy, Suspense } from "react";
import { toast } from "sonner";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/useAuth";
import { usePageContext } from "../Layout";
import { useViewportTracking } from "@/components/hooks/useViewportTracking";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2, User, Users, Building2, LayoutDashboard, Briefcase } from "lucide-react";
import DashboardHeader from "@/components/common/DashboardHeader";
import { useViewToggle } from "@/components/common/ViewToggle";
import { VIEW_SCOPES } from "@/components/constants/permissions";
import PointsDisplay from "@/components/gamification/PointsDisplay";
import UserActivationNotice from "@/components/users/UserActivationNotice";

// Lazy load dashboard components
const AssessmentOverview = lazy(() => import("../components/dashboard/AssessmentOverview"));
const JourneysOverview = lazy(() => import("../components/dashboard/JourneysOverview"));
const LearningOverview = lazy(() => import("../components/dashboard/LearningOverview"));
const GoalsOverview = lazy(() => import("../components/dashboard/GoalsOverview"));
const InsightsOverview = lazy(() => import("../components/dashboard/InsightsOverview"));
const PlatformAdminDashboard = lazy(() => import("../components/dashboard/PlatformAdminDashboard"));
const EnterpriseAnalytics = lazy(() => import("@/components/analytics/EnterpriseAnalytics"));
const ExperienceAnalytics = lazy(() => import("./ExperienceAnalytics"));
const AssessmentAnalytics = lazy(() => import("./AssessmentAnalytics"));
const LearningAnalyticsDashboard = lazy(() => import("./LearningAnalyticsDashboard"));
const ReportBuilder = lazy(() => import("./ReportBuilder"));
const Insights = lazy(() => import("./Insights"));
const ProgramManagerOverview = lazy(() => import("@/components/dashboard/ProgramManagerOverview"));
const UserDashboard = lazy(() => import("@/components/dashboard/user/UserDashboard"));
const TeamLeaderDashboard = lazy(() => import("@/components/dashboard/team-leader/TeamLeaderDashboard"));
const HRAdminDashboard = lazy(() => import("@/components/dashboard/admin/HRAdminDashboard"));
const ProgramManagerDashboardNew = lazy(() => import("@/components/dashboard/admin/ProgramManagerDashboard"));
const SuperAdminDashboardNew = lazy(() => import("@/components/dashboard/admin/SuperAdminDashboard"));

function Dashboard() {
  const { user, appRole, roleDisplayName, loading: authLoading, hasPermission, hasTeamAccess, hasOrgAnalyticsAccess, hasPersonalAccess, isSuperAdmin, isHRAdmin, isProgramManager, isPartnerBusinessAdmin, hasProgramManagerAccess } = useAuth();
  const { updatePageContext } = usePageContext();
  const location = useLocation();
  const navigate = useNavigate();

  // ALL useState and custom hooks MUST be called unconditionally with stable initial values
  const [activeTab, setActiveTab] = useState('dashboard');
  const [orgDashboardSubtab, setOrgDashboardSubtab] = useState('performance');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  
  // Platform Admins should see platform-wide dashboard by default
  const getInitialDashboardView = () => {
    if (appRole === 'Platform Admin') return 'platform';
    if (appRole === 'Super Administrator' || appRole === 'Partner Business Administrator') return VIEW_SCOPES.MY;
    return VIEW_SCOPES.MY;
  };
  
  // Call useViewToggle with a stable default value - MUST be called unconditionally
  const [currentView, setCurrentView] = useViewToggle('dashboard', getInitialDashboardView());

  // Compute all permissions once at the top for stable references
  const permissions = React.useMemo(() => ({
    canViewPersonal: Boolean(hasPermission?.('personal.dashboard.view')),
    canViewTeam: Boolean(hasPermission?.('team.dashboard.view')),
    canViewPrograms: Boolean(hasPermission?.('programs.view')),
    isPlatformAdmin: appRole === 'Platform Admin'
  }), [hasPermission, appRole]);

  // Build available views using stable permissions
  const availableViews = React.useMemo(() => {
    if (!user || authLoading) return [];
    
    const views = [];
    
    if (permissions.isPlatformAdmin) {
      views.push({ id: 'platform', label: 'Platform Dashboard', icon: LayoutDashboard });
    }
    
    if (permissions.canViewPersonal) {
      views.push({ id: VIEW_SCOPES.MY, label: 'Dashboard', icon: User });
    }
    
    if (permissions.canViewTeam) {
      views.push({ id: VIEW_SCOPES.TEAM, label: 'Team Dashboard', icon: Users });
    }

    if (permissions.canViewPrograms) {
      views.push({ id: 'programs', label: 'Program Dashboard', icon: Briefcase });
    }
    
    return views;
  }, [user, authLoading, permissions]);

  // Optimized: Single aggregated API call with React Query caching
  const { data: dashboardData, isLoading: dataLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-data', user?.email],
    queryFn: async () => {
      const response = await base44.functions.invoke('getDashboardData');
      if (response.data?.success) {
        return response.data.data;
      }
      throw new Error('Failed to load dashboard data');
    },
    enabled: !!user?.email && !authLoading,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Initialize activeTab based on URL hash after hooks are called
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    const validTabs = ['dashboard', 'journeys', 'assessments', 'learning', 'goals', 'insights', 'reports', 'orgPerformance', 'leadershipAnalytics'];
    if (validTabs.includes(hash)) {
      setActiveTab(hash);
    } else if (appRole === 'Admin Level 2' || appRole === 'Super Administrator') {
      window.history.replaceState(null, '', '#orgPerformance');
      setActiveTab('orgPerformance');
    } else {
      setActiveTab('dashboard');
    }
  }, []);

  useEffect(() => {
    const hash = location.hash.replace('#', '');
    const validTabs = ['dashboard', 'journeys', 'assessments', 'learning', 'goals', 'insights', 'reports', 'orgPerformance', 'leadershipAnalytics'];
    if (validTabs.includes(hash)) {
      setActiveTab(hash);
    } else if (appRole === 'Admin Level 2' || appRole === 'Super Administrator') {
      setActiveTab('orgPerformance');
    } else {
      setActiveTab('dashboard');
    }
  }, [location.hash, appRole]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success('Dashboard refreshed');
    } catch (err) {
      toast.error('Failed to refresh');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportCSV = () => {
    setExportingCSV(true);
    try {
      const csvData = [
        ['Metric', 'Value'],
        ['View', getHeaderTitle()],
        ['Generated', new Date().toLocaleString()]
      ];
      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('CSV exported successfully!');
    } catch (err) {
      toast.error('Failed to export CSV');
    } finally {
      setExportingCSV(false);
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const { data } = await base44.functions.invoke('exportPlatformAnalyticsPDF', {
        stats: {},
        timeRange: '30d',
        selectedOrg: 'all',
        selectedIndustry: 'all'
      });
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('PDF exported successfully!');
    } catch (err) {
      toast.error('Failed to export PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  // Compute section IDs with useMemo for stability
  const sectionIds = React.useMemo(() => {
    const sections = [];
    
    if (activeTab === 'dashboard') {
      if (appRole === 'User Level 1') {
        sections.push('section-assessment', 'section-learning', 'section-goals');
      } else if (appRole === 'User Level 2') {
        sections.push('section-team', 'section-assessment', 'section-learning', 'section-goals');
      } else if (appRole === 'Analyst') {
        sections.push('section-admin');
      } else if (appRole === 'Admin Level 1') {
        sections.push('section-programs', 'section-admin');
      } else if (appRole === 'Admin Level 2' || appRole === 'Super Administrator') {
        sections.push('section-admin');
      } else if (appRole === 'Partner Business Administrator') {
        sections.push('section-admin', 'section-programs');
      } else if (appRole === 'Platform Admin') {
        sections.push('section-platform-admin');
      }
    }
    
    return sections;
  }, [activeTab, appRole]);

  // CRITICAL: Create stable callback reference using useRef
  const viewportCallbackRef = React.useRef((viewportData) => {
    updatePageContext({
      viewport_focus: {
        focused_section: viewportData.focused,
        visible_sections: viewportData.visible,
        section_count: sectionIds.length
      }
    });
  });

  // Update ref when dependencies change without causing re-render
  React.useEffect(() => {
    viewportCallbackRef.current = (viewportData) => {
      updatePageContext({
        viewport_focus: {
          focused_section: viewportData.focused,
          visible_sections: viewportData.visible,
          section_count: sectionIds.length
        }
      });
    };
  }, [sectionIds, updatePageContext]);

  // Call useViewportTracking unconditionally with null callback (hook handles it)
  const { visibleSections, focusedSection } = useViewportTracking(sectionIds, null);

  // Auto-switch view if current view is not available - MUST be before any returns
  useEffect(() => {
    if (!authLoading && user) {
      const availableViewIds = availableViews.map(v => v.id);
      
      // If current view is not in available views, switch to first available
      if (availableViewIds.length > 0 && !availableViewIds.includes(currentView)) {
        setCurrentView(availableViewIds[0]);
      }
    }
  }, [availableViews, currentView, setCurrentView, authLoading, user]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    navigate(`#${tabId}`);
  };

  const loading = authLoading || dataLoading;

  const LoadingFallback = () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#0202ff' }} />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );

  // Determine which content to render - do this AFTER all hooks are called
  const shouldShowAnalystAnalytics = appRole === 'Analyst' && activeTab !== 'dashboard';
  const shouldShowReports = activeTab === 'reports';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <LoadingFallback />
      </div>
    );
  }

  // For Analysts on non-dashboard tabs, show analytics views
  if (shouldShowAnalystAnalytics) {
    if (activeTab === 'journeys') {
      return (
        <div className="min-h-screen">
          <Suspense fallback={<LoadingFallback />}>
            <ExperienceAnalytics />
          </Suspense>
        </div>
      );
    }
    
    if (activeTab === 'assessments') {
      return (
        <div className="min-h-screen">
          <Suspense fallback={<LoadingFallback />}>
            <AssessmentAnalytics />
          </Suspense>
        </div>
      );
    }
    
    if (activeTab === 'learning') {
      return (
        <div className="min-h-screen">
          <Suspense fallback={<LoadingFallback />}>
            <LearningAnalyticsDashboard />
          </Suspense>
        </div>
      );
    }

    if (activeTab === 'insights') {
      return (
        <div className="min-h-screen">
          <Suspense fallback={<LoadingFallback />}>
            <Insights />
          </Suspense>
        </div>
      );
    }

    if (activeTab === 'reports') {
      return (
        <div className="min-h-screen">
          <Suspense fallback={<LoadingFallback />}>
            <ReportBuilder />
          </Suspense>
        </div>
      );
    }
  }

  // For all other roles, handle reports tab routing
  if (shouldShowReports) {
    return (
      <div className="min-h-screen">
        <Suspense fallback={<LoadingFallback />}>
          <ReportBuilder />
        </Suspense>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        // This is now handled by renderViewBasedContent() with permission checks
        // Keeping this for backwards compatibility but it should not be reached
        return null;

      case 'journeys':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <JourneysOverview />
          </Suspense>
        );

      case 'assessments':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <AssessmentOverview 
              assessmentData={dashboardData?.assessment} 
              loading={loading}
            />
          </Suspense>
        );

      case 'learning':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <LearningOverview 
              learningData={dashboardData?.learning}
              userEmail={user?.email}
              loading={loading}
            />
          </Suspense>
        );

      case 'goals':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <GoalsOverview 
              goalsData={dashboardData?.goals}
              loading={loading}
            />
          </Suspense>
        );

      case 'insights':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <InsightsOverview />
          </Suspense>
        );

      default:
        return (
          <Suspense fallback={<LoadingFallback />}>
            <AssessmentOverview 
              assessmentData={dashboardData?.assessment} 
              loading={loading}
            />
          </Suspense>
        );
    }
  };

  // Render content based on current view scope
  const renderViewBasedContent = () => {
    // Only apply view toggle on dashboard tab
    if (activeTab !== 'dashboard') {
      return renderTabContent();
    }

    // Programs view
    if (currentView === 'programs' && permissions.canViewPrograms) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <ProgramManagerOverview />
        </Suspense>
      );
    }

    // Platform Dashboard
    if (currentView === 'platform' && permissions.isPlatformAdmin) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <PlatformAdminDashboard />
        </Suspense>
      );
    }

    // Team view
    if (currentView === VIEW_SCOPES.TEAM && permissions.canViewTeam) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <TeamLeaderDashboard 
            user={user}
            dashboardData={dashboardData}
            loading={loading}
          />
        </Suspense>
      );
    }

    // My Dashboard
    if (currentView === VIEW_SCOPES.MY && permissions.canViewPersonal) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <UserDashboard 
            user={user}
            dashboardData={dashboardData}
            loading={loading}
          />
        </Suspense>
      );
    }
    
    // Fallback: if no views available at all, show message
    if (availableViews.length === 0) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Dashboard Access</h3>
            <p className="text-gray-600">You don't have permissions to view any dashboard. Please contact your administrator to request access.</p>
          </div>
        </div>
      );
    }
    
    // If we reach here, currentView doesn't match any permission check
    // This shouldn't happen due to auto-switch, but show first available view as fallback
    const firstView = availableViews[0];
    if (firstView) {
      // Recursively render the first available view
      const savedView = currentView;
      if (savedView !== firstView.id) {
        setCurrentView(firstView.id);
      }
    }
    
    return null;
  };

  // Get header title based on current view
      const getHeaderTitle = () => {
        if (activeTab === 'orgPerformance') {
          return 'Org Performance';
        }
        if (activeTab === 'leadershipAnalytics') {
          return 'Leadership Analytics';
        }
        if (currentView === 'programs') {
          return 'Program Manager Dashboard';
        }
        if (currentView === VIEW_SCOPES.TEAM) {
          return 'Team Dashboard';
        }
        if (currentView === 'platform') {
          return 'Platform Dashboard';
          }
          return 'Dashboard';
          };

          const getHeaderSubtitle = () => {
          if (activeTab === 'orgPerformance') {
          return 'Platform-level overview and performance metrics for the organization';
          }
          if (activeTab === 'leadershipAnalytics') {
          return 'Leadership insights and succession planning for the organization';
          }
          if (currentView === 'programs') {
          return 'Manage programs, classes, coaching, and certificates';
          }
          if (currentView === VIEW_SCOPES.TEAM) {
          return 'Track your managers\' leadership development progress';
          }
          if (currentView === 'platform') {
          return 'Platform-wide analytics and administration across all organizations';
          }
          return 'Your leadership development dashboard';
          };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-atreus-section="dashboard-main" data-atreus-label="Dashboard">
      <UserActivationNotice user={user} />
      
      <div className="mb-6">
        <DashboardHeader
          title={getHeaderTitle()}
          subtitle={getHeaderSubtitle()}
          roleDisplayName={roleDisplayName}
          availableViews={availableViews}
          currentView={currentView === 'programs' ? 'programs' : currentView === 'platform' ? 'platform' : currentView}
          onViewChange={setCurrentView}
          onRefresh={handleRefresh}
          onExportCSV={handleExportCSV}
          onExportPDF={handleExportPDF}
          isRefreshing={isRefreshing}
          exportingCSV={exportingCSV}
          exportingPDF={exportingPDF}
        />
      </div>



      {/* Org Performance Content */}
      {activeTab === 'orgPerformance' && (
        <Suspense fallback={<LoadingFallback />}>
          {appRole === 'Admin Level 2' && <HRAdminDashboard user={user} loading={loading} />}
          {appRole === 'Super Administrator' && <SuperAdminDashboardNew user={user} loading={loading} />}
          {appRole === 'Partner Business Administrator' && <HRAdminDashboard user={user} loading={loading} />}
        </Suspense>
      )}

      {/* Leadership Analytics Content */}
      {activeTab === 'leadershipAnalytics' && (
        <Suspense fallback={<LoadingFallback />}>
          <EnterpriseAnalytics isOrgScoped={true} />
        </Suspense>
      )}

      {activeTab !== 'orgPerformance' && activeTab !== 'leadershipAnalytics' && renderViewBasedContent()}
    </div>
  );
}

export default Dashboard;