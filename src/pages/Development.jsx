import React, { useState, useEffect, lazy, Suspense } from "react";
import { useAuth } from "@/components/useAuth";
import { BookOpen, Map, User, GraduationCap, Users, FileCheck, BarChart3, Target } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import PageHeader from "@/components/common/PageHeader";
import SubNavMenu from "@/components/common/SubNavMenu";
import DateRangeSelector from "@/components/performance/DateRangeSelector";
import { Tabs, TabsContent } from "@/components/ui/tabs";

// Lazy load page components
const LearningLibrary = lazy(() => import("./LearningLibrary"));
const CareerPathCreator = lazy(() => import("./CareerPathCreator"));
const CareerPathExplorer = lazy(() => import("./CareerPathExplorer"));
const LearningAnalyticsDashboard = lazy(() => import("./LearningAnalyticsDashboard"));
const MyLearning = lazy(() => import("./MyLearning"));
const TeamLearning = lazy(() => import("./TeamLearning"));
const TeamCareerPaths = lazy(() => import("./TeamCareerPaths"));
const ConversationalModulesLibrary = lazy(() => import("./ConversationalModulesLibrary"));
const BulkLearningOperations = lazy(() => import("./BulkLearningOperations"));
const CustomAssessmentBuilder = lazy(() => import("./CustomAssessmentBuilder"));
const CareerPathAnalytics = lazy(() => import("@/components/analytics/CareerPathAnalytics"));

