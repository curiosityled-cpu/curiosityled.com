import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useAtreusChat } from "@/components/ai/AtreusContext";
import { Link } from "react-router-dom";
import {
  Layers, Plus, ChevronLeft, ChevronRight, Trash2,
  Calendar, User, Target, CheckCircle2, ArrowRight, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  assigned: { label: "Assigned", color: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300" },
  in_progress: { label: "In Progress", color: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" },
  complete: { label: "Complete", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" },
};

const SKILL_LABELS = {
  beginner: "Beginner — needs guidance",
  developing: "Developing — some experience",
  proficient: "Proficient — ready to own it",
};

function PlanForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    task_name: initial?.task_name || "",
    task_context: initial?.task_context || "",
    delegatee_name: initial?.delegatee_name || "",
    delegatee_email: initial?.delegatee_email || "",
    skill_level: initial?.skill_level || "developing",
    development_goal: initial?.development_goal || "",
    success_criteria: initial?.success_criteria || "",
    check_in_date: initial?.check_in_date || "",
    status: initial?.status || "draft",
    ...initial,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="task_name">What are you delegating?</Label>
        <Input id="task_name" value={form.task_name} onChange={e => set("task_name", e.target.value)}
          placeholder="e.g. Own the weekly ops report" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="task_context">Why delegate this — and why now?</Label>
        <Textarea id="task_context" value={form.task_context} onChange={e => set("task_context", e.target.value)}
          placeholder="What's involved, what makes it a good hand-off, what's the urgency…" rows={3} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="delegatee_name">Delegating to</Label>
          <Input id="delegatee_name" value={form.delegatee_name} onChange={e => set("delegatee_name", e.target.value)}
            placeholder="Name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="delegatee_email">Their email (optional)</Label>
          <Input id="delegatee_email" type="email" value={form.delegatee_email} onChange={e => set("delegatee_email", e.target.value)}
            placeholder="name@company.com" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="skill_level">Their current skill level</Label>
        <Select value={form.skill_level} onValueChange={v => set("skill_level", v)}>
          <SelectTrigger id="skill_level"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(SKILL_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="development_goal">What does this build in them?</Label>
        <Textarea id="development_goal" value={form.development_goal} onChange={e => set("development_goal", e.target.value)}
          placeholder="e.g. Builds their confidence with stakeholder comms" rows={2} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="success_criteria">What does done look like?</Label>
        <Textarea id="success_criteria" value={form.success_criteria} onChange={e => set("success_criteria", e.target.value)}
          placeholder="Clear, measurable definition of success…" rows={2} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="check_in_date">Check in on</Label>
          <Input id="check_in_date" type="date" value={form.check_in_date} onChange={e => set("check_in_date", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <Select value={form.status} onValueChange={v => set("status", v)}>
            <SelectTrigger id="status"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1">Save plan</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function PlanCard({ plan, onEdit, onDelete, onStatusChange }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[plan.status] || STATUS_CONFIG.draft;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={`text-[10px] ${cfg.color}`}>{cfg.label}</Badge>
            {plan.check_in_date && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Calendar className="w-3 h-3" /> {new Date(plan.check_in_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-card-foreground">{plan.task_name}</p>
          {plan.delegatee_name && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <User className="w-3 h-3" /> {plan.delegatee_name}
              {plan.skill_level && <span className="text-muted-foreground/70">· {plan.skill_level}</span>}
            </p>
          )}
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground p-1">
          <ChevronRight className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pt-3 mt-3 border-t border-border text-sm">
              {plan.task_context && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Context</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">{plan.task_context}</p>
                </div>
              )}
              {plan.development_goal && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Development goal</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">{plan.development_goal}</p>
                </div>
              )}
              {plan.success_criteria && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Success criteria</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">{plan.success_criteria}</p>
                </div>
              )}
              {plan.outcome_notes && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Outcome</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">{plan.outcome_notes}</p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                {plan.status !== 'complete' && (
                  <Button size="sm" variant="outline" onClick={() => onStatusChange(plan.id, 'complete')}
                    className="text-xs h-8">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark complete
                  </Button>
                )}
                {plan.delegatee_email && plan.status === 'draft' && (
                  <Button size="sm" variant="outline" asChild className="text-xs h-8">
                    <Link to="/one-on-ones">
                      <ArrowRight className="w-3.5 h-3.5 mr-1" /> Add to 1:1
                    </Link>
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => onEdit(plan)} className="text-xs h-8 ml-auto">Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(plan.id)} className="text-xs h-8 text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DelegationPlanner() {
  const { user } = useAuth();
  const { openWithContext } = useAtreusChat();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['delegation-plans', user?.email],
    queryFn: async () => {
      try {
        return await base44.entities.DelegationPlan.filter({ user_email: user.email }, '-created_date', 50);
      } catch { return []; }
    },
    enabled: !!user?.email, staleTime: 60 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editing?.id) {
        return await base44.entities.DelegationPlan.update(editing.id, data);
      }
      return await base44.entities.DelegationPlan.create({ ...data, user_email: user.email });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delegation-plans', user?.email] });
      setShowForm(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => base44.entities.DelegationPlan.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delegation-plans', user?.email] }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }) => base44.entities.DelegationPlan.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delegation-plans', user?.email] }),
  });

  const activePlans = plans.filter(p => p.status !== 'complete');
  const completedPlans = plans.filter(p => p.status === 'complete');

  const handleEdit = (plan) => { setEditing(plan); setShowForm(true); };
  const handleNew = () => { setEditing(null); setShowForm(true); };
  const handleCancel = () => { setShowForm(false); setEditing(null); };
  const handleSave = (data) => saveMutation.mutate(data);
  const handleDelete = (id) => { if (confirm('Delete this delegation plan?')) deleteMutation.mutate(id); };
  const handleStatus = (id, status) => statusMutation.mutate({ id, status });

  const askAtreus = () => openWithContext({
    context: { pageType: 'delegation_planner' },
    starterMessage: "I want to think through what I should delegate. Can you help me identify a good task to hand off and how to frame it?"
  });

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <Link to="/practice" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-1">
            <ChevronLeft className="w-3 h-3" /> Practice
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center">
              <Layers className="w-4.5 h-4.5 text-orange-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Delegation Planner</h1>
              <p className="text-xs text-muted-foreground">Identify what to hand off and set your team up for success.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form / List toggle */}
      <AnimatePresence mode="wait">
        {showForm ? (
          <motion.div key="form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-sm font-semibold mb-4">{editing?.id ? 'Edit plan' : 'New delegation plan'}</h2>
              <PlanForm initial={editing} onSave={handleSave} onCancel={handleCancel} />
            </div>
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
            {/* Action bar */}
            <div className="flex gap-2">
              <Button onClick={handleNew} className="flex-1">
                <Plus className="w-4 h-4 mr-1" /> New plan
              </Button>
              <Button variant="outline" onClick={askAtreus}>
                <Sparkles className="w-4 h-4 mr-1" /> Ask Atreus
              </Button>
            </div>

            {/* Active plans */}
            <div className="space-y-2.5">
              {isLoading && (
                <p className="text-sm text-muted-foreground text-center py-8">Loading plans…</p>
              )}
              {!isLoading && activePlans.length === 0 && completedPlans.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <Layers className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">No delegation plans yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Start by identifying one task you can hand off.</p>
                </div>
              )}
              {activePlans.map(plan => (
                <PlanCard key={plan.id} plan={plan}
                  onEdit={handleEdit} onDelete={handleDelete} onStatusChange={handleStatus} />
              ))}
            </div>

            {/* Completed */}
            {completedPlans.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Completed</p>
                {completedPlans.map(plan => (
                  <PlanCard key={plan.id} plan={plan}
                    onEdit={handleEdit} onDelete={handleDelete} onStatusChange={handleStatus} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}