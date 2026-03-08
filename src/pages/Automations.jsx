import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/useAuth";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, Play, Pause, Trash2, Plus, Sparkles, AlertTriangle, 
  CheckCircle2, Clock, TrendingUp, Loader2, ChevronRight, Edit2
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import ManualAutomationEditor from "@/components/automations/ManualAutomationEditor";

export default function Automations() {
  const { user, loading, appRole, hasPermission } = useAuth();
  const [automations, setAutomations] = useState([]);
  const [loadingAutomations, setLoadingAutomations] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("");
  const [generatingLogic, setGeneratingLogic] = useState(false);
  const [generatedLogic, setGeneratedLogic] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [activeTab, setActiveTab] = useState("my-automations");
  const [executingAutomation, setExecutingAutomation] = useState(null);
  const [editingAutomation, setEditingAutomation] = useState(null);
  const [showManualEditor, setShowManualEditor] = useState(false);
  const [editMode, setEditMode] = useState("ai"); // "ai" or "manual"

  useEffect(() => {
    if (user) {
      loadAutomations();
      loadSuggestions();
    }
  }, [user]);

  const loadAutomations = async () => {
    setLoadingAutomations(true);
    try {
      const data = await base44.entities.Automation.list('-created_date');
      setAutomations(data || []);
    } catch (error) {
      console.error('Error loading automations:', error);
      toast.error('Failed to load automations');
    } finally {
      setLoadingAutomations(false);
    }
  };

  const loadSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const { data } = await base44.functions.invoke('suggestAutomationWorkflows', {
        user_role: appRole,
        context: 'Leadership development platform'
      });
      setSuggestions(data?.suggestions || []);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleGenerateLogic = async () => {
    if (!naturalLanguageInput.trim()) {
      toast.error('Please describe what you want to automate');
      return;
    }

    setGeneratingLogic(true);
    try {
      const { data } = await base44.functions.invoke('generateAutomationLogic', {
        natural_language_description: naturalLanguageInput,
        available_entities: ['Assessment', 'Goal', 'AssignedLearning', 'OnboardingPlan', 'User', 'Program', 'Cohort'],
        available_actions: ['update_entity', 'create_entity', 'send_notification', 'send_email', 'assign_learning', 'create_goal']
      });

      if (data?.automation_logic) {
        setGeneratedLogic(data.automation_logic);
        toast.success('Automation logic generated!');
      }
    } catch (error) {
      console.error('Error generating logic:', error);
      toast.error('Failed to generate automation logic');
    } finally {
      setGeneratingLogic(false);
    }
  };

  const handleCreateAutomation = async () => {
    if (!generatedLogic) return;

    try {
      // Check for conflicts
      const { data: conflictData } = await base44.functions.invoke('detectAutomationConflicts', {
        proposed_automation: {
          trigger_type: generatedLogic.trigger_type,
          trigger_config: generatedLogic.trigger_config,
          actions: generatedLogic.actions
        }
      });

      if (conflictData?.conflict_analysis?.conflict_level === 'critical') {
        toast.error('Critical conflict detected. Please review the warnings.');
        return;
      }

      if (editingAutomation) {
        // Update existing automation
        await base44.entities.Automation.update(editingAutomation.id, {
          name: generatedLogic.suggested_name || editingAutomation.name,
          description: generatedLogic.explanation || editingAutomation.description,
          natural_language_input: naturalLanguageInput,
          trigger_type: generatedLogic.trigger_type,
          trigger_config: generatedLogic.trigger_config || {},
          actions: generatedLogic.actions || [],
          ai_generated_logic: generatedLogic
        });
        toast.success('Automation updated successfully!');
      } else {
        // Create new automation
        await base44.entities.Automation.create({
          name: generatedLogic.suggested_name || 'New Automation',
          description: generatedLogic.explanation || '',
          natural_language_input: naturalLanguageInput,
          status: 'draft',
          trigger_type: generatedLogic.trigger_type,
          trigger_config: generatedLogic.trigger_config || {},
          actions: generatedLogic.actions || [],
          ai_generated_logic: generatedLogic,
          client_id: user.client_id
        });
        toast.success('Automation created successfully!');
      }

      setShowCreateDialog(false);
      setNaturalLanguageInput('');
      setGeneratedLogic(null);
      setEditingAutomation(null);
      loadAutomations();
    } catch (error) {
      console.error('Error saving automation:', error);
      toast.error('Failed to save automation');
    }
  };

  const handleManualSave = async (formData) => {
    try {
      if (editingAutomation) {
        await base44.entities.Automation.update(editingAutomation.id, formData);
        toast.success('Automation updated successfully!');
      } else {
        await base44.entities.Automation.create({
          ...formData,
          status: 'draft',
          client_id: user.client_id
        });
        toast.success('Automation created successfully!');
      }

      setShowManualEditor(false);
      setEditingAutomation(null);
      loadAutomations();
    } catch (error) {
      console.error('Error saving automation:', error);
      toast.error('Failed to save automation');
    }
  };

  const handleExecuteAutomation = async (automationId) => {
    setExecutingAutomation(automationId);
    try {
      const { data } = await base44.functions.invoke('executeAutomation', {
        automation_id: automationId
      });

      if (data?.success) {
        toast.success(`Automation executed successfully! ${data.execution_summary.successful}/${data.execution_summary.total_actions} actions completed.`);
      } else {
        toast.warning(`Automation partially completed. ${data.execution_summary.successful}/${data.execution_summary.total_actions} actions succeeded.`);
      }
      loadAutomations();
    } catch (error) {
      console.error('Error executing automation:', error);
      toast.error('Failed to execute automation');
    } finally {
      setExecutingAutomation(null);
    }
  };

  const handleToggleStatus = async (automation) => {
    try {
      const newStatus = automation.status === 'active' ? 'paused' : 'active';
      await base44.entities.Automation.update(automation.id, { status: newStatus });
      toast.success(`Automation ${newStatus === 'active' ? 'activated' : 'paused'}`);
      loadAutomations();
    } catch (error) {
      console.error('Error toggling automation status:', error);
      toast.error('Failed to update automation status');
    }
  };

  const handleDeleteAutomation = async (automationId) => {
    if (!confirm('Are you sure you want to delete this automation?')) return;

    try {
      await base44.entities.Automation.delete(automationId);
      toast.success('Automation deleted');
      loadAutomations();
    } catch (error) {
      console.error('Error deleting automation:', error);
      toast.error('Failed to delete automation');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'paused': return 'bg-yellow-100 text-yellow-700';
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'error': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Automations</h1>
            <p className="text-gray-600">Streamline your workflows with AI-powered automations</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={(open) => {
            setShowCreateDialog(open);
            if (!open) {
              setEditingAutomation(null);
              setNaturalLanguageInput('');
              setGeneratedLogic(null);
              setEditMode("ai");
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Automation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAutomation ? 'Edit Automation' : 'Create New Automation'}</DialogTitle>
              </DialogHeader>

              {/* Toggle between AI and Manual mode */}
              <Tabs value={editMode} onValueChange={setEditMode} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="ai">
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Assistant
                  </TabsTrigger>
                  <TabsTrigger value="manual">
                    <Edit2 className="w-4 h-4 mr-2" />
                    Manual Editor
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="ai" className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Describe what you want to automate
                  </label>
                  <Textarea
                    value={naturalLanguageInput}
                    onChange={(e) => setNaturalLanguageInput(e.target.value)}
                    placeholder="Example: When a user completes an assessment with a score below 70%, automatically assign them relevant learning resources and send them an encouraging email"
                    className="min-h-32"
                  />
                  <Button 
                    onClick={handleGenerateLogic}
                    disabled={generatingLogic || !naturalLanguageInput.trim()}
                    className="mt-3"
                  >
                    {generatingLogic ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Automation Logic
                      </>
                    )}
                  </Button>
                </div>

                {generatedLogic && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <Card className="border-2 border-blue-200 bg-blue-50">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-blue-600" />
                          AI-Generated Automation
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Name:</p>
                          <p className="text-gray-900">{generatedLogic.suggested_name}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium text-gray-700">Explanation:</p>
                          <p className="text-sm text-gray-600">{generatedLogic.explanation}</p>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-gray-700">Trigger:</p>
                          <Badge className="bg-purple-100 text-purple-700">{generatedLogic.trigger_type}</Badge>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Actions ({generatedLogic.actions?.length || 0}):</p>
                          <div className="space-y-2">
                            {generatedLogic.actions?.map((action, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                                <span>{action.action_type}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {generatedLogic.potential_issues?.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-amber-700 flex items-center gap-2 mb-2">
                              <AlertTriangle className="w-4 h-4" />
                              Potential Issues:
                            </p>
                            <ul className="space-y-1">
                              {generatedLogic.potential_issues.map((issue, idx) => (
                                <li key={idx} className="text-sm text-gray-600 ml-6">• {issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => {
                        setGeneratedLogic(null);
                        setNaturalLanguageInput('');
                      }}>
                        Start Over
                      </Button>
                      <Button onClick={handleCreateAutomation} className="bg-blue-600 hover:bg-blue-700">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {editingAutomation ? 'Update Automation' : 'Create Automation'}
                      </Button>
                    </div>
                  </motion.div>
                )}
                </TabsContent>

                <TabsContent value="manual">
                  <ManualAutomationEditor
                    automation={editingAutomation}
                    onSave={handleManualSave}
                    onCancel={() => {
                      setShowCreateDialog(false);
                      setEditingAutomation(null);
                      setEditMode("ai");
                    }}
                  />
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="my-automations">My Automations</TabsTrigger>
            <TabsTrigger value="suggestions">
              <Sparkles className="w-4 h-4 mr-2" />
              AI Suggestions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-automations" className="space-y-4">
            {loadingAutomations ? (
              <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : automations.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center p-12">
                  <Zap className="w-12 h-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No automations yet</h3>
                  <p className="text-gray-600 text-center mb-4">
                    Create your first automation to streamline your workflow
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Automation
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence>
                  {automations.map((automation) => (
                    <motion.div
                      key={automation.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg">{automation.name}</CardTitle>
                              <CardDescription className="mt-1">{automation.description}</CardDescription>
                            </div>
                            <Badge className={getStatusColor(automation.status)}>
                              {automation.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Zap className="w-4 h-4" />
                              <span>{automation.trigger_type}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-4 h-4" />
                              <span>{automation.actions?.length || 0} actions</span>
                            </div>
                          </div>

                          {automation.execution_count > 0 && (
                            <div className="text-sm text-gray-600">
                              <Clock className="w-4 h-4 inline mr-1" />
                              Executed {automation.execution_count} times
                              {automation.last_execution_date && (
                                <span className="ml-2">
                                  (Last: {new Date(automation.last_execution_date).toLocaleDateString()})
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingAutomation(automation);
                                setNaturalLanguageInput(automation.natural_language_input || automation.description);
                                setGeneratedLogic(automation.ai_generated_logic || null);
                                setEditMode("manual");
                                setShowCreateDialog(true);
                              }}
                            >
                              <Edit2 className="w-4 h-4 mr-1" />
                              Edit
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleStatus(automation)}
                            >
                              {automation.status === 'active' ? (
                                <>
                                  <Pause className="w-4 h-4 mr-1" />
                                  Pause
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4 mr-1" />
                                  Activate
                                </>
                              )}
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleExecuteAutomation(automation.id)}
                              disabled={executingAutomation === automation.id || automation.status !== 'active'}
                            >
                              {executingAutomation === automation.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  Running...
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4 mr-1" />
                                  Run Now
                                </>
                              )}
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteAutomation(automation.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          <TabsContent value="suggestions" className="space-y-4">
            {loadingSuggestions ? (
              <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {suggestions.map((suggestion, idx) => (
                  <Card key={idx} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        {suggestion.name}
                      </CardTitle>
                      <CardDescription>{suggestion.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{suggestion.trigger_type}</Badge>
                        <Badge variant="outline" className={
                          suggestion.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                          suggestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }>
                          {suggestion.difficulty}
                        </Badge>
                      </div>

                      <div className="text-sm text-gray-600">
                        <p className="font-medium mb-1">Benefit:</p>
                        <p>{suggestion.benefit}</p>
                      </div>

                      <div className="text-sm text-gray-600">
                        <Clock className="w-4 h-4 inline mr-1" />
                        Saves ~{suggestion.estimated_time_saved}
                      </div>

                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          setNaturalLanguageInput(suggestion.description);
                          setShowCreateDialog(true);
                        }}
                      >
                        Use This Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}