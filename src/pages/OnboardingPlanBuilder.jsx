import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserPlus,
  Calendar,
  Target,
  Sparkles,
  Plus,
  Trash2,
  Send,
  Edit2,
  Save,
  X,
  CheckCircle,
  Clock,
  Users,
  Loader2,
  Library,
  AlertCircle,
  BookOpen,
  ExternalLink,
  FileEdit,
  Bookmark,
  ArrowLeft,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";
import Breadcrumbs from "@/components/common/Breadcrumbs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePageContext } from "../Layout";
import TemplateBrowser from "@/components/onboarding/TemplateBrowser";
import SaveAsTemplateModal from "@/components/onboarding/SaveAsTemplateModal";
import PlanSuggestionsPanel from "@/components/ai/PlanSuggestionsPanel";
import FormAssistant from "@/components/ai/FormAssistant";

import { createPageUrl } from "@/utils";

const createOnboardingEmailBody = (assigneeName, plan, assignerName) => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #0056b3;">Your Onboarding Journey Begins!</h2>
      <p>Hi ${assigneeName},</p>
      <p>Welcome! <strong>${assignerName}</strong> has assigned you a personalized onboarding plan to help you get started in your new role.</p>
      <div style="border: 1px solid #ddd; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0;">${plan.title}</h3>
        <p>This is a ${plan.duration_days}-day plan designed to guide you through your first few months.</p>
        <a href="${window.location.origin}${createPageUrl('MyOnboarding')}" target="_blank" style="display: inline-block; background-color: #0056b3; color: #fff; padding: 10px 15px; text-decoration: none; border-radius: 5px; margin-top: 10px;">
          View Your Plan
        </a>
      </div>
      <p>We're excited to have you on the team!</p>
      <p><em>- The Curiosity Led Platform</em></p>
    </div>
  `;
};

function OnboardingPlanBuilder() {
  const { user, loading: authLoading, hasPermission, hasAnyPermission, appRole, isAnyAdmin } = useAuth();
  const { updatePageContext } = usePageContext();

  const canManagePlans = isAnyAdmin || appRole === 'User Level 2' || appRole === 'User Level 3' ||
    hasAnyPermission(['programs.create', 'programs.edit', 'programs.manage_participants']);

  const [targetRole, setTargetRole] = useState("Mid-Level Manager");
  const [duration, setDuration] = useState("90");
  const [jobDescription, setJobDescription] = useState("");
  const [focusAreas, setFocusAreas] = useState({
    strategic: true,
    operational: false,
    people: true,
  });
  const [loading, setLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [isEditingGeneratedPlan, setIsEditingGeneratedPlan] = useState(false);

  const [savedPlans, setSavedPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [isDeploying, setIsDeploying] = useState(false);
  const [selectedPlanForDeploy, setSelectedPlanForDeploy] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const [allLearningResources, setAllLearningResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(false);

  const [showTemplateBrowser, setShowTemplateBrowser] = useState(false);
  const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSavedPlans();
      fetchLearningResources();
    }
  }, [user]);

  const fetchSavedPlans = async () => {
    setLoadingPlans(true);
    try {
      const plans = await base44.entities.OnboardingPlan.list("-created_date");
      setSavedPlans(plans);
    } catch (error) {
      toast.error("Failed to load saved plans.");
      console.error(error);
    } finally {
      setLoadingPlans(false);
    }
  };

  const fetchLearningResources = async () => {
    setLoadingResources(true);
    try {
      const resources = await base44.entities.LearningResource.list("title");
      setAllLearningResources(resources);
    } catch (error) {
      console.error('Error loading learning resources:', error);
      toast.error('Failed to load learning resources');
    } finally {
      setLoadingResources(false);
    }
  };

  const fetchUsersForDeploy = async () => {
    try {
      const users = await base44.entities.User.list();
      setAllUsers(users);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users for deployment');
    }
  };

  const handleCheckboxChange = (area) => {
    setFocusAreas((prev) => ({ ...prev, [area]: !prev[area] }));
  };

  const createFromScratch = () => {
    const blankPlan = {
      title: "",
      target_role: "",
      duration_days: 90,
      description: "",
      context: "",
      ai_generated: false,
      milestones: [],
      status: 'draft',
      completion_percentage: 0,
      assigned_by: user.email,
      assigned_to_email: null,
    };
    setGeneratedPlan(blankPlan);
    setIsEditingGeneratedPlan(true);
    toast.success("Blank plan created - start adding details!");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const createFromTemplate = (template) => {
    const newPlan = {
      ...template,
      id: null, // New plans always need a new ID
      title: template.title.replace(' Template', ''), // Remove " Template" suffix
      is_template: false, // This is now a regular plan, not a template
      status: 'draft',
      assigned_to_email: null,
      assigned_by: user.email,
      completion_percentage: 0,
      started_date: null,
      completed_date: null,
      use_count: undefined, // Remove template-specific fields
      last_used_date: undefined, // Remove template-specific fields
      milestones: template.milestones?.map(m => ({
        ...m,
        status: 'not_started', // Reset milestone status
        related_goal_id: null,
        related_assigned_learning_id: null
      })) || []
    };
    setGeneratedPlan(newPlan);
    setIsEditingGeneratedPlan(true);
    setShowTemplateBrowser(false); // Close the template browser
    toast.success("Plan created from template - customize as needed!");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const generatePlan = async () => {
    if (!jobDescription || jobDescription.trim() === '') {
      toast.error("Please provide a job description or role responsibilities");
      return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const focusAreasText = Object.entries(focusAreas)
        .filter(([_, val]) => val)
        .map(([key, _]) => key)
        .join(', ');

      const contextInfo = `Target Role: ${targetRole}
