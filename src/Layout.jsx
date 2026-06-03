import React, { useState, useEffect, createContext, useContext, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { Home, BarChart3, BookOpen, Target, Brain, Menu, X, Map, Bell, User, Settings as SettingsIcon, LogOut, CreditCard, Building2, Shield, Users as UsersIcon, CheckCircle, LayoutGrid, FileText, GraduationCap, Eye, ClipboardList, Trophy, FlaskConical, Minimize2, Mail, Paintbrush, ArrowLeft, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuthProvider, useAuth } from "@/components/useAuth";
import AtreusCoach from "@/components/ai/AtreusCoach";
import { useAtreusChat } from "@/components/ai/AtreusContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { ContextProviders } from "@/components/contexts/ContextProviders";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import PointsDisplay from "@/components/gamification/PointsDisplay";
import { usePageIntelligence } from "@/components/ai/usePageIntelligence";
import { useActivityTracker, getActivitySummary } from "@/components/ai/ActivityTracker";
import { getToolsForUser } from "@/components/ai/agentTools";
import UATTestingCoach from "@/components/uat/UATTestingCoach";
import PullToRefresh from "@/components/mobile/PullToRefresh";
import { useTabNavigation } from "@/components/mobile/TabNavigationManager";
import DeleteAccountDialog from "@/components/mobile/DeleteAccountDialog";
// import FirstLoginLinker from "@/components/provisioning/FirstLoginLinker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

// Create Page Context for child pages to update
const PageContextProvider = createContext();

export const usePageContext = () => {
  const context = useContext(PageContextProvider);
  if (!context) {
    // MVP pages intentionally run outside the legacy PageContextProvider — no-op silently
    return {
      updatePageContext: () => {},
      pageContext: {}
    };
  }
  return context;
};

function LayoutContent({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, appRole, roleDisplayName, displayName, loading, isPlatformAdmin, isSuperAdmin, isPartnerBusinessAdmin, isOrgLeader, isManagerOfManagers, isProgramManager, hasProgramManagerAccess, hasPermission, hasAnyPermission, userPermissions } = useAuth();
  const pageIntelligence = usePageIntelligence();
  const activityTracker = useActivityTracker();
  const { pendingContext, draftMessage, clearPending } = useAtreusChat();
  const [showAtreus, setShowAtreus] = useState(false);
  
  // Check if on sub-page (not dashboard/home or primary tab roots)
  const primaryTabPaths = [
    '/', '/home', '/dashboard',
    '/myexperiences', '/teamexperiences', '/experiencemanagement', '/experienceanalytics',
    '/assessment', '/assessments',
    '/development', '/learninglibrary',
    '/performance', '/goals',
    '/insights',
    '/reportbuilder'
  ];
  const normalizedPath = location.pathname.toLowerCase().replace(/\/$/, '');
  const isSubPage = !primaryTabPaths.some(path => normalizedPath === path || normalizedPath === path + '/');
  
  // Check if we're on a public page (landing, terms, privacy) - hide navigation
  const publicPaths = ['/landingpage', '/termsofservice', '/privacypolicy'];
  const isPublicPage = publicPaths.includes(normalizedPath);
  const [atreusMinimized, setAtreusMinimized] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [showUATCoach, setShowUATCoach] = useState(false);
  const [uatAssignedTests, setUatAssignedTests] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

    const [dynamicPageContext, setDynamicPageContext] = useState({});
    const [previousPageContext, setPreviousPageContext] = useState(null);
    
    // Tab navigation manager for preserving history per tab
    const tabNav = useTabNavigation('dashboard');

    // Memoize page context to avoid recalculations
    const pageContextRef = React.useRef({});

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.email) {
        setUnreadCount(0);
        setRecentNotifications([]);
        return;
      }
      try {
        const [unreadNotifs, recentNotifs] = await Promise.all([
          base44.entities.Notification.filter({
            user_email: user.email,
            is_read: false
          }, '-scheduled_for'),
          base44.entities.Notification.filter({
            user_email: user.email
          }, '-scheduled_for', 5)
        ]);
        setUnreadCount(unreadNotifs.length);
        setRecentNotifications(recentNotifs);
      } catch (error) {
        console.warn('Could not fetch notifications:', error.message);
        setUnreadCount(0);
        setRecentNotifications([]);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 600000);
    return () => clearInterval(interval);
  }, [user?.email]);

  useEffect(() => {
    if (Object.keys(dynamicPageContext).length > 0) {
      setPreviousPageContext({
        ...buildPageContext(),
        previous_path: location.pathname,
        navigated_at: new Date().toISOString()
      });
    } else {
      setPreviousPageContext(null);
    }
    setDynamicPageContext({});
  }, [location.pathname]);

  const updatePageContext = useCallback((newContext) => {
    // Check if context actually changed to avoid unnecessary updates
    const contextChanged = Object.keys(newContext).some(
      key => pageContextRef.current[key] !== newContext[key]
    );

    if (contextChanged) {
      pageContextRef.current = { ...pageContextRef.current, ...newContext };
      setDynamicPageContext(prev => ({
        ...prev,
        ...newContext,
        last_updated: new Date().toISOString()
      }));
    }
  }, []);

  const handleNotificationClick = (notificationId) => {
    if (notificationId) {
      // Optimistic UI update
      setUnreadCount(prev => Math.max(0, prev - 1));
      setRecentNotifications(prev => prev.map(notif => 
        notif.id === notificationId ? { ...notif, is_read: true } : notif
      ));
      
      // Persist to backend
      base44.entities.Notification.update(notificationId, { is_read: true })
        .catch(err => {
          console.error('Error marking notification as read:', err);
          // Revert optimistic update on error
          setUnreadCount(prev => prev + 1);
          setRecentNotifications(prev => prev.map(notif => 
            notif.id === notificationId ? { ...notif, is_read: false } : notif
          ));
        });
    }
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'goal_assignment':
      case 'goal_deadline':
        return <Target className="w-4 h-4 text-green-600" />;
      case 'learning_assigned':
        return <BookOpen className="w-4 h-4 text-blue-600" />;
      case 'assessment_due':
        return <BarChart3 className="w-4 h-4 text-purple-600" />;
      case 'milestone':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case '1on1_scheduled':
        return <UsersIcon className="w-4 h-4 text-orange-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const options = { month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const toggleAtreus = () => {
    if (showAtreus) {
      setShowAtreus(false);
      setAtreusMinimized(true);
      clearPending();
    } else {
      setShowAtreus(true);
      setAtreusMinimized(false);
    }
  };

  const openUATCoach = async () => {
    try {
      // Fetch assigned test cases for current user
      const tests = await base44.entities.UATTestCase.filter({
        assigned_tester_email: user.email
      });
      
      setUatAssignedTests(tests);
      setShowUATCoach(true);
    } catch (error) {
      console.error('Error loading UAT tests:', error);
      toast.error('Failed to load UAT tests');
    }
  };

  const closeUATCoach = () => {
    setShowUATCoach(false);
  };
  
  // Pull to refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refresh notifications
      if (user?.email) {
        const [unreadNotifs, recentNotifs] = await Promise.all([
          base44.entities.Notification.filter({
            user_email: user.email,
            is_read: false
          }, '-scheduled_for'),
          base44.entities.Notification.filter({
            user_email: user.email
          }, '-scheduled_for', 5)
        ]);
        setUnreadCount(unreadNotifs.length);
        setRecentNotifications(recentNotifs);
      }
      
      // Trigger page-specific refresh via event
      window.dispatchEvent(new CustomEvent('refreshData'));
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const buildPageContext = useCallback(() => {
    const path = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    const hash = location.hash.replace('#', '');

    let pageType = 'dashboard';
    let dataId = null;
    let filters = {};
    let metadata = {};

    if (path === '/' || path === '/Home' || path === '/Dashboard') {
      pageType = 'dashboard';
      metadata.activeTab = hash || 'dashboard';
    }
    else if (path === '/Assessment') pageType = 'assessment-overview';
    else if (path === '/LeadershipAssessment') pageType = 'assessment-taking';
    else if (path === '/AssessmentResults') {
      pageType = 'assessment-results';
      dataId = searchParams.get('assessmentId');
    }
    else if (path === '/LearningLibrary') {
      pageType = 'learning-library';
      if (searchParams.get('competency')) filters.competency = searchParams.get('competency').split(',');
      if (searchParams.get('level')) filters.level = searchParams.get('level');
      if (searchParams.get('type')) filters.type = searchParams.get('type');
      if (searchParams.get('search')) filters.search = searchParams.get('search');
    }
    else if (path === '/Performance') {
      pageType = 'performance-overview';
      dataId = searchParams.get('id');
      if (searchParams.get('status')) filters.status = searchParams.get('status');
    }
    else if (path === '/OrgPerformance') pageType = 'org-performance-dashboard';
    else if (path === '/CareerPathExplorer') pageType = 'career-path-explorer';
    else if (path === '/CareerPathDetails') {
      pageType = 'career-path-details';
      dataId = searchParams.get('pathId');
    }
    else if (path === '/MyJourneys') pageType = 'my-journeys-overview';
    else if (path === '/JourneyBuilder') {
      pageType = 'journey-builder';
      dataId = searchParams.get('journeyId');
    }
    else if (path === '/MyOnboarding') pageType = 'onboarding-progress';
    else if (path === '/OnboardingPlanBuilder') pageType = 'onboarding-builder';
    else if (path === '/FormSubmissions') pageType = 'form-submissions';
    else if (path === '/PublicRequestSubmission') pageType = 'public-request-submission';
    else if (path === '/SecurityAudit') pageType = 'security-audit';
    else if (path === '/CompetencyManagement') pageType = 'competency-management';
    else if (path === '/AssessmentAnalyticsDashboard') pageType = 'assessment-analytics-dashboard';
    else if (path === '/LeadershipIndexAnalytics') pageType = 'leadership-index-analytics';
    else if (path === '/CommandCenter') {
      pageType = 'command-center';
      metadata.viewMode = searchParams.get('view') || 'overview';
    }
    else if (path === '/HRAssessmentDashboard') pageType = 'hr-assessment-dashboard';
    else if (path === '/LearningAnalyticsDashboard') pageType = 'learning-analytics-dashboard';
    else if (path === '/AIInsightsDashboard') pageType = 'ai-insights-dashboard';
    else if (path === '/AILeadershipIntelligenceHub') pageType = 'ai-leadership-intelligence-hub';
    else if (path === '/ReportBuilder') pageType = 'report-builder';
    else if (path === '/ExperienceAnalytics') pageType = 'experience-analytics';
    else if (path === '/UserManagement') pageType = 'user-management';
    else if (path === '/CareerPathCreator') pageType = 'career-path-creator';
    else if (path === '/WhiteLabel') pageType = 'white-label-settings';
    else if (path === '/Settings') {
      pageType = 'settings';
      metadata.activeTab = searchParams.get('tab') || 'notifications';
    }
    else if (path === '/Profile') pageType = 'profile';
    else if (path === '/Notifications') pageType = 'notifications';
    else if (path === '/Billing') pageType = 'billing';
    else if (path === '/BusinessManager') pageType = 'business-manager';
    else if (path === '/SuperAdminPortal') pageType = 'super-admin-portal';
    else if (path === '/PartnerPortal') pageType = 'partner-portal';
    else if (path === '/RoleManagement') pageType = 'role-management';

    const baseContext = {
      path,
      pageType,
      dataId,
      filters: Object.keys(filters).length > 0 ? filters : null,
      metadata: Object.keys(metadata).length > 0 ? metadata : null,
      userRole: appRole,
      timestamp: new Date().toISOString(),
      unread_notifications: unreadCount,
      user_email: user?.email,
      user_name: user?.full_name
    };

    const activitySummary = getActivitySummary();
    const availableTools = getToolsForUser(userPermissions, appRole);

    const mergedContext = {
      ...baseContext,
      ...pageIntelligence,
      ...dynamicPageContext,
      activity_summary: activitySummary,
      previous_page: previousPageContext,
      userPermissions: userPermissions,
      availableAgentTools: Object.keys(availableTools),
      external_qualifications_summary: null
    };

    return mergedContext;
  }, [location.pathname, location.search, location.hash, appRole, unreadCount, user?.email, user?.full_name, pageIntelligence, dynamicPageContext, previousPageContext, userPermissions]);

  // Memoize navigation resolver to avoid recalculation
  const getNavigationPageName = React.useMemo(() => {
    return (navId) => {
      switch (navId) {
        case 'dashboard':
          return 'Dashboard';
        case 'experiences':
          if (hasPermission('experiences.manage_org')) {
            return 'DevelopmentManager';
          } else if (hasPermission('experiences.view_analytics') || hasPermission('analytics.view_org')) {
            return 'ExperienceAnalytics';
          } else if (hasPermission('experiences.view_personal') || hasPermission('personal.journeys.view')) {
            return 'MyExperiences';
          } else if (hasPermission('experiences.view_team') || hasPermission('team.journeys.view')) {
            return 'TeamExperiences';
          }
          return 'MyExperiences';
        case 'assessments':
          return 'Assessments';
        case 'development':
          return 'Development';
        case 'goals':
          return 'Performance';
        case 'insights':
          return 'Insights';
        case 'reports':
          return 'ReportBuilder';
        default:
          return 'Home';
      }
    };
  }, [isPlatformAdmin, hasPermission]);

  // Memoize active nav check to avoid recalculation
  const isNavActive = React.useCallback((navId) => {
    const path = location.pathname.toLowerCase();

    switch (navId) {
      case 'dashboard':
        return path === '/' || path === '/dashboard';

      case 'experiences':
        return path === '/myexperiences' || path === '/teamexperiences' || path === '/experiencemanagement' || path === '/developmentmanager' || 
               path === '/myjourneys' || path === '/journeybuilder' || path === '/experienceanalytics' || path === '/journeydetails' ||
               path === '/onboardingplanbuilder' || path === '/careerpathcreator' || path === '/formbuilder' || path === '/formbuilderdashboard' ||
               path.startsWith('/myexperiences') || path.startsWith('/teamexperiences') || path.startsWith('/experiencemanagement') ||
               path.startsWith('/myjourneys') || path.startsWith('/journeybuilder') || path.startsWith('/experienceanalytics') || path.startsWith('/journeydetails') ||
               path.startsWith('/onboardingplanbuilder') || path.startsWith('/careerpathcreator') || path.startsWith('/formbuilder');

      case 'assessments':
        return path === '/assessment' || path === '/assessmentanalyticsdashboard' || path === '/leadershipassessment' || path === '/hrassessmentdashboard' ||
               path === '/assessmentresults' || path === '/assessmentanalytics' || path === '/assessmentdetails' || path === '/customassessmentbuilder' ||
               path.startsWith('/assessment') || path.startsWith('/leadershipassessment') || path.startsWith('/hrassessmentdashboard') || path.startsWith('/customassessmentbuilder');

      case 'development':
        return path === '/development' || path === '/learninglibrary' || path === '/careerpathexplorer' || 
               path === '/mylearning' || path === '/programsmanagement' ||
               path.startsWith('/development') || path.startsWith('/learninglibrary') || path.startsWith('/careerpath') || path.startsWith('/mylearning');

      case 'goals':
        return path === '/performance' || path === '/orgperformance' || path === '/goals' || path === '/goal' ||
               path.startsWith('/performance') || path.startsWith('/orgperformance') || path.startsWith('/goals') || path.startsWith('/goal');

      case 'insights':
        return path === '/insights' || path === '/aiinsightsdashboard' || path === '/aileadershipintelligencehub' ||
               path.startsWith('/insights') || path.startsWith('/aiinsightsdashboard') || path.startsWith('/aileadershipintelligencehub');

      case 'reports':
        return path === '/reportbuilder' || path === '/reportanalytics' ||
               path.startsWith('/reportbuilder') || path.startsWith('/reportanalytics');

      default:
        return false;
    }
  }, [location.pathname]);

  // Primary navigation items (shown on mobile bottom bar)
  const primaryNavItems = [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'experiences', label: 'Experiences', icon: Map },
      { id: 'assessments', label: 'Assessments', icon: BarChart3 },
      { id: 'development', label: 'Development', icon: LayoutGrid },
      { id: 'goals', label: 'Performance', icon: Target },
  ];

  // Secondary navigation items (shown in More menu on mobile, all tabs on desktop)
  const secondaryNavItems = [
      { id: 'insights', label: 'Insights', icon: Brain },
      { id: 'reports', label: 'Reports', icon: FileText },
  ];

  const allNavigationItems = [...primaryNavItems, ...secondaryNavItems];

  const handleLogout = async () => {
    let timeoutId = null;
    
    try {
      // Clear local UI state before logout
      setShowAtreus(false);
      setIsMobileMenuOpen(false);
      setIsMobileNavOpen(false);

      // Clear all cached data
      localStorage.removeItem('impersonation');
      sessionStorage.clear(); // Clear any session data

      // Add timeout that rejects to force fallback
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Logout timeout')), 5000);
      });

      await Promise.race([
        base44.auth.logout(),
        timeoutPromise
      ]);

      // Clear timeout if logout succeeded
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      // Navigate to landing page after successful logout
      navigate(createPageUrl("LandingPage"));
      } catch (error) {
      console.error('Logout error:', error);
      // Clear timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // Force cleanup and redirect on error
      localStorage.removeItem('impersonation');
      navigate(createPageUrl("LandingPage"));
      }
  };

  // If on public page, render children without the main app navigation
  if (isPublicPage) {
    return (
      <ErrorBoundary>
        <PageContextProvider.Provider value={{ updatePageContext, pageContext: dynamicPageContext }}>
          {children}
        </PageContextProvider.Provider>
      </ErrorBoundary>
    );
    }

    return (
    <ErrorBoundary>
      <PageContextProvider.Provider value={{ updatePageContext, pageContext: dynamicPageContext }}>
        {/* <FirstLoginLinker /> */}
        <ImpersonationBanner />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
          {/* Header with Safe Area Insets */}
          <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-30" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                {/* Mobile: Show Back Button on Sub-Pages, Logo on Main Pages */}
                <div className="md:hidden">
                  {isSubPage ? (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => navigate(-1)}
                      className="select-none"
                      aria-label="Go back"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </Button>
                  ) : (
                    <Link to="/" className="flex items-center">
                      <div className="w-10 h-10 flex items-center justify-center">
                        <img
                          src="https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/7f8bef2bf_CuriosityLedLogoBBW1.png"
                          alt="Curiosity Led Logo"
                          className="w-10 h-10 object-contain"
                        />
                      </div>
                    </Link>
                  )}
                </div>

                {/* Desktop: Always Show Logo */}
                <Link to="/" className="hidden md:flex items-center">
                  <div className="w-10 h-10 mr-3 flex items-center justify-center">
                    <img
                      src="https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/7f8bef2bf_CuriosityLedLogoBBW1.png"
                      alt="Curiosity Led Logo"
                      className="w-10 h-10 object-contain dark:hidden"
                    />
                    <img
                      src="https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/46e2410c8_Untitleddesign.png"
                      alt="Curiosity Led Logo"
                      className="w-10 h-10 object-contain hidden dark:block"
                    />
                  </div>
                  <div className="hidden sm:block">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Curiosity Led</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Leadership Development Platform</p>
                  </div>
                </Link>

                <div className="flex items-center gap-2 md:gap-4">
                  {!loading && user && (
                    <>
                      <div className="hidden md:flex items-center gap-3 mr-2">
                        <PointsDisplay compact showLevel />
                      </div>

                      {/* Desktop: DropdownMenu, Mobile: Drawer */}
                      <div className="hidden md:block">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="relative select-none">
                              <Bell className="w-5 h-5 select-none" />
                              {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium" style={{ backgroundColor: '#0202ff' }}>
                                {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-80">
                          <div className="px-3 py-2 border-b">
                            <p className="font-semibold text-sm">Notifications</p>
                            {unreadCount > 0 && (
                              <p className="text-xs text-gray-500">{unreadCount} unread</p>
                            )}
                          </div>
                          
                          {recentNotifications.length === 0 ? (
                            <div className="px-3 py-6 text-center text-gray-500 text-sm">
                              <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                              No notifications yet
                            </div>
                          ) : (
                            <>
                              {recentNotifications.map((notification) => (
                                <DropdownMenuItem
                                  key={notification.id}
                                  className="cursor-pointer px-3 py-3 focus:bg-gray-50 select-none"
                                  onClick={() => {
                                    handleNotificationClick(notification.id);
                                    navigate(createPageUrl("Notifications"));
                                  }}
                                >
                                  <div className="flex gap-3 w-full">
                                    <div className="flex-shrink-0 mt-0.5">
                                      {getNotificationIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2 mb-1">
                                        <p className={`text-sm font-medium truncate ${!notification.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
                                          {notification.title}
                                        </p>
                                        {!notification.is_read && (
                                          <span className="flex-shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: '#0202ff' }}></span>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-500 line-clamp-2 mb-1">
                                        {notification.message}
                                      </p>
                                      <p className="text-xs text-gray-400">
                                        {formatTimeAgo(notification.scheduled_for)}
                                      </p>
                                    </div>
                                  </div>
                                </DropdownMenuItem>
                              ))}
                              
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <Link 
                                  to={createPageUrl("Notifications")} 
                                  className="text-center justify-center text-sm font-medium cursor-pointer py-2 select-none"
                                  style={{ color: '#0202ff' }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = '#0101dd'}
                                  onMouseLeave={(e) => e.currentTarget.style.color = '#0202ff'}
                                >
                                  View all notifications
                                </Link>
                              </DropdownMenuItem>
                            </>
                            )}
                            </DropdownMenuContent>
                            </DropdownMenu>
                            </div>

                            {/* Mobile: Drawer for notifications */}
                            <div className="md:hidden">
                            <Drawer>
                            <DrawerTrigger asChild>
                            <Button variant="ghost" size="icon" className="relative select-none">
                              <Bell className="w-5 h-5 select-none" />
                              {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium" style={{ backgroundColor: '#0202ff' }}>
                                {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                              )}
                            </Button>
                            </DrawerTrigger>
                            <DrawerContent>
                            <DrawerHeader>
                              <DrawerTitle>Notifications</DrawerTitle>
                              {unreadCount > 0 && (
                                <p className="text-xs text-gray-500">{unreadCount} unread</p>
                              )}
                            </DrawerHeader>
                            <div className="px-4 pb-8 max-h-[60vh] overflow-y-auto">
                              {recentNotifications.length === 0 ? (
                                <div className="py-6 text-center text-gray-500 text-sm">
                                  <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                  No notifications yet
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {recentNotifications.map((notification) => (
                                    <button
                                      key={notification.id}
                                      className="w-full text-left p-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
                                      onClick={() => {
                                        handleNotificationClick(notification.id);
                                        navigate(createPageUrl("Notifications"));
                                      }}
                                    >
                                      <div className="flex gap-3">
                                        <div className="flex-shrink-0 mt-0.5">
                                          {getNotificationIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-start justify-between gap-2 mb-1">
                                            <p className={`text-sm font-medium truncate ${!notification.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
                                              {notification.title}
                                            </p>
                                            {!notification.is_read && (
                                              <span className="flex-shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: '#0202ff' }}></span>
                                            )}
                                          </div>
                                          <p className="text-xs text-gray-500 line-clamp-2 mb-1">
                                            {notification.message}
                                          </p>
                                          <p className="text-xs text-gray-400">
                                            {formatTimeAgo(notification.scheduled_for)}
                                          </p>
                                        </div>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            </DrawerContent>
                            </Drawer>
                            </div>

                            <div className="hidden md:flex items-center gap-3">
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="flex select-none">
                              <User className="w-5 h-5 select-none" />
                              </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56 select-none">
                            <div className="px-2 py-1.5">
                              <p className="text-sm font-medium">{displayName}</p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                              <Badge variant="outline" className="text-xs mt-1">
                                {roleDisplayName}
                              </Badge>
                            </div>
                            <DropdownMenuSeparator />

                            <DropdownMenuItem asChild>
                              <Link to={createPageUrl("Profile")} className="cursor-pointer select-none">
                                <User className="w-4 h-4 mr-2 select-none" />
                                My Profile
                              </Link>
                            </DropdownMenuItem>

                            {isPlatformAdmin && (
                              <>
                                <DropdownMenuItem asChild>
                                  <Link to={createPageUrl("Billing")} className="cursor-pointer select-none">
                                    <CreditCard className="w-4 h-4 mr-2 select-none" />
                                    Billing & Subscription
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link to={createPageUrl("EmailTemplates")} className="cursor-pointer select-none">
                                    <Mail className="w-4 h-4 mr-2 select-none" />
                                    Email Templates
                                  </Link>
                                </DropdownMenuItem>
                              </>
                            )}

                            <DropdownMenuItem asChild>
                              <Link to={createPageUrl("Achievements")} className="cursor-pointer select-none">
                                <Trophy className="w-4 h-4 mr-2 select-none" />
                                Achievements
                              </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem asChild>
                              <Link to={createPageUrl("Settings")} className="cursor-pointer select-none">
                                <SettingsIcon className="w-4 h-4 mr-2 select-none" />
                                Settings
                              </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem asChild>
                              <Link to={createPageUrl("PrivacySettings")} className="cursor-pointer select-none">
                                <Shield className="w-4 h-4 mr-2 select-none" />
                                Privacy & Security
                              </Link>
                            </DropdownMenuItem>

                            {isPlatformAdmin && (
                              <DropdownMenuItem asChild>
                                <Link to={createPageUrl("LandingPage")} className="cursor-pointer select-none">
                                  <Eye className="w-4 h-4 mr-2 select-none" />
                                  Preview Landing Page
                                </Link>
                              </DropdownMenuItem>
                            )}

                            {(isPlatformAdmin || isSuperAdmin || isPartnerBusinessAdmin || isOrgLeader) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                  <Link to={createPageUrl("UserManagement")} className="cursor-pointer select-none">
                                    <UsersIcon className="w-4 h-4 mr-2 select-none" />
                                    Users
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link to={createPageUrl("QualificationsReview")} className="cursor-pointer select-none">
                                    <CheckCircle className="w-4 h-4 mr-2 select-none" />
                                    Review Qualifications
                                  </Link>
                                </DropdownMenuItem>
                              </>
                            )}



                            {(user?.app_role === 'Platform Admin' || user?.app_role === 'Super Administrator' || user?.app_role === 'Partner Business Administrator') && (
                              <DropdownMenuItem asChild>
                                <Link to={createPageUrl("RoleSelector")} className="cursor-pointer select-none">
                                  <Target className="w-4 h-4 mr-2 select-none" />
                                  Change Role
                                </Link>
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 select-none">
                              <LogOut className="w-4 h-4 mr-2 select-none" />
                              Log Out
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <div className="px-2 py-2">
                              <DeleteAccountDialog userEmail={user?.email} />
                              </div>
                              </DropdownMenuContent>
                              </DropdownMenu>
                              </div>

                              {/* Mobile: Drawer for user menu */}
                              <div className="md:hidden">
                              <Drawer>
                              <DrawerTrigger asChild>
                              <Button variant="ghost" size="icon" className="select-none">
                              <User className="w-5 h-5 select-none" />
                              </Button>
                              </DrawerTrigger>
                              <DrawerContent>
                              <DrawerHeader>
                              <DrawerTitle>{displayName}</DrawerTitle>
                              <p className="text-xs text-gray-500">{user.email}</p>
                              <Badge variant="outline" className="text-xs mt-1 w-fit">
                                {roleDisplayName}
                              </Badge>
                              </DrawerHeader>
                              <div className="px-4 pb-8 space-y-1">
                              <button
                                onClick={() => navigate(createPageUrl("Profile"))}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors select-none"
                              >
                                <User className="w-5 h-5 select-none" />
                                <span>My Profile</span>
                              </button>

                              {isPlatformAdmin && (
                                <>
                                  <button
                                    onClick={() => navigate(createPageUrl("Billing"))}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors select-none"
                                  >
                                    <CreditCard className="w-5 h-5 select-none" />
                                    <span>Billing & Subscription</span>
                                  </button>
                                  <button
                                    onClick={() => navigate(createPageUrl("EmailTemplates"))}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors select-none"
                                  >
                                    <Mail className="w-5 h-5 select-none" />
                                    <span>Email Templates</span>
                                  </button>
                                </>
                              )}

                              <button
                                onClick={() => navigate(createPageUrl("Achievements"))}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors select-none"
                              >
                                <Trophy className="w-5 h-5 select-none" />
                                <span>Achievements</span>
                              </button>

                              <button
                                onClick={() => navigate(createPageUrl("Settings"))}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors select-none"
                              >
                                <SettingsIcon className="w-5 h-5 select-none" />
                                <span>Settings</span>
                              </button>

                              <button
                                onClick={() => navigate(createPageUrl("PrivacySettings"))}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors select-none"
                              >
                                <Shield className="w-5 h-5 select-none" />
                                <span>Privacy & Security</span>
                              </button>

                              {isPlatformAdmin && (
                                <button
                                  onClick={() => navigate(createPageUrl("LandingPage"))}
                                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors select-none"
                                >
                                  <Eye className="w-5 h-5 select-none" />
                                  <span>Preview Landing Page</span>
                                </button>
                              )}

                              {(isPlatformAdmin || isSuperAdmin || isPartnerBusinessAdmin || isOrgLeader) && (
                                <>
                                  <div className="border-t my-2"></div>
                                  <button
                                    onClick={() => navigate(createPageUrl("UserManagement"))}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors select-none"
                                  >
                                    <UsersIcon className="w-5 h-5 select-none" />
                                    <span>Users</span>
                                  </button>
                                  <button
                                    onClick={() => navigate(createPageUrl("QualificationsReview"))}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors select-none"
                                  >
                                    <CheckCircle className="w-5 h-5 select-none" />
                                    <span>Review Qualifications</span>
                                  </button>
                                </>
                              )}

                              {(user?.app_role === 'Platform Admin' || user?.app_role === 'Super Administrator' || user?.app_role === 'Partner Business Administrator') && (
                                <button
                                  onClick={() => navigate(createPageUrl("RoleSelector"))}
                                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors select-none"
                                >
                                  <Target className="w-5 h-5 select-none" />
                                  <span>Change Role</span>
                                </button>
                              )}

                              <div className="border-t my-2"></div>
                              <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 active:bg-red-100 transition-colors text-red-600 select-none"
                              >
                                <LogOut className="w-5 h-5 select-none" />
                                <span>Log Out</span>
                              </button>

                              <div className="px-4 py-2">
                                <DeleteAccountDialog userEmail={user?.email} />
                              </div>
                              </div>
                              </DrawerContent>
                              </Drawer>
                              </div>
                            </>
                          )}

                  <div className="md:hidden">
                  <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-label="Open main menu"
                  className="select-none"
                  >
                  <Menu className="w-6 h-6" />
                  </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Menu Dropdown */}
            <AnimatePresence>
              {isMobileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="md:hidden border-t border-gray-200"
                >
                  <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                    {!loading && user && (
                      <>
                        <Link
                          to={createPageUrl("Notifications")}
                          className="flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 select-none active:bg-gray-100"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Bell className="w-5 h-5 select-none" />
                          Notifications
                          {unreadCount > 0 && (
                            <Badge className="bg-red-500 text-white select-none">{unreadCount > 9 ? '9+' : unreadCount}</Badge>
                          )}
                        </Link>

                        <Link
                          to={createPageUrl("Achievements")}
                          className="flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 select-none active:bg-gray-100"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Trophy className="w-5 h-5 select-none" />
                          Achievements
                        </Link>

                        <Link
                          to={createPageUrl("Profile")}
                          className="flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 select-none active:bg-gray-100"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <User className="w-5 h-5 select-none" />
                          My Profile
                        </Link>

                        {user?.app_role === 'Platform Admin' && (
                          <Link
                            to={createPageUrl("Billing")}
                            className="flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 select-none active:bg-gray-100"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <CreditCard className="w-5 h-5 select-none" />
                            Billing
                          </Link>
                        )}

                        <Link
                          to={createPageUrl("Settings")}
                          className="flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 select-none active:bg-gray-100"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <SettingsIcon className="w-5 h-5 select-none" />
                          Settings
                        </Link>

                        <Link
                          to={createPageUrl("PrivacySettings")}
                          className="flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 select-none active:bg-gray-100"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Shield className="w-5 h-5 select-none" />
                          Privacy & Security
                        </Link>

                        {(isPlatformAdmin || isSuperAdmin || isPartnerBusinessAdmin || isOrgLeader) && (
                          <>
                            <Link
                              to={createPageUrl("UserManagement")}
                              className="flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 select-none active:bg-gray-100"
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              <UsersIcon className="w-5 h-5 select-none" />
                              Users
                            </Link>
                            <Link
                              to={createPageUrl("QualificationsReview")}
                              className="flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 select-none active:bg-gray-100"
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              <CheckCircle className="w-5 h-5 select-none" />
                              Review Qualifications
                            </Link>
                          </>
                        )}

                        <div className="border-t my-2"></div>
                        <div className="px-3 py-2">
                          <span className="text-sm text-gray-800 truncate block">
                            {displayName}
                          </span>
                          {(user?.app_role === 'Platform Admin' || user?.app_role === 'Super Administrator' || user?.app_role === 'Partner Business Administrator') ? (
                            <Link to={createPageUrl("RoleSelector")} onClick={() => setIsMobileMenuOpen(false)}>
                              <Badge variant="outline" className="text-xs cursor-pointer hover:bg-gray-100 transition-colors mt-1">
                                {roleDisplayName}
                              </Badge>
                            </Link>
                          ) : (
                            <Badge variant="outline" className="text-xs mt-1">
                              {roleDisplayName}
                            </Badge>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            handleLogout();
                            setIsMobileMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 select-none active:bg-red-100"
                        >
                          <LogOut className="w-5 h-5 select-none" />
                          Log Out
                        </button>
                        
                        <div className="px-3 py-2">
                          <DeleteAccountDialog userEmail={user?.email} />
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </header>

          {/* Desktop Navigation Bar */}
          {!loading && user && (
            <div className="sticky top-16 z-20 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-4 hidden md:block">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <div className="grid grid-cols-7">
                      {allNavigationItems.map((item) => {
                        const Icon = item.icon;
                        const active = isNavActive(item.id);

                        return (
                         <Link
                           key={item.id}
                           to={createPageUrl(getNavigationPageName(item.id))}
                           className="flex flex-col items-center justify-center gap-2 py-4 transition-all relative select-none"
                           style={{
                             backgroundColor: active ? '#EEF2FF' : 'transparent',
                             borderBottom: active ? '3px solid #0202ff' : '3px solid transparent'
                           }}
                         >
                           <Icon 
                             className="w-5 h-5 select-none" 
                             style={{ color: active ? '#0202ff' : '#6B7280' }} 
                           />
                           <span 
                             className="text-xs font-medium select-none"
                             style={{ color: active ? '#0202ff' : '#4B5563' }}
                           >
                             {item.label}
                           </span>
                         </Link>
                        );
                        })}
                    </div>
                    </motion.div>
                    </div>
                    </div>
                    )}

                    {/* Mobile Bottom Tab Bar with Safe Area Inset */}
                    {!loading && user && (
                    <div 
                    className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg"
                    style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                    >
                    <div className="grid grid-cols-6 max-w-full">
                      {primaryNavItems.map((item) => {
                      const Icon = item.icon;
                      const active = isNavActive(item.id);

                      return (
                       <button
                         key={item.id}
                         onClick={(e) => {
                           e.preventDefault();
                           const targetPage = getNavigationPageName(item.id);
                           const targetPath = createPageUrl(targetPage);

                           // Navigate and update tab history
                           tabNav.navigateInTab(targetPath, item.id);
                           navigate(targetPath);
                         }}
                         className="flex flex-col items-center justify-center gap-1 py-2 transition-all relative select-none active:bg-gray-100 dark:active:bg-gray-700 border-0 bg-transparent"
                         style={{
                           backgroundColor: active ? '#EEF2FF' : 'transparent'
                         }}
                       >
                         <Icon 
                           className="w-5 h-5 select-none" 
                           style={{ color: active ? '#0202ff' : '#6B7280' }} 
                         />
                         <span 
                           className="text-[10px] font-medium select-none"
                           style={{ color: active ? '#0202ff' : '#4B5563' }}
                         >
                           {item.label}
                         </span>
                         {active && (
                           <div 
                             className="absolute top-0 left-0 right-0 h-0.5"
                             style={{ backgroundColor: '#0202ff' }}
                           />
                         )}
                       </button>
                      );
                      })}
                      {/* More Menu Button */}
                      <Drawer>
                        <DrawerTrigger asChild>
                          <button
                            className="flex flex-col items-center justify-center gap-1 py-2 transition-all relative select-none active:bg-gray-100 dark:active:bg-gray-700 border-0 bg-transparent"
                            style={{
                              backgroundColor: (isNavActive('insights') || isNavActive('reports')) ? '#EEF2FF' : 'transparent'
                            }}
                          >
                            <Menu 
                              className="w-5 h-5 select-none" 
                              style={{ color: (isNavActive('insights') || isNavActive('reports')) ? '#0202ff' : '#6B7280' }} 
                            />
                            <span 
                              className="text-[10px] font-medium select-none"
                              style={{ color: (isNavActive('insights') || isNavActive('reports')) ? '#0202ff' : '#4B5563' }}
                            >
                              More
                            </span>
                            {(isNavActive('insights') || isNavActive('reports')) && (
                              <div 
                                className="absolute top-0 left-0 right-0 h-0.5"
                                style={{ backgroundColor: '#0202ff' }}
                              />
                            )}
                          </button>
                        </DrawerTrigger>
                        <DrawerContent>
                          <DrawerHeader>
                            <DrawerTitle>More Options</DrawerTitle>
                          </DrawerHeader>
                          <div className="px-4 pb-8 space-y-1">
                            {secondaryNavItems.map((item) => {
                              const Icon = item.icon;
                              const active = isNavActive(item.id);

                              return (
                                <button
                                  key={item.id}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    const targetPage = getNavigationPageName(item.id);
                                    const targetPath = createPageUrl(targetPage);
                                    tabNav.navigateInTab(targetPath, item.id);
                                    navigate(targetPath);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors select-none active:bg-gray-100"
                                  style={{
                                    backgroundColor: active ? '#EEF2FF' : 'transparent'
                                  }}
                                >
                                  <Icon 
                                    className="w-5 h-5 select-none" 
                                    style={{ color: active ? '#0202ff' : '#6B7280' }} 
                                  />
                                  <span 
                                    className="font-medium select-none"
                                    style={{ color: active ? '#0202ff' : '#4B5563' }}
                                  >
                                    {item.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </DrawerContent>
                      </Drawer>
                    </div>
                    </div>
                    )}

          <main 
            style={{ 
              paddingBottom: !loading && user ? 'calc(4.375rem + env(safe-area-inset-bottom))' : '0' 
            }} 
            className="md:pb-0"
          >
            {/* Only use PullToRefresh on mobile */}
            <div className="md:hidden">
              <PullToRefresh onRefresh={handleRefresh}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, x: '100%' }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: '-100%' }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <ErrorBoundary>
                      {children}
                    </ErrorBoundary>
                  </motion.div>
                </AnimatePresence>
              </PullToRefresh>
            </div>
            
            {/* Desktop: No pull-to-refresh wrapper */}
            <div className="hidden md:block">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <ErrorBoundary>
                    {children}
                  </ErrorBoundary>
                </motion.div>
              </AnimatePresence>
            </div>
          </main>

          {!loading && user && (
            <AnimatePresence>
              {showAtreus && !atreusMinimized && (
                <AtreusCoach
                  context={{...buildPageContext(), ...pendingContext}}
                  isMinimized={false}
                  onMinimize={toggleAtreus}
                  onClose={toggleAtreus}
                  draftMessage={draftMessage}
                />
              )}
            </AnimatePresence>
          )}

          {/* Floating Action Buttons - Stack UAT and AI Coach */}
          <div className="fixed right-6 z-40 flex flex-col gap-3" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}>
            {/* UAT Testing Badge - Only for UAT Testers */}
            {!loading && user?.is_uat_tester && !showUATCoach && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Button
                  onClick={openUATCoach}
                  className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 select-none"
                  title="UAT Testing Mode"
                >
                  <FlaskConical className="w-6 h-6 text-white select-none" />
                </Button>
              </motion.div>
            )}

            {/* AI Coach Button */}
            {!loading && user && !showAtreus && !showUATCoach && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Button
                  onClick={toggleAtreus}
                  className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all select-none"
                  style={{ backgroundColor: '#0202ff' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0101dd'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0202ff'}
                  title="Ask Atreus - Your AI Coach"
                >
                  <Brain className="w-6 h-6 text-white select-none" />
                </Button>
              </motion.div>
            )}
          </div>

          {/* UAT Testing Coach */}
          <AnimatePresence>
            {showUATCoach && (
              <UATTestingCoach
                onClose={closeUATCoach}
                onMinimize={closeUATCoach}
                user={user}
                assignedTests={uatAssignedTests}
              />
            )}
          </AnimatePresence>
        </div>
      </PageContextProvider.Provider>
    </ErrorBoundary>
  );
}

export default function Layout({ children }) {
  return (
    <AuthProvider>
      <ContextProviders>
        <LayoutContent>{children}</LayoutContent>
      </ContextProviders>
    </AuthProvider>
  );
}