import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, ClipboardList, ArrowRight, ArrowLeft, CheckCircle, Loader2, Lock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const VALIDATED = [
  {
    id: "leadership-index",
    title: "Leadership Index Assessment",
    description: "A development compass — not a certification — evaluating your leadership capabilities across 6 core competencies.",
    duration: "20–30 min",
    route: "/LeadershipAssessment",
    icon: Brain,
    color: "#A25DDC",
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

export default function AssessmentLibrary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customAssigned, setCustomAssigned] = useState([]);
  const [takenLI, setTakenLI] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user?.email) return;
      setLoading(true);
      try {
        const [custom, liResults] = await Promise.all([
          base44.entities.CustomAssessment.filter({ status: "published" }),
          base44.entities.Assessment.filter({ email: user.email }, "-created_date", 1),
        ]);
        setCustomAssigned((custom || []).filter((a) => (a.assigned_user_emails || []).includes(user.email)));
        setTakenLI((liResults || []).length > 0);
      } catch (error) {
        console.error("Error loading library:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.email]);

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate("/practice")}
        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Practice
      </button>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Assessment Library</h1>
        <p className="text-sm text-muted-foreground mt-1">Browse and take available assessments.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" /></div>
      ) : (
        <div className="space-y-6">
          {/* Validated Assessments */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Validated Assessments</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {VALIDATED.map((va, idx) => {
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
                            <Badge className="bg-blue-100 text-blue-800">Available</Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-sm mb-1">{va.title}</h3>
                        <p className="text-xs text-muted-foreground flex-grow line-clamp-2">{va.description}</p>
                        <div className="flex items-center justify-between mt-4 pt-3 border-t">
                          <span className="text-[11px] text-muted-foreground">{va.duration}</span>
                          {va.route && !completed && !va.comingSoon ? (
                            <Link to={va.route}>
                              <Button size="sm" style={{ backgroundColor: va.color }} className="text-white hover:opacity-90">
                                Start <ArrowRight className="w-3 h-3 ml-1" />
                              </Button>
                            </Link>
                          ) : completed ? (
                            <Button variant="outline" size="sm" onClick={() => navigate("/practice")}>
                              View Results
                            </Button>
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

          {/* Custom Assessments */}
          {customAssigned.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Assigned to You</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customAssigned.map((a, idx) => (
                  <motion.div key={a.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                    <Card className="h-full hover:shadow-lg transition-shadow">
                      <CardContent className="p-5 flex flex-col h-full">
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-[#0202ff]/10">
                            <ClipboardList className="w-5 h-5 text-[#0202ff]" />
                          </div>
                          <Badge variant="outline" className="text-xs capitalize">{a.type?.replace(/_/g, " ") || "Custom"}</Badge>
                        </div>
                        <h3 className="font-semibold text-sm mb-1">{a.title}</h3>
                        {a.description && <p className="text-xs text-muted-foreground flex-grow line-clamp-2">{a.description}</p>}
                        <div className="flex items-center justify-between mt-4 pt-3 border-t">
                          <span className="text-[11px] text-muted-foreground">Pass: {a.passing_score_percentage || 70}%</span>
                          <Badge variant="outline" className="text-xs">
                            <Lock className="w-3 h-3 mr-1" /> Assigned
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {customAssigned.length === 0 && !takenLI && VALIDATED.every((v) => v.comingSoon) && (
            <Card><CardContent className="p-8 text-center">
              <ClipboardList className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No assessments available right now.</p>
            </CardContent></Card>
          )}
        </div>
      )}
    </div>
  );
}