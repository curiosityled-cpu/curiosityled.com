import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Loader2, Sparkles, AlertTriangle, TrendingUp, TrendingDown, 
  Target, Map, Users, Send, RefreshCw, Lightbulb, CheckCircle2,
  Clock, BarChart3, Zap, BookOpen, ClipboardCheck, GraduationCap
} from "lucide-react";
import { motion } from "framer-motion";
import ProgramHealthNarrative from "@/components/dashboard/insights/ProgramHealthNarrative";
import ParticipantRiskIntelligence from "@/components/dashboard/insights/ParticipantRiskIntelligence";
import JourneyEffectivenessInsights from "@/components/dashboard/insights/JourneyEffectivenessInsights";
import RecommendationsPanel from "@/components/dashboard/insights/RecommendationsPanel";
import AssessmentInsightsSection from "@/components/dashboard/insights/AssessmentInsightsSection";
import LearningInsightsSection from "@/components/dashboard/insights/LearningInsightsSection";
import GoalsInsightsSection from "@/components/dashboard/insights/GoalsInsightsSection";

export default function ProgramAdminInsightsView() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Data states
  const [programs, setPrograms] = useState([]);
  const [journeyEnrollments, setJourneyEnrollments] = useState([]);
  const [goals, setGoals] = useState([]);
  const [assignedLearning, setAssignedLearning] = useState([]);
  const [journeys, setJourneys] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [coachingSessions, setCoachingSessions] = useState([]);
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    if (user) {
      loadInsightsData();
    }
  }, [user?.id]);

  const loadInsightsData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      // First, try to get programs from managed_program_ids on user
      const managedProgramIds = user?.managed_program_ids || [];
      
      // Also fetch programs where user is assigned as manager/facilitator
      let programsData = [];
      
      if (managedProgramIds.length > 0) {
        programsData = await base44.entities.Program.filter({ id: { $in: managedProgramIds } });
      }
      
      // Also check for programs where user is primary_manager_email or in manager_emails
      const [programsByPrimaryManager, allPrograms] = await Promise.all([
        base44.entities.Program.filter({ primary_manager_email: user.email }),
        base44.entities.Program.list("-created_date", 200)
      ]);
      
      // Filter programs where user is in manager_emails array
      const programsByManagerEmails = allPrograms.filter(p => 
        (p.manager_emails || []).includes(user.email) ||
        p.program_manager_email === user.email
      );
      
      // Combine and dedupe all programs
      const allManagedPrograms = [...programsData, ...programsByPrimaryManager, ...programsByManagerEmails];
      const uniqueProgramIds = [...new Set(allManagedPrograms.map(p => p.id))];
      programsData = allManagedPrograms.filter((p, idx) => 
        allManagedPrograms.findIndex(prog => prog.id === p.id) === idx
      );
      
      if (programsData.length === 0) {
        setPrograms([]);
        setJourneyEnrollments([]);
        setGoals([]);
        setAssignedLearning([]);
        setJourneys([]);
        setAssessments([]);
        setCoachingSessions([]);
        setClasses([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Fetch goals for all managed programs
      const goalsData = uniqueProgramIds.length > 0
        ? await base44.entities.Goal.filter({ program_id: { $in: uniqueProgramIds } })
        : [];

      // Get all journey IDs and participant emails
      const allJourneyIds = programsData.flatMap(p => p.journey_ids || []);
      const allParticipantEmails = [...new Set(programsData.flatMap(p => p.participant_emails || []))];

      // Get class IDs from programs
      const allClassIds = programsData.flatMap(p => p.class_ids || []);

      // Fetch journeys, enrollments, assigned learning, assessments, coaching sessions, and classes
      const [journeysData, enrollmentsData, learningData, assessmentsData, coachingData, classesData] = await Promise.all([
        allJourneyIds.length > 0 
          ? base44.entities.LearningJourney.filter({ id: { $in: allJourneyIds } })
          : [],
        allJourneyIds.length > 0
          ? base44.entities.JourneyEnrollment.filter({ journey_id: { $in: allJourneyIds } })
          : [],
        allParticipantEmails.length > 0
          ? base44.entities.AssignedLearning.list("-created_date", 500).then(all => 
              all.filter(a => allParticipantEmails.includes(a.user_email))
            )
          : [],
        allParticipantEmails.length > 0
          ? base44.entities.Assessment.list("-submission_ts", 500).then(all =>
              all.filter(a => allParticipantEmails.includes(a.email))
            )
          : [],
        allParticipantEmails.length > 0
          ? base44.entities.CoachingSession.list("-session_date", 200).then(all =>
              all.filter(s => allParticipantEmails.includes(s.coachee_email))
            )
          : [],
        allClassIds.length > 0
          ? base44.entities.Class.filter({ id: { $in: allClassIds } })
          : []
      ]);

      setPrograms(programsData);
      setGoals(goalsData);
      setJourneys(journeysData);
      setJourneyEnrollments(enrollmentsData);
      setAssignedLearning(learningData);
      setAssessments(assessmentsData);
      setCoachingSessions(coachingData);
      setClasses(classesData);
    } catch (error) {
      console.error("Error loading insights data:", error);
    }
    
    setLoading(false);
    setRefreshing(false);
  };

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const totalParticipants = [...new Set(programs.flatMap(p => p.participant_emails || []))].length;
    const totalEnrollments = journeyEnrollments.length;
    const completedEnrollments = journeyEnrollments.filter(e => e.status === 'completed').length;
    const completionRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;
    
    // At-risk calculation
    const atRiskEnrollments = journeyEnrollments.filter(e => {
      if (e.status === 'completed') return false;
      const daysSinceEnrolled = e.enrolled_date 
        ? Math.floor((new Date() - new Date(e.enrolled_date)) / (1000 * 60 * 60 * 24))
        : 0;
      return e.completion_percentage < 30 && daysSinceEnrolled > 14;
    });

    // Goal metrics
    const totalGoals = goals.length;
    const completedGoals = goals.filter(g => g.status === 'archived' || g.progress >= 100).length;
    const goalCompletionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

    // Learning metrics
    const completedLearning = assignedLearning.filter(a => a.status === 'completed').length;
    const learningCompletionRate = assignedLearning.length > 0 
      ? Math.round((completedLearning / assignedLearning.length) * 100) 
      : 0;

    // Assessment metrics
    const avgAssessmentScore = assessments.length > 0
      ? Math.round(assessments.reduce((sum, a) => sum + (a.overall_pct || 0), 0) / assessments.length)
      : 0;

    // Coaching metrics
    const completedSessions = coachingSessions.filter(s => s.status === 'completed').length;
    const upcomingSessions = coachingSessions.filter(s => s.status === 'scheduled' && new Date(s.session_date) > new Date()).length;

    // Class metrics
    const totalClasses = classes.length;
    const completedClasses = classes.filter(c => c.status === 'completed').length;

    return {
      totalPrograms: programs.length,
      totalParticipants,
      totalEnrollments,
      completionRate,
      atRiskCount: atRiskEnrollments.length,
      totalGoals,
      goalCompletionRate,
      learningCompletionRate,
      avgJourneyProgress: totalEnrollments > 0
        ? Math.round(journeyEnrollments.reduce((sum, e) => sum + (e.completion_percentage || 0), 0) / totalEnrollments)
        : 0,
      // Cross-sectional metrics
      totalAssessments: assessments.length,
      avgAssessmentScore,
      totalLearningAssigned: assignedLearning.length,
      completedCoachingSessions: completedSessions,
      upcomingCoachingSessions: upcomingSessions,
      totalClasses,
      completedClasses
    };
  }, [programs, journeyEnrollments, goals, assignedLearning, assessments, coachingSessions, classes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (programs.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Programs Assigned</h3>
          <p className="text-gray-500">You don't have any programs assigned to manage yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            Program Insights
          </h2>
          <p className="text-gray-500 mt-1">AI-powered intelligence for your managed programs</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => loadInsightsData(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Quick Stats - Primary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Journey Progress</p>
                  <p className="text-2xl font-bold text-blue-700">{summaryMetrics.avgJourneyProgress}%</p>
                </div>
                <Map className="w-8 h-8 text-blue-400" />
              </div>
              <Progress value={summaryMetrics.avgJourneyProgress} className="mt-2 h-1.5" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-green-50 to-white border-green-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Goal Completion</p>
                  <p className="text-2xl font-bold text-green-700">{summaryMetrics.goalCompletionRate}%</p>
                </div>
                <Target className="w-8 h-8 text-green-400" />
              </div>
              <Progress value={summaryMetrics.goalCompletionRate} className="mt-2 h-1.5 bg-green-100" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Participants</p>
                  <p className="text-2xl font-bold text-purple-700">{summaryMetrics.totalParticipants}</p>
                </div>
                <Users className="w-8 h-8 text-purple-400" />
              </div>
              <p className="text-xs text-purple-500 mt-2">Across {summaryMetrics.totalPrograms} programs</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className={`bg-gradient-to-br ${summaryMetrics.atRiskCount > 0 ? 'from-orange-50 border-orange-200' : 'from-gray-50 border-gray-200'} to-white`}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${summaryMetrics.atRiskCount > 0 ? 'text-orange-600' : 'text-gray-600'}`}>At Risk</p>
                  <p className={`text-2xl font-bold ${summaryMetrics.atRiskCount > 0 ? 'text-orange-700' : 'text-gray-700'}`}>
                    {summaryMetrics.atRiskCount}
                  </p>
                </div>
                <AlertTriangle className={`w-8 h-8 ${summaryMetrics.atRiskCount > 0 ? 'text-orange-400' : 'text-gray-400'}`} />
              </div>
              <p className={`text-xs mt-2 ${summaryMetrics.atRiskCount > 0 ? 'text-orange-500' : 'text-gray-500'}`}>
                {summaryMetrics.atRiskCount > 0 ? 'Needs attention' : 'All on track'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Cross-Sectional Stats - Secondary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="bg-white border-gray-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Assessments</p>
                  <p className="text-2xl font-bold text-gray-800">{summaryMetrics.totalAssessments}</p>
                </div>
                <ClipboardCheck className="w-7 h-7 text-indigo-400" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {summaryMetrics.avgAssessmentScore > 0 ? `Avg: ${summaryMetrics.avgAssessmentScore}%` : 'No scores yet'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="bg-white border-gray-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Learning Assigned</p>
                  <p className="text-2xl font-bold text-gray-800">{summaryMetrics.totalLearningAssigned}</p>
                </div>
                <BookOpen className="w-7 h-7 text-blue-400" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {summaryMetrics.learningCompletionRate}% completed
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card className="bg-white border-gray-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Coaching Sessions</p>
                  <p className="text-2xl font-bold text-gray-800">{summaryMetrics.completedCoachingSessions}</p>
                </div>
                <Users className="w-7 h-7 text-teal-400" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {summaryMetrics.upcomingCoachingSessions} upcoming
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <Card className="bg-white border-gray-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Classes</p>
                  <p className="text-2xl font-bold text-gray-800">{summaryMetrics.totalClasses}</p>
                </div>
                <GraduationCap className="w-7 h-7 text-amber-400" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {summaryMetrics.completedClasses} completed
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Insights Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-6 w-full max-w-3xl">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="assessments" className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Assessments</span>
          </TabsTrigger>
          <TabsTrigger value="learning" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Learning</span>
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">Goals</span>
          </TabsTrigger>
          <TabsTrigger value="risks" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="hidden sm:inline">Risks</span>
          </TabsTrigger>
          <TabsTrigger value="actions" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Actions</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <ProgramHealthNarrative 
            programs={programs}
            journeyEnrollments={journeyEnrollments}
            goals={goals}
            metrics={summaryMetrics}
            assessments={assessments}
            assignedLearning={assignedLearning}
            coachingSessions={coachingSessions}
          />
        </TabsContent>

        <TabsContent value="assessments" className="space-y-6">
          <AssessmentInsightsSection
            assessments={assessments}
            programs={programs}
            participantEmails={[...new Set(programs.flatMap(p => p.participant_emails || []))]}
          />
        </TabsContent>

        <TabsContent value="learning" className="space-y-6">
          <LearningInsightsSection
            assignedLearning={assignedLearning}
            journeyEnrollments={journeyEnrollments}
            journeys={journeys}
            programs={programs}
          />
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <GoalsInsightsSection
            goals={goals}
            programs={programs}
            participantEmails={[...new Set(programs.flatMap(p => p.participant_emails || []))]}
          />
        </TabsContent>

        <TabsContent value="risks" className="space-y-6">
          <ParticipantRiskIntelligence
            programs={programs}
            journeyEnrollments={journeyEnrollments}
            goals={goals}
            assignedLearning={assignedLearning}
            assessments={assessments}
            onRefresh={() => loadInsightsData(true)}
          />
        </TabsContent>

        <TabsContent value="actions" className="space-y-6">
          <RecommendationsPanel
            programs={programs}
            journeyEnrollments={journeyEnrollments}
            goals={goals}
            assignedLearning={assignedLearning}
            assessments={assessments}
            coachingSessions={coachingSessions}
            metrics={summaryMetrics}
            onRefresh={() => loadInsightsData(true)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}