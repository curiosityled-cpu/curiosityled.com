import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert, Check, ChevronDown, ChevronUp } from "lucide-react";

const FIELD_LABEL = { job_title: "Job title", tier: "Tier", track: "Track" };

const SOURCE_LABEL = { hris: "HRIS", roster: "Roster", manual: "Manual" };

function SourceTag({ source }) {
  if (!source) return null;
  const styles =
    source === "hris"
      ? "bg-[#0202ff]/10 text-[#0202ff] border-[#0202ff]/20"
      : source === "roster"
      ? "bg-gray-100 text-gray-700 border-gray-200"
      : "bg-amber-50 text-amber-700 border-amber-200";
  return (
    <span className={`text-[10px] font-semibold border rounded px-1.5 py-0.5 ${styles}`}>
      {SOURCE_LABEL[source] || source}
    </span>
  );
}

function ConflictRow({ conflict, onResolve, busy }) {
  const field = FIELD_LABEL[conflict.field] || conflict.field;
  return (
    <div className="border border-amber-200 bg-amber-50/60 rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{conflict.user_name}</p>
          <p className="text-[11px] text-muted-foreground truncate">{conflict.user_email}</p>
        </div>
        <span className="text-[10px] font-semibold text-amber-800 bg-white border border-amber-300 rounded px-1.5 py-0.5">
          {field}
        </span>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        <div className="rounded-md border border-border bg-card px-2.5 py-2">
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
              On the profile
            </p>
            <SourceTag source={conflict.current_source} />
          </div>
          <p className="text-xs font-medium text-foreground mt-0.5 break-words">
            {conflict.current_label || "—"}
          </p>
        </div>
        <div className="rounded-md border border-border bg-card px-2.5 py-2">
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
              Incoming
            </p>
            <SourceTag source={conflict.incoming_source} />
          </div>
          <p className="text-xs font-medium text-foreground mt-0.5 break-words">
            {conflict.incoming_label || "—"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-8"
          disabled={busy}
          onClick={() => onResolve(conflict, "kept_current")}
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
          Keep on-profile value
        </Button>
        <Button
          size="sm"
          className="text-xs h-8 bg-[#0202ff] hover:bg-[#0101dd]"
          disabled={busy}
          onClick={() => onResolve(conflict, "took_incoming")}
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
          Take incoming value
        </Button>
      </div>
    </div>
  );
}

/** Unresolved profile disagreements, plus the decisions already made. */
export default function ProfileConflictsCard({ open = [], resolved = [], onResolve, busyId }) {
  const [showResolved, setShowResolved] = useState(false);

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            Profile conflicts
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
            HRIS is authoritative, and where there is no HRIS the latest roster import wins.
            A lower-precedence source that disagrees is recorded here rather than applied quietly.
          </p>
        </div>
        <span
          className={`text-[11px] font-semibold rounded-full px-2 py-0.5 border ${
            open.length > 0
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-gray-50 text-gray-500 border-gray-200"
          }`}
        >
          {open.length} open
        </span>
      </div>

      {open.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic mt-3">
          No disagreements outstanding.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {open.map((c) => (
            <ConflictRow
              key={c.id}
              conflict={c}
              onResolve={onResolve}
              busy={busyId === c.id}
            />
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowResolved((s) => !s)}
            className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            {showResolved ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showResolved ? "Hide" : "Show"} resolved ({resolved.length})
          </button>
          {showResolved && (
            <div className="mt-2 space-y-1.5">
              {resolved.map((c) => (
                <div
                  key={c.id}
                  className="text-[11px] text-muted-foreground border border-border rounded-md px-2.5 py-1.5 flex flex-wrap items-center gap-1.5"
                >
                  <span className="font-medium text-foreground">{c.user_name}</span>
                  <span>· {FIELD_LABEL[c.field] || c.field}</span>
                  <span>
                    · {c.resolution === "took_incoming" ? "took incoming" : "kept on-profile"} value
                  </span>
                  <span className="font-medium text-foreground">{c.resolved_value_label}</span>
                  {c.resolved_by_email && <span>· by {c.resolved_by_email}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}