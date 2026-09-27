import React from "react";
import { Lock } from "lucide-react";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";
import SuccessionWorkspaceContent from "@/components/succession/SuccessionWorkspaceContent";
import { useSuccessionEnabled } from "@/components/succession/useSuccessionEnabled";

export default function SuccessionWorkspace() {
  const { enabled: successionEnabled, loading: successionLoading } = useSuccessionEnabled();

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
    >
      <SuccessionWorkspaceContent />
    </MVPPageLayout>
  );
}