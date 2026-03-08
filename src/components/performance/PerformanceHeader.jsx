import React from "react";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/common/PageHeader";
import SubNavMenu from "@/components/common/SubNavMenu";

export default function PerformanceHeader({
  headerConfig,
  viewTabs,
  currentView,
  onViewChange,
  onRefresh,
  onExportCSV,
  onExportPDF,
  loading,
  exportingCSV,
  exportingPDF
}) {
  return (
    <PageHeader
      title={headerConfig.title}
      subtitle={headerConfig.subtitle}
      badges={headerConfig.badges}
      onRefresh={onRefresh}
      onExportCSV={onExportCSV}
      onExportPDF={onExportPDF}
      loadingRefresh={loading}
      loadingExportCSV={exportingCSV}
      loadingExportPDF={exportingPDF}
      additionalHeaderContent={
        viewTabs.length > 1 && (
          <SubNavMenu
            items={viewTabs}
            activeId={currentView}
            onItemClick={onViewChange}
          />
        )
      }
    />
  );
}