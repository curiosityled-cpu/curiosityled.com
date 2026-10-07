/**
 * ICRosterCSVUpload — bulk-import frontline ICs from a CSV file.
 * Expected columns (header row, case-insensitive):
 *   name, email, team, manager_email, hris_employee_id, preferred_channel
 * Only name + email are required. A web_access_token is generated per row.
 *
 * Lives behind the "Frontline Staff" tab in User Management.
 */
import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Upload, Loader2, AlertCircle, CheckCircle2, FileUp } from "lucide-react";
import { toast } from "sonner";

const HEADERS = ["name", "email", "team", "manager_email", "hris_employee_id", "preferred_channel"];

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return { rows: [], header: [] };
  const splitLine = (line) => {
    const out = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === "," && !inQ) {
        out.push(cur); cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const header = splitLine(lines[0]).map((h) => h.toLowerCase());
  const rows = lines.slice(1).map(splitLine);
  return { rows, header };
}

export default function ICRosterCSVUpload({ open, onClose, onDone, clientId, createdByEmail }) {
  const { user: authUser } = useAuth();
  const cid = clientId || authUser?.data?.client_id || authUser?.client_id;
  const creator = createdByEmail || authUser?.email || "";
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFile = async (file) => {
    setError(null);
    setResult(null);
    setPreview([]);
    if (!file) return;
    setFileName(file.name);
    setParsing(true);
    try {
      const text = await file.text();
      const { rows, header } = parseCSV(text);
      const idx = Object.fromEntries(HEADERS.map((h) => [h, header.indexOf(h)]));
      if (idx.name === -1 || idx.email === -1) {
        setError("CSV must include at least 'name' and 'email' columns.");
        setParsing(false);
        return;
      }
      const mapped = rows
        .map((r) => ({
          name: r[idx.name] || "",
          email: (r[idx.email] || "").toLowerCase().trim(),
          team: idx.team !== -1 ? r[idx.team] || "" : "",
          manager_email: idx.manager_email !== -1 ? (r[idx.manager_email] || "").toLowerCase().trim() : "",
          hris_employee_id: idx.hris_employee_id !== -1 ? r[idx.hris_employee_id] || "" : "",
          preferred_channel: idx.preferred_channel !== -1 ? (r[idx.preferred_channel] || "both").toLowerCase() : "both",
        }))
        .filter((r) => r.name && r.email);
      setPreview(mapped);
      if (mapped.length === 0) setError("No valid rows found (name + email required).");
    } catch (e) {
      setError("Could not read the file: " + (e.message || ""));
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!cid) {
      setError("No client is associated with your account.");
      return;
    }
    if (preview.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      const records = preview.map((r) => ({
        name: r.name,
        email: r.email,
        team: r.team,
        manager_email: r.manager_email,
        hris_employee_id: r.hris_employee_id,
        preferred_channel: ["teams", "email", "both"].includes(r.preferred_channel) ? r.preferred_channel : "both",
        client_id: cid,
        created_by_email: creator,
        source_system: "csv",
        is_active: true,
        check_in_enabled: true,
        web_access_token: crypto.randomUUID(),
      }));
      const created = await base44.entities.ICRoster.bulkCreate(records);
      const count = Array.isArray(created) ? created.length : (created ? 1 : 0);
      setResult({ count, total: records.length });
      toast.success(`Imported ${count} frontline staff`);
      setPreview([]);
      setFileName("");
      if (onDone) onDone();
    } catch (e) {
      setError("Import failed: " + (e.message || ""));
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setPreview([]);
    setFileName("");
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const close = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import frontline staff from CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-dashed border-border p-4 text-center">
            <FileUp className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground mb-2">
              Columns: name, email, team, manager_email, hris_employee_id, preferred_channel (teams/email/both)
            </p>
            <Input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="text-xs"
              disabled={parsing || importing}
            />
            {fileName && (
              <p className="text-xs text-foreground mt-2 truncate">{fileName}</p>
            )}
          </div>

          {preview.length > 0 && (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="bg-muted px-3 py-1.5 text-xs font-medium">
                {preview.length} row{preview.length === 1 ? "" : "s"} ready to import
              </div>
              <div className="max-h-40 overflow-y-auto divide-y divide-border">
                {preview.slice(0, 50).map((r, i) => (
                  <div key={i} className="px-3 py-1.5 text-xs flex justify-between gap-2">
                    <span className="font-medium truncate">{r.name}</span>
                    <span className="text-muted-foreground truncate">{r.email}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result && (
            <div className="flex items-start gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Imported {result.count} of {result.total} frontline staff.</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={close} disabled={importing}>
            {result ? "Done" : "Cancel"}
          </Button>
          <Button
            size="sm"
            onClick={handleImport}
            disabled={importing || preview.length === 0}
            className="bg-[#0202ff] hover:bg-[#0101dd]"
          >
            {importing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-1" />
            )}
            Import {preview.length || ""} 
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}