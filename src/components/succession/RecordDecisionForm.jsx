import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, X } from "lucide-react";

const DECISION_TYPES = [
  { value: "select_successor", label: "Select a successor" },
  { value: "develop_and_revisit", label: "Develop a candidate, then revisit" },
  { value: "no_viable_successor", label: "No viable successor today" },
  { value: "defer", label: "Defer the decision" },
];

const OUTCOMES = [
  { value: "selected", label: "Selected" },
  { value: "alternate", label: "Alternate" },
  { value: "not_selected", label: "Not selected" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "declined", label: "Declined" },
];

const emptyCandidate = () => ({ candidate_email: "", candidate_name: "", outcome: "not_selected", reason: "" });

/**
 * RecordDecisionForm — records the decision itself. Every candidate needs a
 * stated reason, not just the selected one: "why not them" is the question that
 * gets challenged later.
 */
export default function RecordDecisionForm({ cycleId, roleOptions, onSubmit, onCancel, submitting, error }) {
  const [roleId, setRoleId] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [decisionType, setDecisionType] = useState("select_successor");
  const [rationale, setRationale] = useState("");
  const [panel, setPanel] = useState("");
  const [candidates, setCandidates] = useState([emptyCandidate()]);
  const [formError, setFormError] = useState(null);

  const updateCandidate = (index, field, value) => {
    setCandidates((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  const handleRoleChange = (id) => {
    setRoleId(id);
    const role = roleOptions.find((r) => r.id === id);
    if (role) setRoleTitle(role.label);
  };

  const handleSubmit = () => {
    setFormError(null);

    if (!roleTitle.trim()) return setFormError("State the role the decision is about.");
    if (rationale.trim().length < 20) {
      return setFormError("The rationale needs at least 20 characters — write it against the role criteria.");
    }

    const cleaned = candidates.filter((c) => c.candidate_email.trim());
    if (cleaned.length === 0) return setFormError("Record at least one candidate who was considered.");

    const incomplete = cleaned.find((c) => c.reason.trim().length < 10);
    if (incomplete) {
      return setFormError(`Add a reason of at least 10 characters for ${incomplete.candidate_email}.`);
    }

    const selected = cleaned.filter((c) => c.outcome === "selected");
    if (decisionType === "select_successor" && selected.length !== 1) {
      return setFormError("Mark exactly one candidate as selected.");
    }
    if (decisionType !== "select_successor" && selected.length > 0) {
      return setFormError("Only a successor decision can mark a candidate as selected.");
    }

    onSubmit({
      cycle_id: cycleId,
      role_id: roleId || null,
      role_title: roleTitle.trim(),
      decision_type: decisionType,
      rationale: rationale.trim(),
      panel: panel
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean)
        .map((email) => ({ email })),
      considered: cleaned.map((c) => ({
        candidate_email: c.candidate_email.trim(),
        candidate_name: c.candidate_name.trim() || null,
        outcome: c.outcome,
        reason: c.reason.trim(),
      })),
    });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Critical role (optional link)</Label>
          <Select value={roleId} onValueChange={handleRoleChange}>
            <SelectTrigger className="mt-1 h-9 text-sm">
              <SelectValue placeholder="Not linked to a designated role" />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Role title, as recorded</Label>
          <Input
            value={roleTitle}
            onChange={(e) => setRoleTitle(e.target.value)}
            placeholder="e.g. Director of Operations"
            className="mt-1 h-9 text-sm"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Decision</Label>
        <Select value={decisionType} onValueChange={setDecisionType}>
          <SelectTrigger className="mt-1 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DECISION_TYPES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Candidates considered</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setCandidates((prev) => [...prev, emptyCandidate()])}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add candidate
          </Button>
        </div>

        {candidates.map((candidate, index) => (
          <div key={index} className="rounded-lg border border-gray-100 bg-gray-50 p-2.5 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Input
                value={candidate.candidate_email}
                onChange={(e) => updateCandidate(index, "candidate_email", e.target.value)}
                placeholder="email@company.com"
                className="h-8 flex-1 min-w-[180px] text-sm"
              />
              <Input
                value={candidate.candidate_name}
                onChange={(e) => updateCandidate(index, "candidate_name", e.target.value)}
                placeholder="Name"
                className="h-8 w-36 text-sm"
              />
              <Select
                value={candidate.outcome}
                onValueChange={(value) => updateCandidate(index, "outcome", value)}
              >
                <SelectTrigger className="h-8 w-36 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OUTCOMES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {candidates.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400"
                  onClick={() => setCandidates((prev) => prev.filter((_, i) => i !== index))}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            <Input
              value={candidate.reason}
              onChange={(e) => updateCandidate(index, "reason", e.target.value)}
              placeholder="Why this outcome — measured against the role criteria"
              className="h-8 text-sm"
            />
          </div>
        ))}
      </div>

      <div>
        <Label className="text-xs">Rationale for the decision</Label>
        <Textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          placeholder="Against the published role criteria, why is this the right decision now?"
          className="mt-1 min-h-[80px] text-sm"
        />
      </div>

      <div>
        <Label className="text-xs">Panel members (optional, comma-separated emails)</Label>
        <Input
          value={panel}
          onChange={(e) => setPanel(e.target.value)}
          placeholder="chair@company.com, hr@company.com"
          className="mt-1 h-9 text-sm"
        />
      </div>

      {(formError || error) && (
        <p className="text-xs text-red-600">{formError || error}</p>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={handleSubmit} disabled={submitting}>
          {submitting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
          Record decision
        </Button>
      </div>

      <p className="text-[11px] text-gray-400">
        Recording does not finalise anything. A second approver must ratify it, and the person who
        records it cannot be the person who ratifies it.
      </p>
    </div>
  );
}