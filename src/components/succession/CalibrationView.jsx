import React, { useState, useEffect, useCallback } from "react";
import { Scale, Building2, Briefcase, Plus, FileText, CheckCircle2 } from "lucide-react";
import { useSuccessionApi } from "./useSuccessionApi";
import {
  SuccessionSection,
  SuccessionLoading,
  SuccessionError,
  SuccessionEmpty,
} from "./SuccessionSection";
import { useAuth } from "@/components/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function CalibrationView() {
  const { invoke, loading, error, clearError } = useSuccessionApi();
  const { hasPermission } = useAuth();
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState(null);
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [blueprints, setBlueprints] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [showCreateReq, setShowCreateReq] = useState(false);

  const canView = hasPermission("succession.roles.view");
  const canManage = hasPermission("succession.roles.manage");

  const fetchCycles = useCallback(async () => {
    try { const data = await invoke("successionListCycles", {}); setCycles(data?.cycles || []); } catch {}
  }, [invoke]);

  const fetchRoles = useCallback(async () => {
    if (!selectedCycleId) return;
    try { const data = await invoke("successionListOrgRoles", { cycle_id: selectedCycleId }); setRoles(data?.org_roles || []); } catch {}
  }, [invoke, selectedCycleId]);

  const fetchBlueprints = useCallback(async () => {
    if (!selectedRoleId) return;
    try { const data = await invoke("successionListBlueprints", { org_role_id: selectedRoleId }); setBlueprints(data?.blueprints || []); } catch {}
  }, [invoke, selectedRoleId]);

  const fetchRequirements = useCallback(async () => {
    if (!selectedRoleId) return;
    try { const data = await invoke("successionListCriticalRoleRequirements", { org_role_id: selectedRoleId }); setRequirements(data?.requirements || []); } catch {}
  }, [invoke, selectedRoleId]);

  useEffect(() => { fetchCycles(); }, [fetchCycles]);
  useEffect(() => { if (selectedCycleId) fetchRoles(); else setRoles([]); }, [fetchRoles, selectedCycleId]);
  useEffect(() => {
    if (selectedRoleId) { fetchBlueprints(); fetchRequirements(); }
    else { setBlueprints([]); setRequirements([]); }
  }, [fetchBlueprints, fetchRequirements, selectedRoleId]);

  const handleSubmitBlueprint = async () => {
    const opId = `bp-submit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const versionLabel = `v${blueprints.length + 1}`;
    try {
      await invoke("successionSubmitBlueprint", {
        operation_id: opId,
        org_role_id: selectedRoleId,
        version_label: versionLabel,
        content: {},
      });
      await fetchBlueprints();
    } catch {}
  };

  const handleApproveBlueprint = async (blueprintId, expectedRevision) => {
    const opId = `bp-approve-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await invoke("successionApproveBlueprint", {
        operation_id: opId,
        blueprint_id: blueprintId,
        org_role_id: selectedRoleId,
        expected_revision: expectedRevision,
      });
      await fetchBlueprints();
      await fetchRequirements();
    } catch {}
  };

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

  if (!canView) {
    return <SuccessionEmpty icon={Scale} title="You do not have permission to view calibration data." />;
  }

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

      {selectedRoleId && (
        <>
          <SuccessionSection
            icon={FileText}
            title="Blueprints"
            action={
              canManage && (
                <Button size="sm" onClick={handleSubmitBlueprint} disabled={loading} className="h-7 text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Submit Blueprint
                </Button>
              )
            }
          >
            {loading && blueprints.length === 0 ? <SuccessionLoading /> :
             blueprints.length === 0 ? <SuccessionEmpty icon={FileText} title="No blueprints submitted" /> :
             <div className="space-y-2">
               {blueprints.map((bp) => (
                 <div key={bp.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                   <div className="flex items-center justify-between gap-3">
                     <div>
                       <p className="text-sm font-medium text-gray-900">{bp.version_label}</p>
                       <p className="text-xs text-gray-400 mt-0.5">
                         {bp.status} {bp.is_current && "· Current"}
                       </p>
                     </div>
                     <div className="flex items-center gap-2">
                       <span className={`text-xs px-2 py-0.5 rounded-full ${bp.status === "approved" ? "bg-green-50 text-green-700" : bp.status === "submitted" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                         {bp.status}
                       </span>
                       {canManage && bp.status === "submitted" && (
                         <Button size="sm" variant="outline" className="h-7 text-xs"
                           onClick={() => handleApproveBlueprint(bp.id, bp.blueprint_approval_revision || 0)}
                           disabled={loading}>
                           Approve
                         </Button>
                       )}
                     </div>
                   </div>
                 </div>
               ))}
             </div>}
          </SuccessionSection>

          <SuccessionSection
            icon={Scale}
            title="Critical Role Requirements"
            action={
              canManage && (
                <Button size="sm" onClick={() => setShowCreateReq((s) => !s)} className="h-7 text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" /> New Requirement
                </Button>
              )
            }
          >
            {showCreateReq && canManage && (
              <CreateRequirementForm onSubmit={handleCreateRequirement} loading={loading} onCancel={() => setShowCreateReq(false)} />
            )}
            {loading && requirements.length === 0 ? <SuccessionLoading /> :
             requirements.length === 0 ? <SuccessionEmpty icon={Scale} title="No requirements defined" subtitle="Define critical role requirements to calibrate what success looks like." /> :
             <div className="space-y-2">
               {requirements.map((req) => (
                 <div key={req.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                   <div className="flex items-start justify-between gap-3">
                     <div className="min-w-0 flex-1">
                       <p className="text-sm text-gray-700">{req.requirement_text}</p>
                       <div className="flex items-center gap-2 mt-1.5">
                         <span className={`text-xs px-2 py-0.5 rounded-full ${req.status === "approved" ? "bg-green-50 text-green-700" : req.status === "submitted" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                           {req.status}
                         </span>
                         <span className="text-xs text-gray-400">Rev {req.revision_number || 1}</span>
                         {req.applicability_status !== "applicable" && (
                           <span className="text-xs text-gray-400">{req.applicability_status}</span>
                         )}
                       </div>
                     </div>
                     {canManage && req.status === "submitted" && (
                       <Button size="sm" variant="outline" className="h-7 text-xs flex-shrink-0"
                         onClick={() => handleApproveRequirement(req.id)} disabled={loading}>
                         <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                       </Button>
                     )}
                   </div>
                 </div>
               ))}
             </div>}
          </SuccessionSection>
        </>
      )}
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
        <Textarea className="mt-1 text-sm" placeholder="Describe what this role must be able to do..." value={requirementText}
          onChange={(e) => setRequirementText(e.target.value)} required rows={3} />
      </div>
      <div className="flex gap-2 mt-3">
        <Button type="submit" size="sm" disabled={loading || !requirementText}>Create Requirement</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}