Duration: ${duration} days
Focus Areas: ${focusAreasText}

Job Description/Responsibilities:
${jobDescription}`;

      const planData = {
        title: `Onboarding Plan for ${targetRole} (${new Date().toLocaleDateString()})`,
        target_role: targetRole,
        duration_days: parseInt(duration),
        context: contextInfo,
        ai_generated: true,
        milestones: [
          { title: "Understand Company Culture & Values", description: "Familiarize with company mission, vision, values, and key policies.", due_day: 7, status: "not_started", resources: [] },
          { title: "Meet Core Team & Key Stakeholders", description: "Schedule introductory meetings with direct team members and cross-functional partners.", due_day: 14, status: "not_started", resources: [] },
          { title: "Setup Work Environment & Tools", description: "Ensure all necessary software, hardware, and access permissions are configured.", due_day: 7, status: "not_started", resources: [] },
          { title: "Initial Project/Task Contribution", description: "Successfully complete a small, impactful task or contribute to an ongoing project.", due_day: 30, status: "not_started", resources: [] },
          { title: "Review 30-Day Progress", description: "Meet with manager to discuss progress, challenges, and adjust priorities.", due_day: 30, status: "not_started", resources: [] },
          { title: "Deep Dive into Departmental Goals", description: "Understand departmental OKRs/goals and how your role contributes.", due_day: 45, status: "not_started", resources: [] },
          { title: "Cross-Functional Collaboration", description: "Engage with at least two other departments to understand their functions.", due_day: 60, status: "not_started", resources: [] },
          { title: "Identify Learning & Development Needs", description: "Pinpoint skills gaps and training opportunities for future growth.", due_day: 75, status: "not_started", resources: [] },
          { title: "90-Day Performance Review & Goal Setting", description: "Participate in formal 90-day review and establish long-term goals.", due_day: 90, status: "not_started", resources: [] },
        ],
        description: `This plan focuses on: ${focusAreasText}. Tailored for the specific role responsibilities provided.`,
        status: 'draft',
        completion_percentage: 0,
        assigned_by: user.email,
        assigned_to_email: null,
      };
      setGeneratedPlan(planData);
      setIsEditingGeneratedPlan(false);
      toast.success("Onboarding plan generated!");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error("Error generating plan:", error);
      toast.error("Failed to generate plan.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsDraft = async (planToSave) => {
    if (!planToSave) {
      toast.warning("No plan to save. Please generate a plan first.");
      return;
    }

    if (!planToSave.title || planToSave.title.trim() === '') {
      toast.error("Please add a title to your plan before saving");
      return;
    }

    if (!planToSave.context || planToSave.context.trim() === '') {
      toast.error("Please add job description/role responsibilities to your plan before saving");
      return;
    }

    setIsSaving(true);
    try {
      if (planToSave.id) {
         const updatedPlan = await base44.entities.OnboardingPlan.update(planToSave.id, {
            ...planToSave,
            status: 'draft',
            assigned_by: user.email,
         });
         setGeneratedPlan(updatedPlan);
         toast.success("Changes saved successfully!");
      } else {
        const newPlan = await base44.entities.OnboardingPlan.create({
            ...planToSave,
            status: 'draft',
            assigned_by: user.email,
        });
        setGeneratedPlan(newPlan);
        toast.success("Plan saved as draft!");
      }
      fetchSavedPlans();
    } catch (error) {
      toast.error("Failed to save draft: " + error.message);
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenDeployModal = (plan) => {
    fetchUsersForDeploy();
    setSelectedPlanForDeploy(plan);
    setIsDeploying(true);
  };

  const handleDeployPlan = async () => {
    if (!selectedUser || !selectedPlanForDeploy) {
      toast.warning("Please select a user to deploy the plan to.");
      return;
    }
    setIsSaving(true);
    try {
      let planToDeploy = { ...selectedPlanForDeploy };

      if (!planToDeploy.id) {
          planToDeploy = await base44.entities.OnboardingPlan.create({
              ...planToDeploy,
              status: 'draft',
              assigned_by: user.email,
          });
      }

      const finalPlan = await base44.entities.OnboardingPlan.update(planToDeploy.id, {
          status: 'assigned',
          assigned_to_email: selectedUser.email,
          assigned_by: user.email,
          started_date: new Date().toISOString(),
      });

      await base44.integrations.invoke('Core', 'SendEmail', {
          to: selectedUser.email,
          subject: "Your New Onboarding Plan is Ready!",
          body: createOnboardingEmailBody(selectedUser.full_name, finalPlan, user.full_name),
          from_name: 'Curiosity Led'
      });

      const notificationResponse = await base44.functions.invoke('createNotification', {
        user_email: selectedUser.email,
        type: 'milestone',
        title: 'New Onboarding Plan Assigned',
        message: `You have been assigned a new onboarding plan: ${finalPlan.title}`,
        priority: 'high',
        related_entity_type: 'OnboardingPlan',
        related_entity_id: finalPlan.id,
        action_url: `/MyOnboarding?planId=${finalPlan.id}`
      });

      if (!notificationResponse.data.success) {
        console.warn('Failed to create notification:', notificationResponse.data.error);
        toast.warning('Plan assigned and email sent, but notification failed to send.');
      } else {
        toast.success(`Plan deployed to ${selectedUser.full_name} and notification sent!`);
      }

      setIsDeploying(false);
      setSelectedUser(null);
      setSelectedPlanForDeploy(null);
      setGeneratedPlan(null);
      fetchSavedPlans();
    } catch (error) {
        toast.error("Failed to deploy plan: " + error.message);
        console.error(error);
    } finally {
        setIsSaving(false);
    }
  };

  const handleEditPlan = (plan) => {
    setGeneratedPlan(plan);
    setIsEditingGeneratedPlan(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm("Are you sure you want to delete this plan? This action cannot be undone.")) return;

    try {
        await base44.entities.OnboardingPlan.delete(planId);
        toast.success("Plan deleted successfully.");
        fetchSavedPlans();
        if(generatedPlan?.id === planId) {
          setGeneratedPlan(null);
          setIsEditingGeneratedPlan(false);
        }
    } catch(error) {
        toast.error("Failed to delete plan: " + error.message);
        console.error(error);
    }
  }

  const buildAICoachContext = () => {
    const milestonesCount = generatedPlan?.milestones?.length || 0;
    const hasAssignee = !!selectedUser;
    const isPlanGenerated = generatedPlan && Object.keys(generatedPlan).length > 0;
    const completedMilestones = generatedPlan?.milestones?.filter(m => m.status === 'completed').length || 0;
    const planCompletion = milestonesCount > 0 ? Math.round((completedMilestones / milestonesCount) * 100) : 0;

    return {
      current_filters: null,
      visible_data_summary: {
        plan_exists: isPlanGenerated,
        plan_status: generatedPlan?.status || 'draft',
        total_milestones: milestonesCount,
        completed_milestones: completedMilestones,
        plan_completion_percentage: planCompletion,
        has_assignee: hasAssignee,
        assignee_email: selectedUser?.email,
        target_role: targetRole,
        duration_days: parseInt(duration)
      },
      selected_items: selectedUser ? {
        assignee: {
          email: selectedUser.email,
          full_name: selectedUser.full_name,
          app_role: selectedUser.app_role
        }
      } : null,
      modal_focus: isDeploying ? 'user_selector_modal' : null,
      page_specific_insights: {
        plan_ready_to_deploy: isPlanGenerated && hasAssignee && milestonesCount > 0,
        needs_generation: !isPlanGenerated,
        needs_assignee: isPlanGenerated && !hasAssignee,
        is_deployed: generatedPlan?.status === 'assigned',
        milestone_breakdown: {
          orientation: generatedPlan?.milestones?.filter(m => m.type === 'orientation').length || 0,
          priorities: generatedPlan?.milestones?.filter(m => m.type === 'priority').length || 0,
          projects: generatedPlan?.milestones?.filter(m => m.type === 'project').length || 0,
          learning: generatedPlan?.milestones?.filter(m => m.type === 'learning').length || 0,
          team_intros: generatedPlan?.milestones?.filter(m => m.type === 'team_intro').length || 0
        },
        can_create_plans: canManagePlans
      },
      available_actions: getAvailableActions(),
      viewing_focus: isPlanGenerated ? 'plan_editor' : 'plan_generator'
    };
  };

  const getAvailableActions = () => {
    const actions = [];
    const milestonesCount = generatedPlan?.milestones?.length || 0;
    const hasAssignee = !!selectedUser;
    const isPlanGenerated = generatedPlan && Object.keys(generatedPlan).length > 0;

    if (!isPlanGenerated) {
      actions.push({
        action: 'generate_plan',
        description: 'Generate AI-powered onboarding plan'
      });
    }

    if (isPlanGenerated && !hasAssignee) {
      actions.push({
        action: 'select_assignee',
        description: 'Choose who this plan is for'
      });
    }

    if (isPlanGenerated && milestonesCount > 0) {
      actions.push({
        action: 'edit_milestones',
        description: 'Customize milestones and deadlines'
      });

      actions.push({
        action: 'add_learning_resources',
        description: 'Attach learning resources to milestones'
      });
    }

    if (isPlanGenerated && hasAssignee && milestonesCount > 0) {
      actions.push({
        action: 'deploy_plan',
        description: `Deploy plan to ${selectedUser.full_name}`
      });
    }

    if (generatedPlan?.status === 'assigned') {
      actions.push({
        action: 'track_progress',
        description: 'Monitor onboarding progress'
      });
    }

    actions.push({
      action: 'create_template',
      description: 'Save as reusable template'
    });

    return actions;
  };

  useEffect(() => {
    if (user) {
      const context = buildAICoachContext();
      updatePageContext(context);
    }
  }, [generatedPlan, selectedUser, targetRole, duration, isDeploying, user]);

  const handleApplyAlternativeStructure = (structure) => {
    if (!structure.milestones) return;
    
    const newMilestones = structure.milestones.map((m, idx) => ({
      title: m.title,
      description: m.description || "",
      due_day: m.due_day || (idx + 1) * 10,
      status: "not_started",
      resources: [],
      type: "priority"
    }));

    setGeneratedPlan({
      ...generatedPlan,
      milestones: newMilestones
    });
    setIsEditingGeneratedPlan(true);
    toast.success("Alternative structure applied! Review and customize as needed.");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (authLoading || (user === null)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!canManagePlans) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
              <p className="text-gray-600 mb-4">
                You don't have permission to create or manage onboarding plans. Please contact your administrator if you need access.
              </p>
              <div className="text-sm text-gray-500 mb-4">
                Your role: <span className="font-medium">{appRole}</span>
              </div>
              <Button onClick={() => window.history.back()}>
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingPlans) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading Onboarding Builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

        <div className="lg:col-span-2 space-y-8">
          <div className="mb-4">
            <Breadcrumbs items={[
              { label: 'Experience Management', href: createPageUrl("ExperienceManagement") + "#builders" },
              { label: 'Onboarding Plan Builder' }
            ]} />
            <Link to={createPageUrl("ExperienceManagement") + "#builders"}>
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Builders
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Onboarding Plan Builder</h1>
            <p className="text-gray-600">Build personalized onboarding experiences for new hires</p>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Create New Onboarding Plan</CardTitle>
              <CardDescription>Choose how you'd like to create your plan</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="ai-generate" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="ai-generate">
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Generate
                  </TabsTrigger>
                  <TabsTrigger value="from-template">
                    <Bookmark className="w-4 h-4 mr-2" />
                    From Template
                  </TabsTrigger>
                  <TabsTrigger value="from-scratch">
                    <FileEdit className="w-4 h-4 mr-2" />
                    From Scratch
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="ai-generate" className="space-y-4">
                  <p className="text-sm text-gray-600">Define the core parameters for an AI-suggested plan.</p>
                  
                  <FormAssistant
                    formSchema={{
                      type: "object",
                      properties: {
                        target_role: { type: "string" },
                        duration_days: { type: "number" },
                        description: { type: "string" }
                      }
                    }}
                    onApply={(data) => {
                      if (data.target_role) setTargetRole(data.target_role);
                      if (data.duration_days) setDuration(String(data.duration_days));
                      if (data.description) setJobDescription(data.description);
                    }}
                    formType="onboarding_plan"
                    placeholder="Describe the onboarding plan, e.g., 'A 90-day plan for a new Senior Software Engineer joining our backend team, focusing on system architecture and code standards'"
                    compact={true}
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Role *
                    </label>
                    <Input
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="e.g., Senior Software Engineer"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Job Description / Role Responsibilities *
                    </label>
                    <Textarea
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Paste the job description or key responsibilities here. This helps AI create more relevant milestones and tasks tailored to the specific role..."
                      rows={5}
                      className="resize-y"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      💡 The more detailed information you provide, the more personalized and relevant the onboarding plan will be.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (days) *
                    </label>
                    <Input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      min="30"
                      max="180"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Key Focus Areas</label>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={focusAreas.strategic}
                          onChange={() => handleCheckboxChange('strategic')}
                          className="form-checkbox h-4 w-4 text-blue-600 rounded-md border-gray-300 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-gray-700">Strategic Alignment</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={focusAreas.operational}
                          onChange={() => handleCheckboxChange('operational')}
                          className="form-checkbox h-4 w-4 text-blue-600 rounded-md border-gray-300 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-gray-700">Operational Excellence</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={focusAreas.people}
                          onChange={() => handleCheckboxChange('people')}
                          className="form-checkbox h-4 w-4 text-blue-600 rounded-md border-gray-300 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-gray-700">People Development</span>
                      </label>
                    </div>
                  </div>

                  <Button onClick={generatePlan} className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Sparkles className="h-5 w-5 mr-2" />}
                    Generate Onboarding Plan
                  </Button>
                </TabsContent>

                <TabsContent value="from-template" className="space-y-4">
                  <p className="text-sm text-gray-600">Start with a pre-built template and customize it for your needs.</p>
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-lg text-center">
                    <Bookmark className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                    <h3 className="font-semibold text-gray-900 mb-2">Browse Templates</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Choose from pre-built templates to save time and ensure consistency.
                    </p>
                    <Button onClick={() => setShowTemplateBrowser(true)} className="bg-purple-600 hover:bg-purple-700">
                      <Bookmark className="w-4 h-4 mr-2" />
                      Browse Template Library
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="from-scratch" className="space-y-4">
                  <p className="text-sm text-gray-600">Start with a blank canvas and build your plan manually.</p>
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg text-center">
                    <FileEdit className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                    <h3 className="font-semibold text-gray-900 mb-2">Custom Onboarding Plan</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Create a completely custom plan with your own milestones, timelines, and learning resources.
                    </p>
                    <Button onClick={createFromScratch} className="bg-purple-600 hover:bg-purple-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Start Building
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <AnimatePresence>
            {generatedPlan && (
              <motion.div
                key={generatedPlan.id || 'new-generated-plan'}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* AI Suggestions Panel */}
                <PlanSuggestionsPanel
                  plan={generatedPlan}
                  type="onboarding"
                  onApplySuggestion={handleApplyAlternativeStructure}
                />

                <Card className="border-0 shadow-2xl">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-xl">
                              {isEditingGeneratedPlan ? 'Edit Plan Details' : generatedPlan.title || 'New Plan'}
                            </CardTitle>
                            {!isEditingGeneratedPlan && (
                                <CardDescription>
                                    {generatedPlan.duration_days && generatedPlan.target_role ?
                                      `A ${generatedPlan.duration_days}-day plan for a ${generatedPlan.target_role}.` :
                                      'Customize your onboarding plan'
                                    }
                                </CardDescription>
                            )}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                           {isEditingGeneratedPlan ? (
                             <Button
                               size="sm"
                               variant="outline"
                               onClick={() => setIsEditingGeneratedPlan(false)}
                             >
                               <X className="h-4 w-4 mr-2" /> Cancel Edit
                             </Button>
                           ) : (
                             <>
                               <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setIsEditingGeneratedPlan(true)}
                               >
                                  <Edit2 className="h-4 w-4 mr-2"/> Edit Details
                               </Button>
                               <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSaveAsDraft(generatedPlan)}
                                  disabled={isSaving}
                                >
                                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4 mr-2"/>}
                                  {generatedPlan.id ? 'Save Changes' : 'Save as Draft'}
                               </Button>
                               <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowSaveAsTemplate(true)}
                                  disabled={!generatedPlan.milestones || generatedPlan.milestones.length === 0}
                               >
                                  <Bookmark className="h-4 w-4 mr-2"/> Save as Template
                               </Button>
                               <Button
                                  size="sm"
                                  onClick={() => handleOpenDeployModal(generatedPlan)}
                                  disabled={isSaving}
                               >
                                  <Send className="h-4 w-4 mr-2"/> Deploy Plan
                               </Button>
                             </>
                           )}
                        </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isEditingGeneratedPlan ? (
                      <PlanEditor
                        plan={generatedPlan}
                        learningResources={allLearningResources}
                        loadingResources={loadingResources}
                        onSave={(updatedData) => {
                          const updatedPlan = { ...generatedPlan, ...updatedData };
                          setGeneratedPlan(updatedPlan);
                          handleSaveAsDraft(updatedPlan);
                          setIsEditingGeneratedPlan(false);
                        }}
                        onCancel={() => setIsEditingGeneratedPlan(false)}
                      />
                    ) : (
                      <PlanDisplay plan={generatedPlan} learningResources={allLearningResources} />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="lg:col-span-1">
          <Card className="border-0 shadow-lg sticky top-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Library className="h-5 w-5 text-purple-600"/>
                Onboarding Plan Library
              </CardTitle>
              <CardDescription>View, edit, or deploy existing plans.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh]">
                <div className="space-y-3 pr-4">
                  {savedPlans.filter(p => !p.is_template).length > 0 ? savedPlans.filter(p => !p.is_template).map(plan => (
                    <div key={plan.id} className="p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-sm">{plan.title}</h4>
                          <p className="text-xs text-gray-500">{plan.target_role} - {plan.duration_days} days</p>
                        </div>
                        <Badge
                          className={
                            plan.status === 'completed' ? 'bg-green-100 text-green-800' :
                            plan.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            plan.status === 'assigned' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }
                        >
                          {plan.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                         <Button size="sm" variant="outline" onClick={() => handleEditPlan(plan)}>
                            <Edit2 className="h-4 w-4 mr-1.5"/> Edit
                         </Button>
                         <Button size="sm" onClick={() => handleOpenDeployModal(plan)}>
                            <Send className="h-4 w-4 mr-1.5"/> Deploy
                         </Button>
                         <Button size="sm" variant="destructive" onClick={() => handleDeletePlan(plan.id)}>
                            <Trash2 className="h-4 w-4"/>
                         </Button>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No saved plans yet.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isDeploying} onOpenChange={setIsDeploying}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Deploy Onboarding Plan</DialogTitle>
                  <DialogDescription>
                      Assign "{selectedPlanForDeploy?.title}" to a user. They will receive an email notification.
                  </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                  <p className="font-medium text-gray-700">Select User *</p>
                  <Select onValueChange={(value) => setSelectedUser(allUsers.find(u => u.id === value))}>
                      <SelectTrigger>
                          <SelectValue placeholder="Select a user to assign the plan to" />
                      </SelectTrigger>
                      <SelectContent>
                          {allUsers.map(userItem => (
                              <SelectItem key={userItem.id} value={userItem.id}>
                                  {userItem.full_name} ({userItem.email})
                              </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                  {selectedUser && (
                    <div className="text-sm text-gray-600 mt-2">
                      Selected: <span className="font-semibold">{selectedUser.full_name}</span> ({selectedUser.email})
                    </div>
                  )}
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsDeploying(false); setSelectedUser(null); }}>Cancel</Button>
                  <Button onClick={handleDeployPlan} disabled={isSaving || !selectedUser}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
                    Deploy Plan
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <TemplateBrowser
        isOpen={showTemplateBrowser}
        onClose={() => setShowTemplateBrowser(false)}
        onSelectTemplate={createFromTemplate}
      />

      <SaveAsTemplateModal
        isOpen={showSaveAsTemplate}
        onClose={() => setShowSaveAsTemplate(false)}
        plan={generatedPlan}
        onSuccess={(template) => {
          fetchSavedPlans();
          toast.success(`Template "${template.title}" created successfully! You can now reuse it for future hires.`);
          setShowSaveAsTemplate(false);
        }}
      />
    </div>
  );
}

function PlanDisplay({ plan, learningResources }) {
  if (!plan) return <div className="text-center py-12 text-gray-500">No plan selected or generated.</div>;

  const getResourceById = (resourceId) => {
    return learningResources.find(r => r.id === resourceId);
  };

  return (
    <ScrollArea className="h-[600px] p-4">
      <div className="space-y-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.title}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {plan.duration_days} days
            </span>
            {plan.assigned_to_email && (
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {plan.assigned_to_email}
              </span>
            )}
            {plan.ai_generated && (
              <Badge className="bg-purple-100 text-purple-800">
                <Sparkles className="w-3 h-3 mr-1" />
                AI Generated
              </Badge>
            )}
          </div>
        </div>

        {plan.description && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Description</h4>
            <p className="text-gray-700">{plan.description}</p>
          </div>
        )}

        {plan.target_role && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Target Role</h4>
            <p className="text-gray-700">{plan.target_role}</p>
          </div>
        )}

        {plan.context && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Generation Context</h4>
            <div className="bg-slate-50 p-3 rounded-lg">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans">{plan.context}</pre>
            </div>
          </div>
        )}

        {plan.milestones && plan.milestones.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Milestones</h4>
            <div className="space-y-3">
              {plan.milestones.map((milestone, idx) => (
                <div key={idx} className="p-4 border rounded-lg bg-white">
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="font-medium text-gray-900">{milestone.title}</h5>
                    <Badge
                      className={
                        milestone.status === 'completed' ? 'bg-green-100 text-green-800' :
                        milestone.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }
                    >
                      {milestone.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {milestone.status === 'in_progress' && <Clock className="w-3 h-3 mr-1" />}
                      {milestone.status || 'not_started'}
                    </Badge>
                  </div>
                  {milestone.description && (
                    <p className="text-sm text-gray-600 mb-2">{milestone.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mb-2">Due: Day {milestone.due_day}</p>

                  {milestone.resources && milestone.resources.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        Learning Resources ({milestone.resources.length})
                      </p>
                      <div className="space-y-1">
                        {milestone.resources.map((resourceId, ridx) => {
                          const resource = getResourceById(resourceId);
                          if (!resource) return null;
                          return (
                            <div key={ridx} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded flex items-center justify-between">
                              <span className="truncate">{resource.title}</span>
                              {resource.url && (
                                <ExternalLink className="w-3 h-3 ml-1 flex-shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function PlanEditor({ plan, learningResources, loadingResources, onSave, onCancel }) {
  const [formData, setFormData] = useState(plan || {
    title: "",
    target_role: "",
    duration_days: 90,
    description: "",
    context: "",
    milestones: []
  });

  const [resourceSearchDialogOpen, setResourceSearchDialogOpen] = useState(false);
  const [currentMilestoneIndex, setCurrentMilestoneIndex] = useState(null);
  const [resourceSearchTerm, setResourceSearchTerm] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleMilestoneChange = (index, field, value) => {
    const updatedMilestones = [...formData.milestones];
    updatedMilestones[index] = { ...updatedMilestones[index], [field]: value };
    setFormData({ ...formData, milestones: updatedMilestones });
  };

  const addMilestone = () => {
    setFormData({
      ...formData,
      milestones: [...formData.milestones, { title: "", description: "", due_day: 0, status: "not_started", resources: [] }]
    });
  };

  const removeMilestone = (index) => {
    const updatedMilestones = formData.milestones.filter((_, i) => i !== index);
    setFormData({ ...formData, milestones: updatedMilestones });
  };

  const openResourceDialog = (milestoneIndex) => {
    setCurrentMilestoneIndex(milestoneIndex);
    setResourceSearchDialogOpen(true);
    setResourceSearchTerm("");
  };

  const addResourceToMilestone = (resourceId) => {
    if (currentMilestoneIndex === null) return;

    const updatedMilestones = [...formData.milestones];
    const currentResources = updatedMilestones[currentMilestoneIndex].resources || [];

    if (!currentResources.includes(resourceId)) {
      updatedMilestones[currentMilestoneIndex] = {
        ...updatedMilestones[currentMilestoneIndex],
        resources: [...currentResources, resourceId]
      };
      setFormData({ ...formData, milestones: updatedMilestones });
      toast.success("Learning resource added to milestone");
    } else {
      toast.info("Resource already added to this milestone");
    }
  };

  const removeResourceFromMilestone = (milestoneIndex, resourceId) => {
    const updatedMilestones = [...formData.milestones];
    updatedMilestones[milestoneIndex] = {
      ...updatedMilestones[milestoneIndex],
      resources: (updatedMilestones[milestoneIndex].resources || []).filter(id => id !== resourceId)
    };
    setFormData({ ...formData, milestones: updatedMilestones });
  };

  const getResourceById = (resourceId) => {
    return learningResources.find(r => r.id === resourceId);
  };

  const filteredResources = learningResources.filter(resource =>
    resource.title.toLowerCase().includes(resourceSearchTerm.toLowerCase()) ||
    resource.description?.toLowerCase().includes(resourceSearchTerm.toLowerCase())
  );

  return (
    <>
      <ScrollArea className="h-[600px] p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plan Title *
            </label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="e.g., First-Time Manager Onboarding"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <Textarea
              value={formData.description || ""}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="A brief overview of the plan."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Role *
            </label>
            <Input
              value={formData.target_role || ""}
              onChange={(e) => setFormData({...formData, target_role: e.target.value})}
              placeholder="e.g., Engineering Manager"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Description / Role Responsibilities *
            </label>
            <Textarea
              value={formData.context || ""}
              onChange={(e) => setFormData({...formData, context: e.target.value})}
              placeholder="Paste the job description or key responsibilities here..."
              rows={5}
              className="resize-y"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 This helps create more relevant and personalized onboarding milestones.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (days) *
            </label>
            <Input
              type="number"
              value={formData.duration_days}
              onChange={(e) => setFormData({...formData, duration_days: parseInt(e.target.value)})}
              min="1"
              required
            />
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3 mt-6">Milestones</h4>
            <div className="space-y-4">
              {formData.milestones.map((milestone, idx) => (
                <div key={idx} className="p-4 border rounded-lg bg-white relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMilestone(idx)}
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
                      <Input
                        value={milestone.title}
                        onChange={(e) => handleMilestoneChange(idx, 'title', e.target.value)}
                        placeholder="Milestone Title"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                      <Textarea
                        value={milestone.description || ""}
                        onChange={(e) => handleMilestoneChange(idx, 'description', e.target.value)}
                        placeholder="Detailed description of the milestone"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Due Day *</label>
                      <Input
                        type="number"
                        value={milestone.due_day}
                        onChange={(e) => handleMilestoneChange(idx, 'due_day', parseInt(e.target.value))}
                        min="1"
                        required
                      />
                    </div>

                    <div className="pt-2 border-t">
                      <label className="block text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        Learning Resources
                      </label>
                      {milestone.resources && milestone.resources.length > 0 && (
                        <div className="space-y-1 mb-2">
                          {milestone.resources.map((resourceId, ridx) => {
                            const resource = getResourceById(resourceId);
                            if (!resource) return null;
                            return (
                              <div key={ridx} className="flex items-center justify-between bg-blue-50 px-2 py-1 rounded">
                                <span className="text-xs text-blue-700 truncate">{resource.title}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeResourceFromMilestone(idx, resourceId)}
                                  className="h-5 w-5 p-0 text-red-500 hover:text-red-700"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openResourceDialog(idx)}
                        className="w-full"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Learning Resource
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" onClick={addMilestone} variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" /> Add Milestone
              </Button>
            </div>
          </div>

          <div className="flex gap-3 pt-6">
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              Save Plan Details
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </ScrollArea>

      <Dialog open={resourceSearchDialogOpen} onOpenChange={setResourceSearchDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Add Learning Resources</DialogTitle>
            <DialogDescription>
              Search and select learning resources to add to this milestone
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="Search learning resources..."
              value={resourceSearchTerm}
              onChange={(e) => setResourceSearchTerm(e.target.value)}
              className="w-full"
            />

            <ScrollArea className="h-[400px]">
              {loadingResources ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                </div>
              ) : filteredResources.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p>No learning resources found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredResources.map(resource => (
                    <div
                      key={resource.id}
                      className="p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => addResourceToMilestone(resource.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{resource.title}</h4>
                          {resource.description && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{resource.description}</p>
                          )}
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">{resource.type}</Badge>
                            {resource.provider && (
                              <Badge variant="outline" className="text-xs">{resource.provider}</Badge>
                            )}
                          </div>
                        </div>
                        <Plus className="w-5 h-5 text-blue-600 ml-2 flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResourceSearchDialogOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default OnboardingPlanBuilder;