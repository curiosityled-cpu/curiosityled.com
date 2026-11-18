/**
 * DevelopmentItemDetailDialog — the full details of one learner work item
 * (course, resource, conversation or journey), with the action that opens it.
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { openResource } from "@/lib/openResource";
import { KIND_META } from "@/lib/learning";

const STATUS_LABEL = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  abandoned: "Abandoned",
};

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function Row({ label, children }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide w-24 flex-shrink-0 pt-0.5">
        {label}
      </p>
      <div className="text-xs text-foreground flex-1 min-w-0">{children}</div>
    </div>
  );
}

export default function DevelopmentItemDetailDialog({ item, onClose }) {
  const navigate = useNavigate();
  if (!item) return null;

  const kind = KIND_META[item.kind] || KIND_META.course;
  const percent = Math.min(100, Math.round(item.percent || 0));
  const due = formatDate(item.due_date);

  const handleOpen = async () => {
    if (item.kind === "resource" && item.launch?.resource) {
      const opened = await openResource(item.launch.resource);
      if (!opened) toast.error("This resource has no link or file to open");
      onClose();
      return;
    }
    if (item.launch?.to) {
      navigate(item.launch.to);
      onClose();
      return;
    }
    navigate("/my-development");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${kind.chipClass}`}>
              {kind.label}
            </span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-muted text-muted-foreground border-border">
              {STATUS_LABEL[item.status] || "Not started"}
            </span>
          </div>
          <DialogTitle className="text-base leading-snug">{item.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {item.subtitle && (
            <p className="text-xs text-muted-foreground leading-relaxed">{item.subtitle}</p>
          )}

          {percent > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-medium text-muted-foreground">Progress</p>
                <p className="text-[11px] font-semibold text-foreground">{percent}%</p>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${kind.barClass}`} style={{ width: `${percent}%` }} />
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border divide-y divide-border">
            {item.meta && <Row label="Details">{item.meta}</Row>}
            {due && <Row label="Due">{due}</Row>}
            {item.assignedBy && <Row label="Assigned by">{item.assignedBy}</Row>}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button onClick={handleOpen} className="flex-1">
              {percent > 0 ? kind.cta : kind.ctaNew}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                navigate("/my-development");
                onClose();
              }}
            >
              My Development
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}