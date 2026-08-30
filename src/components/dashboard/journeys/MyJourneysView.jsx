import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Map,
  Brain, 
  ArrowRight, 
  CheckCircle, 
  BookOpen,
  Plus,
  Loader2,
  UserPlus,
  BarChart3,
  Briefcase,
  Target,
  TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/components/useAuth";
import { base44 } from "@/api/base44Client";

export default function MyJourneysView() {
  const { user, hasRole, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignedJourneys, setAssignedJourneys] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [error, setError] = useState(null);

  const safeHasRole = (roles) => {
    try {
      if (!hasRole || typeof hasRole !== 'function') return false;
      return hasRole(roles);
    } catch (error) {
      return false;
    }
  };

  const canCreateJourneys = safeHasRole([
    'User Level 2', 'Admin Level 1', 'Admin Level 2', 'Super Administrator',
    'Partner Business Administrator', 'Platform Admin'
  ]);

  useEffect(() => {
    if (!authLoading && user) {
      loadJourneys();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, user]);

  const loadJourneys = async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let fetchedJourneys = [];
      try {
        const { data: journeysResponse } = await base44.functions.invoke('getUserJourneys');
        if (journeysResponse?.success && journeysResponse.journeys?.assigned) {
          fetchedJourneys = Array.isArray(journeysResponse.journeys.assigned) 
            ? journeysResponse.journeys.assigned : [];
        }
      } catch (e) {
        console.warn('Could not load journeys via function:', e);
      }
      setAssignedJourneys(fetchedJourneys);

      let fetchedEnrollments = [];
      try {
        const enrollmentsList = await base44.entities.JourneyEnrollment.list('-enrolled_date');
        if (Array.isArray(enrollmentsList)) {
          fetchedEnrollments = enrollmentsList.filter(e => e && e.user_email === user.email);
        }
      } catch (e) {
        console.warn('Could not load enrollments:', e);
      }
      setEnrollments(fetchedEnrollments);
    } catch (error) {
      setError(error.message || 'Failed to load experiences');
    } finally {
      setLoading(false);
    }
  };

  const getEnrollmentForJourney = (journeyId) => {
    if (!journeyId || !Array.isArray(enrollments)) return null;
    return enrollments.find(e => e && e.journey_id === journeyId) || null;
  };

  const getRoleBasedJourneys = () => {
    const journeys = [];

    if (safeHasRole('User Level 1')) {
      journeys.push(
        { id: "onboarding_user", title: "Your First 90 Days", description: "Start your leadership experience with personalized goal setting", icon: UserPlus, color: "bg-green-500", url: createPageUrl("MyOnboarding"), badge: "Start Experience" },
        { id: "assessment_user", title: "Assess → Coach → Act", description: "Take our leadership assessment and get AI-powered development plans", icon: Brain, color: "bg-purple-500", url: createPageUrl("Assessment"), badge: "Start Experience" },
        { id: "career_path_user", title: "Career Path Explorer", description: "Explore your next career move with personalized development plans", icon: TrendingUp, color: "bg-blue-500", url: createPageUrl("CareerPathExplorer"), badge: "Start Experience" }
      );
    }

    if (safeHasRole('User Level 2')) {
      journeys.push(
        { id: "onboarding_manager", title: "Onboarding Plan Builder", description: "Create and deploy personalized 90-day onboarding plans", icon: UserPlus, color: "bg-green-500", url: createPageUrl("OnboardingPlanBuilder"), badge: "In Progress" },
        { id: "journey_builder_manager", title: "Experience Builder", description: "Create custom learning curricula and paths for your team", icon: Map, color: "bg-indigo-500", url: createPageUrl("JourneyBuilder"), badge: "Start Experience" },
        { id: "command_center_manager", title: "Talent Insights Command Center", description: "Advanced analytics and decision support for team leaders", icon: Target, color: "bg-emerald-500", url: createPageUrl("CommandCenter"), badge: "Start Experience" }
      );
    }

    if (safeHasRole(['Admin Level 2', 'Super Administrator'])) {
      journeys.push(
        { id: "onboarding_hr", title: "Onboarding Plan Builder", description: "Create and deploy personalized 90-day onboarding plans", icon: UserPlus, color: "bg-green-500", url: createPageUrl("OnboardingPlanBuilder"), badge: "In Progress" },
        { id: "assessment_management_hr", title: "Assessment Management", description: "Deploy assessments and analyze leadership data", icon: BarChart3, color: "bg-purple-500", url: createPageUrl("HRAssessmentDashboard"), badge: "In Progress" },
        { id: "journey_builder_hr", title: "Experience Builder", description: "Create custom learning curricula", icon: Map, color: "bg-indigo-500", url: createPageUrl("JourneyBuilder"), badge: "Start Experience" },
        { id: "career_path_creator_hr", title: "Career Path Creator", description: "Design and manage career progression paths", icon: TrendingUp, color: "bg-blue-500", url: createPageUrl("CareerPathCreator"), badge: "Start Experience" }
      );
    }

    if (safeHasRole('Partner Business Administrator')) {
      journeys.push(
        { id: "onboarding_partner", title: "Onboarding Plan Builder", description: "Create and deploy onboarding plans for clients", icon: UserPlus, color: "bg-green-500", url: createPageUrl("OnboardingPlanBuilder"), badge: "In Progress" },
        { id: "journey_builder_partner", title: "Experience Builder", description: "Create learning paths for client organizations", icon: Map, color: "bg-indigo-500", url: createPageUrl("JourneyBuilder"), badge: "Start Experience" },
        { id: "command_center_partner", title: "Client Program Command Center", description: "Manage client programs and analytics", icon: Briefcase, color: "bg-emerald-500", url: createPageUrl("CommandCenter"), badge: "Start Experience" }
      );
    }

    return journeys;
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0202ff' }} />
      </div>
    );
  }

  if (!user) {
    return <div className="text-center py-12"><p className="text-gray-600">Please log in to view your experiences.</p></div>;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error: {error}</p>
        <Button onClick={loadJourneys} variant="outline" className="mt-4">Try Again</Button>
      </div>
    );
  }

  const builtInJourneys = getRoleBasedJourneys();
  const safeAssignedJourneys = Array.isArray(assignedJourneys) ? assignedJourneys : [];

  return (
    <div className="space-y-6">
      {/* Assigned Custom Learning Journeys */}
      {safeAssignedJourneys.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">My Assigned Programs</h3>
            <Link to={createPageUrl('MyJourneys')}>
              <Button variant="ghost" size="sm">View All <ArrowRight className="w-4 h-4 ml-1" /></Button>
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {safeAssignedJourneys.slice(0, 3).map((journey) => {
              if (!journey?.id) return null;
              const enrollment = getEnrollmentForJourney(journey.id);
              const progress = enrollment?.completion_percentage || 0;
              const status = enrollment?.status || 'not_started';
              const contentLength = Array.isArray(journey.content_structure) ? journey.content_structure.length : 0;

              return (
                <motion.div key={journey.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-lg">
                    <CardHeader className="text-center pb-4">
                      <div className="w-16 h-16 bg-blue-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-white" />
                      </div>
                      <Badge variant="outline" className="mb-2">{journey.type === 'curriculum' ? 'Curriculum' : 'Learning Path'}</Badge>
                      <CardTitle className="text-xl font-bold text-gray-900 mb-2">{journey.title || 'Untitled Experience'}</CardTitle>
                      <p className="text-gray-600 text-sm line-clamp-2">{journey.description || 'No description'}</p>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <div className="flex items-center gap-2"><BookOpen className="w-4 h-4" /><span>{contentLength} Resources</span></div>
                        </div>
                        {enrollment && (
                          <div>
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="text-gray-600">Progress</span>
                              <span className="font-medium">{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                            <Badge className={status === 'completed' ? 'bg-green-100 text-green-800 mt-2' : status === 'in_progress' ? 'bg-blue-100 text-blue-800 mt-2' : 'bg-gray-100 text-gray-800 mt-2'}>
                              {status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                              {status === 'completed' ? 'Completed' : status === 'in_progress' ? 'In Progress' : 'Not Started'}
                            </Badge>
                          </div>
                        )}
                        <Link to={createPageUrl('MyJourneys')} className="block">
                          <Button className="w-full font-medium bg-gray-900 hover:bg-gray-800 text-white">
                            {status === 'not_started' ? 'Start Experience' : 'Continue Experience'} <ArrowRight className="w-4 h-4 ml-2" />
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

      {/* Built-in Journey Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Your Platform Experiences</h3>
          {canCreateJourneys && (
            <Link to={createPageUrl('JourneyBuilder')}>
              <Button size="sm" style={{ backgroundColor: '#0202ff' }} className="text-white hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />Create New
              </Button>
            </Link>
          )}
        </div>
        {builtInJourneys.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {builtInJourneys.map((journey, index) => {
              if (!journey?.id) return null;
              const JourneyIcon = journey.icon || Map;
              return (
                <motion.div key={journey.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                  <Card className="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-lg">
                    <CardHeader className="text-center pb-4">
                      <div className={`w-16 h-16 ${journey.color || 'bg-blue-500'} rounded-2xl mx-auto mb-4 flex items-center justify-center`}>
                        <JourneyIcon className="w-8 h-8 text-white" />
                      </div>
                      {journey.badge && <Badge variant="outline" className="mb-2">{journey.badge}</Badge>}
                      <CardTitle className="text-xl font-bold text-gray-900 mb-2">{journey.title}</CardTitle>
                      <p className="text-gray-600 text-sm">{journey.description}</p>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Link to={journey.url || '#'} className="block">
                        <Button className="w-full font-medium bg-gray-900 hover:bg-gray-800 text-white">
                          {journey.badge === 'In Progress' ? 'Continue Experience' : 'Start Experience'} <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12"><p className="text-gray-600">No experiences available for your role.</p></div>
        )}
      </div>
    </div>
  );
}