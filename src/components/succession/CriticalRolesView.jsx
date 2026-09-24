import React, { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Briefcase,
  Building2,
  Plus,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { useSuccessionApi } from "./useSuccessionApi";
import CriticalRoleDesignationForm from "./CriticalRoleDesignationForm";
import CriticalRoleRow from "./CriticalRoleRow";
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
  const { hasPermission, user } = useAuth();
  const userId = user?.id;
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState(null);
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [showCreateReq, setShowCreateReq] = useState(false);
  const [criticalRoles, setCriticalRoles] = useState([]);
  const [positionMap, setPositionMap] = useState({});
  const [showDesignateForm, setShowDesignateForm] = useState(false);

  const canManage = hasPermission("succession.roles.manage");
  const canView = hasPermission("succession.roles.view");

  const fetchCycles = useCallback(async () => {
    try { const data = await invoke("successionListCycles", {}); setCycles(data?.cycles || []); } catch {}
  }, [invoke]);

  const fetchRequirements = useCallback(async () => {
    if (!selectedRoleId) return;
    try { const data = await invoke("successionListCriticalRoleRequirements", { org_role_id: selectedRoleId }); setRequirements(data?.requirements || []); } catch {}
  }, [invoke, selectedRoleId]);

  useEffect(() => { fetchCycles(); }, [fetchCycles]);

  // When cycle changes: fetch roles, critical role designations, and build
  // a position map (sequential — useSuccessionApi invoke is single-flight).
  useEffect(() => {
    if (!selectedCycleId) {
      setRoles([]); setCriticalRoles([]); setPositionMap({});
      return;
    }
    (async () => {
      try {
        const rolesData = await invoke("successionListOrgRoles", { cycle_id: selectedCycleId });
        const rolesList = rolesData?.org_roles || [];
        setRoles(rolesList);

        const crData = await invoke("successionListCriticalRoles", { cycle_id: selectedCycleId });
        setCriticalRoles(crData?.critical_roles || []);

        const map = {};
        for (const role of rolesList) {
          try {
            const posData = await invoke("successionListOrgPositions", { org_role_id: role.id });
            for (const p of (posData?.positions || [])) {
              map[p.id] = { title: p.title, position_identifier: p.position_identifier, role_title: role.title };
            }
          } catch {}
        }
        setPositionMap(map);
      } catch {}
    })();
  }, [selectedCycleId, invoke]);

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

  const refreshCriticalRoles = async () => {
    try {
      const crData = await invoke("successionListCriticalRoles", { cycle_id: selectedCycleId });
      setCriticalRoles(crData?.critical_roles || []);
    } catch {}
  };

  const handleDesignate = async (formData) => {
    const opId = `desig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await invoke("successionDesignateCriticalRole", {
        operation_id: opId,
        cycle_id: selectedCycleId,
        ...formData,
      });
      setShowDesignateForm(false);
      await refreshCriticalRoles();
    } catch {}
  };

  const handleStatusChange = async (criticalRoleId, newStatus) => {
    const opId = `cr-status-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await invoke("successionChangeCriticalRoleStatus", {
        operation_id: opId,
        critical_role_id: criticalRoleId,
        new_status: newStatus,
      });
      await refreshCriticalRoles();
    } catch {}
  };

  if (!canView) {
    return <SuccessionEmpty icon={Shield} title="You do not have permission to view critical roles." />;
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
        <SuccessionSection icon={Briefcase} title="Select Role (for Requirements)">
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

      {selectedCycleId && (
        <SuccessionSection
          icon={Shield}
          title="Critical Role Designations"
          action={canManage && !showDesignateForm && (
            <Button size="sm" onClick={() => setShowDesignateForm(true)} className="h-7 text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> Designate Position
            </Button>
          )}
        >
          {showDesignateForm && canManage && (
            <CriticalRoleDesignationForm
              roles={roles}
              invoke={invoke}
              onSubmit={handleDesignate}
              loading={loading}
              onCancel={() => setShowDesignateForm(false)}
            />
          )}
          {loading && criticalRoles.length === 0 ? <SuccessionLoading /> :
           criticalRoles.length === 0 ? (
             <SuccessionEmpty icon={Shield} title="No critical roles designated" subtitle="Designate positions critical to organizational continuity." />
           ) : (
            <div className="space-y-2">
              {criticalRoles.map((cr) => (
                <CriticalRoleRow
                  key={cr.id}
                  criticalRole={cr}
                  positionInfo={positionMap[cr.org_position_id]}
                  canManage={canManage}
                  loading={loading}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
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
                 userId={userId}
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

function RequirementRow({ requirement, canManage, loading, userId, onApprove, onReturn }) {
  // Separation of duties: disallow approving a requirement you submitted.
  const isSubmitter = userId && requirement.submitted_by_profile_id && requirement.submitted_by_profile_id === userId;
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
            {isSubmitter && requirement.status === "submitted" && (
              <span className="text-xs text-gray-400 italic">You submitted this</span>
            )}
          </div>
        </div>
        {canManage && requirement.status === "submitted" && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={onApprove}
              disabled={loading || isSubmitter}
              title={isSubmitter ? "Separation of duties: you cannot approve a requirement you submitted" : undefined}
            >
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