import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertTriangle, TrendingDown, Clock, Send, CheckCircle, 
  Map, Target, BookOpen, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { differenceInDays } from 'date-fns';
import { toast } from 'sonner';

const TRIGGER_TYPES = {
  journey_stalled: {
    label: 'Journey Stalled',
    icon: Map,
    color: 'text-purple-600 bg-purple-100',
    description: 'No progress in journey for 14+ days'
  },
  low_journey_progress: {
    label: 'Low Journey Progress',
    icon: TrendingDown,
    color: 'text-orange-600 bg-orange-100',
    description: 'Less than 30% progress after 14+ days enrolled'
  },
  goal_overdue: {
    label: 'Goal Overdue',
    icon: Target,
    color: 'text-red-600 bg-red-100',
    description: 'Goal past due date'
  },
  learning_overdue: {
    label: 'Learning Overdue',
    icon: BookOpen,
    color: 'text-amber-600 bg-amber-100',
    description: 'Assigned learning past due date'
  },
  inactive_participant: {
    label: 'Inactive Participant',
    icon: Clock,
    color: 'text-gray-600 bg-gray-100',
    description: 'No activity in 21+ days'
  }
};

export default function InterventionTriggersPanel({ 
  programId, 
  journeyIds = [], 
  participantEmails = [],
  onInterventionSent 
}) {
  const [loading, setLoading] = useState(true);
  const [selectedTriggers, setSelectedTriggers] = useState([]);
  const [showNudgeModal, setShowNudgeModal] = useState(false);
  const [nudgeMessage, setNudgeMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [filterType, setFilterType] = useState('all');

  // Data states
  const [enrollments, setEnrollments] = useState([]);
  const [goals, setGoals] = useState([]);
  const [learning, setLearning] = useState([]);
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    if (participantEmails.length > 0) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [participantEmails.length, journeyIds.length, programId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, enrollmentsData, goalsData, learningData] = await Promise.all([
        base44.entities.User.filter({ email: { $in: participantEmails } }),
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
      setEnrollments(enrollmentsData);
      setGoals(goalsData);
      setLearning(learningData);
    } catch (error) {
      console.error('Error loading intervention data:', error);
    } finally {
      setLoading(false);
    }
  };

  const detectedTriggers = useMemo(() => {
    const triggers = [];
    const now = new Date();

    participants.forEach(participant => {
      const email = participant.email;
      const name = participant.full_name || email;

      // Check journey triggers
      const participantEnrollments = enrollments.filter(e => e.user_email === email);
      participantEnrollments.forEach(enrollment => {
        const enrolledDate = enrollment.enrolled_date ? new Date(enrollment.enrolled_date) : null;
        const daysSinceEnroll = enrolledDate ? differenceInDays(now, enrolledDate) : 0;
        // Use updated_date as fallback for last activity since last_activity_date may not exist
        const lastActivity = enrollment.updated_date 
          ? new Date(enrollment.updated_date) 
          : enrolledDate;
        const daysSinceActivity = lastActivity ? differenceInDays(now, lastActivity) : 0;

        // Journey stalled - no activity in 14+ days
        if (enrollment.status === 'in_progress' && daysSinceActivity >= 14) {
          triggers.push({
            id: `stalled-${enrollment.id}`,
            type: 'journey_stalled',
            participant: { email, name, id: participant.id },
            entity: enrollment,
            entityType: 'journey',
            severity: daysSinceActivity >= 21 ? 'high' : 'medium',
            details: `No activity for ${daysSinceActivity} days`,
            createdAt: now
          });
        }

        // Low journey progress
        if (enrollment.status === 'in_progress' && 
            daysSinceEnroll >= 14 && 
            (enrollment.completion_percentage || 0) < 30) {
          triggers.push({
            id: `low-progress-${enrollment.id}`,
            type: 'low_journey_progress',
            participant: { email, name, id: participant.id },
            entity: enrollment,
            entityType: 'journey',
            severity: (enrollment.completion_percentage || 0) < 15 ? 'high' : 'medium',
            details: `Only ${enrollment.completion_percentage || 0}% complete after ${daysSinceEnroll} days`,
            createdAt: now
          });
        }
      });

      // Check goal triggers
      const participantGoals = goals.filter(g => 
        g.assigned_to_emails?.includes(email) || g.created_by === email
      );
      participantGoals.forEach(goal => {
        if (goal.timeframe_end && goal.status !== 'archived') {
          const dueDate = new Date(goal.timeframe_end);
          if (dueDate < now) {
            const daysOverdue = differenceInDays(now, dueDate);
            triggers.push({
              id: `goal-overdue-${goal.id}`,
              type: 'goal_overdue',
              participant: { email, name, id: participant.id },
              entity: goal,
              entityType: 'goal',
              severity: daysOverdue >= 14 ? 'high' : daysOverdue >= 7 ? 'medium' : 'low',
              details: `${daysOverdue} days overdue - ${goal.title}`,
              createdAt: now
            });
          }
        }
      });

      // Check learning triggers
      const participantLearning = learning.filter(l => l.user_email === email);
      participantLearning.forEach(item => {
        if (item.due_date && item.status !== 'completed') {
          const dueDate = new Date(item.due_date);
          if (dueDate < now) {
            const daysOverdue = differenceInDays(now, dueDate);
            triggers.push({
              id: `learning-overdue-${item.id}`,
              type: 'learning_overdue',
              participant: { email, name, id: participant.id },
              entity: item,
              entityType: 'learning',
              severity: daysOverdue >= 14 ? 'high' : daysOverdue >= 7 ? 'medium' : 'low',
              details: `${daysOverdue} days overdue - ${item.title}`,
              createdAt: now
            });
          }
        }
      });

      // Check for inactive participants - only if they have activity to track
      if (participantEnrollments.length > 0 || participantGoals.length > 0 || participantLearning.length > 0) {
        const allActivities = [
          ...participantEnrollments.map(e => e.updated_date || e.enrolled_date),
          ...participantGoals.map(g => g.updated_date),
          ...participantLearning.map(l => l.updated_date)
        ].filter(Boolean);

        if (allActivities.length > 0) {
          const lastActivity = new Date(Math.max(...allActivities.map(d => new Date(d))));
          const daysSinceActivity = differenceInDays(now, lastActivity);
          
          if (daysSinceActivity >= 21) {
            triggers.push({
              id: `inactive-${participant.id}`,
              type: 'inactive_participant',
              participant: { email, name, id: participant.id },
              entity: null,
              entityType: null,
              severity: daysSinceActivity >= 30 ? 'high' : 'medium',
              details: `No activity for ${daysSinceActivity} days`,
              createdAt: now
            });
          }
        }
      }
    });

    // Sort by severity and date
    return triggers.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return b.createdAt - a.createdAt;
    });
  }, [participants, enrollments, goals, learning]);

  const filteredTriggers = filterType === 'all' 
    ? detectedTriggers 
    : detectedTriggers.filter(t => t.type === filterType);

  const toggleTrigger = (triggerId) => {
    setSelectedTriggers(prev =>
      prev.includes(triggerId)
        ? prev.filter(id => id !== triggerId)
        : [...prev, triggerId]
    );
  };

  const selectAllVisible = () => {
    setSelectedTriggers(filteredTriggers.map(t => t.id));
  };

  const clearSelection = () => {
    setSelectedTriggers([]);
  };

  const handleSendNudges = async () => {
    if (selectedTriggers.length === 0) return;

    setSending(true);
    try {
      const selectedItems = detectedTriggers.filter(t => selectedTriggers.includes(t.id));
      const uniqueEmails = [...new Set(selectedItems.map(t => t.participant.email))];

      for (const email of uniqueEmails) {
        const participantTriggers = selectedItems.filter(t => t.participant.email === email);
        const participant = participantTriggers[0].participant;
        
        const message = nudgeMessage || generateDefaultMessage(participant, participantTriggers);

        await base44.entities.Notification.create({
          user_email: email,
          type: 'nudge',
          title: 'Check-in from your Program Manager',
          message,
          priority: participantTriggers.some(t => t.severity === 'high') ? 'high' : 'medium',
          related_entity_type: 'Program',
          related_entity_id: programId
        });
      }

      toast.success(`Sent nudges to ${uniqueEmails.length} participant(s)`);
      setShowNudgeModal(false);
      setNudgeMessage('');
      setSelectedTriggers([]);
      onInterventionSent?.();
    } catch (error) {
      console.error('Error sending nudges:', error);
      toast.error('Failed to send nudges');
    } finally {
      setSending(false);
    }
  };

  const generateDefaultMessage = (participant, triggers) => {
    const firstName = participant.name?.split(' ')[0] || 'there';
    const triggerTypes = [...new Set(triggers.map(t => t.type))];
    
    let message = `Hi ${firstName}! Just wanted to check in on your progress. `;
    
    if (triggerTypes.includes('journey_stalled') || triggerTypes.includes('low_journey_progress')) {
      message += `I noticed you might need some support with your learning journey. `;
    }
    if (triggerTypes.includes('goal_overdue')) {
      message += `Some of your goals may need attention. `;
    }
    if (triggerTypes.includes('learning_overdue')) {
      message += `There are learning assignments that could use your focus. `;
    }
    
    message += `Let me know if there's anything I can help with - I'm here to support you!`;
    
    return message;
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'high':
        return <Badge className="bg-red-100 text-red-700">High</Badge>;
      case 'medium':
        return <Badge className="bg-orange-100 text-orange-700">Medium</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700">Low</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
        </CardContent>
      </Card>
    );
  }

  const triggerCounts = {
    all: detectedTriggers.length,
    ...Object.keys(TRIGGER_TYPES).reduce((acc, type) => {
      acc[type] = detectedTriggers.filter(t => t.type === type).length;
      return acc;
    }, {})
  };

  return (
    <Card className="border-orange-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Intervention Triggers
            </CardTitle>
            <CardDescription>
              Proactive alerts based on participant activity and progress
            </CardDescription>
          </div>
          {detectedTriggers.length > 0 && (
            <Badge className="bg-orange-100 text-orange-700 text-lg px-3">
              {detectedTriggers.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {detectedTriggers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <p className="font-medium text-green-700">All participants on track!</p>
            <p className="text-sm">No intervention triggers detected</p>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={filterType === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterType('all')}
              >
                All ({triggerCounts.all})
              </Button>
              {Object.entries(TRIGGER_TYPES).map(([type, config]) => (
                triggerCounts[type] > 0 && (
                  <Button
                    key={type}
                    size="sm"
                    variant={filterType === type ? 'default' : 'outline'}
                    onClick={() => setFilterType(type)}
                    className="gap-1"
                  >
                    <config.icon className="w-3 h-3" />
                    {config.label} ({triggerCounts[type]})
                  </Button>
                )
              ))}
            </div>

            {/* Selection controls */}
            {filteredTriggers.length > 0 && (
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedTriggers.length === filteredTriggers.length && filteredTriggers.length > 0}
                    onCheckedChange={(checked) => checked ? selectAllVisible() : clearSelection()}
                  />
                  <span className="text-sm text-gray-600">
                    {selectedTriggers.length} selected
                  </span>
                </div>
                {selectedTriggers.length > 0 && (
                  <Button size="sm" onClick={() => setShowNudgeModal(true)}>
                    <Send className="w-4 h-4 mr-1" />
                    Send Nudge
                  </Button>
                )}
              </div>
            )}

            {/* Trigger List */}
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                <AnimatePresence>
                  {filteredTriggers.map((trigger, index) => {
                    const config = TRIGGER_TYPES[trigger.type];
                    const Icon = config.icon;
                    
                    return (
                      <motion.div
                        key={trigger.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ delay: index * 0.05 }}
                        className={`p-3 border rounded-lg transition-colors ${
                          selectedTriggers.includes(trigger.id)
                            ? 'border-orange-300 bg-orange-50'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedTriggers.includes(trigger.id)}
                            onCheckedChange={() => toggleTrigger(trigger.id)}
                            className="mt-1"
                          />
                          <div className={`p-2 rounded-lg ${config.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium text-sm">{trigger.participant.name}</p>
                                <p className="text-xs text-gray-500">{trigger.participant.email}</p>
                              </div>
                              {getSeverityBadge(trigger.severity)}
                            </div>
                            <div className="mt-1">
                              <Badge variant="outline" className="text-xs">
                                {config.label}
                              </Badge>
                              <p className="text-sm text-gray-600 mt-1">{trigger.details}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>

      {/* Nudge Modal */}
      <Dialog open={showNudgeModal} onOpenChange={setShowNudgeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-orange-600" />
              Send Nudge to Participants
            </DialogTitle>
            <DialogDescription>
              Send a check-in message to {[...new Set(
                detectedTriggers
                  .filter(t => selectedTriggers.includes(t.id))
                  .map(t => t.participant.email)
              )].length} participant(s)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Custom Message (optional)
              </label>
              <Textarea
                value={nudgeMessage}
                onChange={(e) => setNudgeMessage(e.target.value)}
                placeholder="Leave empty for auto-generated personalized message..."
                rows={4}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                If left empty, a personalized message will be generated based on each participant's triggers.
              </p>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium mb-2">Selected triggers:</p>
              <div className="flex flex-wrap gap-1">
                {[...new Set(
                  detectedTriggers
                    .filter(t => selectedTriggers.includes(t.id))
                    .map(t => t.type)
                )].map(type => (
                  <Badge key={type} variant="outline" className="text-xs">
                    {TRIGGER_TYPES[type].label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNudgeModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendNudges} disabled={sending}>
              {sending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Nudges
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}