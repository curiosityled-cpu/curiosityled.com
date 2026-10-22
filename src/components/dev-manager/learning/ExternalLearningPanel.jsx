import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Plug } from "lucide-react";

const INGEST_ENDPOINT = "https://curiosity-led.base44.app/functions/importExternalLearning";

const COLUMNS = [
  ["learner email", "required — matched to the learner"],
  ["course title", "required"],
  ["provider", "the other LMS, e.g. Workday Learning"],
  ["completion date", "YYYY-MM-DD"],
  ["score", "optional"],
  ["duration minutes", "optional"],
  ["external id", "optional — prevents duplicate imports"],
];

export default function ExternalLearningPanel({ records, total }) {
  const [showSetup, setShowSetup] = useState(false);

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Learning from other systems</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Completions recorded in another LMS or HRIS, brought in by API or SFTP file push.
              {total > 0 ? ` ${total} captured so far.` : ""}
            </p>
          </div>
          <Badge variant="outline" className="shrink-0">
            <Plug className="w-3 h-3 mr-1" />
            {total} record{total === 1 ? "" : "s"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nothing imported yet. Learning completed elsewhere will appear here once a sync runs.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {records.map((record) => (
              <li key={record.id} className="py-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{record.course_title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {record.learner_name || record.user_email}
                    {record.provider ? ` · ${record.provider}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">
                    {record.completed_at || "No date"}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {record.source_system || "api"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between text-muted-foreground"
          onClick={() => setShowSetup((open) => !open)}
        >
          How to link your LMS
          {showSetup ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Button>

        {showSetup && (
          <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-3 text-xs">
            <div>
              <p className="font-medium text-foreground mb-1">API or SFTP file push</p>
              <p className="text-muted-foreground">
                Send a CSV of completions to this endpoint, authenticated with your existing sync
                key. A scheduled export from your LMS, a cron job, or an SFTP-to-HTTP gateway all
                work the same way.
              </p>
            </div>
            <code className="block bg-background border border-border rounded px-2 py-1.5 break-all">
              POST {INGEST_ENDPOINT}
            </code>
            <div>
              <p className="font-medium text-foreground mb-1">Columns</p>
              <ul className="space-y-0.5">
                {COLUMNS.map(([name, note]) => (
                  <li key={name} className="text-muted-foreground">
                    <span className="text-foreground font-medium">{name}</span> — {note}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-muted-foreground">
              Repeat imports are safe: a row is skipped when its external id has already been
              imported.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}