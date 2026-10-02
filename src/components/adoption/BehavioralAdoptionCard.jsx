import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Repeat, ChevronRight, Plus, AlertCircle } from "lucide-react";
import BehaviorDemonstrationDialog from "./BehaviorDemonstrationDialog";

const SOURCE_LABELS = {
  manual: "Self-logged",
  checkin: "Check-in",
  coaching_session: "Coaching",
  hris_import: "HRIS",
  api_sync: "API sync",
  sftp_sync: "SFTP sync",
};

export default function BehavioralAdoptionCard({ userEmail }) {
  const queryClient = useQueryClient();
  const [dialogGoal, setDialogGoal] = useState(null);

  const { data: trends = null } = useQuery({
    queryKey: ["adoption-trends", userEmail],
    queryFn: async () => {
      const rows = await base44.entities.ManagerTrends.filter({ user_email: userEmail }, "-last_trend_computed_at", 1);
      return rows[0] || null;
    },
    enabled: !!userEmail,
    staleTime: 5 * 60 * 1000,
  });

  const { data: bhGoals = [], refetch: refetchGoals } = useQuery({
    queryKey: ["adoption-goals", userEmail],
    queryFn: async () => {
      const owned = await base44.entities.Goal.filter(
        { created_by: userEmail, goal_type: "behavioral_commitment", status: "active" },
        "-created_date", 20
      );
      const assigned = await base44.entities.Goal.filter(
        { assigned_to_emails: { $in: [userEmail] }, goal_type: "behavioral_commitment", status: "active" },
        "-created_date", 20
      );
      const seen = new Set();
      return [...owned, ...assigned].filter(g => { if (seen.has(g.id)) return false; seen.add(g.id); return true; });
    },
    enabled: !!userEmail,
    staleTime: 5 * 60 * 1000,
  });

  const committed = trends?.behavioral_committed_count ?? 0;
  const demonstrated = trends?.behavioral_demonstrated_count ?? 0;
  const selfReportOnly = trends?.behavioral_self_report_only_count ?? 0;
  const rate = trends?.behavioral_adoption_rate;
  const sourceBreakdown = trends?.behavioral_evidence_source_breakdown || {};

  // Derive stalled goals (committed but not demonstrated)
  const stalledGoals = bhGoals.filter(g => {
    const entries = g.evidence_entries || [];
    const owner = g.created_by || userEmail;
    const hasNonSelf = entries.some(e => e.added_by_email && e.added_by_email !== owner);
    const hasDemo = entries.some(e => e.note_type === "behavior_demonstration");
    return !(hasNonSelf || hasDemo);
  });

  const handleSaved = () => {
    refetchGoals();
    queryClient.invalidateQueries({ queryKey: ["adoption-trends", userEmail] });
    queryClient.invalidateQueries({ queryKey: ["adoption-org"] });
  };

  if (committed === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-[#0202ff] flex items-center justify-center">
            <Repeat className="w-3.5 h-3.5 text-white" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Behavioral Adoption</p>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          No behavioral commitments yet. When you commit to changing a specific leadership behavior, this card tracks whether you actually demonstrate it across real situations — not just whether you completed a course or held a coaching conversation.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
        <div className="h-0.5 w-full" style={{ backgroundColor: "#0202ff" }} />
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-[#0202ff] flex items-center justify-center">
              <Repeat className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Behavioral Adoption</p>
          </div>

          {/* Headline number */}
          <div className="flex items-baseline gap-3 mb-1">
            <p className="text-4xl font-bold text-slate-900">{rate != null ? `${rate}%` : "—"}</p>
            <p className="text-xs text-slate-500">
              {demonstrated} of {committed} behaviors demonstrated
            </p>
          </div>
          <p className="text-[11px] text-slate-400 mb-4">
            Of the behaviors you committed to changing, how many are you demonstrating across real situations
          </p>

          {/* Self-report callout */}
          {selfReportOnly > 0 && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                <span className="font-semibold">{selfReportOnly}</span> {selfReportOnly === 1 ? "behavior has" : "behaviors have"} only your self-report — awaiting corroboration from a stakeholder, manager, or a deliberate demonstration log.
              </p>
            </div>
          )}

          {/* Evidence source breakdown */}
          {Object.keys(sourceBreakdown).length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Evidence sources</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(sourceBreakdown).map(([src, count]) => (
                  <span key={src} className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                    {SOURCE_LABELS[src] || src} · {count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Stalled goals */}
          {stalledGoals.length > 0 && (
            <div className="border-t border-slate-100 pt-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                Awaiting demonstration ({stalledGoals.length})
              </p>
              <div className="space-y-1.5">
                {stalledGoals.slice(0, 4).map(g => (
                  <div key={g.id} className="flex items-center gap-2 group">
                    <button
                      onClick={() => setDialogGoal(g)}
                      className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-[#0202ff] transition-colors flex-1 text-left"
                    >
                      <Plus className="w-3 h-3 text-slate-400 group-hover:text-[#0202ff] flex-shrink-0" />
                      <span className="truncate">{g.title}</span>
                    </button>
                    <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <BehaviorDemonstrationDialog
        open={!!dialogGoal}
        onClose={() => setDialogGoal(null)}
        goal={dialogGoal}
        userEmail={userEmail}
        onSaved={handleSaved}
      />
    </>
  );
}