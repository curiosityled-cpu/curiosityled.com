import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, CheckCircle2, TrendingUp, Calendar, Library, Plus, Layers, GraduationCap } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import CertificateViewer from "@/components/learning/CertificateViewer";
import ExperienceFormModal from "@/components/development/ExperienceFormModal";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";

const EXPERIENCE_TYPE_LABELS = {
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
  cancelled: "bg-gray-100 text-gray-500",
};

export default function MyDevelopment() {
  const { user } = useAuth();
  const [assignedLearning, setAssignedLearning] = useState([]);
  const [devExperiences, setDevExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState("plans"); // "plans" | "learning"
  const [activeTab, setActiveTab] = useState("active");
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    if (!user) return;
    try {
      const [assigned, experiences] = await Promise.all([
        base44.entities.AssignedLearning.filter({ user_email: user.email }),
        base44.entities.DevelopmentExperience.filter({ user_email: user.email }),
      ]);
      setAssignedLearning(assigned);
      setDevExperiences(experiences);
    } catch (e) {
      console.error("Error loading development data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]);

  const activePlans = devExperiences.filter(e => e.status !== "completed" && e.status !== "cancelled");
  const completedPlans = devExperiences.filter(e => e.status === "completed");
  const activeLearning = assignedLearning.filter(a => a.status !== "completed");
  const completedLearning = assignedLearning.filter(a => a.status === "completed");

  const stats = [
    { label: "Active Plans", value: activePlans.length, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Active Learning", value: activeLearning.length, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Completed", value: completedPlans.length + completedLearning.length, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

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
            <Layers className="w-3.5 h-3.5" /> Development Plans
          </button>
          <button
            onClick={() => { setSection("learning"); setActiveTab("active"); }}
            className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-lg transition-all ${section === "learning" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            <GraduationCap className="w-3.5 h-3.5" /> Learning Progress
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
            Active ({section === "plans" ? activePlans.length : activeLearning.length})
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-all ${activeTab === "completed" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            Completed ({section === "plans" ? completedPlans.length : completedLearning.length})
          </button>
          {section === "learning" && (
            <button
              onClick={() => setActiveTab("certificates")}
              className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-all ${activeTab === "certificates" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            >
              Certificates
            </button>
          )}
        </div>

        {/* ── DEVELOPMENT PLANS ── */}
        {section === "plans" && (
          <>
            {activeTab === "active" && (
              <div className="space-y-3">
                <Button
                  size="sm"
                  className="w-full bg-[#0202ff] hover:bg-[#0101dd] text-white"
                  onClick={() => setShowModal(true)}
                >
                  <Plus className="w-4 h-4 mr-1.5" /> New Development Plan
                </Button>
                {activePlans.length === 0 ? (
                  <Card className="shadow-sm border border-gray-100 rounded-2xl">
                    <CardContent className="p-8 text-center">
                      <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="font-semibold text-gray-800">No active development plans</p>
                      <p className="text-sm text-gray-500 mt-1">Add a coaching session, stretch project, mentorship, and more.</p>
                    </CardContent>
                  </Card>
                ) : (
                  activePlans.map((exp, i) => (
                    <motion.div key={exp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Card className="shadow-sm border border-gray-100 rounded-2xl hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 bg-purple-400" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 leading-snug">{exp.title}</p>
                              {exp.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{exp.description}</p>}
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[exp.status] || "bg-gray-100 text-gray-700"}`}>
                                  {exp.status?.replace("_", " ")}
                                </span>
                                <span className="text-xs text-gray-400">{EXPERIENCE_TYPE_LABELS[exp.type] || exp.type}</span>
                                {exp.expected_impact && (
                                  <span className="text-xs text-purple-600 font-medium">+{exp.expected_impact}% impact</span>
                                )}
                              </div>
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
                      <p className="font-semibold text-gray-800">No completed plans yet</p>
                      <p className="text-sm text-gray-500 mt-1">Completed experiences will appear here.</p>
                    </CardContent>
                  </Card>
                ) : (
                  completedPlans.map((exp, i) => (
                    <motion.div key={exp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Card className="shadow-sm border border-gray-100 rounded-2xl bg-emerald-50/40">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 leading-snug">{exp.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{EXPERIENCE_TYPE_LABELS[exp.type] || exp.type}</p>
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
            {activeTab === "certificates" && (
              <Card className="shadow-sm border border-gray-100 rounded-2xl">
                <CardContent className="p-4">
                  <CertificateViewer />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </motion.div>

      {showModal && (
        <ExperienceFormModal
          userEmail={user?.email}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); load(); }}
        />
      )}
    </MVPPageLayout>
  );
}