import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

/**
 * CreateCRRForm — Position-specific requirement creation with full
 * modification-type support and base-requirement binding.
 *
 * Supports all 4 CriticalRoleRequirement modification types:
 * - new_requirement: position-specific addition (no base needed)
 * - modification: alters a canonical RoleRequirement for this position
 * - approved_exception: formal exception to a canonical requirement
 * - not_applicable: determination that a canonical requirement does not apply
 *
 * For modification/exception/not_applicable, the user must select an eligible
 * base requirement from the current approved blueprint.
 */
export default function CreateCRRForm({
  onSubmit,
  loading,
  onCancel,
  approvedRequirements,
  approvedBlueprint,
}) {
  const [modificationType, setModificationType] = useState("new_requirement");
  const [baseRequirementId, setBaseRequirementId] = useState("");
  const [requirementText, setRequirementText] = useState("");
  const [requirementDetail, setRequirementDetail] = useState("");

  const needsBase = ["modification", "approved_exception", "not_applicable"].includes(modificationType);
  const hasApprovedBase = approvedBlueprint && approvedRequirements.length > 0;

  const labels = {
    new_requirement: { text: "Position-Specific Requirement *", placeholder: "Describe what this critical role must be able to do..." },
    modification: { text: "Modification Language *", placeholder: "Describe how the canonical requirement is modified for this position..." },
    approved_exception: { text: "Exception Rationale *", placeholder: "Describe the approved exception and why it applies..." },
    not_applicable: { text: "Not-Applicable Determination *", placeholder: "Explain why this canonical requirement does not apply to this position..." },
  };

  const currentLabel = labels[modificationType] || labels.new_requirement;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!requirementText) return;
    if (needsBase && !baseRequirementId) return;

    const formData = {
      modification_type: modificationType,
      requirement_text: requirementText,
      requirement_detail: requirementDetail || null,
    };

    if (needsBase) {
      const baseReq = approvedRequirements.find((r) => r.id === baseRequirementId);
      if (!baseReq) return;
      formData.base_requirement_id = baseRequirementId;
      formData.base_blueprint_id = approvedBlueprint.id;
      formData.base_blueprint_version_number = approvedBlueprint.blueprint_approval_revision || 0;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50/50 space-y-4">
      {/* Modification Type Selector */}
      <div>
        <Label htmlFor="crr-mod-type" className="text-xs text-gray-600">Modification Type *</Label>
        <select
          id="crr-mod-type"
          className="w-full h-9 text-sm border border-gray-200 rounded-md px-3 bg-white mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          value={modificationType}
          onChange={(e) => {
            setModificationType(e.target.value);
            setBaseRequirementId("");
          }}
        >
          <option value="new_requirement">New Requirement (position-specific addition)</option>
          <option value="modification">Modification (alter a canonical requirement)</option>
          <option value="approved_exception">Approved Exception (formal exception)</option>
          <option value="not_applicable">Not Applicable (determination)</option>
        </select>
      </div>

      {/* Base Requirement Selector (for modification/exception/not_applicable) */}
      {needsBase && (
        <div>
          <Label htmlFor="crr-base-req" className="text-xs text-gray-600">
            Base Requirement * <span className="text-gray-400">(from approved blueprint)</span>
          </Label>
          {!hasApprovedBase ? (
            <p className="text-xs text-amber-600 mt-1 p-2 bg-amber-50 border border-amber-200 rounded">
              No approved blueprint requirements available. The role must have an approved blueprint before creating modifications, exceptions, or not-applicable determinations.
            </p>
          ) : (
            <select
              id="crr-base-req"
              className="w-full h-9 text-sm border border-gray-200 rounded-md px-3 bg-white mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={baseRequirementId}
              onChange={(e) => setBaseRequirementId(e.target.value)}
              required
            >
              <option value="">— Select a base requirement —</option>
              {approvedRequirements.map((req) => (
                <option key={req.id} value={req.id}>
                  {req.requirement_text.length > 80 ? req.requirement_text.substring(0, 80) + "..." : req.requirement_text}
                  {" "}({req.requirement_type})
                </option>
              ))}
            </select>
          )}
          {baseRequirementId && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded text-xs text-gray-600">
              <ChevronRight className="w-3 h-3 inline mr-1" />
              Bound to blueprint: <strong>{approvedBlueprint?.version_label}</strong> (Rev {approvedBlueprint?.blueprint_approval_revision || 0})
            </div>
          )}
        </div>
      )}

      {/* Requirement Text */}
      <div>
        <Label htmlFor="crr-text" className="text-xs text-gray-600">{currentLabel.text}</Label>
        <Textarea
          id="crr-text"
          className="mt-1 text-sm"
          placeholder={currentLabel.placeholder}
          value={requirementText}
          onChange={(e) => setRequirementText(e.target.value)}
          required
          rows={3}
        />
      </div>

      {/* Optional Detail */}
      <div>
        <Label htmlFor="crr-detail" className="text-xs text-gray-400">Detail (optional)</Label>
        <Textarea
          id="crr-detail"
          className="mt-1 text-sm"
          placeholder="Additional elaboration..."
          value={requirementDetail}
          onChange={(e) => setRequirementDetail(e.target.value)}
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading || !requirementText || (needsBase && !baseRequirementId)}>
          Create Requirement
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}