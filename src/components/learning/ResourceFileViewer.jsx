import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, FileText, Loader2 } from "lucide-react";
import { getResourceFileUri, getResourceMediaKind, resolveResourceFileUrl } from "@/lib/resourceFile";

/**
 * Learner-facing access to a resource's attached file: plays videos inline
 * and opens documents in a new tab. Private files are fetched through a signed URL.
 */
export default function ResourceFileViewer({ resource }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const hasFile = !!getResourceFileUri(resource);
  const kind = getResourceMediaKind(resource);

  if (!hasFile || !kind) return null;

  const handleOpen = async () => {
    setLoading(true);
    setFailed(false);
    try {
      const resolved = await resolveResourceFileUrl(resource);
      if (!resolved) {
        setFailed(true);
        return;
      }
      if (kind === "video") {
        setUrl(resolved);
        setOpen(true);
      } else {
        window.open(resolved, "_blank");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mb-4 p-3 rounded-lg border border-blue-100 bg-blue-50/50 space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] bg-white">
            {kind === "video" ? "Video" : "Document"}
          </Badge>
          <span className="text-xs text-gray-600 truncate flex-1">
            {resource.uploaded_file_name || "Attached file"}
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleOpen}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : kind === "video" ? (
            <Play className="w-4 h-4 mr-2" />
          ) : (
            <FileText className="w-4 h-4 mr-2" />
          )}
          {loading ? "Opening..." : kind === "video" ? "Play video" : "Open document"}
        </Button>
        {failed && <p className="text-xs text-red-600">Couldn't open this file. Please try again.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{resource.title}</DialogTitle>
          </DialogHeader>
          {url && <video src={url} controls autoPlay className="w-full rounded-lg bg-black" />}
        </DialogContent>
      </Dialog>
    </>
  );
}