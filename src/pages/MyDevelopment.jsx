import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, CheckCircle2, Library, Plus, Layers, GraduationCap, Pencil, Briefcase, ExternalLink, Star, Trash2, ChevronDown } from "lucide-react";
import DeleteJourneyDialog from "@/components/development/DeleteJourneyDialog";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import CertificateViewer from "@/components/learning/CertificateViewer";
import CreateDevelopmentPlanModal from "@/components/development/CreateDevelopmentPlanModal";
import ExperienceFormModal from "@/components/development/ExperienceFormModal";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";

const EXP_TYPE_LABELS = {
  leadership_coaching: "Leadership Coaching",
  stretch_project: "Stretch Project",
  leadership_opportunity: "Leadership Opportunity",
  mentorship: "Mentorship",
  conference_event: "Conference / Event",
  volunteer_leadership: "Volunteer Leadership",
  cross_functional_project: "Cross-Functional Project",
  speaking_opportunity: "Speaking Opportunity",
  other: "Other",
};

function ExperienceCard({ exp, index, onEdit, onDelete }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
      <Card className="shadow-sm border border-gray-100 rounded-2xl hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p className="font-medium text-gray-900 leading-snug">{exp.title}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[exp.status] || "bg-gray-100 text-gray-700"}`}>
                  {exp.status}
                </span>
              </div>
              {exp.type && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full inline-block mb-2">
                  {EXP_TYPE_LABELS[exp.type] || exp.type}
                </p>
              )}
              {exp.description && <p className="text-xs text-gray-500 line-clamp-2 mb-2">{exp.description}</p>}
              <div className="flex flex-wrap gap-1 mb-2">
                {exp.competencies?.slice(0, 3).map(c => (
                  <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">{c}</span>
                ))}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                {exp.provider_or_sponsor && <span>{exp.provider_or_sponsor}</span>}
                {exp.start_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(exp.start_date).toLocaleDateString()}</span>}
                {exp.expected_impact && <span className="text-emerald-600">+{exp.expected_impact}% projected</span>}
              </div>
            </div>
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <button onClick={onEdit} className="text-gray-400 hover:text-[#0202ff] transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={onDelete} className="text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

const PRIORITY_DOT = {
  urgent: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-blue-400",
  low: "bg-gray-300",
};

