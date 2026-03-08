import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format } from "date-fns";

export default function SecurityAuditExport({ userEmail, userName }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [includeLoginHistory, setIncludeLoginHistory] = useState(true);
  const [includeActivityLog, setIncludeActivityLog] = useState(true);

  const handleExport = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('exportSecurityAuditLog', {
        userEmail,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        includeLoginHistory,
        includeActivityLog
      });

      if (response.data?.success) {
        const auditData = response.data.audit_data;
        
        // Create JSON file
        const blob = new Blob([JSON.stringify(auditData, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `security-audit-${userEmail}-${format(new Date(), 'yyyy-MM-dd')}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();

        toast.success('Security audit exported successfully');
        setOpen(false);
      } else {
        toast.error(response.data?.error || 'Failed to export audit log');
      }
    } catch (error) {
      console.error('Error exporting audit:', error);
      toast.error('Failed to export audit log');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Download className="w-4 h-4" />
        Export Security Audit
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Security Audit</DialogTitle>
            <DialogDescription>
              Generate a comprehensive security audit report for {userName || userEmail}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Start Date (Optional)</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="end_date">End Date (Optional)</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include_login"
                  checked={includeLoginHistory}
                  onCheckedChange={setIncludeLoginHistory}
                />
                <Label htmlFor="include_login" className="cursor-pointer">
                  Include login history
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include_activity"
                  checked={includeActivityLog}
                  onCheckedChange={setIncludeActivityLog}
                />
                <Label htmlFor="include_activity" className="cursor-pointer">
                  Include activity log
                </Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}