import React, { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Briefcase,
  Building2,
  Plus,
  CheckCircle2,
  RotateCcw,
  GitBranch,
  AlertCircle,
} from "lucide-react";
import { useSuccessionApi } from "./useSuccessionApi";
import { base44 } from "@/api/base44Client";
import CriticalRoleDesignationForm from "./CriticalRoleDesignationForm";
import CriticalRoleRow from "./CriticalRoleRow";
import CreateCRRForm from "./CreateCRRForm";
import CreateCRRRevisionForm from "./CreateCRRRevisionForm";
import {
  SuccessionSection,
  SuccessionLoading,
  SuccessionError,
  SuccessionEmpty,
} from "./SuccessionSection";
import { useAuth } from "@/components/useAuth";
import { Button } from "@/components/ui/button";

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
  const canApprove = hasPermission("succession.critical_role_requirements.approve");

  const [approvedBlueprint, setApprovedBlueprint] = useState(null);
  const [approvedRequirements, setApprovedRequirements] = useState([]);
  const [showReviseReq, setShowReviseReq] = useState(null);
  const [criticalRoleForReq, setCriticalRoleForReq] = useState(null);

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

  // Load the current approved blueprint and its canonical requirements for
  // base-requirement binding (modification/exception/not_applicable CRRs).
  useEffect(() => {
    if (!selectedRoleId) { setApprovedBlueprint(null); setApprovedRequirements([]); return; }
    (async () => {
      try {
        const data = await invoke("successionListBlueprints", { org_role_id: selectedRoleId });
        const current = (data?.blueprints || []).find((b) => b.status === "approved" && b.is_current);
        setApprovedBlueprint(current || null);
        if (current) {
          const reqs = await base44.entities.RoleRequirement.filter({
            blueprint_id: current.id,
            status: "approved",
          }, "-created_date", 50);
          setApprovedRequirements(reqs || []);
        } else {
          setApprovedRequirements([]);
        }
      } catch {
        setApprovedBlueprint(null);
        setApprovedRequirements([]);
      }
    })();
  }, [selectedRoleId, invoke]);

  const handleCreateRequirement = async (formData) => {
    const opId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await invoke("successionCreateCriticalRoleRequirement", {
        operation_id: opId,
        org_role_id: selectedRoleId,
        critical_role_id: criticalRoleForReq || null,
        ...formData,
      });
      setShowCreateReq(false);
      setCriticalRoleForReq(null);
      await fetchRequirements();
    } catch {}
  };

  const handleCreateRevision = async (formData) => {
    const opId = `req-rev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await invoke("successionCreateCriticalRoleRequirementRevision", {
        operation_id: opId,
        ...formData,
      });
      setShowReviseReq(null);
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
            <CreateCRRForm
              onSubmit={handleCreateRequirement}
              loading={loading}
              onCancel={() => { setShowCreateReq(false); setCriticalRoleForReq(null); }}
              approvedRequirements={approvedRequirements}
              approvedBlueprint={approvedBlueprint}
            />
          )}
          {loading && requirements.length === 0 ? <SuccessionLoading /> :
           requirements.length === 0 ? <SuccessionEmpty icon={Shield} title="No requirements defined" subtitle="Define position-specific requirements for this critical role." /> :
           <div className="space-y-2">
             {requirements.map((req) => (
               <RequirementRow
                 key={req.id}
                 requirement={req}
                 canManage={canManage}
                 canApprove={canApprove}
                 loading={loading}
                 userId={userId}
                 onApprove={() => handleApproveRequirement(req.id)}
                 onReturn={() => handleReturnRequirement(req.id)}
                 onRevise={() => setShowReviseReq(req.id)}
                 showReviseForm={showReviseReq === req.id}
                 onReviseSubmit={handleCreateRevision}
                 onReviseCancel={() => setShowReviseReq(null)}
                 approvedBlueprint={approvedBlueprint}
               />
             ))}
           </div>}
        </SuccessionSection>
      )}
    </div>
  );
}

function RequirementRow({ requirement, canManage, canApprove, loading, userId, onApprove, onReturn, onRevise, showReviseForm, onReviseSubmit, onReviseCancel, approvedBlueprint }) {
  // Separation of duties: disallow approving a requirement you submitted.
  const isSubmitter = userId && requirement.submitted_by_profile_id && requirement.submitted_by_profile_id === userId;
  const isStale = requirement.applicability_status === "stale_for_future_snapshots";
  const isSuperseded = requirement.applicability_status === "superseded";
  const canRevise = canManage && (requirement.status === "approved" || isStale);

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      {showReviseForm && (
        <CreateCRRRevisionForm
          priorRequirement={requirement}
          approvedBlueprint={approvedBlueprint}
          onSubmit={onReviseSubmit}
          loading={loading}
          onCancel={onReviseCancel}
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-700">{requirement.requirement_text}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full ${requirement.status === "approved" ? "bg-green-50 text-green-700" : requirement.status === "submitted" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
              {requirement.status}
            </span>
            <span className="text-xs text-gray-400">Rev {requirement.revision_number || 1}</span>
            <span className="text-xs text-gray-400 capitalize">{requirement.modification_type?.replace(/_/g, " ") || "new"}</span>
            {isStale && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Stale
              </span>
            )}
            {isSuperseded && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Superseded</span>
            )}
            {requirement.base_requirement_id && (
              <span className="text-xs text-gray-400">Base: {requirement.base_requirement_id.slice(-8)}</span>
            )}
            {isSubmitter && requirement.status === "submitted" && (
              <span className="text-xs text-gray-400 italic">You submitted this</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {canApprove && requirement.status === "submitted" && (
            <>
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
            </>
          )}
          {canRevise && !showReviseForm && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onRevise} disabled={loading}>
              <GitBranch className="w-3.5 h-3.5 mr-1" /> Revise
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}