import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import AIEnhancedInput from "@/components/ai/AIEnhancedInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";
import { Loader2, Upload, X, AlertCircle, Info, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import FormAssistant from "@/components/ai/FormAssistant";

export default function RequestSubmissionForm({ onSuccess, onCancel }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [analyzingRisks, setAnalyzingRisks] = useState(false);
  const [riskAnalysis, setRiskAnalysis] = useState(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    request_type: "custom",
    source: "form",
    priority: "medium",
    impact_level: "team",
    risk_level: "low",
    risk_categories: [],
    budget_amount: "",
    audience_size: "",
    due_date: "",
    estimated_effort_hours: "",
    business_justification: "",
    success_criteria: "",
    tags: [],
    attachments: []
  });

  const [tagInput, setTagInput] = useState("");

  const analyzeRisks = async () => {
    if (!formData.description || formData.description.length < 20) {
      toast.error('Please provide a more detailed description first');
      return;
    }
    setAnalyzingRisks(true);
    try {
      const { data } = await base44.functions.invoke('analyzeRequestRisks', {
        title: formData.title,
        description: formData.description,
        request_type: formData.request_type,
        budget_amount: formData.budget_amount,
        estimated_effort_hours: formData.estimated_effort_hours,
        audience_size: formData.audience_size
      });

      if (data?.risk_analysis) {
        setRiskAnalysis(data.risk_analysis);
        
        // Auto-populate risk categories
        if (data.risk_analysis.detected_categories?.length > 0) {
          setFormData(prev => ({
            ...prev,
            risk_categories: data.risk_analysis.detected_categories,
            risk_level: data.risk_analysis.risk_level || prev.risk_level
          }));
        }
      }
    } catch (error) {
      console.error('Error analyzing risks:', error);
    } finally {
      setAnalyzingRisks(false);
    }
  };

  const handleFileUpload = async (files) => {
    setUploadingFiles(true);
    try {
      const uploadPromises = Array.from(files).map(file =>
        base44.integrations.Core.UploadFile({ file })
      );
      
      const results = await Promise.all(uploadPromises);
      const fileUrls = results.map(r => r.file_url);
      
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...fileUrls]
      }));
      
      toast.success(`${files.length} file(s) uploaded successfully`);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleRemoveAttachment = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const handleRiskCategoryToggle = (category) => {
    setFormData(prev => ({
      ...prev,
      risk_categories: prev.risk_categories.includes(category)
        ? prev.risk_categories.filter(c => c !== category)
        : [...prev.risk_categories, category]
    }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const shouldRequireApproval = () => {
    const budget = parseFloat(formData.budget_amount) || 0;
    const effort = parseFloat(formData.estimated_effort_hours) || 0;
    return budget > 5000 || effort > 40 || formData.risk_level === 'critical' || formData.risk_level === 'high';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!user?.email) {
      toast.error("User information is missing. Please try logging in again.");
      return;
    }

    setLoading(true);
    try {
      const requiresApproval = shouldRequireApproval();
      
      const requestData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        request_type: formData.request_type,
        source: formData.source,
        priority: formData.priority,
        impact_level: formData.impact_level,
        risk_level: formData.risk_level,
        risk_categories: formData.risk_categories.length > 0 ? formData.risk_categories : ["none"],
        requested_by_email: user.email,
        client_id: user.client_id,
        budget_amount: formData.budget_amount ? parseFloat(formData.budget_amount) : undefined,
        audience_size: formData.audience_size ? parseInt(formData.audience_size) : undefined,
        estimated_effort_hours: formData.estimated_effort_hours ? parseFloat(formData.estimated_effort_hours) : undefined,
        business_justification: formData.business_justification || undefined,
        success_criteria: formData.success_criteria || undefined,
        due_date: formData.due_date || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        attachments: formData.attachments.length > 0 ? formData.attachments : undefined,
        requires_approval: requiresApproval,
        approval_status: requiresApproval ? 'pending' : 'not_required',
        initial_notes: riskAnalysis ? `AI Risk Analysis: ${JSON.stringify(riskAnalysis)}` : undefined
      };

      await base44.entities.DevelopmentRequest.create(requestData);
      
      if (requiresApproval) {
        toast.success("Request submitted and sent for approval");
      } else {
        toast.success("Request submitted successfully");
      }
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error(error.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const requiresApproval = shouldRequireApproval();

  const requestFormSchema = {
    type: "object",
    properties: {
      title: { type: "string" },
      description: { type: "string" },
      request_type: { type: "string", enum: ["learning_content", "program_creation", "assessment_development", "coaching_support", "reporting", "platform_support", "consultation", "training", "custom"] },
      priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
      impact_level: { type: "string", enum: ["individual", "team", "department", "organization", "enterprise"] },
      business_justification: { type: "string" },
      success_criteria: { type: "string" },
      budget_amount: { type: "string" },
      audience_size: { type: "string" },
      estimated_effort_hours: { type: "string" }
    }
  };

  const handleAIApply = (aiData) => {
    setFormData(prev => ({
      ...prev,
      ...aiData
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit a Request</CardTitle>
        <CardDescription>
          Provide details about what you need help with
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <FormAssistant
            formSchema={requestFormSchema}
            onApply={handleAIApply}
            formType="development_request"
            placeholder="Describe your request in plain language, e.g., 'I need a leadership training program for 20 mid-level managers focusing on communication and decision-making skills'"
            compact={true}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="title">
              Request Title <span className="text-red-500">*</span>
            </Label>
            <AIEnhancedInput
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fieldName="title"
              fieldType="request_title"
              formContext={{ request_type: formData.request_type, priority: formData.priority }}
              placeholder="Brief summary of your request"
              required
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">
              Description <span className="text-red-500">*</span>
            </Label>
            <AIEnhancedInput
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fieldName="description"
              fieldType="request_description"
              formContext={{ title: formData.title, request_type: formData.request_type }}
              multiline={true}
              placeholder="Provide detailed information about what you need..."
              rows={5}
              required
            />
          </div>

          {/* Request Type & Priority */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="request_type">
                Request Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.request_type}
                onValueChange={(value) => setFormData({ ...formData, request_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="learning_content">Learning Content</SelectItem>
                  <SelectItem value="program_creation">Program Creation</SelectItem>
                  <SelectItem value="assessment_development">Assessment Development</SelectItem>
                  <SelectItem value="coaching_support">Coaching Support</SelectItem>
                  <SelectItem value="reporting">Reporting & Analytics</SelectItem>
                  <SelectItem value="platform_support">Platform Support</SelectItem>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="custom">Custom/Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Impact Level & Risk Level */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="impact_level">Impact Level</Label>
              <Select
                value={formData.impact_level}
                onValueChange={(value) => setFormData({ ...formData, impact_level: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="organization">Organization</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="risk_level">Risk Level</Label>
              <Select
                value={formData.risk_level}
                onValueChange={(value) => setFormData({ ...formData, risk_level: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Risk Categories */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Risk Categories (if applicable)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={analyzeRisks}
                disabled={analyzingRisks || !formData.description}
              >
                {analyzingRisks ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 mr-1" />
                    Analyze Risks
                  </>
                )}
              </Button>
            </div>

            {riskAnalysis && riskAnalysis.detected_categories?.length > 0 && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">AI Risk Analysis</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Detected {riskAnalysis.detected_categories.length} potential risk area(s)
                    </p>
                  </div>
                </div>
                
                {Object.keys(riskAnalysis.explanations || {}).length > 0 && (
                  <div className="mt-2 space-y-1">
                    {Object.entries(riskAnalysis.explanations).map(([category, explanation]) => (
                      <div key={category} className="text-xs text-blue-800">
                        <strong className="capitalize">{category}:</strong> {explanation}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: "compliance", label: "Compliance" },
                { value: "security", label: "Security" },
                { value: "budget", label: "Budget" },
                { value: "timeline", label: "Timeline" },
                { value: "reputation", label: "Reputation" },
                { value: "legal", label: "Legal" },
                { value: "technical", label: "Technical" }
              ].map(category => (
                <div key={category.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={category.value}
                    checked={formData.risk_categories.includes(category.value)}
                    onCheckedChange={() => handleRiskCategoryToggle(category.value)}
                  />
                  <Label htmlFor={category.value} className="font-normal text-sm">
                    {category.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Budget, Audience, Effort */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="budget">Budget (USD)</Label>
              <Input
                id="budget"
                type="number"
                value={formData.budget_amount}
                onChange={(e) => setFormData({ ...formData, budget_amount: e.target.value })}
                placeholder="0"
                min="0"
              />
            </div>

            <div>
              <Label htmlFor="audience">Audience Size</Label>
              <Input
                id="audience"
                type="number"
                value={formData.audience_size}
                onChange={(e) => setFormData({ ...formData, audience_size: e.target.value })}
                placeholder="Number of people impacted"
                min="0"
              />
            </div>

            <div>
              <Label htmlFor="effort">Est. Effort (hours)</Label>
              <Input
                id="effort"
                type="number"
                value={formData.estimated_effort_hours}
                onChange={(e) => setFormData({ ...formData, estimated_effort_hours: e.target.value })}
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          {/* Business Justification */}
          <div>
            <Label htmlFor="business_justification">Business Justification</Label>
            <AIEnhancedInput
              id="business_justification"
              value={formData.business_justification}
              onChange={(e) => setFormData({ ...formData, business_justification: e.target.value })}
              fieldName="business_justification"
              fieldType="justification"
              formContext={{ title: formData.title, description: formData.description, request_type: formData.request_type }}
              multiline={true}
              placeholder="Why is this request important? What business problem does it solve?"
              rows={3}
            />
          </div>

          {/* Success Criteria */}
          <div>
            <Label htmlFor="success_criteria">Success Criteria</Label>
            <AIEnhancedInput
              id="success_criteria"
              value={formData.success_criteria}
              onChange={(e) => setFormData({ ...formData, success_criteria: e.target.value })}
              fieldName="success_criteria"
              fieldType="criteria"
              formContext={{ title: formData.title, description: formData.description }}
              multiline={true}
              placeholder="How will we know this request is successful?"
              rows={3}
            />
          </div>

          {/* Due Date */}
          <div>
            <Label htmlFor="due_date">Target Due Date</Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add tags..."
              />
              <Button type="button" onClick={handleAddTag} variant="outline">
                Add
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {formData.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
                    {tag}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Attachments */}
          <div>
            <Label>Attachments</Label>
            <div className="mt-2">
              <input
                type="file"
                multiple
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
                id="file-upload"
                disabled={uploadingFiles}
              />
              <label htmlFor="file-upload">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full cursor-pointer"
                  disabled={uploadingFiles}
                  onClick={() => document.getElementById('file-upload').click()}
                >
                  {uploadingFiles ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Files
                    </>
                  )}
                </Button>
              </label>
            </div>
            
            {formData.attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {formData.attachments.map((url, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600 truncate flex-1">
                      {url.split('/').pop()}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveAttachment(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Approval Notice */}
          {requiresApproval && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900">Approval Required</p>
                <p className="text-sm text-amber-700 mt-1">
                  This request will require approval before processing due to:
                </p>
                <ul className="text-sm text-amber-700 mt-2 list-disc list-inside">
                  {parseFloat(formData.budget_amount) > 5000 && <li>Budget exceeds $5,000</li>}
                  {parseFloat(formData.estimated_effort_hours) > 40 && <li>Estimated effort exceeds 40 hours</li>}
                  {(formData.risk_level === 'high' || formData.risk_level === 'critical') && <li>High or critical risk level</li>}
                </ul>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}