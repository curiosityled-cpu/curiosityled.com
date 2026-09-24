import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

/**
 * CriticalRoleDesignationForm — designates an OrgPosition as a CriticalRole.
 * Role → Position selection, then criticality / governance / urgency / reason.
 */
export default function CriticalRoleDesignationForm({ roles, invoke, onSubmit, loading, onCancel }) {
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [positions, setPositions] = useState([]);
  const [selectedPositionId, setSelectedPositionId] = useState("");
  const [criticalityLevel, setCriticalityLevel] = useState("high");
  const [governanceTier, setGovernanceTier] = useState("senior");
  const [continuityUrgency, setContinuityUrgency] = useState("short_term");
  const [designationReason, setDesignationReason] = useState("");

  useEffect(() => {
    if (!selectedRoleId) { setPositions([]); return; }
    (async () => {
      try {
        const data = await invoke("successionListOrgPositions", { org_role_id: selectedRoleId });
        setPositions(data?.positions || []);
      } catch { setPositions([]); }
    })();
  }, [selectedRoleId, invoke]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedPositionId || !designationReason) return;
    onSubmit({
      org_position_id: selectedPositionId,
      criticality_level: criticalityLevel,
      governance_tier: governanceTier,
      continuity_urgency: continuityUrgency,
      designation_reason: designationReason,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50/50 space-y-3">
      <div>
        <Label className="text-xs text-gray-600">Select Role *</Label>
        <select className="w-full h-9 text-sm border border-gray-200 rounded-md px-3 mt-1 bg-white"
          value={selectedRoleId} onChange={(e) => { setSelectedRoleId(e.target.value); setSelectedPositionId(""); }}>
          <option value="">— Select a role —</option>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
        </select>
      </div>

      {selectedRoleId && (
        <div>
          <Label className="text-xs text-gray-600">Select Position *</Label>
          {loading && positions.length === 0 ? (
            <p className="text-xs text-gray-400 mt-1">Loading positions…</p>
          ) : positions.length === 0 ? (
            <p className="text-xs text-gray-400 mt-1">No positions found for this role.</p>
          ) : (
            <select className="w-full h-9 text-sm border border-gray-200 rounded-md px-3 mt-1 bg-white"
              value={selectedPositionId} onChange={(e) => setSelectedPositionId(e.target.value)} required>
              <option value="">— Select a position —</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>{p.title}{p.position_identifier ? ` (${p.position_identifier})` : ""}</option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs text-gray-600">Criticality Level</Label>
          <select className="w-full h-9 text-sm border border-gray-200 rounded-md px-3 mt-1 bg-white"
            value={criticalityLevel} onChange={(e) => setCriticalityLevel(e.target.value)}>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="moderate">Moderate</option>
          </select>
        </div>
        <div>
          <Label className="text-xs text-gray-600">Governance Tier</Label>
          <select className="w-full h-9 text-sm border border-gray-200 rounded-md px-3 mt-1 bg-white"
            value={governanceTier} onChange={(e) => setGovernanceTier(e.target.value)}>
            <option value="executive">Executive</option>
            <option value="senior">Senior</option>
            <option value="operational">Operational</option>
          </select>
        </div>
        <div>
          <Label className="text-xs text-gray-600">Continuity Urgency</Label>
          <select className="w-full h-9 text-sm border border-gray-200 rounded-md px-3 mt-1 bg-white"
            value={continuityUrgency} onChange={(e) => setContinuityUrgency(e.target.value)}>
            <option value="immediate">Immediate</option>
            <option value="short_term">Short Term</option>
            <option value="long_term">Long Term</option>
          </select>
        </div>
      </div>

      <div>
        <Label className="text-xs text-gray-600">Designation Reason *</Label>
        <Textarea className="mt-1 text-sm" placeholder="Explain why this position is critical to organizational continuity…"
          value={designationReason} onChange={(e) => setDesignationReason(e.target.value)} required rows={2} />
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading || !selectedPositionId || !designationReason}>
          Designate Critical Role
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}