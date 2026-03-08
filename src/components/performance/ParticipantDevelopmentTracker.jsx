import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, Target, BookOpen, Award, MessageSquare, Calendar,
  Search, ChevronRight, Loader2, TrendingUp, CheckCircle, Clock
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ParticipantDevelopmentTracker({ programId, onClose }) {
  const { user: currentUser, hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [participantData, setParticipantData] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    loadParticipants();
  }, [programId]);

  const loadParticipants = async () => {
    setLoading(true);
    try {
      // Get programs managed by current user
      const allPrograms = await base44.entities.Program.list();
      const managedPrograms = allPrograms.filter(p => 
        p.manager_emails?.includes(currentUser.email) || 
        p.primary_manager_email === currentUser.email ||
        p.program_manager_email === currentUser.email
      );

      // Filter by specific program if provided
      const programs = programId 
        ? managedPrograms.filter(p => p.id === programId)
        : managedPrograms;

      // Collect participant emails
      const participantEmails = new Set();
      programs.forEach(p => {
        p.participant_emails?.forEach(e => participantEmails.add(e));
      });

      // Get cohorts too
      const allCohorts = await base44.entities.Cohort.list();
      const programCohorts = allCohorts.filter(c => programs.some(p => p.id === c.program_id));
      programCohorts.forEach(c => {
        c.participant_emails?.forEach(e => participantEmails.add(e));
      });

      // Load user details
      if (participantEmails.size > 0) {
        const allUsers = await base44.entities.User.list();
        const programParticipants = allUsers.filter(u => participantEmails.has(u.email));
        setParticipants(programParticipants);
      }
    } catch (error) {
      console.error("Error loading participants:", error);
      toast.error("Failed to load participants");
    } finally {
      setLoading(false);
    }
  };

  const loadParticipantDetails = async (participant) => {
    setLoadingDetails(true);
    setSelectedParticipant(participant);
    
    try {
      // Load all data for this participant
      const [goals, assessments, learning, coaching] = await Promise.all([
        base44.entities.Goal.filter({ created_by: participant.email }),
        base44.entities.Assessment.filter({ email: participant.email }),
        base44.entities.AssignedLearning.filter({ user_email: participant.email }),
        base44.entities.CoachingSession.filter({ participant_email: participant.email })
      ]);

      // Calculate summary metrics
      const completedGoals = goals.filter(g => g.status === 'archived' || g.progress === 100).length;
      const completedLearning = learning.filter(l => l.status === 'completed').length;
      const latestAssessment = assessments.sort((a, b) => 
        new Date(b.submission_ts || b.created_date) - new Date(a.submission_ts || a.created_date)
      )[0];

      setParticipantData({
        goals,
        assessments,
        learning,
        coaching,
        summary: {
          totalGoals: goals.length,
          completedGoals,
          goalCompletionRate: goals.length > 0 ? Math.round((completedGoals / goals.length) * 100) : 0,
          totalLearning: learning.length,
          completedLearning,
          learningCompletionRate: learning.length > 0 ? Math.round((completedLearning / learning.length) * 100) : 0,
          latestAssessmentScore: latestAssessment?.overall_pct || null,
          coachingSessions: coaching.length
        }
      });
    } catch (error) {
      console.error("Error loading participant details:", error);
      toast.error("Failed to load participant details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredParticipants = participants.filter(p => 
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (goal) => {
    if (goal.status === 'archived' || goal.progress === 100) {
      return <Badge className="bg-green-100 text-green-700">Completed</Badge>;
    }
    if (goal.status === 'draft') {
      return <Badge className="bg-gray-100 text-gray-700">Draft</Badge>;
    }
    if (goal.timeframe_end && new Date(goal.timeframe_end) < new Date()) {
      return <Badge className="bg-red-100 text-red-700">Overdue</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-700">Active</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search participants by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Participants List */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">Program Participants</CardTitle>
          <CardDescription>{filteredParticipants.length} participants</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredParticipants.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No participants found</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {filteredParticipants.map((participant) => (
                  <motion.div
                    key={participant.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => loadParticipantDetails(participant)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{participant.full_name}</p>
                          <p className="text-sm text-gray-500">{participant.email}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Participant Detail Modal */}
      <Dialog open={!!selectedParticipant} onOpenChange={() => setSelectedParticipant(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p>{selectedParticipant?.full_name}</p>
                <p className="text-sm font-normal text-gray-500">{selectedParticipant?.email}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {loadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : participantData ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border shadow-sm">
                  <CardContent className="p-4 text-center">
                    <Target className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                    <p className="text-2xl font-bold">{participantData.summary.goalCompletionRate}%</p>
                    <p className="text-xs text-gray-500">Goal Completion</p>
                  </CardContent>
                </Card>
                <Card className="border shadow-sm">
                  <CardContent className="p-4 text-center">
                    <BookOpen className="w-6 h-6 mx-auto mb-2 text-green-600" />
                    <p className="text-2xl font-bold">{participantData.summary.learningCompletionRate}%</p>
                    <p className="text-xs text-gray-500">Learning Completion</p>
                  </CardContent>
                </Card>
                <Card className="border shadow-sm">
                  <CardContent className="p-4 text-center">
                    <Award className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                    <p className="text-2xl font-bold">{participantData.summary.latestAssessmentScore || 'N/A'}%</p>
                    <p className="text-xs text-gray-500">Assessment Score</p>
                  </CardContent>
                </Card>
                <Card className="border shadow-sm">
                  <CardContent className="p-4 text-center">
                    <MessageSquare className="w-6 h-6 mx-auto mb-2 text-amber-600" />
                    <p className="text-2xl font-bold">{participantData.summary.coachingSessions}</p>
                    <p className="text-xs text-gray-500">Coaching Sessions</p>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Tabs */}
              <Tabs defaultValue="goals" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="goals">Goals ({participantData.goals.length})</TabsTrigger>
                  <TabsTrigger value="learning">Learning ({participantData.learning.length})</TabsTrigger>
                  <TabsTrigger value="assessments">Assessments ({participantData.assessments.length})</TabsTrigger>
                  <TabsTrigger value="coaching">Coaching ({participantData.coaching.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="goals" className="mt-4">
                  <ScrollArea className="h-[300px]">
                    {participantData.goals.length === 0 ? (
                      <p className="text-center text-gray-400 py-8">No goals found</p>
                    ) : (
                      <div className="space-y-3">
                        {participantData.goals.map(goal => (
                          <div key={goal.id} className="p-3 border rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <p className="font-medium">{goal.title}</p>
                              {getStatusBadge(goal)}
                            </div>
                            <Progress value={goal.progress || 0} className="h-2 mb-2" />
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>{goal.progress || 0}% complete</span>
                              {goal.timeframe_end && (
                                <span>Due: {format(new Date(goal.timeframe_end), 'MMM d, yyyy')}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="learning" className="mt-4">
                  <ScrollArea className="h-[300px]">
                    {participantData.learning.length === 0 ? (
                      <p className="text-center text-gray-400 py-8">No learning assignments found</p>
                    ) : (
                      <div className="space-y-3">
                        {participantData.learning.map(item => (
                          <div key={item.id} className="p-3 border rounded-lg">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">{item.title}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Assigned: {format(new Date(item.created_date), 'MMM d, yyyy')}
                                </p>
                              </div>
                              <Badge className={
                                item.status === 'completed' ? 'bg-green-100 text-green-700' :
                                item.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }>
                                {item.status || 'assigned'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="assessments" className="mt-4">
                  <ScrollArea className="h-[300px]">
                    {participantData.assessments.length === 0 ? (
                      <p className="text-center text-gray-400 py-8">No assessments found</p>
                    ) : (
                      <div className="space-y-3">
                        {participantData.assessments.map(assessment => (
                          <div key={assessment.id} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">Leadership Assessment</p>
                                <p className="text-xs text-gray-500">
                                  {format(new Date(assessment.submission_ts || assessment.created_date), 'MMM d, yyyy')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-bold text-blue-600">{assessment.overall_pct}%</p>
                                <p className="text-xs text-gray-500">{assessment.band_overall || 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="coaching" className="mt-4">
                  <ScrollArea className="h-[300px]">
                    {participantData.coaching.length === 0 ? (
                      <p className="text-center text-gray-400 py-8">No coaching sessions found</p>
                    ) : (
                      <div className="space-y-3">
                        {participantData.coaching.map(session => (
                          <div key={session.id} className="p-3 border rounded-lg">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">{session.title || 'Coaching Session'}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {session.session_date 
                                    ? format(new Date(session.session_date), 'MMM d, yyyy')
                                    : 'Date TBD'}
                                </p>
                              </div>
                              <Badge className={
                                session.status === 'completed' ? 'bg-green-100 text-green-700' :
                                session.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }>
                                {session.status || 'pending'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}