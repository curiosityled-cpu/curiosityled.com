import React, { useState, useEffect, useCallback } from "react";
import { FileCheck, Building2, Briefcase, Sparkles, Shield } from "lucide-react";
import { useSuccessionApi } from "./useSuccessionApi";
import {
  SuccessionSection,
  SuccessionLoading,
  SuccessionError,
  SuccessionEmpty,
} from "./SuccessionSection";
import { useAuth } from "@/components/useAuth";
import { Button } from "@/components/ui/button";

export default function EvidenceView() {
  const { invoke, loading, error, clearError } = useSuccessionApi();
  const { hasPermission } = useAuth();
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState(null);
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [blueprints, setBlueprints] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);

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

  useEffect(() => { fetchCycles(); }, [fetchCycles]);
  useEffect(() => { if (selectedCycleId) fetchRoles(); else setRoles([]); }, [fetchRoles, selectedCycleId]);
  useEffect(() => { if (selectedRoleId) fetchBlueprints(); else setBlueprints([]); }, [fetchBlueprints, selectedRoleId]);

  const handleGenerateSnapshot = async (blueprintId) => {
    const opId = `snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await invoke("successionCreateEffectiveBlueprintSnapshot", {
        operation_id: opId,
        blueprint_id: blueprintId,
        org_role_id: selectedRoleId,
      });
      await fetchBlueprints();
    } catch {}
  };

  const handleViewSnapshot = async (snapshotId) => {
    try {
      const data = await invoke("successionGetSnapshot", { snapshot_id: snapshotId });
      setSelectedSnapshot(data);
    } catch {}
  };

  if (!canView) {
    return <SuccessionEmpty icon={FileCheck} title="You do not have permission to view evidence snapshots." />;
  }

  const currentBlueprint = blueprints.find((b) => b.is_current && b.status === "approved");

  return (
    <div className="space-y-4">
      <SuccessionError message={error} onDismiss={clearError} />

      <SuccessionSection icon={Building2} title="Select Cycle">
        {cycles.length === 0 && !loading ? (
          <SuccessionEmpty icon={Building2} title="No cycles available" />
        ) : (
          <select className="w-full h-9 text-sm border border-gray-200 rounded-md px-3 bg-white"
            value={selectedCycleId || ""}
            onChange={(e) => { setSelectedCycleId(e.target.value || null); setSelectedRoleId(null); setSelectedSnapshot(null); }}>
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
             onChange={(e) => { setSelectedRoleId(e.target.value || null); setSelectedSnapshot(null); }}>
             <option value="">— Select a role —</option>
             {roles.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
           </select>}
        </SuccessionSection>
      )}

      {selectedRoleId && (
        <SuccessionSection
          icon={FileCheck}
          title="Blueprints & Snapshots"
          action={
            canManage && currentBlueprint && (
              <Button size="sm" onClick={() => handleGenerateSnapshot(currentBlueprint.id)} disabled={loading} className="h-7 text-xs">
                <Sparkles className="w-3.5 h-3.5 mr-1" /> Generate Snapshot
              </Button>
            )
          }
        >
          {!currentBlueprint && blueprints.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 mb-3">
              <p className="text-xs text-amber-700">No approved current blueprint. Approve a blueprint in Calibration before generating snapshots.</p>
            </div>
          )}
          {loading && blueprints.length === 0 ? <SuccessionLoading /> :
           blueprints.length === 0 ? <SuccessionEmpty icon={FileCheck} title="No blueprints for this role" subtitle="Submit and approve a blueprint in Calibration to generate evidence snapshots." /> :
           <div className="space-y-2">
             {blueprints.map((bp) => (
               <div key={bp.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                 <div className="flex items-center justify-between gap-3">
                   <div>
                     <p className="text-sm font-medium text-gray-900">{bp.version_label}</p>
                     <p className="text-xs text-gray-400 mt-0.5">
                       {bp.status} {bp.is_current && "· Current"} · Rev {bp.blueprint_revision || 0}
                     </p>
                   </div>
                   <div className="flex items-center gap-2">
                     <span className={`text-xs px-2 py-0.5 rounded-full ${bp.status === "approved" ? "bg-green-50 text-green-700" : bp.status === "submitted" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                       {bp.status}
                     </span>
                     {bp.is_current && bp.status === "approved" && canManage && (
                       <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleGenerateSnapshot(bp.id)} disabled={loading}>
                         Snapshot
                       </Button>
                     )}
                   </div>
                 </div>
               </div>
             ))}
           </div>}
        </SuccessionSection>
      )}

      {selectedSnapshot && (
        <SuccessionSection icon={Shield} title="Snapshot Details">
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Status</p>
              <p className="text-sm text-gray-900 mt-0.5">{selectedSnapshot.snapshot?.status || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Requirements</p>
              <p className="text-sm text-gray-900 mt-0.5">
                {selectedSnapshot.generated_requirement_count || 0} / {selectedSnapshot.expected_requirement_count || 0}
              </p>
            </div>
          </div>
          {selectedSnapshot.operationally_blocked && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 mb-3">
              <p className="text-xs text-red-700">This snapshot is operationally blocked due to integrity incidents.</p>
            </div>
          )}
          {selectedSnapshot.snapshot?.requirements_snapshot && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">Requirements</p>
              {selectedSnapshot.snapshot.requirements_snapshot.map((req, i) => (
                <div key={req.id || i} className="border border-gray-200 rounded p-2 bg-gray-50/50">
                  <p className="text-sm text-gray-700">{req.requirement_text}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Rev {req.revision_number}</p>
                </div>
              ))}
            </div>
          )}
        </SuccessionSection>
      )}
    </div>
  );
}