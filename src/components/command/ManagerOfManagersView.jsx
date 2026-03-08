import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  Target,
  BookOpen,
  Loader2,
  User,
  CheckCircle2,
  Eye
} from "lucide-react";
import { User as UserEntity } from "@/entities/User";
import { Assessment } from "@/entities/Assessment";
import { Goal } from "@/entities/Goal";
import { AssignedLearning } from "@/entities/AssignedLearning";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import UserDetailPanel from "./UserDetailPanel";
import InterventionActionsMenu from "./InterventionActionsMenu";
import BulkActionsBar from "./BulkActionsBar";
import SendNudgeModal from "./SendNudgeModal";
import EscalateModal from "./EscalateModal";
import MarkAtRiskModal from "./MarkAtRiskModal";
import InterventionHistoryTab from "./InterventionHistoryTab";
import AssignLearningModal from "../learning/AssignLearningModal";
import CreateGoalModal from "../goals/CreateGoalModal";
import Schedule1on1Modal from "../ai/modals/Schedule1on1Modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from "@/api/base44Client";

export default function ManagerOfManagersView() {
  const [directReports, setDirectReports] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState('');
  const [selectedUserEmail, setSelectedUserEmail] = useState(null);
  
  // New state for interventions
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showAssignLearning, setShowAssignLearning] = useState(false);
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [showSchedule1on1, setShowSchedule1on1] = useState(false);
  const [showSendNudge, setShowSendNudge] = useState(false);
  const [showEscalate, setShowEscalate] = useState(false);
  const [showMarkAtRisk, setShowMarkAtRisk] = useState(false);
  const [targetUser, setTargetUser] = useState(null); // Can be a single UserEntity or an array of UserEntity for bulk actions
  const [activeTab, setActiveTab] = useState('team');

  const { user } = useAuth();

  const loadTeamData = useCallback(async () => {
    setLoading(true);
    try {
      setLoadingStep('Loading your team members...');
      const currentUser = await base44.auth.me();
      
      setLoadingStep('Fetching all user data...');
      const allUsers = await base44.entities.User.list();
      const myReports = allUsers.filter(u => u.manager_email === currentUser.email);
      setDirectReports(myReports);
      
      setLoadingStep('Loading all assessments...');
      const allAssessments = await base44.entities.Assessment.list();
      setAssessments(allAssessments);
      
      setLoadingStep('Complete!');
    } catch (error) {
      console.error('Error loading team data:', error);
      toast.error('Failed to load team data');
      setDirectReports([]);
      setAssessments([]);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  }, []);

  useEffect(() => {
    loadTeamData();
  }, [loadTeamData]);

  const teamMetrics = useMemo(() => {
    if (!directReports.length) {
      return {
        totalReports: 0,
        avgScore: 0,
        atRiskCount: 0,
        highPerformers: 0,
        assessmentCompletion: 0
      };
    }

    const reportEmails = directReports.map(r => r.email);
    const teamAssessments = assessments.filter(a => reportEmails.includes(a.email));

    const totalReports = directReports.length;
    const avgScore = teamAssessments.length > 0
      ? Math.round(teamAssessments.reduce((sum, a) => sum + (a.overall_pct || 0), 0) / teamAssessments.length)
      : 0;
    const atRiskCount = teamAssessments.filter(a => (a.overall_pct || 0) < 60).length;
    const highPerformers = teamAssessments.filter(a => (a.overall_pct || 0) >= 85).length;
    const assessmentCompletion = totalReports > 0 
      ? Math.round((teamAssessments.length / totalReports) * 100) 
      : 0;

    return {
      totalReports,
      avgScore,
      atRiskCount,
      highPerformers,
      assessmentCompletion
    };
  }, [directReports, assessments]);

  const getPerformanceStatus = (assessment) => {
    if (!assessment || assessment.overall_pct === undefined || assessment.overall_pct === null) {
      return { status: 'no_data', color: 'bg-gray-100 text-gray-800', icon: AlertTriangle };
    }
    const score = assessment.overall_pct;
    if (score >= 85) return { status: 'excellent', color: 'bg-green-100 text-green-800', icon: TrendingUp };
    if (score >= 70) return { status: 'good', color: 'bg-blue-100 text-blue-800', icon: TrendingUp };
    if (score >= 60) return { status: 'developing', color: 'bg-yellow-100 text-yellow-800', icon: TrendingDown };
    return { status: 'at_risk', color: 'bg-red-100 text-red-800', icon: AlertTriangle };
  };

  const handleSelectUser = (userEmail, isChecked) => {
    setSelectedUsers(prev => 
      isChecked ? [...prev, userEmail] : prev.filter(e => e !== userEmail)
    );
  };

  const handleSelectAll = (isChecked) => {
    setSelectedUsers(isChecked ? directReports.map(r => r.email) : []);
  };

  const handleSingleAction = (action, user) => {
    setTargetUser(user);
    switch(action) {
      case 'assign_learning':
        setShowAssignLearning(true);
        break;
      case 'create_goal':
        setShowCreateGoal(true);
        break;
      case 'schedule_1on1':
        setShowSchedule1on1(true);
        break;
      case 'send_nudge':
        setShowSendNudge(true);
        break;
      case 'mark_at_risk':
        setShowMarkAtRisk(true);
        break;
    }
  };

  const handleBulkAction = (action) => {
    const users = directReports.filter(r => selectedUsers.includes(r.email));
    setTargetUser(users);
    
    switch(action) {
      case 'assign_learning':
        setShowAssignLearning(true);
        break;
      case 'create_goals':
        setShowCreateGoal(true);
        break;
      case 'send_nudge':
        setShowSendNudge(true);
        break;
      case 'schedule_1on1s':
        setShowSchedule1on1(true);
        break;
    }
  };

  const closeAllModals = () => {
    setShowAssignLearning(false);
    setShowCreateGoal(false);
    setShowSchedule1on1(false);
    setShowSendNudge(false);
    setShowEscalate(false);
    setShowMarkAtRisk(false);
    setTargetUser(null);
    // Do not clear selectedUsers on modal close if it was a bulk action.
    // The BulkActionsBar handles clearing selection separately or can remain active.
    // However, if the modal handles the completion of the bulk action, clearing selectedUsers here is typical.
    setSelectedUsers([]); // Clear selection after an action
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{loadingStep}</h3>
        <div className="flex gap-2">
          <div className={`w-2 h-2 rounded-full ${loadingStep.includes('team members') ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
          <div className={`w-2 h-2 rounded-full ${loadingStep.includes('user data') ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
          <div className={`w-2 h-2 rounded-full ${loadingStep.includes('assessments') ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
        </div>
      </div>
    );
  }

  if (directReports.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <Card className="max-w-2xl mx-auto border-0 shadow-lg">
          <CardContent className="p-12">
            <div className="w-20 h-20 bg-purple-100 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Users className="w-10 h-10 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No Direct Reports Found</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              You don't have any team members assigned yet. Once users are assigned to report to you 
              (via their manager_email field), they'll appear here.
            </p>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-left max-w-md mx-auto">
              <p className="text-sm text-blue-800">
                <strong>How to add direct reports:</strong>
                <br />
                Ask your administrator to set each team member's "manager_email" field to: 
                <strong className="block mt-1 font-mono text-xs">{user?.email}</strong>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="team">Team Overview</TabsTrigger>
            <TabsTrigger value="interventions">My Interventions</TabsTrigger>
          </TabsList>

          <TabsContent value="team" className="space-y-6">
            {/* Team Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <Card className="border-0 shadow-md">
                <CardContent className="p-4 text-center">
                  <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{teamMetrics.totalReports}</p>
                  <p className="text-xs text-gray-600">Direct Reports</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardContent className="p-4 text-center">
                  <BarChart3 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{teamMetrics.avgScore}%</p>
                  <p className="text-xs text-gray-600">Avg Assessment Score</p>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-md">
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{teamMetrics.atRiskCount}</p>
                  <p className="text-xs text-gray-600">At Risk</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" /> 
                  <p className="text-2xl font-bold text-gray-900">{teamMetrics.highPerformers}</p>
                  <p className="text-xs text-gray-600">High Performers</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardContent className="p-4 text-center">
                  <CheckCircle2 className="w-8 h-8 text-yellow-600 mx-auto mb-2" /> 
                  <p className="text-2xl font-bold text-gray-900">{teamMetrics.assessmentCompletion}%</p>
                  <p className="text-xs text-gray-600">Assessments Completed</p>
                </CardContent>
              </Card>
            </div>

            {/* Team Members List with Interventions */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Team Members</CardTitle>
                  {directReports.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedUsers.length === directReports.length && directReports.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                      <span className="text-sm text-gray-600">Select All</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {directReports.map((report, idx) => {
                    const assessment = assessments.find(a => a.email === report.email);
                    const performanceStatus = getPerformanceStatus(assessment);
                    const StatusIcon = performanceStatus.icon;
                    const isSelected = selectedUsers.includes(report.email);

                    return (
                      <motion.div
                        key={report.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`p-4 border rounded-lg hover:shadow-md transition-all ${
                          isSelected ? 'border-blue-500 bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectUser(report.email, checked)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          
                          <div 
                            className="flex items-center justify-between flex-1 cursor-pointer"
                            onClick={() => setSelectedUserEmail(report.email)}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                <User className="w-6 h-6 text-white" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                                  {report.full_name || report.email}
                                </h4>
                                <p className="text-sm text-gray-600">{report.current_role || 'No role set'}</p>
                                <p className="text-xs text-gray-500">{report.email}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              {assessment ? (
                                <>
                                  <div className="text-center">
                                    <p className="text-xl font-bold text-gray-900">{assessment.overall_pct}%</p>
                                    <p className="text-xs text-gray-600">Overall</p>
                                  </div>
                                  {assessment.si_pct !== undefined && assessment.si_pct !== null && (
                                    <div className="text-center">
                                      <p className="text-xl font-bold text-purple-600">{assessment.si_pct}%</p>
                                      <p className="text-xs text-gray-600">SI Score</p>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="text-center px-4">
                                  <p className="text-sm text-gray-500">No assessment data</p>
                                </div>
                              )}

                              <div className="flex items-center gap-2">
                                <Badge className={performanceStatus.color}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {performanceStatus.status.replace('_', ' ')}
                                </Badge>
                                
                                <InterventionActionsMenu
                                  user={report}
                                  onAssignLearning={() => handleSingleAction('assign_learning', report)}
                                  onCreateGoal={() => handleSingleAction('create_goal', report)}
                                  onSchedule1on1={() => handleSingleAction('schedule_1on1', report)}
                                  onSendNudge={() => handleSingleAction('send_nudge', report)}
                                  onMarkAtRisk={() => handleSingleAction('mark_at_risk', report)}
                                  viewContext="manager"
                                />
                                
                                <Button variant="ghost" size="icon" className="hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); setSelectedUserEmail(report.email); }}>
                                  <Eye className="w-4 h-4 text-blue-600" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {assessment && (
                          <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t">
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Top Strength</p>
                              <Badge variant="outline" className="text-xs">
                                {assessment.record?.strengths?.[0] || 'N/A'}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Development Area</p>
                              <Badge variant="outline" className="text-xs">
                                {assessment.record?.development_areas?.[0] || 'N/A'}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Archetype</p>
                              <Badge variant="outline" className="text-xs">
                                {assessment.archetype_label || 'N/A'}
                              </Badge>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="interventions">
            <InterventionHistoryTab managerEmail={user?.email} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Bulk Actions Bar */}
      {selectedUsers.length > 0 && (
        <BulkActionsBar
          selectedCount={selectedUsers.length}
          onClearSelection={() => setSelectedUsers([])}
          onBulkAssignLearning={() => handleBulkAction('assign_learning')}
          onBulkCreateGoals={() => handleBulkAction('create_goals')}
          onBulkSendNudge={() => handleBulkAction('send_nudge')}
          onBulkSchedule1on1s={() => handleBulkAction('schedule_1on1s')}
        />
      )}

      {/* User Detail Panel */}
      <AnimatePresence>
        {selectedUserEmail && (
          <UserDetailPanel
            userEmail={selectedUserEmail}
            onClose={() => setSelectedUserEmail(null)}
            viewContext="manager"
          />
        )}
      </AnimatePresence>

      {/* Intervention Modals */}
      {showAssignLearning && (
        <AssignLearningModal
          open={showAssignLearning}
          onClose={closeAllModals}
          onSuccess={closeAllModals}
          assignedBy={user?.email}
          preSelectedUsers={Array.isArray(targetUser) ? targetUser.map(u => u.id) : [targetUser?.id]}
        />
      )}

      {showCreateGoal && (
        <CreateGoalModal
          open={showCreateGoal}
          onClose={closeAllModals}
          onSuccess={closeAllModals}
          preSelectedUser={Array.isArray(targetUser) ? null : targetUser?.email}
          bulkUsers={Array.isArray(targetUser) ? targetUser : null}
        />
      )}

      {showSchedule1on1 && (
        <Schedule1on1Modal
          open={showSchedule1on1}
          onClose={closeAllModals}
          onSuccess={closeAllModals}
          userEmail={Array.isArray(targetUser) ? null : targetUser?.email}
          bulkUsers={Array.isArray(targetUser) ? targetUser : null}
        />
      )}

      {showSendNudge && (
        <SendNudgeModal
          open={showSendNudge}
          onClose={closeAllModals}
          onSuccess={closeAllModals}
          users={Array.isArray(targetUser) ? targetUser : [targetUser]}
          senderName={user?.full_name || user?.email}
        />
      )}

      {showMarkAtRisk && (
        <MarkAtRiskModal
          open={showMarkAtRisk}
          onClose={closeAllModals}
          onSuccess={() => {
            closeAllModals();
            loadTeamData(); // Reload data to reflect changes
          }}
          user={targetUser}
          flaggedBy={user?.email}
        />
      )}
    </>
  );
}