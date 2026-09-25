import React, { useState, useEffect, useCallback } from "react";
import { UserCheck, Plus, Ban, Filter } from "lucide-react";
import { useSuccessionApi } from "./useSuccessionApi";
import {
  SuccessionSection,
  SuccessionLoading,
  SuccessionError,
  SuccessionEmpty,
} from "./SuccessionSection";
import { useAuth } from "@/components/useAuth";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CandidateDetailView from "./CandidateDetailView";

const DISCOVERY_SOURCES = [
  { value: "pool_nomination", label: "Pool Nomination" },
  { value: "manager_nomination", label: "Manager Nomination" },
  { value: "self_nomination", label: "Self Nomination" },
  { value: "hr_nomination", label: "HR Nomination" },
];

export default function CandidatesView() {
  const { invoke, loading, error, clearError } = useSuccessionApi();
  const { hasPermission, user } = useAuth();
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState(null);
  const [criticalRoles, setCriticalRoles] = useState([]);
  const [filterCriticalRoleId, setFilterCriticalRoleId] = useState("");
  const [candidacies, setCandidacies] = useState([]);
  const [selectedCandidacy, setSelectedCandidacy] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [users, setUsers] = useState([]);

  const canManage = hasPermission("succession.discovery.manage");
  const canView = hasPermission("succession.discovery.view") || canManage;
  const isCandidateView = !canView;

  const fetchCycles = useCallback(async () => {
    try {
      const data = await invoke("successionListCycles", {});
      setCycles(data?.cycles || []);
      if (data?.cycles?.length > 0 && !selectedCycleId) {
        setSelectedCycleId(data.cycles[0].id);
      }
    } catch { /* handled by hook */ }
  }, [invoke]);

  const fetchCriticalRoles = useCallback(async () => {
    if (!selectedCycleId) { setCriticalRoles([]); return; }
    try {
      const data = await invoke("successionListCriticalRoles", { cycle_id: selectedCycleId });
      setCriticalRoles(data?.critical_roles || []);
    } catch { setCriticalRoles([]); }
  }, [invoke, selectedCycleId]);

  const fetchCandidacies = useCallback(async () => {
    try {
      let filter = { integrity_status: "active" };
      if (isCandidateView) {
        // Candidates see only their own candidacies (RLS enforces this)
        filter.user_profile_id = user?.id;
      }
      if (filterCriticalRoleId) {
        filter.critical_role_id = filterCriticalRoleId;
      }
      if (selectedCycleId) {
        filter.cycle_id = selectedCycleId;
      }
      const data = await base44.entities.SuccessorCandidacy.filter(filter);
      setCandidacies(data || []);
    } catch { setCandidacies([]); }
  }, [isCandidateView, user?.id, filterCriticalRoleId, selectedCycleId]);

  useEffect(() => { fetchCycles(); }, [fetchCycles]);
  useEffect(() => { fetchCriticalRoles(); }, [fetchCriticalRoles]);
  useEffect(() => { fetchCandidacies(); }, [fetchCandidacies]);
  useEffect(() => {
    // Tenant-scoped employee picker — RLS restricts to caller's tenant
    if (canManage) {
      base44.entities.UserProfile.list().then(data => setUsers(data || [])).catch(() => setUsers([]));
    }
  }, [canManage]);

  const handleCreateCandidacy = async (formData) => {
    const opId = `candidacy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await invoke("successionCreateCandidacy", {
        operation_id: opId,
        cycle_id: selectedCycleId,
        critical_role_id: formData.critical_role_id,
        user_profile_id: formData.user_profile_id,
        discovery_source: formData.discovery_source,
        origin_pool_membership_id: formData.origin_pool_membership_id || null,
      });
      setShowCreate(false);
      await fetchCandidacies();
    } catch { /* handled by hook */ }
  };

  const handleWithdrawCandidacy = async (candidacyId, reason) => {
    const opId = `candidacy-withdraw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await invoke("successionWithdrawCandidacy", {
        operation_id: opId, candidacy_id: candidacyId, withdrawal_reason: reason,
      });
      setSelectedCandidacy(null);
      await fetchCandidacies();
    } catch { /* handled by hook */ }
  };

  return (
    <div className="space-y-4">
      <SuccessionError message={error} onDismiss={clearError} />

      <SuccessionSection icon={UserCheck} title="Candidates"
        action={canManage && selectedCycleId && (
          <Button size="sm" onClick={() => setShowCreate(s => !s)} className="h-7 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" /> New Candidacy
          </Button>
        )}>

        {canView && cycles.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <Label className="text-xs text-gray-600">Cycle</Label>
              <select
                className="mt-1 w-full h-9 text-sm border border-gray-200 rounded-md px-2 bg-white"
                value={selectedCycleId || ""} onChange={e => { setSelectedCycleId(e.target.value); setFilterCriticalRoleId(""); setSelectedCandidacy(null); }}>
                {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs text-gray-600">Filter by Critical Role</Label>
              <select
                className="mt-1 w-full h-9 text-sm border border-gray-200 rounded-md px-2 bg-white"
                value={filterCriticalRoleId} onChange={e => setFilterCriticalRoleId(e.target.value)}>
                <option value="">All critical roles</option>
                {criticalRoles.map(cr => <option key={cr.id} value={cr.id}>{cr.org_position_id || cr.id}</option>)}
              </select>
            </div>
          </div>
        )}

        {showCreate && canManage && (
          <CreateCandidacyForm
            cycles={cycles} selectedCycleId={selectedCycleId}
            criticalRoles={criticalRoles} users={users}
            onSubmit={handleCreateCandidacy} loading={loading} onCancel={() => setShowCreate(false)}
          />
        )}

        {loading && candidacies.length === 0 ? <SuccessionLoading /> :
         candidacies.length === 0 ? (
          <SuccessionEmpty icon={UserCheck} title="No candidacies yet" subtitle={isCandidateView ? "You have no active candidacies." : "Create a candidacy to begin tracking potential successors."} />
         ) : (
          <div className="space-y-2">
            {candidacies.map(c => {
              const cr = criticalRoles.find(r => r.id === c.critical_role_id);
              const u = users.find(u => u.id === c.user_profile_id);
              return (
                <CandidacyRow key={c.id} candidacy={c} criticalRoleLabel={cr?.org_position_id || c.critical_role_id}
                  userLabel={u?.full_name || u?.email || c.user_profile_id}
                  isSelected={selectedCandidacy?.id === c.id}
                  canManage={canManage}
                  onSelect={() => setSelectedCandidacy(prev => prev?.id === c.id ? null : c)}
                  onWithdraw={() => { const reason = prompt("Withdrawal reason:"); if (reason !== null) handleWithdrawCandidacy(c.id, reason); }}
                />
              );
            })}
          </div>
        )}
      </SuccessionSection>

      {selectedCandidacy && (
        <CandidateDetailView candidacy={selectedCandidacy} canManage={canManage} onWithdraw={handleWithdrawCandidacy} />
      )}
    </div>
  );
}

