/**
 * BehavioralAdoptionSection — collapsible sub-section for the Talent Scorecard.
 * Mirrors the KPI / Goals / Development sub-card pattern: uppercase tracking
 * header, bordered rounded-2xl card, localStorage-persisted collapse state.
 * Defaults to closed per goal-tracking sub-section convention.
 */
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ChevronUp, ChevronDown, Plus, AlertCircle, Repeat } from "lucide-react";
import BehaviorDemonstrationDialog from "./BehaviorDemonstrationDialog";

const SOURCE_LABELS = {
  manual: "Self-logged",
  checkin: "Check-in",
  coaching_session: "Coaching",
  hris_import: "HRIS",
  api_sync: "API sync",
  sftp_sync: "SFTP sync",
};

export default function BehavioralAdoptionSection({ userEmail }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(() => {
    try { const s = localStorage.getItem("cl_collapse_scorecard_adoption"); return s !== null ? JSON.parse(s) : false; } catch { return false; }
  });
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

  const toggle = () => {
    const v = !expanded;
    setExpanded(v);
    try { localStorage.setItem("cl_collapse_scorecard_adoption", JSON.stringify(v)); } catch {}
  };

  // Don't render the section at all if no behavioral commitments exist
  if (committed === 0 && bhGoals.length === 0) return null;

  return (
    <>
      <div className="bg-card border border-border rounded-2xl px-5 py-4">
        <button
          className="flex items-center justify-between w-full text-left"
          onClick={toggle}
        >
          <div className="flex items-center gap-2">
            <Repeat className="w-3 h-3 text-[#0202ff] flex-shrink-0" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Behavioral Adoption</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">
              {rate != null ? `${rate}%` : "—"}
            </span>
            {expanded
              ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
          </div>
        </button>

        {expanded && (
          <div className="mt-3 space-y-3">
            {/* Headline */}
            <div>
              <div className="flex items-baseline gap-2 mb-0.5">
                <p className="text-2xl font-bold text-foreground">{rate != null ? `${rate}%` : "—"}</p>
                <p className="text-[11px] text-muted-foreground">
                  {demonstrated} of {committed} behaviors demonstrated
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                Of the behaviors you committed to changing, how many are you demonstrating across real situations
              </p>
            </div>

            {/* Self-report callout */}
            {selfReportOnly > 0 && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                <AlertCircle className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-amber-800 leading-snug">
                  <span className="font-semibold">{selfReportOnly}</span> {selfReportOnly === 1 ? "behavior has" : "behaviors have"} only your self-report — awaiting corroboration.
                </p>
              </div>
            )}

            {/* Evidence source breakdown */}
            {Object.keys(sourceBreakdown).length > 0 && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-1.5">Evidence sources</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(sourceBreakdown).map(([src, count]) => (
                    <span key={src} className="text-[10px] font-medium bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-md">
                      {SOURCE_LABELS[src] || src} · {count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Stalled goals — awaiting demonstration */}
            {stalledGoals.length > 0 && (
              <div className="border-t border-border/40 pt-2.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
                  Awaiting demonstration ({stalledGoals.length})
                </p>
                <div className="space-y-1">
                  {stalledGoals.slice(0, 4).map(g => (
                    <div key={g.id} className="flex items-center gap-1.5 group">
                      <button
                        onClick={() => setDialogGoal(g)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#0202ff] transition-colors flex-1 text-left min-w-0"
                      >
                        <Plus className="w-3 h-3 text-muted-foreground/50 group-hover:text-[#0202ff] flex-shrink-0" />
                        <span className="truncate">{g.title}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
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