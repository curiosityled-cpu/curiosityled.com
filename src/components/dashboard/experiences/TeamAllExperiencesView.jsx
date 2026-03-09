import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, Map, Search, Filter, ArrowRight, BookOpen, CheckCircle, Clock,
  AlertTriangle, Loader2, TrendingUp, FileText, Target, GraduationCap,
  MessageSquare, Calendar
} from "lucide-react";
import AssignOnboardingPlanModal from "@/components/assignment/AssignOnboardingPlanModal";
import AssignJourneyModal from "@/components/assignment/AssignJourneyModal";
import { motion } from "framer-motion";
import { useAuth } from "@/components/useAuth";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

export default function TeamAllExperiencesView() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAssignOnboardingModal, setShowAssignOnboardingModal] = useState(false);
  const [showAssignJourneyModal, setShowAssignJourneyModal] = useState(false);

  // Team data
  const [teamMembers, setTeamMembers] = useState([]);
  const [journeyEnrollments, setJourneyEnrollments] = useState([]);
  const [journeys, setJourneys] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [classes, setClasses] = useState([]);
  const [coachingSessions, setCoachingSessions] = useState([]);

  useEffect(() => {
    if (user?.email) {
      loadTeamData();
    }
  }, [user?.email]);

  const loadTeamData = async () => {
    setLoading(true);
    try {
      const subordinateEmails = user?.subordinate_emails || [];
      
      if (subordinateEmails.length === 0) {
        setLoading(false);
        return;
      }

      const [members, enrollments, journeysData, programsData, classesData, coachingData] = await Promise.all([
        base44.entities.User.filter({ email: { $in: subordinateEmails } }),
        base44.entities.JourneyEnrollment.list('-enrolled_date'),
        base44.entities.LearningJourney.list('-created_date'),
        base44.entities.Program.list('-created_date'),
        base44.entities.Class.list('-scheduled_date'),
        base44.entities.CoachingSession.list('-scheduled_date')
      ]);

      setTeamMembers(members || []);
      setJourneys(journeysData || []);

      // Filter data for team members
      const teamEnrollments = (enrollments || []).filter(e => subordinateEmails.includes(e.user_email));
      setJourneyEnrollments(teamEnrollments);

      const teamPrograms = (programsData || []).filter(p => 
        p.participant_emails?.some(email => subordinateEmails.includes(email))
      );
      setPrograms(teamPrograms);

      const teamClasses = (classesData || []).filter(c => 
        c.enrolled_emails?.some(email => subordinateEmails.includes(email))
      );
      setClasses(teamClasses);

      const teamCoaching = (coachingData || []).filter(c => 
        subordinateEmails.includes(c.coachee_email)
      );
      setCoachingSessions(teamCoaching);

    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTeamMemberExperiences = (memberEmail) => {
    const memberJourneys = journeyEnrollments.filter(e => e.user_email === memberEmail);
    const memberPrograms = programs.filter(p => p.participant_emails?.includes(memberEmail));
    const memberClasses = classes.filter(c => c.enrolled_emails?.includes(memberEmail));
    const memberCoaching = coachingSessions.filter(c => c.coachee_email === memberEmail);

    const totalExperiences = memberJourneys.length + memberPrograms.length + memberClasses.length + memberCoaching.length;
    const completedJourneys = memberJourneys.filter(e => e.status === 'completed').length;
    const completedClasses = memberClasses.filter(c => c.status === 'completed').length;
    const completedCoaching = memberCoaching.filter(c => c.status === 'completed').length;
    const completed = completedJourneys + completedClasses + completedCoaching;

    const avgProgress = memberJourneys.length > 0
      ? Math.round(memberJourneys.reduce((sum, e) => sum + (e.completion_percentage || 0), 0) / memberJourneys.length)
      : 0;

    return {
      total: totalExperiences,
      completed,
      journeys: memberJourneys.length,
      programs: memberPrograms.length,
      classes: memberClasses.length,
      coaching: memberCoaching.length,
      avgProgress
    };
  };

  // Overall stats
  const totalJourneys = journeyEnrollments.length;
  const totalPrograms = programs.length;
  const totalClasses = classes.length;
  const totalCoaching = coachingSessions.length;
  const completedJourneys = journeyEnrollments.filter(e => e.status === 'completed').length;
  const avgCompletion = totalJourneys > 0
    ? Math.round(journeyEnrollments.reduce((sum, e) => sum + (e.completion_percentage || 0), 0) / totalJourneys)
    : 0;

  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = !searchTerm || 
      member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{teamMembers.length}</p>
                <p className="text-sm text-gray-500">Team Members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Map className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalJourneys}</p>
                <p className="text-sm text-gray-500">Journeys</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <GraduationCap className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalClasses}</p>
                <p className="text-sm text-gray-500">Classes</p>
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
                <p className="text-2xl font-bold">{totalCoaching}</p>
                <p className="text-sm text-gray-500">Coaching</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgCompletion}%</p>
                <p className="text-sm text-gray-500">Avg Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Table with Tabs */}
      <Card className="border-0 shadow-lg">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="pb-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <TabsList>
                <TabsTrigger value="overview">Team Overview</TabsTrigger>
                <TabsTrigger value="journeys">Journeys</TabsTrigger>
                <TabsTrigger value="classes">Classes</TabsTrigger>
                <TabsTrigger value="coaching">Coaching</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-40"
                  />
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <TabsContent value="overview" className="mt-0">
              {filteredMembers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team Member</TableHead>
                      <TableHead className="text-center">Journeys</TableHead>
                      <TableHead className="text-center">Programs</TableHead>
                      <TableHead className="text-center">Classes</TableHead>
                      <TableHead className="text-center">Coaching</TableHead>
                      <TableHead>Progress</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((member, idx) => {
                      const exp = getTeamMemberExperiences(member.email);
                      return (
                        <motion.tr
                          key={member.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.03 }}
                          className="hover:bg-gray-50"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
                                {member.full_name?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <p className="font-medium">{member.full_name}</p>
                                <p className="text-sm text-gray-500">{member.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{exp.journeys}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{exp.programs}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{exp.classes}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{exp.coaching}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={exp.avgProgress} className="h-2 w-24" />
                              <span className="text-sm font-medium">{exp.avgProgress}%</span>
                            </div>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No team members found</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="journeys" className="mt-0">
              {journeyEnrollments.length > 0 ? (
                <div className="space-y-3">
                  {journeyEnrollments.map((enrollment, idx) => {
                    const journey = journeys.find(j => j.id === enrollment.journey_id);
                    const member = teamMembers.find(m => m.email === enrollment.user_email);
                    return (
                      <ExperienceRow
                        key={enrollment.id}
                        icon={Map}
                        iconBg="bg-purple-100"
                        iconColor="text-purple-600"
                        title={journey?.title || 'Journey'}
                        member={member?.full_name || enrollment.user_email}
                        status={enrollment.status}
                        progress={enrollment.completion_percentage}
                        date={enrollment.enrolled_date}
                        index={idx}
                      />
                    );
                  })}
                </div>
              ) : (
                <EmptyState message="No journeys assigned to team" icon={Map} />
              )}
            </TabsContent>

            <TabsContent value="classes" className="mt-0">
              {classes.length > 0 ? (
                <div className="space-y-3">
                  {classes.map((cls, idx) => (
                    <ExperienceRow
                      key={cls.id}
                      icon={GraduationCap}
                      iconBg="bg-green-100"
                      iconColor="text-green-600"
                      title={cls.title}
                      member={`${cls.enrolled_emails?.length || 0} enrolled`}
                      status={cls.status}
                      date={cls.scheduled_date}
                      index={idx}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState message="No classes scheduled" icon={GraduationCap} />
              )}
            </TabsContent>

            <TabsContent value="coaching" className="mt-0">
              {coachingSessions.length > 0 ? (
                <div className="space-y-3">
                  {coachingSessions.map((session, idx) => {
                    const member = teamMembers.find(m => m.email === session.coachee_email);
                    return (
                      <ExperienceRow
                        key={session.id}
                        icon={MessageSquare}
                        iconBg="bg-amber-100"
                        iconColor="text-amber-600"
                        title={session.title || session.session_type?.replace(/_/g, ' ')}
                        member={member?.full_name || session.coachee_email}
                        status={session.status}
                        date={session.scheduled_date}
                        index={idx}
                      />
                    );
                  })}
                </div>
              ) : (
                <EmptyState message="No coaching sessions" icon={MessageSquare} />
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Quick Actions */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-50 to-blue-50">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Assign Experiences</h3>
              <p className="text-sm text-gray-600">Assign learning content to your team</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setShowAssignOnboardingModal(true)} className="bg-purple-600 hover:bg-purple-700">
                <FileText className="w-4 h-4 mr-2" />
                Assign Onboarding
              </Button>
              <Button onClick={() => setShowAssignJourneyModal(true)} className="bg-blue-600 hover:bg-blue-700">
                <Map className="w-4 h-4 mr-2" />
                Assign Journey
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AssignOnboardingPlanModal
        isOpen={showAssignOnboardingModal}
        onClose={() => setShowAssignOnboardingModal(false)}
        onSuccess={loadTeamData}
      />

      <AssignJourneyModal
        isOpen={showAssignJourneyModal}
        onClose={() => setShowAssignJourneyModal(false)}
        onSuccess={loadTeamData}
      />
    </div>
  );
}

function ExperienceRow({ icon: Icon, iconBg, iconColor, title, member, status, progress, date, index }) {
  const getStatusBadge = (status) => {
    const styles = {
      'completed': 'bg-green-100 text-green-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'not_started': 'bg-gray-100 text-gray-800',
      'scheduled': 'bg-purple-100 text-purple-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
      onClick={() => window.location.href = createPageUrl('MyJourneys')}
    >
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div>
          <h4 className="font-medium">{title}</h4>
          <p className="text-sm text-gray-500">{member}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {progress !== undefined && (
          <div className="flex items-center gap-2">
            <Progress value={progress} className="h-2 w-20" />
            <span className="text-sm">{progress}%</span>
          </div>
        )}
        {date && (
          <span className="text-sm text-gray-500">
            {format(new Date(date), 'MMM d')}
          </span>
        )}
        <Badge className={getStatusBadge(status)}>
          {status?.replace(/_/g, ' ')}
        </Badge>
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