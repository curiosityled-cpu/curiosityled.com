import React, { useState, useEffect, useCallback } from "react";
import { Users, Building2, Briefcase, UserCircle } from "lucide-react";
import { useSuccessionApi } from "./useSuccessionApi";
import {
  SuccessionSection,
  SuccessionLoading,
  SuccessionError,
  SuccessionEmpty,
} from "./SuccessionSection";
import { useAuth } from "@/components/useAuth";

export default function CandidatesView() {
  const { invoke, loading, error, clearError } = useSuccessionApi();
  const { hasPermission } = useAuth();
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState(null);
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [positions, setPositions] = useState([]);
  const [selectedPositionId, setSelectedPositionId] = useState(null);
  const [assignments, setAssignments] = useState([]);

  const canView = hasPermission("succession.roles.view");

  const fetchCycles = useCallback(async () => {
    try { const data = await invoke("successionListCycles", {}); setCycles(data?.cycles || []); } catch {}
  }, [invoke]);

  const fetchRoles = useCallback(async () => {
    if (!selectedCycleId) return;
    try { const data = await invoke("successionListOrgRoles", { cycle_id: selectedCycleId }); setRoles(data?.org_roles || []); } catch {}
  }, [invoke, selectedCycleId]);

  const fetchPositions = useCallback(async () => {
    if (!selectedRoleId) return;
    try { const data = await invoke("successionListOrgPositions", { org_role_id: selectedRoleId }); setPositions(data?.positions || []); } catch {}
  }, [invoke, selectedRoleId]);

  const fetchAssignments = useCallback(async () => {
    if (!selectedPositionId) return;
    try { const data = await invoke("successionListPositionAssignments", { org_position_id: selectedPositionId }); setAssignments(data?.assignments || []); } catch {}
  }, [invoke, selectedPositionId]);

  useEffect(() => { fetchCycles(); }, [fetchCycles]);
  useEffect(() => { if (selectedCycleId) fetchRoles(); else setRoles([]); }, [fetchRoles, selectedCycleId]);
  useEffect(() => { if (selectedRoleId) fetchPositions(); else setPositions([]); }, [fetchPositions, selectedRoleId]);
  useEffect(() => { if (selectedPositionId) fetchAssignments(); else setAssignments([]); }, [fetchAssignments, selectedPositionId]);

  if (!canView) {
    return <SuccessionEmpty icon={Users} title="You do not have permission to view candidates." />;
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
            onChange={(e) => { setSelectedCycleId(e.target.value || null); setSelectedRoleId(null); setSelectedPositionId(null); }}>
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
             onChange={(e) => { setSelectedRoleId(e.target.value || null); setSelectedPositionId(null); }}>
             <option value="">— Select a role —</option>
             {roles.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
           </select>}
        </SuccessionSection>
      )}

      {selectedRoleId && (
        <SuccessionSection icon={Briefcase} title="Select Position">
          {loading && positions.length === 0 ? <SuccessionLoading /> :
           positions.length === 0 ? <SuccessionEmpty icon={Briefcase} title="No positions for this role" /> :
           <select className="w-full h-9 text-sm border border-gray-200 rounded-md px-3 bg-white"
             value={selectedPositionId || ""}
             onChange={(e) => setSelectedPositionId(e.target.value || null)}>
             <option value="">— Select a position —</option>
             {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
           </select>}
        </SuccessionSection>
      )}

      {selectedPositionId && (
        <SuccessionSection icon={Users} title="Position Assignments">
          {loading && assignments.length === 0 ? <SuccessionLoading /> :
           assignments.length === 0 ? <SuccessionEmpty icon={Users} title="No assignments for this position" subtitle="Assignments show who currently fills or has filled this position." /> :
           <div className="space-y-2">
             {assignments.map((a) => (
               <div key={a.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                 <div className="flex items-center justify-between gap-3">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                       <UserCircle className="w-5 h-5 text-gray-400" />
                     </div>
                     <div>
                       <p className="text-sm font-medium text-gray-900">{a.user_email || "Unknown"}</p>
                       <p className="text-xs text-gray-400 mt-0.5">
                         {a.assignment_type} · {a.start_date || "—"}{a.end_date ? ` → ${a.end_date}` : ""}
                       </p>
                     </div>
                   </div>
                   <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === "active" ? "bg-green-50 text-green-700" : a.status === "expired" ? "bg-gray-100 text-gray-500" : "bg-amber-50 text-amber-700"}`}>
                     {a.status}
                   </span>
                 </div>
               </div>
             ))}
           </div>}
        </SuccessionSection>
      )}
    </div>
  );
}