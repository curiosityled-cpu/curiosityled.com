import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useAuth } from '@/components/useAuth';
import { withAuthProtection } from '@/components/hoc/withAuthProtection';
import { Button } from '@/components/ui/button';
import { Brain, FileEdit, BarChart3, User, Users, RefreshCw, FileText, FileDown, Loader2, ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import MVPPageLayout from '@/components/mvp/MVPPageLayout';

// Lazy load assessment views
const StandardAssessmentsView = lazy(() => import('@/components/assessments/StandardAssessmentsView'));
const AssessmentManagement = lazy(() => import('@/components/program-manager/AssessmentManagement'));
const MyCustomAssessmentsView = lazy(() => import('@/components/assessments/MyCustomAssessmentsView'));
const MyAssessmentsView = lazy(() => import('@/components/dashboard/assessments/MyAssessmentsView'));
const TeamAssessmentsView = lazy(() => import('@/components/dashboard/assessments/TeamAssessmentsView'));
const OrgAssessmentsView = lazy(() => import('@/components/dashboard/assessments/OrgAssessmentsView'));

function Assessments() {
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
    isPlatformAdmin,
    hasPermission
  } = useAuth();

  // ALL hooks must be called unconditionally at the top
  // Platform Admins should see org-wide analytics by default, not personal views
  const getInitialTab = () => {
    if (isPlatformAdmin || isSuperAdmin || isPartnerBusinessAdmin) {
      return 'analytics';
    }
    return 'my';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [loading, setLoading] = useState(false);
  const [assessmentCount, setAssessmentCount] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);

  // Calculate permissions once - ensure they're stable
  const permissions = useMemo(() => ({
    canViewPersonal: Boolean(hasPermission?.('personal.assessments.view')),
    canViewTeam: Boolean(hasPermission?.('team.assessments.view')),
    canViewOrg: Boolean(
      hasPermission?.('analytics.assessments.view') ||
      isProgramManager || isHRAdmin || isSuperAdmin || isPartnerBusinessAdmin || isPlatformAdmin
    ),
    canManageCustomAssessments: Boolean(
      isProgramManager || isHRAdmin || isSuperAdmin || isPartnerBusinessAdmin || isPlatformAdmin
    )
  }), [hasPermission, isProgramManager, isHRAdmin, isSuperAdmin, isPartnerBusinessAdmin, isPlatformAdmin]);

  // Build tabs array
  const allTabs = useMemo(() => {
    const tabs = [];
    if (permissions.canViewPersonal) tabs.push({ id: 'my', label: 'My Assessments', icon: User });
    if (permissions.canViewTeam) tabs.push({ id: 'team', label: 'Team', icon: Users });
    tabs.push({ id: 'standard', label: 'Validated', icon: Brain });
    tabs.push({ id: 'custom', label: 'Custom', icon: FileEdit });
    if (permissions.canViewOrg) tabs.push({ id: 'analytics', label: 'Analytics', icon: BarChart3 });
    return tabs;
  }, [permissions]);

  // Set correct initial tab after mount based on URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTab = params.get('tab');
    if (urlTab) {
      setActiveTab(urlTab);
    }
  }, []);

  // Load assessment stats
  useEffect(() => {
    const loadStats = async () => {
      try {
        const assessments = await base44.entities.Assessment.list();
        setAssessmentCount(assessments.length);
        const completed = assessments.filter(a => a.overall_pct != null).length;
        setCompletionRate(assessments.length > 0 ? Math.round((completed / assessments.length) * 100) : 0);
      } catch (err) {
        console.error('Error loading assessment stats:', err);
      }
    };
    loadStats();
  }, []);

  // Handle tab changes
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const assessments = await base44.entities.Assessment.list();
      setAssessmentCount(assessments.length);
      const completed = assessments.filter(a => a.overall_pct != null).length;
      setCompletionRate(assessments.length > 0 ? Math.round((completed / assessments.length) * 100) : 0);
      toast.success('Data refreshed');
    } catch (err) {
      toast.error('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    toast.success('CSV export started');
  };

  const handleExportPDF = () => {
    toast.success('PDF export started');
  };

  const visibleTabs = isOrgLeader ? [] : allTabs;

  return (
    <MVPPageLayout
      title="Assessments"
      subtitle="Manage and track leadership assessments across your organization."
      action={
        <div className="hidden sm:flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0202ff]/5 border border-[#0202ff]/15">
            <ClipboardList className="w-3.5 h-3.5 text-[#0202ff]" />
            <span className="text-xs font-medium text-[#0202ff]">{assessmentCount} Assessments</span>
            <span className="w-px h-3 bg-[#0202ff]/20" />
            <span className="text-xs font-medium text-[#0202ff]">{completionRate}% Complete</span>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="icon"
            title="Refresh data"
            disabled={loading}
            className="h-8 w-8"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            onClick={handleExportCSV}
            variant="outline"
            size="icon"
            title="Export to CSV"
            className="h-8 w-8"
          >
            <FileText className="w-3.5 h-3.5" />
          </Button>
          <Button
            onClick={handleExportPDF}
            variant="outline"
            size="icon"
            title="Export to PDF"
            className="h-8 w-8"
          >
            <FileDown className="w-3.5 h-3.5" />
          </Button>
        </div>
      }
    >
      {/* Mobile stats + actions */}
      <div className="sm:hidden flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0202ff]/5 border border-[#0202ff]/15">
          <ClipboardList className="w-3.5 h-3.5 text-[#0202ff]" />
          <span className="text-xs font-medium text-[#0202ff]">{assessmentCount} · {completionRate}%</span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleRefresh} variant="outline" size="icon" title="Refresh" disabled={loading} className="h-8 w-8">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={handleExportCSV} variant="outline" size="icon" title="Export CSV" className="h-8 w-8">
            <FileText className="w-3.5 h-3.5" />
          </Button>
          <Button onClick={handleExportPDF} variant="outline" size="icon" title="Export PDF" className="h-8 w-8">
            <FileDown className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Tab navigation */}
      {visibleTabs.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
            {visibleTabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-2 rounded-lg transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-white shadow-sm text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Content based on active tab */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        {activeTab === 'standard' && !isOrgLeader && (
          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-12 h-12 animate-spin" style={{ color: '#0202ff' }} /></div>}>
            <StandardAssessmentsView />
          </Suspense>
        )}

        {activeTab === 'custom' && !isOrgLeader && (
          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-12 h-12 animate-spin" style={{ color: '#0202ff' }} /></div>}>
            {permissions.canManageCustomAssessments ? (
              <AssessmentManagement />
            ) : (
              <MyCustomAssessmentsView />
            )}
          </Suspense>
        )}

        {activeTab === 'analytics' && (
          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-12 h-12 animate-spin" style={{ color: '#0202ff' }} /></div>}>
            <OrgAssessmentsView />
          </Suspense>
        )}

        {activeTab === 'my' && (
          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-12 h-12 animate-spin" style={{ color: '#0202ff' }} /></div>}>
            <MyAssessmentsView />
          </Suspense>
        )}

        {activeTab === 'team' && (
          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-12 h-12 animate-spin" style={{ color: '#0202ff' }} /></div>}>
            <TeamAssessmentsView />
          </Suspense>
        )}
      </motion.div>
    </MVPPageLayout>
  );
}

export default withAuthProtection(Assessments, [
  'User Level 1',
  'User Level 2',
  'Analyst',
  'Admin Level 1',
  'Admin Level 2',
  'Super Administrator',
  'Partner Business Administrator',
  'Platform Admin'
]);