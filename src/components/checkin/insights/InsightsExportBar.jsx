import React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, FileText, Loader2 } from "lucide-react";

/** CSV/PDF export actions plus the choice of what the export carries. */
export default function InsightsExportBar({
  selectedCount = 0,
  options,
  onOptionChange,
  onExportCsv,
  onExportPdf,
  busy = "",
}) {
  const disabled = selectedCount === 0 || !!busy;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onExportCsv} disabled={disabled}>
          {busy === "csv"
            ? <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            : <Download className="w-3 h-3 mr-1" />}
          Export CSV
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onExportPdf} disabled={disabled}>
          {busy === "pdf"
            ? <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            : <FileText className="w-3 h-3 mr-1" />}
          Export PDF
        </Button>
      </div>

      <label className="flex items-center gap-1.5 text-[11px] text-gray-600 cursor-pointer">
        <Checkbox
          checked={options.sessions}
          onCheckedChange={(checked) => onOptionChange("sessions", checked === true)}
          className="h-3.5 w-3.5"
        />
        Individual sessions
      </label>
      <label className="flex items-center gap-1.5 text-[11px] text-gray-600 cursor-pointer">
        <Checkbox
          checked={options.summary}
          onCheckedChange={(checked) => onOptionChange("summary", checked === true)}
          className="h-3.5 w-3.5"
        />
        Team summary
      </label>
    </div>
  );
}