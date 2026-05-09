import React, { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  BookOpen, Plus, Search, Pencil, Trash2, Users, CheckCircle2,
  Clock, ExternalLink, FileText, Video, Loader2, X, Upload,
  LayoutGrid, List, BarChart2, TrendingUp, Award, AlertCircle
} from "lucide-react";

const TYPE_ICONS = {
  course: BookOpen, video: Video, document: FileText, article: FileText,
  book: BookOpen, whitepaper: FileText, podcast: BookOpen,
  assessment_tool: CheckCircle2, quiz: CheckCircle2, external_link: ExternalLink
};

const TYPE_COLORS = {
  course: "bg-blue-100 text-blue-700", video: "bg-purple-100 text-purple-700",
  document: "bg-orange-100 text-orange-700", article: "bg-green-100 text-green-700",
  book: "bg-yellow-100 text-yellow-700", whitepaper: "bg-gray-100 text-gray-700",
  podcast: "bg-pink-100 text-pink-700", assessment_tool: "bg-indigo-100 text-indigo-700",
  quiz: "bg-red-100 text-red-700", external_link: "bg-cyan-100 text-cyan-700"
};

const DIFFICULTY_COLORS = {
  beginner: "bg-green-100 text-green-700",
  intermediate: "bg-yellow-100 text-yellow-700",
  advanced: "bg-red-100 text-red-700"
};

const EMPTY_RESOURCE = {
  title: "", description: "", type: "course", provider: "", author: "",
  url: "", document_url: "", embed_code: "", difficulty_level: "beginner",
  duration_string: "", access: "Free", is_active: true, is_premium: false,
  year: new Date().getFullYear(), tags: [], competencies: [], points_value: ""
};

// All platform competency names
const PLATFORM_COMPETENCIES = [
  "Adaptability", "Agile People Operations", "Business Acumen", "Cognitive Flexibility",
  "Collaboration", "Communication", "Data Literacy & Evidence-Based Management",
  "Decision-Making", "Delegation", "Developing Others", "Digital and AI Literacy",
  "Emotional Intelligence", "Ethical Decision-Making & AI Governance",
  "Facilitation & Virtual Collaboration", "Influence Without Authority",
  "Leadership Agility", "Learning Agility", "Managing Difficult Conversations",
  "Managerial Curiosity", "Organizational Impact", "Partnering with Senior Leaders",
  "Performance Management", "Personal Integrity & Ethics", "Psychological Safety Creation",
  "Situational Intelligence", "Stakeholder Management", "Strategic Thinking",
  "Talent Intelligence & Development", "Team Leadership", "Time and Resource Management",
  "Transition from IC to Leader"
];

function CompetencyMultiSelect({ value = [], onChange }) {
  const [search, setSearch] = useState("");
  const filtered = PLATFORM_COMPETENCIES.filter(c =>
    c.toLowerCase().includes(search.toLowerCase()) && !value.includes(c)
  );
  const toggle = (comp) => {
    if (value.includes(comp)) {
      onChange(value.filter(c => c !== comp));
    } else {
      onChange([...value, comp]);
    }
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 min-h-[28px]">
        {value.map(c => (
          <span key={c} className="inline-flex items-center gap-1 text-[10px] bg-purple-100 text-purple-700 rounded-full px-2 py-0.5 font-medium">
            {c}
            <button type="button" onClick={() => toggle(c)} className="hover:text-purple-900">×</button>
          </span>
        ))}
        {value.length === 0 && <span className="text-xs text-gray-400 italic">No competencies selected</span>}
      </div>
      <Input
        placeholder="Search competencies..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="h-8 text-xs"
      />
      <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-50">
        {filtered.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => toggle(c)}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-purple-50 hover:text-purple-700 transition-colors"
          >
            {c}
          </button>
        ))}
        {filtered.length === 0 && <p className="px-3 py-2 text-xs text-gray-400 italic">No matches</p>}
      </div>
    </div>
  );
}

