import React from "react";
import { Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/components/useAuth";

/**
 * SuperAdminSection — defense-in-depth wrapper for org-settings sections.
 * Renders a locked alert if the current user is not a Super Administrator,
 * even if the surrounding tab gate is bypassed. Keeps section components
 * reusable without leaking editable org controls to lower-level admins.
 */
export default function SuperAdminSection({ children, label = "this section" }) {
  const { isSuperAdmin } = useAuth();

  if (!isSuperAdmin) {
    return (
      <Alert>
        <Lock className="w-4 h-4" />
        <AlertDescription>
          {label.charAt(0).toUpperCase() + label.slice(1)} is only available to Super Administrators.
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}