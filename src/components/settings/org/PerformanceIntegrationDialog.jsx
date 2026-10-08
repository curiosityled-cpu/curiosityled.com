import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import IntegrationTab from "@/components/performance-mgmt/IntegrationTab";
import { useAuth } from "@/components/useAuth";

/**
 * Pop-up that surfaces the Performance Manager "Integration" tab content
 * (CSV import, API sync, SFTP) inside Settings > Organization > Integrations.
 * Opened when the "Performance Data Sync" toggle is switched on.
 */
export default function PerformanceIntegrationDialog({ open, onOpenChange }) {
  const { user } = useAuth();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Performance Data Integration</DialogTitle>
          <DialogDescription>
            Import or push performance data (goals, KPIs) from your HRIS or scheduled job.
          </DialogDescription>
        </DialogHeader>
        <IntegrationTab user={user} />
      </DialogContent>
    </Dialog>
  );
}