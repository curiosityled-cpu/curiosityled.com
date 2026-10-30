import React, { useState } from "react";
import { useSuccessionApi } from "@/components/succession/useSuccessionApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2, Scale } from "lucide-react";

const ATTRIBUTES = [
  { value: "gender", label: "Gender" },
  { value: "race_ethnicity", label: "Race / ethnicity" },
  { value: "age_band", label: "Age band" },
  { value: "disability_status", label: "Disability status" },
  { value: "veteran_status", label: "Veteran status" },
];

/**
 * AdverseImpactPanel — does any group come out of this cycle's ratified
 * decisions at a materially lower rate than the best-served group?
 *
 * Method: exposure is every candidate each ratified decision actually
 * considered, so a group cannot look high simply by being considered less.
 * Uses the four-fifths convention. Groups below the suppression threshold are
 * counted but never rated, so no small group can be read as a finding.
 */
export default function AdverseImpactPanel({ cycles = [] }) {
  const { invoke, loading, error } = useSuccessionApi();
  const [cycleId, setCycleId] = useState("");
  const [attribute, setAttribute] = useState("gender");
  const [result, setResult] = useState(null);

  const run = async () => {
    if (!cycleId) return;
    const res = await invoke("successionAdverseImpact", { cycle_id: cycleId, attribute });
    setResult(res || null);
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="py-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Adverse impact analysis</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Compares selection rates across ratified decisions only. Sealed attributes are joined in
              aggregate inside the server — individual values never leave it.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Cycle</Label>
              <Select value={cycleId} onValueChange={setCycleId}>
                <SelectTrigger className="mt-1" aria-label="Cycle">
                  <SelectValue placeholder="Select cycle" />
                </SelectTrigger>
                <SelectContent>
                  {cycles.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name || c.cycle_name || c.id.slice(-8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Attribute</Label>
              <Select value={attribute} onValueChange={setAttribute}>
                <SelectTrigger className="mt-1" aria-label="Attribute">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ATTRIBUTES.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button size="sm" onClick={run} disabled={loading || !cycleId}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Scale className="w-3.5 h-3.5 mr-1" />}
            Run analysis
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                {result.adverse_impact_detected ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {result.adverse_impact_detected
                      ? "A group falls below the four-fifths threshold"
                      : "No group falls below the four-fifths threshold"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{result.note}</p>
                  <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-600">
                    <span>Ratified decisions: {result.decision_count}</span>
                    <span>Candidates considered: {result.candidates_considered}</span>
                    <span>With sealed attributes: {result.attributed_exposures}</span>
                    <span>Without: {result.unattributed_exposures}</span>
                    {result.impact_ratio !== null && <span>Impact ratio: {result.impact_ratio}</span>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {result.groups?.length > 0 && (
            <Card>
              <CardContent className="py-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 text-left">
                      <th className="pb-2 font-medium">Group</th>
                      <th className="pb-2 font-medium text-right">Considered</th>
                      <th className="pb-2 font-medium text-right">Selected</th>
                      <th className="pb-2 font-medium text-right">Rate</th>
                      <th className="pb-2 font-medium text-right">Ratio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.groups.map((g, i) => (
                      <tr key={`${g.label}-${i}`}>
                        <td className="py-2 text-gray-900 capitalize">
                          {g.suppressed ? "Group too small to report" : String(g.label).replace(/_/g, " ")}
                          {g.adverse_indicator && (
                            <Badge variant="outline" className="ml-2 text-[10px] border-amber-200 text-amber-700">
                              Below threshold
                            </Badge>
                          )}
                        </td>
                        <td className="py-2 text-right text-gray-600">{g.pool}</td>
                        <td className="py-2 text-right text-gray-600">{g.selected ?? "—"}</td>
                        <td className="py-2 text-right text-gray-600">
                          {g.rate === null ? "—" : `${Math.round(g.rate * 100)}%`}
                        </td>
                        <td className="py-2 text-right text-gray-600">{g.ratio ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.suppressed_group_count > 0 && (
                  <p className="text-xs text-gray-400 mt-3">
                    {result.suppressed_group_count} group(s) fall below the reporting threshold of{" "}
                    {result.suppression_threshold} people and are counted but not rated.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-gray-400">
            This analysis supports a review; it does not by itself establish unlawful discrimination, and it
            is not a substitute for legal advice. A flagged ratio is a reason to look at the decisions behind
            it, not a conclusion about them.
          </p>
        </div>
      )}
    </div>
  );
}