function ResourceFormDialog({ open, onClose, resource, onSaved }) {
  const [form, setForm] = useState(EMPTY_RESOURCE);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (resource) {
      setForm({ ...EMPTY_RESOURCE, ...resource });
    } else {
      setForm(EMPTY_RESOURCE);
    }
  }, [resource, open]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set("document_url", file_url);
      toast.success("Document uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title || !form.type) { toast.error("Title and type are required"); return; }
    setSaving(true);
    try {
      const payload = { ...form, points_value: form.points_value ? Number(form.points_value) : undefined, year: form.year ? Number(form.year) : undefined };
      if (resource?.id) {
        await base44.entities.LearningResource.update(resource.id, payload);
        toast.success("Resource updated");
      } else {
        await base44.entities.LearningResource.create(payload);
        toast.success("Resource created");
      }
      onSaved();
      onClose();
    } catch {
      toast.error("Failed to save resource");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{resource ? "Edit Resource" : "New Learning Resource"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Title *</label>
              <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Resource title" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Type *</label>
              <Select value={form.type} onValueChange={v => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["course","video","document","article","book","whitepaper","podcast","assessment_tool","quiz","external_link"].map(t => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Difficulty</label>
              <Select value={form.difficulty_level} onValueChange={v => set("difficulty_level", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Provider</label>
              <Input value={form.provider} onChange={e => set("provider", e.target.value)} placeholder="e.g. LinkedIn Learning" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Author</label>
              <Input value={form.author} onChange={e => set("author", e.target.value)} placeholder="Author name" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Access</label>
              <Select value={form.access} onValueChange={v => set("access", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Free">Free</SelectItem>
                  <SelectItem value="Subscription">Subscription</SelectItem>
                  <SelectItem value="Purchase">Purchase</SelectItem>
                  <SelectItem value="Program">Program</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Duration</label>
              <Input value={form.duration_string} onChange={e => set("duration_string", e.target.value)} placeholder="e.g. 1h 30m" />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
              <textarea
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0202ff] resize-none"
                rows={3} value={form.description} onChange={e => set("description", e.target.value)}
                placeholder="Brief description of the learning resource"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">External URL</label>
              <Input value={form.url} onChange={e => set("url", e.target.value)} placeholder="https://..." />
            </div>
            {["document"].includes(form.type) && (
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Upload Document</label>
                {form.document_url ? (
                  <div className="flex items-center gap-2">
                    <a href={form.document_url} target="_blank" rel="noreferrer" className="text-sm text-[#0202ff] underline truncate flex-1">View uploaded file</a>
                    <Button variant="ghost" size="icon" onClick={() => set("document_url", "")}><X className="w-4 h-4" /></Button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-lg p-4 cursor-pointer hover:border-[#0202ff] transition-colors">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-gray-400" />}
                    <span className="text-sm text-gray-500">{uploading ? "Uploading..." : "Click to upload a document"}</span>
                    <input type="file" className="hidden" onChange={handleDocumentUpload} disabled={uploading} accept=".pdf,.doc,.docx,.ppt,.pptx" />
                  </label>
                )}
              </div>
            )}
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Embed Code (optional)</label>
              <textarea
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0202ff] resize-none"
                rows={3} value={form.embed_code} onChange={e => set("embed_code", e.target.value)}
                placeholder="<iframe ...></iframe>"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Points Value</label>
              <Input type="number" value={form.points_value} onChange={e => set("points_value", e.target.value)} placeholder="e.g. 50" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Year</label>
              <Input type="number" value={form.year} onChange={e => set("year", e.target.value)} placeholder={new Date().getFullYear()} />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Competencies <span className="text-xs font-normal text-gray-400">(from platform model)</span>
              </label>
              <CompetencyMultiSelect value={form.competencies || []} onChange={v => set("competencies", v)} />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Skills / Tags <span className="text-xs font-normal text-gray-400">(comma-separated raw skills)</span>
              </label>
              <Input
                value={(form.tags || []).join(", ")}
                onChange={e => set("tags", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                placeholder="e.g. Python, Leadership, Excel"
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => set("is_active", e.target.checked)} className="rounded" />
              <label htmlFor="is_active" className="text-sm text-gray-700">Active (visible to learners)</label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#0202ff] hover:bg-[#0101dd] text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {resource ? "Save Changes" : "Create Resource"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EnrollmentRow({ assignment, users, onStatusChange, onDelete }) {
  const user = users.find(u => u.email === assignment.user_email);
  const STATUS_COLORS = {
    assigned: "bg-gray-100 text-gray-700", started: "bg-blue-100 text-blue-700",
    in_progress: "bg-yellow-100 text-yellow-700", completed: "bg-green-100 text-green-700",
    overdue: "bg-red-100 text-red-700"
  };
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#0202ff]/10 flex items-center justify-center text-[#0202ff] text-xs font-bold">
          {(user?.full_name || assignment.user_email || "?")[0].toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{user?.full_name || assignment.user_email}</p>
          <p className="text-xs text-gray-500">{assignment.user_email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Select value={assignment.status} onValueChange={val => onStatusChange(assignment.id, val)}>
          <SelectTrigger className="h-7 text-xs w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["assigned","started","in_progress","completed","overdue"].map(s => (
              <SelectItem key={s} value={s}>{s.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => onDelete(assignment.id)}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function AdminLearningManagementTab({ user }) {
  const [tab, setTab] = useState("library");
  const [resources, setResources] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [assignDialog, setAssignDialog] = useState(null);
  const [assignEmail, setAssignEmail] = useState("");
  const [viewMode, setViewMode] = useState("list"); // "list" | "grid"

  const loadData = async () => {
    setLoading(true);
    try {
      const [res, assigns] = await Promise.all([
        base44.entities.LearningResource.list('-created_date', 200),
        base44.entities.AssignedLearning.filter({ client_id: user.client_id }, '-created_date', 200)
      ]);
      setResources(res);
      setAssignments(assigns);
    } catch { toast.error("Failed to load data"); }
    finally { setLoading(false); }
  };

  const loadUsers = async () => {
    try {
      const res = await base44.functions.invoke('listAllUsers');
      if (res.data?.success) setUsers(res.data.users || []);
    } catch { setUsers([]); }
  };

  useEffect(() => { loadData(); loadUsers(); }, []);

  const analytics = useMemo(() => {
    const totalResources = resources.length;
    const activeResources = resources.filter(r => r.is_active).length;
    const totalEnrollments = assignments.length;
    const completedEnrollments = assignments.filter(a => a.status === "completed").length;
    const completionRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;
    const overdueEnrollments = assignments.filter(a => a.status === "overdue").length;
    return { totalResources, activeResources, totalEnrollments, completedEnrollments, completionRate, overdueEnrollments };
  }, [resources, assignments]);

  const filteredResources = resources.filter(r => {
    const matchSearch = !search || r.title?.toLowerCase().includes(search.toLowerCase()) || r.provider?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || r.type === typeFilter;
    return matchSearch && matchType;
  });

  const handleDelete = async (id) => {
    if (!confirm("Delete this resource?")) return;
    await base44.entities.LearningResource.delete(id);
    toast.success("Resource deleted");
    loadData();
  };

  const handleToggleActive = async (resource) => {
    await base44.entities.LearningResource.update(resource.id, { is_active: !resource.is_active });
    loadData();
  };

  const handleAssign = async () => {
    if (!assignEmail || !assignDialog) return;
    try {
      await base44.entities.AssignedLearning.create({
        user_email: assignEmail,
        learning_resource_id: assignDialog.id,
        assigned_by: user.email,
        client_id: user.client_id,
        title: assignDialog.title,
        status: "assigned"
      });
      toast.success("Enrolled successfully");
      setAssignDialog(null);
      setAssignEmail("");
      loadData();
    } catch { toast.error("Failed to enroll user"); }
  };

  const handleStatusChange = async (id, status) => {
    await base44.entities.AssignedLearning.update(id, { status });
    loadData();
  };

  const handleDeleteAssignment = async (id) => {
    if (!confirm("Remove this enrollment?")) return;
    await base44.entities.AssignedLearning.delete(id);
    toast.success("Enrollment removed");
    loadData();
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" /></div>;
  }

  return (
    <div className="space-y-4">

      {/* ── ANALYTICS CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border border-gray-100 shadow-sm rounded-xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Resources</p>
              <p className="text-xl font-bold text-gray-900">{analytics.totalResources}</p>
              <p className="text-[10px] text-gray-400">{analytics.activeResources} active</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-100 shadow-sm rounded-xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
              <Users className="w-4.5 h-4.5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Enrollments</p>
              <p className="text-xl font-bold text-gray-900">{analytics.totalEnrollments}</p>
              <p className="text-[10px] text-gray-400">{analytics.completedEnrollments} completed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-100 shadow-sm rounded-xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4.5 h-4.5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Completion Rate</p>
              <p className="text-xl font-bold text-gray-900">{analytics.completionRate}%</p>
              <p className="text-[10px] text-gray-400">of all enrollments</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-100 shadow-sm rounded-xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4.5 h-4.5 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Overdue</p>
              <p className="text-xl font-bold text-gray-900">{analytics.overdueEnrollments}</p>
              <p className="text-[10px] text-gray-400">need attention</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-gray-100 rounded-xl p-1">
          <TabsTrigger value="library" className="rounded-lg text-xs">Content Library</TabsTrigger>
          <TabsTrigger value="enrollments" className="rounded-lg text-xs">Enrollments</TabsTrigger>
        </TabsList>

        {/* ── LIBRARY ── */}
        <TabsContent value="library" className="space-y-4 mt-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input className="pl-9 h-9" placeholder="Search resources..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 w-36 text-xs"><SelectValue placeholder="All types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {["course","video","document","article","book","whitepaper","podcast","assessment_tool","quiz","external_link"].map(t => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
                  title="Grid view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
              <Button onClick={() => { setEditingResource(null); setShowForm(true); }} className="bg-[#0202ff] hover:bg-[#0101dd] text-white h-9 text-xs">
                <Plus className="w-4 h-4 mr-1" /> Add Resource
              </Button>
            </div>
          </div>

          <div className="text-xs text-gray-500">{filteredResources.length} resource{filteredResources.length !== 1 ? "s" : ""}</div>

          {/* LIST VIEW */}
          {viewMode === "list" && (
            <div className="grid grid-cols-1 gap-3">
              {filteredResources.map(r => {
                const Icon = TYPE_ICONS[r.type] || BookOpen;
                return (
                  <Card key={r.id} className={`border border-gray-100 shadow-sm rounded-xl transition-opacity ${!r.is_active ? "opacity-60" : ""}`}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900 truncate">{r.title}</p>
                          <Badge className={`text-[10px] ${TYPE_COLORS[r.type] || "bg-gray-100 text-gray-600"}`}>{r.type?.replace(/_/g," ")}</Badge>
                          {r.difficulty_level && <Badge className={`text-[10px] ${DIFFICULTY_COLORS[r.difficulty_level]}`}>{r.difficulty_level}</Badge>}
                          {!r.is_active && <Badge className="text-[10px] bg-gray-100 text-gray-500">Inactive</Badge>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{[r.provider, r.author, r.duration_string].filter(Boolean).join(" · ")}</p>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-1">{r.description || <span className="italic">No description</span>}</p>
                        {(r.competencies?.length > 0 || r.tags?.length > 0) && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {r.competencies?.slice(0, 3).map(c => (
                              <span key={c} className="text-[10px] bg-purple-100 text-purple-700 rounded-full px-1.5 py-0.5 font-medium">{c}</span>
                            ))}
                            {r.tags?.filter(t => !r.competencies?.includes(t)).slice(0, 2).map(t => (
                              <span key={t} className="text-[10px] bg-blue-50 text-blue-500 rounded px-1.5 py-0.5">{t}</span>
                            ))}
                            {((r.competencies?.length || 0) + (r.tags?.length || 0)) > 5 && (
                              <span className="text-[10px] text-gray-400">+{(r.competencies?.length || 0) + (r.tags?.length || 0) - 5} more</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-[#0202ff]" title={r.is_active ? "Deactivate" : "Activate"} onClick={() => handleToggleActive(r)}>
                          {r.is_active ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-[#0202ff]" onClick={() => setAssignDialog(r)} title="Enroll users">
                          <Users className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-[#0202ff]" onClick={() => { setEditingResource(r); setShowForm(true); }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {filteredResources.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No resources found</p>
                </div>
              )}
            </div>
          )}

          {/* GRID VIEW */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredResources.map(r => {
                const Icon = TYPE_ICONS[r.type] || BookOpen;
                return (
                  <Card key={r.id} className={`border border-gray-100 shadow-sm rounded-xl transition-opacity flex flex-col ${!r.is_active ? "opacity-60" : ""}`}>
                    <CardContent className="p-4 flex flex-col gap-3 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-gray-500" />
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-[#0202ff]" title={r.is_active ? "Deactivate" : "Activate"} onClick={() => handleToggleActive(r)}>
                            {r.is_active ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Clock className="w-3.5 h-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-[#0202ff]" onClick={() => setAssignDialog(r)}>
                            <Users className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-[#0202ff]" onClick={() => { setEditingResource(r); setShowForm(true); }}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-500" onClick={() => handleDelete(r.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">{r.title}</p>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-1">{r.description || <span className="italic text-gray-400">No description</span>}</p>
                        <p className="text-xs text-gray-400 mb-2">{[r.provider, r.author].filter(Boolean).join(" · ")}</p>
                        {(r.competencies?.length > 0 || r.tags?.length > 0) && (
                          <div className="flex flex-wrap gap-1">
                            {r.competencies?.slice(0, 2).map(c => (
                              <span key={c} className="text-[10px] bg-purple-100 text-purple-700 rounded-full px-1.5 py-0.5 font-medium">{c}</span>
                            ))}
                            {r.tags?.filter(t => !r.competencies?.includes(t)).slice(0, 1).map(t => (
                              <span key={t} className="text-[10px] bg-blue-50 text-blue-500 rounded px-1.5 py-0.5">{t}</span>
                            ))}
                            {((r.competencies?.length || 0) + (r.tags?.length || 0)) > 3 && (
                              <span className="text-[10px] text-gray-400">+{(r.competencies?.length || 0) + (r.tags?.length || 0) - 3} more</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap mt-auto pt-2 border-t border-gray-50">
                        <Badge className={`text-[10px] ${TYPE_COLORS[r.type] || "bg-gray-100 text-gray-600"}`}>{r.type?.replace(/_/g," ")}</Badge>
                        {r.difficulty_level && <Badge className={`text-[10px] ${DIFFICULTY_COLORS[r.difficulty_level]}`}>{r.difficulty_level}</Badge>}
                        {r.duration_string && <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{r.duration_string}</span>}
                        {!r.is_active && <Badge className="text-[10px] bg-gray-100 text-gray-500">Inactive</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {filteredResources.length === 0 && (
                <div className="col-span-full text-center py-16 text-gray-400">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No resources found</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── ENROLLMENTS ── */}
        <TabsContent value="enrollments" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{assignments.length} enrollment{assignments.length !== 1 ? "s" : ""} across your organization</p>
          </div>
          {assignments.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No enrollments yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Group by resource */}
              {Object.entries(
                assignments.reduce((acc, a) => {
                  const key = a.learning_resource_id || "unknown";
                  if (!acc[key]) acc[key] = { title: a.title || "Unknown Resource", items: [] };
                  acc[key].items.push(a);
                  return acc;
                }, {})
              ).map(([resourceId, group]) => (
                <Card key={resourceId} className="border border-gray-100 shadow-sm rounded-xl">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#0202ff]" /> {group.title}
                      <Badge className="bg-gray-100 text-gray-600 text-[10px] ml-auto">{group.items.length} enrolled</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {group.items.map(a => (
                      <EnrollmentRow key={a.id} assignment={a} users={users} onStatusChange={handleStatusChange} onDelete={handleDeleteAssignment} />
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Resource Dialog */}
      <ResourceFormDialog
        open={showForm}
        onClose={() => setShowForm(false)}
        resource={editingResource}
        onSaved={loadData}
      />

      {/* Enroll User Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={() => { setAssignDialog(null); setAssignEmail(""); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Enroll User</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500">Enroll a user in <strong>{assignDialog?.title}</strong></p>
          <Select value={assignEmail} onValueChange={setAssignEmail}>
            <SelectTrigger><SelectValue placeholder="Select a user..." /></SelectTrigger>
            <SelectContent>
              {users.map(u => (
                <SelectItem key={u.email} value={u.email}>{u.full_name || u.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAssignDialog(null); setAssignEmail(""); }}>Cancel</Button>
            <Button onClick={handleAssign} disabled={!assignEmail} className="bg-[#0202ff] hover:bg-[#0101dd] text-white">Enroll</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}