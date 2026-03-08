import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Map, BookOpen, Users, GraduationCap, MessageSquare, Calendar,
  Clock, CheckCircle, ArrowRight, Loader2, Target, Video, MapPin
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { format, isPast, isFuture, isToday } from "date-fns";

export default function MyAllExperiencesView({ user }) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  
  // Data states
  const [journeyEnrollments, setJourneyEnrollments] = useState([]);
  const [journeys, setJourneys] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [classes, setClasses] = useState([]);
  const [coachingSessions, setCoachingSessions] = useState([]);
  const [onboardingPlans, setOnboardingPlans] = useState([]);

  useEffect(() => {
    if (user?.email) {
      loadAllExperiences();
    }
  }, [user?.email]);

  const loadAllExperiences = async () => {
    setLoading(true);
    try {
      const [enrollmentsData, journeysData, programsData, classesData, coachingData, onboardingData] = await Promise.all([
        base44.entities.JourneyEnrollment.filter({ user_email: user.email }),
        base44.entities.LearningJourney.list('-created_date'),
        base44.entities.Program.list('-created_date'),
        base44.entities.Class.list('-scheduled_date'),
        base44.entities.CoachingSession.filter({ coachee_email: user.email }, '-scheduled_date'),
        base44.entities.OnboardingPlan.filter({ assigned_to_email: user.email })
      ]);

      setJourneyEnrollments(enrollmentsData || []);
      setJourneys(journeysData || []);
      
      // Filter programs user is enrolled in
      const userPrograms = (programsData || []).filter(p => 
        p.participant_emails?.includes(user.email)
      );
      setPrograms(userPrograms);

      // Filter classes user is enrolled in
      const userClasses = (classesData || []).filter(c => 
        c.enrolled_emails?.includes(user.email)
      );
      setClasses(userClasses);

      setCoachingSessions(coachingData || []);
      setOnboardingPlans(onboardingData || []);
    } catch (error) {
      console.error('Error loading experiences:', error);
    } finally {
      setLoading(false);
    }
  };

  const getJourneyForEnrollment = (enrollmentId) => {
    const enrollment = journeyEnrollments.find(e => e.id === enrollmentId);
    return journeys.find(j => j.id === enrollment?.journey_id);
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      'completed': 'bg-green-100 text-green-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'not_started': 'bg-gray-100 text-gray-800',
      'scheduled': 'bg-purple-100 text-purple-800',
      'active': 'bg-blue-100 text-blue-800',
      'confirmed': 'bg-green-100 text-green-800'
    };
    return statusStyles[status] || 'bg-gray-100 text-gray-800';
  };

  // Calculate stats
  const totalExperiences = journeyEnrollments.length + programs.length + classes.length + coachingSessions.length + onboardingPlans.length;
  const completedCount = journeyEnrollments.filter(e => e.status === 'completed').length +
    classes.filter(c => c.status === 'completed').length +
    coachingSessions.filter(c => c.status === 'completed').length +
    onboardingPlans.filter(o => o.status === 'completed').length;
  const upcomingClasses = classes.filter(c => c.scheduled_date && isFuture(new Date(c.scheduled_date))).length;
  const upcomingSessions = coachingSessions.filter(c => c.scheduled_date && isFuture(new Date(c.scheduled_date))).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Combine all experiences for "All" tab
  const allExperiences = [
    ...journeyEnrollments.map(e => {
      const journey = journeys.find(j => j.id === e.journey_id);
      return {
        type: 'journey',
        id: e.id,
        title: journey?.title || 'Learning Journey',
        description: journey?.description,
        status: e.status || 'not_started',
        progress: e.completion_percentage || 0,
        date: e.enrolled_date,
        icon: Map
      };
    }),
    ...programs.map(p => ({
      type: 'program',
      id: p.id,
      title: p.name,
      description: p.description,
      status: p.status || 'active',
      progress: p.metrics?.avg_completion_rate || 0,
      date: p.start_date,
      icon: Target
    })),
    ...classes.map(c => ({
      type: 'class',
      id: c.id,
      title: c.title,
      description: c.description,
      status: c.status || 'scheduled',
      date: c.scheduled_date,
      location: c.location,
      locationType: c.location_type,
      icon: c.location_type === 'virtual' ? Video : GraduationCap
    })),
    ...coachingSessions.map(c => ({
      type: 'coaching',
      id: c.id,
      title: c.title || `${c.session_type?.replace(/_/g, ' ')} Session`,
      description: c.description,
      status: c.status || 'scheduled',
      date: c.scheduled_date,
      coach: c.coach_email,
      icon: MessageSquare
    })),
    ...onboardingPlans.map(o => ({
      type: 'onboarding',
      id: o.id,
      title: o.title,
      description: o.description,
      status: o.status || 'assigned',
      progress: o.completion_percentage || 0,
      date: o.started_date,
      icon: BookOpen
    }))
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalExperiences}</p>
                <p className="text-sm text-gray-500">Total Experiences</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedCount}</p>
                <p className="text-sm text-gray-500">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <GraduationCap className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcomingClasses}</p>
                <p className="text-sm text-gray-500">Upcoming Classes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <MessageSquare className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcomingSessions}</p>
                <p className="text-sm text-gray-500">Coaching Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Experience Tabs */}
      <Card className="border-0 shadow-lg">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="pb-0">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="all" className="gap-2">
                <BookOpen className="w-4 h-4" />
                All ({allExperiences.length})
              </TabsTrigger>
              <TabsTrigger value="journeys" className="gap-2">
                <Map className="w-4 h-4" />
                Journeys ({journeyEnrollments.length})
              </TabsTrigger>
              <TabsTrigger value="programs" className="gap-2">
                <Target className="w-4 h-4" />
                Programs ({programs.length})
              </TabsTrigger>
              <TabsTrigger value="classes" className="gap-2">
                <GraduationCap className="w-4 h-4" />
                Classes ({classes.length})
              </TabsTrigger>
              <TabsTrigger value="coaching" className="gap-2">
                <MessageSquare className="w-4 h-4" />
                Coaching ({coachingSessions.length})
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="pt-6">
            <TabsContent value="all" className="mt-0">
              {allExperiences.length === 0 ? (
                <EmptyState message="No experiences assigned yet" />
              ) : (
                <div className="space-y-3">
                  {allExperiences.map((exp, idx) => (
                    <ExperienceCard key={`${exp.type}-${exp.id}`} experience={exp} index={idx} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="journeys" className="mt-0">
              {journeyEnrollments.length === 0 ? (
                <EmptyState message="No learning journeys assigned" icon={Map} />
              ) : (
                <div className="space-y-3">
                  {journeyEnrollments.map((enrollment, idx) => {
                    const journey = journeys.find(j => j.id === enrollment.journey_id);
                    return (
                      <ExperienceCard 
                        key={enrollment.id} 
                        experience={{
                          type: 'journey',
                          id: enrollment.id,
                          title: journey?.title || 'Learning Journey',
                          description: journey?.description,
                          status: enrollment.status || 'not_started',
                          progress: enrollment.completion_percentage || 0,
                          date: enrollment.enrolled_date,
                          icon: Map
                        }} 
                        index={idx} 
                      />
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="programs" className="mt-0">
              {programs.length === 0 ? (
                <EmptyState message="Not enrolled in any programs" icon={Target} />
              ) : (
                <div className="space-y-3">
                  {programs.map((program, idx) => (
                    <ExperienceCard 
                      key={program.id} 
                      experience={{
                        type: 'program',
                        id: program.id,
                        title: program.name,
                        description: program.description,
                        status: program.status || 'active',
                        progress: program.metrics?.avg_completion_rate || 0,
                        date: program.start_date,
                        icon: Target
                      }} 
                      index={idx} 
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="classes" className="mt-0">
              {classes.length === 0 ? (
                <EmptyState message="No classes scheduled" icon={GraduationCap} />
              ) : (
                <div className="space-y-3">
                  {classes.map((cls, idx) => (
                    <ExperienceCard 
                      key={cls.id} 
                      experience={{
                        type: 'class',
                        id: cls.id,
                        title: cls.title,
                        description: cls.description,
                        status: cls.status || 'scheduled',
                        date: cls.scheduled_date,
                        location: cls.location,
                        locationType: cls.location_type,
                        icon: cls.location_type === 'virtual' ? Video : GraduationCap
                      }} 
                      index={idx} 
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="coaching" className="mt-0">
              {coachingSessions.length === 0 ? (
                <EmptyState message="No coaching sessions scheduled" icon={MessageSquare} />
              ) : (
                <div className="space-y-3">
                  {coachingSessions.map((session, idx) => (
                    <ExperienceCard 
                      key={session.id} 
                      experience={{
                        type: 'coaching',
                        id: session.id,
                        title: session.title || `${session.session_type?.replace(/_/g, ' ')} Session`,
                        description: session.description,
                        status: session.status || 'scheduled',
                        date: session.scheduled_date,
                        coach: session.coach_email,
                        icon: MessageSquare
                      }} 
                      index={idx} 
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}

function ExperienceCard({ experience, index }) {
  const Icon = experience.icon;
  
  const getStatusBadge = (status) => {
    const styles = {
      'completed': 'bg-green-100 text-green-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'not_started': 'bg-gray-100 text-gray-800',
      'scheduled': 'bg-purple-100 text-purple-800',
      'active': 'bg-blue-100 text-blue-800',
      'confirmed': 'bg-green-100 text-green-800',
      'assigned': 'bg-amber-100 text-amber-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const typeLabels = {
    journey: 'Journey',
    program: 'Program',
    class: 'Class',
    coaching: 'Coaching',
    onboarding: 'Onboarding'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg ${
          experience.type === 'journey' ? 'bg-blue-100' :
          experience.type === 'program' ? 'bg-purple-100' :
          experience.type === 'class' ? 'bg-green-100' :
          experience.type === 'coaching' ? 'bg-amber-100' :
          'bg-gray-100'
        }`}>
          <Icon className={`w-5 h-5 ${
            experience.type === 'journey' ? 'text-blue-600' :
            experience.type === 'program' ? 'text-purple-600' :
            experience.type === 'class' ? 'text-green-600' :
            experience.type === 'coaching' ? 'text-amber-600' :
            'text-gray-600'
          }`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <h4 className="font-medium text-gray-900 truncate">{experience.title}</h4>
              {experience.description && (
                <p className="text-sm text-gray-500 line-clamp-1">{experience.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant="outline" className="text-xs">{typeLabels[experience.type]}</Badge>
              <Badge className={getStatusBadge(experience.status)}>
                {experience.status?.replace(/_/g, ' ')}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            {experience.date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(experience.date), 'MMM d, yyyy')}
              </span>
            )}
            {experience.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {experience.locationType === 'virtual' ? 'Virtual' : experience.location}
              </span>
            )}
            {experience.coach && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {experience.coach}
              </span>
            )}
          </div>

          {experience.progress !== undefined && experience.progress > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <Progress value={experience.progress} className="h-1.5 flex-1" />
              <span className="text-xs font-medium text-gray-600">{experience.progress}%</span>
            </div>
          )}
        </div>

        <Button 
          variant="ghost" 
          size="sm" 
          className="flex-shrink-0"
          onClick={() => {
            if (experience.type === 'journey') {
              window.location.href = createPageUrl('MyJourneys');
            } else if (experience.type === 'program') {
              window.location.href = createPageUrl('MyJourneys') + '#programs';
            } else if (experience.type === 'class' || experience.type === 'coaching') {
              window.location.href = createPageUrl('MyJourneys');
            }
          }}
        >
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}

function EmptyState({ message, icon: Icon = BookOpen }) {
  return (
    <div className="text-center py-12">
      <Icon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <p className="text-gray-500">{message}</p>
    </div>
  );
}