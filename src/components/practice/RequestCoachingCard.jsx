import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LifeBuoy, ChevronRight } from "lucide-react";
import RequestSubmissionForm from "@/components/requests/RequestSubmissionForm";

export default function RequestCoachingCard({ showHeader = true }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={showHeader ? "space-y-3" : "h-full"}>
      {showHeader && (
        <div className="px-1 pt-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Request Support</p>
          <p className="text-xs text-muted-foreground mt-0.5">Need hands-on support? Submit a formal request for a coaching engagement.</p>
        </div>
      )}

      <button
        onClick={() => setOpen(true)}
        className="w-full h-full flex items-center gap-4 p-4 text-left rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all active:scale-[0.99] group"
      >
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-[#0202ff]/10">
          <LifeBuoy className="w-5 h-5 text-[#0202ff]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-card-foreground">Request Support</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">Submit a formal request for 1:1 coaching, team facilitation, or a development engagement.</p>
        </div>
        <ChevronRight className="w-4 h-4 flex-shrink-0 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Support</DialogTitle>
          </DialogHeader>
          <RequestSubmissionForm
            defaultRequestType="coaching_support"
            onSuccess={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}