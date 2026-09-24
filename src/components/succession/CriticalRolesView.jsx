import React, { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Briefcase,
  Building2,
  Plus,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { useSuccessionApi } from "./useSuccessionApi";
import {
  SuccessionSection,
  SuccessionLoading,
  SuccessionError,
  SuccessionEmpty,
} from "./SuccessionSection";
import { useAuth } from "@/components/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

/**
 * CriticalRolesView — Cycle-specific critical role designations.
 *
 * Shows: criticality, governance tier and continuity urgency shown separately.
 * Position-specific requirements. No composite score or automatic ranking.
 */
export default function CriticalRolesView() {
  const { invoke, loading, error, clearError } = useSuccessionApi();
  const { hasPermission } = useAuth();
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState(null);
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [showCreateReq, setShowCreateReq] = useState(false);

  const canManage = hasPermission("succession.roles.manage");
  const canView = hasPermission("succession.roles.view");

  const fetchCycles = useCallback(async () => {
    try { const data = await invoke("successionListCycles", {}); setCycles(data?.cycles || []); } catch {}
  }, [invoke]);

  const fetchRoles = useCallback(async () => {
    if (!selectedCycleId) return;
    try { const data = await invoke("successionListOrgRoles", { cycle_id: selectedCycleId }); setRoles(data?.org_roles || []); } catch {}
  }, [invoke, selectedCycleId]);

  const fetchRequirements = useCallback(async () => {
    if (!selectedRoleId) return;
    try { const data = await invoke("successionListCriticalRoleRequirements", { org_role_id: selectedRoleId }); setRequirements(data?.requirements || []); } catch {}
  }, [invoke, selectedRoleId]);

  useEffect(() => { fetchCycles(); }, [fetchCycles]);
  useEffect(() => { if (selectedCycleId) fetchRoles(); else setRoles([]); }, [fetchRoles, selectedCycleId]);
  useEffect(() => { if (selectedRoleId) fetchRequirements(); else setRequirements([]); }, [fetchRequirements, selectedRoleId]);

  const handleCreateRequirement = async (formData) => {
    const opId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await invoke("successionCreateCriticalRoleRequirement", {
        operation_id: opId,
        org_role_id: selectedRoleId,
        requirement_text: formData.requirement_text,
      });
      setShowCreateReq(false);
      await fetchRequirements();
    } catch {}
  };

  const handleApproveRequirement = async (requirementId) => {
    const opId = `req-approve-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await invoke("successionApproveCriticalRoleRequirement", {
        operation_id: opId,
        requirement_id: requirementId,
      });
      await fetchRequirements();
    } catch {}
  };

  const handleReturnRequirement = async (requirementId) => {
    const opId = `req-return-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await invoke("successionReturnCriticalRoleRequirement", {
        operation_id: opId,
        requirement_id: requirementId,
      });
      await fetchRequirements();
    } catch {}
  };

  if (!canView) {
    return <SuccessionEmpty icon={Shield} title="You do not have permission to view critical roles." />;
  }

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  return (
    <div className="space-y-4">
      <SuccessionError message={error} onDismiss={clearError} />

      <SuccessionSection icon={Building2} title="Select Cycle">
        {cycles.length === 0 && !loading ? (
          <SuccessionEmpty icon={Building2} title="No cycles available" />
        ) : (
          <select className="w-full h-9 text-sm border border-gray-200 rounded-md px-3 bg-white"
            value={selectedCycleId || ""}
            onChange={(e) => { setSelectedCycleId(e.target.value || null); setSelectedRoleId(null); }}>
            <option value="">— Select a cycle —</option>
            {cycles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </SuccessionSection>

      {selectedCycleId && (
        <SuccessionSection icon={Briefcase} title="Select Role">
          {loading && roles.length === 0 ? <SuccessionLoading /> :
           roles.length === 0 ? <SuccessionEmpty icon={Briefcase} title="No roles in this cycle" /> :
           <select className="w-full h-9 text-sm border border-gray-200 rounded-md px-3 bg-white"
             value={selectedRoleId || ""}
             onChange={(e) => setSelectedRoleId(e.target.value || null)}>
             <option value="">— Select a role —</option>
             {roles.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
           </select>}
        </SuccessionSection>
      )}

      {selectedRoleId && selectedRole && (
        <SuccessionSection icon={Shield} title="Critical Role Designation">
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <p className="text-sm font-medium text-amber-800">Designation not yet available</p>
            </div>
            <p className="text-xs text-amber-700 mt-1.5">
              criticality_level, governance_tier and continuity_urgency are not yet defined on the
              role schema, and no designation backend function is deployed. This screen cannot
              designate this OrgPosition as a critical role within the active cycle until those are
              added. The fields previously shown here (confidentiality_level, integrity_status,
              resolution_status) are integrity metadata, not criticality dimensions, and have been
              removed to avoid misrepresentation.
            </p>
          </div>
          <div className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
            <p className="text-xs text-gray-500">
              When available, criticality_level, governance_tier and continuity_urgency will be shown
              separately. No composite score or automatic ranking will be computed.
            </p>
          </div>
        </SuccessionSection>
      )}

      {selectedRoleId && (
        <SuccessionSection
          icon={Shield}
          title="Position-Specific Requirements"
          action={canManage && (
            <Button size="sm" onClick={() => setShowCreateReq((s) => !s)} className="h-7 text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> New Requirement
            </Button>
          )}
        >
          {showCreateReq && canManage && (
            <CreateRequirementForm onSubmit={handleCreateRequirement} loading={loading} onCancel={() => setShowCreateReq(false)} />
          )}
          {loading && requirements.length === 0 ? <SuccessionLoading /> :
           requirements.length === 0 ? <SuccessionEmpty icon={Shield} title="No requirements defined" subtitle="Define position-specific requirements for this critical role." /> :
           <div className="space-y-2">
             {requirements.map((req) => (
               <RequirementRow
                 key={req.id}
                 requirement={req}
                 canManage={canManage}
                 loading={loading}
                 onApprove={() => handleApproveRequirement(req.id)}
                 onReturn={() => handleReturnRequirement(req.id)}
               />
             ))}
           </div>}
        </SuccessionSection>
      )}
    </div>
  );
}

function RequirementRow({ requirement, canManage, loading, onApprove, onReturn }) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-700">{requirement.requirement_text}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-xs px-2 py-0.5 rounded-full ${requirement.status === "approved" ? "bg-green-50 text-green-700" : requirement.status === "submitted" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
              {requirement.status}
            </span>
            <span className="text-xs text-gray-400">Rev {requirement.revision_number || 1}</span>
            {requirement.applicability_status !== "applicable" && (
              <span className="text-xs text-gray-400">{requirement.applicability_status}</span>
            )}
          </div>
        </div>
        {canManage && requirement.status === "submitted" && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onApprove} disabled={loading}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onReturn} disabled={loading}>
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Return
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateRequirementForm({ onSubmit, loading, onCancel }) {
  const [requirementText, setRequirementText] = useState("");
  const handleSubmit = (e) => { e.preventDefault(); if (!requirementText) return; onSubmit({ requirement_text: requirementText }); };
  return (
    <form onSubmit={handleSubmit} className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50/50">
      <div>
        <Label className="text-xs text-gray-600">Requirement Text *</Label>
        <Textarea className="mt-1 text-sm" placeholder="Describe what this critical role must be able to do..." value={requirementText}
          onChange={(e) => setRequirementText(e.target.value)} required rows={3} />
      </div>
      <div className="flex gap-2 mt-3">
        <Button type="submit" size="sm" disabled={loading || !requirementText}>Create Requirement</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}