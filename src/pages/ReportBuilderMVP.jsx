/**
 * ReportBuilderMVP - MVP-formatted wrapper for ReportBuilder.
 * Ensures proper layout and context wrapping for the report builder interface.
 */
import { AuthProvider as FullAuthProvider } from "@/components/useAuth";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";
import ReportBuilder from "./ReportBuilder";

export default function ReportBuilderMVP() {
  return (
    <MVPPageLayout title="Report Builder" subtitle="Create and manage analytics reports">
      <FullAuthProvider>
        <ReportBuilder />
      </FullAuthProvider>
    </MVPPageLayout>
  );
}