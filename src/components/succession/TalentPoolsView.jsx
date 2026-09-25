import React, { useState, useEffect, useCallback } from "react";
import { Users, Plus, Archive, UserMinus, UserPlus } from "lucide-react";
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

export default function TalentPoolsView() {
  const { invoke, loading, error, clearError } = useSuccessionApi();
  const { hasPermission, user } = useAuth();
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState(null);
  const [pools, setPools] = useState([]);
  const [selectedPool, setSelectedPool] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [showCreate, setShowCreate] = useState(false);

  const canManage = hasPermission("succession.discovery.manage");
  const canView = hasPermission("succession.discovery.view") || canManage;

  const fetchCycles = useCallback(async () => {
    try {
      const data = await invoke("successionListCycles", {});
      setCycles(data?.cycles || []);
      if (data?.cycles?.length > 0 && !selectedCycleId) {
        setSelectedCycleId(data.cycles[0].id);
      }
    } catch { /* handled by hook */ }
  }, [invoke]);

  const fetchPools = useCallback(async () => {
    if (!selectedCycleId) return;
    try {
      const data = await invoke("successionListTalentPools", { cycle_id: selectedCycleId });
      setPools(data?.pools || []);
    } catch { setPools([]); }
  }, [invoke, selectedCycleId]);

  const fetchMemberships = useCallback(async () => {
    if (!selectedPool) { setMemberships([]); return; }
    try {
      // Secure read: backend enforces tenant scope, pool ownership, integrity filtering.
      const data = await invoke("successionListPoolMemberships", { pool_id: selectedPool.id });
      setMemberships(data?.memberships || []);
    } catch { setMemberships([]); }
  }, [invoke, selectedPool]);

  useEffect(() => { fetchCycles(); }, [fetchCycles]);
  useEffect(() => { fetchPools(); }, [fetchPools]);
  useEffect(() => { fetchMemberships(); }, [fetchMemberships]);

  const handleCreatePool = async (formData) => {
    const opId = `pool-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await invoke("successionCreateTalentPool", {
        operation_id: opId,
        cycle_id: selectedCycleId,
        name: formData.name,
        description: formData.description,
      });
      setShowCreate(false);
      await fetchPools();
    } catch { /* handled by hook */ }
  };

  const handleArchivePool = async (poolId) => {
    const opId = `pool-archive-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await invoke("successionArchiveTalentPool", { operation_id: opId, pool_id: poolId });
      setSelectedPool(null);
      await fetchPools();
    } catch { /* handled by hook */ }
  };

  const handleAddMember = async (poolId, userProfileId) => {
    const opId = `pool-member-add-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await invoke("successionAddPoolMember", {
        operation_id: opId, pool_id: poolId, user_profile_id: userProfileId,
      });
      await fetchMemberships();
    } catch { /* handled by hook */ }
  };

  const handleRemoveMember = async (membershipId, reason) => {
    const opId = `pool-member-remove-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await invoke("successionRemovePoolMember", {
        operation_id: opId, membership_id: membershipId, removal_reason: reason,
      });
      await fetchMemberships();
    } catch { /* handled by hook */ }
  };

  if (!canView) {
    return <SuccessionEmpty icon={Users} title="Access restricted" subtitle="You do not have permission to view talent pools." />;
  }

  return (
    <div className="space-y-4">
      <SuccessionError message={error} onDismiss={clearError} />

      <SuccessionSection icon={Users} title="Talent Pools"
        action={canManage && selectedCycleId && (
          <Button size="sm" onClick={() => setShowCreate(s => !s)} className="h-7 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" /> New Pool
          </Button>
        )}>
        {cycles.length > 0 && (
          <div className="mb-4">
            <Label className="text-xs text-gray-600">Cycle</Label>
            <select
              className="mt-1 w-full h-9 text-sm border border-gray-200 rounded-md px-2 bg-white"
              value={selectedCycleId || ""}
              onChange={(e) => { setSelectedCycleId(e.target.value); setSelectedPool(null); }}
            >
              {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}

        {showCreate && canManage && (
          <CreatePoolForm onSubmit={handleCreatePool} loading={loading} onCancel={() => setShowCreate(false)} />
        )}

        {loading && pools.length === 0 ? <SuccessionLoading /> :
         pools.length === 0 ? (
          <SuccessionEmpty icon={Users} title="No talent pools yet" subtitle="Create a pool to begin grouping potential successors." />
         ) : (
          <div className="space-y-2">
            {pools.map(pool => (
              <PoolRow key={pool.id} pool={pool} isSelected={selectedPool?.id === pool.id}
                canManage={canManage}
                onSelect={() => setSelectedPool(prev => prev?.id === pool.id ? null : pool)}
                onArchive={() => handleArchivePool(pool.id)}
              />
            ))}
          </div>
        )}
      </SuccessionSection>

      {selectedPool && (
        <PoolMembersSection
          pool={selectedPool} memberships={memberships} canManage={canManage}
          loading={loading} onAddMember={handleAddMember} onRemoveMember={handleRemoveMember}
        />
      )}
    </div>
  );
}

function PoolRow({ pool, isSelected, canManage, onSelect, onArchive }) {
  return (
    <div className={`border rounded-lg p-3 cursor-pointer transition-colors ${isSelected ? "border-[#0202ff] bg-[#0202ff]/5" : "border-gray-200 hover:border-gray-300 bg-white"}`} onClick={onSelect}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">{pool.name}</p>
          {pool.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{pool.description}</p>}
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pool.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {pool.status}
            </span>
          </div>
        </div>
        {canManage && pool.status === "active" && (
          <Button size="sm" variant="outline" className="h-7 text-xs flex-shrink-0"
            disabled={false} onClick={(e) => { e.stopPropagation(); onArchive(); }}>
            <Archive className="w-3.5 h-3.5 mr-1" /> Archive
          </Button>
        )}
      </div>
    </div>
  );
}

function PoolMembersSection({ pool, memberships, canManage, loading, onAddMember, onRemoveMember }) {
  const [showAdd, setShowAdd] = useState(false);
  const [userProfileId, setUserProfileId] = useState("");
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // Tenant-scoped employee picker — RLS restricts to caller's tenant
    base44.entities.UserProfile.list().then(data => setUsers(data || [])).catch(() => setUsers([]));
  }, []);

  return (
    <SuccessionSection icon={Users} title={`Members — ${pool.name}`}
      action={canManage && pool.status === "active" && (
        <Button size="sm" onClick={() => setShowAdd(s => !s)} className="h-7 text-xs">
          <UserPlus className="w-3.5 h-3.5 mr-1" /> Add Member
        </Button>
      )}>
      {showAdd && canManage && pool.status === "active" && (
        <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50/50">
          <Label className="text-xs text-gray-600">Select Employee</Label>
          <select
            className="mt-1 w-full h-9 text-sm border border-gray-200 rounded-md px-2 bg-white"
            value={userProfileId} onChange={(e) => setUserProfileId(e.target.value)}
          >
            <option value="">— Select —</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
          </select>
          <div className="flex gap-2 mt-3">
            <Button size="sm" disabled={loading || !userProfileId}
              onClick={() => { onAddMember(pool.id, userProfileId); setUserProfileId(""); setShowAdd(false); }}>
              Add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {memberships.length === 0 ? (
        <SuccessionEmpty icon={Users} title="No members yet" subtitle="Add members to this talent pool." />
      ) : (
        <div className="space-y-1.5">
          {memberships.map(m => {
            const u = users.find(u => u.id === m.user_profile_id);
            return (
              <div key={m.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-2.5 bg-white">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{u?.full_name || m.user_profile_id}</p>
                  {u?.email && <p className="text-xs text-gray-500 truncate">{u.email}</p>}
                </div>
                {canManage && m.status === "active" && (
                  <Button size="sm" variant="outline" className="h-7 text-xs flex-shrink-0"
                    onClick={() => { const reason = prompt("Removal reason (optional):"); onRemoveMember(m.id, reason || ""); }}>
                    <UserMinus className="w-3.5 h-3.5 mr-1" /> Remove
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </SuccessionSection>
  );
}

function CreatePoolForm({ onSubmit, loading, onCancel }) {
  const [formData, setFormData] = useState({ name: "", description: "" });
  const handleSubmit = (e) => { e.preventDefault(); if (!formData.name) return; onSubmit(formData); };
  return (
    <form onSubmit={handleSubmit} className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50/50">
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-gray-600">Pool Name *</Label>
          <Input className="mt-1 h-8 text-sm" placeholder="e.g. High-Potential Leaders"
            value={formData.name} onChange={e => setFormData(d => ({ ...d, name: e.target.value }))} required />
        </div>
        <div>
          <Label className="text-xs text-gray-600">Description</Label>
          <Input className="mt-1 h-8 text-sm" placeholder="Optional description"
            value={formData.description} onChange={e => setFormData(d => ({ ...d, description: e.target.value }))} />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Button type="submit" size="sm" disabled={loading || !formData.name}>Create Pool</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}