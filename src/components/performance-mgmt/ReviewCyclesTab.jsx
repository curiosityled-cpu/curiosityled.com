import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, ClipboardList, Users, Calendar, CheckCircle2, Clock, Download, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import RosterManager from "./RosterManager";
import CommunicationTimeline from "./CommunicationTimeline";
import QuarterlyCheckpoint from "./QuarterlyCheckpoint";

const REVIEW_TYPES = [
  { value: "manager_review", label: "Manager Review" },
  { value: "self_assessment", label: "Self Assessment" },
  { value: "peer_review", label: "Peer Review" },
  { value: "360", label: "360° Review" },
];

const CYCLE_LENGTHS = [
  { value: "annual", label: "Annual (12 months)", months: 12 },
  { value: "semi_annual", label: "Semi-Annual (6 months)", months: 6 },
  { value: "quarterly", label: "Quarterly (3 months)", months: 3 },
];

const CYCLE_STATUS_STYLES = {
  draft: "bg-gray-50 text-gray-600 border-gray-200",
  active: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  closed: "bg-gray-100 text-gray-500 border-gray-200",
};

// We store review cycles in CustomForm entity with form_type='review_cycle'
function CreateCycleModal({ isOpen, onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: "",
    review_type: "manager_review",
    cycle_length: "annual",
    skip_level_review_enabled: false,
    period_start: "",
    period_end: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (form.period_start && form.cycle_length) {
      const start = new Date(form.period_start);
      const months = CYCLE_LENGTHS.find(c => c.value === form.cycle_length)?.months || 12;
      start.setMonth(start.getMonth() + months);
      setForm(p => ({ ...p, period_end: start.toISOString().split("T")[0] }));
    }
  }, [form.period_start, form.cycle_length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.period_start || !form.period_end) return;
    setSubmitting(true);
    try {
      await onSubmit(form);
      setForm({ name: "", review_type: "manager_review", cycle_length: "annual", skip_level_review_enabled: false, period_start: "", period_end: "", description: "" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Create Review Cycle</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Cycle Name *</Label>
            <Input placeholder="e.g., Q2 2026 Performance Review" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Review Type *</Label>
              <Select value={form.review_type} onValueChange={v => setForm(p => ({ ...p, review_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REVIEW_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Cycle Length *</Label>
              <Select value={form.cycle_length} onValueChange={v => setForm(p => ({ ...p, cycle_length: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CYCLE_LENGTHS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Period Start *</Label>
              <Input type="date" value={form.period_start} onChange={e => setForm(p => ({ ...p, period_start: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Period End *</Label>
              <Input type="date" value={form.period_end} onChange={e => setForm(p => ({ ...p, period_end: e.target.value }))} required />
            </div>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.skip_level_review_enabled}
              onChange={e => setForm(p => ({ ...p, skip_level_review_enabled: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-[#0202ff] focus:ring-[#0202ff]"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Enable skip-level review</span>
              <p className="text-xs text-gray-400">The manager's manager reviews and approves the assessment before calibration</p>
            </div>
          </label>
          {form.period_end && (
            <CommunicationTimeline periodEnd={form.period_end} />
          )}
          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Input placeholder="What's the focus of this review cycle?" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting || !form.name || !form.period_start || !form.period_end} className="bg-[#0202ff] hover:bg-[#0101dd] text-white">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Cycle"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ReviewCyclesTab({ user }) {
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [expandedCycleId, setExpandedCycleId] = useState(null);
  const [checkpointCycle, setCheckpointCycle] = useState(null);

  useEffect(() => { loadCycles(); }, [user]);

  const loadCycles = async () => {
    setLoading(true);
    try {
      // Use CustomForm with form_type = 'review_cycle' as lightweight storage
      const data = await base44.entities.CustomForm.filter({
        form_type: "review_cycle",
        client_id: user.client_id,
      }, "-created_date");
      setCycles(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (form) => {
    try {
      const newCycle = await base44.entities.CustomForm.create({
        title: form.name,
        description: form.description,
        form_type: "review_cycle",
        form_category: "operational",
        client_id: user.client_id,
        status: "draft",
        settings: {
          review_type: form.review_type,
          cycle_length: form.cycle_length,
          skip_level_review_enabled: form.skip_level_review_enabled,
          period_start: form.period_start,
          period_end: form.period_end,
        },
      });
      setCycles(prev => [newCycle, ...prev]);
      setShowCreate(false);
      toast.success("Review cycle created");
    } catch {
      toast.error("Failed to create review cycle");
    }
  };

  const handleActivate = async (cycle) => {
    try {
      await base44.entities.CustomForm.update(cycle.id, { status: "active" });
      setCycles(prev => prev.map(c => c.id === cycle.id ? { ...c, status: "active" } : c));
      toast.success("Review cycle activated");
    } catch {
      toast.error("Failed to activate cycle");
    }
  };

  const handleClose = async (cycle) => {
    try {
      await base44.entities.CustomForm.update(cycle.id, { status: "closed" });
      setCycles(prev => prev.map(c => c.id === cycle.id ? { ...c, status: "closed" } : c));
      toast.success("Review cycle closed");
    } catch {
      toast.error("Failed to close cycle");
    }
  };

  const handleExport = async (cycle) => {
    try {
      const res = await base44.functions.invoke("exportProgramPerformancePDF", { cycle_id: cycle.id, client_id: user.client_id });
      if (res.data?.url) window.open(res.data.url, "_blank");
      else toast.success("Export triggered");
    } catch {
      toast.error("Export failed");
    }
  };

  const filtered = cycles.filter(c =>
    filterType === "all" || c.settings?.review_type === filterType
  );

  const stats = {
    total: cycles.length,
    active: cycles.filter(c => c.status === "active").length,
    draft: cycles.filter(c => c.status === "draft").length,
    completed: cycles.filter(c => c.status === "closed").length,
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Cycles", value: stats.total, icon: ClipboardList, color: "#0202ff" },
          { label: "Active", value: stats.active, icon: Clock, color: "#FFCB00" },
          { label: "Draft", value: stats.draft, icon: AlertCircle, color: "#A25DDC" },
          { label: "Closed", value: stats.completed, icon: CheckCircle2, color: "#00C875" },
        ].map(s => (
          <Card key={s.label} className="border border-gray-100 shadow-sm rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}18` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-3">
        <Button onClick={() => setShowCreate(true)} className="bg-[#0202ff] hover:bg-[#0101dd] text-white gap-1.5">
          <Plus className="w-4 h-4" /> New Review Cycle
        </Button>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Review Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {REVIEW_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Cycles list */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No review cycles yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">Create your first review cycle to track performance reviews across the org</p>
          <Button onClick={() => setShowCreate(true)} className="bg-[#0202ff] hover:bg-[#0101dd] text-white gap-1.5">
            <Plus className="w-4 h-4" /> Create First Cycle
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((cycle, i) => {
            const settings = cycle.settings || {};
            const reviewTypeLabel = REVIEW_TYPES.find(t => t.value === settings.review_type)?.label || "Manager Review";
            return (
              <motion.div key={cycle.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="border border-gray-100 shadow-sm rounded-2xl hover:shadow-md transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <ClipboardList className="w-5 h-5 text-[#0202ff]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-gray-900">{cycle.title}</h3>
                            {cycle.description && <p className="text-sm text-gray-500 mt-0.5">{cycle.description}</p>}
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Badge variant="outline" className={`text-xs border ${CYCLE_STATUS_STYLES[cycle.status] || CYCLE_STATUS_STYLES.draft}`}>
                                {cycle.status || "draft"}
                              </Badge>
                              <Badge variant="outline" className="text-xs border border-gray-200 text-gray-600">
                                {reviewTypeLabel}
                              </Badge>
                              {settings.cycle_length && settings.cycle_length !== "annual" && (
                                <Badge variant="outline" className="text-xs border border-gray-200 text-gray-600">
                                  {CYCLE_LENGTHS.find(c => c.value === settings.cycle_length)?.label || settings.cycle_length}
                                </Badge>
                              )}
                              {settings.skip_level_review_enabled && (
                                <Badge variant="outline" className="text-xs border border-blue-200 text-blue-700 bg-blue-50">
                                  Skip-Level Review
                                </Badge>
                              )}
                              {settings.period_start && settings.period_end && (
                                <span className="flex items-center gap-1 text-xs text-gray-400">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(settings.period_start), "MMM d")} – {format(new Date(settings.period_end), "MMM d, yyyy")}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            {cycle.status === "draft" && (
                              <Button size="sm" className="h-8 text-xs bg-[#0202ff] hover:bg-[#0101dd] text-white" onClick={() => handleActivate(cycle)}>
                                Activate
                              </Button>
                            )}
                            {cycle.status === "active" && (
                              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleClose(cycle)}>
                                Close Cycle
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExport(cycle)}>
                              <Download className="w-3 h-3" /> Export
                            </Button>
                            {cycle.status === "active" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs gap-1"
                                onClick={() => setCheckpointCycle(cycle)}
                              >
                                <Calendar className="w-3 h-3" /> Checkpoint
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant={expandedCycleId === cycle.id ? "default" : "outline"}
                              className="h-8 text-xs gap-1"
                              onClick={() => setExpandedCycleId(expandedCycleId === cycle.id ? null : cycle.id)}
                            >
                              <Users className="w-3 h-3" />
                              {expandedCycleId === cycle.id ? "Hide Roster" : "Manage Roster"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {expandedCycleId === cycle.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3">
                    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Participant Roster</h4>
                      <RosterManager cycle={cycle} user={user} onRosterUpdated={loadCycles} />
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <CreateCycleModal isOpen={showCreate} onClose={() => setShowCreate(false)} onSubmit={handleCreate} />
      {checkpointCycle && (
        <QuarterlyCheckpoint
          cycle={checkpointCycle}
          user={user}
          onClose={() => setCheckpointCycle(null)}
          onSaved={loadCycles}
        />
      )}
    </div>
  );
}