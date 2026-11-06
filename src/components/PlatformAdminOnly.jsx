import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { AccessDeniedPage } from "@/components/AccessDeniedPage";

/**
 * Gate for surfaces only the Platform Admin role may open.
 * Everyone else — including other administrator roles — sees the access-denied page.
 */
export default function PlatformAdminOnly({ children }) {
  const { user, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  const appRole = user?.app_role || user?.data?.app_role || null;
  if (appRole !== "Platform Admin") {
    return <AccessDeniedPage />;
  }

  return <>{children}</>;
}