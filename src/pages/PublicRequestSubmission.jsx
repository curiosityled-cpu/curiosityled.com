import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2, Upload, X, CheckCircle, AlertCircle, HelpCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function PublicRequestSubmission() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [tokenData, setTokenData] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  
  const [formData, setFormData] = useState({
    requester_name: "",
    requester_email: "",
    requester_department: "",
    requester_role: "",
    title: "",
    description: "",
    request_type: "other",
    priority: "medium",
    
    // Needs Assessment Fields
    business_challenge: "",
    current_state: "",
    desired_state: "",
    success_metrics: "",
    performance_gap: "",
    root_cause_analysis: "",
    
    // Audience & Context
    target_audience: "",
    audience_size: "",
    audience_roles: "",
    current_skill_level: "",
    
    // Solution Preferences
    preferred_solution_type: "",
    learning_format_preferences: [],
    timeline_urgency: "",
    due_date: "",
    
    // Budget & Resources
    budget_amount: "",
    budget_constraints: "",
    existing_resources: "",
    
    // Approval & Stakeholders
    stakeholders: "",
    approval_needed: false,
    requires_leadership_buy_in: false,
    
    is_invitation_only: false,
    estimated_effort_hours: "",
    risk_flags: [],
    attachments: []
  });

  useEffect(() => {
    const checkAccess = async () => {
      // First check if user is an admin with preview access
      try {
        const currentUser = await base44.auth.me();
        const isAdmin = currentUser && ['Admin Level 2', 'Super Administrator', 'Partner Business Administrator', 'Platform Admin'].includes(currentUser.app_role);
        
        if (isAdmin) {
          // Admin preview mode - bypass token validation
          setTokenData({
            client_id: currentUser.client_id || 'preview_mode',
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            custom_message: '🔍 Admin Preview Mode - This is how the public submission form appears to users'
          });
          return;
        }
      } catch (error) {
        // User not logged in or not an admin, continue with token validation
      }
      
      // Parse token from URL
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      
      if (!token) {
        toast.error('Invalid submission link');
        return;
      }

      try {
        const decoded = atob(token);
        const data = JSON.parse(decoded);
        
        // Check expiration
        if (new Date(data.expires_at) < new Date()) {
          toast.error('This submission link has expired');
          return;
        }
        
        setTokenData(data);
      } catch (error) {
        console.error('Token parse error:', error);
        toast.error('Invalid submission link');
      }
    };
    
    checkAccess();
  }, []);

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

  const handleRiskFlagToggle = (flag) => {
    setFormData(prev => ({
      ...prev,
      risk_flags: prev.risk_flags.includes(flag)
        ? prev.risk_flags.filter(f => f !== flag)
        : [...prev.risk_flags, flag]
    }));
  };

  const handleLearningFormatToggle = (format) => {
    setFormData(prev => ({
      ...prev,
      learning_format_preferences: prev.learning_format_preferences.includes(format)
        ? prev.learning_format_preferences.filter(f => f !== format)
        : [...prev.learning_format_preferences, format]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.requester_email || !formData.business_challenge) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.requester_email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');

      const { data } = await base44.functions.invoke('submitPublicRequest', {
        token,
        request_data: {
          ...formData,
          risk_flags: formData.risk_flags.length > 0 ? formData.risk_flags : ['none']
        }
      });

      if (data.success) {
        setSubmitted(true);
        toast.success('Request submitted successfully!');
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error(error.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  if (!tokenData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Link</h2>
            <p className="text-gray-600">
              This submission link is invalid or has expired. Please contact your administrator for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Request Submitted!</h2>
            <p className="text-gray-600 mb-4">
              Thank you for your submission. Our team will review your request and get back to you soon.
            </p>
            <p className="text-sm text-gray-500">
              A confirmation has been sent to {formData.requester_email}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Leadership Development Needs Assessment</CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Help us understand your development needs so we can design the best solution for your team
            </p>
            {tokenData.custom_message && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-gray-700">{tokenData.custom_message}</p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Section 1: Your Information */}
              <Accordion type="single" collapsible defaultValue="section-1" className="border rounded-lg">
                <AccordionItem value="section-1" className="border-0">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm">1</div>
                      <span className="font-semibold">Your Information</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="requester_name">Your Name *</Label>
                        <Input
                          id="requester_name"
                          value={formData.requester_name}
                          onChange={(e) => setFormData({ ...formData, requester_name: e.target.value })}
                          placeholder="John Doe"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="requester_email">Your Email *</Label>
                        <Input
                          id="requester_email"
                          type="email"
                          value={formData.requester_email}
                          onChange={(e) => setFormData({ ...formData, requester_email: e.target.value })}
                          placeholder="john@example.com"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="requester_department">Department</Label>
                        <Input
                          id="requester_department"
                          value={formData.requester_department}
                          onChange={(e) => setFormData({ ...formData, requester_department: e.target.value })}
                          placeholder="e.g., Human Resources, Operations"
                        />
                      </div>

                      <div>
                        <Label htmlFor="requester_role">Your Role</Label>
                        <Input
                          id="requester_role"
                          value={formData.requester_role}
                          onChange={(e) => setFormData({ ...formData, requester_role: e.target.value })}
                          placeholder="e.g., Director of Learning & Development"
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Section 2: The Business Challenge */}
              <Accordion type="single" collapsible className="border rounded-lg">
                <AccordionItem value="section-2" className="border-0">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm">2</div>
                      <span className="font-semibold">The Business Challenge</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 space-y-4">
                    <div>
                      <Label htmlFor="title">Request Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g., New Manager Training for Q2 Promotions"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="business_challenge" className="flex items-center gap-2">
                        What business challenge are you trying to solve? *
                        <HelpCircle className="w-4 h-4 text-gray-400" />
                      </Label>
                      <Textarea
                        id="business_challenge"
                        value={formData.business_challenge}
                        onChange={(e) => setFormData({ ...formData, business_challenge: e.target.value })}
                        placeholder="Describe the problem, opportunity, or business need driving this request..."
                        rows={4}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Example: "New managers are struggling with delegation and time management, leading to team burnout and missed deadlines"
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="current_state">Current State</Label>
                        <Textarea
                          id="current_state"
                          value={formData.current_state}
                          onChange={(e) => setFormData({ ...formData, current_state: e.target.value })}
                          placeholder="What's happening now?"
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label htmlFor="desired_state">Desired State</Label>
                        <Textarea
                          id="desired_state"
                          value={formData.desired_state}
                          onChange={(e) => setFormData({ ...formData, desired_state: e.target.value })}
                          placeholder="What does success look like?"
                          rows={3}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="success_metrics">How will you measure success?</Label>
                      <Textarea
                        id="success_metrics"
                        value={formData.success_metrics}
                        onChange={(e) => setFormData({ ...formData, success_metrics: e.target.value })}
                        placeholder="e.g., 80% of new managers complete program, 20% improvement in employee engagement scores..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="performance_gap">What's the performance gap?</Label>
                      <Textarea
                        id="performance_gap"
                        value={formData.performance_gap}
                        onChange={(e) => setFormData({ ...formData, performance_gap: e.target.value })}
                        placeholder="Describe the gap between current and desired performance..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="root_cause_analysis">Root cause (if known)</Label>
                      <Textarea
                        id="root_cause_analysis"
                        value={formData.root_cause_analysis}
                        onChange={(e) => setFormData({ ...formData, root_cause_analysis: e.target.value })}
                        placeholder="Is this a knowledge gap, skill gap, motivation issue, or systemic barrier?"
                        rows={3}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Not all performance problems require training. Help us understand the root cause.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Section 3: Target Audience */}
              <Accordion type="single" collapsible className="border rounded-lg">
                <AccordionItem value="section-3" className="border-0">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm">3</div>
                      <span className="font-semibold">Target Audience</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 space-y-4">
                    <div>
                      <Label htmlFor="target_audience">Who is this for?</Label>
                      <Textarea
                        id="target_audience"
                        value={formData.target_audience}
                        onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                        placeholder="Describe the target audience..."
                        rows={3}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="audience_size">Estimated Audience Size</Label>
                        <Input
                          id="audience_size"
                          type="number"
                          value={formData.audience_size}
                          onChange={(e) => setFormData({ ...formData, audience_size: e.target.value })}
                          placeholder="Number of participants"
                          min="0"
                        />
                      </div>

                      <div>
                        <Label htmlFor="audience_roles">Roles/Levels</Label>
                        <Input
                          id="audience_roles"
                          value={formData.audience_roles}
                          onChange={(e) => setFormData({ ...formData, audience_roles: e.target.value })}
                          placeholder="e.g., New Managers, Directors, VPs"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="current_skill_level">Current Skill/Knowledge Level</Label>
                      <Select
                        value={formData.current_skill_level}
                        onValueChange={(value) => setFormData({ ...formData, current_skill_level: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select level..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner - Little to no experience</SelectItem>
                          <SelectItem value="intermediate">Intermediate - Some experience, needs refinement</SelectItem>
                          <SelectItem value="advanced">Advanced - Strong foundation, needs strategic depth</SelectItem>
                          <SelectItem value="mixed">Mixed - Varies across the group</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Section 4: Solution Preferences */}
              <Accordion type="single" collapsible className="border rounded-lg">
                <AccordionItem value="section-4" className="border-0">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm">4</div>
                      <span className="font-semibold">Solution Preferences</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 space-y-4">
                    <div>
                      <Label htmlFor="request_type">What type of solution are you looking for?</Label>
                      <Select
                        value={formData.request_type}
                        onValueChange={(value) => setFormData({ ...formData, request_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="learning_content">Learning Content / Curriculum</SelectItem>
                          <SelectItem value="program_creation">Full Program Design</SelectItem>
                          <SelectItem value="assessment_development">Assessment / Diagnostic Tool</SelectItem>
                          <SelectItem value="coaching_support">1:1 or Group Coaching</SelectItem>
                          <SelectItem value="reporting">Analytics / Reporting</SelectItem>
                          <SelectItem value="platform_support">Platform Support</SelectItem>
                          <SelectItem value="other">Not Sure / Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Preferred Learning Formats (select all that apply)</Label>
                      <div className="grid md:grid-cols-2 gap-3 mt-2">
                        {[
                          { value: 'self_paced', label: 'Self-Paced Online' },
                          { value: 'live_virtual', label: 'Live Virtual Sessions' },
                          { value: 'in_person', label: 'In-Person Workshops' },
                          { value: 'blended', label: 'Blended (Mix of Formats)' },
                          { value: 'microlearning', label: 'Microlearning (Short Modules)' },
                          { value: 'cohort_based', label: 'Cohort-Based Program' },
                          { value: 'coaching', label: '1:1 or Group Coaching' },
                          { value: 'job_aids', label: 'Job Aids / Reference Materials' }
                        ].map(format => (
                          <div key={format.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={format.value}
                              checked={formData.learning_format_preferences.includes(format.value)}
                              onCheckedChange={() => handleLearningFormatToggle(format.value)}
                            />
                            <Label htmlFor={format.value} className="text-sm font-normal cursor-pointer">
                              {format.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="preferred_solution_type">Any other preferences or constraints?</Label>
                      <Textarea
                        id="preferred_solution_type"
                        value={formData.preferred_solution_type}
                        onChange={(e) => setFormData({ ...formData, preferred_solution_type: e.target.value })}
                        placeholder="e.g., Must be mobile-friendly, needs to integrate with our LMS, prefer video-based content..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="existing_resources">Do you have any existing materials we can leverage?</Label>
                      <Textarea
                        id="existing_resources"
                        value={formData.existing_resources}
                        onChange={(e) => setFormData({ ...formData, existing_resources: e.target.value })}
                        placeholder="e.g., Existing presentations, videos, competency models, past training materials..."
                        rows={3}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Section 5: Timeline & Budget */}
              <Accordion type="single" collapsible className="border rounded-lg">
                <AccordionItem value="section-5" className="border-0">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm">5</div>
                      <span className="font-semibold">Timeline & Budget</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="timeline_urgency">Timeline Urgency</Label>
                        <Select
                          value={formData.timeline_urgency}
                          onValueChange={(value) => setFormData({ ...formData, timeline_urgency: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select urgency..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="immediate">Immediate (1-2 weeks)</SelectItem>
                            <SelectItem value="urgent">Urgent (1 month)</SelectItem>
                            <SelectItem value="standard">Standard (2-3 months)</SelectItem>
                            <SelectItem value="flexible">Flexible (3+ months)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="due_date">Target Launch/Completion Date</Label>
                        <Input
                          id="due_date"
                          type="date"
                          value={formData.due_date}
                          onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="priority">Priority Level</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) => setFormData({ ...formData, priority: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low - Nice to have</SelectItem>
                          <SelectItem value="medium">Medium - Important but flexible</SelectItem>
                          <SelectItem value="high">High - Critical to business goals</SelectItem>
                          <SelectItem value="urgent">Urgent - Immediate business impact</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="budget_amount">Budget Available (USD)</Label>
                      <Input
                        id="budget_amount"
                        type="number"
                        value={formData.budget_amount}
                        onChange={(e) => setFormData({ ...formData, budget_amount: e.target.value })}
                        placeholder="Enter amount or leave blank if unknown"
                        min="0"
                      />
                    </div>

                    <div>
                      <Label htmlFor="budget_constraints">Budget Constraints or Considerations</Label>
                      <Textarea
                        id="budget_constraints"
                        value={formData.budget_constraints}
                        onChange={(e) => setFormData({ ...formData, budget_constraints: e.target.value })}
                        placeholder="e.g., No budget available, need low/no-cost solution, budget must be approved by CFO, can allocate from training budget..."
                        rows={3}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Section 6: Stakeholders & Approvals */}
              <Accordion type="single" collapsible className="border rounded-lg">
                <AccordionItem value="section-6" className="border-0">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm">6</div>
                      <span className="font-semibold">Stakeholders & Approvals</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 space-y-4">
                    <div>
                      <Label htmlFor="stakeholders">Key Stakeholders</Label>
                      <Textarea
                        id="stakeholders"
                        value={formData.stakeholders}
                        onChange={(e) => setFormData({ ...formData, stakeholders: e.target.value })}
                        placeholder="List anyone who should be involved or informed (names, roles, emails)..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="approval_needed"
                          checked={formData.approval_needed}
                          onCheckedChange={(checked) => setFormData({ ...formData, approval_needed: checked })}
                        />
                        <Label htmlFor="approval_needed" className="text-sm font-normal cursor-pointer">
                          This request requires leadership approval before proceeding
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="requires_leadership_buy_in"
                          checked={formData.requires_leadership_buy_in}
                          onCheckedChange={(checked) => setFormData({ ...formData, requires_leadership_buy_in: checked })}
                        />
                        <Label htmlFor="requires_leadership_buy_in" className="text-sm font-normal cursor-pointer">
                          Leadership buy-in is needed to drive participation
                        </Label>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Section 7: Additional Information */}
              <Accordion type="single" collapsible className="border rounded-lg">
                <AccordionItem value="section-7" className="border-0">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm">7</div>
                      <span className="font-semibold">Additional Information</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 space-y-4">
                    <div>
                      <Label htmlFor="description">Any other context or details?</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Anything else we should know about this request..."
                        rows={4}
                      />
                    </div>

                    <div>
                <Label>Supporting Documents (Optional)</Label>
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
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <strong>What happens next?</strong> Our team will review your needs assessment within 2-3 business days and reach out to schedule a discovery call to discuss solutions.
                </p>
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}