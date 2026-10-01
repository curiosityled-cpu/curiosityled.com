import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Radio, MoreHorizontal, Send, Play, Pause, Trash2, Copy, Loader2,
  Search, Users, Plus, FileText, ClipboardList, Brain,
  MessageSquare, BarChart3, HelpCircle, CheckCircle, ArrowRight, Radio as RadioIcon
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import SignalBuilderDialog from "./SignalBuilderDialog";
import AssignAssessmentModal from "@/components/assessment-manager/AssignAssessmentModal";

// Validated / standard signals — built-in assessments not stored as CustomAssessment records
const VALIDATED_SIGNALS = [
  {
    id: "leadership-index",
    title: "Leadership Index Assessment",
    description: "A development compass — not a certification — evaluating your leadership capabilities across 6 core competencies.",
    duration: "20–30 min",
    route: "/LeadershipAssessment",
    icon: Brain,
    color: "#A25DDC",
    badge: "Validated",
  },
  {
    id: "situational-leadership",
    title: "Situational Leadership Style",
    description: "Discover your preferred leadership style and how to adapt to different situations.",
    duration: "15–20 min",
    route: null,
    icon: ClipboardList,
    color: "#0202ff",
    comingSoon: true,
  },
];

const STATUS_BADGES = {
  draft: { className: "bg-gray-100 text-gray-700", label: "Draft" },
  published: { className: "bg-green-100 text-green-700", label: "Live" },
  archived: { className: "bg-slate-100 text-slate-600", label: "Archived" },
};

// Maps signal types to their entity and metadata
const SIGNAL_TYPE_META = {
  assessment: { label: "Assessment", entity: "CustomAssessment", color: "#A25DDC", icon: ClipboardList },
  quiz: { label: "Quiz", entity: "CustomAssessment", color: "#0202ff", icon: HelpCircle },
  knowledge_check: { label: "Knowledge Check", entity: "CustomAssessment", color: "#3b82f6", icon: CheckCircle },
  survey: { label: "Survey", entity: "CustomForm", color: "#10b981", icon: BarChart3 },
  pulse: { label: "Pulse", entity: "CustomForm", color: "#f59e0b", icon: Radio },
  feedback: { label: "Feedback", entity: "CustomForm", color: "#ec4899", icon: MessageSquare },
};

// CustomForm form_types that are "signal-like" (not request, enrollment, review, etc.)
const SIGNAL_FORM_TYPES = ["feedback_survey", "satisfaction_survey", "poll", "quiz"];

// Map CustomForm form_type to a signal type
function getSignalTypeFromForm(form) {
  if (form.form_type === "poll") return "pulse";
  if (form.form_type === "satisfaction_survey") return "feedback";
  if (form.form_type === "feedback_survey") return "survey";
  if (form.form_type === "quiz") return "quiz";
  return "survey";
}

// Map CustomAssessment type to a signal type
function getSignalTypeFromAssessment(assessment) {
  return assessment.type || "assessment";
}

