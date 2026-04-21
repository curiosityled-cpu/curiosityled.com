import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Map,
  Plus,
  Trash2,
  Save,
  Send,
  Edit2,
  GripVertical,
  BookOpen,
  Users,
  Upload,
  X,
  Loader2,
  ArrowLeft,
  Route,
  List,
  Bookmark,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import LearningResourceSelector from "../components/journey/LearningResourceSelector";
import FormAssistant from "@/components/ai/FormAssistant";
import { Slider } from "@/components/ui/slider";
import JourneyTemplateBrowser from "../components/journey/JourneyTemplateBrowser";
import SaveJourneyAsTemplateModal from "../components/journey/SaveJourneyAsTemplateModal";
import PlanSuggestionsPanel from "../components/ai/PlanSuggestionsPanel";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import Breadcrumbs from "@/components/common/Breadcrumbs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

function JourneyBuilder() {
  const { user, loading: authLoading } = useAuth();
  
  const [journey, setJourney] = useState({
    title: "",
    description: "",
    type: "curriculum",
    content_structure: [],
    estimated_duration_days: 30,
    target_audiences: [],
    status: "draft",
    tags: []
  });

  const [showResourceSelector, setShowResourceSelector] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTemplateBrowser, setShowTemplateBrowser] = useState(false);
  const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false);
  const [savedJourneys, setSavedJourneys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingJourneyId, setEditingJourneyId] = useState(null);

  // Assignment states
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedCohorts, setSelectedCohorts] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allCohorts, setAllCohorts] = useState([]);
  const [recommendedResources, setRecommendedResources] = useState([]);
  const [csvFile, setCsvFile] = useState(null);

  useEffect(() => {
    if (!authLoading && user) {
      loadData();
      // Check for assessment recommendations from URL params
      const params = new URLSearchParams(window.location.search);
      if (params.has('recommendedResources')) {
        try {
          const recommended = JSON.parse(decodeURIComponent(params.get('recommendedResources')));
          setRecommendedResources(recommended);
        } catch (e) {
          console.error('Error parsing recommended resources:', e);
        }
      }
    } else if (!authLoading && !user) {
      // If authLoading is false and user is null, it means no user is logged in.
      // Set loading to false so the "Please log in" message can be displayed.
      setLoading(false);
    }
  }, [authLoading, user]);

  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [journeys, users, cohorts] = await Promise.all([
        base44.entities.LearningJourney.list('-updated_date'),
        base44.entities.User.list(),
        base44.entities.Cohort.list()
      ]);
      
      setSavedJourneys(journeys || []);
      setAllUsers(users || []);
      setAllCohorts(cohorts || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const createFromTemplate = (template) => {
    const newJourney = {
      ...template,
      id: null, // Clear existing ID to create a new one
      title: template.title.replace(' Template', ''), // Remove " Template" suffix if present
      is_template: false,
      status: 'draft',
      assigned_to_emails: [],
      assigned_to_cohort_ids: [],
      author_email: user.email,
      last_modified_by: user.email,
      // Remove template-specific fields that aren't relevant for a new journey
      use_count: undefined,
      last_used_date: undefined,
      template_category: undefined,
      template_tags: undefined
    };
    setJourney(newJourney);
    setEditingJourneyId(null); // Ensure we're creating a new journey, not editing an old one
    toast.success("Experience created from template - customize as needed!");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleApplyAlternativeStructure = (structure) => {
    if (!structure.milestones) {
      toast.error("Invalid structure for application. Missing 'milestones'.");
      return;
    }
    
    // For now, this is a placeholder. A full implementation would map
    // the AI-suggested milestones and resources to the journey's content_structure.
    // This might involve creating new learning resources based on suggestions
    // or linking to existing ones.
    toast.info("Alternative structure suggestions are for reference. Please manually adjust your content based on the recommendations.");

    // Example of how you might start to implement this if you had a way to
    // automatically map suggested resources or create new ones:
    // const newContentStructure = structure.milestones.flatMap(milestone => 
    //   milestone.resources.map(resource => ({
    //     learning_resource_id: 'auto-generated-id-' + Math.random().toString(36).substr(2, 9), // Placeholder
    //     order: 0, // Will be re-ordered
    //     is_optional: false,
    //     title: resource.title,
    //     type: resource.type || 'unknown'
    //   }))
    // );

    // setJourney(prevJourney => ({
    //   ...prevJourney,
    //   content_structure: newContentStructure.map((item, index) => ({
    //     ...item,
    //     order: index + 1
    //   }))
    // }));
  };

  const handleResourceSelect = async (resource) => {
    const exists = journey.content_structure.some(
      item => item.learning_resource_id === resource.id
    );

    if (exists) {
      // Remove if already selected
      setJourney({
        ...journey,
        content_structure: journey.content_structure.filter(
          item => item.learning_resource_id !== resource.id
        )
      });
      toast.info('Resource removed');
    } else {
      // Add new resource with advanced gating options
      const newItem = {
        learning_resource_id: resource.id,
        order: journey.content_structure.length + 1,
        is_optional: false,
        title: resource.title,
        type: resource.type,
        unlock_after_days: 0,
        required_score_percentage: 0,
        unlock_condition: "immediate" // immediate, time_based, score_based, sequential
      };
      
      setJourney({
        ...journey,
        content_structure: [...journey.content_structure, newItem]
      });
      toast.success('Resource added');
    }
  };

  const updateResourceGating = (resourceId, field, value) => {
    setJourney({
      ...journey,
      content_structure: journey.content_structure.map(item =>
        item.learning_resource_id === resourceId
          ? { ...item, [field]: value }
          : item
      )
    });
  };

  const handleDragEnd = (result) => {
    if (!result.destination || journey.type !== 'learning_path') return;

    const items = Array.from(journey.content_structure);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order numbers
    const reordered = items.map((item, index) => ({
      ...item,
      order: index + 1
    }));

    setJourney({ ...journey, content_structure: reordered });
  };

  const handleRemoveResource = (resourceId) => {
    setJourney({
      ...journey,
      content_structure: journey.content_structure.filter(
        item => item.learning_resource_id !== resourceId
      )
    });
  };

  const handleToggleOptional = (resourceId) => {
    setJourney({
      ...journey,
      content_structure: journey.content_structure.map(item =>
        item.learning_resource_id === resourceId
          ? { ...item, is_optional: !item.is_optional }
          : item
      )
    });
  };

  const handleSaveDraft = async () => {
    if (!journey.title) {
      toast.error('Please enter an experience title');
      return;
    }

    if (journey.content_structure.length === 0) {
      toast.error('Please add at least one learning resource');
      return;
    }

    setSaving(true);
    try {
      const journeyData = {
        ...journey,
        author_email: user.email,
        client_id: user.client_id,
        partner_id: user.partner_id,
        last_modified_by: user.email,
        status: 'draft',
        is_template: false // Ensure it's not saved as a template
      };

      if (editingJourneyId) {
        await base44.entities.LearningJourney.update(editingJourneyId, journeyData);
        toast.success('Experience updated successfully');
      } else {
        const newJourney = await base44.entities.LearningJourney.create(journeyData);
        setEditingJourneyId(newJourney.id);
        toast.success('Experience saved as draft');
      }

      await loadData();
    } catch (error) {
      console.error('Error saving journey:', error);
      toast.error('Failed to save experience: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublishAndAssign = async () => {
    if (!journey.title) {
      toast.error('Please enter an experience title');
      return;
    }

    if (journey.content_structure.length === 0) {
      toast.error('Please add at least one learning resource');
      return;
    }
    
    // First, save the current journey state
    setSaving(true);
    try {
      let currentJourneyId = editingJourneyId;
      if (!currentJourneyId) {
        // If not already saved, save it as a draft first
        const journeyData = {
          ...journey,
          author_email: user.email,
          client_id: user.client_id,
          partner_id: user.partner_id,
          last_modified_by: user.email,
          status: 'draft',
          is_template: false
        };
        const newJourney = await base44.entities.LearningJourney.create(journeyData);
        currentJourneyId = newJourney.id;
        setEditingJourneyId(currentJourneyId); // Update state with new ID
        toast.success('Experience saved as draft before assignment');
      }

      // If we have a journey ID, proceed to assignment
      if (currentJourneyId) {
        setShowAssignModal(true);
      } else {
        toast.error('Failed to prepare experience for assignment.');
      }
    } catch (error) {
      console.error('Error preparing journey for assignment:', error);
      toast.error('Failed to prepare experience for assignment: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async () => {
    if (selectedUsers.length === 0 && selectedCohorts.length === 0 && !csvFile) {
      toast.error('Please select users, cohorts, or upload a CSV file');
      return;
    }

    if (!editingJourneyId) {
      toast.error('Experience must be saved before it can be assigned.');
      return;
    }

    setSaving(true);
    try {
      let userEmails = [...selectedUsers.map(u => u.email)]; // Start with selected users

      // Handle CSV upload
      if (csvFile) {
        // Here, integrate with base44 functions for CSV parsing
        // This is a simplified example, in a real app you'd call an API route
        // that handles the file upload and parsing securely.
        // For now, let's mock it or assume a client-side parsing.
        // For production, you'd likely use base44.functions.invoke or similar
        // with a robust server-side CSV parsing function.
        
        // This part needs a real API integration or more complex client-side parsing
        // for `base44.integrations.invoke('Core', 'UploadFile', ...)`
        // For demonstration, let's assume `csvEmails` are obtained somehow.
        try {
          const reader = new FileReader();
          const csvPromise = new Promise((resolve, reject) => {
            reader.onload = (event) => {
              const text = event.target.result;
              const lines = text.split('\n').filter(line => line.trim() !== '');
              if (lines.length > 0) {
                const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                const emailIndex = headers.indexOf('email');
                if (emailIndex === -1) {
                  reject(new Error('CSV must contain an "email" column.'));
                  return;
                }
                const parsedEmails = lines.slice(1)
                  .map(line => line.split(',')[emailIndex]?.trim())
                  .filter(email => email && email.includes('@')); // Basic email validation
                resolve(parsedEmails);
              } else {
                resolve([]);
              }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsText(csvFile);
          });
          const csvEmails = await csvPromise;
          userEmails = [...new Set([...userEmails, ...csvEmails])]; // Combine and deduplicate
        } catch (csvError) {
          toast.error('Failed to process CSV file: ' + csvError.message);
          setSaving(false);
          return;
        }
      }

      // Add users from selected cohorts
      for (const cohort of selectedCohorts) {
        if (cohort.participant_emails && Array.isArray(cohort.participant_emails)) {
          userEmails = [...new Set([...userEmails, ...cohort.participant_emails])];
        }
      }

      if (userEmails.length === 0) {
        toast.error('No valid users or cohort participants found for assignment.');
        setSaving(false);
        return;
      }

      // Update journey with assignments
      const updateData = {
        status: 'published',
        assigned_to_emails: userEmails, // This should be the final list of emails
        assigned_to_cohort_ids: selectedCohorts.map(c => c.id),
        last_modified_by: user.email
      };

      await base44.entities.LearningJourney.update(editingJourneyId, updateData);

      // Create enrollments for each user
      const enrollmentPromises = userEmails.map(async (email) => {
        // Check if enrollment already exists to prevent duplicates on re-assignment
        const existingEnrollments = await base44.entities.JourneyEnrollment.list({
          filters: [
            { field: 'journey_id', operator: 'eq', value: editingJourneyId },
            { field: 'user_email', operator: 'eq', value: email }
          ]
        });

        if (existingEnrollments && existingEnrollments.length > 0) {
          // If already enrolled, maybe update status or skip
          // For now, we'll just skip creating a new one
          console.log(`User ${email} already enrolled in journey ${editingJourneyId}. Skipping new enrollment.`);
          return null; // Skip creation
        }

        return base44.entities.JourneyEnrollment.create({
          journey_id: editingJourneyId,
          user_email: email,
          enrolled_by: user.email,
          enrolled_date: new Date().toISOString(),
          status: 'not_started',
          completion_percentage: 0,
          content_progress: journey.content_structure.map(item => ({
            learning_resource_id: item.learning_resource_id,
            status: 'not_started'
          }))
        });
      });
      await Promise.all(enrollmentPromises.filter(Boolean)); // Await only non-null promises

      // Create notifications for each assigned user
      const notificationPromises = userEmails.map(email => 
        base44.functions.invoke('createNotification', {
          user_email: email,
          type: 'learning_assigned',
          title: 'New Learning Experience Assigned',
          message: `You have been assigned to: ${journey.title}`,
          priority: 'medium',
          related_entity_type: 'LearningJourney',
          related_entity_id: editingJourneyId,
          action_url: `/MyJourneys?journeyId=${editingJourneyId}`
        })
      );
      await Promise.all(notificationPromises);

      toast.success(`Experience published and assigned to ${userEmails.length} users`);
      setShowAssignModal(false);
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Error assigning journey:', error);
      toast.error('Failed to assign experience: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditJourney = async (journeyToEdit) => {
    setJourney({
      title: journeyToEdit.title,
      description: journeyToEdit.description || "",
      type: journeyToEdit.type,
      content_structure: journeyToEdit.content_structure || [],
      estimated_duration_days: journeyToEdit.estimated_duration_days || 30,
      target_audiences: journeyToEdit.target_audiences || [],
      status: journeyToEdit.status,
      tags: journeyToEdit.tags || []
    });
    setEditingJourneyId(journeyToEdit.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteJourney = async (journeyId) => {
    if (!confirm('Are you sure you want to delete this experience? This action cannot be undone.')) {
      return;
    }

    try {
      await base44.entities.LearningJourney.delete(journeyId);
      toast.success('Experience deleted successfully');
      await loadData();
      if (editingJourneyId === journeyId) {
        resetForm(); // Clear the form if the deleted journey was being edited
      }
    } catch (error) {
      console.error('Error deleting journey:', error);
      toast.error('Failed to delete experience');
    }
  };

  const resetForm = () => {
    setJourney({
      title: "",
      description: "",
      type: "curriculum",
      content_structure: [],
      estimated_duration_days: 30,
      target_audiences: [],
      status: "draft",
      tags: []
    });
    setEditingJourneyId(null);
    setSelectedUsers([]);
    setSelectedCohorts([]);
    setCsvFile(null);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading Experience Builder...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Access Denied</h2>
            <p className="text-gray-600">Please log in to access Experience Builder.</p>
            <p className="text-sm text-gray-500 mt-2">You will be redirected to the login page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Breadcrumbs */}
        <div className="mb-6">
          <Breadcrumbs items={[
            { label: 'Experience Management', href: createPageUrl("ExperienceManagement") + "#builders" },
            { label: 'Journey Builder' }
          ]} />
          <Link to={createPageUrl("ExperienceManagement") + "#builders"}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Builders
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Journey Builder</h1>
              <p className="text-gray-600">
                Create structured learning paths and curricula for development
              </p>
            </div>
            <Button
              onClick={() => setShowTemplateBrowser(true)}
              variant="outline"
              className="gap-2"
            >
              <Bookmark className="w-4 h-4" />
              Browse Templates
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Builder - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recommended Resources from Assessment */}
            {recommendedResources.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-3">
                  🎯 Recommended for You
                </h3>
                <p className="text-xs text-blue-700 mb-3">
                  Based on your assessment results, these resources may help address your growth areas.
                </p>
                <div className="space-y-2">
                  {recommendedResources.map((resource) => (
                    <button
                      key={resource.id}
                      onClick={() => handleResourceSelect(resource)}
                      className="w-full text-left p-3 rounded-lg bg-white border border-blue-100 hover:border-blue-300 hover:bg-blue-50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900">{resource.title}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{resource.provider}</p>
                        </div>
                        {journey.content_structure.some(item => item.learning_resource_id === resource.id) ? (
                          <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <Plus className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* AI Suggestions Panel */}
             {journey.content_structure.length > 0 && (
               <PlanSuggestionsPanel
                 plan={journey}
                 type="journey"
                 onApplySuggestion={handleApplyAlternativeStructure}
               />
             )}

            {/* AI Assistant */}
            {!editingJourneyId && (
              <FormAssistant
                formSchema={{
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    type: { type: "string", enum: ["curriculum", "learning_path"] },
                    estimated_duration_days: { type: "number" }
                  }
                }}
                onApply={(data) => setJourney(prev => ({ ...prev, ...data }))}
                formType="learning_journey"
                placeholder="Describe the learning experience you want to create, e.g., 'A 60-day leadership development path for new managers covering communication, delegation, and performance management'"
                compact={true}
              />
            )}

            {/* Basic Info */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Experience Details</CardTitle>
                <CardDescription>
                  Define the core information for your learning experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Experience Title *
                  </label>
                  <Input
                    placeholder="e.g., Leadership Excellence Program"
                    value={journey.title}
                    onChange={(e) => setJourney({ ...journey, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <Textarea
                    placeholder="Describe the purpose and goals of this journey..."
                    value={journey.description}
                    onChange={(e) => setJourney({ ...journey, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Experience Type *
                  </label>
                  <Select
                    value={journey.type}
                    onValueChange={(value) => setJourney({ ...journey, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="curriculum">
                        <div className="flex items-center gap-2">
                          <List className="w-4 h-4" />
                          <div>
                            <div className="font-medium">Curriculum</div>
                            <div className="text-xs text-gray-500">Complete in any order</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="learning_path">
                        <div className="flex items-center gap-2">
                          <Route className="w-4 h-4" />
                          <div>
                            <div className="font-medium">Learning Path</div>
                            <div className="text-xs text-gray-500">Follow specific sequence</div>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Duration (days)
                  </label>
                  <Input
                    type="number"
                    value={journey.estimated_duration_days}
                    onChange={(e) => setJourney({ ...journey, estimated_duration_days: parseInt(e.target.value) })}
                    min="1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Content Structure */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Learning Content</CardTitle>
                    <CardDescription>
                      {journey.type === 'learning_path' 
                        ? 'Add and arrange resources in the required sequence'
                        : 'Add resources that learners can complete in any order'
                      }
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => setShowResourceSelector(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Resources
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {journey.content_structure.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 mb-4">No resources added yet</p>
                    <Button
                      variant="outline"
                      onClick={() => setShowResourceSelector(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Resource
                    </Button>
                  </div>
                ) : (
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="resources">
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="space-y-3"
                        >
                          {journey.content_structure.map((item, index) => (
                            <Draggable
                              key={item.learning_resource_id}
                              draggableId={item.learning_resource_id}
                              index={index}
                              isDragDisabled={journey.type !== 'learning_path'}
                            >
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className="p-4 border rounded-lg bg-white hover:border-blue-300 transition-colors"
                                >
                                  <div className="flex items-start gap-3">
                                    {journey.type === 'learning_path' && (
                                      <div
                                        {...provided.dragHandleProps}
                                        className="mt-1 cursor-move"
                                      >
                                        <GripVertical className="w-5 h-5 text-gray-400" />
                                      </div>
                                    )}
                                    
                                    <div className="flex-1">
                                      <div className="flex items-start justify-between mb-2">
                                        <div>
                                          <h4 className="font-medium text-gray-900">
                                            {journey.type === 'learning_path' && (
                                              <span className="text-gray-500 mr-2">
                                                {index + 1}.
                                              </span>
                                            )}
                                            {item.title}
                                          </h4>
                                          {item.type && (
                                            <Badge variant="outline" className="text-xs mt-1">
                                              {item.type}
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            size="sm"
                                            variant={item.is_optional ? "default" : "outline"}
                                            onClick={() => handleToggleOptional(item.learning_resource_id)}
                                          >
                                            {item.is_optional ? 'Optional' : 'Required'}
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleRemoveResource(item.learning_resource_id)}
                                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                      
                                      {/* Advanced Gating Options */}
                                      <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
                                        <div>
                                          <label className="text-xs font-medium text-gray-700 mb-1 block">
                                            Unlock Condition
                                          </label>
                                          <Select
                                            value={item.unlock_condition || "immediate"}
                                            onValueChange={(v) => updateResourceGating(item.learning_resource_id, 'unlock_condition', v)}
                                          >
                                            <SelectTrigger className="h-8 text-xs">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="immediate">Immediate Access</SelectItem>
                                              <SelectItem value="time_based">Time-Based Unlock</SelectItem>
                                              <SelectItem value="score_based">Score Requirement</SelectItem>
                                              <SelectItem value="sequential">Complete Previous First</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>

                                        {item.unlock_condition === "time_based" && (
                                          <div>
                                            <label className="text-xs text-gray-600 mb-1 block">
                                              Unlock after {item.unlock_after_days || 0} days
                                            </label>
                                            <Slider
                                              value={[item.unlock_after_days || 0]}
                                              onValueChange={(v) => updateResourceGating(item.learning_resource_id, 'unlock_after_days', v[0])}
                                              max={90}
                                              step={1}
                                              className="w-full"
                                            />
                                          </div>
                                        )}

                                        {item.unlock_condition === "score_based" && (
                                          <div>
                                            <label className="text-xs text-gray-600 mb-1 block">
                                              Required score: {item.required_score_percentage || 0}%
                                            </label>
                                            <Slider
                                              value={[item.required_score_percentage || 0]}
                                              onValueChange={(v) => updateResourceGating(item.learning_resource_id, 'required_score_percentage', v[0])}
                                              max={100}
                                              step={5}
                                              className="w-full"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleSaveDraft}
                disabled={saving}
                variant="outline"
                className="flex-1"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Draft
              </Button>
              <Button
                onClick={() => setShowSaveAsTemplate(true)}
                disabled={!journey.title || journey.content_structure.length === 0}
                variant="outline"
                className="flex-1"
              >
                <Bookmark className="w-4 h-4 mr-2" />
                Save as Template
              </Button>
              <Button
                onClick={handlePublishAndAssign}
                disabled={saving || !journey.title || journey.content_structure.length === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Publish & Assign
              </Button>
            </div>
          </div>

          {/* Sidebar - Saved Journeys */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-lg sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="w-5 h-5 text-purple-600" />
                  My Experiences
                </CardTitle>
                <CardDescription>Your created learning experiences</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[60vh]">
                  <div className="space-y-3 pr-4">
                    {savedJourneys.filter(j => !j.is_template).length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">No experiences created yet</p>
                      </div>
                    ) : (
                      savedJourneys.filter(j => !j.is_template).map((savedJourney) => (
                        <div
                          key={savedJourney.id}
                          className="p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm line-clamp-1">
                                {savedJourney.title}
                              </h4>
                              <p className="text-xs text-gray-500 mt-1">
                                {savedJourney.content_structure?.length || 0} resources •{' '}
                                {savedJourney.type === 'curriculum' ? 'Curriculum' : 'Learning Path'}
                              </p>
                            </div>
                            <Badge
                              className={
                                savedJourney.status === 'published'
                                  ? 'bg-green-100 text-green-800'
                                  : savedJourney.status === 'draft'
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-red-100 text-red-800'
                              }
                            >
                              {savedJourney.status}
                            </Badge>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditJourney(savedJourney)}
                              className="flex-1"
                            >
                              <Edit2 className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteJourney(savedJourney.id)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Resource Selector Modal */}
      {showResourceSelector && (
        <LearningResourceSelector
          open={showResourceSelector}
          onClose={() => setShowResourceSelector(false)}
          onSelect={handleResourceSelect}
          selectedResourceIds={journey.content_structure.map(item => item.learning_resource_id)}
        />
      )}

      {/* Template Browser */}
      <JourneyTemplateBrowser
        isOpen={showTemplateBrowser}
        onClose={() => setShowTemplateBrowser(false)}
        onSelectTemplate={createFromTemplate}
      />

      {/* Save as Template Modal */}
      <SaveJourneyAsTemplateModal
        isOpen={showSaveAsTemplate}
        onClose={() => setShowSaveAsTemplate(false)}
        journey={journey}
        onSuccess={() => {
          loadData();
          toast.success('Template created! You can now reuse it for future learners.');
        }}
      />

      {/* Assignment Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Experience to Learners</DialogTitle>
            <DialogDescription>
              Choose who should be enrolled in this learning experience
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Individual Users */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Individual Users
              </label>
              <Select
                onValueChange={(value) => {
                  const user = allUsers.find(u => u.id === value);
                  if (user && !selectedUsers.find(u => u.id === user.id)) {
                    setSelectedUsers([...selectedUsers, user]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose users..." />
                </SelectTrigger>
                <SelectContent>
                  {allUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedUsers.map((user) => (
                    <Badge key={user.id} variant="secondary" className="pl-2 pr-1">
                      {user.full_name}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() => setSelectedUsers(selectedUsers.filter(u => u.id !== user.id))}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Cohorts */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Cohorts/Teams
              </label>
              <Select
                onValueChange={(value) => {
                  const cohort = allCohorts.find(c => c.id === value);
                  if (cohort && !selectedCohorts.find(c => c.id === cohort.id)) {
                    setSelectedCohorts([...selectedCohorts, cohort]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose cohorts..." />
                </SelectTrigger>
                <SelectContent>
                  {allCohorts.map((cohort) => (
                    <SelectItem key={cohort.id} value={cohort.id}>
                      {cohort.name} ({cohort.participant_emails?.length || 0} members)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCohorts.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedCohorts.map((cohort) => (
                    <Badge key={cohort.id} variant="secondary" className="pl-2 pr-1">
                      {cohort.name}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() => setSelectedCohorts(selectedCohorts.filter(c => c.id !== cohort.id))}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* CSV Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or Upload CSV File
              </label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  {csvFile ? (
                    <p className="text-sm text-gray-900">{csvFile.name}</p>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600">Click to upload CSV</p>
                      <p className="text-xs text-gray-500 mt-1">
                        File should contain an 'email' column
                      </p>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
                                )}
                                Assign Experience
                              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withAuthProtection(JourneyBuilder, [
  'User Level 2',
  'User Level 3',
  'Admin Level 1',
  'Admin Level 2',
  'Admin Level 3',
  'Super Administrator',
  'Partner Business Administrator',
  'Platform Admin'
]);