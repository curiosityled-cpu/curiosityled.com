import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText } from "lucide-react";
import { DiagnosticConfigProvider } from "./DiagnosticConfigContext";
import ConstructRadar from "./ConstructRadar";

const GENERAL_LABELS = {
  signal_delay: "Early Signal Detection",
  support_friction: "Flow-of-Work Support",
  proof_defensibility: "Proof & Defensibility",
  fragmentation_admin: "System Cohesion",
  cost_of_inaction: "Proactive Cost Awareness",
};
const BPO_LABELS = {
  performance_response: "Performance Response",
  coaching_cadence: "Coaching Cadence & Quality",
  operational_control: "Operational Control",
  follow_through: "Follow-through & Accountability",
  team_stability: "Team Stability Risk",
};

function variantForSession(s) {
  return s?.construct_scores?.performance_response ? "bpo" : "general";
}
function constructLabel(key, variant) {
  return (variant === "bpo" ? BPO_LABELS : GENERAL_LABELS)[key] || key;
}
function prettifyKey(key) {
  return String(key)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
function formatValue(value) {
  if (Array.isArray(value)) return value.join(", ") || "—";
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function ScoreRow({ label, score }) {
  const pct = Math.max(0, Math.min(100, score || 0));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700 pr-2">{label}</span>
        <span className="font-bold text-gray-900 tabular-nums">{score ?? 0}/100</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: "#0202ff" }} />
      </div>
    </div>
  );
}

export default function DiagnosticDetailDrawer({ session, open, onClose }) {
  if (!session) return null;
  const variant = variantForSession(session);
  const prospect = session.prospect;
  const constructScores = session.construct_scores || {};
  const intake = session.intake_answers || {};
  const followUps = session.follow_up_answers || {};
  const pressurePoints = session.top_2_pressure_points || [];
  const blueprint = session.blueprint_priorities || [];

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left">Diagnostic Response</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 px-1 pb-8">
          {/* Respondent context */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-gray-900">
                {session.respondent_name || prospect?.name || "Respondent"}
              </p>
              <Badge variant="outline">{variant === "bpo" ? "BPO Leadership" : "Leadership Reboot"}</Badge>
            </div>
            <p className="text-sm text-gray-600">{prospect?.email || "—"}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              {prospect?.organization && <span>Org: {prospect.organization}</span>}
              {prospect?.role && <span>Role: {prospect.role}</span>}
              {session.created_date && (
                <span>Completed: {new Date(session.created_date).toLocaleDateString()}</span>
              )}
            </div>
            {session.pdf_url && (
              <a href={session.pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium mt-1" style={{ color: "#0202ff" }}>
                <FileText className="w-4 h-4" /> View PDF report
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Overall + radar */}
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Overall Score</span>
              <span className="text-2xl font-bold text-gray-900 tabular-nums">{session.overall_score ?? 0}</span>
            </div>
            <Badge variant="secondary">{session.overall_label || "—"}</Badge>
            <div className="mt-3">
              <DiagnosticConfigProvider variant={variant}>
                <ConstructRadar constructScores={constructScores} />
              </DiagnosticConfigProvider>
            </div>
          </div>

          {/* Construct scores */}
          <div className="rounded-lg border border-gray-200 p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Construct Scores</p>
            {Object.entries(constructScores).map(([key, score]) => (
              <ScoreRow key={key} label={constructLabel(key, variant)} score={score} />
            ))}
          </div>

          {/* Pressure points */}
          {pressurePoints.length > 0 && (
            <div className="rounded-lg border border-gray-200 p-4 space-y-2">
              <p className="text-sm font-semibold text-gray-700">Top Pressure Points</p>
              {pressurePoints.map((k, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: "#0202ff" }}>
                    {i + 1}
                  </span>
                  <span className="text-gray-800">{constructLabel(k, variant)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Blueprint priorities */}
          {blueprint.length > 0 && (
            <div className="rounded-lg border border-gray-200 p-4 space-y-2">
              <p className="text-sm font-semibold text-gray-700">90-Day Blueprint Priorities</p>
              {blueprint.map((k, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white bg-gray-500">
                    {i + 1}
                  </span>
                  <span className="text-gray-800">{constructLabel(k, variant)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Intake answers */}
          <div className="rounded-lg border border-gray-200 p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-700">Intake Answers</p>
            {Object.keys(intake).length === 0 ? (
              <p className="text-sm text-gray-400">No intake answers recorded.</p>
            ) : (
              Object.entries(intake).map(([k, v]) => (
                <div key={k} className="text-sm">
                  <span className="text-gray-500">{prettifyKey(k)}: </span>
                  <span className="text-gray-800">{formatValue(v)}</span>
                </div>
              ))
            )}
          </div>

          {/* Follow-up answers */}
          {Object.keys(followUps).length > 0 && (
            <div className="rounded-lg border border-gray-200 p-4 space-y-2">
              <p className="text-sm font-semibold text-gray-700">Follow-up Answers</p>
              {Object.entries(followUps).map(([k, v]) => (
                <div key={k} className="text-sm">
                  <span className="text-gray-500">{prettifyKey(k)}: </span>
                  <span className="text-gray-800">{formatValue(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}