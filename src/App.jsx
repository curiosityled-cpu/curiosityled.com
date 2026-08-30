import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
// MVP Role-Based Pages
import MVPLayout, { getMVPRole } from '@/components/mvp/MVPLayout';
import LandingPage from './pages/LandingPage';
import LandingBPO from './pages/LandingBPO';
import LandingHealthcare from './pages/LandingHealthcare';
import LandingCoaching from './pages/LandingCoaching';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import OfferPage from './pages/OfferPage';
import BpoOfferPage from './pages/BpoOfferPage';
import RadarLabelSample from './pages/RadarLabelSample';
import DiagnosticAnalytics from './pages/DiagnosticAnalytics';
import MyLeadership from './pages/MyLeadership';
import MyDevelopment from './pages/MyDevelopment';
import MyGoalsMVP from './pages/MyGoalsMVP';
import ReportBuilderMVP from './pages/ReportBuilderMVP';
import ExperienceOverview from './pages/ExperienceOverview';
import ManagerDetail from './pages/ManagerDetail';
import RequestSubmit from './pages/RequestSubmit';
import RequestTriage from './pages/RequestTriage';
import CoachWorkspace from './pages/CoachWorkspace';
import ConsultantWorkspace from './pages/ConsultantWorkspace';

import LeadershipIntelligenceHub from './pages/LeadershipIntelligenceHub';
import CoachingWorkspace from './pages/CoachingWorkspace';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import AdminDataRestore from './pages/AdminDataRestore';
import PendingRole from './pages/PendingRole';
import SeedLinkedInCourses from './pages/SeedLinkedInCourses';
import OrgBusinessGoals from './pages/OrgBusinessGoals';
import PerformanceManager from './pages/PerformanceManager';
import MyPerformance from './pages/MyPerformance';
import MyRhythm from './pages/MyRhythm';
import ManagerToday from './pages/ManagerToday';
import ManagerPatterns from './pages/ManagerPatterns';
import ManagerGrowth from './pages/ManagerGrowth';
import ManagerTeam from './pages/ManagerTeam';
import ManagerAtreus from './pages/ManagerAtreus';
import ManagerPractice from './pages/ManagerPractice';
import OneOnOneHub from './pages/OneOnOneHub';
import DelegationPlanner from './pages/DelegationPlanner';
import DecisionJournalPage from './pages/DecisionJournalPage';
import DecisionQualityAnalytics from './pages/DecisionQualityAnalytics';
import Insights from './pages/Insights';
import ReportBuilder from './pages/ReportBuilder';
import { ContextProviders } from '@/components/contexts/ContextProviders';

