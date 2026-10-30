import React, { useEffect, useState } from "react";
import { useSuccessionApi } from "@/components/succession/useSuccessionApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Download, FileJson, FileText, Loader2 } from "lucide-react";
import CycleReportTable from "@/components/succession/CycleReportTable";
import { buildReportCsv, downloadTextFile, reportFileBaseName } from "@/lib/cycleReportExport";

const SUMMARY_TILES = [
  { key: "critical_roles", label: "Critical roles" },
  { key: "candidates", label: "Candidates" },
  { key: "ready_now", label: "Ready now" },
  { key: "roles_gap", label: "Roles with a gap" },
  { key: "decisions_ratified", label: "Decisions ratified" },
  { key: "follow_through_rate", label: "Follow-through", suffix: "%" },
];

/**
 * CycleReportView — the whole of one succession cycle on a single page, ready to
 * hand to a board pack or an auditor.
 *
 * The report is assembled by the server from ratified decisions, holds and
 * notices, so it cannot drift from what the workspace shows. Exporting writes
 * the same data out as a CSV (a block per section) or the raw JSON.
 */
export default function CycleReportView() {
  const { invoke, loading, error } = useSuccessionApi();
  const [cycles, setCycles] = useState([]);
  const [cycleId, setCycleId] = useState("");
  const [report, setReport] = useState(null);
  const [loadingCycles, setLoadingCycles] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await invoke("successionListCycles", { operation_id: `report-cycles-${Date.now()}` });
        const rows = res?.cycles || res?.rows || [];
        if (cancelled) return;
        setCycles(rows);
        if (rows.length) setCycleId(rows[0].id);
      } catch {
        if (!cancelled) setCycles([]);
      } finally {
        if (!cancelled) setLoadingCycles(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invoke]);

  const generate = async () => {
    if (!cycleId) return;
    const res = await invoke("successionCycleReport", { cycle_id: cycleId });
    setReport(res?.report || null);
  };

  const exportCsv = () => {
    if (!report) return;
    downloadTextFile(`${reportFileBaseName(report)}.csv`, "text/csv;charset=utf-8", buildReportCsv(report));
  };

  const exportJson = () => {
    if (!report) return;
    downloadTextFile(
      `${reportFileBaseName(report)}.json`,
      "application/json",
      JSON.stringify(report, null, 2),
    );
  };

  const summary = report?.summary || {};

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="py-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Full cycle report</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Everything recorded in one cycle — bench, readiness, decisions, development, transitions, holds and
              notices — in a form you can hand over.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <Label className="text-xs">Cycle</Label>
              <Select value={cycleId} onValueChange={setCycleId} disabled={loadingCycles}>
                <SelectTrigger className="mt-1" aria-label="Cycle">
                  <SelectValue placeholder={loadingCycles ? "Loading cycles…" : "Select cycle"} />
                </SelectTrigger>
                <SelectContent>
                  {cycles.map((cycle) => (
                    <SelectItem key={cycle.id} value={cycle.id}>
                      {cycle.name || cycle.cycle_key || cycle.id.slice(-8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={generate} disabled={loading || !cycleId}>
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                ) : (
                  <FileText className="w-3.5 h-3.5 mr-1" />
                )}
                Generate report
              </Button>
              <Button size="sm" variant="outline" onClick={exportCsv} disabled={!report}>
                <Download className="w-3.5 h-3.5 mr-1" />
                CSV
              </Button>
              <Button size="sm" variant="outline" onClick={exportJson} disabled={!report}>
                <FileJson className="w-3.5 h-3.5 mr-1" />
                JSON
              </Button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md p-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!report && !error && !loading && (
            <p className="text-xs text-gray-400">
              {cycles.length
                ? "Choose a cycle and generate its report."
                : "No succession cycles exist yet — create one to report on."}
            </p>
          )}
        </CardContent>
      </Card>

      {report && (
        <>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {SUMMARY_TILES.map((tile) => {
              const value = summary[tile.key];
              const display =
                value === null || value === undefined ? "n/a" : `${value}${tile.suffix || ""}`;
              return (
                <div key={tile.key} className="border border-gray-200 rounded-lg bg-white px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">{tile.label}</p>
                  <p className="text-lg font-semibold text-gray-900 mt-0.5">{display}</p>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
            <span>
              Generated {String(report.generated_at).slice(0, 10)}
              {report.generated_by_email ? ` by ${report.generated_by_email}` : ""}
            </span>
            <span>·</span>
            <span>
              {summary.active_holds} active {summary.active_holds === 1 ? "hold" : "holds"}
            </span>
            <span>·</span>
            <span>
              {summary.notices_sent} {summary.notices_sent === 1 ? "notice" : "notices"} sent
            </span>
            <span>·</span>
            <span>
              {summary.adverse_impact_possible
                ? "Adverse-impact analysis available for this cycle"
                : "Adverse-impact analysis needs sealed demographics and a ratified decision"}
            </span>
          </div>

          {(report.sections || []).map((section) => (
            <CycleReportTable key={section.key} section={section} />
          ))}
        </>
      )}
    </div>
  );
}