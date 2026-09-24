import React from "react";
import { CheckCircle2, Pause, Play, Trash2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_STYLES = {
  designated: "bg-blue-50 text-blue-700",
  active: "bg-green-50 text-green-700",
  paused: "bg-amber-50 text-amber-700",
  removed: "bg-gray-100 text-gray-500",
};

const TRANSITIONS = {
  designated: [{ label: "Activate", icon: CheckCircle2, target: "active" }, { label: "Remove", icon: Trash2, target: "removed" }],
  active: [{ label: "Pause", icon: Pause, target: "paused" }, { label: "Remove", icon: Trash2, target: "removed" }],
  paused: [{ label: "Reactivate", icon: Play, target: "active" }, { label: "Remove", icon: Trash2, target: "removed" }],
  removed: [],
};

/**
 * CriticalRoleRow — one critical role designation with status transition controls.
 * Shows position title, criticality/governance/urgency badges, reason, and
 * lifecycle buttons (activate / pause / reactivate / remove) per the backend
 * transition matrix.
 */
export default function CriticalRoleRow({ criticalRole, positionInfo, canManage, loading, onStatusChange }) {
  const { status, criticality_level, governance_tier, continuity_urgency, designation_reason } = criticalRole;
  const positionTitle = positionInfo?.title || "Position (details unavailable)";
  const positionLabel = positionInfo?.position_identifier ? ` · ${positionInfo.position_identifier}` : "";
  const roleLabel = positionInfo?.role_title ? ` · ${positionInfo.role_title}` : "";
  const actions = TRANSITIONS[status] || [];

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <p className="text-sm font-medium text-gray-900 truncate">{positionTitle}{positionLabel}{roleLabel}</p>
          </div>
          {designation_reason && (
            <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{designation_reason}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[status] || "bg-gray-100 text-gray-500"}`}>{status}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-600">{criticality_level}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-600">{governance_tier}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-600">{continuity_urgency}</span>
          </div>
        </div>
        {canManage && actions.length > 0 && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <Button key={action.target} size="sm" variant="outline"
                  className="h-7 text-xs"
                  onClick={() => onStatusChange(criticalRole.id, action.target)}
                  disabled={loading}
                >
                  <Icon className="w-3.5 h-3.5 mr-1" /> {action.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}