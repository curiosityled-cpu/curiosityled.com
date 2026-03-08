
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users,
  TrendingUp,
  Award,
  Calendar,
  Plus,
  UserPlus,
  Trash2,
  BarChart3,
  Loader2,
  AlertCircle,
  Eye,
  Map, // New import for journeys
  Edit2 // New import for editing journeys
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import CohortCreationModal from "./CohortCreationModal";
import UserDetailPanel from "./UserDetailPanel"; 

// New intervention imports
import InterventionActionsMenu from "./InterventionActionsMenu";
import BulkActionsBar from "./BulkActionsBar";
import SendNudgeModal from "./SendNudgeModal";
import EscalateModal from "./EscalateModal";
import MarkAtRiskModal from "./MarkAtRiskModal";
import InterventionHistoryTab from "./InterventionHistoryTab";
import AssignLearningModal from "../learning/AssignLearningModal";
import CreateGoalModal from "../goals/CreateGoalModal";
import Schedule1on1Modal from "../ai/modals/Schedule1on1Modal";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom"; // Assuming react-router-dom is used for navigation

// Helper function for creating URLs. This might be imported from a router config.
// For this context, a simple implementation that maps page names to paths.
const createPageUrl = (pageName, params = {}) => {
  switch (pageName) {
    case 'JourneyBuilder':
      // If we need to edit a specific journey, the ID would be in params
      return params.journeyId ? `/journey-builder/${params.journeyId}` : '/journey-builder';
    default:
      return `/${pageName.toLowerCase()}`;
  }
};

