import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Briefcase,
  Building2,
  Plus,
  CheckCircle2,
  RotateCcw,
  Lock,
  GitCompare,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * BlueprintsView — Role Success Blueprints.
 *
 * Shows: draft blueprint, canonical RoleRequirement editor, submit/return/approve
 * workflow, version comparison, approved versions read-only.
 */
export default function BlueprintsView() {
  const { invoke, loading, error, clearError } = useSuccessionApi();
  const { hasPermission, user } = useAuth();
  const userId = user?.id;
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState(null);
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [blueprints, setBlueprints] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [showCreateReq, setShowCreateReq] = useState(false);
  const [compareVersions, setCompareVersions] = useState(false);

  const canManage = hasPermission("succession.roles.manage");
  const canView = hasPermission("succession.roles.view");
  const canApprove = hasPermission("succession.blueprints.approve");

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
      await invoke("successionCreateRoleRequirement", {
        operation_id: opId,
        org_role_id: selectedRoleId,
        requirement_text: formData.requirement_text,
      });
      setShowCreateReq(false);
      await fetchRequirements();
    } catch {}
  };

  if (!canView) {
    return <SuccessionEmpty icon={FileText} title="You do not have permission to view blueprints." />;
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
            title="Blueprint Versions"
            action={
              <div className="flex items-center gap-2">
                {blueprints.length > 1 && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCompareVersions((s) => !s)}>
                    <GitCompare className="w-3.5 h-3.5 mr-1" /> Compare
                  </Button>
                )}
                {canManage && (
                  <Button size="sm" onClick={handleSubmitBlueprint} disabled={loading} className="h-7 text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Submit Draft
                  </Button>
                )}
              </div>
            }
          >
            {loading && blueprints.length === 0 ? <SuccessionLoading /> :
             blueprints.length === 0 ? <SuccessionEmpty icon={FileText} title="No blueprints submitted" subtitle="Submit a draft blueprint to begin the approval workflow." /> :
             <div className="space-y-2">
               {blueprints.map((bp) => (
                 <BlueprintRow
                   key={bp.id}
                   blueprint={bp}
                   canManage={canManage}
                   canApprove={canApprove}
                   loading={loading}
                   userId={userId}
                   onApprove={() => handleApproveBlueprint(bp.id, bp.blueprint_approval_revision || 0)}
                   readOnly={bp.status === "approved"}
                 />
               ))}
             </div>}
          </SuccessionSection>

          {compareVersions && blueprints.length > 1 && (
            <SuccessionSection icon={GitCompare} title="Version Comparison">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-xs text-gray-500 uppercase tracking-wider">Attribute</th>
                      {blueprints.map((bp) => (
                        <th key={bp.id} className="text-left py-2 px-3 text-xs text-gray-500 uppercase tracking-wider">
                          {bp.version_label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-3 text-xs text-gray-500">Status</td>
                      {blueprints.map((bp) => (
                        <td key={bp.id} className="py-2 px-3 text-sm text-gray-900">{bp.status}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-3 text-xs text-gray-500">Current</td>
                      {blueprints.map((bp) => (
                        <td key={bp.id} className="py-2 px-3 text-sm text-gray-900">{bp.is_current ? "Yes" : "No"}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-xs text-gray-500">Revision</td>
                      {blueprints.map((bp) => (
                        <td key={bp.id} className="py-2 px-3 text-sm text-gray-900">{bp.blueprint_approval_revision || 0}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </SuccessionSection>
          )}

          <SuccessionSection
            icon={FileText}
            title="Canonical RoleRequirement Editor"
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
             requirements.length === 0 ? <SuccessionEmpty icon={FileText} title="No requirements defined" subtitle="Define role requirements that will be materialized in effective snapshots." /> :
             <div className="space-y-2">
               {requirements.map((req) => (
                 <div key={req.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                   <p className="text-sm text-gray-700">{req.requirement_text}</p>
                   <div className="flex items-center gap-2 mt-1.5">
                     <span className={`text-xs px-2 py-0.5 rounded-full ${req.status === "approved" ? "bg-green-50 text-green-700" : req.status === "submitted" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                       {req.status}
                     </span>
                     <span className="text-xs text-gray-400">Rev {req.revision_number || 1}</span>
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

function BlueprintRow({ blueprint, canManage, canApprove, loading, userId, onApprove, readOnly }) {
  // Separation of duties: disallow approving a blueprint you submitted.
  const isSubmitter = userId && blueprint.submitted_by_profile_id && blueprint.submitted_by_profile_id === userId;
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900">{blueprint.version_label}</p>
            {readOnly && <Lock className="w-3 h-3 text-gray-400" />}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {blueprint.status} {blueprint.is_current && "· Current"} · Rev {blueprint.blueprint_approval_revision || 0}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${blueprint.status === "approved" ? "bg-green-50 text-green-700" : blueprint.status === "submitted" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
            {blueprint.status}
          </span>
          {canApprove && blueprint.status === "submitted" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={onApprove}
              disabled={loading || isSubmitter}
              title={isSubmitter ? "Separation of duties: you cannot approve a blueprint you submitted" : undefined}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
            </Button>
          )}
          {isSubmitter && blueprint.status === "submitted" && (
            <span className="text-xs text-gray-400 italic">You submitted this</span>
          )}
        </div>
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
        <Textarea className="mt-1 text-sm" placeholder="Describe a role requirement..." value={requirementText}
          onChange={(e) => setRequirementText(e.target.value)} required rows={3} />
      </div>
      <div className="flex gap-2 mt-3">
        <Button type="submit" size="sm" disabled={loading || !requirementText}>Create Requirement</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}