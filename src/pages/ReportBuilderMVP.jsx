/**
 * ReportBuilderMVP - renders the full ReportBuilder inside the MVP layout.
 * Wraps in FullAuthProvider so components that use @/components/useAuth work correctly.
 */
import { AuthProvider as FullAuthProvider } from "@/components/useAuth";
import ReportBuilder from "./ReportBuilder";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";

export default function ReportBuilderMVP() {
  return (
    <MVPPageLayout title="Report Builder" subtitle="Build and customize organizational reports.">
      <FullAuthProvider>
        <ReportBuilder />
      </FullAuthProvider>
    </MVPPageLayout>
  );
}