export default function SignalsTab({ user }) {
  const [customAssessments, setCustomAssessments] = useState([]);
  const [customForms, setCustomForms] = useState([]);
  const [users, setUsers] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [assignModal, setAssignModal] = useState({ open: false, signal: null });
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingSignal, setEditingSignal] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [takenLI, setTakenLI] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const filters = [
        base44.entities.CustomAssessment.list("-created_date"),
        base44.entities.CustomForm.list("-created_date"),
        base44.entities.User.list(),
        base44.entities.Cohort.list(),
      ];
      if (user?.email) {
        filters.push(base44.entities.Assessment.filter({ email: user.email }, "-created_date", 1));
      }
      const results = await Promise.all(filters);
      const [assessments, forms, usersData, cohortsData, liResults] = results;
      const signalForms = (forms || []).filter(f => SIGNAL_FORM_TYPES.includes(f.form_type));
      setCustomAssessments(assessments || []);
      setCustomForms(signalForms);
      setUsers(usersData || []);
      setCohorts(cohortsData || []);
      setTakenLI((liResults || []).length > 0);
    } catch (error) {
      console.error("Error loading signals:", error);
      toast.error("Failed to load signals library");
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => { loadData(); }, [loadData, refreshKey]);

  // Build a unified list of signals from both entities
  const unifiedSignals = [
    ...customAssessments.map(a => ({
      id: a.id,
      title: a.title,
      description: a.description,
      status: a.status || "draft",
      signalType: getSignalTypeFromAssessment(a),
      entityType: "CustomAssessment",
      entityRef: a,
    })),
    ...customForms.map(f => ({
      id: f.id,
      title: f.title,
      description: f.description,
      status: f.status || "draft",
      signalType: getSignalTypeFromForm(f),
      entityType: "CustomForm",
      entityRef: f,
    })),
  ].sort((a, b) => new Date(b.entityRef.created_date) - new Date(a.entityRef.created_date));

  const filteredSignals = unifiedSignals.filter(s =>
    !search ||
    s.title?.toLowerCase().includes(search.toLowerCase()) ||
    s.description?.toLowerCase().includes(search.toLowerCase())
  );

  const publishedCount = unifiedSignals.filter(s => s.status === "published").length;
  const draftCount = unifiedSignals.filter(s => s.status === "draft").length;

  const handleStatusChange = async (signal, newStatus) => {
    try {
      if (signal.entityType === "CustomAssessment") {
        await base44.entities.CustomAssessment.update(signal.id, { status: newStatus });
      } else {
        await base44.entities.CustomForm.update(signal.id, { status: newStatus });
      }
      toast.success(`Signal ${newStatus === "published" ? "published" : newStatus === "archived" ? "archived" : "updated"}`);
      setRefreshKey(k => k + 1);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDuplicate = async (signal) => {
    try {
      const { id, created_date, updated_date, created_by, ...data } = signal.entityRef;
      if (signal.entityType === "CustomAssessment") {
        await base44.entities.CustomAssessment.create({ ...data, title: `${signal.title} (Copy)`, status: "draft" });
      } else {
        await base44.entities.CustomForm.create({ ...data, title: `${signal.title} (Copy)`, status: "draft" });
      }
      toast.success("Signal duplicated");
      setRefreshKey(k => k + 1);
    } catch (error) {
      console.error("Error duplicating:", error);
      toast.error("Failed to duplicate");
    }
  };

  const handleDelete = async (signal) => {
    if (!confirm(`Delete "${signal.title}"? This cannot be undone.`)) return;
    try {
      if (signal.entityType === "CustomAssessment") {
        await base44.entities.CustomAssessment.delete(signal.id);
      } else {
        await base44.entities.CustomForm.delete(signal.id);
      }
      toast.success("Signal deleted");
      setRefreshKey(k => k + 1);
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete signal");
    }
  };

  const handleEdit = (signal) => {
    setEditingSignal(signal);
    setBuilderOpen(true);
  };

  const handleCreateSignal = () => {
    setEditingSignal(null);
    setBuilderOpen(true);
  };

  const handleBuilderClose = () => {
    setBuilderOpen(false);
    setEditingSignal(null);
    setRefreshKey(k => k + 1);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Signals', value: unifiedSignals.length, color: 'text-[#0202ff]', icon: RadioIcon },
          { label: 'Published', value: publishedCount, color: 'text-green-600', icon: CheckCircle },
          { label: 'Drafts', value: draftCount, color: 'text-amber-600', icon: FileText },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="shadow-sm border border-gray-100 rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-3.5 h-3.5 text-gray-400" />
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters + Create */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search signals..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <Button onClick={handleCreateSignal} className="bg-[#0202ff] hover:bg-[#0101dd] text-white h-9 text-xs">
          <Plus className="w-4 h-4 mr-1" /> Create Signal
        </Button>
      </div>

      {/* Validated / Standard Signals */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Validated Signals</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {VALIDATED_SIGNALS.map((va, idx) => {
            const Icon = va.icon;
            const completed = va.id === "leadership-index" && takenLI;
            return (
              <motion.div key={va.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
                <Card className="shadow-sm border border-gray-100 rounded-2xl hover:shadow-md transition-shadow h-full">
                  <CardContent className="p-4 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${va.color}15` }}>
                        <Icon className="w-4.5 h-4.5" style={{ color: va.color }} />
                      </div>
                      {completed ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">Completed</span>
                      ) : va.comingSoon ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">Coming Soon</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">{va.badge || "Available"}</span>
                      )}
                    </div>
                    <p className="font-medium text-sm text-gray-900 mb-1">{va.title}</p>
                    <p className="text-xs text-gray-500 flex-grow line-clamp-2 mb-3">{va.description}</p>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-500">{va.duration}</span>
                      {va.route && !completed && !va.comingSoon ? (
                        <Link to={va.route}>
                          <Button size="sm" className="h-8 text-xs text-white hover:opacity-90" style={{ backgroundColor: va.color }}>
                            Start <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      ) : completed ? (
                        <Link to="/practice">
                          <Button variant="outline" size="sm" className="h-8 text-xs">View Results</Button>
                        </Link>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-8 text-xs" disabled>Coming Soon</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Custom Signals */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Your Signals</h3>

        {filteredSignals.length === 0 ? (
          <Card className="shadow-sm border border-gray-100 rounded-2xl">
            <CardContent className="p-8 text-center">
              <RadioIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="font-semibold text-gray-800">{search ? "No signals match your search" : "No signals yet"}</p>
              <p className="text-sm text-gray-500 mt-1 mb-4">
                {search ? "Try a different search term." : "Create assessments, quizzes, surveys, pulses, and feedback instruments — all in one place."}
              </p>
              {!search && (
                <Button onClick={handleCreateSignal} className="bg-[#0202ff] hover:bg-[#0101dd] text-white h-9 text-xs">
                  <Plus className="w-4 h-4 mr-1" /> Create your first signal
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredSignals.map((signal, i) => {
              const meta = SIGNAL_TYPE_META[signal.signalType] || SIGNAL_TYPE_META.survey;
              const TypeIcon = meta.icon;
              const badge = STATUS_BADGES[signal.status] || STATUS_BADGES.draft;
              const assigneeCount = signal.entityRef.assigned_user_emails?.length || signal.entityRef.assigned_to_emails?.length || 0;
              return (
                <motion.div key={`${signal.entityType}-${signal.id}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Card className="shadow-sm border border-gray-100 rounded-2xl hover:shadow-md transition-shadow h-full">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${meta.color}15` }}>
                            <TypeIcon className="w-4.5 h-4.5" style={{ color: meta.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">{signal.title}</p>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{meta.label}</span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(signal)}>
                              <FileText className="w-3.5 h-3.5 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setAssignModal({ open: true, signal })}>
                              <Send className="w-3.5 h-3.5 mr-2" /> Assign
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(signal)}>
                              <Copy className="w-3.5 h-3.5 mr-2" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {signal.status === "draft" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(signal, "published")}>
                                <Play className="w-3.5 h-3.5 mr-2" /> Publish
                              </DropdownMenuItem>
                            )}
                            {signal.status === "published" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(signal, "archived")}>
                                <Pause className="w-3.5 h-3.5 mr-2" /> Archive
                              </DropdownMenuItem>
                            )}
                            {signal.status === "archived" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(signal, "published")}>
                                <Play className="w-3.5 h-3.5 mr-2" /> Re-publish
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(signal)}>
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {signal.description && <p className="text-xs text-gray-500 line-clamp-2">{signal.description}</p>}
                      <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-gray-100">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}>{badge.label}</span>
                        {assigneeCount > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600 flex items-center gap-1">
                            <Users className="w-3 h-3" />{assigneeCount}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Signal Builder Dialog */}
      <SignalBuilderDialog
        open={builderOpen}
        onClose={handleBuilderClose}
        editingSignal={editingSignal}
        users={users}
        onSaved={handleBuilderClose}
      />

      {/* Assign modal */}
      {assignModal.open && assignModal.signal && (
        <AssignAssessmentModal
          open={assignModal.open}
          onClose={() => setAssignModal({ open: false, signal: null })}
          assessment={assignModal.signal.entityType === "CustomAssessment" ? assignModal.signal.entityRef : null}
          users={users}
          cohorts={cohorts}
          onAssigned={() => setRefreshKey(k => k + 1)}
        />
      )}
    </div>
  );
}