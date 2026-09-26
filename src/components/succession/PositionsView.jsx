import React, { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Briefcase,
  Plus,
  UserCircle,
  AlertCircle,
  History,
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

/**
 * PositionsView — Organizational Positions directory.
 *
 * Shows: position directory, reporting relationships, assignment history,
 * vacancy derived from assignments, position-change history.
 * No candidate records.
 */
export default function PositionsView() {
  const { invoke, loading, error, clearError } = useSuccessionApi();
  const { hasPermission } = useAuth();
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState(null);
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [positions, setPositions] = useState([]);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [showCreate, setShowCreate] = useState(false);

  const canManage = hasPermission("succession.roles.manage");
  const canView = hasPermission("succession.roles.view");

  const fetchCycles = useCallback(async () => {
    try {
      const data = await invoke("successionListCycles", {});
      setCycles(data?.cycles || []);
    } catch {}
  }, [invoke]);

  const fetchRoles = useCallback(async () => {
    if (!selectedCycleId) return;
    try {
      const data = await invoke("successionListOrgRoles", { cycle_id: selectedCycleId });
      setRoles(data?.org_roles || []);
    } catch {}
  }, [invoke, selectedCycleId]);

  const fetchPositions = useCallback(async () => {
    if (!selectedRoleId) return;
    try {
      const data = await invoke("successionListOrgPositions", { org_role_id: selectedRoleId });
      setPositions(data?.positions || []);
    } catch {}
  }, [invoke, selectedRoleId]);

  const fetchAssignments = useCallback(async () => {
    if (!selectedPosition) return;
    try {
      const data = await invoke("successionListPositionAssignments", {
        org_position_id: selectedPosition.id,
      });
      setAssignments(data?.assignments || []);
    } catch {}
  }, [invoke, selectedPosition]);

  useEffect(() => { fetchCycles(); }, [fetchCycles]);
  useEffect(() => { if (selectedCycleId) fetchRoles(); else setRoles([]); }, [fetchRoles, selectedCycleId]);
  useEffect(() => { if (selectedRoleId) fetchPositions(); else setPositions([]); }, [fetchPositions, selectedRoleId]);
  useEffect(() => { if (selectedPosition) fetchAssignments(); else setAssignments([]); }, [fetchAssignments, selectedPosition]);

  const handleCreatePosition = async (formData) => {
    const opId = `pos-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await invoke("successionCreateOrgPosition", {
        operation_id: opId,
        org_role_id: selectedRoleId,
        title: formData.title,
        position_identifier: formData.position_identifier || undefined,
      });
      setShowCreate(false);
      await fetchPositions();
    } catch {}
  };

  if (!canView) {
    return <SuccessionEmpty icon={Building2} title="You do not have permission to view positions." />;
  }

  const activeAssignment = assignments.find((a) => a.status === "active");
  const isVacant = selectedPosition && !activeAssignment;

  return (
    <div className="space-y-4">
      <SuccessionError message={error} onDismiss={clearError} />

      <SuccessionSection icon={Building2} title="Select Cycle">
        {cycles.length === 0 && !loading ? (
          <SuccessionEmpty icon={Building2} title="No cycles available" subtitle="Create a cycle first." />
        ) : (
          <select
            className="w-full h-9 text-sm border border-gray-200 rounded-md px-3 bg-white"
            value={selectedCycleId || ""}
            onChange={(e) => { setSelectedCycleId(e.target.value || null); setSelectedRoleId(null); setSelectedPosition(null); }}
          >
            <option value="">— Select a cycle —</option>
            {cycles.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.cycle_key})</option>)}
          </select>
        )}
      </SuccessionSection>

      {selectedCycleId && (
        <SuccessionSection icon={Briefcase} title="Select Role">
          {loading && roles.length === 0 ? <SuccessionLoading /> :
           roles.length === 0 ? <SuccessionEmpty icon={Briefcase} title="No roles in this cycle" /> :
           <select aria-label="Select Role" className="w-full h-9 text-sm border border-gray-200 rounded-md px-3 bg-white"
              value={selectedRoleId || ""}
              onChange={(e) => { setSelectedRoleId(e.target.value || null); setSelectedPosition(null); }}>
             <option value="">— Select a role —</option>
             {roles.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
           </select>}
        </SuccessionSection>
      )}

      {selectedRoleId && (
        <SuccessionSection
          icon={Building2}
          title="Position Directory"
          action={canManage && (
            <Button size="sm" onClick={() => setShowCreate((s) => !s)} className="h-7 text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> New Position
            </Button>
          )}
        >
          {showCreate && canManage && (
            <CreatePositionForm onSubmit={handleCreatePosition} loading={loading} onCancel={() => setShowCreate(false)} />
          )}
          {loading && positions.length === 0 ? <SuccessionLoading /> :
           positions.length === 0 ? <SuccessionEmpty icon={Building2} title="No positions defined" subtitle="Create positions to instantiate this role." /> :
           <div className="space-y-2">
             {positions.map((pos) => (
               <PositionRow
                 key={pos.id}
                 position={pos}
                 isSelected={selectedPosition?.id === pos.id}
                 onSelect={() => setSelectedPosition((prev) => (prev?.id === pos.id ? null : pos))}
               />
             ))}
           </div>}
        </SuccessionSection>
      )}

      {selectedPosition && (
        <>
          <SuccessionSection icon={AlertCircle} title="Vacancy Status">
            {isVacant ? (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-sm text-amber-800">
                  This position is currently <strong>vacant</strong> — no active assignment found.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                <p className="text-sm text-green-800">
                  Filled by <strong>{activeAssignment.user_email}</strong> ({activeAssignment.assignment_type}) since {activeAssignment.start_date}
                </p>
              </div>
            )}
          </SuccessionSection>

          <SuccessionSection icon={History} title="Assignment History">
            {loading && assignments.length === 0 ? <SuccessionLoading /> :
             assignments.length === 0 ? <SuccessionEmpty icon={History} title="No assignment history" /> :
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
                   {a.correction_of_assignment_id && (
                     <p className="text-xs text-gray-400 mt-2 italic">Corrects a prior assignment record</p>
                   )}
                 </div>
               ))}
             </div>}
          </SuccessionSection>
        </>
      )}
    </div>
  );
}

function PositionRow({ position, isSelected, onSelect }) {
  return (
    <div
      className={`border rounded-lg p-3 cursor-pointer transition-colors ${isSelected ? "border-[#0202ff] bg-[#0202ff]/5" : "border-gray-200 hover:border-gray-300 bg-white"}`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">{position.title}</p>
          {position.position_identifier && (
            <p className="text-xs text-gray-400 font-mono mt-0.5">{position.position_identifier}</p>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${position.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
          {position.is_active ? "Active" : "Inactive"}
        </span>
      </div>
    </div>
  );
}

function CreatePositionForm({ onSubmit, loading, onCancel }) {
  const [formData, setFormData] = useState({ title: "", position_identifier: "" });
  const handleSubmit = (e) => { e.preventDefault(); if (!formData.title) return; onSubmit(formData); };
  return (
    <form onSubmit={handleSubmit} className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50/50">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-gray-600">Title *</Label>
          <Input className="mt-1 h-8 text-sm" placeholder="e.g. VP of Engineering - Product" value={formData.title}
            onChange={(e) => setFormData((d) => ({ ...d, title: e.target.value }))} required />
        </div>
        <div>
          <Label className="text-xs text-gray-600">Position Identifier</Label>
          <Input className="mt-1 h-8 text-sm" placeholder="e.g. POS-VP-ENG-001" value={formData.position_identifier}
            onChange={(e) => setFormData((d) => ({ ...d, position_identifier: e.target.value }))} />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Button type="submit" size="sm" disabled={loading || !formData.title}>Create Position</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}