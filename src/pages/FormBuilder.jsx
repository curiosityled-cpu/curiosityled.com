import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Save, Eye, ArrowLeft } from "lucide-react";
import FormBuilderEditor from "@/components/forms/FormBuilderEditor";
import FormPreview from "@/components/forms/FormPreview";
import PublicAccessManager from "@/components/forms/PublicAccessManager";
import FormAssignmentManager from "@/components/forms/FormAssignmentManager";
import IntegrationConfig from "@/components/forms/IntegrationConfig";
import SchedulingManager from "@/components/forms/SchedulingManager";
import ReminderManager from "@/components/forms/ReminderManager";
import MultiStepFormManager from "@/components/forms/MultiStepFormManager";
import AutoScoringManager from "@/components/forms/AutoScoringManager";
import WebhookConfigManager from "@/components/forms/WebhookConfigManager";
import AutomatedReportScheduler from "@/components/forms/AutomatedReportScheduler";
import FormVersionHistory from "@/components/forms/FormVersionHistory";
import FormCollaboration from "@/components/forms/FormCollaboration";
import FormDuplicator from "@/components/forms/FormDuplicator";
import FormApprovalWorkflow from "@/components/forms/FormApprovalWorkflow";
import FormChangeTracker from "@/components/forms/FormChangeTracker";
import FormEmbedGenerator from "@/components/forms/FormEmbedGenerator";
import FormSocialSharing from "@/components/forms/FormSocialSharing";
import FormTemplatePublisher from "@/components/forms/FormTemplatePublisher";
import FormDistributionAnalytics from "@/components/forms/FormDistributionAnalytics";
import FormLifecycleManager from "@/components/forms/FormLifecycleManager";
import AdvancedFormInsights from "@/components/forms/AdvancedFormInsights";
import UserBehaviorTracking from "@/components/forms/UserBehaviorTracking";
import ResponseQualityScoring from "@/components/forms/ResponseQualityScoring";
import BenchmarkComparison from "@/components/forms/BenchmarkComparison";
import PredictiveAnalytics from "@/components/forms/PredictiveAnalytics";
import FormEngagementHeatmap from "@/components/forms/FormEngagementHeatmap";
import FormThemeEditor from "@/components/forms/FormThemeEditor";
import FormBrandingManager from "@/components/forms/FormBrandingManager";
import FormLayoutCustomizer from "@/components/forms/FormLayoutCustomizer";
import ThemePresets from "@/components/forms/ThemePresets";
import ResponsivePreview from "@/components/forms/ResponsivePreview";
import SecuritySettings from "@/components/forms/SecuritySettings";
import ComplianceManager from "@/components/forms/ComplianceManager";
import DataRetentionManager from "@/components/forms/DataRetentionManager";
import PrivacyControls from "@/components/forms/PrivacyControls";
import FormAuditLog from "@/components/forms/FormAuditLog";
import SecurityAnalytics from "@/components/forms/SecurityAnalytics";
import Assessment360Manager from "@/components/forms/Assessment360Manager";
import { createPageUrl } from "@/utils";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import FormAssistant from "@/components/ai/FormAssistant";

