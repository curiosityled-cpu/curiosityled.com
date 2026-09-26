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
  ClipboardCheck,
  Target,
  Zap,
  ArrowRightCircle,
  FlaskConical,
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
import EvidenceReviewQueueView from "@/components/succession/EvidenceReviewQueueView";
import ReadinessProposalsView from "@/components/succession/ReadinessProposalsView";
import CalibrationView from "@/components/succession/CalibrationView";
import RatificationQueueView from "@/components/succession/RatificationQueueView";
import DevelopmentPlansView from "@/components/succession/DevelopmentPlansView";
import DevelopmentActionsView from "@/components/succession/DevelopmentActionsView";
import TransitionsView from "@/components/succession/TransitionsView";
import TransitionDetailView from "@/components/succession/TransitionDetailView";
import OperationalMonitorView from "@/components/succession/OperationalMonitorView";
import ReviewQueueView from "@/components/succession/ReviewQueueView";
import DemoDataButton from "@/components/succession/DemoDataButton";
import { useAuth } from "@/components/useAuth";
import { useSuccessionEnabled } from "@/components/succession/useSuccessionEnabled";

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

const PHASE_2B_VIEWS = [
  { key: "evidence-queue", label: "Evidence Review", icon: ClipboardCheck },
];

const PHASE_2C_VIEWS = [
  { key: "readiness-proposals", label: "Readiness Proposals", icon: ClipboardCheck },
  { key: "calibration", label: "Calibration", icon: Users },
  { key: "ratification", label: "Ratification", icon: ShieldCheck },
];

const PHASE_2D_VIEWS = [
  { key: "development-plans", label: "Development Plans", icon: Target },
  { key: "development-actions", label: "Development Actions", icon: Zap },
];

const PHASE_2E_VIEWS = [
  { key: "transitions", label: "Transitions", icon: ArrowRightCircle },
];

const PHASE_2F_VIEWS = [
  { key: "operational-monitor", label: "Operational Monitor", icon: Activity },
  { key: "review-queue", label: "Review Queue", icon: ClipboardCheck },
];

const PHASE_0_VIEWS = [
  { key: "governance", label: "Governance", icon: ShieldCheck },
];

const ALL_VIEWS = [...PHASE_1_VIEWS, ...PHASE_2A_VIEWS, ...PHASE_2B_VIEWS, ...PHASE_2C_VIEWS, ...PHASE_2D_VIEWS, ...PHASE_2E_VIEWS, ...PHASE_2F_VIEWS, ...PHASE_0_VIEWS];

export default function SuccessionWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get("view") || "overview";
  const { user } = useAuth();
  const isDemoTenant = user?.data?.client_id === "demo-acme-corp";
  const { enabled: successionEnabled, loading: successionLoading } = useSuccessionEnabled();

  const handleViewChange = (key) => {
    setSearchParams({ view: key });
  };

  if (successionLoading) {
    return (
      <MVPPageLayout
        title="Succession Management"
        subtitle="Build the organizational and blueprint foundation: cycles, roles, positions, critical roles, blueprints, and effective snapshots."
      >
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-[#0202ff] rounded-full animate-spin"></div>
        </div>
      </MVPPageLayout>
    );
  }

  if (!successionEnabled) {
    return (
      <MVPPageLayout
        title="Succession Management"
        subtitle="Build the organizational and blueprint foundation: cycles, roles, positions, critical roles, blueprints, and effective snapshots."
      >
        <div className="max-w-2xl mx-auto text-center py-16">
          <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
            <Lock className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Succession Management is not activated</h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            This module is disabled for your organization by default. A Super Administrator or Platform Admin
            must activate it in the client settings before it can be used.
          </p>
        </div>
      </MVPPageLayout>
    );
  }

  return (
    <MVPPageLayout
      title="Succession Management"
      subtitle="Build the organizational and blueprint foundation: cycles, roles, positions, critical roles, blueprints, and effective snapshots."
      action={
        <div className="flex items-center gap-3">
          {isDemoTenant && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200">
              <FlaskConical className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">Demo Tenant — Acme Corp</span>
            </div>
          )}
          <DemoDataButton isDemoTenant={isDemoTenant} />
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-medium text-amber-700">Phase 1 — Development Only (Non-Production)</span>
          </div>
        </div>
      }
    >
      {/* Sub-nav pills */}
      <nav aria-label="Succession workspace views" className="flex flex-wrap gap-2">
        {ALL_VIEWS.map((v) => {
          const Icon = v.icon;
          const active = activeView === v.key;
          return (
            <button
              key={v.key}
              onClick={() => handleViewChange(v.key)}
              aria-current={active ? "page" : undefined}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0202ff] ${
                active
                  ? "bg-[#0202ff] text-white border-[#0202ff] shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              {v.label}
            </button>
          );
        })}
      </nav>

      {/* Content area */}
      <section aria-label="Succession workspace content" className="mt-5">
        {renderView(activeView)}
      </section>
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
    case "evidence-queue":
      return <EvidenceReviewQueueView />;
    case "readiness-proposals":
      return <ReadinessProposalsView />;
    case "calibration":
      return <CalibrationView />;
    case "ratification":
      return <RatificationQueueView />;
    case "development-plans":
      return <DevelopmentPlansView />;
    case "development-actions":
      return <DevelopmentActionsView />;
    case "transitions":
      return <TransitionsView />;
    case "transition-detail":
      return <TransitionDetailView />;
    case "operational-monitor":
      return <OperationalMonitorView />;
    case "review-queue":
      return <ReviewQueueView />;
    case "governance":
      return <GovernanceView />;
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