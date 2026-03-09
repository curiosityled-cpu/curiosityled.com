import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { 
  AlertTriangle, Send, Search, User, Map, Target, 
  BookOpen, Clock, TrendingDown, CheckCircle2, Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function ParticipantRiskIntelligence({ 
  programs, 
  journeyEnrollments, 
  goals, 
  assignedLearning,
  onRefresh 
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sendingNudge, setSendingNudge] = useState(null);

  // Calculate risk scores for participants
  const participantRisks = useMemo(() => {
    const allParticipantEmails = [...new Set(programs.flatMap(p => p.participant_emails || []))];
    
    return allParticipantEmails.map(email => {
      // Journey risks
      const userEnrollments = journeyEnrollments.filter(e => e.user_email === email);
      const stalledJourneys = userEnrollments.filter(e => {
        if (e.status === 'completed') return false;
        const daysSinceEnrolled = e.enrolled_date 
          ? Math.floor((new Date() - new Date(e.enrolled_date)) / (1000 * 60 * 60 * 24))
          : 0;
        return e.completion_percentage < 30 && daysSinceEnrolled > 14;
      });

      // Goal risks
      const userGoals = goals.filter(g => g.created_by === email || g.assigned_to_emails?.includes(email));
      const stalledGoals = userGoals.filter(g => {
        if (g.status === 'archived' || g.progress >= 100) return false;
        const daysSinceUpdate = g.updated_date 
          ? Math.floor((new Date() - new Date(g.updated_date)) / (1000 * 60 * 60 * 24))
          : 30;
        return daysSinceUpdate > 14 && (g.progress || 0) < 50;
      });

      // Learning risks
      const userLearning = assignedLearning.filter(a => a.user_email === email);
      const overdueLearning = userLearning.filter(a => {
        if (a.status === 'completed') return false;
        if (!a.due_date) return false;
        return new Date(a.due_date) < new Date();
      });

      // Calculate overall risk score (0-100, higher = more risk)
      let riskScore = 0;
      const riskFactors = [];

      if (stalledJourneys.length > 0) {
        riskScore += 30 + (stalledJourneys.length * 10);
        riskFactors.push({ type: 'journey', count: stalledJourneys.length, label: 'Stalled journeys' });
      }

      if (stalledGoals.length > 0) {
        riskScore += 20 + (stalledGoals.length * 5);
        riskFactors.push({ type: 'goal', count: stalledGoals.length, label: 'Stalled goals' });
      }

      if (overdueLearning.length > 0) {
        riskScore += 15 + (overdueLearning.length * 5);
        riskFactors.push({ type: 'learning', count: overdueLearning.length, label: 'Overdue learning' });
      }

      // No recent activity bonus risk
      const recentActivity = userEnrollments.some(e => {
        const lastActivity = e.last_activity_date || e.updated_date;
        if (!lastActivity) return false;
        const daysSince = Math.floor((new Date() - new Date(lastActivity)) / (1000 * 60 * 60 * 24));
        return daysSince < 7;
      });

      if (!recentActivity && userEnrollments.length > 0) {
        riskScore += 15;
        riskFactors.push({ type: 'inactive', count: 1, label: 'No recent activity' });
      }

      riskScore = Math.min(100, riskScore);

      // Determine risk level
      let riskLevel = 'low';
      if (riskScore >= 60) riskLevel = 'critical';
      else if (riskScore >= 40) riskLevel = 'high';
      else if (riskScore >= 20) riskLevel = 'medium';

      // Average journey progress
      const avgProgress = userEnrollments.length > 0
        ? Math.round(userEnrollments.reduce((sum, e) => sum + (e.completion_percentage || 0), 0) / userEnrollments.length)
        : 0;

      // Get program name
      const userProgram = programs.find(p => p.participant_emails?.includes(email));

      return {
        email,
        riskScore,
        riskLevel,
        riskFactors,
        avgProgress,
        enrollmentCount: userEnrollments.length,
        programName: userProgram?.name || 'Unknown Program'
      };
    })
    .filter(p => p.riskScore > 0)
    .sort((a, b) => b.riskScore - a.riskScore);
  }, [programs, journeyEnrollments, goals, assignedLearning]);

  const filteredParticipants = participantRisks.filter(p =>
    p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.programName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendNudge = async (participant) => {
    setSendingNudge(participant.email);
    try {
      const riskSummary = participant.riskFactors.map(f => f.label).join(', ');
      
      await base44.integrations.Core.SendEmail({
        to: participant.email,
        subject: "Friendly Check-in: Your Leadership Development Progress",
        body: `Hi there,

We noticed you might benefit from a little encouragement on your leadership development journey. 

You're currently at ${participant.avgProgress}% progress, and we want to help you succeed!

Areas to focus on: ${riskSummary}

Remember, consistent small steps lead to big transformations. Would you like to schedule a quick check-in with your program facilitator?

Keep growing,
Your Leadership Development Team`
      });

      toast.success("Nudge sent successfully!");
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error sending nudge:", error);
      toast.error("Failed to send nudge");
    }
    setSendingNudge(null);
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getRiskIcon = (type) => {
    switch (type) {
      case 'journey': return <Map className="w-3 h-3" />;
      case 'goal': return <Target className="w-3 h-3" />;
      case 'learning': return <BookOpen className="w-3 h-3" />;
      case 'inactive': return <Clock className="w-3 h-3" />;
      default: return <AlertTriangle className="w-3 h-3" />;
    }
  };

  const criticalCount = participantRisks.filter(p => p.riskLevel === 'critical').length;
  const highCount = participantRisks.filter(p => p.riskLevel === 'high').length;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className={criticalCount > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className={`w-8 h-8 ${criticalCount > 0 ? 'text-red-500' : 'text-gray-400'}`} />
              <div>
                <p className="text-2xl font-bold">{criticalCount}</p>
                <p className="text-sm text-gray-600">Critical Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={highCount > 0 ? "border-orange-200 bg-orange-50" : ""}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <TrendingDown className={`w-8 h-8 ${highCount > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
              <div>
                <p className="text-2xl font-bold">{highCount}</p>
                <p className="text-sm text-gray-600">High Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {[...new Set(programs.flatMap(p => p.participant_emails || []))].length - participantRisks.length}
                </p>
                <p className="text-sm text-gray-600">On Track</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* At-Risk Participants List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            At-Risk Participants
          </CardTitle>
          <CardDescription>
            Participants who may need intervention to stay on track
          </CardDescription>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by email or program..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredParticipants.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-600">All participants are on track!</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {filteredParticipants.map((participant, idx) => (
                  <motion.div
                    key={participant.email}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-4 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">{participant.email}</span>
                          <Badge className={getRiskColor(participant.riskLevel)}>
                            {participant.riskLevel.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">{participant.programName}</p>
                        
                        {/* Risk Factors */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {participant.riskFactors.map((factor, i) => (
                            <span 
                              key={i}
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-white rounded border"
                            >
                              {getRiskIcon(factor.type)}
                              {factor.label} ({factor.count})
                            </span>
                          ))}
                        </div>

                        {/* Progress */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Progress:</span>
                          <Progress value={participant.avgProgress} className="h-1.5 flex-1 max-w-32" />
                          <span className="text-xs font-medium">{participant.avgProgress}%</span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendNudge(participant)}
                        disabled={sendingNudge === participant.email}
                        className="ml-4"
                      >
                        {sendingNudge === participant.email ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-1" />
                            Nudge
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}