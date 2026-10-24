import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Loader2, FileUp, Check, AlertCircle, Download } from "lucide-react";

/** Minimal CSV reader: quoted values, comma separated, first row is the header. */
function parseCsv(text) {
  const lines = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0]
    .replace(/^\uFEFF/, "")
    .split(",")
    .map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let current = "";
    let inQuotes = false;
    for (const char of lines[i]) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else current += char;
    }
    values.push(current.trim());

    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || "";
    });
    const email = (row.email || "").trim();
    if (!email) continue;
    rows.push({
      email,
      job_title: (row.job_title || row.current_role || row.title || "").trim(),
      tier: (row.tier || "").trim(),
      track: (row.track || "").trim(),
    });
  }
  return rows;
}

const TEMPLATE = `email,job_title,tier,track
jane.doe@company.com,Team Lead,Tier 3,Client-Facing
sam.smith@company.com,Operations Supervisor,Tier 3,Internal
`;

/** Bring in title / tier / track from an HRIS export or a roster upload. */
export default function ProfileFeedImportCard({ onApplied }) {
  const [source, setSource] = useState("roster");
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState(null);

  const readFile = async (file) => {
    if (!file) return;
    setError(null);
    setPreview(null);
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        setError("No rows found. The file needs an email column and a header row.");
        return;
      }
      setRows(parsed);
      setFileName(file.name);
    } catch (e) {
      setError(e.message || "Could not read that file");
    }
  };

  const run = async (dryRun) => {
    setBusy(dryRun ? "preview" : "apply");
    setError(null);
    try {
      const res = await base44.functions.invoke("applyRoleProfiles", {
        source,
        records: rows,
        dry_run: dryRun,
      });
      const data = res?.data || res;
      if (dryRun) {
        setPreview(data);
      } else {
        const s = data?.stats || {};
        toast.success(
          `Updated ${s.people_updated || 0} profile${s.people_updated === 1 ? "" : "s"} · ${
            s.conflicts_open || 0
          } conflict${s.conflicts_open === 1 ? "" : "s"} for review`
        );
        setRows([]);
        setPreview(null);
        setFileName("");
        onApplied?.();
      }
    } catch (e) {
      setError(e.message || "Import failed");
    } finally {
      setBusy("");
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "role_profile_template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
        <Upload className="w-3.5 h-3.5 text-[#0202ff]" />
        Import profile data
      </p>
      <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
        Bring job titles, tiers, and tracks in from an HRIS export or a roster upload. HRIS rows
        take precedence; with no HRIS rows the newest roster import wins.
      </p>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="text-sm h-9 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hris">HRIS export</SelectItem>
            <SelectItem value="roster">Roster upload</SelectItem>
          </SelectContent>
        </Select>

        <input
          id="role-profile-file"
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => readFile(e.target.files?.[0])}
        />
        <label htmlFor="role-profile-file">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium border border-input rounded-md px-3 h-9 cursor-pointer hover:bg-muted/50">
            <FileUp className="w-3.5 h-3.5" />
            {fileName || "Choose CSV"}
          </span>
        </label>

        <Button variant="ghost" size="sm" className="text-xs h-9" onClick={downloadTemplate}>
          <Download className="w-3.5 h-3.5 mr-1" />
          Template
        </Button>

        <div className="flex-1" />

        <Button
          size="sm"
          variant="outline"
          className="text-xs h-9"
          disabled={rows.length === 0 || !!busy}
          onClick={() => run(true)}
        >
          {busy === "preview" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Preview"}
        </Button>
        <Button
          size="sm"
          className="text-xs h-9 bg-[#0202ff] hover:bg-[#0101dd]"
          disabled={rows.length === 0 || !!busy}
          onClick={() => run(false)}
        >
          {busy === "apply" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <Check className="w-3.5 h-3.5 mr-1" />
              Import {rows.length > 0 ? `${rows.length} rows` : ""}
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {preview && (
        <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3 space-y-1.5">
          <p className="text-[11px] font-semibold text-foreground">Preview (nothing saved yet)</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <span>
              <span className="font-semibold text-foreground">{preview.stats?.applied || 0}</span>{" "}
              values would apply
            </span>
            <span>
              <span className="font-semibold text-foreground">{preview.stats?.people_updated || 0}</span>{" "}
              profiles update
            </span>
            <span>
              <span className="font-semibold text-foreground">{preview.stats?.conflicts_open || 0}</span>{" "}
              conflicts to review
            </span>
            <span>
              <span className="font-semibold text-foreground">{preview.unmatched_count || 0}</span>{" "}
              emails not found
            </span>
          </div>
          {preview.unmapped_titles?.length > 0 && (
            <p className="text-[11px] text-amber-700">
              {preview.unmapped_titles.length} title
              {preview.unmapped_titles.length === 1 ? "" : "s"} in this file still have no tier or
              track mapping.
            </p>
          )}
        </div>
      )}
    </div>
  );
}