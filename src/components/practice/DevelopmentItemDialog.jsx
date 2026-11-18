import React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { KIND_META, dueMeta } from "@/lib/learning";
import { openResource } from "@/lib/openResource";

const STATUS_LABEL = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  dropped: "Dropped",
};

/** Full details for one development item, with the action that starts it. */
export default function DevelopmentItemDialog({ item, onClose }) {
  const navigate = useNavigate();
  const open = Boolean(item);
  const meta = (item && KIND_META[item.kind]) || KIND_META.resource;
  const due = item ? dueMeta(item.due_date) : null;
  const percent = Math.round(item?.percent || 0);

  const launch = async () => {
    if (!item) return;
    if (item.launch?.to) {
      onClose();
      navigate(item.launch.to);
      return;
    }
    if (item.launch?.resource) {
      const opened = await openResource(item.launch.resource);
      if (!opened) toast.info("This resource has no link or file attached yet.");
      else onClose();
      return;
    }
    onClose();
    navigate("/my-development");
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        {item && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${meta.chipClass}`}>
                  {meta.label}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-muted text-muted-foreground">
                  {STATUS_LABEL[item.status] || "Not started"}
                </span>
                {due && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-muted text-muted-foreground">
                    {due.label}
                  </span>
                )}
              </div>
              <DialogTitle className="text-lg leading-snug">{item.title}</DialogTitle>
              {item.subtitle && (
                <DialogDescription className="mt-1 leading-relaxed">{item.subtitle}</DialogDescription>
              )}
            </DialogHeader>

            <div className="space-y-3 text-sm">
              {item.meta && (
                <p className="text-xs text-muted-foreground">{item.meta}</p>
              )}

              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Progress</span>
                  <span className="font-semibold text-foreground">{percent}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${meta.barClass}`}
                    style={{ width: `${Math.min(100, percent)}%` }}
                  />
                </div>
              </div>

              {(item.due_date || item.assignedBy) && (
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  {item.due_date && (
                    <div>
                      <dt className="text-muted-foreground">Due</dt>
                      <dd className="font-medium text-foreground">
                        {new Date(item.due_date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </dd>
                    </div>
                  )}
                  {item.assignedBy && (
                    <div>
                      <dt className="text-muted-foreground">Assigned by</dt>
                      <dd className="font-medium text-foreground truncate">{item.assignedBy}</dd>
                    </div>
                  )}
                </dl>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button onClick={launch}>{meta.cta}</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}