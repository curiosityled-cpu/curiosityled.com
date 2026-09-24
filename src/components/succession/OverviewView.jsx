import React, { useState, useEffect, useCallback } from "react";
import {
  Repeat,
  Briefcase,
  Building2,
  Shield,
  FileText,
  Camera,
  CheckCircle2,
  Circle,
  Loader2,
} from "lucide-react";
import { useSuccessionApi } from "./useSuccessionApi";
import {
  SuccessionSection,
  SuccessionError,
  SuccessionEmpty,
} from "./SuccessionSection";

/**
 * OverviewView — Phase 1 setup progression and entity counts.
 *
 * Shows: cycle, role, position, critical-role, blueprint and snapshot counts.
 * Does NOT show candidate, evidence, readiness or calibration KPIs.
 */
export default function OverviewView() {
  const { invoke, loading, error, clearError } = useSuccessionApi();
  const [counts, setCounts] = useState({
    cycles: 0,
    roles: 0,
    positions: 0,
    criticalRoles: 0,
    blueprints: 0,
    snapshots: 0,
  });
  const [setupSteps, setSetupSteps] = useState([]);

  const fetchOverview = useCallback(async () => {
    try {
      const [cyclesRes, rolesRes, positionsRes, blueprintsRes, snapshotsRes] =
        await Promise.all([
          invoke("successionListCycles", {}),
          invoke("successionListOrgRoles", {}),
          invoke("successionListOrgPositions", {}),
          invoke("successionListBlueprints", {}),
          invoke("successionListSnapshotIntegrityIncidents", {}),
        ]);

      const cycleCount = cyclesRes?.cycles?.length || 0;
      const roleCount = rolesRes?.org_roles?.length || 0;
      const positionCount = positionsRes?.positions?.length || 0;
      const blueprintCount = blueprintsRes?.blueprints?.length || 0;
      const snapshotCount = snapshotsRes?.incidents?.length || 0;

      setCounts({
        cycles: cycleCount,
        roles: roleCount,
        positions: positionCount,
        criticalRoles: 0,
        blueprints: blueprintCount,
        snapshots: snapshotCount,
      });

      const steps = [
        { label: "Create a succession cycle", done: cycleCount > 0 },
        { label: "Define organizational roles", done: roleCount > 0 },
        { label: "Create positions", done: positionCount > 0 },
        { label: "Designate critical roles", done: false },
        { label: "Draft and approve blueprints", done: blueprintCount > 0 },
        { label: "Generate effective snapshots", done: snapshotCount > 0 },
      ];
      setSetupSteps(steps);
    } catch {
      /* handled by hook */
    }
  }, [invoke]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const completedSteps = setupSteps.filter((s) => s.done).length;

  return (
    <div className="space-y-4">
      <SuccessionError message={error} onDismiss={clearError} />

      <SuccessionSection icon={CheckCircle2} title="Phase 1 Setup Progression">
        {loading && setupSteps.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0202ff] rounded-full transition-all"
                  style={{ width: `${(completedSteps / setupSteps.length) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
                {completedSteps}/{setupSteps.length} steps
              </span>
            </div>
            <div className="space-y-2">
              {setupSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  {step.done ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${step.done ? "text-gray-900" : "text-gray-500"}`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </SuccessionSection>

      <SuccessionSection icon={Building2} title="Entity Counts">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <CountCard icon={Repeat} label="Cycles" value={counts.cycles} />
          <CountCard icon={Briefcase} label="Org Roles" value={counts.roles} />
          <CountCard icon={Building2} label="Positions" value={counts.positions} />
          <CountCard icon={Shield} label="Critical Roles" value={counts.criticalRoles} />
          <CountCard icon={FileText} label="Blueprints" value={counts.blueprints} />
          <CountCard icon={Camera} label="Snapshots" value={counts.snapshots} />
        </div>
      </SuccessionSection>

      <SuccessionSection icon={Shield} title="Phase 1 Scope">
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
          <p className="text-xs text-blue-800">
            Phase 1 covers organizational foundation and blueprint creation only.
            Candidate discovery, evidence collection, calibration, and readiness
            conclusions are separate later-phase concepts and are not included.
          </p>
        </div>
      </SuccessionSection>
    </div>
  );
}

function CountCard({ icon: Icon, label, value }) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-gray-400" />
        <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}