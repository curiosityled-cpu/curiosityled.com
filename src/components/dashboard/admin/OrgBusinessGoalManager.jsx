import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Loader2, Building2, X, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const EMPTY_FORM = {
  title: "",
  description: "",
  target_metric: "",
  progress: 0,
  linked_competencies: [],
  business_impact: "",
  due_date: "",
  quarter: "",
  is_active: true,
};

const COMPETENCY_OPTIONS = [
  "Situational Intelligence",
  "Decision Making",
  "Communication",
  "Resource Management",
  "Stakeholder Management",
  "Performance Management",
];

export default function OrgBusinessGoalManager({ user }) {
  const [goals, setGoals]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);

  useEffect(() => { if (user?.client_id) load(); }, [user?.client_id]);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.OrgBusinessGoal.filter({ client_id: user.client_id }).catch(() => []);
    setGoals(data);
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowDialog(true);
  };

  const openEdit = (goal) => {
    setEditing(goal);
    setForm({
      title:                goal.title || "",
      description:          goal.description || "",
      target_metric:        goal.target_metric || "",
      progress:             goal.progress ?? 0,
      linked_competencies:  goal.linked_competencies || [],
      business_impact:      goal.business_impact || "",
      due_date:             goal.due_date || "",
      quarter:              goal.quarter || "",
      is_active:            goal.is_active ?? true,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    const payload = { ...form, client_id: user.client_id };
    if (editing) {
      await base44.entities.OrgBusinessGoal.update(editing.id, payload);
      toast.success("Goal updated");
    } else {
      await base44.entities.OrgBusinessGoal.create(payload);
      toast.success("Goal created");
    }
    setSaving(false);
    setShowDialog(false);
    load();
  };

  const handleDelete = async (goal) => {
    if (!confirm(`Delete "${goal.title}"?`)) return;
    await base44.entities.OrgBusinessGoal.delete(goal.id);
    toast.success("Deleted");
    load();
  };

  const toggleCompetency = (c) => {
    setForm(prev => ({
      ...prev,
      linked_competencies: prev.linked_competencies.includes(c)
        ? prev.linked_competencies.filter(x => x !== c)
        : [...prev.linked_competencies, c]
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Organizational Business Goals</h3>
          <p className="text-sm text-gray-500">These goals are shown to all users in your organization in their Insights page.</p>
        </div>
        <Button onClick={openCreate} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus className="w-4 h-4" /> Add Goal
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-gray-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading...
        </div>
      ) : goals.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl p-8 text-center text-gray-400">
          <Building2 className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">No business goals configured yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map(g => (
            <div key={g.id} className={`border rounded-xl p-4 bg-white ${!g.is_active ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{g.title}</span>
                    {g.quarter && <Badge variant="outline" className="text-xs">{g.quarter}</Badge>}
                    {!g.is_active && <Badge variant="outline" className="text-xs text-gray-400">Inactive</Badge>}
                  </div>
                  {g.target_metric && <p className="text-xs text-gray-500 mt-0.5">{g.target_metric}</p>}
                  <div className="flex items-center gap-3 mt-2">
                    <Progress value={g.progress || 0} className="h-1.5 flex-1" />
                    <span className="text-xs font-medium text-gray-600">{g.progress || 0}%</span>
                  </div>
                  {g.linked_competencies?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {g.linked_competencies.map((c, i) => (
                        <Badge key={i} className="text-xs bg-blue-50 text-blue-700">{c}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(g)} className="h-8 w-8">
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(g)} className="h-8 w-8 text-red-500 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Business Goal" : "Add Business Goal"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Improve Manager Effectiveness" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What this goal aims to achieve" />
            </div>
            <div>
              <Label>Target Metric</Label>
              <Input value={form.target_metric} onChange={e => setForm(p => ({ ...p, target_metric: e.target.value }))} placeholder="e.g. Increase Q1 CSAT to 4.2/5" />
            </div>
            <div>
              <Label>Business Impact</Label>
              <Input value={form.business_impact} onChange={e => setForm(p => ({ ...p, business_impact: e.target.value }))} placeholder="e.g. $400K revenue retention" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quarter</Label>
                <Input value={form.quarter} onChange={e => setForm(p => ({ ...p, quarter: e.target.value }))} placeholder="e.g. Q2 2025" />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Progress (%)</Label>
              <Input type="number" min={0} max={100} value={form.progress} onChange={e => setForm(p => ({ ...p, progress: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Linked Competencies</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {COMPETENCY_OPTIONS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCompetency(c)}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                      form.linked_competencies.includes(c)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
                className={`w-10 h-5 rounded-full transition-colors ${form.is_active ? "bg-blue-600" : "bg-gray-300"}`}
              />
              <Label className="cursor-pointer" onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}>
                {form.is_active ? "Active (visible to users)" : "Inactive (hidden from users)"}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}