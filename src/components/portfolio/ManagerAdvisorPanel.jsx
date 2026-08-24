import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Shield, Target, Calendar, MessageSquare, CheckCircle2, Plus, Loader2, Brain,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { BAND_LABELS, TREND_LABELS } from "@/lib/portfolio/managerStatus";

const INTERVENTION_TYPES = [
  { value: "coaching_conversation", label: "Coaching Conversation" },
  { value: "nudge", label: "Nudge / Check-in Message" },
  { value: "learning_assignment", label: "Learning Assignment" },
  { value: "escalation", label: "Escalation" },
  { value: "check_in", label: "1:1 Check-in" },
  { value: "other", label: "Other" },
];

export default function ManagerAdvisorPanel({ managerBundle, advisorEmail }) {
  const { user } = useAuth();
  const hrbpEmail = advisorEmail || user?.email;
  const [interventions, setInterventions] = useState([]);
  const [loadingInterventions, setLoadingInterventions] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    intervention_type: "coaching_conversation",
    notes: "",
    follow_up_date: "",
  });

  const managerEmail = managerBundle?.user?.email;
  const managerName = managerBundle?.user?.full_name || managerBundle?.user?.display_name || managerEmail;
  const status = managerBundle?.status;
  const bandStyle = status ? BAND_LABELS[status.band] : null;
  const trendStyle = status ? TREND_LABELS[status.trend] : null;

  useEffect(() => {
    if (!managerEmail || !hrbpEmail) return;
    fetchInterventions();
  }, [managerEmail, hrbpEmail]);

  const fetchInterventions = async () => {
    setLoadingInterventions(true);
    try {
      const results = await base44.entities.HRBPIntervention.filter({
        hrbp_email: hrbpEmail,
        manager_email: managerEmail,
      });
      setInterventions(results.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (e) {
      console.warn("Could not fetch interventions:", e.message);
    } finally {
      setLoadingInterventions(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.notes.trim()) return;
    setSaving(true);
    try {
      await base44.entities.HRBPIntervention.create({
        hrbp_email: hrbpEmail,
        manager_email: managerEmail,
        manager_name: managerName,
        intervention_type: formData.intervention_type,
        notes: formData.notes,
        status: "open",
        follow_up_date: formData.follow_up_date || null,
        linked_manager_signal: status?.reasons?.[0]?.key || null,
      });
      setFormData({ intervention_type: "coaching_conversation", notes: "", follow_up_date: "" });
      setShowForm(false);
      fetchInterventions();
    } catch (e) {
      console.error("Failed to create intervention:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (id) => {
    try {
      await base44.entities.HRBPIntervention.update(id, { status: "complete" });
      fetchInterventions();
    } catch (e) {
      console.error("Failed to update intervention:", e);
    }
  };

  if (!managerBundle) return null;

  return (
    <div className="space-y-4">
      {/* Status + Signal Summary */}
      {status && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Brain className="w-4 h-4 text-[#0202ff]" /> Advisor Signal Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status band + trend */}
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${bandStyle.bg} ${bandStyle.color}`}>
                {bandStyle.label}
              </div>
              {trendStyle && (
                <div className={`flex items-center gap-1 text-sm font-medium ${trendStyle.color}`}>
                  {trendStyle.icon} {trendStyle.label}
                </div>
              )}
            </div>

            {/* Reasons */}
            {status.reasons.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Active Signals</p>
                <div className="flex flex-wrap gap-2">
                  {status.reasons.map((r) => (
                    <Badge key={r.key} variant="outline" className="text-xs bg-gray-50">
                      {r.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Signal details grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <SignalTile
                label="Overload"
                value={managerBundle.trends?.overload_pattern_strength != null ? `${Math.round(managerBundle.trends.overload_pattern_strength)}/100` : "—"}
                subtext={managerBundle.trends?.overload_pattern_strength > 60 ? "Elevated" : "Normal"}
                warning={managerBundle.trends?.overload_pattern_strength > 60}
              />
              <SignalTile
                label="Operator Risk"
                value={managerBundle.trends?.operator_risk_trajectory || "—"}
                subtext={["declining", "increasing"].includes(managerBundle.trends?.operator_risk_trajectory) ? "Worsening" : "Stable"}
                warning={["declining", "increasing"].includes(managerBundle.trends?.operator_risk_trajectory)}
              />
              <SignalTile
                label="Confidence"
                value={managerBundle.trends?.confidence_declining_days != null ? `${managerBundle.trends.confidence_declining_days}d decline` : "—"}
                subtext={managerBundle.trends?.confidence_trend || "stable"}
                warning={managerBundle.trends?.confidence_declining_days >= 3}
              />
              <SignalTile
                label="Last 1:1"
                value={managerBundle.daysSinceLast1on1 != null ? `${managerBundle.daysSinceLast1on1}d ago` : "—"}
                subtext={managerBundle.daysSinceLast1on1 > 21 ? "Overdue" : "On cadence"}
                warning={managerBundle.daysSinceLast1on1 > 21}
              />
              <SignalTile
                label="Last Check-in"
                value={managerBundle.daysSinceLastCheckIn != null ? `${managerBundle.daysSinceLastCheckIn}d ago` : "—"}
                subtext={managerBundle.daysSinceLastCheckIn > 7 ? "Disengaged" : "Active"}
                warning={managerBundle.daysSinceLastCheckIn > 7}
              />
              <SignalTile
                label="Decision Quality"
                value={managerBundle.latestDecisionDqi || "—"}
                subtext={managerBundle.dqiCompleteness != null ? `${managerBundle.dqiCompleteness}/5 completeness` : "No recent decisions"}
                warning={managerBundle.latestDecisionDqi === "early_draft"}
              />
            </div>

            {/* Recent commitments */}
            {managerBundle.recentCommitments?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Target className="w-3 h-3" /> Recent Commitments
                </p>
                <div className="space-y-1.5">
                  {managerBundle.recentCommitments.map((c, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>{c.commitment_text || "Commitment recorded"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Privacy boundary indicator */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
        <Shield className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <p className="text-xs text-gray-500">
          You see aggregated trends and signals only. Private check-in notes and conversation transcripts remain visible to the manager.
        </p>
      </div>

      {/* Intervention Log */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#0202ff]" /> Intervention Log
            </CardTitle>
            {!showForm && (
              <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Log Action
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* New intervention form */}
          {showForm && (
            <div className="mb-4 p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3">
              <Select
                value={formData.intervention_type}
                onValueChange={(v) => setFormData({ ...formData, intervention_type: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Intervention type" />
                </SelectTrigger>
                <SelectContent>
                  {INTERVENTION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="What did you do or plan to do with this manager?"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={formData.follow_up_date}
                  onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                  className="flex-1"
                />
                <Button onClick={handleCreate} disabled={!formData.notes.trim() || saving} size="sm">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                </Button>
                <Button onClick={() => setShowForm(false)} variant="ghost" size="sm">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Existing interventions */}
          {loadingInterventions ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : interventions.length > 0 ? (
            <div className="space-y-2">
              {interventions.map((i) => (
                <div key={i.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${i.status === "open" ? "bg-amber-500" : "bg-emerald-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant="outline" className="text-xs capitalize">
                        {i.intervention_type.replace(/_/g, " ")}
                      </Badge>
                      {i.status === "open" && (
                        <span className="text-xs text-amber-600 font-medium">Open</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{i.notes}</p>
                    {i.follow_up_date && (
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Follow up: {new Date(i.follow_up_date).toLocaleDateString()}
                      </p>
                    )}
                    {i.outcome_notes && (
                      <p className="text-xs text-emerald-600 mt-1 italic">Outcome: {i.outcome_notes}</p>
                    )}
                  </div>
                  {i.status === "open" && (
                    <Button size="sm" variant="ghost" onClick={() => handleComplete(i.id)} className="text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No interventions logged yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SignalTile({ label, value, subtext, warning }) {
  return (
    <div className={`rounded-lg border p-3 ${warning ? "border-amber-200 bg-amber-50" : "border-gray-100 bg-gray-50"}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-sm font-semibold ${warning ? "text-amber-700" : "text-gray-900"}`}>{value}</p>
      <p className="text-xs text-gray-400">{subtext}</p>
    </div>
  );
}