export default function Development() {
    const { user, loading, isPlatformAdmin, isSuperAdmin, isOrgLeader, isManagerOfManagers, isProgramManager, isHRAdmin, isPartnerBusinessAdmin, appRole, roleDisplayName, hasPermission } = useAuth();
    
    // ALL useState calls - must ALWAYS be called in the same order, BEFORE any early returns
    const [activeTab, setActiveTab] = useState('learning-management');
    // Platform Admins should see analytics/management views by default
    const getInitialLearningTab = () => {
        if (isPlatformAdmin || isSuperAdmin || isPartnerBusinessAdmin) {
            return 'learning-analytics';
        }
        return 'learning-library';
    };
    const [learningSubTab, setLearningSubTab] = useState(getInitialLearningTab());
    const [careerSubTab, setCareerSubTab] = useState('career-explorer');
    const [metricsLoading, setMetricsLoading] = useState(false);
    const [exportingCSV, setExportingCSV] = useState(false);
    const [exportingPDF, setExportingPDF] = useState(false);
    
    // Date range state for each section
    const [learningDateRange, setLearningDateRange] = useState('6months');
    const [careerDateRange, setCareerDateRange] = useState('6months');
    const [showLearningCustomRange, setShowLearningCustomRange] = useState(false);
    const [showCareerCustomRange, setShowCareerCustomRange] = useState(false);
    const [learningCustomStart, setLearningCustomStart] = useState(null);
    const [learningCustomEnd, setLearningCustomEnd] = useState(null);
    const [careerCustomStart, setCareerCustomStart] = useState(null);
    const [careerCustomEnd, setCareerCustomEnd] = useState(null);
    
    // Metrics state
    const [learningMetrics, setLearningMetrics] = useState({ totalResources: 0, assignedLearning: 0, completionRate: 0 });
    const [careerMetrics, setCareerMetrics] = useState({ totalPaths: 0, totalRoles: 0, activeExplorations: 0 });

    useEffect(() => {
        if (user) {
            loadMetrics();
        }
    }, [user, activeTab]);
    
    // Show loading state while auth is initializing - AFTER all hooks are called
    if (loading || !user) {
        return (
            <div className="p-4 md:p-6 bg-gray-50 min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderBottomColor: '#0202ff' }}></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }
    
    // Compute values AFTER loading check but before render
    const isAdmin = isPlatformAdmin || isSuperAdmin || isOrgLeader;
    const canViewPersonalLearning = hasPermission('personal.development.view');
    const canViewAnalytics = hasPermission('analytics.development.view');
    const canViewCareerAnalytics = hasPermission('analytics.development.view');
    const canViewPersonalCareer = hasPermission('personal.development.view');
    const canViewCareerExplorer = canViewPersonalCareer || isProgramManager || isAdmin;

    const loadMetrics = async () => {
        setMetricsLoading(true);
        try {
            const [resources, assignedLearning, careerPaths, roles] = await Promise.all([
                base44.entities.LearningResource.list(),
                base44.entities.AssignedLearning.filter({ user_email: user.email }),
                base44.entities.CareerPath.list(),
                base44.entities.Role.list()
            ]);

            const completedCount = assignedLearning.filter(a => a.status === 'completed').length;
            const completionRate = assignedLearning.length > 0 
                ? Math.round((completedCount / assignedLearning.length) * 100) 
                : 0;

            setLearningMetrics({
                totalResources: resources.length,
                assignedLearning: assignedLearning.length,
                completionRate
            });

            setCareerMetrics({
                totalPaths: careerPaths.length,
                totalRoles: roles.length,
                activeExplorations: careerPaths.filter(p => p.is_platform_default || !p.client_id).length
            });
        } catch (error) {
            console.error('Error loading metrics:', error);
        } finally {
            setMetricsLoading(false);
        }
    };

    const handleRefresh = () => {
        loadMetrics();
        toast.success('Data refreshed');
    };

    const handleExportCSV = () => {
        setExportingCSV(true);
        try {
            const isLearning = activeTab === 'learning-management';
            const metrics = isLearning ? learningMetrics : careerMetrics;
            
            const csvData = [
                [`${isLearning ? 'Learning Management' : 'Career Paths'} Report`],
                ['Generated:', new Date().toLocaleString()],
                [''],
                ['Key Metrics'],
                ...(isLearning ? [
                    ['Total Resources', metrics.totalResources],
                    ['Assigned Learning', metrics.assignedLearning],
                    ['Completion Rate', `${metrics.completionRate}%`]
                ] : [
                    ['Total Career Paths', metrics.totalPaths],
                    ['Total Roles', metrics.totalRoles],
                    ['Active Explorations', metrics.activeExplorations]
                ])
            ];

            const csvContent = csvData.map(row => 
                Array.isArray(row) ? row.join(',') : row
            ).join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${isLearning ? 'learning-management' : 'career-paths'}-${new Date().toISOString().split('T')[0]}.csv`;
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
            const isLearning = activeTab === 'learning-management';
            toast.success('PDF export started - feature coming soon');
        } catch (error) {
            console.error('Error exporting PDF:', error);
            toast.error('Failed to export PDF');
        } finally {
            setExportingPDF(false);
        }
    };

    const getHeaderConfig = () => {
        if (activeTab === 'learning-management') {
            return {
                title: 'Learning Management',
                subtitle: 'Manage learning experiences, resources, and track progress',
                badges: [
                    { text: roleDisplayName || appRole, className: "bg-white text-purple-600" },
                    { text: `${learningMetrics.totalResources} Resources`, className: "bg-white text-blue-600" },
                    { text: `${learningMetrics.completionRate}% Completion`, className: "bg-white text-green-600" }
                ]
            };
        } else if (activeTab === 'careers') {
            return {
                title: 'Career Paths',
                subtitle: 'Explore career trajectories and role progressions',
                badges: [
                    { text: roleDisplayName || appRole, className: "bg-white text-purple-600" },
                    { text: `${careerMetrics.totalPaths} Paths`, className: "bg-white text-blue-600" },
                    { text: `${careerMetrics.totalRoles} Roles`, className: "bg-white text-green-600" }
                ]
            };
        } else {
            return {
                title: 'Development',
                subtitle: 'Manage your learning and career development',
                badges: [
                    { text: roleDisplayName || appRole, className: "bg-white text-purple-600" }
                ]
            };
        }
    };

    const headerConfig = getHeaderConfig();

    // View toggle tabs for main sections
    const mainTabs = [
        { id: 'learning-management', label: 'Learning Management', icon: GraduationCap },
        { id: 'careers', label: 'Career Paths', icon: Map }
    ];

    // Learning sub-tabs for hamburger menu
    const learningSubTabs = [
        ...(canViewPersonalLearning ? [{ id: 'my-learning', label: 'My Learning', icon: User }] : []),
        ...(isManagerOfManagers ? [{ id: 'team-learning', label: 'Team Learning', icon: Users }] : []),
        { id: 'learning-library', label: 'Learning Library', icon: BookOpen },
        { id: 'conversational-modules', label: 'Conversational Modules', icon: Map },
        ...(isPlatformAdmin || isSuperAdmin || isHRAdmin ? [{ id: 'bulk-operations', label: 'Bulk Operations', icon: Users }] : []),
        ...(canViewAnalytics ? [{ id: 'learning-analytics', label: 'Learning Analytics', icon: BarChart3 }] : [])
    ];

    // Career sub-tabs for hamburger menu
    const careerSubTabs = [
        ...(canViewCareerExplorer ? [{ id: 'career-explorer', label: 'Career Explorer', icon: Map }] : []),
        ...(isManagerOfManagers ? [{ id: 'team-career-paths', label: 'Team Career Paths', icon: Users }] : []),
        ...(canViewCareerAnalytics ? [{ id: 'career-analytics', label: 'Career Path Analytics', icon: BarChart3 }] : []),
        ...(isAdmin ? [{ id: 'career-creator', label: 'Path Creator', icon: Target }] : [])
    ];



    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <PageHeader
                    title={headerConfig.title}
                    subtitle={headerConfig.subtitle}
                    badges={headerConfig.badges}
                    onRefresh={handleRefresh}
                    onExportCSV={handleExportCSV}
                    onExportPDF={handleExportPDF}
                    loadingRefresh={metricsLoading}
                    loadingExportCSV={exportingCSV}
                    loadingExportPDF={exportingPDF}
                    additionalHeaderContent={
                        <>
                            {mainTabs.length > 1 && (
                                <SubNavMenu
                                    items={mainTabs}
                                    activeId={activeTab}
                                    onItemClick={setActiveTab}
                                />
                            )}
                        </>
                    }
                />

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <div className="hidden"></div>

                    <TabsContent value="learning-management" className="space-y-6">
                        <div className="space-y-6">
                            {/* Sub-nav menu in content area for Learning Management */}
                            {!isOrgLeader && learningSubTabs.length > 1 && (
                                <div className="flex justify-end">
                                    <SubNavMenu
                                        items={learningSubTabs}
                                        activeId={learningSubTab}
                                        onItemClick={setLearningSubTab}
                                        variant="content"
                                    />
                                </div>
                            )}

                            {isOrgLeader && (
                                <Suspense fallback={<div className="flex justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderBottomColor: '#0202ff' }}></div></div>}>
                                    <LearningAnalyticsDashboard dateRange={learningDateRange} customStartDate={learningCustomStart} customEndDate={learningCustomEnd} />
                                </Suspense>
                            )}

                            {!isOrgLeader && canViewPersonalLearning && learningSubTab === 'my-learning' && (
                                <Suspense fallback={<div className="flex justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderBottomColor: '#0202ff' }}></div></div>}>
                                    <MyLearning />
                                </Suspense>
                            )}

                            {!isOrgLeader && isManagerOfManagers && learningSubTab === 'team-learning' && (
                                <Suspense fallback={<div className="flex justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderBottomColor: '#0202ff' }}></div></div>}>
                                    <TeamLearning />
                                </Suspense>
                            )}

                            {!isOrgLeader && learningSubTab === 'learning-library' && (
                                <Suspense fallback={<div className="flex justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderBottomColor: '#0202ff' }}></div></div>}>
                                    <LearningLibrary />
                                </Suspense>
                            )}

                            {!isOrgLeader && learningSubTab === 'conversational-modules' && (
                                <Suspense fallback={<div className="flex justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderBottomColor: '#0202ff' }}></div></div>}>
                                    <ConversationalModulesLibrary />
                                </Suspense>
                            )}

                            {!isOrgLeader && (isPlatformAdmin || isSuperAdmin || isHRAdmin) && learningSubTab === 'bulk-operations' && (
                                <Suspense fallback={<div className="flex justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderBottomColor: '#0202ff' }}></div></div>}>
                                    <BulkLearningOperations />
                                </Suspense>
                            )}

                            {!isOrgLeader && canViewAnalytics && learningSubTab === 'learning-analytics' && (
                                <Suspense fallback={<div className="flex justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderBottomColor: '#0202ff' }}></div></div>}>
                                    <LearningAnalyticsDashboard dateRange={learningDateRange} customStartDate={learningCustomStart} customEndDate={learningCustomEnd} />
                                </Suspense>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="careers" className="space-y-6">
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <div className="flex justify-end">
                                    <DateRangeSelector
                                        dateRange={careerDateRange}
                                        customStartDate={careerCustomStart}
                                        customEndDate={careerCustomEnd}
                                        showCustomRange={showCareerCustomRange}
                                        onDateRangeChange={setCareerDateRange}
                                        onCustomStartDateChange={setCareerCustomStart}
                                        onCustomEndDateChange={setCareerCustomEnd}
                                        onShowCustomRangeChange={setShowCareerCustomRange}
                                    />
                                </div>
                                {!isOrgLeader && careerSubTabs.length > 1 && (
                                    <SubNavMenu
                                        items={careerSubTabs}
                                        activeId={careerSubTab}
                                        onItemClick={setCareerSubTab}
                                        variant="content"
                                    />
                                )}
                            </div>

                            {isOrgLeader && (
                                <Suspense fallback={<div className="flex justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderBottomColor: '#0202ff' }}></div></div>}>
                                    <CareerPathAnalytics scope="org" dateRange={careerDateRange} customStartDate={careerCustomStart} customEndDate={careerCustomEnd} />
                                </Suspense>
                            )}

                            {!isOrgLeader && canViewCareerExplorer && careerSubTab === 'career-explorer' && (
                                <Suspense fallback={<div className="flex justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderBottomColor: '#0202ff' }}></div></div>}>
                                    <CareerPathExplorer />
                                </Suspense>
                            )}

                            {!isOrgLeader && isManagerOfManagers && careerSubTab === 'team-career-paths' && (
                                <Suspense fallback={<div className="flex justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderBottomColor: '#0202ff' }}></div></div>}>
                                    <TeamCareerPaths />
                                </Suspense>
                            )}

                            {!isOrgLeader && canViewCareerAnalytics && careerSubTab === 'career-analytics' && (
                                <Suspense fallback={<div className="flex justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderBottomColor: '#0202ff' }}></div></div>}>
                                    <CareerPathAnalytics 
                                        scope={isManagerOfManagers && !isOrgLeader ? 'team' : 'org'} 
                                        dateRange={careerDateRange}
                                        customStartDate={careerCustomStart}
                                        customEndDate={careerCustomEnd}
                                    />
                                </Suspense>
                            )}

                            {!isOrgLeader && isAdmin && careerSubTab === 'career-creator' && (
                                <Suspense fallback={<div className="flex justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderBottomColor: '#0202ff' }}></div></div>}>
                                    <CareerPathCreator />
                                </Suspense>
                            )}
                        </div>
                    </TabsContent>

                </Tabs>
            </div>
        </div>
    );

}