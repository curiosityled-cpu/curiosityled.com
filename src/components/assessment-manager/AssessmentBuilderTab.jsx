import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import AIEnhancedInput from "@/components/ai/AIEnhancedInput";
import FormAssistant from "@/components/ai/FormAssistant";
import { Plus, Edit, Trash2, Loader2, CheckCircle, ArrowLeft, FileText, Lock, Globe, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const EMPTY_FORM = {
  title: "", description: "", type: "custom_assessment", status: "draft",
  access_mode: "closed", assigned_user_emails: [], allow_admin_self_enrollment: false,
  passing_score_percentage: 70, learning_resource_ids: [], competency_ids: [], config: "{}",
};

export default function AssessmentBuilderTab({ initialEditId }) {
  const [assessments, setAssessments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = list view, "new" = create, object = edit
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showUserSelector, setShowUserSelector] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [a, u] = await Promise.all([
        base44.entities.CustomAssessment.list("-created_date"),
        base44.entities.User.list(),
      ]);
      setAssessments(a || []);
      setUsers(u || []);
    } catch (error) {
      console.error("Error loading builder data:", error);
      toast.error("Failed to load assessments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Handle ?id= param for editing from redirect
  useEffect(() => {
    if (initialEditId && assessments.length > 0) {
      const found = assessments.find((a) => a.id === initialEditId);
      if (found) openEdit(found);
    }
  }, [initialEditId, assessments]);

  const openCreate = () => {
    setEditing("new");
    setFormData(EMPTY_FORM);
  };

  const openEdit = (assessment) => {
    setEditing(assessment);
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
      config: JSON.stringify(assessment.config || {}, null, 2),
    });
  };

  const handleSave = async () => {
    if (!formData.title.trim()) { toast.error("Please enter a title"); return; }
    try { JSON.parse(formData.config); } catch { toast.error("Invalid JSON in config field"); return; }
    setSaving(true);
    try {
      const saveData = { ...formData, config: JSON.parse(formData.config) };
      if (editing && editing !== "new") {
        await base44.entities.CustomAssessment.update(editing.id, saveData);
        toast.success("Assessment updated");
      } else {
        await base44.entities.CustomAssessment.create(saveData);
        toast.success("Assessment created");
      }
      setEditing(null);
      await loadData();
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Failed to save assessment");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this assessment? This cannot be undone.")) return;
    try {
      await base44.entities.CustomAssessment.delete(id);
      toast.success("Assessment deleted");
      loadData();
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete");
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" /></div>;
  }

  // ── Form view ──
  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to list
          </Button>
          <h3 className="text-sm font-semibold">{editing === "new" ? "Create New Assessment" : "Edit Assessment"}</h3>
        </div>

        {editing === "new" && (
          <FormAssistant
            formSchema={{ type: "object", properties: {
              title: { type: "string" }, description: { type: "string" },
              type: { type: "string", enum: ["quiz", "knowledge_check", "custom_assessment"] },
              passing_score_percentage: { type: "number" },
            }}}
            onApply={(data) => setFormData((prev) => ({ ...prev, ...data }))}
            formType="custom_assessment"
            placeholder="Describe the assessment you want to create, e.g., 'A sales leadership quiz with 20 questions covering negotiation and client management'"
            compact
          />
        )}

        <Card><CardContent className="p-5 space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <AIEnhancedInput
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fieldName="title" fieldType="assessment_title"
              formContext={{ type: formData.type }}
              placeholder="e.g., Sales Leadership Assessment"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <AIEnhancedInput
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fieldName="description" fieldType="assessment_description"
              formContext={{ title: formData.title, type: formData.type }}
              multiline rows={3}
              placeholder="Describe the purpose and content of this assessment"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="knowledge_check">Knowledge Check</SelectItem>
                  <SelectItem value="custom_assessment">Custom Assessment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
            <Select value={formData.access_mode} onValueChange={(v) => setFormData({ ...formData, access_mode: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open"><div className="flex items-center gap-2"><Globe className="w-4 h-4" /> Open (Anyone can take)</div></SelectItem>
                <SelectItem value="closed"><div className="flex items-center gap-2"><Lock className="w-4 h-4" /> Closed (Assignment required)</div></SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formData.access_mode === "closed" && (
            <div className="space-y-2">
              <Label>Assigned Users ({formData.assigned_user_emails.length})</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg min-h-[50px]">
                {formData.assigned_user_emails.map((email) => (
                  <Badge key={email} variant="secondary">
                    {email}
                    <button
                      onClick={() => setFormData({ ...formData, assigned_user_emails: formData.assigned_user_emails.filter((e) => e !== email) })}
                      className="ml-2 hover:text-red-600"
                    >×</button>
                  </Badge>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowUserSelector(true)}>
                <Users className="w-4 h-4 mr-2" /> Select Users
              </Button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Checkbox
              checked={formData.allow_admin_self_enrollment}
              onCheckedChange={(c) => setFormData({ ...formData, allow_admin_self_enrollment: c })}
            />
            <Label>Allow admin self-enrollment</Label>
          </div>
          <div className="space-y-2">
            <Label>Passing Score (%)</Label>
            <Input
              type="number" min="0" max="100"
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
              rows={5} className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">Define assessment structure, questions, and scoring logic in JSON format</p>
          </div>
        </CardContent></Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
            {editing !== "new" ? "Update" : "Create"}
          </Button>
        </div>

        {/* User selector dialog */}
        {showUserSelector && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowUserSelector(false)}>
            <Card className="max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Select Users to Assign</h3>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-1">
                    {users.map((u) => (
                      <div
                        key={u.email}
                        className="flex items-center gap-3 p-2 hover:bg-muted/40 rounded-lg cursor-pointer"
                        onClick={() => {
                          if (!formData.assigned_user_emails.includes(u.email)) {
                            setFormData({ ...formData, assigned_user_emails: [...formData.assigned_user_emails, u.email] });
                          }
                        }}
                      >
                        <Checkbox checked={formData.assigned_user_emails.includes(u.email)} onCheckedChange={(c) => {
                          if (c) setFormData({ ...formData, assigned_user_emails: [...formData.assigned_user_emails, u.email] });
                          else setFormData({ ...formData, assigned_user_emails: formData.assigned_user_emails.filter((e) => e !== u.email) });
                        }} />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{u.full_name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex justify-end mt-3">
                  <Button onClick={() => setShowUserSelector(false)}>Done</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Custom Assessment Builder</h3>
          <p className="text-xs text-muted-foreground">Create and manage custom assessments, quizzes, and knowledge checks</p>
        </div>
        <Button onClick={openCreate} size="sm" style={{ backgroundColor: "#0202ff" }} className="text-white hover:opacity-90">
          <Plus className="w-4 h-4 mr-1" /> Create New
        </Button>
      </div>

      {assessments.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-4">No custom assessments yet</p>
          <Button onClick={openCreate} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-1" /> Create your first assessment
          </Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {assessments.map((a) => (
            <Card key={a.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm truncate">{a.title}</h4>
                    <Badge variant="outline" className="text-xs capitalize">{a.status || "draft"}</Badge>
                    <Badge variant="outline" className="text-xs capitalize">{a.type?.replace(/_/g, " ")}</Badge>
                  </div>
                  {a.description && <p className="text-xs text-muted-foreground line-clamp-1">{a.description}</p>}
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                    {a.passing_score_percentage && <span>Pass: {a.passing_score_percentage}%</span>}
                    {a.assigned_user_emails?.length > 0 && <span>{a.assigned_user_emails.length} assigned</span>}
                    {a.config?.questions?.length > 0 && <span>{a.config.questions.length} questions</span>}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="outline" size="icon" onClick={() => openEdit(a)} title="Edit">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => handleDelete(a.id)} className="text-red-600 hover:text-red-700" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}