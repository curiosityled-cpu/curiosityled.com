/**
 * ReportBuilderMVP - renders the full ReportBuilder inside the MVP layout
 * (no layout wrapper needed since MVPLayout wraps this route)
 */
import ReportBuilder from "./ReportBuilder";

export default function ReportBuilderMVP() {
  return <ReportBuilder />;
}