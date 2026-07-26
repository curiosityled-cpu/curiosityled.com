// Diagnostic Config Context — provides variant config to all diagnostic stages
import React, { createContext, useContext } from "react";
import { getConfig } from "@/lib/diagnostic/config";

const DiagnosticConfigContext = createContext(null);

export function DiagnosticConfigProvider({ variant = "general", children }) {
  const config = getConfig(variant);
  return (
    <DiagnosticConfigContext.Provider value={config}>
      {children}
    </DiagnosticConfigContext.Provider>
  );
}

export function useDiagnosticConfig() {
  const config = useContext(DiagnosticConfigContext);
  if (!config) {
    throw new Error("useDiagnosticConfig must be used within a DiagnosticConfigProvider");
  }
  return config;
}