import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Clock, CheckCircle2, TrendingUp, Calendar, Library,
  Layers, Plus, Briefcase, GraduationCap
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import CertificateViewer from "@/components/learning/CertificateViewer";
import ExperienceFormModal from "@/components/development/ExperienceFormModal";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";

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
  planned: "bg-gray-100 text-gray-700",
  cancelled: "bg-red-100 text-red-700",
};

const EXP_TYPE_LABEL = {
  leadership_coaching: "Coaching",
  stretch_project: "Stretch Project",
  leadership_opportunity: "Leadership Opp.",
  mentorship: "Mentorship",
  conference_event: "Conference",
  volunteer_leadership: "Volunteer",
  cross_functional_project: "Cross-Functional",
  speaking_opportunity: "Speaking",
  other: "Other",
};

export default function MyDevelopment() {
  const { user } = useAuth();
  const [assignedLearning, setAssignedLearning] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [showExpForm, setShowExpForm] = useState(false);
  const [editingExp, setEditingExp] = useState(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [assigned, exps] = await Promise.all([
        base44.entities.AssignedLearning.filter({ user_email: user.email }),
        base44.entities.DevelopmentExperience.filter({ user_email: user.email }),
      ]);
      setAssignedLearning(assigned);
      setExperiences(exps);
    } catch (e) {
      console.error("Error loading development data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]);

  const activeLearning = assignedLearning.filter(a => a.status !== "completed");
  const completedLearning = assignedLearning.filter(a => a.status === "completed");
  const activePlans = experiences.filter(e => e.status === "planned" || e.status === "in_progress");
  const completedPlans = experiences.filter(e => e.status === "completed");

  const handleSaveExp = () => { setShowExpForm(false); setEditingExp(null); load(); };
  const handleDeleteExp = async (id) => { await base44.entities.DevelopmentExperience.delete(id); load(); };

  if (loading) {
    return (
      <MVPPageLayout title="My Development" subtitle="Track your development plans and learning progress.">
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-[#0202ff] rounded-full animate-spin" />
        </div>
      </MVPPageLayout>
    );
  }

  return (
    <MVPPageLayout title="My Development" subtitle="Track your development plans and learning progress.">
      {/* Stats Row */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-4 gap-3">
        {[
          { label: "Active Plans", value: activePlans.length, icon: Briefcase, color: "text-[#0202ff]", bg: "bg-blue-50" },
          { label: "Active Learning", value: activeLearning.length, icon: BookOpen, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Plans Done", value: completedPlans.length, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Learning Done", value: completedLearning.length, icon: GraduationCap, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="shadow-sm border border-gray-100 rounded-2xl">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-xl ${s.bg}`}>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
          {[
            { key: "active", label: `Active (${activePlans.length + activeLearning.length})` },
            { key: "completed", label: `Completed (${completedPlans.length + completedLearning.length})` },
            { key: "certificates", label: "Certificates" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 text-sm font-medium py-2 rounded-lg transition-all ${
                activeTab === tab.key ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Active Tab */}
        {activeTab === "active" && (
          <div className="space-y-4">
            {/* Development Plans Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" /> Development Plans
                </p>
                <Button size="sm" variant="outline" className="text-xs h-7 text-[#0202ff] border-[#0202ff]/30 hover:bg-blue-50" onClick={() => { setEditingExp(null); setShowExpForm(true); }}>
                  <Plus className="w-3 h-3 mr-1" /> Add Plan
                </Button>
              </div>
              {activePlans.length === 0 ? (
                <Card className="shadow-sm border border-dashed border-gray-200 rounded-2xl">
                  <CardContent className="p-6 text-center">
                    <p className="text-sm text-gray-500">No active development plans yet.</p>
                    <Button size="sm" variant="outline" className="mt-3 text-[#0202ff] border-[#0202ff]/30 hover:bg-blue-50" onClick={() => { setEditingExp(null); setShowExpForm(true); }}>
                      <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Your First Plan
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {activePlans.map((exp, i) => (
                    <motion.div key={exp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                      <Card className="shadow-sm border border-gray-100 rounded-2xl hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setEditingExp(exp); setShowExpForm(true); }}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 bg-[#0202ff]" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 leading-snug">{exp.title}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[exp.status] || "bg-gray-100 text-gray-700"}`}>
                                  {exp.status?.replace("_", " ")}
                                </span>
                                {exp.type && (
                                  <span className="text-xs text-gray-400">{EXP_TYPE_LABEL[exp.type] || exp.type}</span>
                                )}
                                {exp.planned_month && (
                                  <span className="flex items-center gap-1 text-xs text-gray-400">
                                    <Clock className="w-3 h-3" /> {exp.planned_month}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Learning Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> Learning Progress
                </p>
                <Link to="/LearningLibrary">
                  <Button size="sm" variant="ghost" className="text-xs h-7 text-[#0202ff] hover:bg-blue-50">
                    <Library className="w-3 h-3 mr-1" /> Browse Library
                  </Button>
                </Link>
              </div>
              {activeLearning.length === 0 ? (
                <Card className="shadow-sm border border-dashed border-gray-200 rounded-2xl">
                  <CardContent className="p-6 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">All caught up — no active learning assignments.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {activeLearning.map((item, i) => (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                      <Card className="shadow-sm border border-gray-100 rounded-2xl hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_DOT[item.priority] || "bg-blue-400"}`} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 leading-snug">{item.title}</p>
                              {item.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>}
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[item.status] || "bg-gray-100 text-gray-700"}`}>
                                  {item.status?.replace("_", " ")}
                                </span>
                                {item.due_date && (
                                  <span className="flex items-center gap-1 text-xs text-gray-400">
                                    <Clock className="w-3 h-3" /> Due {new Date(item.due_date).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Completed Tab */}
        {activeTab === "completed" && (
          <div className="space-y-4">
            {/* Completed Plans */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" /> Development Plans
              </p>
              {completedPlans.length === 0 ? (
                <p className="text-sm text-gray-400 pl-1">No completed plans yet.</p>
              ) : (
                <div className="space-y-2">
                  {completedPlans.map((exp, i) => (
                    <motion.div key={exp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                      <Card className="shadow-sm border border-gray-100 rounded-2xl bg-emerald-50/40">
                        <CardContent className="p-4 flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 leading-snug">{exp.title}</p>
                            {exp.type && <p className="text-xs text-gray-500 mt-0.5">{EXP_TYPE_LABEL[exp.type] || exp.type}</p>}
                          </div>
                          <Badge className="text-xs bg-emerald-100 text-emerald-700 border-0 flex-shrink-0">Done</Badge>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Completed Learning */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Learning
              </p>
              {completedLearning.length === 0 ? (
                <p className="text-sm text-gray-400 pl-1">No completed learning yet.</p>
              ) : (
                <div className="space-y-2">
                  {completedLearning.map((item, i) => (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                      <Card className="shadow-sm border border-gray-100 rounded-2xl bg-emerald-50/40">
                        <CardContent className="p-4 flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 leading-snug">{item.title}</p>
                            {item.completion_date && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                Completed {new Date(item.completion_date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <Badge className="text-xs bg-emerald-100 text-emerald-700 border-0 flex-shrink-0">Done</Badge>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Certificates Tab */}
        {activeTab === "certificates" && (
          <Card className="shadow-sm border border-gray-100 rounded-2xl">
            <CardContent className="p-4">
              <CertificateViewer />
            </CardContent>
          </Card>
        )}
      </motion.div>

      <ExperienceFormModal
        isOpen={showExpForm}
        onClose={() => { setShowExpForm(false); setEditingExp(null); }}
        experience={editingExp}
        userEmail={user?.email}
        onSave={handleSaveExp}
      />
    </MVPPageLayout>
  );
}