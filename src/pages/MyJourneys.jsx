import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Map,
  BookOpen,
  Plus,
  Edit2,
  Users,
  Clock,
  CheckCircle,
  ArrowRight,
  Loader2,
  Target,
  Award,
  GraduationCap,
  User,
  Route
} from "lucide-react";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";
import PageHeader from "@/components/common/PageHeader";
import MyAllExperiencesView from "@/components/dashboard/experiences/MyAllExperiencesView";
import TeamAllExperiencesView from "@/components/dashboard/experiences/TeamAllExperiencesView";
import JourneyManagementDashboard from "@/components/program-manager/JourneyManagementDashboard";

export default function MyJourneys() {
  const { user, hasRole, roleDisplayName, appRole, loading: authLoading, hasTeamAccess, isProgramManager, isPlatformAdmin, isSuperAdmin, isHRAdmin, isPartnerBusinessAdmin, hasPermission } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [assignedJourneys, setAssignedJourneys] = useState([]);
  const [createdJourneys, setCreatedJourneys] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [exporting, setExporting] = useState(false);
  
  // Journey Management access check
  const canViewJourneyManagement = isProgramManager || isPlatformAdmin || isSuperAdmin || isHRAdmin || isPartnerBusinessAdmin || 
    hasPermission('classes.view') || hasPermission('coaching.view') || hasPermission('programs.view');

  // Initialize activeTab from URL hash - default based on available permissions
  const getInitialTab = () => {
    const hash = location.hash.replace('#', '');
    const validTabs = ['assigned', 'team', 'journeys', 'programs'];
    if (validTabs.includes(hash)) return hash;
    
    // Default to first available tab based on permissions
    if (hasPermission('programs.view')) return 'programs';
    if (hasPermission('personal.journeys.view') || hasPermission('experiences.view_personal')) return 'assigned';
    if (hasPermission('team.journeys.view') || hasPermission('experiences.view_team')) return 'team';
    
    return 'assigned'; // Fallback
  };
  const [activeTab, setActiveTab] = useState(getInitialTab);

  // Update activeTab when URL hash changes
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    const validTabs = ['assigned', 'team', 'journeys', 'programs'];
    if (validTabs.includes(hash)) {
      setActiveTab(hash);
    }
  }, [location.hash]);

  // Determine which tabs to show based on explicit add-on permissions
  const showMyExperiences = hasPermission('personal.journeys.view') || hasPermission('experiences.view_personal');
  const showTeamExperiences = hasPermission('team.journeys.view') || hasPermission('experiences.view_team');
  const canCreateJourneys = hasPermission('personal.journeys.view') && (appRole === 'User Level 1' || appRole === 'User Level 2');
  const canManagePrograms = hasPermission('programs.view');

  useEffect(() => {
    if (!authLoading && user) {
      loadJourneys();
    }
  }, [authLoading, user]);

  const loadJourneys = async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: journeysResponse } = await base44.functions.invoke('getUserJourneys');
      
      if (journeysResponse?.success) {
        setAssignedJourneys(journeysResponse.journeys.assigned || []);
        setCreatedJourneys(journeysResponse.journeys.created || []);
      } else {
        throw new Error(journeysResponse?.error || 'Failed to load journeys');
      }

      try {
        const enrollmentsList = await base44.entities.JourneyEnrollment.list('-enrolled_date');
        const userEnrollments = enrollmentsList.filter(e => e.user_email === user.email);
        setEnrollments(userEnrollments || []);
      } catch (enrollError) {
        console.warn('Could not load enrollments:', enrollError);
        setEnrollments([]);
      }

    } catch (error) {
      console.error('Error loading journeys:', error);
      toast.error('Failed to load experiences');
      setAssignedJourneys([]);
      setCreatedJourneys([]);
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadJourneys();
  };

  const handleExportCSV = () => {
    setExporting(true);
    try {
      const csvData = [
        ['Experiences Report'],
        ['Generated:', new Date().toLocaleString()],
        [''],
        ['Assigned Experiences'],
        ['Title', 'Type', 'Status', 'Progress', 'Resources'],
        ...assignedJourneys.map(j => {
          const enrollment = getEnrollmentForJourney(j.id);
          return [
            j.title || '',
            j.type || '',
            enrollment?.status || 'not_started',
            `${enrollment?.completion_percentage || 0}%`,
            j.content_structure?.length || 0
          ];
        }),
        [''],
        ['Created Experiences'],
        ['Title', 'Type', 'Status', 'Learners', 'Resources'],
        ...createdJourneys.map(j => [
          j.title || '',
          j.type || '',
          j.status || '',
          j.assigned_to_emails?.length || 0,
          j.content_structure?.length || 0
        ])
      ];

      const csvContent = csvData.map(row => 
        Array.isArray(row) ? row.join(',') : row
      ).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-experiences-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('CSV exported successfully!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const getEnrollmentForJourney = (journeyId) => {
    return enrollments.find(e => e.journey_id === journeyId);
  };

  const JourneyCard = ({ journey, isCreated = false }) => {
    const enrollment = getEnrollmentForJourney(journey.id);
    const progress = enrollment?.completion_percentage || 0;
    const status = enrollment?.status || 'not_started';

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-start justify-between mb-2">
              <Badge variant="outline" className="text-xs">
                {journey.type === 'curriculum' ? 'Curriculum' : 'Learning Path'}
              </Badge>
              <Badge
                className={
                  journey.status === 'published'
                    ? 'bg-green-100 text-green-800'
                    : journey.status === 'draft'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-red-100 text-red-800'
                }
              >
                {journey.status}
              </Badge>
            </div>
            <CardTitle className="text-xl line-clamp-2">{journey.title}</CardTitle>
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
              {journey.description}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <BookOpen className="w-4 h-4" />
                  <span>{journey.content_structure?.length || 0} Resources</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{journey.estimated_duration_days || 0} days</span>
                </div>
                {isCreated && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{journey.assigned_to_emails?.length || 0} learners</span>
                  </div>
                )}
              </div>

              {!isCreated && enrollment && (
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex items-center gap-2 mt-2">
                    {status === 'completed' && (
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                    {status === 'in_progress' && (
                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        In Progress
                      </Badge>
                    )}
                    {status === 'not_started' && (
                      <Badge variant="outline" className="text-xs">
                        Not Started
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {isCreated ? (
                  <>
                    <Link to={createPageUrl('JourneyBuilder') + `?journeyId=${journey.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </Link>
                    <Link to={createPageUrl('JourneyDetails') + `?journeyId=${journey.id}`} className="flex-1">
                      <Button variant="secondary" className="w-full">
                        <Users className="w-4 h-4 mr-2" />
                        Manage
                      </Button>
                    </Link>
                  </>
                ) : (
                  <Link to={createPageUrl('JourneyDetails') + `?journeyId=${journey.id}`} className="w-full">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      {status === 'not_started' ? 'Start Experience' : 'Continue Experience'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your experiences...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">Please log in to view your experiences.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedCount = enrollments.filter(e => e.status === 'completed').length;
  const inProgressCount = enrollments.filter(e => e.status === 'in_progress').length;

  // Adaptive header content based on active tab
  const getHeaderContent = () => {
    switch (activeTab) {
      case 'team':
        return {
          title: 'Team Experiences',
          subtitle: "Track your team's learning experience progress",
          badges: [
            { text: roleDisplayName || appRole, className: "bg-white text-[#0201ff]" }
          ]
        };
      case 'journeys':
        return {
          title: 'Journeys',
          subtitle: 'Create and manage your personal learning journeys',
          badges: [
            { text: roleDisplayName || appRole, className: "bg-white text-[#0201ff]" },
            { text: `${createdJourneys.length} Journeys`, className: "bg-white text-purple-600" }
          ]
        };
      case 'programs':
        return {
          title: 'Programs',
          subtitle: 'Manage programs, classes, coaching, and participants',
          badges: [
            { text: roleDisplayName || appRole, className: "bg-white text-[#0201ff]" }
          ]
        };
      default: // 'assigned'
        return {
          title: 'Experiences',
          subtitle: 'Track progress and manage learning programs',
          badges: [
            { text: roleDisplayName || appRole, className: "bg-white text-[#0201ff]" },
            { text: `${assignedJourneys.length} Assigned`, className: "bg-white text-blue-600" },
            { text: `${completedCount} Completed`, className: "bg-white text-green-600" }
          ]
        };
    }
  };

  const headerContent = getHeaderContent();

  // Check if user has access to any tabs
  const hasAnyAccess = showMyExperiences || showTeamExperiences || canCreateJourneys || canManagePrograms;

  if (!hasAnyAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-md">
              <Map className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Experience Access</h3>
              <p className="text-gray-600">You don't have permissions to view any experiences. Please contact your administrator to request access.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <PageHeader
          title={headerContent.title}
          subtitle={headerContent.subtitle}
          badges={headerContent.badges}
          onRefresh={handleRefresh}
          onExportCSV={handleExportCSV}
          loadingRefresh={loading}
          loadingExportCSV={exporting}
          headerColor="#0201ff"
        />

        {/* Tabs */}
        <Tabs defaultValue={getInitialTab()} value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            {/* My Experiences - requires User Add-on permission */}
            {showMyExperiences && (
              <TabsTrigger value="assigned" className="gap-2">
                <User className="w-4 h-4" />
                Experiences
                {assignedJourneys.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {assignedJourneys.length}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            {/* Team Experiences - requires Team Leader Add-on permission */}
            {showTeamExperiences && (
              <TabsTrigger value="team" className="gap-2">
                <Users className="w-4 h-4" />
                Team Experiences
              </TabsTrigger>
            )}
            {/* Personal Journey Creation - for User roles only */}
            {canCreateJourneys && (
              <TabsTrigger value="journeys" className="gap-2">
                <Map className="w-4 h-4" />
                Journeys
              </TabsTrigger>
            )}
            {/* Programs Management - requires Program Management permission */}
            {canManagePrograms && (
              <TabsTrigger value="programs" className="gap-2">
                <Route className="w-4 h-4" />
                Programs
              </TabsTrigger>
            )}
            </TabsList>

          {showMyExperiences && (
            <TabsContent value="assigned">
              <MyAllExperiencesView user={user} />
            </TabsContent>
          )}

          {showTeamExperiences && (
            <TabsContent value="team">
              <TeamAllExperiencesView />
            </TabsContent>
          )}

          {canCreateJourneys && (
            <TabsContent value="journeys">
              {/* Action Cards */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {/* Onboarding Plan Card */}
                <Link to={createPageUrl('OnboardingPlanBuilder')}>
                  <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full">
                    <CardContent className="p-8 flex flex-col items-center justify-center text-center h-full">
                      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                        <Target className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Onboarding Plan
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Create structured onboarding plans for yourself
                      </p>
                      <Button className="bg-green-600 hover:bg-green-700">
                        <Plus className="w-4 h-4 mr-2" />
                        New Plan
                      </Button>
                    </CardContent>
                  </Card>
                </Link>

                {/* Journey Card */}
                <Link to={createPageUrl('JourneyBuilder')}>
                  <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full">
                    <CardContent className="p-8 flex flex-col items-center justify-center text-center h-full">
                      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                        <Map className="w-8 h-8 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Learning Journey
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Build a personal learning path or curriculum
                      </p>
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        New Journey
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              </div>

              {/* Created Journeys List */}
              {createdJourneys.length > 0 && (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Journeys</h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {createdJourneys.map((journey) => (
                      <JourneyCard key={journey.id} journey={journey} isCreated />
                    ))}
                  </div>
                </>
              )}
            </TabsContent>
          )}

          {canManagePrograms && (
            <TabsContent value="programs">
              <JourneyManagementDashboard />
            </TabsContent>
          )}

          </Tabs>
      </div>
    </div>
  );
}