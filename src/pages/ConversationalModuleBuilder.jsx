import React from "react";
import { useLocation } from "react-router-dom";
import ConversationalModuleBuilderForm from "@/components/dev-manager/ConversationalModuleBuilderForm";

/**
 * ConversationalModuleBuilder — standalone page wrapper around the shared
 * ConversationalModuleBuilderForm. Kept for backward-compatible direct URLs;
 * the in-app library now opens the builder as a modal popup instead.
 */
export default function ConversationalModuleBuilder() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const moduleId = searchParams.get("moduleId");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <ConversationalModuleBuilderForm moduleId={moduleId} showChrome onSaved={() => { window.location.href = "/DevelopmentManager"; }} />
      </div>
    </div>
  );
}