function CandidacyRow({ candidacy, criticalRoleLabel, userLabel, isSelected, canManage, onSelect, onWithdraw }) {
  const sourceLabel = DISCOVERY_SOURCES.find(s => s.value === candidacy.discovery_source)?.label || candidacy.discovery_source;
  return (
    <div className={`border rounded-lg p-3 cursor-pointer transition-colors ${isSelected ? "border-[#0202ff] bg-[#0202ff]/5" : "border-gray-200 hover:border-gray-300 bg-white"}`} onClick={onSelect}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">{userLabel}</p>
          <p className="text-xs text-gray-500 truncate">Role: {criticalRoleLabel}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-400">{sourceLabel}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${candidacy.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {candidacy.status}
            </span>
          </div>
        </div>
        {canManage && candidacy.status === "active" && (
          <Button size="sm" variant="outline" className="h-7 text-xs flex-shrink-0"
            onClick={(e) => { e.stopPropagation(); onWithdraw(); }}>
            <Ban className="w-3.5 h-3.5 mr-1" /> Withdraw
          </Button>
        )}
      </div>
    </div>
  );
}

function CreateCandidacyForm({ cycles, selectedCycleId, criticalRoles, users, onSubmit, loading, onCancel }) {
  const [formData, setFormData] = useState({
    critical_role_id: "", user_profile_id: "", discovery_source: "hr_nomination", origin_pool_membership_id: "",
  });
  const handleSubmit = (e) => { e.preventDefault(); if (!formData.critical_role_id || !formData.user_profile_id) return; onSubmit(formData); };
  return (
    <form onSubmit={handleSubmit} className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50/50">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-gray-600">Critical Role *</Label>
          <select className="mt-1 w-full h-9 text-sm border border-gray-200 rounded-md px-2 bg-white"
            value={formData.critical_role_id} onChange={e => setFormData(d => ({ ...d, critical_role_id: e.target.value }))} required>
            <option value="">— Select —</option>
            {criticalRoles.map(cr => <option key={cr.id} value={cr.id}>{cr.org_position_id || cr.id}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs text-gray-600">Candidate *</Label>
          <select className="mt-1 w-full h-9 text-sm border border-gray-200 rounded-md px-2 bg-white"
            value={formData.user_profile_id} onChange={e => setFormData(d => ({ ...d, user_profile_id: e.target.value }))} required>
            <option value="">— Select —</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs text-gray-600">Discovery Source *</Label>
          <select className="mt-1 w-full h-9 text-sm border border-gray-200 rounded-md px-2 bg-white"
            value={formData.discovery_source} onChange={e => setFormData(d => ({ ...d, discovery_source: e.target.value }))} required>
            {DISCOVERY_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs text-gray-600">Origin Pool Membership ID (optional)</Label>
          <Input className="mt-1 h-8 text-sm" placeholder="Optional"
            value={formData.origin_pool_membership_id} onChange={e => setFormData(d => ({ ...d, origin_pool_membership_id: e.target.value }))} />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Button type="submit" size="sm" disabled={loading || !formData.critical_role_id || !formData.user_profile_id}>Create Candidacy</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}