export default function ProgramManagerView() {
  const [cohorts, setCohorts] = useState([]);
  const [selectedCohort, setSelectedCohort] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState('');
  const [metrics, setMetrics] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { user } = useAuth();
  const [selectedUserEmail, setSelectedUserEmail] = useState(null);

  // New intervention state
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [showAssignLearning, setShowAssignLearning] = useState(false);
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [showSchedule1on1, setShowSchedule1on1] = useState(false);
  const [showSendNudge, setShowSendNudge] = useState(false);
  const [showEscalate, setShowEscalate] = useState(false);
  const [showMarkAtRisk, setShowMarkAtRisk] = useState(false);
  const [targetParticipant, setTargetParticipant] = useState(null);
  const [activeTab, setActiveTab] = useState('cohorts');

  // New state for managed journeys
  const [managedJourneys, setManagedJourneys] = useState([]);
  
  const calculateMetrics = useCallback(async (cohort) => {
    if (!cohort || !cohort.participant_emails || cohort.participant_emails.length === 0) {
      return {
        totalParticipants: 0,
        avgScore: 0,
        completionRate: 0,
        atRiskCount: 0,
        topPerformersCount: 0
      };
    }

    try {
      const allAssessments = await base44.entities.Assessment.list();
      const cohortAssessments = allAssessments.filter(a => 
        cohort.participant_emails.includes(a.email)
      );

      const totalParticipants = cohort.participant_emails.length;
      
      const validAssessments = cohortAssessments.filter(a => a.overall_pct !== undefined && a.overall_pct !== null);

      const avgScore = validAssessments.length > 0
        ? Math.round(validAssessments.reduce((sum, a) => sum + (a.overall_pct), 0) / validAssessments.length)
        : 0;
      
      const completionRate = totalParticipants > 0
        ? Math.round((validAssessments.length / totalParticipants) * 100)
        : 0;
      
      const atRiskCount = validAssessments.filter(a => a.overall_pct < 60).length;
      
      const topPerformersCount = validAssessments
        .filter(a => a.overall_pct >= 85)
        .length;

      return {
        totalParticipants,
        avgScore,
        completionRate,
        atRiskCount,
        topPerformersCount
      };
    } catch (error) {
      console.error('Error calculating metrics:', error);
      toast.error('Failed to calculate program metrics');
      return {
        totalParticipants: 0,
        avgScore: 0,
        completionRate: 0,
        atRiskCount: 0,
        topPerformersCount: 0
      };
    }
  }, []);

  const loadCohorts = useCallback(async () => {
    setLoading(true);
    try {
      setLoadingStep('Loading your programs...');
      
      // Use backend function to get cohorts
      const response = await base44.functions.invoke('listCohorts');
      
      if (response.data?.success) {
        const userCohorts = response.data.cohorts;
        setCohorts(userCohorts || []);
        
        if (userCohorts && userCohorts.length > 0) {
          const activeCohorts = userCohorts.filter(c => c.status === 'active');
          if (activeCohorts.length > 0) {
            setSelectedCohort(activeCohorts[0]);
          } else {
            setSelectedCohort(userCohorts[0]);
          }
        } else {
          setSelectedCohort(null);
        }
      } else {
        throw new Error(response.data?.error || 'Failed to load cohorts');
      }
      
      // Load managed journeys
      setLoadingStep('Loading learning journeys...');
      const journeys = await base44.entities.LearningJourney.list('-updated_date');
      setManagedJourneys(journeys || []);
      
      setLoadingStep('Complete!');
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load programs and journeys');
      setCohorts([]);
      setManagedJourneys([]);
      setSelectedCohort(null);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  }, []);

  useEffect(() => {
    loadCohorts();
  }, [loadCohorts]);

  useEffect(() => {
    if (selectedCohort) {
      const loadMetrics = async () => {
        const calculatedMetrics = await calculateMetrics(selectedCohort);
        setMetrics(calculatedMetrics);
      };
      loadMetrics();
    } else {
      setMetrics(null);
    }
  }, [selectedCohort, calculateMetrics]);

  const handleCohortChange = (cohortId) => {
    const cohort = cohorts.find(c => c.id === cohortId);
    setSelectedCohort(cohort);
    setSelectedParticipants([]);
  };

  const handleAddParticipant = async (email) => {
    if (!selectedCohort) return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Invalid email format');
      return false;
    }

    if (selectedCohort.participant_emails?.includes(email)) {
      toast.error('User is already in this cohort');
      return false;
    }

    setActionLoading(true);
    try {
      const existingUsers = await base44.entities.User.filter({ email });
      if (existingUsers.length === 0) {
        toast.error('User not found. Please check the email address.');
        return false;
      }

      const updatedEmails = [...(selectedCohort.participant_emails || []), email];
      await base44.entities.Cohort.update(selectedCohort.id, {
        participant_emails: updatedEmails
      });

      await base44.functions.invoke('createNotification', {
        user_email: email,
        type: 'milestone',
        title: 'Added to Leadership Program',
        message: `You have been added to the ${selectedCohort.name} program. Check your dashboard for details.`,
        priority: 'medium',
        related_entity_type: 'Cohort',
        related_entity_id: selectedCohort.id
      });

      setCohorts(prev => prev.map(c => 
        c.id === selectedCohort.id ? { ...c, participant_emails: updatedEmails } : c
      ));
      
      setSelectedCohort(prev => prev ? { ...prev, participant_emails: updatedEmails } : null);

      toast.success('Participant added successfully');
      return true;
    } catch (error) {
      console.error('Error adding participant:', error);
      toast.error('Failed to add participant');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveParticipant = async (emailToRemove) => {
    if (!selectedCohort) return;

    if (!confirm(`Remove ${emailToRemove} from this cohort?`)) {
      return;
    }

    setActionLoading(true);
    try {
      const updatedEmails = (selectedCohort.participant_emails || []).filter(e => e !== emailToRemove);
      await base44.entities.Cohort.update(selectedCohort.id, { participant_emails: updatedEmails });

      setCohorts(prev => prev.map(c => 
        c.id === selectedCohort.id ? { ...c, participant_emails: updatedEmails } : c
      ));
      
      setSelectedCohort(prev => prev ? { ...prev, participant_emails: updatedEmails } : null);
      setSelectedParticipants(prev => prev.filter(e => e !== emailToRemove));

      toast.success('Participant removed successfully');
    } catch (error) {
      console.error('Error removing participant:', error);
      toast.error('Failed to remove participant');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCohort = async () => {
    if (!selectedCohort) return;

    if (!confirm(`Are you sure you want to delete "${selectedCohort.name}"? This action cannot be undone.`)) return;

    setActionLoading(true);
    try {
      await base44.entities.Cohort.delete(selectedCohort.id);
      toast.success('Cohort deleted successfully');
      await loadCohorts();
    } catch (error) {
      console.error('Error deleting cohort:', error);
      toast.error('Failed to delete cohort');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCohortCreated = async () => {
    setShowCreateModal(false);
    setTimeout(async () => {
      await loadCohorts();
      toast.success('Cohort created successfully');
    }, 300);
  };

  const handleSelectParticipant = (email, isChecked) => {
    setSelectedParticipants(prev => 
      isChecked ? [...prev, email] : prev.filter(e => e !== email)
    );
  };

  const handleSelectAll = (isChecked) => {
    if (selectedCohort?.participant_emails) {
      setSelectedParticipants(isChecked ? [...selectedCohort.participant_emails] : []);
    }
  };

  const handleSingleAction = async (action, email) => {
    const users = await base44.entities.User.filter({ email });
    const user = users[0];
    setTargetParticipant(user || { email });
    
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
      case 'escalate':
        setShowEscalate(true);
        break;
      case 'mark_at_risk':
        setShowMarkAtRisk(true);
        break;
      default:
        break;
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedParticipants.length === 0) {
      toast.error('No participants selected for bulk action.');
      return;
    }
    const allUsers = await base44.entities.User.list();
    const users = allUsers.filter(u => selectedParticipants.includes(u.email));
    setTargetParticipant(users);
    
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
      default:
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
    setTargetParticipant(null);
    setSelectedParticipants([]);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{loadingStep}</h3>
        <div className="flex gap-2">
          <div className={`w-2 h-2 rounded-full ${loadingStep.includes('program') ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
          <div className={`w-2 h-2 rounded-full ${loadingStep.includes('journey') ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
        </div>
      </div>
    );
  }

  // Modified empty state to check for both cohorts and managedJourneys
  if (cohorts.length === 0 && managedJourneys.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <Card className="max-w-2xl mx-auto border-0 shadow-lg">
          <CardContent className="p-12">
            <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Users className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No Programs or Journeys Yet</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Get started by creating your first leadership development cohort or a learning journey. 
              You can add participants, track their progress, and measure program outcomes.
            </p>
            <div className="flex justify-center gap-4">
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700"
                size="lg"
                disabled={actionLoading}
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Cohort
              </Button>
              <Link to={createPageUrl('JourneyBuilder')}>
                <Button 
                  variant="outline"
                  size="lg"
                  disabled={actionLoading}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Learning Journey
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {showCreateModal && (
          <CohortCreationModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={handleCohortCreated}
          />
        )}
      </motion.div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header with Cohort Selector */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">Program Manager Dashboard</CardTitle>
                <p className="text-gray-600">Manage your leadership development programs</p>
              </div>
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={actionLoading}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Cohort
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Select Program:</label>
              <Select
                value={selectedCohort?.id || ''}
                onValueChange={handleCohortChange}
                disabled={actionLoading}
              >
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select a cohort" />
                </SelectTrigger>
                <SelectContent>
                  {cohorts.map(cohort => (
                    <SelectItem key={cohort.id} value={cohort.id}>
                      <div className="flex items-center gap-2">
                        <span>{cohort.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {cohort.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Render tabs if there's a selected cohort OR managed journeys */}
        {(selectedCohort || managedJourneys.length > 0) && ( 
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              {cohorts.length > 0 && <TabsTrigger value="cohorts">Cohort Overview</TabsTrigger>} {/* Only show if cohorts exist */}
              <TabsTrigger value="journeys">Learning Journeys</TabsTrigger> {/* New Tab */}
              <TabsTrigger value="interventions">My Interventions</TabsTrigger>
            </TabsList>

            {cohorts.length > 0 && ( // Conditionally render cohort content
              <TabsContent value="cohorts" className="space-y-6">
                {selectedCohort ? (
                  <>
                    <Card className="border-0 shadow-lg">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-xl">{selectedCohort.name}</CardTitle>
                            <p className="text-sm text-gray-600 mt-1">{selectedCohort.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={
                              selectedCohort.status === 'active' ? 'bg-green-100 text-green-800' :
                              selectedCohort.status === 'planning' ? 'bg-blue-100 text-blue-800' :
                              selectedCohort.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                              'bg-red-100 text-red-800'
                            }>
                              {selectedCohort.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleDeleteCohort}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50"
                              disabled={actionLoading}
                            >
                              {actionLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">Start:</span>
                            <span className="font-medium">
                              {selectedCohort.start_date ? new Date(selectedCohort.start_date).toLocaleDateString() : 'Not set'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">End:</span>
                            <span className="font-medium">
                              {selectedCohort.end_date ? new Date(selectedCohort.end_date).toLocaleDateString() : 'Not set'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {metrics ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <Card className="border-0 shadow-md">
                          <CardContent className="p-4 text-center">
                            <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-gray-900">{metrics.totalParticipants}</p>
                            <p className="text-xs text-gray-600">Participants</p>
                          </CardContent>
                        </Card>

                        <Card className="border-0 shadow-md">
                          <CardContent className="p-4 text-center">
                            <BarChart3 className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-gray-900">{metrics.avgScore}%</p>
                            <p className="text-xs text-gray-600">Avg Score</p>
                          </CardContent>
                        </Card>

                        <Card className="border-0 shadow-md">
                          <CardContent className="p-4 text-center">
                            <Award className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-gray-900">{metrics.completionRate}%</p>
                            <p className="text-xs text-gray-600">Completion</p>
                          </CardContent>
                        </Card>

                        <Card className="border-0 shadow-md">
                          <CardContent className="p-4 text-center">
                            <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-gray-900">{metrics.atRiskCount}</p>
                            <p className="text-xs text-gray-600">At Risk</p>
                          </CardContent>
                        </Card>

                        <Card className="border-0 shadow-md">
                          <CardContent className="p-4 text-center">
                            <Award className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-gray-900">{metrics.topPerformersCount}</p>
                            <p className="text-xs text-gray-600">Top Performers</p>
                          </CardContent>
                        </Card>
                      </div>
                    ) : (
                      <Card className="border-0 shadow-lg">
                        <CardContent className="p-12 text-center">
                          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                          <p className="text-gray-600">Calculating program metrics...</p>
                        </CardContent>
                      </Card>
                    )}

                    <Card className="border-0 shadow-lg">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Participants</CardTitle>
                          <div className="flex items-center gap-4">
                            {selectedCohort.participant_emails && selectedCohort.participant_emails.length > 0 && (
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={selectedCohort.participant_emails.length > 0 && selectedParticipants.length === selectedCohort.participant_emails.length}
                                  onCheckedChange={handleSelectAll}
                                  disabled={actionLoading}
                                />
                                <span className="text-sm text-gray-600">Select All</span>
                              </div>
                            )}
                            <ParticipantAddButton 
                              onAdd={handleAddParticipant} 
                              actionLoading={actionLoading}
                            />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {selectedCohort.participant_emails && selectedCohort.participant_emails.length > 0 ? (
                          <div className="space-y-2">
                            {selectedCohort.participant_emails.map((email, idx) => {
                              const isSelected = selectedParticipants.includes(email);
                              
                              return (
                                <div 
                                  key={idx} 
                                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                    isSelected ? 'border-blue-500 bg-blue-50' : 'bg-gray-50 hover:bg-gray-100'
                                  }`}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={(checked) => handleSelectParticipant(email, checked)}
                                    onClick={(e) => e.stopPropagation()}
                                    disabled={actionLoading}
                                  />
                                  
                                  <span 
                                    className="text-sm font-medium flex-1 cursor-pointer"
                                    onClick={() => setSelectedUserEmail(email)}
                                  >
                                    {email}
                                  </span>
                                  
                                  <div className="flex items-center gap-2">
                                    <InterventionActionsMenu
                                      user={{ email }}
                                      onAssignLearning={() => handleSingleAction('assign_learning', email)}
                                      onCreateGoal={() => handleSingleAction('create_goal', email)}
                                      onSchedule1on1={() => handleSingleAction('schedule_1on1', email)}
                                      onSendNudge={() => handleSingleAction('send_nudge', email)}
                                      onEscalate={() => handleSingleAction('escalate', email)}
                                      onMarkAtRisk={() => handleSingleAction('mark_at_risk', email)}
                                      viewContext="program"
                                    />
                                    
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedUserEmail(email);
                                      }}
                                      className="hover:bg-blue-50"
                                    >
                                      <Eye className="w-4 h-4 text-blue-600" />
                                    </Button>
                                    
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveParticipant(email);
                                      }}
                                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                      disabled={actionLoading}
                                    >
                                      {actionLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="w-4 h-4" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-600 mb-4">No participants yet</p>
                            <ParticipantAddButton 
                              onAdd={handleAddParticipant} 
                              actionLoading={actionLoading} 
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card className="border-0 shadow-lg p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <CardTitle className="text-xl">No Cohort Selected</CardTitle>
                    <CardDescription className="mt-2">Please select a cohort from the dropdown above to view its details.</CardDescription>
                  </Card>
                )}
              </TabsContent>
            )}

            <TabsContent value="journeys" className="py-4">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Managed Learning Journeys</CardTitle>
                      <CardDescription>
                        Journeys you've created or manage for your programs
                      </CardDescription>
                    </div>
                    <Link to={createPageUrl('JourneyBuilder')}>
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Journey
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {managedJourneys.length === 0 ? (
                    <div className="text-center py-12">
                      <Map className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-600 mb-4">No journeys created yet</p>
                      <Link to={createPageUrl('JourneyBuilder')}>
                        <Button variant="outline">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Your First Journey
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      {managedJourneys.map((journey) => (
                        <div key={journey.id} className="p-4 border rounded-lg hover:border-blue-300 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 mb-1">{journey.title}</h4>
                              <p className="text-sm text-gray-600 line-clamp-2">{journey.description}</p>
                            </div>
                            <Badge
                              className={
                                journey.status === 'published'
                                  ? 'bg-green-100 text-green-800'
                                  : journey.status === 'draft'
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-red-100 text-red-800'
                              }
                            >
                              {journey.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                            <span>{journey.content_structure?.length || 0} resources</span>
                            <span>•</span>
                            <span>{journey.assigned_to_emails?.length || 0} learners</span>
                            <span>•</span>
                            <span>{journey.type === 'curriculum' ? 'Curriculum' : 'Path'}</span>
                          </div>
                          <div className="flex gap-2">
                            <Link to={createPageUrl('JourneyBuilder', { journeyId: journey.id })} className="flex-1">
                              <Button size="sm" variant="outline" className="w-full">
                                <Edit2 className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                            </Link>
                            {/* Assuming 'Manage' button functionality would involve assigning or tracking participants for this specific journey */}
                            <Button size="sm" variant="secondary" className="flex-1">
                              <Users className="w-3 h-3 mr-1" />
                              Manage
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="interventions" className="py-4">
              <InterventionHistoryTab managerEmail={user?.email} />
            </TabsContent>
          </Tabs>
        )}

        {showCreateModal && (
          <CohortCreationModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={handleCohortCreated}
          />
        )}
      </div>

      <BulkActionsBar
        selectedCount={selectedParticipants.length}
        onClearSelection={() => setSelectedParticipants([])}
        onBulkAssignLearning={() => handleBulkAction('assign_learning')}
        onBulkCreateGoals={() => handleBulkAction('create_goals')}
        onBulkSendNudge={() => handleBulkAction('send_nudge')}
        onBulkSchedule1on1s={() => handleBulkAction('schedule_1on1s')}
      />

      <AnimatePresence>
        {selectedUserEmail && (
          <UserDetailPanel
            userEmail={selectedUserEmail}
            onClose={() => setSelectedUserEmail(null)}
            viewContext="program"
          />
        )}
      </AnimatePresence>

      {showAssignLearning && (
        <AssignLearningModal
          open={showAssignLearning}
          onClose={closeAllModals}
          onSuccess={() => {
            closeAllModals();
            toast.success('Learning assigned successfully');
          }}
          assignedBy={user?.email}
          preSelectedUsers={Array.isArray(targetParticipant) ? targetParticipant.map(u => u.id || u.email) : (targetParticipant ? [targetParticipant.id || targetParticipant.email] : [])}
        />
      )}

      {showCreateGoal && (
        <CreateGoalModal
          open={showCreateGoal}
          onClose={closeAllModals}
          onSuccess={() => {
            closeAllModals();
            toast.success('Goal created successfully');
          }}
          managerId={user?.id}
          users={Array.isArray(targetParticipant) ? targetParticipant : (targetParticipant ? [targetParticipant] : [])}
        />
      )}

      {showSchedule1on1 && (
        <Schedule1on1Modal
          open={showSchedule1on1}
          onClose={closeAllModals}
          onSuccess={() => {
            closeAllModals();
            toast.success('1:1 scheduled successfully');
          }}
          managerId={user?.id}
          participants={Array.isArray(targetParticipant) ? targetParticipant : (targetParticipant ? [targetParticipant] : [])}
        />
      )}

      {showSendNudge && (
        <SendNudgeModal
          open={showSendNudge}
          onClose={closeAllModals}
          onSuccess={closeAllModals}
          users={Array.isArray(targetParticipant) ? targetParticipant : (targetParticipant ? [targetParticipant] : [])}
          senderName={user?.full_name || user?.email}
        />
      )}

      {showEscalate && targetParticipant && !Array.isArray(targetParticipant) && (
        <EscalateModal
          open={showEscalate}
          onClose={closeAllModals}
          onSuccess={closeAllModals}
          user={targetParticipant}
          escalatedBy={user?.full_name || user?.email}
        />
      )}

      {showMarkAtRisk && targetParticipant && !Array.isArray(targetParticipant) && (
        <MarkAtRiskModal
          open={showMarkAtRisk}
          onClose={closeAllModals}
          onSuccess={() => {
            closeAllModals();
            loadCohorts();
          }}
          user={targetParticipant}
          flaggedBy={user?.email}
        />
      )}
    </>
  );
}

function ParticipantAddButton({ onAdd, actionLoading }) {
  const [showInput, setShowInput] = useState(false);
  const [email, setEmail] = useState('');

  const handleAdd = async () => {
    if (email.trim()) {
      const success = await onAdd(email.trim());
      if (success) {
        setEmail('');
        setShowInput(false);
      }
    } else {
      toast.error('Email address cannot be empty');
    }
  };

  if (showInput) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="email"
          placeholder="Enter email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
          className="px-3 py-2 border rounded-lg text-sm"
          autoFocus
          disabled={actionLoading}
        />
        <Button size="sm" onClick={handleAdd} disabled={actionLoading}>
          {actionLoading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            'Add'
          )}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setShowInput(false)} disabled={actionLoading}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button size="sm" onClick={() => setShowInput(true)} disabled={actionLoading}>
      <UserPlus className="w-4 h-4 mr-2" />
      Add Participant
    </Button>
  );
}
