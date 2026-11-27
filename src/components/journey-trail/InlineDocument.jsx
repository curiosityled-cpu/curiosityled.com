import React, { useEffect, useState } from "react";
import { ExternalLink, FileText, Loader2 } from "lucide-react";
import { resolveResourceFileUrl } from "@/lib/resourceFile";

/**
 * Reads an attached document inside the trail instead of sending the learner away.
 * PDFs render in place (view-only); other formats offer to open in a new tab.
 */
export default function InlineDocument({ resource }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  const uri = resource?.uploaded_file_uri || resource?.document_url || "";
  const isPdf = /\.pdf(\?|$)/i.test(uri);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    resolveResourceFileUrl(resource)
      .then((resolved) => {
        if (!cancelled) setUrl(resolved);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resource?.id]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-[var(--pf-soft-border)] bg-[var(--pf-panel)] px-4 py-8 text-xs text-[var(--pf-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Opening the document…
      </div>
    );
  }

  if (!url) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--pf-soft-border)] px-4 py-6 text-center text-xs text-[var(--pf-muted)]">
        This document could not be opened. Ask your program team to check the file.
      </p>
    );
  }

  if (!isPdf) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-xl border border-[var(--pf-soft-border)] bg-[var(--pf-panel)] px-3 py-2 text-xs font-medium text-[var(--pf-text)] transition-colors hover:bg-[var(--pf-soft-hover)]"
      >
        <FileText className="h-3.5 w-3.5" />
        Open {resource?.uploaded_file_name || "document"}
        <ExternalLink className="h-3 w-3" />
      </a>
    );
  }

  return (
    <iframe
      src={url}
      title={resource?.title || "Document"}
      className="h-[70vh] w-full rounded-xl border border-[var(--pf-soft-border)] bg-white"
    />
  );
}