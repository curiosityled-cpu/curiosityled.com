import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Layers, Briefcase, BookOpen, Clock, Search, Plus, Pencil, Trash2,
  UserPlus, Users, Library, CheckCircle, Play, Pause, Copy, MoreHorizontal,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import JourneyEditor from "@/components/dev-manager/JourneyEditor";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_BADGE = {
  draft: "bg-gray-100 text-gray-700",
  published: "bg-emerald-100 text-emerald-700",
  archived: "bg-slate-100 text-slate-600",
  active: "bg-blue-100 text-blue-700",
  paused: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-gray-100 text-gray-600",
};

const LIBRARY_ROLES = ["Admin Level 1", "Admin Level 2", "Super Administrator", "Platform Admin"];

function AssignDialog({ open, onClose, journey, users, onAssigned }) {
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [saving, setSaving] = useState(false);

  const toggle = (email) => {
    setSelectedEmails((prev) => prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]);
  };

  const handleAssign = async () => {
    if (selectedEmails.length === 0) return;
    setSaving(true);
    try {
      const existing = journey.assigned_to_emails || [];
      const merged = Array.from(new Set([...existing, ...selectedEmails]));
      await base44.entities.Journey.update(journey.id, { assigned_to_emails: merged });
      toast.success(`Assigned to ${selectedEmails.length} participant${selectedEmails.length > 1 ? "s" : ""}`);
      setSelectedEmails([]);
      onAssigned();
      onClose();
    } catch (err) {
      toast.error("Failed to assign");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Assign Journey to Participants</DialogTitle></DialogHeader>
        <p className="text-xs text-gray-500 -mt-1">Assigns <strong>{journey?.title}</strong> to the selected users. They'll see it in their development list.</p>
        <div className="space-y-2 pt-2 max-h-[50vh] overflow-y-auto">
          {users.map((u) => {
            const checked = selectedEmails.includes(u.email);
            const alreadyAssigned = (journey?.assigned_to_emails || []).includes(u.email);
            return (
              <label key={u.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${checked ? "border-[#0202ff] bg-[#0202ff]/5" : "border-gray-200 hover:bg-gray-50"}`}>
                <input type="checkbox" checked={checked} onChange={() => toggle(u.email)} className="w-4 h-4" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{u.full_name || u.email}</p>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                </div>
                {alreadyAssigned && <Badge variant="secondary" className="text-xs">assigned</Badge>}
              </label>
            );
          })}
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={handleAssign} disabled={saving || selectedEmails.length === 0} className="bg-[#0202ff] hover:bg-[#0101dd] text-white flex-1">
            {saving ? "Assigning..." : `Assign (${selectedEmails.length})`}
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function JourneysTab({ user, coacheeEmails }) {
  const [journeys, setJourneys] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [libraryOnly, setLibraryOnly] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState(null);
  const [assigning, setAssigning] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allJourneys, allUsers] = await Promise.all([
        base44.entities.Journey.list("-created_date"),
        base44.entities.User.filter({ client_id: user.client_id }),
      ]);
      setJourneys(allJourneys);
      setUsers(allUsers);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load journeys");
    } finally {
      setLoading(false);
    }
  }, [user.client_id]);

  useEffect(() => { load(); }, [load]);

  const scoped = (coacheeEmails || []).length > 0;
  const adminRoles = ["Admin Level 1", "Admin Level 2", "Super Administrator", "Platform Admin", "Partner Business Administrator"];
  const canManageLibrary = LIBRARY_ROLES.includes(user?.app_role);

  const visibleJourneys = journeys.filter((j) => {
    if (scoped) {
      const emails = coacheeEmails || [];
      const assigned = (j.assigned_to_emails || []).some((e) => emails.includes(e));
      const author = j.author_email === user.email || j.created_by === user.email;
      return assigned || author;
    }
    return true;
  });

  const filtered = visibleJourneys.filter((j) => {
    const matchSearch = !search || j.title?.toLowerCase().includes(search.toLowerCase()) || j.description?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || j.status === statusFilter;
    const matchLibrary = !libraryOnly || j.in_content_library;
    return matchSearch && matchStatus && matchLibrary;
  });

  const stats = {
    total: visibleJourneys.length,
    inLibrary: visibleJourneys.filter((j) => j.in_content_library).length,
    active: visibleJourneys.filter((j) => j.status === "active" || j.status === "paused").length,
    completed: visibleJourneys.filter((j) => j.status === "completed").length,
  };

  const handleStatusChange = async (journey, newStatus) => {
    try {
      await base44.entities.Journey.update(journey.id, { status: newStatus });
      toast.success(`Journey ${newStatus}`);
      load();
    } catch (err) { toast.error("Failed to update status"); }
  };

  const handleDelete = async (journey) => {
    if (!confirm(`Delete "${journey.title}"? This cannot be undone.`)) return;
    try {
      await base44.entities.Journey.delete(journey.id);
      toast.success("Journey deleted");
      load();
    } catch (err) { toast.error("Failed to delete journey"); }
  };

  const handleDuplicate = async (journey) => {
    try {
      const { id, created_date, updated_date, source_entity, source_id, ...data } = journey;
      await base44.entities.Journey.create({ ...data, title: `${journey.title} (Copy)`, status: "active", assigned_to_emails: [] });
      toast.success("Journey duplicated");
      load();
    } catch (err) { toast.error("Failed to duplicate"); }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#0202ff] rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Journeys</h2>
          <p className="text-sm text-gray-500 mt-0.5">Build and assign development journeys from the content library.</p>
        </div>
        <Button className="bg-[#0202ff] hover:bg-[#0101dd] text-white" onClick={() => { setEditing(null); setShowEditor(true); }}>
          <Plus className="w-4 h-4 mr-1.5" /> New Journey
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, icon: Layers, color: "text-[#0202ff]" },
          { label: "In Library", value: stats.inLibrary, icon: Library, color: "text-purple-600" },
          { label: "Active", value: stats.active, icon: Play, color: "text-blue-600" },
          { label: "Completed", value: stats.completed, icon: CheckCircle, color: "text-emerald-600" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="shadow-sm border border-gray-100 rounded-2xl">
              <CardContent className="p-3 text-center">
                <Icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search journeys..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 text-sm border border-gray-200 rounded-lg px-3 bg-white focus:outline-none focus:ring-1 focus:ring-[#0202ff]/30"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
          <option value="cancelled">Cancelled</option>
        </select>
        {canManageLibrary && (
          <button
            onClick={() => setLibraryOnly(!libraryOnly)}
            className={`h-9 px-3 text-sm rounded-lg border transition-colors flex items-center gap-1.5 ${libraryOnly ? "border-purple-300 bg-purple-50 text-purple-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}
          >
            <Library className="w-3.5 h-3.5" /> Library only
          </button>
        )}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="shadow-sm border border-gray-100 rounded-2xl">
            <CardContent className="p-8 text-center">
              <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="font-semibold text-gray-800">No journeys found</p>
              <p className="text-xs text-gray-500 mt-1">Create one to get started.</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((journey, i) => (
            <motion.div key={journey.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="shadow-sm border border-gray-100 rounded-2xl hover:shadow-md transition-shadow overflow-hidden">
                {journey.thumbnail_url && (
                  <div className="h-28 w-full overflow-hidden bg-gray-100">
                    <img src={journey.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-medium text-gray-900 leading-snug">{journey.title}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[journey.status] || "bg-gray-100 text-gray-600"}`}>
                          {journey.status}
                        </span>
                        {journey.in_content_library && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100 flex items-center gap-1">
                            <Library className="w-3 h-3" /> library
                          </span>
                        )}
                      </div>
                      {journey.description && <p className="text-xs text-gray-500 line-clamp-2 mb-2">{journey.description}</p>}
                      {journey.target_competencies?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {journey.target_competencies.slice(0, 3).map((c) => (
                            <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">{c}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                        {journey.assigned_to_emails?.length > 0 && (
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {journey.assigned_to_emails.length} assigned</span>
                        )}
                        {journey.experiences?.length > 0 && (
                          <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {journey.experiences.length} exp</span>
                        )}
                        {journey.learning_items?.length > 0 && (
                          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {journey.learning_items.length} resources</span>
                        )}
                        {journey.target_date && (
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Due {new Date(journey.target_date).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="text-gray-400 hover:text-gray-700 transition-colors p-1" title="Actions">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditing(journey); setShowEditor(true); }}>
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setAssigning(journey)}>
                            <UserPlus className="w-4 h-4 mr-2" /> Assign to participants
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(journey)}>
                            <Copy className="w-4 h-4 mr-2" /> Duplicate
                          </DropdownMenuItem>
                          {journey.in_content_library && journey.status === "draft" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(journey, "published")}>
                              <Play className="w-4 h-4 mr-2" /> Publish
                            </DropdownMenuItem>
                          )}
                          {journey.in_content_library && journey.status === "published" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(journey, "archived")}>
                              <Pause className="w-4 h-4 mr-2" /> Archive
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(journey)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      <JourneyEditor
        open={showEditor}
        onClose={() => { setShowEditor(false); setEditing(null); }}
        onSaved={() => { setShowEditor(false); setEditing(null); load(); }}
        journey={editing}
        user={user}
        users={users}
      />

      <AssignDialog
        open={!!assigning}
        onClose={() => setAssigning(null)}
        journey={assigning}
        users={users}
        onAssigned={load}
      />
    </div>
  );
}