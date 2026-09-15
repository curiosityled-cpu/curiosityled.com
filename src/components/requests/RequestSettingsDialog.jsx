import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import CoachingRequestAllowlistSettings from "@/components/requests/CoachingRequestAllowlistSettings";
import IntakeSettingsPanel from "@/components/requests/IntakeSettingsPanel";

export default function RequestSettingsDialog({ open, onOpenChange, clientId }) {
  const [tab, setTab] = useState("intake");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Settings</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 bg-muted rounded-lg p-1 mb-4">
          <button
            onClick={() => setTab("intake")}
            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${tab === "intake" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Intake Conversation
          </button>
          <button
            onClick={() => setTab("allowlist")}
            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${tab === "allowlist" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Submission Allowlist
          </button>
        </div>

        {tab === "intake" ? (
          <IntakeSettingsPanel clientId={clientId} onSaved={() => onOpenChange(false)} />
        ) : (
          <CoachingRequestAllowlistSettings clientId={clientId} embedded />
        )}
      </DialogContent>
    </Dialog>
  );
}