import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  X, User, Mail, Building2, Award, TrendingUp, Target, 
  BookOpen, CheckCircle, AlertCircle, Calendar, Clock,
  BarChart3, Brain, Sparkles
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

export default function TeamMemberModal({ isOpen, onClose, member }) {
  const [loading, setLoading] = useState(true);
  const [memberDetails, setMemberDetails] = useState(null);

  useEffect(() => {
    if (isOpen && member) {
      loadMemberDetails();
    }
  }, [isOpen, member]);

  const loadMemberDetails = async () => {
    setLoading(true);
    try {
      // Fetch detailed data for this team member
      const [assessments, goals, assignedLearning, journeys] = await Promise.all([
        base44.entities.Assessment.filter({ email: member.email }, '-submission_ts', 10),
        base44.entities.Goal.filter({ user_email: member.email }),
        base44.entities.AssignedLearning.filter({ user_email: member.email }),
        base44.entities.JourneyEnrollment.filter({ user_email: member.email })
      ]);

      const latestAssessment = assessments[0];
      
      // Calculate competency data for radar chart
      const competencyData = latestAssessment ? [
        { competency: 'Decision Making', score: latestAssessment.dm_pct || 0 },
        { competency: 'Communication', score: latestAssessment.comm_pct || 0 },
        { competency: 'Resource Mgmt', score: latestAssessment.rm_pct || 0 },
        { competency: 'Stakeholder Mgmt', score: latestAssessment.sm_pct || 0 },
        { competency: 'Performance Mgmt', score: latestAssessment.pm_pct || 0 }
      ] : [];

      // Calculate goal metrics
      const activeGoals = goals.filter(g => ['active', 'at_risk', 'overdue'].includes(g.status));
      const completedGoals = goals.filter(g => g.status === 'completed');
      const overdueGoals = goals.filter(g => g.status === 'overdue');
      const avgGoalProgress = activeGoals.length > 0
        ? Math.round(activeGoals.reduce((sum, g) => sum + (g.completion_percentage || 0), 0) / activeGoals.length)
        : 0;

      // Calculate learning metrics
      const completedLearning = assignedLearning.filter(l => l.status === 'completed');
      const inProgressLearning = assignedLearning.filter(l => l.status === 'in_progress' || l.status === 'started');
      const overdueLearning = assignedLearning.filter(l => {
        if (!l.due_date) return false;
        const dueDate = new Date(l.due_date);
        return dueDate < new Date() && l.status !== 'completed';
      });
      const learningCompletionRate = assignedLearning.length > 0
        ? Math.round((completedLearning.length / assignedLearning.length) * 100)
        : 0;

      // Calculate journey metrics
      const activeJourneys = journeys.filter(j => j.status === 'in_progress');
      const completedJourneys = journeys.filter(j => j.status === 'completed');
      const avgJourneyProgress = journeys.length > 0
        ? Math.round(journeys.reduce((sum, j) => sum + (j.completion_percentage || 0), 0) / journeys.length)
        : 0;

      // Assessment trend data
      const assessmentTrend = assessments.slice(0, 5).reverse().map(a => ({
        date: new Date(a.submission_ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        'SI Score': a.si_pct || 0,
        'Overall': a.overall_pct || 0
      }));

      // Calculate readiness
      const calculateReadiness = (assessment) => {
        if (!assessment) return 'not_assessed';
        const siScore = assessment.si_pct || 0;
        const overallScore = assessment.overall_pct || 0;
        
        if (siScore >= 85 && overallScore >= 85) return 'ready_now';
        if (siScore >= 75 && overallScore >= 75) return 'high_potential';
        if (siScore >= 60 && overallScore >= 60) return 'developing';
        return 'at_risk';
      };

      setMemberDetails({
        ...member,
        latestAssessment,
        competencyData,
        assessmentTrend,
        readiness: calculateReadiness(latestAssessment),
        goals: {
          total: goals.length,
          active: activeGoals.length,
          completed: completedGoals.length,
          overdue: overdueGoals.length,
          avgProgress: avgGoalProgress
        },
        learning: {
          total: assignedLearning.length,
          completed: completedLearning.length,
          inProgress: inProgressLearning.length,
          overdue: overdueLearning.length,
          completionRate: learningCompletionRate
        },
        journeys: {
          total: journeys.length,
          active: activeJourneys.length,
          completed: completedJourneys.length,
          avgProgress: avgJourneyProgress
        }
      });
    } catch (error) {
      console.error('Error loading member details:', error);
      toast.error('Failed to load team member details');
    } finally {
      setLoading(false);
    }
  };

  const getReadinessBadge = (readiness) => {
    const colors = {
      ready_now: 'bg-green-100 text-green-800',
      high_potential: 'bg-blue-100 text-blue-800',
      developing: 'bg-yellow-100 text-yellow-800',
      at_risk: 'bg-red-100 text-red-800',
      not_assessed: 'bg-gray-100 text-gray-800'
    };
    
    return colors[readiness] || colors.not_assessed;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-xl font-bold">
                  {member?.full_name?.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-1">{member?.full_name}</h2>
                  <p className="text-purple-100">{member?.current_role || member?.app_role}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              </div>
            ) : memberDetails ? (
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Award className="w-5 h-5 text-purple-600" />
                        <Badge className={getReadinessBadge(memberDetails.readiness)}>
                          {memberDetails.readiness?.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">Succession Readiness</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                        <span className="text-2xl font-bold text-blue-600">
                          {memberDetails.latestAssessment?.si_pct || 0}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">SI Score</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Target className="w-5 h-5 text-green-600" />
                        <span className="text-2xl font-bold text-green-600">
                          {memberDetails.goals.avgProgress}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">Goal Progress</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <BookOpen className="w-5 h-5 text-orange-600" />
                        <span className="text-2xl font-bold text-orange-600">
                          {memberDetails.learning.completionRate}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">Learning Rate</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Main Content Grid */}
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Competency Radar Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-600" />
                        Competency Profile
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {memberDetails.competencyData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <RadarChart data={memberDetails.competencyData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="competency" tick={{ fontSize: 11 }} />
                            <PolarRadiusAxis domain={[0, 100]} />
                            <Radar
                              name="Score"
                              dataKey="score"
                              stroke="#8b5cf6"
                              fill="#8b5cf6"
                              fillOpacity={0.6}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                          <p>No assessment data available</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Assessment Trend */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        Assessment Trend
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {memberDetails.assessmentTrend.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={memberDetails.assessmentTrend}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="SI Score" fill="#8b5cf6" />
                            <Bar dataKey="Overall" fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                          <p>No historical data available</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Goals Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="w-5 h-5 text-green-600" />
                      Goal Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{memberDetails.goals.total}</p>
                        <p className="text-xs text-gray-600">Total Goals</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{memberDetails.goals.active}</p>
                        <p className="text-xs text-gray-600">Active</p>
                      </div>
                      <div className="text-center p-3 bg-emerald-50 rounded-lg">
                        <p className="text-2xl font-bold text-emerald-600">{memberDetails.goals.completed}</p>
                        <p className="text-xs text-gray-600">Completed</p>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <p className="text-2xl font-bold text-red-600">{memberDetails.goals.overdue}</p>
                        <p className="text-xs text-gray-600">Overdue</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Average Progress</span>
                        <span className="font-bold">{memberDetails.goals.avgProgress}%</span>
                      </div>
                      <Progress value={memberDetails.goals.avgProgress} className="h-3" />
                    </div>

                    {memberDetails.goals.overdue > 0 && (
                      <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-red-800">
                          {memberDetails.goals.overdue} goal{memberDetails.goals.overdue > 1 ? 's' : ''} overdue - may need support
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Learning Progress */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-orange-600" />
                      Learning Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <p className="text-2xl font-bold text-orange-600">{memberDetails.learning.total}</p>
                        <p className="text-xs text-gray-600">Assigned</p>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{memberDetails.learning.inProgress}</p>
                        <p className="text-xs text-gray-600">In Progress</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{memberDetails.learning.completed}</p>
                        <p className="text-xs text-gray-600">Completed</p>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <p className="text-2xl font-bold text-red-600">{memberDetails.learning.overdue}</p>
                        <p className="text-xs text-gray-600">Overdue</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Completion Rate</span>
                        <span className="font-bold">{memberDetails.learning.completionRate}%</span>
                      </div>
                      <Progress value={memberDetails.learning.completionRate} className="h-3" />
                    </div>

                    {memberDetails.learning.overdue > 0 && (
                      <div className="mt-4 flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
                        <Clock className="w-4 h-4 text-orange-600" />
                        <span className="text-sm text-orange-800">
                          {memberDetails.learning.overdue} learning item{memberDetails.learning.overdue > 1 ? 's' : ''} overdue
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Journey Progress */}
                {memberDetails.journeys.total > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        Learning Journeys
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <p className="text-2xl font-bold text-purple-600">{memberDetails.journeys.total}</p>
                          <p className="text-xs text-gray-600">Total Journeys</p>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">{memberDetails.journeys.active}</p>
                          <p className="text-xs text-gray-600">Active</p>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">{memberDetails.journeys.completed}</p>
                          <p className="text-xs text-gray-600">Completed</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Average Progress</span>
                          <span className="font-bold">{memberDetails.journeys.avgProgress}%</span>
                        </div>
                        <Progress value={memberDetails.journeys.avgProgress} className="h-3" />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Contact Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="w-5 h-5 text-gray-600" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{memberDetails.email}</span>
                      </div>
                      {memberDetails.department && (
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{memberDetails.department}</span>
                        </div>
                      )}
                      {memberDetails.manager_email && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Reports to: {memberDetails.manager_email}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>No data available for this team member</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}