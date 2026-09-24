import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";
import { Card, CardContent } from "@/components/ui/card";
import {
  Network,
  Repeat,
  Briefcase,
  Users,
  FileCheck,
  Scale,
  ShieldCheck,
  Activity,
  User,
  Lock,
  Building2,
  Sparkles,
} from "lucide-react";
import CyclesView from "@/components/succession/CyclesView";
import RolesView from "@/components/succession/RolesView";
import CandidatesView from "@/components/succession/CandidatesView";
import EvidenceView from "@/components/succession/EvidenceView";
import CalibrationView from "@/components/succession/CalibrationView";

const SUB_VIEWS = [
  { key: "cycles", label: "Cycles", icon: Repeat },
  { key: "roles", label: "Roles & Positions", icon: Briefcase },
  { key: "candidates", label: "Candidates", icon: Users },
  { key: "evidence", label: "Evidence", icon: FileCheck },
  { key: "calibration", label: "Calibration", icon: Scale },
  { key: "governance", label: "Governance", icon: ShieldCheck },
  { key: "monitor", label: "Monitor", icon: Activity },
  { key: "my-succession", label: "My Succession", icon: User },
];

const PHASE_1_VIEWS = ["cycles", "roles", "candidates", "evidence", "calibration"];
const PHASE_0_VIEWS = ["governance", "monitor"];

export default function SuccessionWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get("view") || "cycles";

  const handleViewChange = (key) => {
    setSearchParams({ view: key });
  };

  return (
    <MVPPageLayout
      title="Succession Management"
      subtitle="Frame critical roles, discover successors, calibrate readiness, and manage transitions with human-led governance and strict tenant isolation."
      action={
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
          <Lock className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-xs font-medium text-amber-700">Phase 1 — Development Only (Non-Production)</span>
        </div>
      }
    >
      {/* Sub-nav pills */}
      <div className="flex flex-wrap gap-2">
        {SUB_VIEWS.map((v) => {
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
        {PHASE_1_VIEWS.includes(activeView) ? (
          <Phase1View viewKey={activeView} />
        ) : PHASE_0_VIEWS.includes(activeView) ? (
          <Phase0View viewKey={activeView} />
        ) : (
          <LaterPhaseEmptyState viewKey={activeView} />
        )}
      </div>
    </MVPPageLayout>
  );
}

function Phase1View({ viewKey }) {
  if (viewKey === "cycles") return <CyclesView />;
  if (viewKey === "roles") return <RolesView />;
  if (viewKey === "candidates") return <CandidatesView />;
  if (viewKey === "evidence") return <EvidenceView />;
  if (viewKey === "calibration") return <CalibrationView />;
  return <LaterPhaseEmptyState viewKey={viewKey} />;
}

function Phase0View({ viewKey }) {
  if (viewKey === "governance") {
    return (
      <div className="space-y-5">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
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
                <span className="text-sm font-medium text-amber-800">
                  Disabled pending security testing
                </span>
              </div>
              <p className="text-xs text-amber-700 mt-1.5">
                The grant-request form (reason, ticket, scope, duration, approver) will appear here
                once the feature flag is enabled and security testing passes. Production activation
                requires a separate approval.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#0202ff]/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-[#0202ff]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Partner Aggregate Access</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Partner Business Administrators may request approved aggregate succession metrics
                  for clients in their trusted partner list. Access is aggregate-only, read-only,
                  minimum-group-size suppressed, and audited. No individual drill-down or raw export
                  is available.
                </p>
              </div>
            </div>
            <div className="mt-5 p-4 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-sm text-gray-500">
                Partner aggregate reporting is not yet available — no succession-domain records exist
                in Phase 0. Partner-access validation is active and can be tested via the partner
                validation endpoint.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (viewKey === "monitor") {
    return (
      <Card className="border border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#0202ff]/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-[#0202ff]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Succession Monitoring</h3>
              <p className="text-sm text-gray-500 mt-1">
                Review-due alerts, blueprint-change impacts, new-evidence alerts, and
                aspiration/availability-change alerts will surface here once succession cycles are
                active. Monitoring events are lifecycle events — they do not mutate immutable
                ratified readiness conclusions.
              </p>
            </div>
          </div>
          <div className="mt-5 p-4 rounded-lg bg-gray-50 border border-gray-200">
            <p className="text-sm text-gray-500">
              No monitoring alerts — no succession cycles are active in Phase 0.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <LaterPhaseEmptyState viewKey={viewKey} />;
}

function LaterPhaseEmptyState({ viewKey }) {
  const view = SUB_VIEWS.find((v) => v.key === viewKey) || SUB_VIEWS[0];
  const Icon = view.icon;

  return (
    <Card className="border border-gray-200 border-dashed">
      <CardContent className="p-10">
        <div className="flex flex-col items-center text-center max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <Icon className="w-7 h-7 text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">{view.label} — coming in a later phase</h3>
          <p className="text-sm text-gray-500 mt-1.5">
            The Succession architecture is initialized (Phase 0). Domain features for{" "}
            <span className="font-medium text-gray-700">{view.label}</span> will be built in a
            later phase once the architecture and permissions layer is confirmed.
          </p>
          <div className="flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full bg-[#0202ff]/5 border border-[#0202ff]/15">
            <Network className="w-3.5 h-3.5 text-[#0202ff]" />
            <span className="text-xs font-medium text-[#0202ff]">Phase 0 — Architecture Initialized</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}