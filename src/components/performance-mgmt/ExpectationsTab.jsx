import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Award, Plus, History, Target, TrendingUp, Building2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import GoalsAndOKRsTab from "./GoalsAndOKRsTab";
import EvidenceModal from "./EvidenceModal";
import PerformanceTimelineView from "./PerformanceTimelineView";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const EVIDENCE_TYPE_STYLES = {
  accomplishment: { color: "#00C875", bg: "bg-green-50", border: "border-green-200" },
  feedback: { color: "#0202ff", bg: "bg-blue-50", border: "border-blue-200" },
  context: { color: "#FFCB00", bg: "bg-amber-50", border: "border-amber-200" },
  concern: { color: "#E2445C", bg: "bg-red-50", border: "border-red-200" },
};

function EvidenceListSection({ user }) {
  const [goals, setGoals] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [evidenceModal, setEvidenceModal] = useState({ open: false, type: null, id: null, title: null });
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineEmail, setTimelineEmail] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [goalData, kpiData] = await Promise.all([
        base44.entities.Goal.filter({ client_id: user.client_id, status: "active" }, "-created_date", 50),
        base44.entities.KPI.filter({ client_id: user.client_id, status: "active" }, "-created_date", 30),
      ]);
      setGoals(goalData);
      setKpis(kpiData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  const goalsWithEvidence = goals.filter(g => g.evidence_entries && g.evidence_entries.length > 0);
  const kpisWithHistory = kpis.filter(k => k.value_history && k.value_history.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Award className="w-4 h-4 text-[#0202ff]" /> Evidence & Performance History
        </h3>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => { setTimelineEmail(user.email); setTimelineOpen(true); }}
        >
          <History className="w-3.5 h-3.5" /> View Timeline
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#0202ff]" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Goals with evidence */}
          <Card className="border border-gray-100 shadow-sm rounded-2xl">
            <CardContent className="p-4">
              <h4 className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-[#0202ff]" /> Goals with Evidence
              </h4>
              {goalsWithEvidence.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">No evidence entries yet. Open a goal and add evidence.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {goalsWithEvidence.map(goal => (
                    <div key={goal.id} className="p-2.5 rounded-lg border border-gray-100 bg-muted/30">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-xs font-medium text-gray-900 truncate">{goal.title}</p>
                        <Badge variant="outline" className="text-[10px] flex-shrink-0">{goal.evidence_entries.length} entries</Badge>
                      </div>
                      <div className="space-y-1">
                        {goal.evidence_entries.slice(-3).reverse().map((entry) => {
                          const style = EVIDENCE_TYPE_STYLES[entry.note_type] || EVIDENCE_TYPE_STYLES.context;
                          return (
                            <div key={entry.id} className={`text-[10px] p-1.5 rounded border ${style.border} ${style.bg}`} style={{ borderLeft: `2px solid ${style.color}` }}>
                              <span className="font-medium" style={{ color: style.color }}>{entry.note_type}</span>
                              <span className="text-gray-500 ml-1">· {format(new Date(entry.date), "MMM d")}</span>
                              <p className="text-gray-600 mt-0.5 line-clamp-1">{entry.description}</p>
                            </div>
                          );
                        })}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] mt-1.5 gap-1 text-[#0202ff]"
                        onClick={() => setEvidenceModal({ open: true, type: "goal", id: goal.id, title: goal.title })}
                      >
                        <Plus className="w-3 h-3" /> Add Evidence
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* KPIs with value history */}
          <Card className="border border-gray-100 shadow-sm rounded-2xl">
            <CardContent className="p-4">
              <h4 className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#FFCB00]" /> KPI Value History
              </h4>
              {kpisWithHistory.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">No KPI values recorded yet.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {kpisWithHistory.map(kpi => (
                    <div key={kpi.id} className="p-2.5 rounded-lg border border-gray-100 bg-muted/30">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-xs font-medium text-gray-900 truncate">{kpi.title}</p>
                        <Badge variant="outline" className="text-[10px] flex-shrink-0">{kpi.value_history.length} records</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <span>Current: <strong className="text-gray-700">{kpi.current_value}{kpi.unit}</strong></span>
                        <span>·</span>
                        <span>Target: {kpi.target_value}{kpi.unit}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1.5">
                        {kpi.value_history.slice(-8).map((vh, i) => (
                          <div
                            key={i}
                            className="flex-1 h-6 rounded flex items-end justify-center text-[8px] text-white font-medium"
                            style={{ backgroundColor: "#FFCB00", opacity: 0.4 + (i / 8) * 0.6 }}
                            title={`${format(new Date(vh.date), "MMM d")}: ${vh.value}`}
                          >
                            {vh.value}
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] mt-1.5 gap-1 text-[#0202ff]"
                        onClick={() => setEvidenceModal({ open: true, type: "kpi", id: kpi.id, title: kpi.title })}
                      >
                        <Plus className="w-3 h-3" /> Record Value
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Evidence Modal */}
      {evidenceModal.open && (
        <EvidenceModal
          isOpen={evidenceModal.open}
          onClose={() => setEvidenceModal({ open: false, type: null, id: null, title: null })}
          targetType={evidenceModal.type}
          targetId={evidenceModal.id}
          targetTitle={evidenceModal.title}
          user={user}
          onSaved={loadData}
        />
      )}

      {/* Timeline Dialog */}
      <Dialog open={timelineOpen} onOpenChange={setTimelineOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Performance Timeline</DialogTitle>
          </DialogHeader>
          <PerformanceTimelineView employeeEmail={timelineEmail} user={user} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ExpectationsTab({ user }) {
  return (
    <div className="space-y-6">
      {/* Existing Goals & OKRs tab */}
      <GoalsAndOKRsTab user={user} />

      {/* Evidence & History section */}
      <EvidenceListSection user={user} />
    </div>
  );
}