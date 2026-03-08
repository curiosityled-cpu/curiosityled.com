import React from "react";
import { ClientProvider } from "./ClientContext";
import { CompetencyProvider } from "./CompetencyContext";
import { OrganizationProvider } from "./OrganizationContext";

/**
 * Consolidated context providers wrapper to reduce nesting
 */
export function ContextProviders({ children }) {
  return (
    <ClientProvider>
      <OrganizationProvider>
        <CompetencyProvider>
          {children}
        </CompetencyProvider>
      </OrganizationProvider>
    </ClientProvider>
  );
}