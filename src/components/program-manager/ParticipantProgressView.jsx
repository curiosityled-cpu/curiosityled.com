import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  User, Search, Loader2, Map, Target, BookOpen, 
  AlertTriangle, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';
import InterventionTriggersPanel from './InterventionTriggersPanel';

export default function ParticipantProgressView({ 
  programId, 
  participantEmails = [],
  journeyIds = [],
  open,
  onClose 
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [showInterventions, setShowInterventions] = useState(true);
  
  const [participants, setParticipants] = useState([]);
  const [journeys, setJourneys] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [goals, setGoals] = useState([]);
  const [assignedLearning, setAssignedLearning] = useState([]);

  useEffect(() => {
    if (open && participantEmails.length > 0) {
      loadData();
    }
  }, [open, participantEmails.length, journeyIds.length, programId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, journeysData, enrollmentsData, goalsData, learningData] = await Promise.all([
        base44.entities.User.filter({ email: { $in: participantEmails } }),
        journeyIds.length > 0 
          ? base44.entities.LearningJourney.filter({ id: { $in: journeyIds } })
          : Promise.resolve([]),
        journeyIds.length > 0
          ? base44.entities.JourneyEnrollment.filter({ 
              journey_id: { $in: journeyIds },
              user_email: { $in: participantEmails }
            })
          : Promise.resolve([]),
        programId 
          ? base44.entities.Goal.filter({ program_id: programId })
          : Promise.resolve([]),
        base44.entities.AssignedLearning.filter({ user_email: { $in: participantEmails } })
      ]);

      setParticipants(usersData);
      setJourneys(journeysData);
      setEnrollments(enrollmentsData);
      setGoals(goalsData);
      setAssignedLearning(learningData);
    } catch (error) {
      console.error('Error loading participant data:', error);
      toast.error('Failed to load participant data');
    } finally {
      setLoading(false);
    }
  };

  const participantData = useMemo(() => {
    return participants.map(participant => {
      const email = participant.email;
      
      // Journey progress
      const participantEnrollments = enrollments.filter(e => e.user_email === email);
      const journeyProgress = participantEnrollments.length > 0
        ? Math.round(participantEnrollments.reduce((sum, e) => sum + (e.completion_percentage || 0), 0) / participantEnrollments.length)
        : 0;
      const completedJourneys = participantEnrollments.filter(e => e.status === 'completed').length;
      const totalJourneys = participantEnrollments.length;
      
      // Goal progress
      const participantGoals = goals.filter(g => 
        g.assigned_to_emails?.includes(email) || g.created_by === email
      );
      const goalProgress = participantGoals.length > 0
        ? Math.round(participantGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / participantGoals.length)
        : 0;
      const completedGoals = participantGoals.filter(g => g.status === 'archived' || g.progress >= 100).length;
      
      // Learning progress
      const participantLearning = assignedLearning.filter(l => l.user_email === email);
      const completedLearning = participantLearning.filter(l => l.status === 'completed').length;
      const learningProgress = participantLearning.length > 0
        ? Math.round((completedLearning / participantLearning.length) * 100)
        : 0;
      
      // Calculate overall progress
      const weights = { journey: 0.4, goal: 0.35, learning: 0.25 };
      const overallProgress = Math.round(
        (journeyProgress * weights.journey) + 
        (goalProgress * weights.goal) + 
        (learningProgress * weights.learning)
      );
      
      // At risk detection
      const isAtRisk = participantEnrollments.some(e => 
        e.status === 'in_progress' && 
        e.completion_percentage < 30 &&
        e.enrolled_date && 
        (new Date() - new Date(e.enrolled_date)) / (1000 * 60 * 60 * 24) > 14
      );

      return {
        ...participant,
        journeyProgress,
        completedJourneys,
        totalJourneys,
        goalProgress,
        completedGoals,
        totalGoals: participantGoals.length,
        learningProgress,
        completedLearning,
        totalLearning: participantLearning.length,
        overallProgress,
        isAtRisk,
        enrollments: participantEnrollments,
        goals: participantGoals,
        learning: participantLearning
      };
    }).sort((a, b) => {
      // Sort at-risk first, then by progress
      if (a.isAtRisk && !b.isAtRisk) return -1;
      if (!a.isAtRisk && b.isAtRisk) return 1;
      return a.overallProgress - b.overallProgress;
    });
  }, [participants, enrollments, goals, assignedLearning]);

  const filteredParticipants = participantData.filter(p =>
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendNudge = async (participant) => {
    try {
      // Create notification directly instead of using function
      await base44.entities.Notification.create({
        user_email: participant.email,
        type: 'nudge',
        title: 'Program Check-in',
        message: `Hi ${participant.full_name?.split(' ')[0] || 'there'}! Just checking in on your progress. You're doing great - keep it up!`,
        priority: 'medium'
      });
      toast.success(`Nudge sent to ${participant.full_name}`);
    } catch (error) {
      console.error('Error sending nudge:', error);
      toast.error('Failed to send nudge');
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'text-green-600 bg-green-100';
    if (progress >= 50) return 'text-blue-600 bg-blue-100';
    if (progress >= 25) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Participant Development Tracker
          </DialogTitle>
          <DialogDescription>
            Track individual progress across journeys, goals, and learning assignments
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 pt-4">
          {/* Intervention Triggers Panel */}
          {showInterventions && participantEmails.length > 0 && (
            <div className="mb-4">
              <InterventionTriggersPanel
                programId={programId}
                journeyIds={journeyIds}
                participantEmails={participantEmails}
                onInterventionSent={loadData}
              />
            </div>
          )}

          {/* Search */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search participants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant={showInterventions ? "default" : "outline"}
              size="icon"
              onClick={() => setShowInterventions(!showInterventions)}
              title="Toggle intervention alerts"
            >
              <AlertTriangle className="w-4 h-4" />
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Participant List */}
              <div className="lg:col-span-1 border rounded-lg">
                <div className="p-3 border-b bg-gray-50">
                  <h3 className="font-medium text-sm">
                    Participants ({filteredParticipants.length})
                  </h3>
                </div>
                <ScrollArea className="h-[500px]">
                  <div className="p-2 space-y-1">
                    {filteredParticipants.map((participant) => (
                      <div
                        key={participant.id}
                        onClick={() => setSelectedParticipant(participant)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedParticipant?.id === participant.id
                            ? 'bg-blue-50 border border-blue-200'
                            : 'hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">
                                {participant.full_name || participant.email}
                              </p>
                              {participant.isAtRisk && (
                                <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              {participant.email}
                            </p>
                          </div>
                          <Badge className={`text-xs ${getProgressColor(participant.overallProgress)}`}>
                            {participant.overallProgress}%
                          </Badge>
                        </div>
                        <Progress value={participant.overallProgress} className="h-1 mt-2" />
                      </div>
                    ))}
                    
                    {filteredParticipants.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No participants found</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Participant Details */}
              <div className="lg:col-span-2 border rounded-lg">
                {selectedParticipant ? (
                  <div className="h-full">
                    {/* Header */}
                    <div className="p-4 border-b bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {selectedParticipant.full_name || selectedParticipant.email}
                          </h3>
                          <p className="text-sm text-gray-500">{selectedParticipant.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedParticipant.isAtRisk && (
                            <Badge className="bg-orange-100 text-orange-700">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              At Risk
                            </Badge>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleSendNudge(selectedParticipant)}
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Send Nudge
                          </Button>
                        </div>
                      </div>

                      {/* Overall Progress */}
                      <div className="mt-4 grid grid-cols-4 gap-3">
                        <div className="text-center p-2 bg-white rounded-lg border">
                          <p className="text-2xl font-bold text-blue-600">
                            {selectedParticipant.overallProgress}%
                          </p>
                          <p className="text-xs text-gray-500">Overall</p>
                        </div>
                        <div className="text-center p-2 bg-white rounded-lg border">
                          <p className="text-2xl font-bold text-purple-600">
                            {selectedParticipant.journeyProgress}%
                          </p>
                          <p className="text-xs text-gray-500">Journeys</p>
                        </div>
                        <div className="text-center p-2 bg-white rounded-lg border">
                          <p className="text-2xl font-bold text-green-600">
                            {selectedParticipant.goalProgress}%
                          </p>
                          <p className="text-xs text-gray-500">Goals</p>
                        </div>
                        <div className="text-center p-2 bg-white rounded-lg border">
                          <p className="text-2xl font-bold text-orange-600">
                            {selectedParticipant.learningProgress}%
                          </p>
                          <p className="text-xs text-gray-500">Learning</p>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Progress */}
                    <ScrollArea className="h-[380px]">
                      <Tabs defaultValue="journeys" className="p-4">
                        <TabsList className="mb-4">
                          <TabsTrigger value="journeys" className="gap-1">
                            <Map className="w-4 h-4" />
                            Journeys ({selectedParticipant.totalJourneys})
                          </TabsTrigger>
                          <TabsTrigger value="goals" className="gap-1">
                            <Target className="w-4 h-4" />
                            Goals ({selectedParticipant.totalGoals})
                          </TabsTrigger>
                          <TabsTrigger value="learning" className="gap-1">
                            <BookOpen className="w-4 h-4" />
                            Learning ({selectedParticipant.totalLearning})
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="journeys" className="space-y-3">
                          {selectedParticipant.enrollments.length > 0 ? (
                            selectedParticipant.enrollments.map((enrollment) => {
                              const journey = journeys.find(j => j.id === enrollment.journey_id);
                              return (
                                <div key={enrollment.id} className="p-3 border rounded-lg">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <h4 className="font-medium">{journey?.title || 'Unknown Journey'}</h4>
                                      <p className="text-xs text-gray-500">
                                        Enrolled: {enrollment.enrolled_date 
                                          ? format(new Date(enrollment.enrolled_date), 'MMM d, yyyy')
                                          : 'N/A'}
                                      </p>
                                    </div>
                                    <Badge className={
                                      enrollment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                      enrollment.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                      'bg-gray-100 text-gray-800'
                                    }>
                                      {enrollment.status?.replace('_', ' ') || 'Not Started'}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Progress value={enrollment.completion_percentage || 0} className="flex-1 h-2" />
                                    <span className="text-sm font-medium">{enrollment.completion_percentage || 0}%</span>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <Map className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p>No journey enrollments</p>
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="goals" className="space-y-3">
                          {selectedParticipant.goals.length > 0 ? (
                            selectedParticipant.goals.map((goal) => (
                              <div key={goal.id} className="p-3 border rounded-lg">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <h4 className="font-medium">{goal.title}</h4>
                                    {goal.timeframe_end && (
                                      <p className="text-xs text-gray-500">
                                        Due: {format(new Date(goal.timeframe_end), 'MMM d, yyyy')}
                                      </p>
                                    )}
                                  </div>
                                  <Badge className={
                                    goal.status === 'archived' ? 'bg-green-100 text-green-800' :
                                    goal.status === 'active' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }>
                                    {goal.status}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Progress value={goal.progress || 0} className="flex-1 h-2" />
                                  <span className="text-sm font-medium">{goal.progress || 0}%</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p>No goals assigned</p>
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="learning" className="space-y-3">
                          {selectedParticipant.learning.length > 0 ? (
                            selectedParticipant.learning.map((item) => (
                              <div key={item.id} className="p-3 border rounded-lg">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="font-medium">{item.title}</h4>
                                    {item.due_date && (
                                      <p className="text-xs text-gray-500">
                                        Due: {format(new Date(item.due_date), 'MMM d, yyyy')}
                                      </p>
                                    )}
                                  </div>
                                  <Badge className={
                                    item.status === 'completed' ? 'bg-green-100 text-green-800' :
                                    item.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                    item.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }>
                                    {item.status}
                                  </Badge>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p>No learning assignments</p>
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </ScrollArea>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-gray-500">
                    <User className="w-12 h-12 mb-3 opacity-50" />
                    <p>Select a participant to view details</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}