import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, CheckCircle, AlertTriangle, Loader2, FileText, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Editable fields via CSV (read-only fields like full_name, email are import-only for matching)
const EDITABLE_FIELDS = ['department', 'sector', 'manager_email', 'current_role', 'display_name'];
const CSV_HEADERS = ['email', 'full_name', ...EDITABLE_FIELDS];

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    // Handle quoted fields with commas
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes;
      } else if (line[i] === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += line[i];
      }
    }
    values.push(current.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  }).filter(row => row.email);
}

export default function BulkUserEditCSV({ users, onSuccess, onClose }) {
  const [step, setStep] = useState('idle'); // idle | preview | processing | done
  const [parsedRows, setParsedRows] = useState([]);
  const [results, setResults] = useState({ updated: 0, failed: [], skipped: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const handleExportTemplate = () => {
    const rows = users.map(u => ({
      email: u.email,
      full_name: u.full_name || '',
      department: u.department || '',
      sector: u.sector || '',
      manager_email: u.manager_email || '',
      current_role: u.current_role || '',
      display_name: u.display_name || '',
    }));

    const csvContent = [
      CSV_HEADERS.join(','),
      ...rows.map(row =>
        CSV_HEADERS.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-bulk-edit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Template exported — edit and re-import to update users');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const rows = parseCSV(evt.target.result);
      // Validate against existing users
      const enriched = rows.map(row => {
        const match = users.find(u => u.email?.toLowerCase() === row.email?.toLowerCase());
        return { ...row, _matched: !!match, _userId: match?.id };
      });
      setParsedRows(enriched);
      setStep('preview');
    };
    reader.readAsText(file);
    // Reset file input so same file can be re-imported
    e.target.value = '';
  };

  const handleImport = async () => {
    setIsProcessing(true);
    setStep('processing');
    let updated = 0;
    const failed = [];
    let skipped = 0;

    const matched = parsedRows.filter(r => r._matched);

    for (const row of matched) {
      try {
        const updateData = {};
        EDITABLE_FIELDS.forEach(field => {
          if (row[field] !== undefined && row[field] !== '') {
            updateData[field] = row[field];
          }
        });

        if (Object.keys(updateData).length === 0) {
          skipped++;
          continue;
        }

        const response = await base44.functions.invoke('updateUserById', {
          userId: row._userId,
          userData: updateData
        });

        if (response.data?.success) {
          updated++;
        } else {
          failed.push({ email: row.email, error: response.data?.error || 'Unknown error' });
        }
      } catch (err) {
        failed.push({ email: row.email, error: err.message });
      }
    }

    setResults({ updated, failed, skipped });
    setStep('done');
    setIsProcessing(false);

    if (updated > 0) {
      onSuccess?.();
    }
  };

  const matchedCount = parsedRows.filter(r => r._matched).length;
  const unmatchedCount = parsedRows.filter(r => !r._matched).length;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Bulk Edit Users via CSV
          </DialogTitle>
        </DialogHeader>

        {step === 'idle' && (
          <div className="space-y-6">
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
              <p className="font-medium mb-1">How it works:</p>
              <ol className="list-decimal ml-4 space-y-1">
                <li>Export the current user list as a CSV template</li>
                <li>Edit the editable fields in any spreadsheet app</li>
                <li>Re-import the CSV — users are matched by email</li>
              </ol>
              <p className="mt-2 text-xs text-blue-600">
                Editable fields: <span className="font-mono">{EDITABLE_FIELDS.join(', ')}</span>
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button onClick={handleExportTemplate} variant="outline" className="w-full gap-2">
                <Download className="w-4 h-4" />
                Export User List as CSV Template
              </Button>
              <Button onClick={() => fileInputRef.current?.click()} className="w-full gap-2 bg-blue-600 hover:bg-blue-700">
                <Upload className="w-4 h-4" />
                Import Edited CSV
              </Button>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <Badge className="bg-green-100 text-green-800">{matchedCount} users matched</Badge>
              {unmatchedCount > 0 && <Badge className="bg-yellow-100 text-yellow-800">{unmatchedCount} not found (will be skipped)</Badge>}
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-700">Email</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-700">Department</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, i) => (
                      <tr key={i} className={`border-t ${!row._matched ? 'bg-yellow-50' : ''}`}>
                        <td className="px-3 py-2 text-gray-800">{row.email}</td>
                        <td className="px-3 py-2 text-gray-600">{row.department || '—'}</td>
                        <td className="px-3 py-2">
                          {row._matched
                            ? <Badge className="bg-green-100 text-green-700">Matched</Badge>
                            : <Badge className="bg-yellow-100 text-yellow-700">Not found</Badge>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('idle')} className="flex-1">Back</Button>
              <Button
                onClick={handleImport}
                disabled={matchedCount === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Update {matchedCount} Users
              </Button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="text-center py-10">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-600">Updating users...</p>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              {results.updated > 0 && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800">
                  <CheckCircle className="w-5 h-5" />
                  <span>{results.updated} users updated successfully</span>
                </div>
              )}
              {results.skipped > 0 && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                  <span>{results.skipped} rows skipped (no changes detected)</span>
                </div>
              )}
              {results.failed.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800 mb-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>{results.failed.length} failed</span>
                  </div>
                  <ul className="text-xs text-red-700 space-y-1">
                    {results.failed.map((f, i) => (
                      <li key={i}>{f.email}: {f.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <Button onClick={onClose} className="w-full">Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}