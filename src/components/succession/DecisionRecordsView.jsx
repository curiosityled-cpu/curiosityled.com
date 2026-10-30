import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Clock, Loader2, Plus, RotateCcw, ShieldCheck, XCircle } from "lucide-react";
import RecordDecisionForm from "@/components/succession/RecordDecisionForm";

const STATUS = {
  awaiting_ratification: {
    label: "Awaiting ratification",
    icon: Clock,
    chip: "bg-amber-50 text-amber-700 border-amber-200",
  },
  ratified: {
    label: "Ratified",
    icon: CheckCircle2,
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  returned: {
    label: "Returned",
    icon: RotateCcw,
    chip: "bg-red-50 text-red-700 border-red-200",
  },
  superseded: {
    label: "Superseded",
    icon: XCircle,
    chip: "bg-gray-100 text-gray-600 border-gray-200",
  },
};

const DECISION_LABEL = {
  select_successor: "Successor selected",
  develop_and_revisit: "Develop, then revisit",
  no_viable_successor: "No viable successor",
  defer: "Deferred",
};

const formatDate = (value) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
};

/**
 * DecisionRecordsView — the ratifiable record of what was decided for each
 * critical role. This is the artefact produced for counsel, an auditor or a
 * board: who was considered, why each was or was not chosen, who decided, and
 * who countersigned.
 */
export default function DecisionRecordsView() {
  const [records, setRecords] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [cycle, setCycle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const [action, setAction] = useState(null); // { mode: "ratify" | "return", record }
  const [note, setNote] = useState("");
  const [actionError, setActionError] = useState(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [decisionRes, roleRes, cycleRes] = await Promise.all([
        base44.functions.invoke("successionListDecisionRecords", {
          operation_id: `list-decisions-${Date.now()}`,
        }),
        base44.functions.invoke("successionListCriticalRoles", {
          operation_id: `list-roles-${Date.now()}`,
        }),
        base44.functions.invoke("successionListCycles", {
          operation_id: `list-cycles-${Date.now()}`,
        }),
      ]);

      setRecords(decisionRes?.data?.decision_records || []);

      const roles = roleRes?.data?.critical_roles || [];
      setRoleOptions(
        roles.map((role) => ({
          id: role.id,
          label: role.role_title || role.position_title || "Critical role",
        }))
      );

      const cycles = cycleRes?.data?.cycles || [];
      setCycle(cycles.find((c) => c.status !== "closed" && c.status !== "archived") || cycles[0] || null);
    } catch {
      setLoadError("Decision records could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRecord = async (payload) => {
    setSubmitting(true);
    setFormError(null);
    try {
      await base44.functions.invoke("successionRecordDecision", {
        operation_id: `record-decision-${Date.now()}`,
        action: "record",
        ...payload,
      });
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(
        err?.response?.data?.error || err?.data?.error || "The decision could not be recorded."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async () => {
    if (!action) return;
    setActing(true);
    setActionError(null);
    try {
      await base44.functions.invoke("successionRecordDecision", {
        operation_id: `${action.mode}-decision-${Date.now()}`,
        action: action.mode === "ratify" ? "ratify" : "return",
        decision_id: action.record.id,
        ratification_note: action.mode === "ratify" ? note : undefined,
        return_note: action.mode === "return" ? note : undefined,
      });
      setAction(null);
      setNote("");
      await load();
    } catch (err) {
      setActionError(
        err?.response?.data?.error || err?.data?.error || "The action could not be completed."
      );
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-gray-500">{loadError}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Decision records</h3>
          <p className="text-xs text-gray-500 max-w-2xl">
            One record per decision. It is recorded by one person, ratified by another, and never
            edited in place.
          </p>
        </div>
        {!showForm && (
          <Button
            size="sm"
            onClick={() => {
              setFormError(null);
              setShowForm(true);
            }}
            disabled={!cycle}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Record decision
          </Button>
        )}
      </div>

      {!cycle && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Create a succession cycle in the Frame stage before recording a decision.
        </p>
      )}

      {showForm && cycle && (
        <RecordDecisionForm
          cycleId={cycle.id}
          roleOptions={roleOptions}
          submitting={submitting}
          error={formError}
          onSubmit={handleRecord}
          onCancel={() => setShowForm(false)}
        />
      )}

      {records.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldCheck className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900">No decisions recorded yet</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              A recorded decision states which candidates were considered, why each was or was not
              chosen, and who countersigned it.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {records.map((record) => {
            const status = STATUS[record.status] || STATUS.awaiting_ratification;
            const StatusIcon = status.icon;
            return (
              <Card key={record.id}>
                <CardContent className="p-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {record.role_title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {DECISION_LABEL[record.decision_type] || record.decision_type}
                        {record.selected_candidate_email
                          ? ` · ${record.selected_candidate_name || record.selected_candidate_email}`
                          : ""}
                        {record.cycle_name ? ` · ${record.cycle_name}` : ""}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${status.chip}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-gray-600 line-clamp-3">{record.rationale}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                    <span>{(record.considered || []).length} considered</span>
                    {record.recorded_by_email && (
                      <span>
                        Recorded by {record.recorded_by_email} · {formatDate(record.recorded_at)}
                      </span>
                    )}
                    {record.ratified_by_email && (
                      <span>
                        Ratified by {record.ratified_by_email} · {formatDate(record.ratified_at)}
                      </span>
                    )}
                  </div>

                  {record.status === "awaiting_ratification" && (
                    <div className="mt-2.5 flex items-center gap-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setNote("");
                          setActionError(null);
                          setAction({ mode: "ratify", record });
                        }}
                      >
                        Ratify
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => {
                          setNote("");
                          setActionError(null);
                          setAction({ mode: "return", record });
                        }}
                      >
                        Return
                      </Button>
                      <span className="text-[11px] text-gray-400">
                        A different person must ratify
                      </span>
                    </div>
                  )}

                  {record.status === "returned" && record.return_note && (
                    <p className="mt-2 text-[11px] text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1.5">
                      Returned: {record.return_note}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(action)} onOpenChange={(open) => !open && setAction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {action?.mode === "ratify" ? "Ratify decision" : "Return decision"}
            </DialogTitle>
            <DialogDescription>
              {action?.mode === "ratify"
                ? "Your name is recorded as the approving authority for this decision."
                : "Say what must change before this decision can be ratified."}
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              action?.mode === "ratify"
                ? "e.g. Confirmed against the published role criteria; panel concurred on 30 Oct."
                : "e.g. Evidence for the selected candidate's financial acumen is missing."
            }
            className="min-h-[90px] text-sm"
          />

          {actionError && <p className="text-xs text-red-600">{actionError}</p>}

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setAction(null)} disabled={acting}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAction} disabled={acting || note.trim().length < 10}>
              {acting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {action?.mode === "ratify" ? "Ratify" : "Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}