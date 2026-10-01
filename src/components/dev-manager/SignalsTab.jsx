import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Radio, MoreHorizontal, Send, Play, Pause, Trash2, Copy, Loader2,
  Search, Users, Plus, ArrowLeft, FileText, ClipboardList, Brain,
  MessageSquare, BarChart3, HelpCircle, CheckCircle, ArrowRight, Lock
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import SignalTypeSelector from "./SignalTypeSelector";
import SignalBuilder from "./SignalBuilder";
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
  draft: { className: "bg-gray-100 text-gray-800", label: "Draft" },
  published: { className: "bg-green-100 text-green-800", label: "Live" },
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
  const [view, setView] = useState("library"); // "library" | "selector" | "builder"
  const [selectedType, setSelectedType] = useState(null);
  const [editingSignal, setEditingSignal] = useState(null);
  const [customAssessments, setCustomAssessments] = useState([]);
  const [customForms, setCustomForms] = useState([]);
  const [users, setUsers] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [assignModal, setAssignModal] = useState({ open: false, signal: null });
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
      // Filter forms to only signal-like types
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
    setSelectedType(signal.signalType);
    setView("builder");
  };

  const handleCreateSignal = (type) => {
    setSelectedType(type);
    setEditingSignal(null);
    setView("builder");
  };

  const handleBuilderClose = () => {
    setView("library");
    setSelectedType(null);
    setEditingSignal(null);
    setRefreshKey(k => k + 1);
  };

  // ── Builder view ──
  if (view === "builder" && selectedType) {
    return (
      <SignalBuilder
        signalType={selectedType}
        editingSignal={editingSignal}
        onClose={handleBuilderClose}
        users={users}
      />
    );
  }

  // ── Type selector view ──
  if (view === "selector") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setView("library")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to library
          </Button>
          <h3 className="text-sm font-semibold">Create a Signal</h3>
        </div>
        <SignalTypeSelector onSelect={handleCreateSignal} />
      </div>
    );
  }

  // ── Library view ──
  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header + Create button */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search signals..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setView("selector")} className="bg-[#0202ff] hover:bg-[#0101dd] text-white">
          <Plus className="w-4 h-4 mr-1.5" /> Create Signal
        </Button>
      </div>

      {/* Signal count */}
      <p className="text-xs text-gray-500">{filteredSignals.length} signal{filteredSignals.length !== 1 ? "s" : ""} in your library</p>

      {/* Validated / Standard Signals — includes Leadership Index Assessment */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">Validated Signals</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {VALIDATED_SIGNALS.map((va, idx) => {
            const Icon = va.icon;
            const completed = va.id === "leadership-index" && takenLI;
            return (
              <motion.div key={va.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${va.color}15` }}>
                        <Icon className="w-5 h-5" style={{ color: va.color }} />
                      </div>
                      {completed ? (
                        <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>
                      ) : va.comingSoon ? (
                        <Badge variant="outline">Coming Soon</Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-800">{va.badge || "Available"}</Badge>
                      )}
                    </div>
                    <h4 className="font-semibold text-sm mb-1">{va.title}</h4>
                    <p className="text-xs text-gray-500 flex-grow line-clamp-2">{va.description}</p>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t">
                      <span className="text-[11px] text-gray-500">{va.duration}</span>
                      {va.route && !completed && !va.comingSoon ? (
                        <Link to={va.route}>
                          <Button size="sm" style={{ backgroundColor: va.color }} className="text-white hover:opacity-90">
                            Start <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      ) : completed ? (
                        <Link to="/practice">
                          <Button variant="outline" size="sm">View Results</Button>
                        </Link>
                      ) : (
                        <Button variant="ghost" size="sm" disabled>Coming Soon</Button>
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
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">Your Signals</h3>
      </div>

      {/* Unified signal grid */}
      {filteredSignals.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <Radio className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700">No signals yet</p>
          <p className="text-xs text-gray-500 mt-1 mb-4">Create assessments, quizzes, surveys, pulses, and feedback instruments — all in one place.</p>
          <Button onClick={() => setView("selector")} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-1" /> Create your first signal
          </Button>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSignals.map((signal) => {
            const meta = SIGNAL_TYPE_META[signal.signalType] || SIGNAL_TYPE_META.survey;
            const TypeIcon = meta.icon;
            const badge = STATUS_BADGES[signal.status] || STATUS_BADGES.draft;
            const assigneeCount = signal.entityRef.assigned_user_emails?.length || signal.entityRef.assigned_to_emails?.length || 0;
            return (
              <Card key={`${signal.entityType}-${signal.id}`} className="hover:shadow-lg transition-shadow h-full">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${meta.color}15` }}>
                        <TypeIcon className="w-4.5 h-4.5" style={{ color: meta.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate">{signal.title}</h4>
                        <Badge variant="outline" className="text-[10px] mt-0.5">{meta.label}</Badge>
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
                  <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
                    <Badge className={badge.className}>{badge.label}</Badge>
                    {assigneeCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <Users className="w-3 h-3 mr-1" />{assigneeCount}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Assign modal — reuses the assessment assign modal for CustomAssessment signals */}
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