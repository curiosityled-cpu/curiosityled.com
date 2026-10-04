import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Download, Upload, FileSpreadsheet, Code, Server, CheckCircle2,
  AlertCircle, ArrowRight, Eye, Play,
} from "lucide-react";
import { toast } from "sonner";

const PUBLISHED_URL = "https://curiosity-led.base44.app";

export default function IntegrationTab({ user }) {
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState(null);
  const [applying, setApplying] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const fileInputRef = useRef(null);

  const handleDownloadTemplate = async () => {
    try {
      const res = await base44.functions.invoke("importPerformanceData", { mode: "template" });
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "performance_import_template.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Template downloaded");
    } catch (err) {
      toast.error("Failed to download template");
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvText(ev.target.result);
      setFileName(file.name);
      setPreview(null);
    };
    reader.readAsText(file);
  };

  const handlePreview = async () => {
    if (!csvText) return;
    setPreviewing(true);
    try {
      const res = await base44.functions.invoke("importPerformanceData", {
        mode: "preview",
        csv_text: csvText,
      });
      setPreview(res.data);
    } catch (err) {
      toast.error("Preview failed: " + (err.response?.data?.error || err.message));
    } finally {
      setPreviewing(false);
    }
  };

  const handleApply = async () => {
    if (!csvText) return;
    setApplying(true);
    try {
      const res = await base44.functions.invoke("importPerformanceData", {
        mode: "apply",
        csv_text: csvText,
      });
      toast.success(`Import complete: ${res.data?.employees_processed} employees, ${res.data?.goals_created + res.data?.goals_updated} goals, ${res.data?.kpis_created + res.data?.kpis_updated} KPIs`);
      setPreview(null);
      setCsvText("");
      setFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      toast.error("Import failed: " + (err.response?.data?.error || err.message));
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* CSV Import Section */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">CSV Import</h3>
        <Card className="border border-gray-100 shadow-sm rounded-xl">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center gap-3">
              <Button onClick={handleDownloadTemplate} variant="outline" className="gap-1.5">
                <Download className="w-4 h-4" /> Download Template
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="gap-1.5"
              >
                <Upload className="w-4 h-4" /> Upload CSV
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            {fileName && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted">
                <FileSpreadsheet className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">{fileName}</span>
                <Badge variant="outline" className="text-[10px] ml-auto">{csvText.split("\n").filter(r => r.trim()).length - 1} rows</Badge>
              </div>
            )}

            {csvText && (
              <div className="flex gap-2">
                <Button onClick={handlePreview} disabled={previewing} variant="outline" className="gap-1.5">
                  {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                  Dry-Run Preview
                </Button>
                {preview && (
                  <Button onClick={handleApply} disabled={applying} className="gap-1.5 bg-[#0202ff] hover:bg-[#0101dd] text-white">
                    {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Apply Import
                  </Button>
                )}
              </div>
            )}

            {/* Preview results */}
            {preview && (
              <div className="space-y-3">
                {/* Summary */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Employees", value: preview.employees_processed, color: "#0202ff" },
                    { label: "Goals (new)", value: preview.goals_created, color: "#00C875" },
                    { label: "Goals (updated)", value: preview.goals_updated, color: "#FFCB00" },
                    { label: "Errors", value: preview.errors.length, color: preview.errors.length > 0 ? "#E2445C" : "#00C875" },
                  ].map(s => (
                    <div key={s.label} className="text-center p-2.5 rounded-xl border border-gray-100 bg-card">
                      <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-[10px] text-gray-500">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Row results */}
                <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-100">
                  {preview.row_results.slice(0, 50).map((r, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 px-3 py-2 border-b border-gray-50 ${r.action === "error" ? "bg-red-50" : ""}`}
                    >
                      <span className="text-[10px] text-gray-400 w-8">#{r.row}</span>
                      <span className="text-xs text-gray-600 flex-1 truncate">{r.email}</span>
                      <span className="text-[10px] text-gray-500 truncate max-w-xs">{r.action}</span>
                      {r.action === "error" && <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />}
                      {r.action !== "error" && <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />}
                    </div>
                  ))}
                </div>

                {preview.errors.length > 0 && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                    <p className="text-xs font-medium text-red-700 mb-1">{preview.errors.length} error(s)</p>
                    {preview.errors.slice(0, 5).map((e, i) => (
                      <p key={i} className="text-[10px] text-red-600">Row {e.row}: {e.email} — {e.error}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* API Sync Section */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">API Sync</h3>
        <Card className="border border-gray-100 shadow-sm rounded-xl">
          <CardContent className="p-3 space-y-3">
            <p className="text-sm text-gray-600">
              Push performance data programmatically from your HRIS or scheduled job. Send a POST request with your API key.
            </p>
            <div className="p-3 rounded-xl bg-muted font-mono text-xs">
              <div className="text-gray-500 mb-1">Endpoint:</div>
              <div className="text-gray-900 break-all">{PUBLISHED_URL}/functions/syncPerformanceData</div>
            </div>
            <div className="p-3 rounded-xl bg-muted font-mono text-xs">
              <div className="text-gray-500 mb-1">Headers:</div>
              <div className="text-gray-900">Authorization: Bearer YOUR_API_KEY</div>
              <div className="text-gray-900">Content-Type: application/json</div>
            </div>
            <div className="p-3 rounded-xl bg-muted font-mono text-xs">
              <div className="text-gray-500 mb-1">Payload:</div>
              <pre className="text-gray-900 whitespace-pre-wrap">{`{
  "client_id": "your-tenant-id",
  "employees": [
    {
      "employee_email": "jane@company.com",
      "goal_title": "Close $500K",
      "goal_actual": "320000",
      "kpi_name": "Win Rate",
      "kpi_value": "68"
    }
  ]
}`}</pre>
            </div>
            <p className="text-xs text-gray-400">
              Your API key is configured in the app's Secrets settings. Contact your admin to get the key.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* SFTP Section */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">SFTP Integration</h3>
        <Card className="border border-gray-100 shadow-sm rounded-xl">
          <CardContent className="p-3 space-y-3">
            <p className="text-sm text-gray-600">
              For SFTP-based sync, set up a scheduled job on your infrastructure that downloads CSV files from your SFTP server and pushes them to our endpoint.
            </p>
            <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200">
              <ArrowRight className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-700">
                <p className="font-medium mb-1">How it works:</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Your cron job downloads the CSV from your SFTP server</li>
                  <li>POST the CSV content to <code className="text-blue-800">{PUBLISHED_URL}/functions/sftpPullPerformanceData</code></li>
                  <li>Include your API key in the Authorization header</li>
                  <li>Include <code className="text-blue-800">client_id</code> and <code className="text-blue-800">csv_text</code> in the JSON body</li>
                </ol>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-muted font-mono text-xs">
              <div className="text-gray-500 mb-1">Example cron + curl:</div>
              <pre className="text-gray-900 whitespace-pre-wrap">{`0 2 * * * curl -X POST \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d "{\\"client_id\\": \\"your-tenant\\", \\"csv_text\\": \\"$(cat /sftp/data.csv)\\"}" \\
  ${PUBLISHED_URL}/functions/sftpPullPerformanceData`}</pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}