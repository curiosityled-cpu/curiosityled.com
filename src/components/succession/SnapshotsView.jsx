import React, { useState, useEffect, useCallback } from "react";
import {
  Camera,
  Briefcase,
  Building2,
  Sparkles,
  Shield,
  AlertTriangle,
  Lock,
  Eye,
  Hash,
  CheckCircle2,
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

/**
 * SnapshotsView — Effective Blueprint Snapshots.
 *
 * Shows: preview effective requirements without persisting, generate immutable
 * snapshot, source tracing, requirement hash and count, snapshot-integrity
 * blocking and incident state.
 */
export default function SnapshotsView() {
  const { invoke, loading, error, clearError } = useSuccessionApi();
  const { hasPermission } = useAuth();
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState(null);
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [blueprints, setBlueprints] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const canManage = hasPermission("succession.roles.manage");
  const canView = hasPermission("succession.roles.view");

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

  const fetchIncidents = useCallback(async () => {
    if (!selectedRoleId) return;
    try { const data = await invoke("successionListSnapshotIntegrityIncidents", { org_role_id: selectedRoleId }); setIncidents(data?.incidents || []); } catch {}
  }, [invoke, selectedRoleId]);

  useEffect(() => { fetchCycles(); }, [fetchCycles]);
  useEffect(() => { if (selectedCycleId) fetchRoles(); else setRoles([]); }, [fetchRoles, selectedCycleId]);
  useEffect(() => {
    if (selectedRoleId) { fetchBlueprints(); fetchIncidents(); }
    else { setBlueprints([]); setIncidents([]); }
  }, [fetchBlueprints, fetchIncidents, selectedRoleId]);

  const currentBlueprint = blueprints.find((b) => b.is_current && b.status === "approved");

  const handlePreview = async () => {
    if (!currentBlueprint) return;
    setPreviewing(true);
    try {
      // Preview reads requirements without persisting a snapshot
      const data = await invoke("successionListCriticalRoleRequirements", { org_role_id: selectedRoleId });
      setPreviewData(data?.requirements || []);
    } catch {
      /* handled by hook */
    } finally {
      setPreviewing(false);
    }
  };

  const handleGenerateSnapshot = async () => {
    if (!currentBlueprint) return;
    const opId = `snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await invoke("successionCreateEffectiveBlueprintSnapshot", {
        operation_id: opId,
        blueprint_id: currentBlueprint.id,
        org_role_id: selectedRoleId,
      });
      await fetchBlueprints();
      await fetchIncidents();
    } catch {}
  };

  const handleViewSnapshot = async (snapshotId) => {
    try {
      const data = await invoke("successionGetSnapshot", { snapshot_id: snapshotId });
      setSelectedSnapshot(data);
    } catch {}
  };

  if (!canView) {
    return <SuccessionEmpty icon={Camera} title="You do not have permission to view snapshots." />;
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
            onChange={(e) => { setSelectedCycleId(e.target.value || null); setSelectedRoleId(null); setSelectedSnapshot(null); setPreviewData(null); }}>
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
             onChange={(e) => { setSelectedRoleId(e.target.value || null); setSelectedSnapshot(null); setPreviewData(null); }}>
             <option value="">— Select a role —</option>
             {roles.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
           </select>}
        </SuccessionSection>
      )}

      {selectedRoleId && (
        <>
          <SuccessionSection
            icon={Eye}
            title="Preview Effective Requirements"
            action={
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handlePreview} disabled={loading || previewing || !currentBlueprint}>
                  <Eye className="w-3.5 h-3.5 mr-1" /> Preview (no persist)
                </Button>
                {canManage && currentBlueprint && (
                  <Button size="sm" onClick={handleGenerateSnapshot} disabled={loading} className="h-7 text-xs">
                    <Sparkles className="w-3.5 h-3.5 mr-1" /> Generate Immutable
                  </Button>
                )}
              </div>
            }
          >
            {!currentBlueprint && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 mb-3">
                <p className="text-xs text-amber-700">No approved current blueprint. Approve a blueprint before previewing or generating snapshots.</p>
              </div>
            )}
            {previewData && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">Preview — not persisted</p>
                {previewData.map((req, i) => (
                  <div key={req.id || i} className="border border-gray-200 rounded p-2 bg-gray-50/50">
                    <p className="text-sm text-gray-700">{req.requirement_text}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Rev {req.revision_number || 1} · {req.status}</p>
                  </div>
                ))}
              </div>
            )}
            {!previewData && currentBlueprint && (
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-xs text-gray-500">Click Preview to view effective requirements without persisting a snapshot.</p>
              </div>
            )}
          </SuccessionSection>

          {incidents.length > 0 && (
            <SuccessionSection icon={AlertTriangle} title="Snapshot Integrity Incidents">
              <div className="space-y-2">
                {incidents.map((inc) => (
                  <div key={inc.id} className={`border rounded-lg p-3 ${inc.operational_use_blocked ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-4 h-4 ${inc.operational_use_blocked ? "text-red-600" : "text-amber-600"}`} />
                      <p className="text-sm font-medium text-gray-900">{inc.anomaly_type}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Status: {inc.status} {inc.operational_use_blocked && "· Operational use blocked"}
                    </p>
                  </div>
                ))}
              </div>
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
                  <p className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Hash className="w-3 h-3" /> Requirements
                  </p>
                  <p className="text-sm text-gray-900 mt-0.5">
                    {selectedSnapshot.generated_requirement_count || 0} / {selectedSnapshot.expected_requirement_count || 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Source Blueprint</p>
                  <p className="text-sm text-gray-900 mt-0.5">{selectedSnapshot.snapshot?.blueprint_id || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Source Revision</p>
                  <p className="text-sm text-gray-900 mt-0.5">{selectedSnapshot.snapshot?.blueprint_revision || "—"}</p>
                </div>
              </div>
              {selectedSnapshot.snapshot?.requirements_content_hash && (
                <div className="mb-3 p-2 rounded bg-gray-50 border border-gray-200">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Content Hash</p>
                  <p className="text-xs font-mono text-gray-700 mt-0.5 break-all">{selectedSnapshot.snapshot.requirements_content_hash}</p>
                </div>
              )}
              {selectedSnapshot.operationally_blocked && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 mb-3">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-red-600" />
                    <p className="text-xs text-red-700">Operationally blocked due to integrity incidents.</p>
                  </div>
                </div>
              )}
              {selectedSnapshot.snapshot?.requirements_snapshot && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">Materialized Requirements</p>
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
        </>
      )}
    </div>
  );
}