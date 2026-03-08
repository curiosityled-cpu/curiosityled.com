import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Edit, Save, RefreshCw, Eye, Loader2, Info, Code, FileText, Shield, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import { toast } from "sonner";
import PageHeader from "@/components/common/PageHeader";

function EmailTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [createMode, setCreateMode] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  const [formData, setFormData] = useState({
    template_key: "",
    template_name: "",
    category: "notification",
    subject: "",
    body_html: "",
    body_text: "",
    available_variables: []
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const templates = await base44.entities.EmailTemplate.list('-updated_date');
      setTemplates(templates);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setFormData({
      template_key: "",
      template_name: "",
      category: "notification",
      subject: "",
      body_html: "",
      body_text: "",
      available_variables: []
    });
    setCreateMode(true);
  };

  const handleEditTemplate = (template) => {
    setSelectedTemplate(template);
    setFormData({
      template_key: template.template_key,
      template_name: template.template_name,
      category: template.category,
      subject: template.subject,
      body_html: template.body_html,
      body_text: template.body_text || "",
      available_variables: template.available_variables || []
    });
    setEditMode(true);
  };

  const handleSaveTemplate = async () => {
    if (!formData.template_name || !formData.template_key || !formData.subject) {
      toast.error('Template name, key, and subject are required');
      return;
    }

    setSaving(true);
    try {
      if (createMode) {
        await base44.entities.EmailTemplate.create({
          template_key: formData.template_key,
          template_name: formData.template_name,
          category: formData.category,
          subject: formData.subject,
          body_html: formData.body_html,
          body_text: formData.body_text,
          available_variables: formData.available_variables,
          is_system_default: false,
          is_active: true
        });
        toast.success('Template created successfully');
        setCreateMode(false);
      } else if (selectedTemplate) {
        await base44.entities.EmailTemplate.update(selectedTemplate.id, {
          template_name: formData.template_name,
          category: formData.category,
          subject: formData.subject,
          body_html: formData.body_html,
          body_text: formData.body_text,
          available_variables: formData.available_variables
        });
        toast.success('Template updated successfully');
        setEditMode(false);
      }
      
      setSelectedTemplate(null);
      await loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = (template) => {
    setSelectedTemplate(template);
    setPreviewMode(true);
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please describe what template you need');
      return;
    }

    setAiGenerating(true);
    try {
      const { data } = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate an email template with the following requirements:
${aiPrompt}

Create a professional HTML email template with:
- An engaging subject line
- Well-formatted HTML body with inline styles
- A plain text version
- Suggested variables to use (like {{user_name}}, {{platform_name}}, etc.)
- Professional styling with proper spacing and colors

Return the result in JSON format.`,
        response_json_schema: {
          type: "object",
          properties: {
            subject: { type: "string" },
            body_html: { type: "string" },
            body_text: { type: "string" },
            suggested_variables: { 
              type: "array",
              items: { type: "string" }
            },
            suggested_template_key: { type: "string" },
            suggested_template_name: { type: "string" },
            suggested_category: { type: "string" }
          }
        }
      });

      if (data) {
        setFormData({
          ...formData,
          template_key: formData.template_key || data.suggested_template_key || "",
          template_name: formData.template_name || data.suggested_template_name || "",
          category: data.suggested_category || formData.category,
          subject: data.subject || "",
          body_html: data.body_html || "",
          body_text: data.body_text || "",
          available_variables: data.suggested_variables || []
        });
        toast.success('Template generated successfully!');
        setShowAIAssistant(false);
        setAiPrompt("");
      }
    } catch (error) {
      console.error('Error generating template:', error);
      toast.error('Failed to generate template');
    } finally {
      setAiGenerating(false);
    }
  };

  const filteredTemplates = templates.filter(t => {
    const matchesCategory = filterCategory === "all" || t.category === filterCategory;
    const matchesSearch = !searchTerm || 
      t.template_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.template_key.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryBadge = (category) => {
    const colors = {
      account: "bg-blue-100 text-blue-800",
      notification: "bg-purple-100 text-purple-800",
      system: "bg-gray-100 text-gray-800",
      learning: "bg-green-100 text-green-800",
      security: "bg-red-100 text-red-800"
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PageHeader
          title="Email & Notification Templates"
          subtitle="Customize system emails and notifications sent to users"
          icon={Mail}
        />

        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Info className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Changes to email templates will affect all future emails sent from the platform. Use variables like <code className="bg-white px-1 rounded">{"{{user_name}}"}</code> to personalize messages.
          </AlertDescription>
        </Alert>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="account">Account</SelectItem>
              <SelectItem value="notification">Notification</SelectItem>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="learning">Learning</SelectItem>
              <SelectItem value="security">Security</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleCreateTemplate} className="bg-blue-600 hover:bg-blue-700">
            <Mail className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{template.template_name}</CardTitle>
                    <p className="text-xs text-gray-500 mt-1">{template.template_key}</p>
                  </div>
                  <Badge className={getCategoryBadge(template.category)}>
                    {template.category}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{template.subject}</p>
                
                {template.available_variables && template.available_variables.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-700 mb-2">Available Variables:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.available_variables.slice(0, 3).map(v => (
                        <Badge key={v} variant="outline" className="text-xs">
                          {v}
                        </Badge>
                      ))}
                      {template.available_variables.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.available_variables.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreview(template)}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleEditTemplate(template)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <Card className="p-12 text-center">
            <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Templates Found</h3>
            <p className="text-gray-600">
              {searchTerm ? 'Try adjusting your search' : 'No templates available in this category'}
            </p>
          </Card>
        )}

        {/* Edit/Create Modal */}
        <Dialog open={editMode || createMode} onOpenChange={(open) => {
          if (!open) {
            setEditMode(false);
            setCreateMode(false);
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>
                  {createMode ? 'Create New Template' : `Edit Template: ${selectedTemplate?.template_name}`}
                </DialogTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAIAssistant(!showAIAssistant)}
                  className="gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  AI Assistant
                </Button>
              </div>
            </DialogHeader>

            {showAIAssistant && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-purple-900">
                  <Sparkles className="w-5 h-5" />
                  <h4 className="font-semibold">AI Template Generator</h4>
                </div>
                <Textarea
                  placeholder="Describe the email template you need. e.g., 'A reminder email for users with overdue goals' or 'Welcome email for new team members joining a cohort'"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={3}
                />
                <Button
                  onClick={handleAIGenerate}
                  disabled={aiGenerating || !aiPrompt.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {aiGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Template
                    </>
                  )}
                </Button>
              </div>
            )}

            <Tabs defaultValue={createMode ? "details" : "html"} className="mt-4">
              <TabsList>
                {createMode && (
                  <TabsTrigger value="details">
                    <Info className="w-4 h-4 mr-2" />
                    Details
                  </TabsTrigger>
                )}
                <TabsTrigger value="html">
                  <Code className="w-4 h-4 mr-2" />
                  HTML
                </TabsTrigger>
                <TabsTrigger value="text">
                  <FileText className="w-4 h-4 mr-2" />
                  Plain Text
                </TabsTrigger>
              </TabsList>

              {createMode && (
                <TabsContent value="details" className="space-y-4">
                  <div>
                    <Label>Template Key *</Label>
                    <Input
                      value={formData.template_key}
                      onChange={(e) => setFormData({ ...formData, template_key: e.target.value })}
                      placeholder="e.g., custom_notification"
                      className="mt-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">Unique identifier (lowercase, no spaces)</p>
                  </div>

                  <div>
                    <Label>Template Name *</Label>
                    <Input
                      value={formData.template_name}
                      onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                      placeholder="e.g., Custom Notification"
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Category</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="account">Account</SelectItem>
                        <SelectItem value="notification">Notification</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                        <SelectItem value="learning">Learning</SelectItem>
                        <SelectItem value="security">Security</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              )}

              <TabsContent value="html" className="space-y-4">
                <div>
                  <Label>Email Subject *</Label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="mt-2"
                    placeholder="e.g., {{user_name}}, you have a new notification"
                  />
                </div>

                <div>
                  <Label>HTML Body</Label>
                  <Textarea
                    value={formData.body_html}
                    onChange={(e) => setFormData({ ...formData, body_html: e.target.value })}
                    className="mt-2 font-mono text-sm"
                    rows={20}
                  />
                </div>

                <div>
                  <Label>Available Variables (Optional)</Label>
                  <Input
                    value={formData.available_variables?.join(', ') || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      available_variables: e.target.value.split(',').map(v => v.trim()).filter(Boolean)
                    })}
                    placeholder="{{user_name}}, {{platform_name}}, {{custom_field}}"
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">Comma-separated list of variables</p>
                </div>

                {!createMode && selectedTemplate?.available_variables && (
                  <Alert>
                    <Info className="w-4 h-4" />
                    <AlertDescription>
                      <p className="font-medium mb-2">Available Variables:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedTemplate.available_variables.map(v => (
                          <code key={v} className="bg-white px-2 py-1 rounded text-xs">
                            {v}
                          </code>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="text" className="space-y-4">
                <div>
                  <Label>Plain Text Version</Label>
                  <Textarea
                    value={formData.body_text}
                    onChange={(e) => setFormData({ ...formData, body_text: e.target.value })}
                    className="mt-2"
                    rows={20}
                    placeholder="Plain text version for email clients that don't support HTML"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setEditMode(false);
                setCreateMode(false);
              }}>
                Cancel
              </Button>
              <Button onClick={handleSaveTemplate} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {createMode ? 'Create Template' : 'Save Template'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Modal */}
        <Dialog open={previewMode} onOpenChange={setPreviewMode}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Preview: {selectedTemplate?.template_name}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Subject:</Label>
                <p className="text-lg font-semibold mt-1">{selectedTemplate?.subject}</p>
              </div>

              <div className="border rounded-lg p-6 bg-white">
                <div dangerouslySetInnerHTML={{ __html: selectedTemplate?.body_html || '' }} />
              </div>

              <Alert>
                <Info className="w-4 h-4" />
                <AlertDescription className="text-xs">
                  This preview shows the template with placeholder variables. Actual emails will have these replaced with real data.
                </AlertDescription>
              </Alert>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default withAuthProtection(EmailTemplates, ['Platform Admin', 'Super Administrator']);