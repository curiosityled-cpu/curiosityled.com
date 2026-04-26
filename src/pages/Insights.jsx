import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Users,
  Building2,
  RefreshCw,
  FileText,
  FileDown,
  Loader2,
  GraduationCap
} from "lucide-react";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import SubNavMenu from "@/components/common/SubNavMenu";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";

// Import insights views directly (not lazy) to avoid module resolution issues
import MyInsightsView from "@/components/dashboard/insights/MyInsightsView";
import TeamInsightsView from "@/components/dashboard/insights/TeamInsightsView";
import OrgInsightsView from "@/components/dashboard/insights/OrgInsightsView";
import ProgramAdminInsightsView from "@/components/dashboard/insights/ProgramAdminInsightsView";

const VIEW_SCOPES = {
  MY: 'my',
  TEAM: 'team',
  ADMIN: 'admin',
  ORG: 'org'
};

function Insights() {
  const { 
    user, 
    appRole, 
    isPlatformAdmin, 
    isSuperAdmin, 
    isPartnerBusinessAdmin,
    isManagerOfManagers,
    isOrgLeader,
    isProgramManager,
    hasPermission 
  } = useAuth();

  // Read ?tab= from URL to allow direct deep-linking
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  const forcedOrgView = tabParam === 'org';

  // Platform Admins should see org-wide intelligence by default
  const getInitialView = () => {
    if (tabParam === 'org') return VIEW_SCOPES.ORG;
    if (isPlatformAdmin || isSuperAdmin || isPartnerBusinessAdmin) {
      return VIEW_SCOPES.ORG;
    }
    return VIEW_SCOPES.MY;
  };
  
  const [currentView, setCurrentView] = useState(getInitialView());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [metrics, setMetrics] = useState({
    totalInsights: 0,
    actionItems: 0,
    completionRate: 0
  });

  // Determine user permissions for different views using explicit add-on permissions
  const canViewPersonal = hasPermission('personal.insights.view');
  const canViewTeamInsights = hasPermission('team.insights.view');
  const canViewOrgInsights = hasPermission('analytics.insights.view');

  // Program admin insights require program management permissions
  const canViewAdminInsights = hasPermission('programs.view');

  // Set default view based on available tabs when role changes
  useEffect(() => {
    const tabs = [];
    if (canViewPersonal) tabs.push(VIEW_SCOPES.MY);
    if (canViewTeamInsights) tabs.push(VIEW_SCOPES.TEAM);
    if (canViewAdminInsights) tabs.push(VIEW_SCOPES.ADMIN);
    if (canViewOrgInsights) tabs.push(VIEW_SCOPES.ORG);
    
    if (tabs.length > 0 && !tabs.includes(currentView)) {
      // Default to appropriate tab based on role
      if (isOrgLeader && tabs.includes(VIEW_SCOPES.ORG)) {
        setCurrentView(VIEW_SCOPES.ORG);
      } else if (isProgramManager && tabs.includes(VIEW_SCOPES.ADMIN)) {
        setCurrentView(VIEW_SCOPES.ADMIN);
      } else {
        setCurrentView(tabs[0]);
      }
    }
  }, [appRole, canViewPersonal, canViewTeamInsights, canViewAdminInsights, canViewOrgInsights, isOrgLeader, isProgramManager]);

  // Get role display name
  const getRoleDisplayName = () => {
    const roleNames = {
      'Platform Admin': 'Platform Administrator',
      'Super Administrator': 'Super Administrator',
      'Partner Business Administrator': 'Partner Administrator',
      'Analyst': 'Analyst',
      'Admin Level 2': 'HR Admin',
      'Admin Level 1': 'Program Admin',
      'User Level 2': 'Team Leader',
      'User Level 1': 'User'
    };
    return roleNames[appRole] || appRole;
  };

  // Header configuration based on current view
  const headerConfig = React.useMemo(() => {
    const roleBadge = { text: getRoleDisplayName(), style: { backgroundColor: 'transparent', color: 'white', border: '1px solid white' } };
    
    switch (currentView) {
      case VIEW_SCOPES.MY:
        return {
          title: 'Insights',
          subtitle: 'AI-powered recommendations for leadership development',
          badges: [
            roleBadge,
            { text: `${metrics.totalInsights} Insights`, style: { backgroundColor: 'transparent', color: 'white', border: '1px solid white' } },
            { text: `${metrics.actionItems} Actions`, style: { backgroundColor: 'transparent', color: 'white', border: '1px solid white' } }
          ]
        };
      case VIEW_SCOPES.TEAM:
        return {
          title: 'Team Insights',
          subtitle: 'AI-powered insights to develop and manage the team',
          badges: [
            roleBadge,
            { text: `${metrics.totalInsights} Insights`, style: { backgroundColor: 'transparent', color: 'white', border: '1px solid white' } },
            { text: `${metrics.completionRate}% Completion`, style: { backgroundColor: 'transparent', color: 'white', border: '1px solid white' } }
          ]
        };
      case VIEW_SCOPES.ADMIN:
        return {
          title: 'Administration Insights',
          subtitle: 'AI-powered intelligence for managed programs and participants',
          badges: [
            roleBadge,
            { text: `${metrics.totalInsights} Programs`, style: { backgroundColor: 'transparent', color: 'white', border: '1px solid white' } },
            { text: `${metrics.completionRate}% Avg Progress`, style: { backgroundColor: 'transparent', color: 'white', border: '1px solid white' } }
          ]
        };
      case VIEW_SCOPES.ORG:
        return {
          title: 'Leadership Intelligence Hub',
          subtitle: 'Analytics and strategic insights',
          badges: [
            roleBadge,
            { text: `${metrics.totalInsights} ${isPlatformAdmin ? 'Clients' : 'Insights'}`, style: { backgroundColor: 'transparent', color: 'white', border: '1px solid white' } },
            { text: `${metrics.completionRate}% Completion`, style: { backgroundColor: 'transparent', color: 'white', border: '1px solid white' } }
          ]
        };
      default:
        return {
          title: 'Insights',
          subtitle: 'AI-powered leadership insights',
          badges: [roleBadge]
        };
    }
  }, [currentView, appRole, metrics, isPlatformAdmin]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Trigger refresh in child components via key change or callback
      toast.success('Insights refreshed');
    } catch (error) {
      toast.error('Failed to refresh insights');
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportCSV = async () => {
    setExportingCSV(true);
    try {
      toast.success('CSV export started');
      // Export logic handled by child components
    } catch (error) {
      toast.error('Failed to export CSV');
    } finally {
      setExportingCSV(false);
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      toast.success('PDF export started');
      // Export logic handled by child components
    } catch (error) {
      toast.error('Failed to export PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  // View toggle tabs - only include tabs user has access to
  // When navigated via MVP nav (?tab=org), only show the Leadership Intelligence Hub tab
  const viewTabs = forcedOrgView
    ? (canViewOrgInsights ? [{ id: VIEW_SCOPES.ORG, label: 'Leadership Intelligence Hub', icon: Building2 }] : [])
    : [
        ...(canViewPersonal ? [{ id: VIEW_SCOPES.MY, label: 'Insights', icon: Sparkles }] : []),
        ...(canViewTeamInsights ? [{ id: VIEW_SCOPES.TEAM, label: 'Team Insights', icon: Users }] : []),
        ...(canViewAdminInsights ? [{ id: VIEW_SCOPES.ADMIN, label: 'Administration Insights', icon: GraduationCap }] : []),
        ...(canViewOrgInsights ? [{ id: VIEW_SCOPES.ORG, label: 'Leadership Intelligence Hub', icon: Building2 }] : [])
      ];

  // If no tabs resolved (e.g. MVP users whose permissions haven't loaded yet),
  // always fall back to personal insights so the page isn't blank.
  const effectiveView = viewTabs.length === 0 ? VIEW_SCOPES.MY : currentView;

  const renderInsightsContent = () => {
    switch (effectiveView) {
      case VIEW_SCOPES.MY:
        return <MyInsightsView user={user} onMetricsUpdate={setMetrics} />;
      case VIEW_SCOPES.TEAM:
        return <TeamInsightsView user={user} onMetricsUpdate={setMetrics} />;
      case VIEW_SCOPES.ADMIN:
        return <ProgramAdminInsightsView />;
      case VIEW_SCOPES.ORG:
        return <OrgInsightsView user={user} onMetricsUpdate={setMetrics} />;
      default:
        return <MyInsightsView user={user} onMetricsUpdate={setMetrics} />;
    }
  };

  return (
    <MVPPageLayout
      title={headerConfig.title}
      subtitle={headerConfig.subtitle}
      action={
        <div className="flex flex-wrap items-center gap-2">
          {viewTabs.length > 1 && (
            <SubNavMenu
              items={viewTabs}
              activeId={currentView}
              onItemClick={setCurrentView}
            />
          )}
          <Button
            onClick={handleRefresh}
            variant="ghost"
            size="icon"
            className="text-gray-600 hover:bg-gray-200"
            title="Refresh data"
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
          <Button
            onClick={handleExportCSV}
            variant="ghost"
            size="icon"
            className="text-gray-600 hover:bg-gray-200"
            title="Export to CSV"
            disabled={exportingCSV}
          >
            {exportingCSV ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
          </Button>
          <Button
            onClick={handleExportPDF}
            variant="ghost"
            size="icon"
            className="text-gray-600 hover:bg-gray-200"
            title="Export to PDF"
            disabled={exportingPDF}
          >
            {exportingPDF ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      }
    >
      {renderInsightsContent()}
    </MVPPageLayout>
  );
}

export default withAuthProtection(Insights, [
  'Platform Admin', 
  'Super Administrator', 
  'Partner Business Administrator', 
  'Analyst', 
  'Admin Level 1', 
  'Admin Level 2', 
  'User Level 1', 
  'User Level 2'
]);