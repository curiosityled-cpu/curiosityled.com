import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock, CheckCircle2, TrendingUp, Calendar, Award, ExternalLink, Library } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import CertificateViewer from "@/components/learning/CertificateViewer";

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
};

export default function MyLearning() {
  const { user } = useAuth();
  const [assignedLearning, setAssignedLearning] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [showCerts, setShowCerts] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const assigned = await base44.entities.AssignedLearning.filter({ user_email: user.email });
        setAssignedLearning(assigned);
      } catch (e) {
        console.error("Error loading learning data:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const active = assignedLearning.filter((a) => a.status !== "completed");
  const completed = assignedLearning.filter((a) => a.status === "completed");

  const stats = [
    { label: "Active", value: active.length, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Completed", value: completed.length, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Total Assigned", value: assignedLearning.length, icon: Calendar, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-[#0202ff] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Learning</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track your assigned learning and development progress</p>
        </div>
        <Link to="/LearningLibrary">
          <Button variant="outline" size="sm" className="text-[#0202ff] border-[#0202ff]/30 hover:bg-blue-50">
            <Library className="w-4 h-4 mr-1.5" /> Browse Library
          </Button>
        </Link>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-3 gap-4">
        {stats.map((s) => {
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
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
          {[
            { key: "active", label: `Active (${active.length})` },
            { key: "completed", label: `Completed (${completed.length})` },
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

        {/* Active */}
        {activeTab === "active" && (
          <div className="space-y-3">
            {active.length === 0 ? (
              <Card className="shadow-sm border border-gray-100 rounded-2xl">
                <CardContent className="p-10 text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
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
              active.map((item, i) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
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
                            {item.priority && (
                              <span className="text-xs text-gray-400 capitalize">{item.priority} priority</span>
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

        {/* Completed */}
        {activeTab === "completed" && (
          <div className="space-y-3">
            {completed.length === 0 ? (
              <Card className="shadow-sm border border-gray-100 rounded-2xl">
                <CardContent className="p-10 text-center">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-semibold text-gray-800">No completed learning yet</p>
                  <p className="text-sm text-gray-500 mt-1">Completed items will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              completed.map((item, i) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
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

        {/* Certificates */}
        {activeTab === "certificates" && (
          <Card className="shadow-sm border border-gray-100 rounded-2xl">
            <CardContent className="p-4">
              <CertificateViewer />
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}