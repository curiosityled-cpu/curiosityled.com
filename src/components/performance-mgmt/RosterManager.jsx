import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, Plus, Users, Trash2, Upload, Rocket, CheckCircle2, Clock, AlertCircle, Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RosterAutoPopulate from "./RosterAutoPopulate";
import OrgUserPicker from "./OrgUserPicker";

const STATUS_STYLES = {
  assigned: "bg-gray-50 text-gray-600 border-gray-200",
  self_submitted: "bg-blue-50 text-blue-700 border-blue-200",
  manager_submitted: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  acknowledged: "bg-purple-50 text-purple-700 border-purple-200",
};

function AddParticipantModal({ isOpen, onClose, cycleId, cycle, clientId, onAdded }) {
  const [form, setForm] = useState({ employee_email: "", employee_name: "", manager_email: "", peer_emails: [], self_assessment_due: "", manager_review_due: "" });
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const s = cycle?.settings || {};
      setForm({
        employee_email: "",
        employee_name: "",
        manager_email: "",
        peer_emails: [],
        self_assessment_due: s.self_assessment_due || "",
        manager_review_due: s.manager_review_due || "",
      });
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const userList = await base44.entities.User.list(500);
      let profiles = [];
      try {
        profiles = await base44.entities.UserProfile.filter({ tenant_id: clientId }, "-created_date", 500);
      } catch (e) { /* profiles may not exist */ }
      const profileMap = {};
      profiles.forEach(p => { if (p.email) profileMap[p.email.toLowerCase()] = p; });
      const enriched = userList
        .filter(u => u.email)
        .map(u => {
          const profile = profileMap[u.email.toLowerCase()];
          return {
            email: u.email,
            name: u.full_name || u.email,
            department: profile?.department || u.data?.department || "Unassigned",
            manager_email: profile?.manager_email || u.data?.manager_email || "",
          };
        });
      setUsers(enriched);
    } catch (err) {
      toast.error("Failed to load users: " + err.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSelectEmployee = (email) => {
    const u = users.find(x => x.email === email);
    if (u) {
      setForm(p => ({
        ...p,
        employee_email: u.email.toLowerCase(),
        employee_name: u.name,
        manager_email: u.manager_email?.toLowerCase() || "",
        peer_emails: p.peer_emails.filter(e => e !== email),
      }));
    }
  };

  const handleSubmit = async () => {
    if (!form.employee_email.trim()) return;
    setSubmitting(true);
    try {
      await base44.entities.ReviewParticipant.create({
        client_id: clientId,
        review_cycle_id: cycleId,
        employee_email: form.employee_email.toLowerCase().trim(),
        employee_name: form.employee_name,
        manager_email: form.manager_email.toLowerCase().trim(),
        peer_emails: form.peer_emails,
        self_assessment_due: form.self_assessment_due || null,
        manager_review_due: form.manager_review_due || null,
        status: "assigned",
      });
      toast.success("Participant added");
      onAdded?.();
      onClose();
    } catch (err) {
      toast.error("Failed to add participant: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Participant</DialogTitle></DialogHeader>
        {loadingUsers ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#0202ff]" /></div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Select Employee *</Label>
              <Select onValueChange={handleSelectEmployee} value={form.employee_email}>
                <SelectTrigger><SelectValue placeholder="Choose a user to review..." /></SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.email} value={u.email}>
                      {u.name} — {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.employee_email && (
              <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-lg p-2.5">
                <div>
                  <p className="text-[10px] text-gray-400 font-medium">Email</p>
                  <p className="text-xs text-gray-700 truncate">{form.employee_email}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-medium">Name</p>
                  <p className="text-xs text-gray-700 truncate">{form.employee_name}</p>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Manager Email</Label>
              <Input placeholder="manager@company.com" value={form.manager_email} onChange={e => setForm(p => ({ ...p, manager_email: e.target.value }))} />
              <p className="text-[10px] text-gray-400">Auto-filled from profile; edit if needed</p>
            </div>
            <div className="space-y-1.5">
              <Label>Peer Reviewers</Label>
              <OrgUserPicker
                users={users}
                selected={form.peer_emails}
                onChange={(emails) => setForm(p => ({ ...p, peer_emails: emails }))}
                excludeEmails={[form.employee_email].filter(Boolean)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Self-Assessment Due</Label>
                <Input type="date" value={form.self_assessment_due} onChange={e => setForm(p => ({ ...p, self_assessment_due: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Manager Review Due</Label>
                <Input type="date" value={form.manager_review_due} onChange={e => setForm(p => ({ ...p, manager_review_due: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting || !form.employee_email.trim()} className="bg-[#0202ff] hover:bg-[#0101dd] text-white">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CSVUploadModal({ isOpen, onClose, cycleId, clientId, onUploaded }) {
  const [csvText, setCsvText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleUpload = async () => {
    if (!csvText.trim()) return;
    setSubmitting(true);
    try {
      const lines = csvText.trim().split("\n");
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      const participants = lines.slice(1).map(line => {
        const vals = line.split(",").map(v => v.trim());
        const row = {};
        headers.forEach((h, i) => { row[h] = vals[i] || ""; });
        return {
          employee_email: row.employee_email || row.email || "",
          employee_name: row.employee_name || row.name || "",
          manager_email: row.manager_email || row.manager || "",
          peer_emails: row.peer_emails ? row.peer_emails.split(";").map(e => e.trim()).filter(Boolean) : [],
          self_assessment_due: row.self_assessment_due || "",
          manager_review_due: row.manager_review_due || "",
        };
      }).filter(p => p.employee_email);

      const res = await base44.functions.invoke("assignReviewParticipants", {
        review_cycle_id: cycleId,
        participants,
      });
      toast.success(`${res.data.assigned} participants assigned`);
      setCsvText("");
      onUploaded?.();
      onClose();
    } catch (err) {
      const data = err.response?.data;
      if (data?.invalid_emails) {
        toast.error(`Invalid emails (not tenant users): ${data.invalid_emails.join(", ")}`);
      } else {
        toast.error("Upload failed: " + (err.message || "Unknown error"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Bulk Upload Participants (CSV)</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            Paste CSV with headers: <code className="text-[10px] bg-gray-100 px-1 py-0.5 rounded">employee_email,employee_name,manager_email,peer_emails,self_assessment_due,manager_review_due</code>
          </p>
          <Textarea rows={8} placeholder="employee_email,employee_name,manager_email,peer_emails,self_assessment_due,manager_review_due&#10;jane@company.com,Jane Doe,mgr@company.com,peer1@co.com;peer2@co.com,2026-12-01,2026-12-15" value={csvText} onChange={e => setCsvText(e.target.value)} className="font-mono text-xs" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleUpload} disabled={submitting || !csvText.trim()} className="bg-[#0202ff] hover:bg-[#0101dd] text-white">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload & Assign
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function RosterManager({ cycle, user, onRosterUpdated }) {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showCSV, setShowCSV] = useState(false);
  const [showAutoPopulate, setShowAutoPopulate] = useState(false);
  const [launching, setLaunching] = useState(false);

  const loadRoster = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("getReviewRoster", { review_cycle_id: cycle.id });
      setRoster(res.data.roster || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRoster(); }, [cycle.id]);

  const handleRemove = async (participantId) => {
    try {
      await base44.entities.ReviewParticipant.delete(participantId);
      setRoster(prev => prev.filter(p => p.id !== participantId));
      toast.success("Participant removed");
    } catch (err) {
      toast.error("Failed to remove");
    }
  };

  const handleLaunch = async () => {
    setLaunching(true);
    try {
      const res = await base44.functions.invoke("launchReviewCycle", { review_cycle_id: cycle.id });
      toast.success(`Cycle launched — ${res.data.participants_notified} participants notified`);
      onRosterUpdated?.();
    } catch (err) {
      toast.error("Launch failed: " + (err.message || "Unknown error"));
    } finally {
      setLaunching(false);
    }
  };

  const stats = roster.length > 0 ? {
    total: roster.length,
    self: roster.filter(p => p.self_assessment_submitted).length,
    mgr: roster.filter(p => p.manager_review_submitted).length,
    done: roster.filter(p => p.status === "completed").length,
  } : { total: 0, self: 0, mgr: 0, done: 0 };

  return (
    <div className="space-y-3">
      {/* Stats bar */}
      <div className="flex items-center gap-4 text-xs">
        <span className="text-gray-500">{stats.total} participants</span>
        <span className="text-blue-600">{stats.self} self-done</span>
        <span className="text-amber-600">{stats.mgr} mgr-done</span>
        <span className="text-green-600">{stats.done} complete</span>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setShowAdd(true)} className="h-8 text-xs bg-[#0202ff] hover:bg-[#0101dd] text-white gap-1">
          <Plus className="w-3.5 h-3.5" /> Add Participant
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowAutoPopulate(true)} className="h-8 text-xs gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
          <Sparkles className="w-3.5 h-3.5" /> Auto-Populate
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowCSV(true)} className="h-8 text-xs gap-1">
          <Upload className="w-3.5 h-3.5" /> Bulk CSV
        </Button>
        {cycle.status === "draft" && roster.length > 0 && (
          <Button size="sm" onClick={handleLaunch} disabled={launching} className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white gap-1 ml-auto">
            {launching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
            Launch & Notify
          </Button>
        )}
      </div>

      {/* Roster table */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#0202ff]" /></div>
      ) : roster.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-gray-200 rounded-xl">
          <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No participants assigned yet</p>
          <p className="text-xs text-gray-400 mt-1">Add participants individually or upload a CSV</p>
        </div>
      ) : (
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Employee</th>
                  <th className="text-left px-3 py-2 font-medium">Manager</th>
                  <th className="text-left px-3 py-2 font-medium">Peers</th>
                  <th className="text-left px-3 py-2 font-medium">Due Dates</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {roster.map((p, i) => (
                  <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <p className="font-medium text-gray-900">{p.employee_name || p.employee_email}</p>
                      <p className="text-[10px] text-gray-400">{p.employee_email}</p>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{p.manager_email || "—"}</td>
                    <td className="px-3 py-2 text-gray-600">{p.peer_emails?.length || 0}</td>
                    <td className="px-3 py-2 text-gray-500">
                      {p.self_assessment_due && <div>Self: {format(new Date(p.self_assessment_due), "MMM d")}</div>}
                      {p.manager_review_due && <div>Mgr: {format(new Date(p.manager_review_due), "MMM d")}</div>}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className={`text-[10px] border ${STATUS_STYLES[p.status] || STATUS_STYLES.assigned}`}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleRemove(p.id)}>
                        <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdd && <AddParticipantModal isOpen={showAdd} onClose={() => setShowAdd(false)} cycleId={cycle.id} cycle={cycle} clientId={user.client_id || user.data?.client_id} onAdded={loadRoster} />}
      {showCSV && <CSVUploadModal isOpen={showCSV} onClose={() => setShowCSV(false)} cycleId={cycle.id} clientId={user.client_id || user.data?.client_id} onUploaded={loadRoster} />}
      {showAutoPopulate && <RosterAutoPopulate isOpen={showAutoPopulate} onClose={() => setShowAutoPopulate(false)} cycle={cycle} user={user} onPopulated={loadRoster} />}
    </div>
  );
}