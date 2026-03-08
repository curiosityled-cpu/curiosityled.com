import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CheckCircle, XCircle, Download, Trash2, 
  AlertTriangle, List 
} from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

export default function BulkResponseActions({ submissions, onUpdate }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [action, setAction] = useState("");

  const handleToggleAll = () => {
    if (selectedIds.length === submissions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(submissions.map(s => s.id));
    }
  };

  const handleToggle = (id) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleBulkAction = async () => {
    if (selectedIds.length === 0) {
      toast.error("Please select at least one submission");
      return;
    }

    if (!action) {
      toast.error("Please select an action");
      return;
    }

    setProcessing(true);
    try {
      switch (action) {
        case "approve":
          for (const id of selectedIds) {
            await base44.entities.CustomFormSubmission.update(id, {
              status: "approved"
            });
          }
          toast.success(`Approved ${selectedIds.length} submission${selectedIds.length !== 1 ? 's' : ''}`);
          break;

        case "reject":
          for (const id of selectedIds) {
            await base44.entities.CustomFormSubmission.update(id, {
              status: "rejected"
            });
          }
          toast.success(`Rejected ${selectedIds.length} submission${selectedIds.length !== 1 ? 's' : ''}`);
          break;

        case "delete":
          if (!confirm(`Are you sure you want to delete ${selectedIds.length} submission${selectedIds.length !== 1 ? 's' : ''}? This cannot be undone.`)) {
            setProcessing(false);
            return;
          }
          
          for (const id of selectedIds) {
            await base44.entities.CustomFormSubmission.delete(id);
          }
          toast.success(`Deleted ${selectedIds.length} submission${selectedIds.length !== 1 ? 's' : ''}`);
          break;

        case "export":
          const selected = submissions.filter(s => selectedIds.includes(s.id));
          const escapeCSV = (value) => {
            if (value == null) return "";
            const str = String(value);
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          };

          const headers = ["Submitter", "Email", "Status", "Submitted At", "Completion Time"];
          const rows = selected.map(sub => [
            escapeCSV(sub.submitter_name || ""),
            escapeCSV(sub.submitter_email),
            escapeCSV(sub.status),
            escapeCSV(new Date(sub.submitted_at).toLocaleString()),
            escapeCSV(sub.completion_time_seconds ? `${Math.floor(sub.completion_time_seconds / 60)}m ${sub.completion_time_seconds % 60}s` : "—")
          ].join(","));

          const csvContent = [
            headers.map(escapeCSV).join(","),
            ...rows
          ].join("\n");

          const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `submissions_export_${format(new Date(), "yyyy-MM-dd")}.csv`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          a.remove();
          
          toast.success("Export complete");
          setProcessing(false);
          return;
      }

      setSelectedIds([]);
      setAction("");
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error performing bulk action:", error);
      toast.error("Failed to perform action");
    } finally {
      setProcessing(false);
    }
  };

  if (!submissions || submissions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          <List className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No submissions available for bulk actions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Bulk Actions</span>
          {selectedIds.length > 0 && (
            <span className="text-sm font-normal text-gray-600">
              {selectedIds.length} selected
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Select All */}
        <div className="flex items-center gap-2 pb-3 border-b">
          <Checkbox
            id="select-all"
            checked={selectedIds.length === submissions.length}
            onCheckedChange={handleToggleAll}
          />
          <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
            Select All ({submissions.length} submissions)
          </label>
        </div>

        {/* Action Selection */}
        <div className="flex gap-2">
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Choose an action..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="approve">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Approve Selected
                </div>
              </SelectItem>
              <SelectItem value="reject">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  Reject Selected
                </div>
              </SelectItem>
              <SelectItem value="export">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-blue-600" />
                  Export Selected
                </div>
              </SelectItem>
              <SelectItem value="delete">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-red-600" />
                  Delete Selected
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={handleBulkAction}
            disabled={processing || selectedIds.length === 0 || !action}
            style={{ backgroundColor: '#0202ff' }}
          >
            {processing ? "Processing..." : "Apply"}
          </Button>
        </div>

        {/* Warning for destructive actions */}
        {action === "delete" && selectedIds.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <p className="text-sm text-red-600">
              Warning: This action cannot be undone
            </p>
          </div>
        )}

        {/* Submission List with Checkboxes */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {submissions.map((sub) => (
            <div
              key={sub.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                selectedIds.includes(sub.id) ? 'bg-blue-50 border-blue-200' : 'bg-white'
              }`}
            >
              <Checkbox
                id={`sub-${sub.id}`}
                checked={selectedIds.includes(sub.id)}
                onCheckedChange={() => handleToggle(sub.id)}
              />
              <label htmlFor={`sub-${sub.id}`} className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{sub.submitter_name || sub.submitter_email}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(sub.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    sub.status === "approved" ? "bg-green-100 text-green-700" :
                    sub.status === "rejected" ? "bg-red-100 text-red-700" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>
                    {sub.status}
                  </span>
                </div>
              </label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}