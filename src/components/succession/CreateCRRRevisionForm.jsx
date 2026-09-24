import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

/**
 * CreateCRRRevisionForm — Creates a new revision of an approved or stale
 * CriticalRoleRequirement. The prior record is preserved unchanged; the new
 * revision starts in draft status with an incremented revision_number.
 */
export default function CreateCRRRevisionForm({
  priorRequirement,
  approvedBlueprint,
  onSubmit,
  loading,
  onCancel,
}) {
  const [requirementText, setRequirementText] = useState(priorRequirement?.requirement_text || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!requirementText) return;
    onSubmit({
      prior_requirement_id: priorRequirement.id,
      requirement_text: requirementText,
      blueprint_id: approvedBlueprint?.id,
      base_requirement_id: priorRequirement.base_requirement_id,
      base_blueprint_id: approvedBlueprint?.id || priorRequirement.base_blueprint_id,
      base_blueprint_version_number: approvedBlueprint?.blueprint_approval_revision || priorRequirement.base_blueprint_version_number,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="border border-gray-200 rounded-lg p-4 mb-4 bg-blue-50/30 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
          Revision {((priorRequirement?.revision_number) || 1) + 1}
        </span>
        <span className="text-xs text-gray-500">
          Revises Rev {priorRequirement?.revision_number || 1} · {priorRequirement?.modification_type?.replace(/_/g, " ")}
        </span>
      </div>
      <div>
        <Label htmlFor="rev-text" className="text-xs text-gray-600">Revised Requirement Text *</Label>
        <Textarea
          id="rev-text"
          className="mt-1 text-sm"
          placeholder="Enter the revised requirement text..."
          value={requirementText}
          onChange={(e) => setRequirementText(e.target.value)}
          required
          rows={3}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading || !requirementText}>Create Revision</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}