const { Pages, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin, user } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Public landing pages accessible to unauthenticated visitors.
  // Reads from useLocation() so navigation between public pages re-renders
  // immediately (window.location.pathname is not reactive).
  const PublicLanding = () => {
    const path = useLocation().pathname;
    if (path === '/bpo') return <LandingBPO />;
    if (path === '/healthcare') return <LandingHealthcare />;
    if (path === '/coaching') return <LandingCoaching />;
    if (path === '/PrivacyPolicy') return <PrivacyPolicy />;
    if (path === '/TermsOfService') return <TermsOfService />;
    if (path === '/diagnostic') return <OfferPage />;
    if (path === '/bpo-diagnostic') return <BpoOfferPage />;
    return <LandingPage />;
  };

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Show the appropriate landing page for unauthenticated users
      return <PublicLanding />;
    }
  }

  // If not authenticated and no error, show landing page
  if (!isAuthenticated && !authError) {
    return <PublicLanding />;
  }

  // Redirect root based on MVP role
  const mvpRole = getMVPRole(user?.app_role || user?.data?.app_role || user?.role || 'user');

  // Helper: wrap a page component for MVP users (needs FullAuthProvider for legacy pages)
  const MVPPage = ({ children }) => (
    <MVPLayout>
      <ContextProviders>{children}</ContextProviders>
    </MVPLayout>
  );

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        !mvpRole ? (
          <LandingPage />
        ) : (user?.app_role || user?.data?.app_role || user?.role) === 'Consultant' ? (
          <Navigate to="/experience-workspace" replace />
        ) : (user?.app_role || user?.data?.app_role || user?.role) === 'Leadership Coach' ? (
          <Navigate to="/coaching-workspace" replace />
        ) : mvpRole === 'buyer' ? (
          <Navigate to="/today" replace />
        ) : mvpRole === 'analyst' ? (
          <Navigate to="/Insights?tab=org" replace />
        ) : mvpRole === 'executive' ? (
          <Navigate to="/Insights?tab=org" replace />
        ) : mvpRole === 'hrbp' ? (
          <Navigate to="/Insights?tab=org" replace />
        ) : (
          <MVPLayout><ManagerToday /></MVPLayout>
        )
      } />

      {/* Public landing page — no auth required */}
      <Route path="/LandingPage" element={<LandingPage />} />
      <Route path="/bpo" element={<LandingBPO />} />
      <Route path="/healthcare" element={<LandingHealthcare />} />
      <Route path="/coaching" element={<LandingCoaching />} />
      <Route path="/diagnostic" element={<OfferPage />} />
      <Route path="/bpo-diagnostic" element={<BpoOfferPage />} />
      <Route path="/radar-label-sample" element={<RadarLabelSample />} />

      {/* Redirect old ExperienceManagement URL to new DevelopmentManager */}
      <Route path="/ExperienceManagement" element={<Navigate to="/DevelopmentManager" replace />} />

      {/* Legacy Dashboard — redirect all roles to role-appropriate home */}
      <Route path="/Dashboard" element={<Navigate to="/" replace />} />

      {/* New manager nav routes (Phase 1) */}
      <Route path="/today" element={<MVPLayout><ManagerToday /></MVPLayout>} />
      <Route path="/portfolio" element={<Navigate to="/Insights" replace />} />
      <Route path="/patterns" element={<Navigate to="/today" replace />} />
      <Route path="/growth" element={<Navigate to="/practice" replace />} />
      <Route path="/team" element={<MVPLayout><ManagerTeam /></MVPLayout>} />
      <Route path="/atreus-guide" element={<MVPLayout><ManagerAtreus /></MVPLayout>} />
      <Route path="/practice" element={<MVPLayout><ManagerPractice /></MVPLayout>} />
      <Route path="/one-on-ones" element={<MVPLayout><OneOnOneHub /></MVPLayout>} />
      <Route path="/delegation-planner" element={<MVPLayout><DelegationPlanner /></MVPLayout>} />
      <Route path="/decision-journal" element={<MVPLayout><DecisionJournalPage /></MVPLayout>} />
      <Route path="/decision-analytics" element={<MVPLayout><DecisionQualityAnalytics /></MVPLayout>} />
      <Route path="/you" element={<Navigate to="/Profile" replace />} />

      {/* MVP-specific routes */}
      <Route path="/my-leadership" element={<MVPLayout><ManagerToday /></MVPLayout>} />
      <Route path="/coaching-workspace" element={<MVPLayout><CoachingWorkspace /></MVPLayout>} />
      <Route path="/experience-workspace" element={<MVPLayout><CoachingWorkspace /></MVPLayout>} />
      <Route path="/coach-workspace" element={<MVPLayout><CoachWorkspace /></MVPLayout>} />
      <Route path="/consultant-workspace" element={<MVPLayout><ConsultantWorkspace /></MVPLayout>} />
      <Route path="/request-submit" element={<MVPLayout><RequestSubmit /></MVPLayout>} />
      <Route path="/request-triage" element={<MVPLayout><RequestTriage /></MVPLayout>} />
      <Route path="/my-development" element={<MVPLayout><MyDevelopment /></MVPLayout>} />
      <Route path="/experience-overview" element={<MVPLayout><ExperienceOverview /></MVPLayout>} />
      <Route path="/report-builder-mvp" element={<MVPLayout><ReportBuilderMVP /></MVPLayout>} />
      <Route path="/manager-detail/:id" element={<MVPLayout><ManagerDetail /></MVPLayout>} />

      {/* Shared pages — all roles get the unified MVPLayout shell */}
      <Route path="/Insights" element={<MVPPage><Insights /></MVPPage>} />
      <Route path="/ReportBuilder" element={<MVPPage><ReportBuilder /></MVPPage>} />
      <Route path="/Profile" element={<MVPPage><Profile /></MVPPage>} />
      <Route path="/Settings" element={<MVPPage><Settings /></MVPPage>} />
      <Route path="/Notifications" element={<MVPPage><Notifications /></MVPPage>} />
      <Route path="/PrivacySettings" element={<Navigate to="/Settings" replace />} />
      <Route path="/AdminDataRestore" element={<AdminDataRestore />} />
      <Route path="/DiagnosticAnalytics" element={<MVPPage><DiagnosticAnalytics /></MVPPage>} />
      <Route path="/SeedLinkedInCourses" element={<SeedLinkedInCourses />} />
      <Route path="/OrgBusinessGoals" element={<MVPPage><OrgBusinessGoals /></MVPPage>} />
      <Route path="/PerformanceManager" element={<Navigate to="/GoalManager" replace />} />
      <Route path="/GoalManager" element={
        (user?.app_role || user?.data?.app_role || user?.role) === 'Consultant'
          ? <Navigate to="/experience-workspace" replace />
          : (user?.app_role || user?.data?.app_role || user?.role) === 'Leadership Coach'
            ? <Navigate to="/coaching-workspace" replace />
            : <MVPPage><PerformanceManager /></MVPPage>
      } />
      <Route path="/my-performance" element={<MVPPage><MyPerformance /></MVPPage>} />
      <Route path="/my-goals" element={<Navigate to="/my-performance" replace />} />
      <Route path="/my-rhythm" element={<MVPPage><MyRhythm /></MVPPage>} />
      <Route path="/teams-settings" element={<Navigate to="/Settings" replace />} />
      {/* Redirect /Performance to My Goals */}
      <Route path="/Performance" element={<Navigate to="/my-goals" replace />} />

      {/* All other legacy pages — unified under MVPLayout shell */}
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={<MVPPage><Page /></MVPPage>}
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <ThemeProvider>
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
    </ThemeProvider>
  )
}

export default App