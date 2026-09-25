import React from "react";
import { useSearchParams } from "react-router-dom";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";
import {
  LayoutDashboard,
  Repeat,
  Briefcase,
  Building2,
  Shield,
  FileText,
  Camera,
  ShieldCheck,
  Activity,
  Lock,
  Users,
  UserCheck,
} from "lucide-react";
import OverviewView from "@/components/succession/OverviewView";
import CyclesView from "@/components/succession/CyclesView";
import RolesView from "@/components/succession/RolesView";
import PositionsView from "@/components/succession/PositionsView";
import CriticalRolesView from "@/components/succession/CriticalRolesView";
import BlueprintsView from "@/components/succession/BlueprintsView";
import SnapshotsView from "@/components/succession/SnapshotsView";
import TalentPoolsView from "@/components/succession/TalentPoolsView";
import CandidatesView from "@/components/succession/CandidatesView";

const PHASE_1_VIEWS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "cycles", label: "Succession Cycles", icon: Repeat },
  { key: "roles", label: "Organizational Roles", icon: Briefcase },
  { key: "positions", label: "Organizational Positions", icon: Building2 },
  { key: "critical-roles", label: "Critical Roles", icon: Shield },
  { key: "blueprints", label: "Role Success Blueprints", icon: FileText },
  { key: "snapshots", label: "Effective Snapshots", icon: Camera },
];

const PHASE_2A_VIEWS = [
  { key: "talent-pools", label: "Talent Pools", icon: Users },
  { key: "candidates", label: "Candidates", icon: UserCheck },
];

const PHASE_0_VIEWS = [
  { key: "governance", label: "Governance", icon: ShieldCheck },
  { key: "monitor", label: "Monitor", icon: Activity },
];

const ALL_VIEWS = [...PHASE_1_VIEWS, ...PHASE_2A_VIEWS, ...PHASE_0_VIEWS];

export default function SuccessionWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get("view") || "overview";

  const handleViewChange = (key) => {
    setSearchParams({ view: key });
  };

  return (
    <MVPPageLayout
      title="Succession Management"
      subtitle="Build the organizational and blueprint foundation: cycles, roles, positions, critical roles, blueprints, and effective snapshots."
      action={
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
          <Lock className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-xs font-medium text-amber-700">Phase 1 — Development Only (Non-Production)</span>
        </div>
      }
    >
      {/* Sub-nav pills */}
      <div className="flex flex-wrap gap-2">
        {ALL_VIEWS.map((v) => {
          const Icon = v.icon;
          const active = activeView === v.key;
          return (
            <button
              key={v.key}
              onClick={() => handleViewChange(v.key)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors ${
                active
                  ? "bg-[#0202ff] text-white border-[#0202ff] shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {v.label}
            </button>
          );
        })}
      </div>

      {/* Content area */}
      <div className="mt-5">
        {renderView(activeView)}
      </div>
    </MVPPageLayout>
  );
}

function renderView(viewKey) {
  switch (viewKey) {
    case "overview":
      return <OverviewView />;
    case "cycles":
      return <CyclesView />;
    case "roles":
      return <RolesView />;
    case "positions":
      return <PositionsView />;
    case "critical-roles":
      return <CriticalRolesView />;
    case "blueprints":
      return <BlueprintsView />;
    case "snapshots":
      return <SnapshotsView />;
    case "talent-pools":
      return <TalentPoolsView />;
    case "candidates":
      return <CandidatesView />;
    case "governance":
      return <GovernanceView />;
    case "monitor":
      return <MonitorView />;
    default:
      return <OverviewView />;
  }
}

function GovernanceView() {
  return (
    <div className="space-y-5">
      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#0202ff]/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-[#0202ff]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Cross-Tenant Access Governance</h3>
            <p className="text-sm text-gray-500 mt-1">
              Cross-tenant succession access is controlled by a server-side feature flag and a
              control-plane grant workflow. No ordinary entity CRUD is exposed. The grant
              workflow and dedicated read function must pass security testing before this path
              can be activated.
            </p>
          </div>
        </div>
        <div className="mt-5 p-4 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">Disabled pending security testing</span>
          </div>
          <p className="text-xs text-amber-700 mt-1.5">
            The grant-request form will appear here once the feature flag is enabled and security
            testing passes. Production activation requires a separate approval.
          </p>
        </div>
      </div>
    </div>
  );
}

function MonitorView() {
  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#0202ff]/10 flex items-center justify-center">
          <Activity className="w-5 h-5 text-[#0202ff]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">Succession Monitoring</h3>
          <p className="text-sm text-gray-500 mt-1">
            Review-due alerts, blueprint-change impacts, and aspiration/availability-change alerts
            will surface here once succession cycles are active. Monitoring events are lifecycle
            events — they do not mutate immutable ratified readiness conclusions.
          </p>
        </div>
      </div>
      <div className="mt-5 p-4 rounded-lg bg-gray-50 border border-gray-200">
        <p className="text-sm text-gray-500">No monitoring alerts — no succession cycles are active yet.</p>
      </div>
    </div>
  );
}