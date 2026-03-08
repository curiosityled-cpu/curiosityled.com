import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  X,
  User,
  BarChart3,
  Target,
  BookOpen,
  Clock,
  AlertCircle,
  CheckCircle,
  Mail,
  Calendar,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  Loader2,
  Send,
  Plus,
  MessageSquare,
  Eye,
  Award,
  FileText,
  Lock,
  Unlock,
  Shield
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import AssignLearningModal from "../learning/AssignLearningModal";
import CreateGoalModal from "../goals/CreateGoalModal";
import Schedule1on1Modal from "../ai/modals/Schedule1on1Modal";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import LoginHistoryChart from "../security/LoginHistoryChart";
import SecurityAuditExport from "../security/SecurityAuditExport";
import ImpersonationHistoryTab from "../security/ImpersonationHistoryTab";
import ActivityReportExport from "../users/ActivityReportExport";

export default function UserDetailPanel({ userEmail, onClose, viewContext = "manager" }) {
  const { user: currentUser, appRole, startImpersonation, isImpersonating } = useAuth(); // Added startImpersonation, isImpersonating
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [assessmentData, setAssessmentData] = useState(null);
  const [goals, setGoals] = useState([]);
  const [learning, setLearning] = useState([]);
  const [onboardingPlan, setOnboardingPlan] = useState(null);
  const [activities, setActivities] = useState([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [impersonating, setImpersonating] = useState(false); // Added impersonating state
  const [certifications, setCertifications] = useState([]);
  const [externalAssessments, setExternalAssessments] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loadingLoginHistory, setLoadingLoginHistory] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Modals
  const [showAssignLearning, setShowAssignLearning] = useState(false);
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [showSchedule1on1, setShowSchedule1on1] = useState(false);

  useEffect(() => {
    if (userEmail) {
      checkAccessAndLoadData();
    }
  }, [userEmail]);

  const checkAccessAndLoadData = async () => {
    setLoading(true);
    try {
      // Check authorization
      const authorized = await checkAuthorization();
      setHasAccess(authorized);

      if (!authorized) {
        toast.error('Access denied: You do not have permission to view this user');
        return;
      }

      await loadUserData();
    } catch (error) {
      console.error('Error loading user details:', error);
      toast.error('Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const checkAuthorization = async () => {
    try {
      const users = await base44.entities.User.filter({ email: userEmail });
      const targetUser = users[0];

      if (!targetUser) return false;

      // Platform Admin, Super Administrator, and Partner Business Admin have full access
      if (['Platform Admin', 'Super Administrator', 'Partner Business Administrator'].includes(appRole)) {
        return true;
      }

      // Admin Level 2 and 3 have full access
      if (['Admin Level 2', 'Admin Level 3'].includes(appRole)) {
        return true;
      }

      // Manager of Managers: check if this is their direct report
      if (appRole === 'User Level 2') {
        return targetUser.manager_email === currentUser.email;
      }

      // Organizational Leader: simplified check (allow all users)
      if (appRole === 'User Level 3') {
        return true; // In production, implement hierarchical check
      }

      // Program Manager: check if user is in their cohorts
      if (appRole === 'Admin Level 1') {
        const cohorts = await base44.entities.Cohort.filter({ 
          manager_email: currentUser.email 
        });
        return cohorts.some(c => c.participant_emails?.includes(userEmail));
      }

      // Analyst role
      if (appRole === 'Analyst') {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Authorization check error:', error);
      return false;
    }
  };

  const loadUserData = async () => {
    try {
      const [users, assessments, userGoals, userLearning, plans, certs, extAssessments] = await Promise.all([
        base44.entities.User.filter({ email: userEmail }),
        base44.entities.Assessment.filter({ email: userEmail }, '-created_date', 1),
        base44.entities.Goal.filter({ 
          user_email: userEmail,
          status: { "$in": ["active", "at_risk", "overdue", "pending_acceptance"] }
        }, '-updated_date'),
        base44.entities.AssignedLearning.filter({ 
          user_email: userEmail 
        }, '-created_date'),
        base44.entities.OnboardingPlan.filter({ 
          assigned_to_email: userEmail,
          status: { "$in": ["assigned", "in_progress"] }
        }, '-created_date', 1),
        base44.entities.Certification.filter({ user_email: userEmail }, '-created_date'),
        base44.entities.ExternalAssessmentResult.filter({ user_email: userEmail }, '-created_date')
      ]);

      // Load login history and sessions separately to avoid blocking main data load
      loadLoginHistory();
      loadActiveSessions();

      setUserData(users[0]);
      setAssessmentData(assessments[0] || null);
      setGoals(userGoals);
      setLearning(userLearning);
      setOnboardingPlan(plans[0] || null);
      setCertifications(certs);
      setExternalAssessments(extAssessments);

      // Construct activity timeline
      constructActivityTimeline(assessments, userGoals, userLearning);
    } catch (error) {
      console.error('Error loading user data:', error);
      throw error;
    }
  };

  const constructActivityTimeline = (assessments, userGoals, userLearning) => {
    const timeline = [];

    // Assessment activities
    assessments.forEach(assessment => {
      if (assessment.submission_ts) {
        timeline.push({
          date: assessment.submission_ts,
          type: 'assessment',
          description: 'Completed Leadership Assessment',
          icon: BarChart3,
          color: 'text-blue-600'
        });
      }
    });

    // Goal activities
    userGoals.slice(0, 5).forEach(goal => {
      timeline.push({
        date: goal.created_date,
        type: 'goal',
        description: `Created goal: ${goal.title}`,
        icon: Target,
        color: 'text-green-600'
      });

      if (goal.status === 'completed' && goal.updated_date !== goal.created_date) {
        timeline.push({
          date: goal.updated_date,
          type: 'goal_completed',
          description: `Completed goal: ${goal.title}`,
          icon: CheckCircle,
          color: 'text-emerald-600'
        });
      }
    });

    // Learning activities
    userLearning.slice(0, 5).forEach(item => {
      timeline.push({
        date: item.created_date,
        type: 'learning_assigned',
        description: `Assigned learning: ${item.title}`,
        icon: BookOpen,
        color: 'text-purple-600'
      });

      if (item.status === 'completed' && item.completion_date) {
        timeline.push({
          date: item.completion_date,
          type: 'learning_completed',
          description: `Completed learning: ${item.title}`,
          icon: CheckCircle,
          color: 'text-emerald-600'
        });
      }
    });

    // Sort by date descending and take top 10
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
    setActivities(timeline.slice(0, 10));
  };

  const loadLoginHistory = async () => {
    setLoadingLoginHistory(true);
    try {
      const response = await base44.functions.invoke('getUserLoginHistory', {
        userEmail,
        limit: 20
      });

      if (response.data?.success) {
        setLoginHistory(response.data.loginHistory || []);
      }
    } catch (error) {
      console.error('Error loading login history:', error);
    } finally {
      setLoadingLoginHistory(false);
    }
  };

  const loadActiveSessions = async () => {
    setLoadingSessions(true);
    try {
      const response = await base44.functions.invoke('getUserActiveSessions', {
        userEmail
      });

      if (response.data?.success) {
        setActiveSessions(response.data.sessions || []);
      }
    } catch (error) {
      console.error('Error loading active sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleTerminateSession = async (sessionId) => {
    try {
      const response = await base44.functions.invoke('terminateUserSession', {
        sessionId,
        userEmail
      });

      if (response.data?.success) {
        toast.success('Session terminated');
        loadActiveSessions();
      } else {
        toast.error(response.data?.error || 'Failed to terminate session');
      }
    } catch (error) {
      console.error('Error terminating session:', error);
      toast.error('Failed to terminate session');
    }
  };

  const handleTerminateAllSessions = async () => {
    if (!confirm('Are you sure you want to terminate all active sessions for this user?')) {
      return;
    }

    try {
      const response = await base44.functions.invoke('terminateUserSession', {
        userEmail,
        terminateAll: true
      });

      if (response.data?.success) {
        toast.success(response.data.message);
        loadActiveSessions();
      } else {
        toast.error(response.data?.error || 'Failed to terminate sessions');
      }
    } catch (error) {
      console.error('Error terminating sessions:', error);
      toast.error('Failed to terminate sessions');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadUserData();
      toast.success('Data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleProxyAsUser = async () => {
    if (!userData) return;
    
    setImpersonating(true);
    try {
      const result = await startImpersonation(userData.id); // Use userData.id
      if (result.success) {
        toast.success(`Now viewing as ${userData.full_name || userData.email}`);
        setTimeout(() => {
          onClose();
          window.location.href = '/';
        }, 1000);
      } else {
        toast.error(result.error || 'Failed to start impersonation');
      }
    } catch (error) {
      console.error('Error starting impersonation:', error);
      toast.error('Failed to proxy as user');
    } finally {
      setImpersonating(false);
    }
  };

  const calculateEngagementScore = () => {
    if (!userData) return 0;

    let score = 0;
    const weights = {
      assessment: 30,
      learningCompletion: 30,
      goalsProgress: 25,
      recentActivity: 15
    };

    // Assessment completed
    if (assessmentData) {
      score += weights.assessment;
    }

    // Learning completion rate
    const completedLearning = learning.filter(l => l.status === 'completed').length;
    const learningRate = learning.length > 0 ? completedLearning / learning.length : 0;
    score += learningRate * weights.learningCompletion;

    // Goals progress
    const completedGoals = goals.filter(g => g.status === 'completed').length;
    const goalsRate = goals.length > 0 ? completedGoals / goals.length : 0;
    score += goalsRate * weights.goalsProgress;

    // Recent activity (last 14 days)
    const recentActivities = activities.filter(a => {
      const daysSince = (Date.now() - new Date(a.date)) / (1000 * 60 * 60 * 24);
      return daysSince <= 14;
    });
    const activityScore = Math.min(recentActivities.length / 3, 1); // 3+ activities = full score
    score += activityScore * weights.recentActivity;

    return Math.round(score);
  };

  const isAtRisk = () => {
    if (!userData) return false;
    
    // Check assessment score
    if (assessmentData && assessmentData.overall_pct < 60) return true;
    
    // Check for overdue goals
    const hasOverdueGoals = goals.some(g => g.status === 'overdue');
    if (hasOverdueGoals) return true;
    
    // Check inactivity (no activity in 14+ days)
    if (activities.length > 0) {
      const lastActivity = new Date(activities[0].date);
      const daysSince = (Date.now() - lastActivity) / (1000 * 60 * 60 * 24);
      if (daysSince > 14) return true;
    }
    
    return false;
  };

  if (loading) {
    return (
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-white shadow-2xl z-50 overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
              <div>
                <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  if (!hasAccess) {
    return (
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-white shadow-2xl z-50 overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Access Denied</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              You don't have permission to view this user's details.
            </AlertDescription>
          </Alert>
        </div>
      </motion.div>
    );
  }

  if (!userData) {
    return (
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-white shadow-2xl z-50 overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">User Not Found</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              The requested user could not be found.
            </AlertDescription>
          </Alert>
        </div>
      </motion.div>
    );
  }

  const engagementScore = calculateEngagementScore();
  const atRisk = isAtRisk();

  return (
    <>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 right-0 w-full md:w-[650px] lg:w-[700px] bg-white shadow-2xl z-50 overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{userData.full_name || userData.email}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{userData.current_role || 'N/A'}</Badge>
                  {userData.department && (
                    <Badge variant="outline" className="text-xs">{userData.department}</Badge>
                  )}
                  {atRisk && (
                    <Badge className="bg-red-100 text-red-800">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      At Risk
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {['Platform Admin', 'Super Administrator'].includes(appRole) && !isImpersonating && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleProxyAsUser}
                  disabled={impersonating}
                  className="gap-2"
                >
                  {impersonating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Proxying...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      Proxy As User
                    </>
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Quick Actions */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-0">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Quick Actions</p>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowAssignLearning(true)}
                  className="justify-start"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Assign Learning
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowCreateGoal(true)}
                  className="justify-start"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Create Goal
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowSchedule1on1(true)}
                  className="justify-start"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule 1:1
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  asChild
                  className="justify-start"
                >
                  <a href={`mailto:${userEmail}`}>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Metrics Summary */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <BarChart3 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {assessmentData?.overall_pct || 'N/A'}
                  {assessmentData?.overall_pct && '%'}
                </p>
                <p className="text-xs text-gray-600">Overall Score</p>
                {assessmentData && (
                  <Link 
                    to={`${createPageUrl('AssessmentResults')}?assessmentId=${assessmentData.id}`}
                    target="_blank"
                    className="text-xs text-blue-600 hover:underline flex items-center justify-center gap-1 mt-2"
                  >
                    View Full Results
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{engagementScore}%</p>
                <p className="text-xs text-gray-600">Engagement Score</p>
                <Progress value={engagementScore} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{goals.length}</p>
                <p className="text-xs text-gray-600">Active Goals</p>
                <p className="text-xs text-gray-500 mt-1">
                  {goals.filter(g => g.status === 'completed').length} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <BookOpen className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{learning.length}</p>
                <p className="text-xs text-gray-600">Assigned Learning</p>
                <p className="text-xs text-gray-500 mt-1">
                  {learning.filter(l => l.status === 'completed').length} completed
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabbed Content */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="qualifications">
                Quals
                {(certifications.length + externalAssessments.length) > 0 && (
                  <Badge className="ml-1 h-4 px-1 text-xs">{certifications.length + externalAssessments.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="goals">Goals</TabsTrigger>
              <TabsTrigger value="learning">Learning</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              {['Platform Admin', 'Super Administrator'].includes(appRole) && (
                <TabsTrigger value="impersonation">Proxy</TabsTrigger>
              )}
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              {/* Account Status Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5 text-gray-600" />
                    Account Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      {(userData.account_status || 'active') === 'active' ? (
                        <Badge className="bg-green-100 text-green-800">
                          <Unlock className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (userData.account_status || 'active') === 'suspended' ? (
                        <Badge className="bg-orange-100 text-orange-800">
                          <Lock className="w-3 h-3 mr-1" />
                          Suspended
                        </Badge>
                      ) : (userData.account_status || 'active') === 'locked' ? (
                        <Badge className="bg-red-100 text-red-800">
                          <Lock className="w-3 h-3 mr-1" />
                          Locked
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          Pending Activation
                        </Badge>
                      )}
                    </div>
                    
                    {userData.account_suspended_at && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Suspended At:</span>
                          <span className="text-sm font-medium">
                            {format(new Date(userData.account_suspended_at), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                        {userData.account_suspended_by && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Suspended By:</span>
                            <span className="text-sm font-medium">{userData.account_suspended_by}</span>
                          </div>
                        )}
                        {userData.account_suspended_reason && (
                          <div className="pt-2 border-t">
                            <p className="text-xs text-gray-600 mb-1">Reason:</p>
                            <p className="text-sm text-gray-900">{userData.account_suspended_reason}</p>
                          </div>
                        )}
                      </>
                    )}

                    {!userData.invitation_accepted_at && (
                      <Alert>
                        <AlertCircle className="w-4 h-4" />
                        <AlertDescription className="text-sm">
                          User has not accepted invitation yet.
                          {userData.last_invitation_sent_at && (
                            <span className="block mt-1 text-xs">
                              Last sent: {format(new Date(userData.last_invitation_sent_at), 'MMM d, yyyy')}
                              {userData.invitation_resend_count > 0 && ` (${userData.invitation_resend_count} resends)`}
                            </span>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Assessment Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    Assessment Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {assessmentData ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Submission Date:</span>
                        <span className="text-sm font-medium">
                          {format(new Date(assessmentData.submission_ts), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Overall Score:</span>
                        <Badge className={
                          assessmentData.overall_pct >= 85 ? 'bg-green-100 text-green-800' :
                          assessmentData.overall_pct >= 60 ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {assessmentData.overall_pct}%
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">SI Score:</span>
                        <span className="text-sm font-medium">{assessmentData.si_pct}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Archetype:</span>
                        <Badge variant="outline">{assessmentData.archetype_label}</Badge>
                      </div>
                      
                      {/* Competency Breakdown */}
                      <div className="pt-3 border-t">
                        <p className="text-sm font-medium text-gray-700 mb-2">Competency Scores</p>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: 'Decision Making', value: assessmentData.dm_pct },
                            { label: 'Communication', value: assessmentData.comm_pct },
                            { label: 'Resource Mgmt', value: assessmentData.rm_pct },
                            { label: 'Stakeholder Mgmt', value: assessmentData.sm_pct },
                            { label: 'Performance Mgmt', value: assessmentData.pm_pct },
                            { label: 'Situational Intel', value: assessmentData.si_pct }
                          ].map(comp => (
                            <div key={comp.label} className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">{comp.label}:</span>
                              <span className="font-medium">{comp.value}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-600 mb-3">Assessment not yet completed</p>
                      <Button size="sm" variant="outline">
                        <Send className="w-4 h-4 mr-2" />
                        Send Assessment Invitation
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Onboarding Status */}
              {onboardingPlan && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-purple-600" />
                      Onboarding Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Plan:</span>
                        <span className="text-sm font-medium">{onboardingPlan.title}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Progress:</span>
                        <Badge>{onboardingPlan.completion_percentage || 0}%</Badge>
                      </div>
                      <Progress value={onboardingPlan.completion_percentage || 0} />
                      <Link 
                        to={createPageUrl('MyOnboarding')}
                        target="_blank"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        View Full Onboarding Plan
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-4">
              {/* Export Button */}
              <div className="flex justify-end">
                <SecurityAuditExport 
                  userEmail={userEmail}
                  userName={userData.full_name}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-600" />
                    Account Security & Access
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Account Status */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Account Status</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Current Status:</span>
                        {(userData.account_status || 'active') === 'active' ? (
                          <Badge className="bg-green-100 text-green-800">
                            <Unlock className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        ) : (userData.account_status || 'active') === 'suspended' ? (
                          <Badge className="bg-orange-100 text-orange-800">
                            <Lock className="w-3 h-3 mr-1" />
                            Suspended
                          </Badge>
                        ) : (userData.account_status || 'active') === 'locked' ? (
                          <Badge className="bg-red-100 text-red-800">
                            <Lock className="w-3 h-3 mr-1" />
                            Locked
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            Pending Activation
                          </Badge>
                        )}
                      </div>

                      {userData.account_suspended_at && (
                        <>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-sm text-gray-600">Suspended At:</span>
                            <span className="text-sm font-medium">
                              {format(new Date(userData.account_suspended_at), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                          {userData.account_suspended_by && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Suspended By:</span>
                              <span className="text-sm font-medium">{userData.account_suspended_by}</span>
                            </div>
                          )}
                          {userData.account_suspended_reason && (
                            <div className="pt-2 border-t">
                              <p className="text-xs text-gray-600 mb-1">Suspension Reason:</p>
                              <p className="text-sm bg-orange-50 p-2 rounded border border-orange-200">
                                {userData.account_suspended_reason}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Invitation Status */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Invitation Status</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Invitation Accepted:</span>
                        {userData.invitation_accepted_at ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Yes
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>

                      {userData.invitation_sent_at && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">First Sent:</span>
                          <span className="text-sm font-medium">
                            {format(new Date(userData.invitation_sent_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}

                      {userData.invitation_accepted_at && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Accepted At:</span>
                          <span className="text-sm font-medium">
                            {format(new Date(userData.invitation_accepted_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}

                      {userData.invitation_resend_count > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Resend Count:</span>
                          <Badge variant="outline">{userData.invitation_resend_count}</Badge>
                        </div>
                      )}

                      {userData.last_invitation_sent_at && userData.last_invitation_sent_at !== userData.invitation_sent_at && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Last Sent:</span>
                          <span className="text-sm font-medium">
                            {format(new Date(userData.last_invitation_sent_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Account Type & Expiration */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Account Type & Expiration</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Type:</span>
                        <Badge variant="outline" className="capitalize">
                          {userData.account_type || 'permanent'}
                        </Badge>
                      </div>
                      {userData.account_expires_at ? (
                        <>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-sm text-gray-600">Expires:</span>
                            <span className="text-sm font-medium">
                              {format(new Date(userData.account_expires_at), 'MMM d, yyyy')}
                            </span>
                          </div>
                          {(() => {
                            const expDate = new Date(userData.account_expires_at);
                            const now = new Date();
                            const isExpired = expDate <= now;
                            const daysUntilExpiry = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
                            const isExpiringSoon = !isExpired && daysUntilExpiry <= 30;

                            if (isExpired) {
                              return (
                                <Alert className="border-red-200 bg-red-50">
                                  <AlertCircle className="w-4 h-4 text-red-600" />
                                  <AlertDescription className="text-sm text-red-800">
                                    Account has expired and should be suspended
                                  </AlertDescription>
                                </Alert>
                              );
                            } else if (isExpiringSoon) {
                              return (
                                <Alert className="border-amber-200 bg-amber-50">
                                  <AlertCircle className="w-4 h-4 text-amber-600" />
                                  <AlertDescription className="text-sm text-amber-800">
                                    Account expires in {daysUntilExpiry} days
                                  </AlertDescription>
                                </Alert>
                              );
                            }
                            return null;
                          })()}
                        </>
                      ) : (
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-sm text-gray-600">Expires:</span>
                          <Badge variant="outline" className="text-gray-500">
                            No expiration
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Last Login */}
                  {userData.last_login_date && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Login Activity</h4>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Last Login:</span>
                        <span className="text-sm font-medium">
                          {format(new Date(userData.last_login_date), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      {userData.failed_login_attempts > 0 && (
                        <div className="flex items-center justify-between mt-2 pt-2 border-t">
                          <span className="text-sm text-gray-600">Failed Attempts:</span>
                          <Badge className="bg-red-100 text-red-800">
                            {userData.failed_login_attempts}
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Login History Charts */}
              {loginHistory.length > 0 && (
                <LoginHistoryChart loginHistory={loginHistory} />
              )}

              {/* Login History */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      Login History (Last 20)
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadLoginHistory}
                      disabled={loadingLoginHistory}
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingLoginHistory ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingLoginHistory ? (
                    <div className="text-center py-6">
                      <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
                    </div>
                  ) : loginHistory.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <Clock className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No login history available</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {loginHistory.map((login, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {login.status === 'success' ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : login.status === 'locked' ? (
                                <Lock className="w-4 h-4 text-red-600" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-orange-600" />
                              )}
                              <span className="text-sm font-medium">
                                {format(new Date(login.login_timestamp), 'MMM d, yyyy h:mm a')}
                              </span>
                            </div>
                            <Badge className={
                              login.status === 'success' ? 'bg-green-100 text-green-800' :
                              login.status === 'locked' ? 'bg-red-100 text-red-800' :
                              'bg-orange-100 text-orange-800'
                            }>
                              {login.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                            {login.ip_address && (
                              <div>IP: {login.ip_address}</div>
                            )}
                            {login.device_type && (
                              <div>Device: {login.device_type}</div>
                            )}
                            {login.browser && (
                              <div>Browser: {login.browser}</div>
                            )}
                            {login.location && (
                              <div>Location: {login.location}</div>
                            )}
                          </div>
                          {login.failure_reason && (
                            <p className="text-xs text-red-600 mt-2">
                              Reason: {login.failure_reason}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Active Sessions */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="w-5 h-5 text-purple-600" />
                      Active Sessions ({activeSessions.length})
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {activeSessions.length > 0 && ['Platform Admin', 'Super Administrator'].includes(appRole) && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleTerminateAllSessions}
                        >
                          <Lock className="w-4 h-4 mr-2" />
                          Logout All
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={loadActiveSessions}
                        disabled={loadingSessions}
                      >
                        <RefreshCw className={`w-4 h-4 ${loadingSessions ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingSessions ? (
                    <div className="text-center py-6">
                      <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
                    </div>
                  ) : activeSessions.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <Shield className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No active sessions</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeSessions.map((session) => (
                        <div key={session.id} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium">{session.device_type || 'Unknown Device'}</span>
                                <Badge variant="outline" className="text-xs">
                                  {session.browser || 'Unknown Browser'}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-600">
                                Started: {format(new Date(session.started_at), 'MMM d, h:mm a')}
                              </p>
                              <p className="text-xs text-gray-600">
                                Last active: {format(new Date(session.last_activity), 'MMM d, h:mm a')}
                              </p>
                              {session.location && (
                                <p className="text-xs text-gray-600">Location: {session.location}</p>
                              )}
                              {session.ip_address && (
                                <p className="text-xs text-gray-500">IP: {session.ip_address}</p>
                              )}
                            </div>
                            {['Platform Admin', 'Super Administrator'].includes(appRole) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTerminateSession(session.id)}
                              >
                                <Lock className="w-4 h-4 text-red-600" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Qualifications Tab */}
            <TabsContent value="qualifications" className="space-y-4">
              {/* Certifications */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-600" />
                    Certifications ({certifications.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {certifications.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <Award className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No certifications recorded</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {certifications.map((cert) => (
                        <div key={cert.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm">{cert.name}</h4>
                              <p className="text-xs text-gray-600">{cert.issuing_body}</p>
                            </div>
                            <Badge className={
                              cert.status === 'verified' ? 'bg-green-100 text-green-800' :
                              cert.status === 'expired' ? 'bg-gray-100 text-gray-800' :
                              cert.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }>
                              {cert.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          {cert.expiration_date && (
                            <p className="text-xs text-gray-500">
                              Expires: {format(new Date(cert.expiration_date), 'MMM yyyy')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* External Assessments */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    External Assessments ({externalAssessments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {externalAssessments.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No external assessments recorded</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {externalAssessments.map((assessment) => (
                        <div key={assessment.id} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm">{assessment.assessment_type}</h4>
                              {assessment.designation_or_score && (
                                <p className="text-xs text-gray-600">Result: {assessment.designation_or_score}</p>
                              )}
                            </div>
                            <Badge className={
                              assessment.status === 'verified' ? 'bg-green-100 text-green-800' :
                              'bg-blue-100 text-blue-800'
                            }>
                              {assessment.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          {assessment.ai_summary && (
                            <p className="text-xs text-gray-600 line-clamp-2 mt-2">
                              {assessment.ai_summary}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Goals Tab */}
            <TabsContent value="goals" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Active Goals ({goals.length})</CardTitle>
                    <Link 
                      to={`${createPageUrl('Goals')}?user=${userEmail}`}
                      target="_blank"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      View All
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {goals.length === 0 ? (
                    <div className="text-center py-8">
                      <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-600 mb-3">No active goals</p>
                      <Button size="sm" onClick={() => setShowCreateGoal(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Goal
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {goals.slice(0, 5).map(goal => (
                        <div key={goal.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-sm font-medium text-gray-900">{goal.title}</h4>
                            <Badge className={
                              goal.status === 'completed' ? 'bg-green-100 text-green-800' :
                              goal.status === 'overdue' ? 'bg-red-100 text-red-800' :
                              goal.status === 'at_risk' ? 'bg-orange-100 text-orange-800' :
                              'bg-blue-100 text-blue-800'
                            }>
                              {goal.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          {goal.due_date && (
                            <p className="text-xs text-gray-600 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Due: {format(new Date(goal.due_date), 'MMM d, yyyy')}
                            </p>
                          )}
                          {goal.completion_percentage !== undefined && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-gray-600">Progress</span>
                                <span className="font-medium">{goal.completion_percentage}%</span>
                              </div>
                              <Progress value={goal.completion_percentage} className="h-1" />
                            </div>
                          )}
                        </div>
                      ))}
                      {goals.length > 5 && (
                        <p className="text-center text-sm text-gray-600">
                          +{goals.length - 5} more goals
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Learning Tab */}
            <TabsContent value="learning" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Assigned Learning ({learning.length})</CardTitle>
                    <span className="text-sm text-gray-600">
                      {learning.filter(l => l.status === 'completed').length} completed
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {learning.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-600 mb-3">No assigned learning</p>
                      <Button size="sm" onClick={() => setShowAssignLearning(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Assign Learning
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {learning.slice(0, 5).map(item => (
                        <div key={item.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-sm font-medium text-gray-900">{item.title}</h4>
                            <Badge className={
                              item.status === 'completed' ? 'bg-green-100 text-green-800' :
                              item.status === 'overdue' ? 'bg-red-100 text-red-800' :
                              item.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }>
                              {item.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              Assigned by: {item.assigned_by.split('@')[0]}
                            </span>
                            {item.due_date && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(item.due_date), 'MMM d')}
                              </span>
                            )}
                          </div>
                          {item.priority && (
                            <Badge variant="outline" className="text-xs mt-2">
                              Priority: {item.priority}
                            </Badge>
                          )}
                        </div>
                      ))}
                      {learning.length > 5 && (
                        <p className="text-center text-sm text-gray-600">
                          +{learning.length - 5} more items
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="space-y-4">
              <div className="flex justify-end">
                <ActivityReportExport
                  userEmail={userEmail}
                  userName={userData.full_name}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                  <p className="text-sm text-gray-600">Last 10 activities</p>
                </CardHeader>
                <CardContent>
                  {activities.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-600">No recent activity</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activities.map((activity, idx) => {
                        const Icon = activity.icon;
                        return (
                          <div key={idx} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                            <div className={`w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0`}>
                              <Icon className={`w-4 h-4 ${activity.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900">{activity.description}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {format(new Date(activity.date), 'MMM d, yyyy · h:mm a')}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Impersonation History Tab - Only for Platform Admin and Super Admin */}
            {['Platform Admin', 'Super Administrator'].includes(appRole) && (
              <TabsContent value="impersonation" className="space-y-4">
                <ImpersonationHistoryTab userEmail={userEmail} />
              </TabsContent>
            )}
          </Tabs>

          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{userData.email}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-gray-600">Role:</span>
                  <Badge className="bg-blue-100 text-blue-800">{userData.app_role || 'User Level 1'}</Badge>
                </div>
                {userData.department && (
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-gray-600">Department:</span>
                    <span className="font-medium">{userData.department}</span>
                  </div>
                )}
                {userData.manager_email && (
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-gray-600">Manager:</span>
                    <span className="font-medium">{userData.manager_email.split('@')[0]}</span>
                  </div>
                )}
                {userData.start_date && (
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-gray-600">Start Date:</span>
                    <span className="font-medium">
                      {format(new Date(userData.start_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600">Member Since:</span>
                  <span className="font-medium">
                    {format(new Date(userData.created_date), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Modals */}
      {showAssignLearning && (
        <AssignLearningModal
          open={showAssignLearning}
          onClose={() => setShowAssignLearning(false)}
          onSuccess={() => {
            setShowAssignLearning(false);
            handleRefresh();
          }}
          assignedBy={currentUser.email}
          resource={null}
        />
      )}

      {showCreateGoal && (
        <CreateGoalModal
          open={showCreateGoal}
          onClose={() => setShowCreateGoal(false)}
          onSuccess={() => {
            setShowCreateGoal(false);
            handleRefresh();
          }}
          preSelectedUser={userEmail}
        />
      )}

      {showSchedule1on1 && (
        <Schedule1on1Modal
          open={showSchedule1on1}
          onClose={() => setShowSchedule1on1(false)}
          onSuccess={() => {
            setShowSchedule1on1(false);
            handleRefresh();
          }}
          userEmail={userEmail}
        />
      )}
    </>
  );
}