function FormBuilder() {
  const [searchParams] = useSearchParams();
  const formId = searchParams.get("formId");
  const templateId = searchParams.get("templateId");
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("build");
  const [originalFormData, setOriginalFormData] = useState(null);
  
  const getFormTypeDescription = (type) => {
    const descriptions = {
      'request': 'Operational form for submitting development requests',
      'enrollment': 'Sign up users for programs and journeys',
      '360_assessment': 'Multi-respondent feedback with aggregated results',
      'disc_assessment': 'Behavioral style assessment (Dominance, Influence, Steadiness, Conscientiousness)',
      'mbti_assessment': 'Myers-Briggs personality type indicator',
      'kirkpatrick_level_1': 'Training evaluation - immediate reactions',
      'kirkpatrick_level_2': 'Training evaluation - knowledge gained',
      'kirkpatrick_level_3': 'Training evaluation - behavior change',
      'kirkpatrick_level_4': 'Training evaluation - business results & ROI',
      'coaching_evaluation_1on1': 'Evaluate individual coaching sessions',
      'coaching_evaluation_group': 'Evaluate group coaching effectiveness',
      'quiz': 'Scored knowledge check',
      'exam': 'Formal assessment with pass/fail',
      'custom': 'Build your own form from scratch'
    };
    return descriptions[type] || '';
  };

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    form_type: "custom",
    form_category: "survey",
    status: "draft",
    config: {
      sections: [],
      scoring_enabled: false,
      show_results_immediately: true,
      require_approval: false,
      collect_email: true,
      one_response_per_user: true
    }
  });

  useEffect(() => {
    loadFormData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, templateId]);

  const loadFormData = async () => {
    setLoading(true);
    try {
      if (formId) {
        // Load existing form
        const forms = await base44.entities.CustomForm.filter({ id: formId });
        if (forms.length > 0) {
          const form = forms[0];
          // Ensure config exists with sections array
          if (!form.config) {
            form.config = { sections: [] };
          } else if (!form.config.sections) {
            form.config.sections = [];
          }
          setFormData(form);
          setOriginalFormData(JSON.parse(JSON.stringify(form)));
        } else {
          toast.error("Form not found");
          setLoading(false);
        }
      } else if (templateId) {
        // Load from template
        const templates = await base44.entities.CustomFormTemplate.filter({ id: templateId });
        if (templates.length > 0) {
          const template = templates[0];
          setFormData({
            title: template.title,
            description: template.description,
            form_type: template.form_type,
            form_category: template.form_category,
            status: "draft",
            template_id: templateId,
            config: template.config || { sections: [] }
          });
        } else {
          toast.error("Template not found");
        }
      } else {
        // New form - set loading to false
        setLoading(false);
      }
    } catch (error) {
      console.error("Error loading form:", error);
      toast.error("Failed to load form");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title) {
      toast.error("Please enter a form title");
      return;
    }

    if (!formData.config.sections || formData.config.sections.length === 0) {
      toast.error("Please add at least one section with questions");
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        client_id: user.client_id
      };

      if (formId) {
        // Update existing
        await base44.entities.CustomForm.update(formId, dataToSave);
        toast.success("Form updated successfully");
      } else {
        // Create new
        const created = await base44.entities.CustomForm.create(dataToSave);
        window.history.replaceState(null, "", `${createPageUrl("FormBuilder")}?formId=${created.id}`);
        toast.success("Form created successfully");
      }
    } catch (error) {
      console.error("Error saving form:", error);
      toast.error("Failed to save form");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!formData.title) {
      toast.error("Please enter a form title");
      return;
    }

    if (!formData.config || !formData.config.sections || formData.config.sections.length === 0) {
      toast.error("Please add at least one section with questions");
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        client_id: user.client_id,
        status: "published"
      };

      if (formId) {
        await base44.entities.CustomForm.update(formId, dataToSave);
        setFormData(prev => ({ ...prev, status: "published" }));
        toast.success("Form published successfully");
      } else {
        const created = await base44.entities.CustomForm.create(dataToSave);
        window.history.replaceState(null, "", `${createPageUrl("FormBuilder")}?formId=${created.id}`);
        setFormData(prev => ({ ...prev, status: "published" }));
        toast.success("Form published successfully");
      }
    } catch (error) {
      console.error("Error publishing form:", error);
      toast.error("Failed to publish form");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {formId ? "Edit Form" : "Create New Form"}
              </h1>
              <p className="text-gray-600 mt-1">
                {formData.status === "published" ? "Published" : "Draft"}
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Draft
                  </>
                )}
              </Button>
              
              {formData.status !== "published" && (
                <Button
                  onClick={handlePublish}
                  disabled={saving}
                  style={{ backgroundColor: '#0202ff' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0101dd'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0202ff'}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Publish Form
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Form Settings */}
          <div className="lg:col-span-1 space-y-6">
            {!formId && (
              <FormAssistant
                formSchema={{
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    form_type: { type: "string", enum: ["custom", "request", "enrollment", "feedback_survey", "satisfaction_survey", "quiz", "poll"] }
                  }
                }}
                onApply={(data) => setFormData(prev => ({ ...prev, ...data }))}
                formType="custom_form"
                placeholder="Describe the form you want to create, e.g., 'A satisfaction survey for our Q1 leadership training program with questions about content quality and instructor effectiveness'"
                compact={true}
              />
            )}

            <Card>
              <CardHeader>
                <CardTitle>Form Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Form Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Q1 Satisfaction Survey"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this form..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="form_type">Form Type</Label>
                  <Select
                    value={formData.form_type}
                    onValueChange={(value) => setFormData({ ...formData, form_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[400px]">
                      <SelectItem value="custom">Custom Form</SelectItem>
                      <SelectItem value="request">Request Form - Submit development requests</SelectItem>
                      <SelectItem value="enrollment">Enrollment Form - Program sign-ups</SelectItem>
                      <SelectItem value="360_assessment">360 Assessment - Multi-rater feedback</SelectItem>
                      <SelectItem value="disc_assessment">DISC Assessment - Behavioral style</SelectItem>
                      <SelectItem value="mbti_assessment">MBTI Assessment - Personality type</SelectItem>
                      <SelectItem value="poll">Poll - Quick voting</SelectItem>
                      <SelectItem value="feedback_survey">Feedback Survey - General feedback</SelectItem>
                      <SelectItem value="satisfaction_survey">Satisfaction Survey - Measure satisfaction</SelectItem>
                      <SelectItem value="kirkpatrick_level_1">Kirkpatrick L1 - Reaction</SelectItem>
                      <SelectItem value="kirkpatrick_level_2">Kirkpatrick L2 - Learning</SelectItem>
                      <SelectItem value="kirkpatrick_level_3">Kirkpatrick L3 - Behavior</SelectItem>
                      <SelectItem value="kirkpatrick_level_4">Kirkpatrick L4 - Results/ROI</SelectItem>
                      <SelectItem value="coaching_evaluation_1on1">Coaching Eval (1:1)</SelectItem>
                      <SelectItem value="coaching_evaluation_group">Coaching Eval (Group)</SelectItem>
                      <SelectItem value="quiz">Quiz - Scored assessment</SelectItem>
                      <SelectItem value="exam">Exam - Formal testing</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.form_type && (
                    <p className="text-xs text-gray-500 mt-1">
                      {getFormTypeDescription(formData.form_type)}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="form_category">Category</Label>
                  <Select
                    value={formData.form_category}
                    onValueChange={(value) => setFormData({ ...formData, form_category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assessment">Assessment</SelectItem>
                      <SelectItem value="survey">Survey</SelectItem>
                      <SelectItem value="evaluation">Evaluation</SelectItem>
                      <SelectItem value="operational">Operational</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Public Access */}
            {formId && formData.status === "published" && (
              <PublicAccessManager 
                form={formData} 
                onUpdate={loadFormData}
              />
            )}

            {/* Assignments */}
            {formId && formData.status === "published" && (
              <FormAssignmentManager 
                form={formData} 
                onUpdate={loadFormData}
              />
            )}

            {/* Integration */}
            {formId && formData.status === "published" && (
              <IntegrationConfig 
                form={formData} 
                onUpdate={loadFormData}
              />
            )}

            {/* Scheduling */}
            {formId && (
              <SchedulingManager 
                form={formData} 
                onUpdate={loadFormData}
              />
            )}

            {/* Reminders */}
            {formId && formData.status === "published" && (
              <ReminderManager 
                form={formData} 
                onUpdate={loadFormData}
              />
            )}

            {/* Multi-Step */}
            {formId && (
              <MultiStepFormManager 
                form={formData} 
                onUpdate={(updates) => {
                  setFormData({ ...formData, ...updates });
                }}
              />
            )}

            {/* Auto-Scoring */}
            {formId && (
              <AutoScoringManager 
                form={formData} 
                onUpdate={loadFormData}
              />
            )}

            {/* Webhooks */}
            {formId && (
              <WebhookConfigManager 
                form={formData} 
                onUpdate={loadFormData}
              />
            )}

            {/* Automated Reports */}
            {formId && (
              <AutomatedReportScheduler 
                form={formData} 
                onUpdate={loadFormData}
              />
            )}

            {/* Version History */}
            {formId && (
              <FormVersionHistory 
                form={formData} 
                onRestore={loadFormData}
              />
            )}

            {/* Collaboration */}
            {formId && (
              <FormCollaboration 
                form={formData} 
                onUpdate={loadFormData}
              />
            )}

            {/* Duplication */}
            {formId && (
              <FormDuplicator form={formData} />
            )}

            {/* Approval Workflow */}
            {formId && (
              <FormApprovalWorkflow 
                form={formData} 
                onUpdate={loadFormData}
              />
            )}

            {/* Change Tracker */}
            {formId && originalFormData && (
              <FormChangeTracker 
                form={formData}
                originalForm={originalFormData}
              />
            )}

            {/* Embed Generator */}
            {formId && formData.public_access_enabled && (
              <FormEmbedGenerator 
                form={formData}
                publicUrl={formData.public_access_config?.token ? 
                  `${window.location.origin}/PublicFormSubmission?token=${formData.public_access_config.token}` : 
                  null}
              />
            )}

            {/* Social Sharing */}
            {formId && formData.public_access_enabled && (
              <FormSocialSharing 
                form={formData}
                publicUrl={formData.public_access_config?.token ? 
                  `${window.location.origin}/PublicFormSubmission?token=${formData.public_access_config.token}` : 
                  null}
              />
            )}

            {/* Template Publisher */}
            {formId && formData.status === "published" && (
              <FormTemplatePublisher 
                form={formData}
                onPublish={loadFormData}
              />
            )}

            {/* Distribution Analytics */}
            {formId && (
              <FormDistributionAnalytics form={formData} />
            )}

            {/* Lifecycle Manager */}
            {formId && (
              <FormLifecycleManager 
                form={formData}
                onUpdate={loadFormData}
              />
            )}

            {/* Advanced Insights */}
            {formId && formData.status === "published" && (
              <AdvancedFormInsights form={formData} />
            )}

            {/* User Behavior Tracking */}
            {formId && formData.status === "published" && (
              <UserBehaviorTracking form={formData} />
            )}

            {/* Response Quality Scoring */}
            {formId && formData.status === "published" && (
              <ResponseQualityScoring form={formData} />
            )}

            {/* Benchmark Comparison */}
            {formId && formData.status === "published" && (
              <BenchmarkComparison form={formData} />
            )}

            {/* Predictive Analytics */}
            {formId && formData.status === "published" && (
              <PredictiveAnalytics form={formData} />
            )}

            {/* Engagement Heatmap */}
            {formId && formData.status === "published" && (
              <FormEngagementHeatmap form={formData} />
            )}

            {/* Theme Presets */}
            {formId && (
              <ThemePresets 
                form={formData}
                onUpdate={loadFormData}
              />
            )}

            {/* Theme Editor */}
            {formId && (
              <FormThemeEditor 
                form={formData}
                onUpdate={loadFormData}
              />
            )}

            {/* Branding Manager */}
            {formId && (
              <FormBrandingManager 
                form={formData}
                onUpdate={loadFormData}
              />
            )}

            {/* Layout Customizer */}
            {formId && (
              <FormLayoutCustomizer 
                form={formData}
                onUpdate={loadFormData}
              />
            )}

            {/* Responsive Preview */}
            {formId && formData.status === "published" && (
              <ResponsivePreview form={formData} />
            )}

            {/* Security Settings */}
            {formId && (
              <SecuritySettings 
                form={formData}
                onUpdate={loadFormData}
              />
            )}

            {/* Compliance Manager */}
            {formId && (
              <ComplianceManager 
                form={formData}
                onUpdate={loadFormData}
              />
            )}

            {/* Data Retention */}
            {formId && (
              <DataRetentionManager 
                form={formData}
                onUpdate={loadFormData}
              />
            )}

            {/* Privacy Controls */}
            {formId && (
              <PrivacyControls 
                form={formData}
                onUpdate={loadFormData}
              />
            )}

            {/* Audit Log */}
            {formId && (
              <FormAuditLog form={formData} />
            )}

            {/* Security Analytics */}
            {formId && formData.status === "published" && (
              <SecurityAnalytics form={formData} />
            )}

            {/* 360 Assessment Configuration */}
            {formId && formData.form_type === "360_assessment" && (
              <Assessment360Manager 
                form={formData}
                onUpdate={loadFormData}
              />
            )}

            {/* Template Browser (when creating new form) */}
            {!formId && !templateId && (
              <Card>
                <CardHeader>
                  <CardTitle>Start from Template</CardTitle>
                  <p className="text-xs text-gray-600 mt-1">
                    Browse pre-built templates to get started quickly
                  </p>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.location.href = createPageUrl("FormBuilderDashboard") + "#templates"}
                  >
                    Browse Templates
                  </Button>
                </CardContent>
              </Card>
            )}
            </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2">
            <Card>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="build" className="flex-1">Build</TabsTrigger>
                  <TabsTrigger value="preview" className="flex-1">Preview</TabsTrigger>
                </TabsList>

                <TabsContent value="build" className="p-6">
                  <FormBuilderEditor
                    sections={formData.config?.sections || []}
                    onChange={(sections) => setFormData({
                      ...formData,
                      config: { ...(formData.config || {}), sections }
                    })}
                  />
                </TabsContent>

                <TabsContent value="preview" className="p-6">
                  <FormPreview formData={formData} />
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuthProtection(FormBuilder, {
  allowedRoles: ['Admin Level 1', 'Admin Level 2', 'Super Administrator', 'Partner Business Administrator', 'Platform Admin']
});