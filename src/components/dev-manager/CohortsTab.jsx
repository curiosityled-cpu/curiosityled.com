import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Plus, Search, Loader2, Calendar, Pencil, Trash2, UserPlus, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import CohortCreationModal from "./CohortCreationModal";

const STATUS_BADGES = {
  planning: "bg-gray-100 text-gray-700",
  enrollment_open: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

const PROGRAM_TYPE_LABELS = {
  emerging_leaders: "Emerging Leaders",
  executive_development: "Executive Development",
  new_manager_bootcamp: "New Manager Bootcamp",
  team_effectiveness: "Team Effectiveness",
  coaching_cohort: "Coaching Cohort",
  certification: "Certification",
  custom: "Custom Program",
};

export default function CohortsTab({ user }) {
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCohort, setEditingCohort] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);

  const loadCohorts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Cohort.list("-created_date");
      setCohorts(data || []);
    } catch (error) {
      console.error("Error loading cohorts:", error);
      toast.error("Failed to load cohorts");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const users = await base44.entities.User.list();
      setAllUsers(users || []);
    } catch { setAllUsers([]); }
  }, []);

  useEffect(() => { loadCohorts(); loadUsers(); }, [loadCohorts, loadUsers]);

  const filtered = cohorts.filter(c =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (cohort) => {
    if (!confirm(`Delete cohort "${cohort.name}"? This cannot be undone.`)) return;
    try {
      await base44.entities.Cohort.delete(cohort.id);
      toast.success("Cohort deleted");
      loadCohorts();
    } catch (error) {
      console.error("Error deleting cohort:", error);
      toast.error("Failed to delete cohort");
    }
  };

  const handleEditParticipants = (cohort) => {
    setEditingCohort(cohort);
    setShowEditModal(true);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Cohorts', value: cohorts.length, color: 'text-[#0202ff]' },
          { label: 'Active', value: cohorts.filter(c => c.status === 'active').length, color: 'text-green-600' },
          { label: 'Participants', value: cohorts.reduce((sum, c) => sum + (c.participant_emails?.length || 0), 0), color: 'text-purple-600' },
        ].map(s => (
          <Card key={s.label} className="shadow-sm border border-gray-100 rounded-2xl">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters + Create */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search cohorts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="bg-[#0202ff] hover:bg-[#0101dd] text-white h-9 text-xs">
          <Plus className="w-4 h-4 mr-1" /> Create Cohort
        </Button>
      </div>

      {/* Cohort List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="shadow-sm border border-gray-100 rounded-2xl">
            <CardContent className="p-8 text-center">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="font-semibold text-gray-800">No cohorts found</p>
              <p className="text-sm text-gray-500 mt-1">Create a cohort to group participants into a development program.</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((cohort, i) => (
            <motion.div key={cohort.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="shadow-sm border border-gray-100 rounded-2xl hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-medium text-gray-900 leading-snug">{cohort.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGES[cohort.status] || 'bg-gray-100 text-gray-600'}`}>
                          {cohort.status?.replace(/_/g, ' ')}
                        </span>
                      </div>
                      {cohort.program_type && (
                        <p className="text-xs text-[#0202ff] mb-1">{PROGRAM_TYPE_LABELS[cohort.program_type] || cohort.program_type.replace(/_/g, ' ')}</p>
                      )}
                      {cohort.description && <p className="text-xs text-gray-500 line-clamp-2 mb-2">{cohort.description}</p>}
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {cohort.participant_emails?.length || 0} participants</span>
                        {cohort.start_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(cohort.start_date).toLocaleDateString()}</span>}
                        {cohort.end_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(cohort.end_date).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <button onClick={() => handleEditParticipants(cohort)} className="text-gray-400 hover:text-[#0202ff] transition-colors" title="Edit participants">
                        <UserPlus className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(cohort)} className="text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      <CohortCreationModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadCohorts}
      />

      {editingCohort && (
        <EditParticipantsModal
          cohort={editingCohort}
          users={allUsers}
          open={showEditModal}
          onClose={() => { setShowEditModal(false); setEditingCohort(null); }}
          onSaved={loadCohorts}
        />
      )}
    </div>
  );
}

function EditParticipantsModal({ cohort, users, open, onClose, onSaved }) {
  const [participants, setParticipants] = useState(cohort.participant_emails || []);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setParticipants(cohort.participant_emails || []);
  }, [open, cohort]);

  const filteredUsers = users.filter(u =>
    !search ||
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 50);

  const toggle = (email) => {
    setParticipants(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Cohort.update(cohort.id, { participant_emails: participants });
      toast.success("Cohort updated");
      onSaved();
      onClose();
    } catch (error) {
      console.error("Error updating cohort:", error);
      toast.error("Failed to update cohort");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Participants — {cohort.name}</DialogTitle>
          <DialogDescription>{participants.length} participant{participants.length !== 1 ? 's' : ''} enrolled</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {participants.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-blue-50 rounded-lg">
              {participants.map(email => (
                <Badge key={email} variant="secondary" className="flex items-center gap-1">
                  {email}
                  <button type="button" onClick={() => toggle(email)} className="ml-1 hover:text-red-600"><X className="w-3 h-3" /></button>
                </Badge>
              ))}
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input type="text" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <ScrollArea className="h-64 border rounded-lg p-2">
            <div className="space-y-1">
              {filteredUsers.map(u => (
                <button key={u.email} type="button" onClick={() => toggle(u.email)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${participants.includes(u.email) ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50 border-transparent'}`}>
                  <div className="font-medium">{u.full_name || u.email}</div>
                  <div className="text-sm text-gray-500">{u.email}</div>
                </button>
              ))}
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}