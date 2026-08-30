import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Clock,
  CheckCircle,
  ArrowRight,
  Loader2,
  Target,
  Award,
  FileText,
  BarChart3,
  RefreshCw,
  Download,
  FileDown
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";
import PageHeader from "@/components/common/PageHeader";

import SubNavMenu from "@/components/common/SubNavMenu";
import MyAllExperiencesView from "@/components/dashboard/experiences/MyAllExperiencesView";
import TeamAllExperiencesView from "@/components/dashboard/experiences/TeamAllExperiencesView";
import { User, Users } from "lucide-react";

export default function MyExperiences() {
  const { user, hasPermission, hasTeamAccess, isPlatformAdmin, isSuperAdmin, isPartnerBusinessAdmin, loading: authLoading } = useAuth();
  
  // Platform Admins with team access should see team view by default
  const getInitialView = () => {
    if ((isPlatformAdmin || isSuperAdmin || isPartnerBusinessAdmin) && hasTeamAccess) {
      return 'team';
    }
    return 'my';
  };
  
  const [currentView, setCurrentView] = useState(getInitialView());
  const [loading, setLoading] = useState(true);
  const [journeys, setJourneys] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [onboardingPlans, setOnboardingPlans] = useState([]);
  const [assignedAssessments, setAssignedAssessments] = useState([]);
  const [assignedForms, setAssignedForms] = useState([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      loadData();
    }
  }, [authLoading, user]);

  const loadData = async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [journeysData, enrollmentsData, onboardingData, assessmentsData, formsData] = await Promise.all([
        base44.functions.invoke('getUserJourneys').then(r => r.data?.success ? r.data.journeys.assigned : []).catch(() => []),
        base44.entities.JourneyEnrollment.filter({ user_email: user.email }, '-enrolled_date').catch(() => []),
        base44.entities.OnboardingPlan.filter({ assigned_to_email: user.email }, '-created_date').catch(() => []),
        base44.entities.AssignedLearning.filter({ user_email: user.email }, '-created_date').catch(() => []),
        base44.entities.CustomForm.filter({ 
          assigned_to_emails: { $in: [user.email] },
          status: 'published'
        }).catch(() => [])
      ]);

      setJourneys(journeysData || []);
      setEnrollments(enrollmentsData || []);
      setOnboardingPlans(onboardingData || []);
      setAssignedAssessments(assessmentsData || []);
      setAssignedForms(formsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load experiences');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  const handleExportCSV = () => {
    setExporting(true);
    try {
      const csvData = [
        ['Experiences Report'],
        ['Generated:', new Date().toLocaleString()],
        [''],
        ['Learning Journeys'],
        ['Title', 'Type', 'Status', 'Progress'],
        ...journeys.map(j => {
          const enrollment = enrollments.find(e => e.journey_id === j.id);
          return [
            j.title || '',
            j.type || '',
            enrollment?.status || 'not_started',
            `${enrollment?.completion_percentage || 0}%`
          ];
        }),
        [''],
        ['Onboarding Plans'],
        ['Title', 'Target Role', 'Duration', 'Progress'],
        ...onboardingPlans.map(p => [
          p.title || '',
          p.target_role || '',
          `${p.duration_days} days`,
          `${p.completion_percentage || 0}%`
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your experiences...</p>
        </div>
      </div>
    );
  }

  if (!user || (!hasPermission('experiences.view_personal') && !hasPermission('experiences.view_team'))) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">Access Denied</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Use unified view components if Team Leader has both permissions
  if (hasTeamAccess && hasPermission('experiences.view_personal')) {
    const viewItems = [
      { id: 'my', label: 'My Experiences', icon: User },
      { id: 'team', label: 'Team Experiences', icon: Users }
    ];

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Custom Header matching Dashboard style */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">Experiences</h1>
                <p className="text-blue-100 text-sm sm:text-base">
                  {currentView === 'my' ? "Track your personal development experiences" : "Monitor team development experiences"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <SubNavMenu 
                  items={viewItems}
                  activeId={currentView}
                  onItemClick={setCurrentView}
                  variant="header"
                />
                <Badge className="bg-white text-blue-600 hover:bg-white">
                  Team Leader
                </Badge>
              </div>
            </div>
          </div>

          {currentView === 'my' && <MyAllExperiencesView user={user} />}
          {currentView === 'team' && <TeamAllExperiencesView />}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your experiences...</p>
        </div>
      </div>
    );
  }

  const completedJourneys = enrollments.filter(e => e.status === 'completed').length;
  const inProgressJourneys = enrollments.filter(e => e.status === 'in_progress').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PageHeader
          title="Learning Journey"
          subtitle="Track personal development experiences and progress"
          badges={[
            { text: `${journeys.length} Journeys`, className: "bg-white text-blue-600" },
            { text: `${completedJourneys} Completed`, className: "bg-white text-green-600" }
          ]}
          onRefresh={handleRefresh}
          onExportCSV={handleExportCSV}
          loadingRefresh={loading}
          loadingExportCSV={exporting}
          headerColor="#0201ff"
        />

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Journeys</p>
                  <p className="text-2xl font-bold text-gray-900">{inProgressJourneys}</p>
                </div>
                <BookOpen className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{completedJourneys}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Onboarding Plans</p>
                  <p className="text-2xl font-bold text-gray-900">{onboardingPlans.length}</p>
                </div>
                <Target className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Assigned Forms</p>
                  <p className="text-2xl font-bold text-gray-900">{assignedForms.length}</p>
                </div>
                <FileText className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Learning Journeys */}
        {journeys.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Learning Journeys</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {journeys.map((journey) => {
                const enrollment = enrollments.find(e => e.journey_id === journey.id);
                const progress = enrollment?.completion_percentage || 0;
                const status = enrollment?.status || 'not_started';

                return (
                  <motion.div
                    key={journey.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-lg">
                      <CardHeader>
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="outline" className="text-xs">
                            {journey.type === 'curriculum' ? 'Curriculum' : 'Learning Path'}
                          </Badge>
                          <Badge className={
                            status === 'completed' ? 'bg-green-100 text-green-800' :
                            status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {status.replace('_', ' ')}
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
                          </div>

                          {enrollment && (
                            <div>
                              <div className="flex items-center justify-between text-sm mb-2">
                                <span className="text-gray-600">Progress</span>
                                <span className="font-medium">{progress}%</span>
                              </div>
                              <Progress value={progress} className="h-2" />
                            </div>
                          )}

                          <Link to={`${createPageUrl('JourneyDetails')}?journeyId=${journey.id}`}>
                            <Button className="w-full bg-blue-600 hover:bg-blue-700">
                              {status === 'not_started' ? 'Start Journey' : 'Continue'}
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Onboarding Plans */}
        {onboardingPlans.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Onboarding Plans</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {onboardingPlans.map((plan) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <Badge className="bg-purple-100 text-purple-800">
                          {plan.target_role}
                        </Badge>
                        <Badge className={
                          plan.status === 'completed' ? 'bg-green-100 text-green-800' :
                          plan.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {plan.status}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl">{plan.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>{plan.duration_days} days</span>
                          <span>{plan.milestones?.length || 0} milestones</span>
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-gray-600">Progress</span>
                            <span className="font-medium">{plan.completion_percentage || 0}%</span>
                          </div>
                          <Progress value={plan.completion_percentage || 0} className="h-2" />
                        </div>
                        <Link to={`${createPageUrl('MyOnboarding')}?planId=${plan.id}`}>
                          <Button className="w-full bg-purple-600 hover:bg-purple-700">
                            View Plan
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Assigned Assessments */}
        {assignedAssessments.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Assigned Assessments</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {assignedAssessments.map((assessment) => (
                <Card key={assessment.id} className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg">{assessment.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Badge className={
                        assessment.status === 'completed' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }>
                        {assessment.status}
                      </Badge>
                      {assessment.due_date && (
                        <p className="text-sm text-gray-600">
                          Due: {new Date(assessment.due_date).toLocaleDateString()}
                        </p>
                      )}
                      <Button className="w-full bg-blue-600 hover:bg-blue-700">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        {assessment.status === 'completed' ? 'View Results' : 'Take Assessment'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Assigned Forms */}
        {assignedForms.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Assigned Forms</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {assignedForms.map((form) => (
                <Card key={form.id} className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg">{form.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600 line-clamp-2">{form.description}</p>
                      <Link to={`${createPageUrl('FormSubmission')}?formId=${form.id}`}>
                        <Button className="w-full bg-orange-600 hover:bg-orange-700">
                          <FileText className="w-4 h-4 mr-2" />
                          Complete Form
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {journeys.length === 0 && onboardingPlans.length === 0 && assignedAssessments.length === 0 && assignedForms.length === 0 && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Experiences Assigned Yet</h3>
              <p className="text-gray-600">
                When your manager or administrator assigns you learning experiences, they'll appear here.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}