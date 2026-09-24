import React, { useState, useEffect, useCallback } from "react";
import { Briefcase, Plus, ChevronRight, Building2, FileText, Lock } from "lucide-react";
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
 * RolesView — Organizational Roles.
 *
 * Shows: role library, role detail, blueprint-version history.
 * No candidate records.
 */
export default function RolesView() {
  const { invoke, loading, error, clearError } = useSuccessionApi();
  const { hasPermission } = useAuth();
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState(null);
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [blueprints, setBlueprints] = useState([]);
  const [showCreate, setShowCreate] = useState(false);

  const canManage = hasPermission("succession.roles.manage");
  const canView = hasPermission("succession.roles.view");

  const fetchCycles = useCallback(async () => {
    try {
      const data = await invoke("successionListCycles", {});
      setCycles(data?.cycles || []);
    } catch {
      /* handled by hook */
    }
  }, [invoke]);

  const fetchRoles = useCallback(async () => {
    if (!selectedCycleId) return;
    try {
      const data = await invoke("successionListOrgRoles", { cycle_id: selectedCycleId });
      setRoles(data?.org_roles || []);
    } catch {
      /* handled by hook */
    }
  }, [invoke, selectedCycleId]);

  const fetchBlueprints = useCallback(async () => {
    if (!selectedRole) return;
    try {
      const data = await invoke("successionListBlueprints", { org_role_id: selectedRole.id });
      setBlueprints(data?.blueprints || []);
    } catch {
      /* handled by hook */
    }
  }, [invoke, selectedRole]);

  useEffect(() => { fetchCycles(); }, [fetchCycles]);
  useEffect(() => { if (selectedCycleId) fetchRoles(); else setRoles([]); }, [fetchRoles, selectedCycleId]);
  useEffect(() => { if (selectedRole) fetchBlueprints(); else setBlueprints([]); }, [fetchBlueprints, selectedRole]);

  const handleCreateRole = async (formData) => {
    const opId = `role-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await invoke("successionCreateOrgRole", {
        operation_id: opId,
        cycle_id: selectedCycleId,
        title: formData.title,
        role_identifier: formData.role_identifier || undefined,
        level: formData.level || undefined,
      });
      setShowCreate(false);
      await fetchRoles();
    } catch {
      /* handled by hook */
    }
  };

  if (!canView) {
    return <SuccessionEmpty icon={Briefcase} title="You do not have permission to view succession roles." />;
  }

  return (
    <div className="space-y-4">
      <SuccessionError message={error} onDismiss={clearError} />

      <SuccessionSection icon={Building2} title="Select Cycle">
        {cycles.length === 0 && !loading ? (
          <SuccessionEmpty icon={Building2} title="No cycles available" subtitle="Create a cycle first to manage roles." />
        ) : (
          <select
            className="w-full h-9 text-sm border border-gray-200 rounded-md px-3 bg-white"
            value={selectedCycleId || ""}
            onChange={(e) => { setSelectedCycleId(e.target.value || null); setSelectedRole(null); }}
          >
            <option value="">— Select a cycle —</option>
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.cycle_key})</option>
            ))}
          </select>
        )}
      </SuccessionSection>

      {selectedCycleId && (
        <SuccessionSection
          icon={Briefcase}
          title="Role Library"
          action={
            canManage && (
              <Button size="sm" onClick={() => setShowCreate((s) => !s)} className="h-7 text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> New Role
              </Button>
            )
          }
        >
          {showCreate && canManage && (
            <CreateRoleForm onSubmit={handleCreateRole} loading={loading} onCancel={() => setShowCreate(false)} />
          )}

          {loading && roles.length === 0 ? (
            <SuccessionLoading />
          ) : roles.length === 0 ? (
            <SuccessionEmpty icon={Briefcase} title="No roles defined yet" subtitle="Create a role to begin building the organizational foundation." />
          ) : (
            <div className="space-y-2">
              {roles.map((role) => (
                <RoleRow
                  key={role.id}
                  role={role}
                  isSelected={selectedRole?.id === role.id}
                  onSelect={() => setSelectedRole((prev) => (prev?.id === role.id ? null : role))}
                  blueprintCount={selectedRole?.id === role.id ? blueprints.length : null}
                />
              ))}
            </div>
          )}
        </SuccessionSection>
      )}

      {selectedRole && (
        <>
          <SuccessionSection icon={Briefcase} title="Role Detail">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Title</p>
                <p className="text-sm text-gray-900 mt-0.5">{selectedRole.title}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Level</p>
                <p className="text-sm text-gray-900 mt-0.5">{selectedRole.level || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Identifier</p>
                <p className="text-sm text-gray-900 mt-0.5 font-mono">{selectedRole.role_identifier || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Current Blueprint Rev</p>
                <p className="text-sm text-gray-900 mt-0.5">{selectedRole.blueprint_approval_revision || 0}</p>
              </div>
            </div>
          </SuccessionSection>

          <SuccessionSection icon={FileText} title="Blueprint-Version History">
            {loading && blueprints.length === 0 ? (
              <SuccessionLoading />
            ) : blueprints.length === 0 ? (
              <SuccessionEmpty icon={FileText} title="No blueprint versions" subtitle="Submit and approve blueprints in the Blueprints tab." />
            ) : (
              <div className="space-y-2">
                {blueprints.map((bp) => (
                  <div key={bp.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">{bp.version_label}</p>
                          {bp.status === "approved" && <Lock className="w-3 h-3 text-gray-400" />}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {bp.status} {bp.is_current && "· Current"} · Rev {bp.blueprint_approval_revision || 0}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${bp.status === "approved" ? "bg-green-50 text-green-700" : bp.status === "submitted" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                        {bp.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SuccessionSection>
        </>
      )}
    </div>
  );
}

function RoleRow({ role, isSelected, onSelect, blueprintCount }) {
  return (
    <div
      className={`border rounded-lg p-3 cursor-pointer transition-colors ${isSelected ? "border-[#0202ff] bg-[#0202ff]/5" : "border-gray-200 hover:border-gray-300 bg-white"}`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">{role.title}</p>
          <div className="flex items-center gap-2 mt-1">
            {role.level && <span className="text-xs text-gray-400">{role.level}</span>}
            {role.role_identifier && <span className="text-xs text-gray-400 font-mono">{role.role_identifier}</span>}
            {blueprintCount !== null && <span className="text-xs text-gray-400">{blueprintCount} blueprint(s)</span>}
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform ${isSelected ? "rotate-90" : ""}`} />
      </div>
    </div>
  );
}

function CreateRoleForm({ onSubmit, loading, onCancel }) {
  const [formData, setFormData] = useState({ title: "", role_identifier: "", level: "" });
  const handleSubmit = (e) => { e.preventDefault(); if (!formData.title) return; onSubmit(formData); };
  return (
    <form onSubmit={handleSubmit} className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50/50">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs text-gray-600">Title *</Label>
          <Input className="mt-1 h-8 text-sm" placeholder="e.g. VP of Engineering" value={formData.title}
            onChange={(e) => setFormData((d) => ({ ...d, title: e.target.value }))} required />
        </div>
        <div>
          <Label className="text-xs text-gray-600">Identifier</Label>
          <Input className="mt-1 h-8 text-sm" placeholder="e.g. VP-ENG-001" value={formData.role_identifier}
            onChange={(e) => setFormData((d) => ({ ...d, role_identifier: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs text-gray-600">Level</Label>
          <Input className="mt-1 h-8 text-sm" placeholder="e.g. Director" value={formData.level}
            onChange={(e) => setFormData((d) => ({ ...d, level: e.target.value }))} />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Button type="submit" size="sm" disabled={loading || !formData.title}>Create Role</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}