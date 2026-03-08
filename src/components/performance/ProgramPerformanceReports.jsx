import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import { 
  Target, Users, TrendingUp, Award, BookOpen, MessageSquare,
  Download, FileText, Calendar, CheckCircle, Clock, AlertTriangle,
  Loader2, ArrowUpRight, ArrowDownRight, User
} from "lucide-react";
import ParticipantDevelopmentTracker from "./ParticipantDevelopmentTracker";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { format, subDays, subMonths } from "date-fns";

const COLORS = ['#0202ff', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function ProgramPerformanceReports({ user, refreshTrigger }) {
  const { hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState("all");
  const [dateRange, setDateRange] = useState("30"); // days
  const [showParticipantTracker, setShowParticipantTracker] = useState(false);
  
  // Data states
  const [goals, setGoals] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [learningAssignments, setLearningAssignments] = useState([]);
  const [coachingSessions, setCoachingSessions] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, refreshTrigger]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load programs managed by this user
      const allPrograms = await base44.entities.Program.list();
      const managedPrograms = allPrograms.filter(p => 
        p.manager_emails?.includes(user.email) || 
        p.primary_manager_email === user.email ||
        p.program_manager_email === user.email
      );
      setPrograms(managedPrograms);

      const programIds = managedPrograms.map(p => p.id);
      
      // Load cohorts
      const allCohorts = await base44.entities.Cohort.list();
      const programCohorts = allCohorts.filter(c => programIds.includes(c.program_id));
      setCohorts(programCohorts);

      // Get participant emails
      const participantEmails = new Set();
      managedPrograms.forEach(p => {
        p.participant_emails?.forEach(e => participantEmails.add(e));
      });
      programCohorts.forEach(c => {
        c.participant_emails?.forEach(e => participantEmails.add(e));
      });

      // Load goals
      const allGoals = await base44.entities.Goal.list();
      const programGoals = allGoals.filter(g => 
        programIds.includes(g.program_id) || 
        participantEmails.has(g.created_by)
      );
      setGoals(programGoals);

      // Load assessments
      const allAssessments = await base44.entities.Assessment.list();
      const programAssessments = allAssessments.filter(a => 
        participantEmails.has(a.email)
      );
      setAssessments(programAssessments);

      // Load learning assignments
      const allLearning = await base44.entities.AssignedLearning.list();
      const programLearning = allLearning.filter(l => 
        participantEmails.has(l.user_email)
      );
      setLearningAssignments(programLearning);

      // Load coaching sessions
      const allCoaching = await base44.entities.CoachingSession.list();
      const programCoaching = allCoaching.filter(s => 
        s.coach_email === user.email || 
        participantEmails.has(s.participant_email)
      );
      setCoachingSessions(programCoaching);

      // Load participants
      if (participantEmails.size > 0) {
        const allUsers = await base44.entities.User.list();
        const programParticipants = allUsers.filter(u => participantEmails.has(u.email));
        setParticipants(programParticipants);
      }
    } catch (error) {
      console.error("Error loading report data:", error);
      toast.error("Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  // Filter data by selected program and date range
  const filteredData = useMemo(() => {
    const cutoffDate = subDays(new Date(), parseInt(dateRange));
    
    let filteredGoals = goals;
    let filteredAssessments = assessments;
    let filteredLearning = learningAssignments;
    let filteredCoaching = coachingSessions;
    
    if (selectedProgram !== "all") {
      const program = programs.find(p => p.id === selectedProgram);
      const programParticipants = new Set(program?.participant_emails || []);
      
      filteredGoals = goals.filter(g => g.program_id === selectedProgram);
      filteredAssessments = assessments.filter(a => programParticipants.has(a.email));
      filteredLearning = learningAssignments.filter(l => programParticipants.has(l.user_email));
      filteredCoaching = coachingSessions.filter(s => programParticipants.has(s.participant_email));
    }

    // Apply date filter
    filteredGoals = filteredGoals.filter(g => new Date(g.created_date) >= cutoffDate);
    filteredAssessments = filteredAssessments.filter(a => new Date(a.submission_ts || a.created_date) >= cutoffDate);
    filteredLearning = filteredLearning.filter(l => new Date(l.created_date) >= cutoffDate);
    filteredCoaching = filteredCoaching.filter(s => new Date(s.session_date || s.created_date) >= cutoffDate);

    return {
      goals: filteredGoals,
      assessments: filteredAssessments,
      learning: filteredLearning,
      coaching: filteredCoaching
    };
  }, [goals, assessments, learningAssignments, coachingSessions, selectedProgram, dateRange, programs]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const { goals: fGoals, assessments: fAssessments, learning: fLearning, coaching: fCoaching } = filteredData;
    
    // Goal metrics
    const totalGoals = fGoals.length;
    const completedGoals = fGoals.filter(g => g.status === 'archived' || g.progress === 100).length;
    const goalCompletionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;
    const avgGoalProgress = totalGoals > 0 
      ? Math.round(fGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / totalGoals) 
      : 0;

    // Assessment metrics
    const totalAssessments = fAssessments.length;
    const avgAssessmentScore = totalAssessments > 0
      ? Math.round(fAssessments.reduce((sum, a) => sum + (a.overall_pct || 0), 0) / totalAssessments)
      : 0;

    // Learning metrics
    const totalLearning = fLearning.length;
    const completedLearning = fLearning.filter(l => l.status === 'completed').length;
    const learningCompletionRate = totalLearning > 0 ? Math.round((completedLearning / totalLearning) * 100) : 0;

    // Coaching metrics
    const totalSessions = fCoaching.length;
    const completedSessions = fCoaching.filter(s => s.status === 'completed').length;

    // Participant metrics
    const activeParticipants = selectedProgram !== "all"
      ? programs.find(p => p.id === selectedProgram)?.participant_emails?.length || 0
      : participants.length;

    return {
      totalGoals,
      completedGoals,
      goalCompletionRate,
      avgGoalProgress,
      totalAssessments,
      avgAssessmentScore,
      totalLearning,
      completedLearning,
      learningCompletionRate,
      totalSessions,
      completedSessions,
      activeParticipants
    };
  }, [filteredData, selectedProgram, programs, participants]);

  // Chart data
  const goalStatusData = useMemo(() => {
    const { goals: fGoals } = filteredData;
    const statusCounts = {
      completed: fGoals.filter(g => g.status === 'archived' || g.progress === 100).length,
      active: fGoals.filter(g => g.status === 'active' && g.progress < 100).length,
      draft: fGoals.filter(g => g.status === 'draft').length,
      overdue: fGoals.filter(g => {
        if (!g.timeframe_end) return false;
        return new Date(g.timeframe_end) < new Date() && g.status !== 'archived';
      }).length
    };
    
    return [
      { name: 'Completed', value: statusCounts.completed, color: '#22c55e' },
      { name: 'Active', value: statusCounts.active, color: '#0202ff' },
      { name: 'Draft', value: statusCounts.draft, color: '#9ca3af' },
      { name: 'Overdue', value: statusCounts.overdue, color: '#ef4444' }
    ].filter(d => d.value > 0);
  }, [filteredData]);

  const programComparisonData = useMemo(() => {
    return programs.map(program => {
      const programGoals = goals.filter(g => g.program_id === program.id);
      const completed = programGoals.filter(g => g.status === 'archived' || g.progress === 100).length;
      const completionRate = programGoals.length > 0 ? Math.round((completed / programGoals.length) * 100) : 0;
      
      return {
        name: program.name?.substring(0, 15) + (program.name?.length > 15 ? '...' : ''),
        goals: programGoals.length,
        completionRate,
        participants: program.participant_emails?.length || 0
      };
    });
  }, [programs, goals]);

  const handleExportCSV = () => {
    if (!hasPermission('program_performance.export')) {
      toast.error("You don't have permission to export reports");
      return;
    }

    const reportData = [
      ['Program Performance Report'],
      ['Generated:', format(new Date(), 'PPpp')],
      ['Date Range:', `Last ${dateRange} days`],
      ['Selected Program:', selectedProgram === 'all' ? 'All Programs' : programs.find(p => p.id === selectedProgram)?.name],
      [''],
      ['Key Metrics'],
      ['Active Participants', metrics.activeParticipants],
      ['Total Goals', metrics.totalGoals],
      ['Goal Completion Rate', `${metrics.goalCompletionRate}%`],
      ['Average Goal Progress', `${metrics.avgGoalProgress}%`],
      ['Total Assessments', metrics.totalAssessments],
      ['Average Assessment Score', `${metrics.avgAssessmentScore}%`],
      ['Learning Completion Rate', `${metrics.learningCompletionRate}%`],
      ['Coaching Sessions', metrics.totalSessions]
    ];

    const csvContent = reportData.map(row => 
      Array.isArray(row) ? row.join(',') : row
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `program-performance-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    toast.success('CSV exported successfully!');
  };

  const [exportingPDF, setExportingPDF] = useState(false);

  const handleExportPDF = async () => {
    if (!hasPermission('program_performance.export')) {
      toast.error("You don't have permission to export reports");
      return;
    }

    setExportingPDF(true);
    try {
      const response = await base44.functions.invoke('exportProgramPerformancePDF', {
        program_id: selectedProgram !== 'all' ? selectedProgram : null,
        date_range_days: parseInt(dateRange)
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `program-performance-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (programs.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-12 text-center">
          <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Programs Found</h3>
          <p className="text-gray-500">You are not currently managing any programs.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4 items-center">
              <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Programs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  {programs.map(program => (
                    <SelectItem key={program.id} value={program.id}>{program.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {hasPermission('program_performance.export') && (
              <div className="flex gap-2">
                <Button onClick={handleExportCSV} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button onClick={handleExportPDF} variant="outline" disabled={exportingPDF}>
                  {exportingPDF ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  Export PDF
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-blue-100">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{metrics.activeParticipants}</p>
            <p className="text-xs text-gray-500">Active Participants</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-green-100">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              <Badge className={metrics.goalCompletionRate >= 70 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                {metrics.goalCompletionRate}%
              </Badge>
            </div>
            <p className="text-2xl font-bold text-gray-900">{metrics.completedGoals}/{metrics.totalGoals}</p>
            <p className="text-xs text-gray-500">Goals Completed</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-purple-100">
                <Award className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{metrics.avgAssessmentScore}%</p>
            <p className="text-xs text-gray-500">Avg Assessment Score</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-amber-100">
                <BookOpen className="w-5 h-5 text-amber-600" />
              </div>
              <Badge className={metrics.learningCompletionRate >= 70 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                {metrics.learningCompletionRate}%
              </Badge>
            </div>
            <p className="text-2xl font-bold text-gray-900">{metrics.completedLearning}/{metrics.totalLearning}</p>
            <p className="text-xs text-gray-500">Learning Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Goal Status Distribution */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Goal Status Distribution</CardTitle>
            <CardDescription>Breakdown of goals by current status</CardDescription>
          </CardHeader>
          <CardContent>
            {goalStatusData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-gray-400">
                No goal data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={goalStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {goalStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Program Comparison */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Program Comparison</CardTitle>
            <CardDescription>Goals and completion rates by program</CardDescription>
          </CardHeader>
          <CardContent>
            {programComparisonData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-gray-400">
                No program data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={programComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="goals" name="Total Goals" fill="#0202ff" />
                  <Bar dataKey="completionRate" name="Completion %" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Participant Tracker Button */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Participant Development Tracker</h3>
              <p className="text-sm text-gray-500">View detailed progress for individual participants</p>
            </div>
            <Button onClick={() => setShowParticipantTracker(true)} variant="outline">
              <User className="w-4 h-4 mr-2" />
              View Participants
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Participant Tracker Modal */}
      {showParticipantTracker && (
        <Dialog open={showParticipantTracker} onOpenChange={setShowParticipantTracker}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Participant Development Tracker</DialogTitle>
              <DialogDescription>
                View and track individual participant progress across goals, learning, and assessments
              </DialogDescription>
            </DialogHeader>
            <ParticipantDevelopmentTracker 
              programId={selectedProgram !== 'all' ? selectedProgram : null}
              onClose={() => setShowParticipantTracker(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Program Summary Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">Program Summary</CardTitle>
          <CardDescription>Overview of all managed programs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Program</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Participants</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Goals</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Completion</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {programs.map(program => {
                  const programGoals = goals.filter(g => g.program_id === program.id);
                  const completed = programGoals.filter(g => g.status === 'archived' || g.progress === 100).length;
                  const completionRate = programGoals.length > 0 ? Math.round((completed / programGoals.length) * 100) : 0;
                  
                  return (
                    <tr key={program.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{program.name}</p>
                        <p className="text-xs text-gray-500">{program.program_type || 'Custom'}</p>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="font-medium">{program.participant_emails?.length || 0}</span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="font-medium">{programGoals.length}</span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <Progress value={completionRate} className="h-2 w-16" />
                          <span className="text-sm font-medium">{completionRate}%</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <Badge className={
                          program.status === 'active' ? 'bg-green-100 text-green-700' :
                          program.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }>
                          {program.status || 'draft'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}