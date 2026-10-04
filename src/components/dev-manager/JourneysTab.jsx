import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Layers, Briefcase, BookOpen, Clock, Search, Plus, Pencil, Trash2,
  UserPlus, Map, Users, CheckCircle, Play, Pause, Copy, MoreHorizontal, Eye,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import JourneyEditor from "@/components/dev-manager/JourneyEditor";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CATALOG_STATUS = {
  draft: "bg-gray-100 text-gray-700",
  published: "bg-emerald-100 text-emerald-700",
  archived: "bg-slate-100 text-slate-600",
  template: "bg-purple-100 text-purple-700",
};
const ASSIGNED_STATUS = {
  active: "bg-blue-100 text-blue-700",
  paused: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-gray-100 text-gray-600",
};

function AssignDialog({ open, onClose, journey, users, onAssigned }) {
  const [selectedEmail, setSelectedEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAssign = async () => {
    if (!selectedEmail) return;
    setSaving(true);
    try {
      const { id, created_date, updated_date, source_entity, source_id, ...data } = journey;
      await base44.entities.Journey.create({
        ...data,
        title: `${journey.title} (Assigned)`,
        mode: "assigned",
        user_email: selectedEmail,
        status: "active",
        source_entity: undefined,
        source_id: undefined,
      });
      toast.success(`Journey assigned to ${selectedEmail}`);
      setSelectedEmail("");
      onAssigned();
      onClose();
    } catch (err) {
      toast.error("Failed to assign journey");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Assign Journey to Participant</DialogTitle></DialogHeader>
        <p className="text-xs text-gray-500 -mt-1">Creates a person-specific copy of <strong>{journey?.title}</strong>.</p>
        <div className="space-y-3 pt-1">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Select Participant</label>
            <select
              value={selectedEmail}
              onChange={(e) => setSelectedEmail(e.target.value)}
              className="w-full h-9 text-sm border border-gray-200 rounded-lg px-3 bg-white focus:outline-none focus:ring-1 focus:ring-[#0202ff]/30"
            >
              <option value="">Select user...</option>
              {users.map((u) => <option key={u.id} value={u.email}>{u.full_name || u.email}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={handleAssign} disabled={saving || !selectedEmail} className="bg-[#0202ff] hover:bg-[#0101dd] text-white flex-1">
              {saving ? "Assigning..." : "Assign"}
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function JourneysTab({ user, coacheeEmails }) {
  const [journeys, setJourneys] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("assigned");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState("all");
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

  const visibleJourneys = journeys.filter((j) => {
    if (j.mode !== mode) return false;
    if (scoped && mode === "assigned" && !coacheeEmails.includes(j.user_email)) return false;
    if (!scoped && mode === "assigned") {
      const adminEmails = new Set(users.filter((u) => adminRoles.includes(u.app_role)).map((u) => u.email));
      if (!adminEmails.has(j.created_by) && j.user_email !== user.email) return false;
    }
    return true;
  });

  const filtered = visibleJourneys.filter((j) => {
    const matchSearch = !search || j.title?.toLowerCase().includes(search.toLowerCase()) || j.description?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || j.status === statusFilter;
    const matchUser = mode !== "assigned" || selectedUser === "all" || j.user_email === selectedUser || j.created_by === selectedUser;
    return matchSearch && matchStatus && matchUser;
  });

  const stats = mode === "catalog"
    ? {
        total: visibleJourneys.length,
        published: visibleJourneys.filter((j) => j.status === "published").length,
        draft: visibleJourneys.filter((j) => j.status === "draft").length,
      }
    : {
        total: visibleJourneys.length,
        active: visibleJourneys.filter((j) => j.status === "active" || j.status === "paused").length,
        completed: visibleJourneys.filter((j) => j.status === "completed").length,
      };

  const handleStatusChange = async (journey, newStatus) => {
    try {
      await base44.entities.Journey.update(journey.id, { status: newStatus });
      toast.success(`Journey ${newStatus}`);
      load();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (journey) => {
    if (!confirm(`Delete "${journey.title}"? This cannot be undone.`)) return;
    try {
      await base44.entities.Journey.delete(journey.id);
      toast.success("Journey deleted");
      load();
    } catch (err) {
      toast.error("Failed to delete journey");
    }
  };

  const handleDuplicate = async (journey) => {
    try {
      const { id, created_date, updated_date, source_entity, source_id, ...data } = journey;
      await base44.entities.Journey.create({ ...data, title: `${journey.title} (Copy)`, status: mode === "catalog" ? "draft" : "active" });
      toast.success("Journey duplicated");
      load();
    } catch (err) {
      toast.error("Failed to duplicate");
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#0202ff] rounded-full animate-spin" /></div>;
  }

  const statusOptions = mode === "catalog"
    ? [{ value: "all", label: "All Status" }, { value: "draft", label: "Draft" }, { value: "published", label: "Published" }, { value: "archived", label: "Archived" }, { value: "template", label: "Template" }]
    : [{ value: "all", label: "All Status" }, { value: "active", label: "Active" }, { value: "paused", label: "Paused" }, { value: "completed", label: "Completed" }, { value: "cancelled", label: "Cancelled" }];

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-1 bg-gray-50 border border-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => { setMode("catalog"); setStatusFilter("all"); setSelectedUser("all"); }}
          className={`flex items-center gap-1.5 text-sm font-medium py-1.5 px-3 rounded-lg transition-all ${mode === "catalog" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Map className="w-3.5 h-3.5" /> Catalog (reusable)
        </button>
        <button
          onClick={() => { setMode("assigned"); setStatusFilter("all"); setSelectedUser("all"); }}
          className={`flex items-center gap-1.5 text-sm font-medium py-1.5 px-3 rounded-lg transition-all ${mode === "assigned" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Users className="w-3.5 h-3.5" /> Assigned (person-specific)
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(stats).map(([key, value]) => (
          <Card key={key} className="shadow-sm border border-gray-100 rounded-2xl">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-[#0202ff]">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5 capitalize">{key}</p>
            </CardContent>
          </Card>
        ))}
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
          {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {mode === "assigned" && (
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="h-9 text-sm border border-gray-200 rounded-lg px-3 bg-white focus:outline-none focus:ring-1 focus:ring-[#0202ff]/30"
          >
            <option value="all">All Users</option>
            {users.map((u) => <option key={u.id} value={u.email}>{u.full_name || u.email}</option>)}
          </select>
        )}
      </div>

      <Button size="sm" className="w-full bg-[#0202ff] hover:bg-[#0101dd] text-white" onClick={() => { setEditing(null); setShowEditor(true); }}>
        <Plus className="w-4 h-4 mr-1.5" /> New {mode === "catalog" ? "Catalog" : "Assigned"} Journey
      </Button>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="shadow-sm border border-gray-100 rounded-2xl">
            <CardContent className="p-8 text-center">
              <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="font-semibold text-gray-800">No {mode} journeys found</p>
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
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${(mode === "catalog" ? CATALOG_STATUS : ASSIGNED_STATUS)[journey.status] || "bg-gray-100 text-gray-600"}`}>
                          {journey.status}
                        </span>
                        {journey.is_template && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">template</span>}
                      </div>
                      {mode === "assigned" && journey.user_email && (
                        <p className="text-xs text-[#0202ff] mb-1">{journey.user_email}</p>
                      )}
                      {mode === "catalog" && journey.author_email && (
                        <p className="text-xs text-[#0202ff] mb-1">{journey.author_email}</p>
                      )}
                      {journey.description && <p className="text-xs text-gray-500 line-clamp-2 mb-2">{journey.description}</p>}
                      {mode === "assigned" && journey.target_competencies?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {journey.target_competencies.slice(0, 3).map((c) => (
                            <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">{c}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {mode === "catalog" && journey.content_structure?.length > 0 && (
                          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {journey.content_structure.length} resources</span>
                        )}
                        {mode === "assigned" && journey.experiences?.length > 0 && (
                          <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {journey.experiences.length} exp</span>
                        )}
                        {mode === "assigned" && journey.learning_items?.length > 0 && (
                          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {journey.learning_items.length} resources</span>
                        )}
                        {journey.target_date && (
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Due {new Date(journey.target_date).toLocaleDateString()}</span>
                        )}
                        {mode === "catalog" && journey.assigned_to_emails?.length > 0 && (
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {journey.assigned_to_emails.length} assigned</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
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
                          <DropdownMenuItem onClick={() => handleDuplicate(journey)}>
                            <Copy className="w-4 h-4 mr-2" /> Duplicate
                          </DropdownMenuItem>
                          {mode === "catalog" && (
                            <>
                              {journey.status === "draft" && (
                                <DropdownMenuItem onClick={() => handleStatusChange(journey, "published")}>
                                  <Play className="w-4 h-4 mr-2" /> Publish
                                </DropdownMenuItem>
                              )}
                              {journey.status === "published" && (
                                <DropdownMenuItem onClick={() => handleStatusChange(journey, "archived")}>
                                  <Pause className="w-4 h-4 mr-2" /> Archive
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                          {mode === "assigned" && (
                            <DropdownMenuItem onClick={() => setAssigning(journey)}>
                              <UserPlus className="w-4 h-4 mr-2" /> Assign to participant
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
        defaultMode={mode}
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