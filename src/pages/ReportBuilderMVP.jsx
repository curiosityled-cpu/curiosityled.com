/**
 * ReportBuilderMVP - renders the full ReportBuilder inside the MVP layout.
 * Wraps in FullAuthProvider so components that use @/components/useAuth work correctly.
 */
import { AuthProvider as FullAuthProvider } from "@/components/useAuth";
import ReportBuilder from "./ReportBuilder";

export default function ReportBuilderMVP() {
  return (
    <FullAuthProvider>
      <ReportBuilder />
    </FullAuthProvider>
  );
}