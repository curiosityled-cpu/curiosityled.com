import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { X, Plus, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FormAssistant from "@/components/ai/FormAssistant";

export default function RoleModal({ role, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: "",
    level: "leading_self",
    department: "operations",
    job_summary: "",
    business_value: "",
    essential_duties: [],
    required_qualifications: {
      education: "",
      experience_years: 0,
      technical_skills: [],
      certifications: []
    },
    preferred_qualifications: {
      education: "",
      experience_years: 0,
      technical_skills: [],
      certifications: []
    },
    technical_competencies: [],
    behavioral_competencies: [],
    reporting_structure: {
      reports_to: "",
      direct_reports: 0,
      dotted_line_reports: [],
      key_collaborations: []
    },
    work_environment: {
      location_type: "hybrid",
      physical_office_location: "",
      travel_percentage: 0,
      physical_requirements: [],
      working_conditions: ""
    },
    tools_and_systems: [],
    flsa_status: "exempt",
    compensation_range: {
      min_salary: 0,
      max_salary: 0,
      currency: "USD",
      bonus_structure: "",
      equity: ""
    },
    benefits_highlights: [],
    success_metrics: [],
    eeo_statement: "We are an equal opportunity employer and value diversity at our company.",
    legal_disclaimers: "This is an at-will employment position.",
    is_active: true
  });

  const [newDuty, setNewDuty] = useState("");
  const [newSkill, setNewSkill] = useState("");
  const [newCert, setNewCert] = useState("");
  const [newPrefSkill, setNewPrefSkill] = useState("");
  const [newPrefCert, setNewPrefCert] = useState("");
  const [newTechnicalComp, setNewTechnicalComp] = useState({ name: "", target_score: 80, weight: 1 });
  const [newBehavioralComp, setNewBehavioralComp] = useState({ name: "", target_score: 80, weight: 1 });
  const [newDottedLine, setNewDottedLine] = useState("");
  const [newCollaboration, setNewCollaboration] = useState("");
  const [newPhysicalReq, setNewPhysicalReq] = useState("");
  const [newTool, setNewTool] = useState("");
  const [newBenefit, setNewBenefit] = useState("");
  const [newMetric, setNewMetric] = useState("");
  const [availableCompetencies, setAvailableCompetencies] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCompetencies();
    }
    if (role) {
      setFormData({
        title: role.title || "",
        level: role.level || "leading_self",
        department: role.department || "operations",
        job_summary: role.job_summary || "",
        business_value: role.business_value || "",
        essential_duties: role.essential_duties || [],
        required_qualifications: role.required_qualifications || {
          education: "",
          experience_years: 0,
          technical_skills: [],
          certifications: []
        },
        preferred_qualifications: role.preferred_qualifications || {
          education: "",
          experience_years: 0,
          technical_skills: [],
          certifications: []
        },
        technical_competencies: role.technical_competencies || [],
        behavioral_competencies: role.behavioral_competencies || [],
        reporting_structure: role.reporting_structure || {
          reports_to: "",
          direct_reports: 0,
          dotted_line_reports: [],
          key_collaborations: []
        },
        work_environment: role.work_environment || {
          location_type: "hybrid",
          physical_office_location: "",
          travel_percentage: 0,
          physical_requirements: [],
          working_conditions: ""
        },
        tools_and_systems: role.tools_and_systems || [],
        flsa_status: role.flsa_status || "exempt",
        compensation_range: role.compensation_range || {
          min_salary: 0,
          max_salary: 0,
          currency: "USD",
          bonus_structure: "",
          equity: ""
        },
        benefits_highlights: role.benefits_highlights || [],
        success_metrics: role.success_metrics || [],
        eeo_statement: role.eeo_statement || "We are an equal opportunity employer and value diversity at our company.",
        legal_disclaimers: role.legal_disclaimers || "This is an at-will employment position.",
        is_active: role.is_active !== false
      });
    }
  }, [role, isOpen]);

  const loadCompetencies = async () => {
    try {
      const comps = await base44.entities.Competency.list();
      setAvailableCompetencies(comps);
    } catch (error) {
      console.error("Error loading competencies:", error);
    }
  };

  const addDuty = () => {
    if (newDuty.trim()) {
      setFormData({
        ...formData,
        essential_duties: [...formData.essential_duties, newDuty.trim()]
      });
      setNewDuty("");
    }
  };

  const removeDuty = (index) => {
    setFormData({
      ...formData,
      essential_duties: formData.essential_duties.filter((_, i) => i !== index)
    });
  };

  const addSkill = () => {
    if (newSkill.trim()) {
      setFormData({
        ...formData,
        required_qualifications: {
          ...formData.required_qualifications,
          technical_skills: [...formData.required_qualifications.technical_skills, newSkill.trim()]
        }
      });
      setNewSkill("");
    }
  };

  const removeSkill = (index) => {
    setFormData({
      ...formData,
      required_qualifications: {
        ...formData.required_qualifications,
        technical_skills: formData.required_qualifications.technical_skills.filter((_, i) => i !== index)
      }
    });
  };

  const addCert = () => {
    if (newCert.trim()) {
      setFormData({
        ...formData,
        required_qualifications: {
          ...formData.required_qualifications,
          certifications: [...formData.required_qualifications.certifications, newCert.trim()]
        }
      });
      setNewCert("");
    }
  };

  const removeCert = (index) => {
    setFormData({
      ...formData,
      required_qualifications: {
        ...formData.required_qualifications,
        certifications: formData.required_qualifications.certifications.filter((_, i) => i !== index)
      }
    });
  };

  const addPrefSkill = () => {
    if (newPrefSkill.trim()) {
      setFormData({
        ...formData,
        preferred_qualifications: {
          ...formData.preferred_qualifications,
          technical_skills: [...formData.preferred_qualifications.technical_skills, newPrefSkill.trim()]
        }
      });
      setNewPrefSkill("");
    }
  };

  const removePrefSkill = (index) => {
    setFormData({
      ...formData,
      preferred_qualifications: {
        ...formData.preferred_qualifications,
        technical_skills: formData.preferred_qualifications.technical_skills.filter((_, i) => i !== index)
      }
    });
  };

  const addPrefCert = () => {
    if (newPrefCert.trim()) {
      setFormData({
        ...formData,
        preferred_qualifications: {
          ...formData.preferred_qualifications,
          certifications: [...formData.preferred_qualifications.certifications, newPrefCert.trim()]
        }
      });
      setNewPrefCert("");
    }
  };

  const removePrefCert = (index) => {
    setFormData({
      ...formData,
      preferred_qualifications: {
        ...formData.preferred_qualifications,
        certifications: formData.preferred_qualifications.certifications.filter((_, i) => i !== index)
      }
    });
  };

  const addTechnicalComp = () => {
    if (newTechnicalComp.name) {
      setFormData({
        ...formData,
        technical_competencies: [...formData.technical_competencies, { ...newTechnicalComp }]
      });
      setNewTechnicalComp({ name: "", target_score: 80, weight: 1 });
    }
  };

  const removeTechnicalComp = (index) => {
    setFormData({
      ...formData,
      technical_competencies: formData.technical_competencies.filter((_, i) => i !== index)
    });
  };

  const addBehavioralComp = () => {
    if (newBehavioralComp.name) {
      setFormData({
        ...formData,
        behavioral_competencies: [...formData.behavioral_competencies, { ...newBehavioralComp }]
      });
      setNewBehavioralComp({ name: "", target_score: 80, weight: 1 });
    }
  };

  const removeBehavioralComp = (index) => {
    setFormData({
      ...formData,
      behavioral_competencies: formData.behavioral_competencies.filter((_, i) => i !== index)
    });
  };

  const addDottedLine = () => {
    if (newDottedLine.trim()) {
      setFormData({
        ...formData,
        reporting_structure: {
          ...formData.reporting_structure,
          dotted_line_reports: [...formData.reporting_structure.dotted_line_reports, newDottedLine.trim()]
        }
      });
      setNewDottedLine("");
    }
  };

  const removeDottedLine = (index) => {
    setFormData({
      ...formData,
      reporting_structure: {
        ...formData.reporting_structure,
        dotted_line_reports: formData.reporting_structure.dotted_line_reports.filter((_, i) => i !== index)
      }
    });
  };

  const addCollaboration = () => {
    if (newCollaboration.trim()) {
      setFormData({
        ...formData,
        reporting_structure: {
          ...formData.reporting_structure,
          key_collaborations: [...formData.reporting_structure.key_collaborations, newCollaboration.trim()]
        }
      });
      setNewCollaboration("");
    }
  };

  const removeCollaboration = (index) => {
    setFormData({
      ...formData,
      reporting_structure: {
        ...formData.reporting_structure,
        key_collaborations: formData.reporting_structure.key_collaborations.filter((_, i) => i !== index)
      }
    });
  };

  const addPhysicalReq = () => {
    if (newPhysicalReq.trim()) {
      setFormData({
        ...formData,
        work_environment: {
          ...formData.work_environment,
          physical_requirements: [...formData.work_environment.physical_requirements, newPhysicalReq.trim()]
        }
      });
      setNewPhysicalReq("");
    }
  };

  const removePhysicalReq = (index) => {
    setFormData({
      ...formData,
      work_environment: {
        ...formData.work_environment,
        physical_requirements: formData.work_environment.physical_requirements.filter((_, i) => i !== index)
      }
    });
  };

  const addTool = () => {
    if (newTool.trim()) {
      setFormData({
        ...formData,
        tools_and_systems: [...formData.tools_and_systems, newTool.trim()]
      });
      setNewTool("");
    }
  };

  const removeTool = (index) => {
    setFormData({
      ...formData,
      tools_and_systems: formData.tools_and_systems.filter((_, i) => i !== index)
    });
  };

  const addBenefit = () => {
    if (newBenefit.trim()) {
      setFormData({
        ...formData,
        benefits_highlights: [...formData.benefits_highlights, newBenefit.trim()]
      });
      setNewBenefit("");
    }
  };

  const removeBenefit = (index) => {
    setFormData({
      ...formData,
      benefits_highlights: formData.benefits_highlights.filter((_, i) => i !== index)
    });
  };

  const addMetric = () => {
    if (newMetric.trim()) {
      setFormData({
        ...formData,
        success_metrics: [...formData.success_metrics, newMetric.trim()]
      });
      setNewMetric("");
    }
  };

  const removeMetric = (index) => {
    setFormData({
      ...formData,
      success_metrics: formData.success_metrics.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.job_summary || formData.essential_duties.length === 0) {
      toast.error("Please fill in all required fields (Title, Job Summary, and at least one Essential Duty)");
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        updated_date: new Date().toISOString()
      };
      
      if (role) {
        await base44.entities.Role.update(role.id, dataToSave);
        toast.success("Role updated successfully");
      } else {
        await base44.entities.Role.create(dataToSave);
        toast.success("Role created successfully");
      }
      onSave();
      onClose();
    } catch (error) {
      console.error("Error saving role:", error);
      toast.error(error.message || "Failed to save role");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!role || !confirm("Are you sure you want to delete this role?")) return;
    
    setSaving(true);
    try {
      await base44.entities.Role.delete(role.id);
      toast.success("Role deleted successfully");
      onSave();
      onClose();
    } catch (error) {
      console.error("Error deleting role:", error);
      toast.error(error.message || "Failed to delete role");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {role ? "Edit Role" : "Create New Role"}
            <Badge variant="outline" className="text-xs">SHRM-Aligned</Badge>
          </DialogTitle>
        </DialogHeader>

        {!role && (
          <FormAssistant
            formSchema={{
              type: "object",
              properties: {
                title: { type: "string" },
                level: { type: "string", enum: ["leading_self", "leading_others", "leading_managers", "leading_functions", "leading_organizations"] },
                department: { type: "string", enum: ["operations", "sales", "product", "technology", "finance", "hr", "marketing", "corporate"] },
                job_summary: { type: "string" },
                business_value: { type: "string" }
              }
            }}
            onApply={(data) => setFormData(prev => ({ ...prev, ...data }))}
            formType="role"
            placeholder="Describe the role, e.g., 'A Senior Product Manager in the Product department who leads cross-functional teams and drives strategic product initiatives'"
            compact={true}
          />
        )}
        
        <Tabs defaultValue="basics" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="basics">Basics</TabsTrigger>
            <TabsTrigger value="qualifications">Qualifications</TabsTrigger>
            <TabsTrigger value="competencies">Competencies</TabsTrigger>
            <TabsTrigger value="structure">Structure</TabsTrigger>
            <TabsTrigger value="environment">Environment</TabsTrigger>
            <TabsTrigger value="compensation">Compensation</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {/* Basics Tab */}
            <TabsContent value="basics" className="space-y-4">
              <div>
                <Label>Job Title * <span className="text-xs text-gray-500">(Clear, market-aligned, searchable)</span></Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Senior Product Manager"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Leadership Level *</Label>
                  <Select value={formData.level} onValueChange={(value) => setFormData({ ...formData, level: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leading_self">Leading Self</SelectItem>
                      <SelectItem value="leading_others">Leading Others</SelectItem>
                      <SelectItem value="leading_managers">Leading Managers</SelectItem>
                      <SelectItem value="leading_functions">Leading Functions</SelectItem>
                      <SelectItem value="leading_organizations">Leading Organizations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Department *</Label>
                  <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operations">Operations</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="product">Product</SelectItem>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="hr">HR</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="corporate">Corporate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Job Summary * <span className="text-xs text-gray-500">(2-4 sentences highlighting business impact)</span></Label>
                <Textarea
                  value={formData.job_summary}
                  onChange={(e) => setFormData({ ...formData, job_summary: e.target.value })}
                  placeholder="Position the role in the business ecosystem. What is the elevator pitch for this job?"
                  rows={4}
                  required
                />
              </div>

              <div>
                <Label>Business Value <span className="text-xs text-gray-500">(Core business outcomes)</span></Label>
                <Textarea
                  value={formData.business_value}
                  onChange={(e) => setFormData({ ...formData, business_value: e.target.value })}
                  placeholder="What business outcomes is this role accountable for?"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Essential Duties & Responsibilities * <span className="text-xs text-gray-500">(6-12 prioritized, outcome-focused)</span></Label>
                <div className="flex gap-2">
                  <Input
                    value={newDuty}
                    onChange={(e) => setNewDuty(e.target.value)}
                    placeholder="Start with action verbs, focus on outcomes..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDuty())}
                  />
                  <Button type="button" onClick={addDuty} size="icon">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {formData.essential_duties.map((duty, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                      <span>{idx + 1}. {duty}</span>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeDuty(idx)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Success Metrics <span className="text-xs text-gray-500">(KPIs and measurable outcomes)</span></Label>
                <div className="flex gap-2">
                  <Input
                    value={newMetric}
                    onChange={(e) => setNewMetric(e.target.value)}
                    placeholder="Add a success metric..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMetric())}
                  />
                  <Button type="button" onClick={addMetric} size="icon">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {formData.success_metrics.map((metric, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                      <span>{metric}</span>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeMetric(idx)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Qualifications Tab */}
            <TabsContent value="qualifications" className="space-y-6">
              <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Required Qualifications (Non-Negotiable)
                </h3>
                
                <div>
                  <Label>Education</Label>
                  <Input
                    value={formData.required_qualifications.education}
                    onChange={(e) => setFormData({
                      ...formData,
                      required_qualifications: {
                        ...formData.required_qualifications,
                        education: e.target.value
                      }
                    })}
                    placeholder="e.g., Bachelor's degree in Computer Science"
                  />
                </div>

                <div>
                  <Label>Years of Experience</Label>
                  <Input
                    type="number"
                    value={formData.required_qualifications.experience_years}
                    onChange={(e) => setFormData({
                      ...formData,
                      required_qualifications: {
                        ...formData.required_qualifications,
                        experience_years: parseInt(e.target.value) || 0
                      }
                    })}
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Technical Skills (Must-Have)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Add required technical skill..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    />
                    <Button type="button" onClick={addSkill} size="icon">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {formData.required_qualifications.technical_skills.map((skill, idx) => (
                      <Badge key={idx} variant="default" className="cursor-pointer" onClick={() => removeSkill(idx)}>
                        {skill} <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Required Certifications/Licenses
                    <Info className="w-3 h-3 text-blue-500" title="Examples: PMP, CSM, CPA, PE License" />
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={newCert}
                      onChange={(e) => setNewCert(e.target.value)}
                      placeholder="e.g., PMP, CSM, CPA, Six Sigma Black Belt..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCert())}
                    />
                    <Button type="button" onClick={addCert} size="icon">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {formData.required_qualifications.certifications.map((cert, idx) => (
                      <Badge key={idx} variant="default" className="cursor-pointer" onClick={() => removeCert(idx)}>
                        {cert} <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-4 border rounded-lg bg-green-50">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Preferred Qualifications (Value-Add)
                </h3>
                
                <div>
                  <Label>Education</Label>
                  <Input
                    value={formData.preferred_qualifications.education}
                    onChange={(e) => setFormData({
                      ...formData,
                      preferred_qualifications: {
                        ...formData.preferred_qualifications,
                        education: e.target.value
                      }
                    })}
                    placeholder="e.g., Master's degree preferred"
                  />
                </div>

                <div>
                  <Label>Years of Experience</Label>
                  <Input
                    type="number"
                    value={formData.preferred_qualifications.experience_years}
                    onChange={(e) => setFormData({
                      ...formData,
                      preferred_qualifications: {
                        ...formData.preferred_qualifications,
                        experience_years: parseInt(e.target.value) || 0
                      }
                    })}
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Technical Skills (Nice-to-Have)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newPrefSkill}
                      onChange={(e) => setNewPrefSkill(e.target.value)}
                      placeholder="Add preferred technical skill..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPrefSkill())}
                    />
                    <Button type="button" onClick={addPrefSkill} size="icon">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {formData.preferred_qualifications.technical_skills.map((skill, idx) => (
                      <Badge key={idx} variant="secondary" className="cursor-pointer" onClick={() => removePrefSkill(idx)}>
                        {skill} <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Preferred Certifications
                    <Info className="w-3 h-3 text-green-500" title="Nice-to-have certifications that add value" />
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={newPrefCert}
                      onChange={(e) => setNewPrefCert(e.target.value)}
                      placeholder="e.g., Agile Certified Practitioner, ITIL..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPrefCert())}
                    />
                    <Button type="button" onClick={addPrefCert} size="icon">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {formData.preferred_qualifications.certifications.map((cert, idx) => (
                      <Badge key={idx} variant="secondary" className="cursor-pointer" onClick={() => removePrefCert(idx)}>
                        {cert} <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Competencies Tab */}
            <TabsContent value="competencies" className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Technical Competencies <span className="text-xs text-gray-500">(Role-specific proficiencies)</span></h3>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">
                    <Select value={newTechnicalComp.name} onValueChange={(value) => setNewTechnicalComp({ ...newTechnicalComp, name: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select competency" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCompetencies.filter(c => c.category === 'Tactical' || c.category === 'Situational Intelligence').map((comp) => (
                          <SelectItem key={comp.id} value={comp.name}>{comp.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      placeholder="Target %"
                      value={newTechnicalComp.target_score}
                      onChange={(e) => setNewTechnicalComp({ ...newTechnicalComp, target_score: parseInt(e.target.value) || 80 })}
                      min="0"
                      max="100"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Weight"
                      value={newTechnicalComp.weight}
                      onChange={(e) => setNewTechnicalComp({ ...newTechnicalComp, weight: parseFloat(e.target.value) || 1 })}
                      min="0"
                      step="0.1"
                    />
                  </div>
                  <div className="col-span-1">
                    <Button type="button" onClick={addTechnicalComp} size="icon">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {formData.technical_competencies.map((comp, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-blue-50 p-2 rounded text-sm">
                      <div className="flex gap-2 items-center flex-1">
                        <span className="font-medium">{comp.name}</span>
                        <Badge variant="outline">{comp.target_score}% target</Badge>
                        <Badge variant="secondary">weight: {comp.weight}</Badge>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeTechnicalComp(idx)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Behavioral/Leadership Competencies <span className="text-xs text-gray-500">(Communication, teamwork, adaptability)</span></h3>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">
                    <Select value={newBehavioralComp.name} onValueChange={(value) => setNewBehavioralComp({ ...newBehavioralComp, name: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select competency" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCompetencies.filter(c => c.category === 'Self Leadership' || c.category === 'People Leadership').map((comp) => (
                          <SelectItem key={comp.id} value={comp.name}>{comp.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      placeholder="Target %"
                      value={newBehavioralComp.target_score}
                      onChange={(e) => setNewBehavioralComp({ ...newBehavioralComp, target_score: parseInt(e.target.value) || 80 })}
                      min="0"
                      max="100"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Weight"
                      value={newBehavioralComp.weight}
                      onChange={(e) => setNewBehavioralComp({ ...newBehavioralComp, weight: parseFloat(e.target.value) || 1 })}
                      min="0"
                      step="0.1"
                    />
                  </div>
                  <div className="col-span-1">
                    <Button type="button" onClick={addBehavioralComp} size="icon">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {formData.behavioral_competencies.map((comp, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-purple-50 p-2 rounded text-sm">
                      <div className="flex gap-2 items-center flex-1">
                        <span className="font-medium">{comp.name}</span>
                        <Badge variant="outline">{comp.target_score}% target</Badge>
                        <Badge variant="secondary">weight: {comp.weight}</Badge>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeBehavioralComp(idx)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Structure Tab */}
            <TabsContent value="structure" className="space-y-4">
              <div>
                <Label>Reports To</Label>
                <Input
                  value={formData.reporting_structure.reports_to}
                  onChange={(e) => setFormData({
                    ...formData,
                    reporting_structure: {
                      ...formData.reporting_structure,
                      reports_to: e.target.value
                    }
                  })}
                  placeholder="e.g., Director of Product Management"
                />
              </div>

              <div>
                <Label>Number of Direct Reports</Label>
                <Input
                  type="number"
                  value={formData.reporting_structure.direct_reports}
                  onChange={(e) => setFormData({
                    ...formData,
                    reporting_structure: {
                      ...formData.reporting_structure,
                      direct_reports: parseInt(e.target.value) || 0
                    }
                  })}
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label>Dotted Line Reports</Label>
                <div className="flex gap-2">
                  <Input
                    value={newDottedLine}
                    onChange={(e) => setNewDottedLine(e.target.value)}
                    placeholder="Add dotted line reporting relationship..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDottedLine())}
                  />
                  <Button type="button" onClick={addDottedLine} size="icon">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1">
                  {formData.reporting_structure.dotted_line_reports.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                      <span>{item}</span>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeDottedLine(idx)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Key Collaborations <span className="text-xs text-gray-500">(Teams and roles this position works with)</span></Label>
                <div className="flex gap-2">
                  <Input
                    value={newCollaboration}
                    onChange={(e) => setNewCollaboration(e.target.value)}
                    placeholder="Add collaboration team/role..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCollaboration())}
                  />
                  <Button type="button" onClick={addCollaboration} size="icon">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {formData.reporting_structure.key_collaborations.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                      <span>{item}</span>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeCollaboration(idx)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Environment Tab */}
            <TabsContent value="environment" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Work Location Type</Label>
                  <Select
                    value={formData.work_environment.location_type}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      work_environment: {
                        ...formData.work_environment,
                        location_type: value
                      }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remote">Remote</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="on_site">On-Site</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Travel Percentage</Label>
                  <Input
                    type="number"
                    value={formData.work_environment.travel_percentage}
                    onChange={(e) => setFormData({
                      ...formData,
                      work_environment: {
                        ...formData.work_environment,
                        travel_percentage: parseInt(e.target.value) || 0
                      }
                    })}
                    min="0"
                    max="100"
                    placeholder="%"
                  />
                </div>
              </div>

              <div>
                <Label>Physical Office Location</Label>
                <Input
                  value={formData.work_environment.physical_office_location}
                  onChange={(e) => setFormData({
                    ...formData,
                    work_environment: {
                      ...formData.work_environment,
                      physical_office_location: e.target.value
                    }
                  })}
                  placeholder="e.g., San Francisco, CA"
                />
              </div>

              <div>
                <Label>Working Conditions</Label>
                <Textarea
                  value={formData.work_environment.working_conditions}
                  onChange={(e) => setFormData({
                    ...formData,
                    work_environment: {
                      ...formData.work_environment,
                      working_conditions: e.target.value
                    }
                  })}
                  placeholder="Any special working conditions..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Physical Requirements <span className="text-xs text-gray-500">(ADA Compliance)</span></Label>
                <div className="flex gap-2">
                  <Input
                    value={newPhysicalReq}
                    onChange={(e) => setNewPhysicalReq(e.target.value)}
                    placeholder="Add physical requirement..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPhysicalReq())}
                  />
                  <Button type="button" onClick={addPhysicalReq} size="icon">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1">
                  {formData.work_environment.physical_requirements.map((req, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                      <span>{req}</span>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removePhysicalReq(idx)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tools, Systems & Technology</Label>
                <div className="flex gap-2">
                  <Input
                    value={newTool}
                    onChange={(e) => setNewTool(e.target.value)}
                    placeholder="Add tool or system..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTool())}
                  />
                  <Button type="button" onClick={addTool} size="icon">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {formData.tools_and_systems.map((tool, idx) => (
                    <Badge key={idx} variant="outline" className="cursor-pointer" onClick={() => removeTool(idx)}>
                      {tool} <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Compensation Tab */}
            <TabsContent value="compensation" className="space-y-4">
              <div>
                <Label>FLSA Status</Label>
                <Select
                  value={formData.flsa_status}
                  onValueChange={(value) => setFormData({ ...formData, flsa_status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exempt">Exempt</SelectItem>
                    <SelectItem value="non_exempt">Non-Exempt</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Min Salary</Label>
                  <Input
                    type="number"
                    value={formData.compensation_range.min_salary}
                    onChange={(e) => setFormData({
                      ...formData,
                      compensation_range: {
                        ...formData.compensation_range,
                        min_salary: parseInt(e.target.value) || 0
                      }
                    })}
                    min="0"
                  />
                </div>
                <div>
                  <Label>Max Salary</Label>
                  <Input
                    type="number"
                    value={formData.compensation_range.max_salary}
                    onChange={(e) => setFormData({
                      ...formData,
                      compensation_range: {
                        ...formData.compensation_range,
                        max_salary: parseInt(e.target.value) || 0
                      }
                    })}
                    min="0"
                  />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Input
                    value={formData.compensation_range.currency}
                    onChange={(e) => setFormData({
                      ...formData,
                      compensation_range: {
                        ...formData.compensation_range,
                        currency: e.target.value
                      }
                    })}
                    placeholder="USD"
                  />
                </div>
              </div>

              <div>
                <Label>Bonus/Commission Structure</Label>
                <Textarea
                  value={formData.compensation_range.bonus_structure}
                  onChange={(e) => setFormData({
                    ...formData,
                    compensation_range: {
                      ...formData.compensation_range,
                      bonus_structure: e.target.value
                    }
                  })}
                  placeholder="Describe bonus or commission structure..."
                  rows={2}
                />
              </div>

              <div>
                <Label>Equity Compensation</Label>
                <Textarea
                  value={formData.compensation_range.equity}
                  onChange={(e) => setFormData({
                    ...formData,
                    compensation_range: {
                      ...formData.compensation_range,
                      equity: e.target.value
                    }
                  })}
                  placeholder="Stock options, RSUs, etc..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Benefits Highlights</Label>
                <div className="flex gap-2">
                  <Input
                    value={newBenefit}
                    onChange={(e) => setNewBenefit(e.target.value)}
                    placeholder="Add benefit..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                  />
                  <Button type="button" onClick={addBenefit} size="icon">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {formData.benefits_highlights.map((benefit, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                      <span>{benefit}</span>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeBenefit(idx)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>EEO Statement</Label>
                <Textarea
                  value={formData.eeo_statement}
                  onChange={(e) => setFormData({ ...formData, eeo_statement: e.target.value })}
                  placeholder="Equal Employment Opportunity statement..."
                  rows={2}
                />
              </div>

              <div>
                <Label>Legal Disclaimers</Label>
                <Textarea
                  value={formData.legal_disclaimers}
                  onChange={(e) => setFormData({ ...formData, legal_disclaimers: e.target.value })}
                  placeholder="At-will employment and other legal disclaimers..."
                  rows={2}
                />
              </div>
            </TabsContent>

            <DialogFooter className="gap-2 pt-4 border-t">
              {role && (
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={saving}>
                  Delete
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : role ? "Update Role" : "Create Role"}
              </Button>
            </DialogFooter>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}