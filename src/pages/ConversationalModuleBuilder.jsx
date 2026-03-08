import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Plus, Save, Trash2, ArrowLeft, Play, GripVertical } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import MultiSelectFilter from "../components/learning/MultiSelectFilter";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function ConversationalModuleBuilder() {
  const { user } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const moduleId = searchParams.get("moduleId");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [module, setModule] = useState({
    title: "",
    description: "",
    status: "draft",
    competencies: [],
    leadership_level: "",
    estimated_duration_minutes: 30,
    conversation_structure: [],
    prerequisite_resource_ids: [],
    prerequisite_module_ids: [],
    related_resource_ids: []
  });

  const [competencyOptions, setCompetencyOptions] = useState([]);
  const [resources, setResources] = useState([]);

  const levelOptions = [
    { value: "Individual Contributor to First-Time Manager (entry-level leaders, frontline managers, new supervisors)", label: "Entry-Level Leaders" },
    { value: "Mid-Level Manager (managers of managers, experienced team leads, functional leads)", label: "Mid-Level Managers" },
    { value: "Senior Manager / Business Unit Leader (leads larger teams, cross-functional groups, or business units)", label: "Senior Managers" },
    { value: "Director / Senior Director (enterprise-level strategic oversight, multiple functions, major initiatives)", label: "Directors" },
    { value: "Executive / C-Suite (enterprise leadership, board-level strategy, organizational transformation)", label: "Executives" }
  ];

  const stepTypes = [
    { value: "intro", label: "Introduction" },
    { value: "question", label: "Question" },
    { value: "scenario", label: "Scenario" },
    { value: "reflection", label: "Reflection" },
    { value: "knowledge_check", label: "Knowledge Check" },
    { value: "summary", label: "Summary" }
  ];

  useEffect(() => {
    loadData();
  }, [moduleId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [competenciesData, resourcesData] = await Promise.all([
        base44.entities.Competency.list(),
        base44.entities.LearningResource.filter({ is_active: true })
      ]);

      const compOptions = competenciesData.map(c => ({ value: c.name, label: c.name }));
      setCompetencyOptions(compOptions);
      setResources(resourcesData);

      if (moduleId) {
        const modules = await base44.entities.ConversationalLearningModule.filter({ id: moduleId });
        if (modules.length > 0) {
          setModule(modules[0]);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const addStep = () => {
    const newStep = {
      step_id: `step_${Date.now()}`,
      step_type: "question",
      content: "",
      learning_objective: "",
      coaching_notes: "",
      required_topics: [],
      success_criteria: ""
    };
    setModule({ ...module, conversation_structure: [...module.conversation_structure, newStep] });
  };

  const updateStep = (index, field, value) => {
    const updated = [...module.conversation_structure];
    updated[index] = { ...updated[index], [field]: value };
    setModule({ ...module, conversation_structure: updated });
  };

  const removeStep = (index) => {
    const updated = module.conversation_structure.filter((_, i) => i !== index);
    setModule({ ...module, conversation_structure: updated });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(module.conversation_structure);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setModule({ ...module, conversation_structure: items });
  };

  const handleSave = async () => {
    if (!module.title || !module.leadership_level || module.competencies.length === 0) {
      toast.error("Please fill in title, leadership level, and at least one competency");
      return;
    }

    setSaving(true);
    try {
      if (moduleId) {
        await base44.entities.ConversationalLearningModule.update(moduleId, module);
        toast.success("Module updated successfully");
      } else {
        await base44.entities.ConversationalLearningModule.create(module);
        toast.success("Module created successfully");
        window.location.href = createPageUrl("Development");
      }
    } catch (error) {
      console.error("Error saving module:", error);
      toast.error("Failed to save module");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading module builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Development")}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Conversational Learning Module Builder</h1>
              <p className="text-gray-600">Create AI-guided learning experiences with Atreus</p>
            </div>
          </div>
          <div className="flex gap-2">
            {module.status === "published" && (
              <Link to={`${createPageUrl("ConversationalModule")}?moduleId=${moduleId}`}>
                <Button variant="outline">
                  <Play className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              </Link>
            )}
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Module"}
            </Button>
          </div>
        </div>

        {/* Module Settings */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader>
            <CardTitle>Module Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Title</label>
              <Input
                value={module.title}
                onChange={(e) => setModule({ ...module, title: e.target.value })}
                placeholder="e.g., Managing Difficult Conversations"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={module.description}
                onChange={(e) => setModule({ ...module, description: e.target.value })}
                placeholder="Describe what learners will gain from this module"
                rows={3}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Leadership Level</label>
                <Select value={module.leadership_level} onValueChange={(val) => setModule({ ...module, leadership_level: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {levelOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Estimated Duration (minutes)</label>
                <Input
                  type="number"
                  value={module.estimated_duration_minutes}
                  onChange={(e) => setModule({ ...module, estimated_duration_minutes: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Competencies</label>
              <MultiSelectFilter
                title="Select Competencies"
                options={competencyOptions}
                selectedValues={module.competencies}
                onSelectionChange={(vals) => setModule({ ...module, competencies: vals })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={module.status} onValueChange={(val) => setModule({ ...module, status: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Conversation Structure */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Conversation Flow
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">Design the conversation steps with Atreus</p>
              </div>
              <Button onClick={addStep} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Step
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {module.conversation_structure.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No conversation steps yet</p>
                <Button onClick={addStep}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Step
                </Button>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="steps">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                      {module.conversation_structure.map((step, index) => (
                        <Draggable key={step.step_id} draggableId={step.step_id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="bg-white border border-gray-200 rounded-lg p-4"
                            >
                              <div className="flex items-start gap-3">
                                <div {...provided.dragHandleProps} className="mt-2 cursor-move">
                                  <GripVertical className="w-5 h-5 text-gray-400" />
                                </div>
                                <div className="flex-1 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <Badge variant="outline">Step {index + 1}</Badge>
                                    <Button variant="ghost" size="sm" onClick={() => removeStep(index)}>
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </Button>
                                  </div>

                                  <Select value={step.step_type} onValueChange={(val) => updateStep(index, "step_type", val)}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {stepTypes.map(type => (
                                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  <Textarea
                                    placeholder="Atreus' message or prompt to the learner"
                                    value={step.content}
                                    onChange={(e) => updateStep(index, "content", e.target.value)}
                                    rows={3}
                                  />

                                  <Input
                                    placeholder="Learning objective for this step"
                                    value={step.learning_objective}
                                    onChange={(e) => updateStep(index, "learning_objective", e.target.value)}
                                  />

                                  <Textarea
                                    placeholder="Coaching notes: How should Atreus respond and guide?"
                                    value={step.coaching_notes}
                                    onChange={(e) => updateStep(index, "coaching_notes", e.target.value)}
                                    rows={2}
                                  />
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
      </div>
    </div>
  );
}