const STATUS_BADGE = {
  assigned: "bg-gray-100 text-gray-700",
  started: "bg-blue-100 text-blue-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
  planned: "bg-purple-100 text-purple-700",
  active: "bg-blue-100 text-blue-700",
  paused: "bg-amber-100 text-amber-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function MyDevelopment() {
  const { user } = useAuth();
  const [assignedLearning, setAssignedLearning] = useState([]);
  const [devPlans, setDevPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState("plans");
  const [activeTab, setActiveTab] = useState("active");
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [experiences, setExperiences] = useState([]);
  const [showExpModal, setShowExpModal] = useState(false);
  const [editingExp, setEditingExp] = useState(null);
  const [deletingPlan, setDeletingPlan] = useState(null);

  const load = useCallback(async () => {
    const email = user?.email || user?.data?.email;
    console.log("MyDevelopment load() called, user:", user?.email, "email:", email);
    if (!email) {
      setLoading(false);
      return;
    }
    try {
      const [assigned, plans, exps] = await Promise.all([
        base44.entities.AssignedLearning.filter({ user_email: email }),
        base44.entities.DevelopmentPlan.list("-created_date"),
        base44.entities.DevelopmentExperience.list("-created_date"),
      ]);
      console.log("MyDevelopment loaded:", { assigned: assigned.length, plans: plans.length, exps: exps.length });
      setAssignedLearning(assigned);
      setDevPlans(plans);
      setExperiences(exps);
    } catch (e) {
      console.error("Error loading development data:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);
  
  // Listen for learning assignment events from Learning Library
  useEffect(() => {
    window.addEventListener('learningAssigned', load);
    return () => window.removeEventListener('learningAssigned', load);
  }, [load]);

  const activePlans = devPlans.filter(p => p.status === "active" || p.status === "paused");
  const completedPlans = devPlans.filter(p => p.status === "completed");
  const activeLearning = assignedLearning.filter(a => a.status !== "completed");
  const completedLearning = assignedLearning.filter(a => a.status === "completed");

  const activeExperiences = experiences.filter(e => e.status !== "completed" && e.status !== "cancelled");
  const completedExperiences = experiences.filter(e => e.status === "completed");

  const stats = [
    { label: "Active Journeys", value: activePlans.length, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Active Learning", value: activeLearning.length, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Experiences", value: experiences.length, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  const openCreate = () => { setEditingPlan(null); setShowModal(true); };
  const openEdit = (plan) => { setEditingPlan(plan); setShowModal(true); };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-[#0202ff] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <MVPPageLayout title="My Development" subtitle="Track your development plans and learning progress">
      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="shadow-sm border border-gray-100 rounded-2xl">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Section Toggle */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => { setSection("plans"); setActiveTab("active"); }}
            className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-lg transition-all ${section === "plans" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            <Layers className="w-3.5 h-3.5" /> Journeys
          </button>
          <button
            onClick={() => { setSection("learning"); setActiveTab("active"); }}
            className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-lg transition-all ${section === "learning" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            <GraduationCap className="w-3.5 h-3.5" /> Learning Progress
          </button>
          <button
            onClick={() => { setSection("experiences"); setActiveTab("active"); }}
            className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-lg transition-all ${section === "experiences" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            <Star className="w-3.5 h-3.5" /> Experiences
          </button>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
        {/* Active / Completed tabs */}
        <div className="flex gap-1 bg-gray-50 border border-gray-100 rounded-xl p-1">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-all ${activeTab === "active" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            Active ({section === "plans" ? activePlans.length : section === "learning" ? activeLearning.length : activeExperiences.length})
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-all ${activeTab === "completed" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            Completed ({section === "plans" ? completedPlans.length : section === "learning" ? completedLearning.length : completedExperiences.length})
          </button>

        </div>

        {/* ── DEVELOPMENT PLANS ── */}
        {section === "plans" && (
          <>
            {activeTab === "active" && (
              <div className="space-y-3">
                <Button size="sm" className="w-full bg-[#0202ff] hover:bg-[#0101dd] text-white" onClick={openCreate}>
                  <Plus className="w-4 h-4 mr-1.5" /> New Journey
                </Button>
                {activePlans.length === 0 ? (
                  <Card className="shadow-sm border border-gray-100 rounded-2xl">
                    <CardContent className="p-8 text-center">
                      <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="font-semibold text-gray-800">No active journeys</p>
                      <p className="text-sm text-gray-500 mt-1">Create a journey combining coaching, projects, and learning resources.</p>
                    </CardContent>
                  </Card>
                ) : (
                  activePlans.map((plan, i) => (
                    <motion.div key={plan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Card className="shadow-sm border border-gray-100 rounded-2xl hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-gray-900 leading-snug">{plan.title}</p>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[plan.status] || "bg-gray-100 text-gray-700"}`}>
                                  {plan.status}
                                </span>
                              </div>
                              {plan.description && <p className="text-xs text-gray-500 line-clamp-2 mb-2">{plan.description}</p>}
                              <div className="flex flex-wrap gap-1 mb-2">
                                {plan.target_competencies?.slice(0, 3).map(c => (
                                  <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">{c}</span>
                                ))}
                                {plan.target_competencies?.length > 3 && (
                                  <span className="text-xs text-gray-400">+{plan.target_competencies.length - 3} more</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                                {plan.experiences?.length > 0 && (
                                  <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {plan.experiences.length} experience{plan.experiences.length !== 1 ? "s" : ""}</span>
                                )}
                                {plan.learning_items?.length > 0 && (
                                  <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {plan.learning_items.length} resource{plan.learning_items.length !== 1 ? "s" : ""}</span>
                                )}
                                {plan.target_date && (
                                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Due {new Date(plan.target_date).toLocaleDateString()}</span>
                                )}
                              </div>
                              {plan.learning_items?.length > 0 && (
                                <div className="space-y-1 mt-1">
                                  {plan.learning_items.map((item, li) => (
                                    <div key={li} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1.5">
                                      <BookOpen className="w-3 h-3 text-blue-400 flex-shrink-0" />
                                      <span className="flex-1 text-xs text-gray-700 truncate">{item.title}</span>
                                      <select
                                        value={item.status || "not_started"}
                                        onClick={e => e.stopPropagation()}
                                        onChange={async (e) => {
                                          const updated = plan.learning_items.map((it, idx) =>
                                            idx === li ? { ...it, status: e.target.value } : it
                                          );
                                          await base44.entities.DevelopmentPlan.update(plan.id, { learning_items: updated });
                                          toast.success("Progress updated");
                                          load();
                                        }}
                                        className="text-[10px] border border-gray-200 rounded-md px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#0202ff]/30 bg-white cursor-pointer"
                                      >
                                        <option value="not_started">Not Started</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="completed">Completed</option>
                                      </select>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-1.5 flex-shrink-0">
                              <button onClick={() => openEdit(plan)} className="text-gray-400 hover:text-[#0202ff] transition-colors">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => setDeletingPlan(plan)} className="text-gray-400 hover:text-red-500 transition-colors">
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
            )}
            {activeTab === "completed" && (
              <div className="space-y-3">
                {completedPlans.length === 0 ? (
                  <Card className="shadow-sm border border-gray-100 rounded-2xl">
                    <CardContent className="p-8 text-center">
                      <CheckCircle2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="font-semibold text-gray-800">No completed journeys yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  completedPlans.map((plan, i) => (
                    <motion.div key={plan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Card className="shadow-sm border border-gray-100 rounded-2xl bg-emerald-50/40">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 leading-snug">{plan.title}</p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                {plan.experiences?.length > 0 && <span>{plan.experiences.length} experience{plan.experiences.length !== 1 ? "s" : ""}</span>}
                                {plan.learning_items?.length > 0 && <span>{plan.learning_items.length} resource{plan.learning_items.length !== 1 ? "s" : ""}</span>}
                              </div>
                            </div>
                            <Badge className="text-xs bg-emerald-100 text-emerald-700 border-0">Done</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </>
        )}

        {/* ── LEARNING PROGRESS ── */}
        {section === "learning" && (
          <>
            {activeTab === "active" && (
              <div className="space-y-3">
                {activeLearning.length === 0 ? (
                  <Card className="shadow-sm border border-gray-100 rounded-2xl">
                    <CardContent className="p-8 text-center">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                      <p className="font-semibold text-gray-800">All caught up!</p>
                      <p className="text-sm text-gray-500 mt-1 mb-4">No active learning assignments right now.</p>
                      <Link to="/LearningLibrary">
                        <Button variant="outline" size="sm" className="text-[#0202ff] border-[#0202ff]/30 hover:bg-blue-50">
                          <Library className="w-4 h-4 mr-1.5" /> Browse Learning Library
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  activeLearning.map((item, i) => (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Card className="shadow-sm border border-gray-100 rounded-2xl hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_DOT[item.priority] || "bg-blue-400"}`} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 leading-snug">{item.title}</p>
                              {item.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>}
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <select
                                  value={item.status}
                                  onChange={async (e) => {
                                    const newStatus = e.target.value;
                                    const updateData = { status: newStatus };
                                    if (newStatus === "completed") updateData.completion_date = new Date().toISOString();
                                    await base44.entities.AssignedLearning.update(item.id, updateData);
                                    toast.success("Progress updated");
                                    load();
                                  }}
                                  className={`text-xs px-2 py-0.5 rounded-full font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30 ${STATUS_BADGE[item.status] || "bg-gray-100 text-gray-700"}`}
                                >
                                  <option value="assigned">Assigned</option>
                                  <option value="started">Started</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="completed">Completed</option>
                                </select>
                                {item.due_date && (
                                  <span className="flex items-center gap-1 text-xs text-gray-400">
                                    <Clock className="w-3 h-3" /> Due {new Date(item.due_date).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              {item.status === "in_progress" && (
                                <div className="mt-2 bg-blue-50 rounded-lg p-2">
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="text-blue-700 font-medium">In Progress</span>
                                  </div>
                                  <div className="h-1.5 bg-blue-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 w-1/3"></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            )}
            {activeTab === "completed" && (
              <div className="space-y-3">
                {completedLearning.length === 0 ? (
                  <Card className="shadow-sm border border-gray-100 rounded-2xl">
                    <CardContent className="p-8 text-center">
                      <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="font-semibold text-gray-800">No completed learning yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  completedLearning.map((item, i) => (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Card className="shadow-sm border border-gray-100 rounded-2xl bg-emerald-50/40">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 leading-snug">{item.title}</p>
                              {item.completion_date && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Completed {new Date(item.completion_date).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <Badge className="text-xs bg-emerald-100 text-emerald-700 border-0">Done</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            )}

          </>
        )}

        {/* ── EXTERNAL EXPERIENCES ── */}
        {section === "experiences" && (
          <>
            {activeTab === "active" && (
              <div className="space-y-3">
                <Button size="sm" className="w-full bg-[#0202ff] hover:bg-[#0101dd] text-white" onClick={() => { setEditingExp(null); setShowExpModal(true); }}>
                  <Plus className="w-4 h-4 mr-1.5" /> Log Experience
                </Button>
                {activeExperiences.length === 0 ? (
                  <Card className="shadow-sm border border-gray-100 rounded-2xl">
                    <CardContent className="p-8 text-center">
                      <Star className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="font-semibold text-gray-800">No active experiences</p>
                      <p className="text-sm text-gray-500 mt-1">Log coaching, stretch projects, mentorship, and more.</p>
                    </CardContent>
                  </Card>
                ) : (
                  activeExperiences.map((exp, i) => (
                    <ExperienceCard key={exp.id} exp={exp} index={i} onEdit={() => { setEditingExp(exp); setShowExpModal(true); }} onDelete={async () => { await base44.entities.DevelopmentExperience.delete(exp.id); load(); }} />
                  ))
                )}
              </div>
            )}
            {activeTab === "completed" && (
              <div className="space-y-3">
                {completedExperiences.length === 0 ? (
                  <Card className="shadow-sm border border-gray-100 rounded-2xl">
                    <CardContent className="p-8 text-center">
                      <CheckCircle2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="font-semibold text-gray-800">No completed experiences yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  completedExperiences.map((exp, i) => (
                    <ExperienceCard key={exp.id} exp={exp} index={i} onEdit={() => { setEditingExp(exp); setShowExpModal(true); }} onDelete={async () => { await base44.entities.DevelopmentExperience.delete(exp.id); load(); }} />
                  ))
                )}
              </div>
            )}
          </>
        )}
      </motion.div>

      <ExperienceFormModal
        open={showExpModal}
        onClose={() => { setShowExpModal(false); setEditingExp(null); }}
        onSaved={() => { setShowExpModal(false); setEditingExp(null); load(); }}
        experience={editingExp}
        userEmail={user?.email || user?.data?.email}
      />

      <DeleteJourneyDialog
        open={!!deletingPlan}
        onClose={() => setDeletingPlan(null)}
        plan={deletingPlan}
        onDeleted={() => { setDeletingPlan(null); load(); }}
      />

      <CreateDevelopmentPlanModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingPlan(null); }}
        onSaved={() => { setShowModal(false); setEditingPlan(null); load(); }}
        userEmail={user?.email || user?.data?.email}
        plan={editingPlan}
      />
    </MVPPageLayout>
  );
}