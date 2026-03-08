import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import AIEnhancedInput from "@/components/ai/AIEnhancedInput";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, Edit, Trash2, Search, Filter, CheckCircle, 
  XCircle, FileText, Users, Lock, Globe, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import PageHeader from "@/components/common/PageHeader";
import FormAssistant from "@/components/ai/FormAssistant";

function CustomAssessmentBuilder() {
  const [assessments, setAssessments] = useState([]);
  const [filteredAssessments, setFilteredAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Form state
  const [showDialog, setShowDialog] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "custom_assessment",
    status: "draft",
    access_mode: "closed",
    assigned_user_emails: [],
    allow_admin_self_enrollment: false,
    passing_score_percentage: 70,
    learning_resource_ids: [],
    competency_ids: [],
    config: "{}"
  });
  const [saving, setSaving] = useState(false);

  // Selection dialogs
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [showCompetencySelector, setShowCompetencySelector] = useState(false);
  const [showResourceSelector, setShowResourceSelector] = useState(false);

  // Available options
  const [allUsers, setAllUsers] = useState([]);
  const [allCompetencies, setAllCompetencies] = useState([]);
  const [allResources, setAllResources] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterAssessments();
  }, [assessments, searchTerm, filterType, filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assessmentsData, usersData, competenciesData, resourcesData] = await Promise.all([
        base44.entities.CustomAssessment.list('-created_date'),
        base44.entities.User.list(),
        base44.entities.Competency.list(),
        base44.entities.LearningResource.filter({ is_active: true })
      ]);

      setAssessments(assessmentsData);
      setAllUsers(usersData);
      setAllCompetencies(competenciesData);
      setAllResources(resourcesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  const filterAssessments = () => {
    let filtered = [...assessments];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        a.title?.toLowerCase().includes(term) ||
        a.description?.toLowerCase().includes(term)
      );
    }

    if (filterType !== "all") {
      filtered = filtered.filter(a => a.type === filterType);
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter(a => a.status === filterStatus);
    }

    setFilteredAssessments(filtered);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const openCreateDialog = () => {
    setEditingAssessment(null);
    setFormData({
      title: "",
      description: "",
      type: "custom_assessment",
      status: "draft",
      access_mode: "closed",
      assigned_user_emails: [],
      allow_admin_self_enrollment: false,
      passing_score_percentage: 70,
      learning_resource_ids: [],
      competency_ids: [],
      config: "{}"
    });
    setShowDialog(true);
  };

  const openEditDialog = (assessment) => {
    setEditingAssessment(assessment);
    setFormData({
      title: assessment.title || "",
      description: assessment.description || "",
      type: assessment.type || "custom_assessment",
      status: assessment.status || "draft",
      access_mode: assessment.access_mode || "closed",
      assigned_user_emails: assessment.assigned_user_emails || [],
      allow_admin_self_enrollment: assessment.allow_admin_self_enrollment || false,
      passing_score_percentage: assessment.passing_score_percentage || 70,
      learning_resource_ids: assessment.learning_resource_ids || [],
      competency_ids: assessment.competency_ids || [],
      config: JSON.stringify(assessment.config || {}, null, 2)
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    // Validate JSON config
    try {
      JSON.parse(formData.config);
    } catch (error) {
      toast.error('Invalid JSON in config field');
      return;
    }

    setSaving(true);
    try {
      const saveData = {
        ...formData,
        config: JSON.parse(formData.config)
      };

      if (editingAssessment) {
        await base44.entities.CustomAssessment.update(editingAssessment.id, saveData);
        toast.success('Assessment updated successfully');
      } else {
        await base44.entities.CustomAssessment.create(saveData);
        toast.success('Assessment created successfully');
      }

      setShowDialog(false);
      await loadData();
    } catch (error) {
      console.error('Error saving assessment:', error);
      toast.error('Failed to save assessment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (assessmentId) => {
    if (!confirm('Are you sure you want to delete this assessment?')) {
      return;
    }

    try {
      await base44.entities.CustomAssessment.delete(assessmentId);
      toast.success('Assessment deleted successfully');
      await loadData();
    } catch (error) {
      console.error('Error deleting assessment:', error);
      toast.error('Failed to delete assessment');
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      draft: { className: "bg-gray-100 text-gray-800", label: "Draft" },
      published: { className: "bg-green-100 text-green-800", label: "Published" },
      archived: { className: "bg-red-100 text-red-800", label: "Archived" }
    };
    return config[status] || config.draft;
  };

  const getAccessBadge = (accessMode) => {
    if (accessMode === "open") {
      return { icon: Globe, className: "bg-blue-100 text-blue-800", label: "Open" };
    }
    return { icon: Lock, className: "bg-orange-100 text-orange-800", label: "Closed" };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#0202ff' }} />
          <p className="text-gray-600">Loading assessments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PageHeader
          title="Custom Assessment Builder"
          subtitle="Create and manage custom assessments for your organization"
          badges={[
            { text: 'Admin Tool', className: "bg-white text-purple-600" },
            { text: `${assessments.length} Assessments`, className: "bg-white text-blue-600" }
          ]}
          onRefresh={handleRefresh}
          loadingRefresh={refreshing}
          headerColor="#0201ff"
        />

        {/* Create Assessment Button */}
        <div className="mb-6">
          <Button
            onClick={openCreateDialog}
            style={{ backgroundColor: '#0202ff' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0101dd'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0202ff'}
            className="text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Assessment
          </Button>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-lg mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search assessments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="knowledge_check">Knowledge Check</SelectItem>
                  <SelectItem value="custom_assessment">Custom Assessment</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Assessments List */}
        <div className="space-y-4">
          <AnimatePresence>
            {filteredAssessments.length === 0 ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-12 text-center">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Assessments Found</h3>
                  <p className="text-gray-600 mb-6">
                    {searchTerm || filterType !== 'all' || filterStatus !== 'all' 
                      ? 'Try adjusting your filters' 
                      : 'Get started by creating your first assessment'}
                  </p>
                  {!searchTerm && filterType === 'all' && filterStatus === 'all' && (
                    <Button onClick={openCreateDialog}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Assessment
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredAssessments.map((assessment, idx) => {
                const statusBadge = getStatusBadge(assessment.status);
                const accessBadge = getAccessBadge(assessment.access_mode);
                const AccessIcon = accessBadge.icon;

                return (
                  <motion.div
                    key={assessment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: Math.min(idx * 0.05, 0.3) }}
                  >
                    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-semibold text-gray-900">{assessment.title}</h3>
                              <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
                              <Badge className={accessBadge.className}>
                                <AccessIcon className="w-3 h-3 mr-1" />
                                {accessBadge.label}
                              </Badge>
                              {assessment.allow_admin_self_enrollment && (
                                <Badge variant="outline" className="text-xs">
                                  <Users className="w-3 h-3 mr-1" />
                                  Admin Self-Enroll
                                </Badge>
                              )}
                            </div>
                            
                            {assessment.description && (
                              <p className="text-gray-600 mb-3">{assessment.description}</p>
                            )}

                            <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                              <span>Type: {assessment.type}</span>
                              {assessment.passing_score_percentage && (
                                <span>• Passing: {assessment.passing_score_percentage}%</span>
                              )}
                              {assessment.assigned_user_emails?.length > 0 && (
                                <span>• {assessment.assigned_user_emails.length} Assigned</span>
                              )}
                              {assessment.competency_ids?.length > 0 && (
                                <span>• {assessment.competency_ids.length} Competencies</span>
                              )}
                              {assessment.learning_resource_ids?.length > 0 && (
                                <span>• {assessment.learning_resource_ids.length} Resources</span>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openEditDialog(assessment)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDelete(assessment.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAssessment ? 'Edit Assessment' : 'Create New Assessment'}
              </DialogTitle>
            </DialogHeader>

            {!editingAssessment && (
              <FormAssistant
                formSchema={{
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    type: { type: "string", enum: ["quiz", "knowledge_check", "custom_assessment"] },
                    passing_score_percentage: { type: "number" }
                  }
                }}
                onApply={(data) => setFormData(prev => ({ ...prev, ...data }))}
                formType="custom_assessment"
                placeholder="Describe the assessment you want to create, e.g., 'A sales leadership quiz with 20 questions covering negotiation and client management'"
                compact={true}
              />
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <AIEnhancedInput
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  fieldName="title"
                  fieldType="assessment_title"
                  formContext={{ type: formData.type }}
                  placeholder="e.g., Sales Leadership Assessment"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <AIEnhancedInput
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  fieldName="description"
                  fieldType="assessment_description"
                  formContext={{ title: formData.title, type: formData.type }}
                  multiline={true}
                  placeholder="Describe the purpose and content of this assessment"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quiz">Quiz</SelectItem>
                      <SelectItem value="knowledge_check">Knowledge Check</SelectItem>
                      <SelectItem value="custom_assessment">Custom Assessment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
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
              </div>

              <div className="space-y-2">
                <Label>Access Mode</Label>
                <Select
                  value={formData.access_mode}
                  onValueChange={(value) => setFormData({ ...formData, access_mode: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Open (Anyone can take)
                      </div>
                    </SelectItem>
                    <SelectItem value="closed">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Closed (Assignment required)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.access_mode === 'closed' && (
                <div className="space-y-2">
                  <Label>Assigned Users ({formData.assigned_user_emails.length})</Label>
                  <div className="flex flex-wrap gap-2 p-3 border rounded-lg min-h-[50px]">
                    {formData.assigned_user_emails.map(email => (
                      <Badge key={email} variant="secondary">
                        {email}
                        <button
                          onClick={() => setFormData({
                            ...formData,
                            assigned_user_emails: formData.assigned_user_emails.filter(e => e !== email)
                          })}
                          className="ml-2 hover:text-red-600"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUserSelector(true)}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Select Users
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formData.allow_admin_self_enrollment}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, allow_admin_self_enrollment: checked })
                  }
                />
                <Label>Allow admin self-enrollment (requires User/Team Leader permissions)</Label>
              </div>

              <div className="space-y-2">
                <Label>Passing Score (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.passing_score_percentage}
                  onChange={(e) => setFormData({ ...formData, passing_score_percentage: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Configuration (JSON)</Label>
                <Textarea
                  value={formData.config}
                  onChange={(e) => setFormData({ ...formData, config: e.target.value })}
                  placeholder='{"questions": [], "scoring": {}}'
                  rows={5}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500">
                  Define assessment structure, questions, and scoring logic in JSON format
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {editingAssessment ? 'Update' : 'Create'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* User Selector Dialog */}
        <Dialog open={showUserSelector} onOpenChange={setShowUserSelector}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Select Users to Assign</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2 p-4">
                {allUsers.map(user => (
                  <div
                    key={user.email}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                    onClick={() => {
                      if (!formData.assigned_user_emails.includes(user.email)) {
                        setFormData({
                          ...formData,
                          assigned_user_emails: [...formData.assigned_user_emails, user.email]
                        });
                      }
                    }}
                  >
                    <Checkbox
                      checked={formData.assigned_user_emails.includes(user.email)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({
                            ...formData,
                            assigned_user_emails: [...formData.assigned_user_emails, user.email]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            assigned_user_emails: formData.assigned_user_emails.filter(e => e !== user.email)
                          });
                        }
                      }}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{user.full_name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button onClick={() => setShowUserSelector(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default withAuthProtection(CustomAssessmentBuilder, {
  allowedRoles: ['Admin Level 1', 'Admin Level 2', 'Super Administrator', 'Partner Business Administrator', 'Platform Admin']
});