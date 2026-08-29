import React from "react";
import { AuthProvider } from "@/components/useAuth";
import { ClientProvider } from "./ClientContext";
import { CompetencyProvider } from "./CompetencyContext";
import { OrganizationProvider } from "./OrganizationContext";

/**
 * Consolidated context providers wrapper to reduce nesting.
 * Includes AuthProvider so ClientProvider/OrganizationProvider/CompetencyProvider
 * (which all call useAuth from @/components/useAuth) always have the context.
 */
export function ContextProviders({ children }) {
  return (
    <AuthProvider>
      <ClientProvider>
        <OrganizationProvider>
          <CompetencyProvider>
            {children}
          </CompetencyProvider>
        </OrganizationProvider>
      </ClientProvider>
    </AuthProvider>
  );
}