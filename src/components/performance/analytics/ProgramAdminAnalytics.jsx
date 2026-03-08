import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, Users, TrendingUp, BookOpen, Loader2, CheckCircle2, Map, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ProgramJourneyHealth from "@/components/program-manager/ProgramJourneyHealth";
import InterventionTriggersPanel from "@/components/program-manager/InterventionTriggersPanel";

export default function ProgramAdminAnalytics({ user }) {
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState([]);
  const [programGoals, setProgramGoals] = useState([]);
  const [programItems, setProgramItems] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [journeyEnrollments, setJourneyEnrollments] = useState([]);

  useEffect(() => {
    if (user) {
      loadProgramData();
    }
  }, [user?.id]);

  const loadProgramData = async () => {
    setLoading(true);
    try {
      const managedProgramIds = user?.managed_program_ids || [];
      
      // Handle empty managed_program_ids gracefully
      if (managedProgramIds.length === 0) {
        setPrograms([]);
        setProgramGoals([]);
        setProgramItems([]);
        setCohorts([]);
        setJourneyEnrollments([]);
        setLoading(false);
        return;
      }
      
      const [programsData, goalsData, itemsData, cohortsData] = await Promise.all([
        base44.entities.Program.filter({ id: { $in: managedProgramIds } }),
        base44.entities.Goal.filter({ program_id: { $in: managedProgramIds } }, "-updated_date"),
        base44.entities.Item.list("-updated_date"),
        base44.entities.Cohort.filter({ program_id: { $in: managedProgramIds } })
      ]);

      const goalIds = goalsData.map(g => g.id);
      const programItemsData = itemsData.filter(item => goalIds.includes(item.board_id));

      // Load journey enrollments for programs with journeys
      const allJourneyIds = programsData.flatMap(p => p.journey_ids || []);
      let enrollmentsData = [];
      if (allJourneyIds.length > 0) {
        enrollmentsData = await base44.entities.JourneyEnrollment.filter({
          journey_id: { $in: allJourneyIds }
        });
      }

      setPrograms(programsData);
      setProgramGoals(goalsData);
      setProgramItems(programItemsData);
      setCohorts(cohortsData);
      setJourneyEnrollments(enrollmentsData);
    } catch (error) {
      console.error("Error loading program data:", error);
    }
    setLoading(false);
  };

  const metrics = useMemo(() => {
    const totalPrograms = programs.length;
    // Count participants from programs directly, fallback to cohorts
    const programParticipants = programs.reduce((sum, p) => sum + (p.participant_emails?.length || 0), 0);
    const cohortParticipants = cohorts.reduce((sum, c) => sum + (c.participant_emails?.length || 0), 0);
    const totalParticipants = programParticipants || cohortParticipants;
    const totalGoals = programGoals.length;
    const totalTasks = programItems.length;
    const completedTasks = programItems.filter(item => item.data?.status === 'completed').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Journey metrics
    const allJourneyIds = programs.flatMap(p => p.journey_ids || []);
    const totalJourneys = allJourneyIds.length;
    const journeyEnrollmentCount = journeyEnrollments.length;
    const completedJourneys = journeyEnrollments.filter(e => e.status === 'completed').length;
    const atRiskLearners = journeyEnrollments.filter(e => 
      e.status === 'in_progress' && 
      e.completion_percentage < 30 &&
      e.enrolled_date && 
      (new Date() - new Date(e.enrolled_date)) / (1000 * 60 * 60 * 24) > 14
    ).length;
    const avgJourneyCompletion = journeyEnrollmentCount > 0
      ? Math.round(journeyEnrollments.reduce((sum, e) => sum + (e.completion_percentage || 0), 0) / journeyEnrollmentCount)
      : 0;

    const programPerformance = programs.map(program => {
      const pGoals = programGoals.filter(g => g.program_id === program.id);
      const avgProgress = pGoals.length > 0
        ? Math.round(pGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / pGoals.length)
        : 0;
      
      const cohort = cohorts.find(c => c.id === program.id);
      
      // Journey metrics per program
      const programJourneyIds = program.journey_ids || [];
      const programEnrollments = journeyEnrollments.filter(e => programJourneyIds.includes(e.journey_id));
      const journeyProgress = programEnrollments.length > 0
        ? Math.round(programEnrollments.reduce((sum, e) => sum + (e.completion_percentage || 0), 0) / programEnrollments.length)
        : 0;
      
      return {
        id: program.id,
        name: program.name || 'Unnamed Program',
        goals: pGoals.length,
        participants: cohort?.participant_emails?.length || program.participant_emails?.length || 0,
        avgProgress,
        journeyCount: programJourneyIds.length,
        journeyProgress,
        journeyIds: programJourneyIds,
        participantEmails: program.participant_emails || []
      };
    });

    return {
      totalPrograms,
      totalParticipants,
      totalGoals,
      completionRate,
      totalJourneys,
      journeyEnrollmentCount,
      completedJourneys,
      atRiskLearners,
      avgJourneyCompletion,
      programPerformance
    };
  }, [programs, programGoals, programItems, cohorts, journeyEnrollments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 font-medium">
                <Target className="w-5 h-5" />
                Programs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.totalPrograms}</div>
              <p className="text-orange-100 text-sm mt-1">Managed programs</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 font-medium">
                <Users className="w-5 h-5" />
                Participants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.totalParticipants}</div>
              <p className="text-purple-100 text-sm mt-1">Active learners</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 font-medium">
                <BookOpen className="w-5 h-5" />
                Program Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.totalGoals}</div>
              <p className="text-blue-100 text-sm mt-1">Goals tracked</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-5 h-5" />
                Completion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.completionRate}%</div>
              <Progress value={metrics.completionRate} className="mt-2 bg-green-300 h-1.5" />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Journey Health Summary */}
      {metrics.totalJourneys > 0 && (
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="w-5 h-5 text-purple-600" />
              Journey Health Summary
            </CardTitle>
            <CardDescription>
              Automated learning path progress across all programs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-sm text-gray-500">Total Journeys</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.totalJourneys}</p>
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-sm text-gray-500">Avg Completion</p>
                <p className="text-2xl font-bold text-blue-600">{metrics.avgJourneyCompletion}%</p>
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-green-600">{metrics.completedJourneys}</p>
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <div className="flex items-center gap-1">
                  <p className="text-sm text-gray-500">At Risk</p>
                  {metrics.atRiskLearners > 0 && <AlertTriangle className="w-3 h-3 text-orange-500" />}
                </div>
                <p className={`text-2xl font-bold ${metrics.atRiskLearners > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                  {metrics.atRiskLearners}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Program Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Program Performance Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.programPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.programPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: 'Avg Progress %', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="avgProgress" fill="#3b82f6" name="Goal Progress" />
                <Bar dataKey="journeyProgress" fill="#9333ea" name="Journey Progress" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No program data available</p>
          )}
        </CardContent>
      </Card>

      {/* Program Details */}
      <Card>
        <CardHeader>
          <CardTitle>Program Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.programPerformance.map((program, idx) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium">{program.name}</p>
                    <p className="text-sm text-gray-500">
                      {program.participants} participants · {program.goals} goals
                      {program.journeyCount > 0 && ` · ${program.journeyCount} journeys`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500"
                        style={{ width: `${program.avgProgress}%` }}
                      />
                    </div>
                    <Badge variant="outline" className="min-w-[3rem] justify-center">
                      {program.avgProgress}%
                    </Badge>
                  </div>
                </div>
                
                {/* Journey progress for this program */}
                {program.journeyCount > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-purple-600">
                        <Map className="w-3 h-3" />
                        Journey Progress
                      </span>
                      <span className="text-gray-600">{program.journeyProgress}%</span>
                    </div>
                    <Progress value={program.journeyProgress} className="h-1.5 mt-1" />
                  </div>
                )}
              </div>
            ))}
            {metrics.programPerformance.length === 0 && (
              <p className="text-gray-500 text-center py-8">No programs assigned</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Intervention Triggers - All Programs */}
      {metrics.totalParticipants > 0 && (
        <InterventionTriggersPanel
          programId={null}
          journeyIds={programs.flatMap(p => p.journey_ids || [])}
          participantEmails={[...new Set(programs.flatMap(p => p.participant_emails || []))]}
          onInterventionSent={loadProgramData}
        />
      )}

      {/* Detailed Journey Health per Program */}
      {metrics.programPerformance.filter(p => p.journeyCount > 0).map(program => (
        <ProgramJourneyHealth
          key={program.id}
          programId={program.id}
          journeyIds={program.journeyIds}
          participantEmails={program.participantEmails}
        />
      ))}
    </div>
  );
}