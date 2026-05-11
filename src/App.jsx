import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
// MVP Role-Based Pages
import MVPLayout, { getMVPRole } from '@/components/mvp/MVPLayout';
import MyLeadership from './pages/MyLeadership';
import MyDevelopment from './pages/MyDevelopment';
import MyGoalsMVP from './pages/MyGoalsMVP';
import ReportBuilderMVP from './pages/ReportBuilderMVP';
import ExperienceOverview from './pages/ExperienceOverview';
import ManagerDetail from './pages/ManagerDetail';
import LeadershipIntelligenceHub from './pages/LeadershipIntelligenceHub';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import PrivacySettings from './pages/PrivacySettings';
import AdminDataRestore from './pages/AdminDataRestore';
import PendingRole from './pages/PendingRole';
import SeedLinkedInCourses from './pages/SeedLinkedInCourses';
import OrgBusinessGoals from './pages/OrgBusinessGoals';
import PerformanceManager from './pages/PerformanceManager';
import MyPerformance from './pages/MyPerformance';
import Insights from './pages/Insights';
import ReportBuilder from './pages/ReportBuilder';
import { AuthProvider as FullAuthProvider } from '@/components/useAuth';
import { ContextProviders } from '@/components/contexts/ContextProviders';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

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

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Redirect root based on MVP role
  const mvpRole = getMVPRole(user?.app_role || user?.data?.app_role || user?.role);

  // Helper: wrap a page component for MVP users (needs FullAuthProvider for legacy pages)
  const MVPPage = ({ children }) => (
    <MVPLayout>
      <FullAuthProvider>
        <ContextProviders>{children}</ContextProviders>
      </FullAuthProvider>
    </MVPLayout>
  );

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        !mvpRole ? (
          <MVPLayout><PendingRole /></MVPLayout>
        ) : mvpRole === 'buyer' ? (
          <Navigate to="/Insights?tab=org" replace />
        ) : mvpRole === 'analyst' ? (
          <Navigate to="/Insights?tab=org" replace />
        ) : mvpRole === 'executive' ? (
          <Navigate to="/Insights?tab=org" replace />
        ) : (
          <MVPLayout><MyLeadership /></MVPLayout>
        )
      } />

      {/* Redirect old ExperienceManagement URL to new DevelopmentManager */}
      <Route path="/ExperienceManagement" element={<Navigate to="/DevelopmentManager" replace />} />

      {/* Legacy Dashboard — always accessible with full layout */}
      <Route path="/Dashboard" element={<LayoutWrapper currentPageName="Dashboard"><Pages.Dashboard /></LayoutWrapper>} />

      {/* MVP-specific routes */}
      <Route path="/my-leadership" element={<MVPLayout><MyLeadership /></MVPLayout>} />
      <Route path="/my-development" element={<MVPLayout><MyDevelopment /></MVPLayout>} />
      <Route path="/my-goals" element={<Navigate to="/my-performance" replace />} />
      <Route path="/experience-overview" element={<MVPLayout><ExperienceOverview /></MVPLayout>} />
      <Route path="/report-builder-mvp" element={<MVPLayout><ReportBuilderMVP /></MVPLayout>} />
      <Route path="/manager-detail/:id" element={<MVPLayout><ManagerDetail /></MVPLayout>} />

      {/* Shared pages — MVP users get MVPLayout, others get legacy LayoutWrapper */}
      <Route path="/Insights" element={mvpRole ? <MVPPage><Insights /></MVPPage> : <LayoutWrapper currentPageName="Insights"><Insights /></LayoutWrapper>} />
      <Route path="/ReportBuilder" element={mvpRole ? <MVPPage><ReportBuilder /></MVPPage> : <LayoutWrapper currentPageName="ReportBuilder"><ReportBuilder /></LayoutWrapper>} />
      <Route path="/Profile" element={mvpRole ? <MVPPage><Profile /></MVPPage> : <LayoutWrapper currentPageName="Profile"><Profile /></LayoutWrapper>} />
      <Route path="/Settings" element={mvpRole ? <MVPPage><Settings /></MVPPage> : <LayoutWrapper currentPageName="Settings"><Settings /></LayoutWrapper>} />
      <Route path="/Notifications" element={mvpRole ? <MVPPage><Notifications /></MVPPage> : <LayoutWrapper currentPageName="Notifications"><Notifications /></LayoutWrapper>} />
      <Route path="/PrivacySettings" element={mvpRole ? <MVPPage><PrivacySettings /></MVPPage> : <LayoutWrapper currentPageName="PrivacySettings"><PrivacySettings /></LayoutWrapper>} />
      <Route path="/AdminDataRestore" element={<AdminDataRestore />} />
      <Route path="/SeedLinkedInCourses" element={<SeedLinkedInCourses />} />
      <Route path="/OrgBusinessGoals" element={mvpRole ? <MVPPage><OrgBusinessGoals /></MVPPage> : <LayoutWrapper currentPageName="OrgBusinessGoals"><OrgBusinessGoals /></LayoutWrapper>} />
      <Route path="/PerformanceManager" element={mvpRole ? <MVPPage><PerformanceManager /></MVPPage> : <LayoutWrapper currentPageName="PerformanceManager"><PerformanceManager /></LayoutWrapper>} />
      <Route path="/my-performance" element={<MVPPage><MyPerformance /></MVPPage>} />

      {/* All other legacy pages — MVP users still get MVPLayout shell */}
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            mvpRole ? (
              <MVPPage><Page /></MVPPage>
            ) : (
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            )
          }
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
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
  )
}

export default App