import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, Clock, CheckCircle2, Search, Plus, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion } from "framer-motion";

const STATUS_BADGE = {
  assigned: "bg-gray-100 text-gray-700",
  started: "bg-blue-100 text-blue-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
};

const PRIORITY_DOT = { urgent: "bg-red-500", high: "bg-amber-500", medium: "bg-blue-400", low: "bg-gray-300" };

function AssignLearningDialog({ open, onClose, users, onAssigned }) {
  const [userEmail, setUserEmail] = useState('');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!userEmail || !title.trim()) return;
    setSaving(true);
    await base44.entities.AssignedLearning.create({
      user_email: userEmail,
      learning_resource_id: 'manual',
      assigned_by: 'admin',
      title,
      priority,
      status: 'assigned',
    });
    toast.success('Learning assigned');
    setUserEmail(''); setTitle(''); setPriority('medium');
    setSaving(false);
    onAssigned();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Assign Learning</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-2">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">User</label>
            <select value={userEmail} onChange={e => setUserEmail(e.target.value)} className="w-full h-9 text-sm border border-gray-200 rounded-lg px-3 bg-white focus:outline-none focus:ring-1 focus:ring-[#0202ff]/30">
              <option value="">Select user...</option>
              {users.map(u => <option key={u.id} value={u.email}>{u.full_name || u.email}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Title</label>
            <Input placeholder="Learning resource title..." value={title} onChange={e => setTitle(e.target.value)} className="h-9 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full h-9 text-sm border border-gray-200 rounded-lg px-3 bg-white focus:outline-none focus:ring-1 focus:ring-[#0202ff]/30">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={handleSave} disabled={saving || !userEmail || !title.trim()} className="bg-[#0202ff] hover:bg-[#0101dd] text-white flex-1">
              {saving ? 'Saving...' : 'Assign'}
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminLearningTab({ user }) {
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [search, setSearch] = useState('');
  const [selectedUserEmail, setSelectedUserEmail] = useState('all');
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allAssignments, allUsers] = await Promise.all([
        base44.entities.AssignedLearning.list('-created_date'),
        base44.entities.User.filter({ client_id: user.client_id })
      ]);
      setAssignments(allAssignments);
      setUsers(allUsers);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user.client_id]);

  useEffect(() => { load(); }, [load]);

  const active = assignments.filter(a => a.status !== 'completed');
  const completed = assignments.filter(a => a.status === 'completed');

  const filtered = (activeTab === 'active' ? active : completed).filter(a => {
    const matchSearch = !search || a.title?.toLowerCase().includes(search.toLowerCase()) || a.user_email?.toLowerCase().includes(search.toLowerCase());
    const matchUser = selectedUserEmail === 'all' || a.user_email === selectedUserEmail;
    return matchSearch && matchUser;
  });

  const handleUpdateStatus = async (id, status) => {
    const updateData = { status };
    if (status === 'completed') updateData.completion_date = new Date().toISOString();
    await base44.entities.AssignedLearning.update(id, updateData);
    toast.success('Updated');
    load();
  };

  const handleUnenroll = async (id) => {
    await base44.entities.AssignedLearning.delete(id);
    toast.success('Unenrolled');
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#0202ff] rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Assigned', value: assignments.length, color: 'text-[#0202ff]' },
          { label: 'Active', value: active.length, color: 'text-blue-600' },
          { label: 'Completed', value: completed.length, color: 'text-emerald-600' },
        ].map(s => (
          <Card key={s.label} className="shadow-sm border border-gray-100 rounded-2xl">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <select value={selectedUserEmail} onChange={e => setSelectedUserEmail(e.target.value)} className="h-9 text-sm border border-gray-200 rounded-lg px-3 bg-white focus:outline-none focus:ring-1 focus:ring-[#0202ff]/30">
          <option value="all">All Users</option>
          {users.map(u => <option key={u.id} value={u.email}>{u.full_name || u.email}</option>)}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-50 border border-gray-100 rounded-xl p-1">
        <button onClick={() => setActiveTab("active")} className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-all ${activeTab === "active" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>Active ({active.length})</button>
        <button onClick={() => setActiveTab("completed")} className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-all ${activeTab === "completed" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>Completed ({completed.length})</button>
      </div>

      <Button size="sm" className="w-full bg-[#0202ff] hover:bg-[#0101dd] text-white" onClick={() => setShowAssignDialog(true)}>
        <Plus className="w-4 h-4 mr-1.5" /> Assign Learning
      </Button>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="shadow-sm border border-gray-100 rounded-2xl">
            <CardContent className="p-8 text-center">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="font-semibold text-gray-800">No assignments found</p>
            </CardContent>
          </Card>
        ) : filtered.map((item, i) => (
          <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Card className="shadow-sm border border-gray-100 rounded-2xl hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_DOT[item.priority] || 'bg-blue-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 leading-snug">{item.title}</p>
                    <p className="text-xs text-[#0202ff] mt-0.5">{item.user_email}</p>
                    {item.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <select
                        value={item.status}
                        onChange={e => handleUpdateStatus(item.id, e.target.value)}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#0202ff]/30 ${STATUS_BADGE[item.status] || STATUS_BADGE.assigned}`}
                      >
                        <option value="assigned">Enrolled</option>
                        <option value="started">Started</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                      {item.due_date && <span className="flex items-center gap-1 text-xs text-gray-400"><Clock className="w-3 h-3" /> Due {new Date(item.due_date).toLocaleDateString()}</span>}
                      <button onClick={() => handleUnenroll(item.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors ml-auto">Unenroll</button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <AssignLearningDialog open={showAssignDialog} onClose={() => setShowAssignDialog(false)} users={users} onAssigned={load} />
    </div>
  );
}