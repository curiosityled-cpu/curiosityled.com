/**
 * MVPAIInsights — renders the full AIInsightsDashboard inside MVPLayout.
 * Wrapped in FullAuthProvider so components using @/components/useAuth work.
 */
import { AuthProvider as FullAuthProvider } from "@/components/useAuth";
import { ContextProviders } from "@/components/contexts/ContextProviders";
import AIInsightsDashboard from "./AIInsightsDashboard";

export default function MVPAIInsights() {
  return (
    <FullAuthProvider>
      <ContextProviders>
        <AIInsightsDashboard />
      </ContextProviders>
    </FullAuthProvider>
  );
}