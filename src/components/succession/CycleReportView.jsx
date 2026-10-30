import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Printer, AlertTriangle, ShieldCheck } from "lucide-react";
import { downloadCycleReportCsv } from "@/lib/successionCycleReportExport";

function Figure({ label, value, note, tone = "default" }) {
  const toneClass =
    tone === "bad" ? "text-red-600" : tone === "good" ? "text-green-700" : "text-gray-900";
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <p className={`text-2xl font-semibold ${toneClass}`}>{value}</p>
      <p className="text-xs text-gray-600 mt-0.5">{label}</p>
      {note && <p className="text-xs text-gray-400 mt-0.5">{note}</p>}
    </div>
  );
}

/**
 * CycleReportView — the full-cycle report as one assembled picture, with the
 * same numbers the working screens show because both read the same server-side
 * computations. Read-only: nothing here changes a record.
 */
export default function CycleReportView() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("successionGetCycleReport", {
        operation_id: `cycle-report-${Date.now()}`,
      });
      setReport(res?.data?.report || null);
    } catch (e) {
      const raw = e?.response?.data?.error || e?.data?.error || e?.message || "";
      setError(
        /Missing permission/i.test(raw)
          ? "You do not have permission to export succession reporting."
          : /No succession cycle/i.test(raw)
            ? "There is no succession cycle to report on yet."
            : "The cycle report could not be assembled.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !report) {
    return <Card><CardContent className="py-8 text-center text-gray-500">{error || "No report available."}</CardContent></Card>;
  }

  const { cycle, scope, bench, readiness, evidence, decisions, development, transitions, compliance, audit, rows } = report;
  const readinessEntries = Object.entries(readiness || {});

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">{cycle.name}</CardTitle>
              <p className="text-xs text-gray-500 mt-1">
                {cycle.status || "status not set"} · stage {cycle.stage || "not set"}
                {" · "}generated {new Date(report.generated_at).toLocaleString()}
                {report.generated_by ? ` by ${report.generated_by}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => downloadCycleReportCsv(report)}>
                <Download className="w-4 h-4 mr-1.5" /> Download CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-1.5" /> Print
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <Figure label="Roles in scope" value={scope.roles_in_scope} />
            <Figure label="Candidates" value={scope.candidacies} />
            <Figure label="Roles with a ready successor" value={bench.roles_with_ready} note={`${bench.roles_without_ready} without`} />
            <Figure label="Decisions ratified" value={decisions.ratified} note={`${decisions.awaiting_ratification} awaiting`} />
            <Figure
              label="Transitions blocked"
              value={transitions.blocked}
              tone={transitions.blocked > 0 ? "bad" : "default"}
              note={`${transitions.live} live`}
            />
            <Figure
              label="Active legal holds"
              value={compliance.active_legal_holds}
              tone={compliance.active_legal_holds > 0 ? "bad" : "default"}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader><CardTitle className="text-base">Readiness</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {readinessEntries.length === 0 && <p className="text-sm text-gray-500">No readiness conclusions recorded.</p>}
            {readinessEntries.map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{key.replace(/_/g, " ")}</span>
                <span className="font-medium text-gray-900">{value}</span>
              </div>
            ))}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-sm">
              <span className="text-gray-700">Evidence records</span>
              <span className="text-gray-900">{evidence.total} ({evidence.accepted} accepted, {evidence.draft} draft)</span>
            </div>
            {audit?.events_recorded !== null && audit?.events_recorded !== undefined && (
              <p className="text-xs text-gray-400 pt-1">{audit.events_recorded} audit events recorded for this tenant.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Development follow-through</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Open actions</span>
              <span className="text-gray-900">{development.closure.open_of_committed}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Overdue</span>
              <span className={development.totals.overdue > 0 ? "text-red-600 font-medium" : "text-gray-900"}>
                {development.totals.overdue}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Due within 14 days</span>
              <span className="text-gray-900">{development.totals.due_soon}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Closed on time</span>
              <span className="text-gray-900">
                {development.closure.on_time_rate === null ? "—" : `${development.closure.on_time_rate}%`}
                {development.closure.late > 0 ? ` (${development.closure.late} late)` : ""}
              </span>
            </div>
            {development.overdue_actions.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-medium text-red-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Most overdue
                </p>
                <ul className="mt-1 space-y-1">
                  {development.overdue_actions.slice(0, 4).map((a) => (
                    <li key={a.action_id} className="text-xs text-gray-600 flex justify-between gap-3">
                      <span className="truncate">{a.title}</span>
                      <span className="flex-shrink-0 text-red-700">{a.days_overdue}d</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Roles and decisions</CardTitle></CardHeader>
        <CardContent>
          {rows.roles.length === 0 ? (
            <p className="text-sm text-gray-500">No critical roles are in scope for this cycle.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="py-2 pr-3 font-medium">Role</th>
                    <th className="py-2 pr-3 font-medium">Candidates</th>
                    <th className="py-2 pr-3 font-medium">Ready</th>
                    <th className="py-2 font-medium">Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.roles.map((r) => (
                    <tr key={r.role_id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-3 text-gray-900">{r.role}</td>
                      <td className="py-2 pr-3 text-gray-600">{r.candidates}</td>
                      <td className={`py-2 pr-3 ${r.ready > 0 ? "text-green-700" : "text-red-600"}`}>{r.ready}</td>
                      <td className="py-2 text-gray-600">{r.decision}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Candidates</CardTitle></CardHeader>
        <CardContent>
          {rows.candidates.length === 0 ? (
            <p className="text-sm text-gray-500">No candidates were recorded for this cycle.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="py-2 pr-3 font-medium">Candidate</th>
                    <th className="py-2 pr-3 font-medium">Readiness</th>
                    <th className="py-2 pr-3 font-medium">Ratified</th>
                    <th className="py-2 pr-3 font-medium">Evidence</th>
                    <th className="py-2 font-medium">Candidacy</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.candidates.map((c) => (
                    <tr key={c.candidacy_id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-3 text-gray-900">{c.candidate}</td>
                      <td className="py-2 pr-3 text-gray-600">{(c.readiness || "—").replace(/_/g, " ")}</td>
                      <td className="py-2 pr-3">
                        <Badge
                          className={
                            c.readiness_state === "ratified"
                              ? "bg-green-100 text-green-700"
                              : c.readiness_state === "proposed_only"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-gray-100 text-gray-600"
                          }
                        >
                          {c.readiness_state.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 text-gray-600">{c.evidence_count}</td>
                      <td className="py-2 text-gray-600">{c.status || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader><CardTitle className="text-base">Transitions</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-700">Live</span><span>{transitions.live}</span></div>
            <div className="flex justify-between"><span className="text-gray-700">Completed</span><span>{transitions.completed}</span></div>
            <div className="flex justify-between">
              <span className="text-gray-700">Blocked on knowledge transfer</span>
              <span className={transitions.blocked > 0 ? "text-red-600 font-medium" : ""}>{transitions.blocked}</span>
            </div>
            {transitions.blocked_detail.map((b) => (
              <div key={b.initiation_id} className="mt-2 p-2 rounded-md bg-red-50 border border-red-200">
                <p className="text-xs text-red-900 font-medium">{b.initiation_id}</p>
                <p className="text-xs text-red-800 mt-0.5">{b.open_areas.join("; ")}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Compliance</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-700">Active legal holds</span><span>{compliance.active_legal_holds}</span></div>
            <div className="flex justify-between"><span className="text-gray-700">Candidate notices sent</span><span>{compliance.notices_sent}</span></div>
            <div className="flex justify-between"><span className="text-gray-700">Notices acknowledged</span><span>{compliance.notices_acknowledged}</span></div>
            <div className="flex justify-between"><span className="text-gray-700">Notices in draft</span><span>{compliance.notices_draft}</span></div>
            <div className="flex justify-between"><span className="text-gray-700">Sealed demographic rows</span><span>{compliance.sealed_demographic_rows}</span></div>
            <p className="text-xs text-gray-400 pt-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Sealed attributes are held only for adverse-impact analysis and are not shown beside any name.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}