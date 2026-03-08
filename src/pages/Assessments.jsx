import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useAuth } from '@/components/useAuth';
import { withAuthProtection } from '@/components/hoc/withAuthProtection';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, FileEdit, BarChart3, User, Users, RefreshCw, FileText, FileDown, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import SubNavMenu from '@/components/common/SubNavMenu';

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
    if (permissions.canViewTeam) tabs.push({ id: 'team', label: 'Team Assessments', icon: Users });
    tabs.push({ id: 'standard', label: 'Validated Assessments', icon: Brain });
    tabs.push({ id: 'custom', label: 'Custom Assessments', icon: FileEdit });
    if (permissions.canViewOrg) tabs.push({ id: 'analytics', label: 'Assessment Analytics', icon: BarChart3 });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="border-0 shadow-xl text-white" style={{ backgroundColor: '#0201ff' }}>
            <CardContent className="p-4 sm:p-6 md:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Assessments</h1>
                  <p className="opacity-90 text-sm sm:text-base">Manage and track leadership assessments across your organization</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {!isOrgLeader && allTabs.length > 0 && (
                    <SubNavMenu
                      items={allTabs}
                      activeId={activeTab}
                      onItemClick={handleTabChange}
                      variant="header"
                    />
                  )}
                  <Badge className="bg-white text-gray-800 border border-gray-200 hover:bg-gray-50">
                    {roleDisplayName || appRole}
                  </Badge>
                  <Badge className="bg-white text-gray-800 border border-gray-200 hover:bg-gray-50">
                    {assessmentCount} Assessments
                  </Badge>
                  <Badge className="bg-white text-gray-800 border border-gray-200 hover:bg-gray-50">
                    {completionRate}% Complete
                  </Badge>
                  <Button
                    onClick={handleRefresh}
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    title="Refresh data"
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button
                    onClick={handleExportCSV}
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    title="Export to CSV"
                  >
                    <FileText className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={handleExportPDF}
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    title="Export to PDF"
                  >
                    <FileDown className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>



        {/* Content based on active tab */}
        <div className="mt-6">
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
        </div>
      </div>
    </div>
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