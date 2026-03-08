
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Keep Select for general use, UserComboBox replaces it for assignment
import { 
  CheckCircle, 
  Rocket, 
  Download, 
  Share2, 
  UserPlus, 
  ExternalLink, 
  BookOpen,
  Calendar,
  Target,
  Users,
  Briefcase,
  GraduationCap,
  AlertCircle, // Added
  Clock // Added
} from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useAuth } from "@/components/useAuth";
import { format, addDays } from "date-fns";
import { createPageUrl } from "@/utils";
import UserComboBox from "@/components/onboarding/UserComboBox";

export default function OnboardingProgress({ 
  planData: initialPlanData, 
  isPreviewMode = false, 
  onMilestoneToggle = null, // Changed default to null
  onRefresh = null // Added onRefresh prop
}) {
  const { user, hasRole } = useAuth();
  const [planData, setPlanData] = useState(initialPlanData); // Renamed currentPlan to planData
  const [learningResourcesMap, setLearningResourcesMap] = useState({});
  const [showShareModal, setShowShareModal] = useState(false); // Renamed showShareDialog to showShareModal
  const [showAssignModal, setShowAssignModal] = useState(false); // Renamed showAssignDialog to showAssignModal
  const [shareEmail, setShareEmail] = useState("");
  const [assignToEmail, setAssignToEmail] = useState("");
  const [actionLoading, setActionLoading] = useState(false); // Added loading state for actions
  const [emailError, setEmailError] = useState(""); // Added email error state

  const canManage = hasRole(['User Level 2', 'User Level 3', 'Admin Level 1', 'Admin Level 2', 'Admin Level 3']);
  const isOwner = user?.email === planData?.assigned_to_email;
  const isCreator = user?.email === planData?.assigned_by || user?.email === planData?.created_by;

  useEffect(() => {
    setPlanData(initialPlanData);
  }, [initialPlanData]);

  useEffect(() => {
    if (planData?.milestones) {
      loadLearningResources();
    }
  }, [planData]);

  // Removed old loadAvailableUsers as UserComboBox will handle its own user fetching

  const loadLearningResources = async () => {
    if (!planData?.milestones) return;
    
    const allResourceIds = new Set();
    planData.milestones.forEach(milestone => {
      if (milestone.resources && Array.isArray(milestone.resources)) {
        milestone.resources.forEach(rid => allResourceIds.add(rid));
      }
    });

    if (allResourceIds.size === 0) return;

    try {
      // Fetch all resources and then filter, or consider a batched fetch if IDs are many
      const resources = await base44.entities.LearningResource.list();
      const resourceMap = {};
      resources.forEach(resource => {
        if (allResourceIds.has(resource.id)) {
          resourceMap[resource.id] = resource;
        }
      });
      setLearningResourcesMap(resourceMap);
    } catch (error) {
      console.error('Error loading learning resources:', error);
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || email.trim() === '') {
      return 'Email is required';
    }
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const handleMilestoneToggle = async (milestoneIndex) => { // Renamed from handleMilestoneToggleInternal
    if (isPreviewMode && onMilestoneToggle) {
      onMilestoneToggle(milestoneIndex);
      return;
    }

    // Only the assigned user can toggle milestones on their plan
    if (!planData || !isOwner) {
      toast.error('You can only update your own onboarding plan');
      return;
    }

    try {
      const updatedMilestones = [...planData.milestones];
      const milestone = updatedMilestones[milestoneIndex];
      
      // Toggle status
      const newStatus = milestone.status === 'completed' ? 'not_started' : 'completed';
      updatedMilestones[milestoneIndex] = {
        ...milestone,
        status: newStatus
      };

      // Recalculate completion percentage
      const completedCount = updatedMilestones.filter(m => m.status === 'completed').length;
      const completionPercentage = Math.round((completedCount / updatedMilestones.length) * 100);

      // Determine overall status
      let overallStatus = 'assigned';
      if (completionPercentage === 100) {
        overallStatus = 'completed';
      } else if (completionPercentage > 0) {
        overallStatus = 'in_progress';
      }

      // Update local state immediately (optimistic update)
      const updatedPlanData = {
        ...planData,
        milestones: updatedMilestones,
        completion_percentage: completionPercentage,
        status: overallStatus,
        // Set completed_date only if it's 100% complete and not already set
        ...(completionPercentage === 100 && !planData.completed_date ? { completed_date: new Date().toISOString() } : { completed_date: null })
      };
      setPlanData(updatedPlanData);

      // Persist to database
      await base44.entities.OnboardingPlan.update(planData.id, {
        milestones: updatedMilestones,
        completion_percentage: completionPercentage,
        status: overallStatus,
        completed_date: completionPercentage === 100 ? new Date().toISOString() : null
      });

      // Sync with related Goal if exists
      if (milestone.related_goal_id) {
        try {
          await base44.entities.Goal.update(milestone.related_goal_id, {
            status: newStatus === 'completed' ? 'completed' : 'active', // Assuming 'active' for not_started goals
            completion_percentage: newStatus === 'completed' ? 100 : 0,
            ...(newStatus === 'completed' ? { completion_date: new Date().toISOString() } : { completion_date: null })
          });
        } catch (goalError) {
          console.warn('Could not update related goal:', goalError);
          toast.warning('Failed to sync related goal status.');
        }
      }

      // Sync with related AssignedLearning if exists
      if (milestone.related_assigned_learning_id) {
        try {
          await base44.entities.AssignedLearning.update(milestone.related_assigned_learning_id, {
            status: newStatus === 'completed' ? 'completed' : 'in_progress', // Assuming 'in_progress' for not_started learning
            ...(newStatus === 'completed' ? { completion_date: new Date().toISOString() } : { completion_date: null })
          });
        } catch (learningError) {
          console.warn('Could not update related learning:', learningError);
          toast.warning('Failed to sync related learning status.');
        }
      }

      toast.success(newStatus === 'completed' ? 'Milestone completed!' : 'Milestone unmarked');

      // Trigger refresh if callback provided
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error toggling milestone:', error);
      toast.error('Failed to update milestone');
      // Revert optimistic update
      setPlanData(initialPlanData);
    }
  };

  const handleDownload = async () => { // Renamed from handleDownloadPDF
    if (!planData?.id) return;

    setActionLoading(true);
    try {
      const response = await base44.functions.invoke('downloadOnboardingPlan', {
        planId: planData.id
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `onboarding-plan-${planData.title?.replace(/\s+/g, '-') || 'plan'}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading plan:', error);
      toast.error('Failed to download PDF');
    } finally {
      setActionLoading(false);
    }
  };

  const handleShare = async () => { // Renamed from handleSharePlan
    const error = validateEmail(shareEmail);
    if (error) {
      setEmailError(error);
      return;
    }

    setActionLoading(true);
    setEmailError(""); // Clear previous error

    try {
      await base44.functions.invoke('shareOnboardingPlan', {
        planId: planData.id,
        recipientEmail: shareEmail.trim()
      });

      toast.success(`Plan shared with ${shareEmail}`);
      setShowShareModal(false);
      setShareEmail("");
    } catch (error) {
      console.error('Error sharing plan:', error);
      toast.error('Failed to share plan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssign = async () => { // Renamed from handleAssignPlan
    const error = validateEmail(assignToEmail);
    if (error) {
      setEmailError(error);
      return;
    }

    if (assignToEmail === user?.email) {
      setEmailError('You cannot assign a plan to yourself');
      return;
    }

    setActionLoading(true);
    setEmailError(""); // Clear previous error

    try {
      // Create new plan based on current one
      const newPlan = await base44.entities.OnboardingPlan.create({
        title: planData.title,
        description: planData.description,
        target_role: planData.target_role,
        duration_days: planData.duration_days,
        assigned_to_email: assignToEmail.trim(),
        assigned_by: user.email,
        status: 'assigned',
        started_date: new Date().toISOString(),
        milestones: planData.milestones?.map(m => ({
          ...m,
          status: 'not_started',
          related_goal_id: null, // New plans won't have existing goals/learning assigned
          related_assigned_learning_id: null
        })) || [],
        completion_percentage: 0,
        ai_generated: planData.ai_generated || false // Ensure ai_generated exists, default to false
      });

      // No longer creating Goals/AssignedLearning here directly.
      // This action only creates the plan; related entities can be created by a separate workflow
      // or upon plan acceptance/initiation by the assigned user.

      // Send notifications
      await base44.functions.invoke('createNotification', {
        user_email: assignToEmail.trim(),
        type: 'milestone',
        title: 'New Onboarding Plan Assigned',
        message: `${user.full_name} has assigned you a new onboarding plan: "${planData.title}"`,
        priority: 'high',
        action_url: createPageUrl('MyOnboarding')
      });

      // Send email notification
      await base44.integrations.Core.SendEmail({
        from_name: 'Curiosity Led',
        to: assignToEmail.trim(),
        subject: `New Onboarding Plan: ${planData.title}`,
        body: `
          <h2>Welcome to Your Onboarding Journey!</h2>
          <p>Hi there,</p>
          <p>${user.full_name} has assigned you a new onboarding plan to help guide your success.</p>
          <h3>${planData.title}</h3>
          <p><strong>Duration:</strong> ${planData.duration_days || 'N/A'} days</p>
          <p><strong>Role:</strong> ${planData.target_role || 'Not specified'}</p>
          ${planData.description ? `<p>${planData.description}</p>` : ''}
          <p>Log in to Curiosity Led to view your full plan and start your journey!</p>
          <p><a href="${window.location.origin}${createPageUrl('MyOnboarding')}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">View Your Plan</a></p>
          <p>Best regards,<br/>The Curiosity Led Team</p>
        `
      });

      toast.success(`Plan assigned to ${assignToEmail}`);
      setShowAssignModal(false);
      setAssignToEmail("");
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error assigning plan:', error);
      toast.error('Failed to assign plan');
    } finally {
      setActionLoading(false);
    }
  };

  if (!planData) {
    return (
      <Card className="shadow-lg border-0">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No onboarding plan selected or available.</p>
        </CardContent>
      </Card>
    );
  }

  // Group milestones by phase for rendering
  const milestonesByPhase = planData.milestones?.reduce((acc, milestone) => {
    const phase = milestone.phase || 'General';
    if (!acc[phase]) {
      acc[phase] = [];
    }
    acc[phase].push(milestone);
    return acc;
  }, {}) || {};

  const phases = Object.keys(milestonesByPhase); // Get ordered phases

  const completedMilestones = planData.milestones?.filter(m => m.status === 'completed').length || 0;
  const totalMilestones = planData.milestones?.length || 0;

  return (
    <>
      <Card className="shadow-lg border-0">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Rocket className="w-6 h-6 text-blue-600" />
                <CardTitle className="text-2xl">{planData.title || 'Untitled Plan'}</CardTitle>
                {getStatusBadge(planData.status)}
              </div>
              
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Briefcase className="w-4 h-4" />
                  <span><strong>Target Role:</strong> {planData.target_role || 'Not specified'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span><strong>Duration:</strong> {planData.duration_days || 'N/A'} days</span>
                </div>
                {planData.assigned_to_email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span><strong>Assigned to:</strong> {planData.assigned_to_email}</span>
                  </div>
                )}
                {planData.started_date && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span><strong>Started:</strong> {format(new Date(planData.started_date), 'MMM d, yyyy')}</span>
                  </div>
                )}
              </div>

              {planData.description && (
                <p className="text-gray-600 mt-4">{planData.description}</p>
              )}
            </div>

            {/* Action Buttons */}
            {!isPreviewMode && (
              <div className="flex flex-col sm:flex-row gap-2 self-start">
                {(canManage || isCreator || isOwner) && ( // Allow owner to download, managers/creators to share/assign
                  <Button variant="outline" size="sm" onClick={handleDownload} disabled={actionLoading} title="Download PDF">
                    <Download className="w-4 h-4" />
                  </Button>
                )}
                {(canManage || isCreator) && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setShowShareModal(true)} disabled={actionLoading} title="Share Plan">
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowAssignModal(true)} disabled={actionLoading} title="Assign to User">
                      <UserPlus className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Overall Progress */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm font-bold text-blue-600">
                {planData.completion_percentage || 0}%
              </span>
            </div>
            <Progress value={planData.completion_percentage || 0} className="h-3" />
            <p className="text-xs text-gray-500 mt-2">
              {completedMilestones} of {totalMilestones} milestones completed
            </p>
          </div>
        </CardHeader>

        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            {totalMilestones === 0 ? (
              <div className="text-center py-12">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No milestones defined for this plan yet.</p>
              </div>
            ) : phases.length > 0 ? (
              <div className="space-y-6">
                {phases.map((phase, phaseIndex) => {
                  const phaseMilestones = milestonesByPhase[phase];
                  const phaseLabel = phaseMilestones[0]?.phase_label || phase;
                  const phaseCompleted = phaseMilestones.filter(m => m.status === 'completed').length;

                  return (
                    <motion.div
                      key={phase}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: phaseIndex * 0.1 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center justify-between bg-blue-600 text-white p-3 rounded-lg">
                        <h3 className="font-semibold flex items-center gap-2">
                          <GraduationCap className="w-5 h-5" />
                          {phaseLabel}
                        </h3>
                        <span className="text-sm">
                          {phaseCompleted}/{phaseMilestones.length}
                        </span>
                      </div>

                      <div className="space-y-2 pl-4">
                        {phaseMilestones.map((milestone) => {
                          // Find global index for toggling (important for non-grouped operations)
                          const globalIndex = planData.milestones.findIndex(m => m.id === milestone.id || (m.title === milestone.title && m.due_day === milestone.due_day)); // Use ID if available, fallback to title+due_day
                          return (
                            <MilestoneItem
                              key={milestone.id || `${milestone.title}-${milestone.due_day}`}
                              milestone={milestone}
                              onToggle={() => handleMilestoneToggle(globalIndex)}
                              learningResourcesMap={learningResourcesMap}
                              isInteractive={isOwner && !isPreviewMode} // Only owner can interact when not in preview
                            />
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              // Fallback for plans without explicit phases
              <div className="space-y-2">
                {planData.milestones.map((milestone, index) => (
                  <MilestoneItem
                    key={milestone.id || `${milestone.title}-${milestone.due_day}-${index}`}
                    milestone={milestone}
                    onToggle={() => handleMilestoneToggle(index)}
                    learningResourcesMap={learningResourcesMap}
                    isInteractive={isOwner && !isPreviewMode}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Share Modal */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Onboarding Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="share-email">Recipient Email</Label>
              <Input
                id="share-email"
                type="email"
                placeholder="colleague@company.com"
                value={shareEmail}
                onChange={(e) => {
                  setShareEmail(e.target.value);
                  setEmailError(""); // Clear error on change
                }}
                className={emailError ? "border-red-500" : ""}
              />
              {emailError && (
                <p className="text-red-500 text-sm mt-1">{emailError}</p>
              )}
            </div>
            <p className="text-sm text-gray-600">
              This will send an email with the plan details and current progress to the specified recipient.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowShareModal(false);
              setShareEmail("");
              setEmailError("");
            }}>
              Cancel
            </Button>
            <Button onClick={handleShare} disabled={actionLoading || emailError || !shareEmail}>
              {actionLoading ? 'Sending...' : 'Share Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Plan to Another User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="assign-user">Select User</Label>
              {/* UserComboBox is assumed to handle user fetching and filtering */}
              <UserComboBox
                value={assignToEmail}
                onValueChange={(email) => {
                  setAssignToEmail(email);
                  setEmailError(""); // Clear error on change
                }}
                placeholder="Select a user to assign this plan to..."
                // filterByManager={hasRole(['User Level 2'])} // This logic should be inside UserComboBox based on user roles
                currentUserEmail={user?.email} // Exclude current user from selection
                className={emailError ? "border-red-500" : ""}
              />
              {emailError && (
                <p className="text-red-500 text-sm mt-1">{emailError}</p>
              )}
            </div>
            <p className="text-sm text-gray-600">
              This will create a new onboarding plan for the selected user based on this template. All milestones will be reset to "not started".
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAssignModal(false);
              setAssignToEmail("");
              setEmailError("");
            }}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={actionLoading || emailError || !assignToEmail}>
              {actionLoading ? 'Assigning...' : 'Assign Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MilestoneItem({ milestone, onToggle, learningResourcesMap, isInteractive }) {
  const isCompleted = milestone.status === 'completed';

  const getMilestoneIcon = (type) => {
    switch (type) {
      case 'orientation': return <Rocket className="w-4 h-4 text-purple-600" />;
      case 'priority': return <Target className="w-4 h-4 text-blue-600" />;
      case 'project': return <Briefcase className="w-4 h-4 text-green-600" />;
      case 'learning': return <GraduationCap className="w-4 h-4 text-orange-600" />;
      case 'team_intro': return <Users className="w-4 h-4 text-pink-600" />;
      default: return <CheckCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className={`p-4 rounded-lg border transition-all ${
      isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:border-gray-300'
    }`}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isCompleted}
          onCheckedChange={onToggle}
          disabled={!isInteractive}
          className="mt-1"
        />
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              {getMilestoneIcon(milestone.type)}
              <h4 className={`font-semibold ${
                isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'
              }`}>
                {milestone.title}
              </h4>
            </div>
          </div>
          
          {milestone.description && (
            <p className={`text-sm mb-2 ${
              isCompleted ? 'text-gray-500' : 'text-gray-600'
            }`}>
              {milestone.description}
            </p>
          )}
          
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {milestone.due_day !== undefined && milestone.due_day !== null && ( // Ensure due_day is valid
              <Badge variant="outline" className="text-xs">
                <Calendar className="w-3 h-3 mr-1" />
                Day {milestone.due_day}
              </Badge>
            )}
            {milestone.type && (
              <Badge variant="secondary" className="text-xs capitalize">
                {milestone.type.replace(/_/g, ' ')}
              </Badge>
            )}
            {isCompleted && (
              <Badge className="bg-green-100 text-green-800 text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                Completed
              </Badge>
            )}
          </div>

          {/* Learning Resources */}
          {milestone.resources && milestone.resources.length > 0 && (
            <div className="mt-3 space-y-1">
              {milestone.resources.map((resourceId) => {
                const resource = learningResourcesMap[resourceId];
                if (!resource) return null;
                
                return (
                  <a
                    key={resourceId}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <BookOpen className="w-4 h-4" />
                    {resource.title}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function for status badges
function getStatusBadge(status) {
  const statusConfig = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft', icon: null },
    assigned: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Assigned', icon: Clock },
    in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'In Progress', icon: Target },
    completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed', icon: CheckCircle }
  };
  
  const config = statusConfig[status] || statusConfig.draft; // Default to draft if status is unknown
  const Icon = config.icon;
  
  return (
    <Badge className={`${config.bg} ${config.text} ml-2`}>
      {Icon && <Icon className="w-3 h-3 mr-1" />}
      {config.label}
    </Badge>
  );
}
