import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Loader2, 
  Eye, 
  Download,
  Filter,
  Search,
  Calendar
} from "lucide-react";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import SubmissionDetailModal from "@/components/forms/SubmissionDetailModal";
import SubmissionAnalytics from "@/components/forms/SubmissionAnalytics";
import AdvancedAnalytics from "@/components/forms/AdvancedAnalytics";
import CustomReportBuilder from "@/components/forms/CustomReportBuilder";
import AdvancedExportManager from "@/components/forms/AdvancedExportManager";
import BulkResponseActions from "@/components/forms/BulkResponseActions";

function FormSubmissions() {
  const [searchParams] = useSearchParams();
  const formId = searchParams.get("formId");
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (formId) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  useEffect(() => {
    filterSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissions, searchQuery, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (!formId) {
        toast.error("No form ID provided");
        setLoading(false);
        return;
      }

      const [formData, submissionsData] = await Promise.all([
        base44.entities.CustomForm.filter({ id: formId }),
        base44.entities.CustomFormSubmission.filter({ form_id: formId }, '-submitted_at')
      ]);

      if (formData.length > 0) {
        setForm(formData[0]);
        setSubmissions(submissionsData);
      } else {
        toast.error("Form not found");
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load submissions");
    } finally {
      setLoading(false);
    }
  };

  const filterSubmissions = () => {
    let filtered = submissions;

    if (statusFilter !== "all") {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(s =>
        s.submitter_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.submitter_email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredSubmissions(filtered);
  };

  const handleExportCSV = () => {
    if (!form || submissions.length === 0) {
      toast.error("No submissions to export");
      return;
    }

    // CSV escape function
    const escapeCSV = (value) => {
      if (value == null) return "";
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Build CSV headers
    const headers = ["Submitter", "Email", "Status", "Submitted At", "Completion Time"];
    const allQuestionIds = [];
    
    if (form.config?.sections) {
      form.config.sections.forEach(section => {
        section.questions?.forEach(q => {
          allQuestionIds.push({ id: q.id, text: q.question_text });
          headers.push(q.question_text);
        });
      });
    }

    // Build CSV rows
    const rows = submissions.map(sub => {
      const row = [
        escapeCSV(sub.submitter_name || ""),
        escapeCSV(sub.submitter_email || ""),
        escapeCSV(sub.status || ""),
        escapeCSV(new Date(sub.submitted_at).toLocaleString()),
        escapeCSV(sub.completion_time_seconds 
          ? `${Math.floor(sub.completion_time_seconds / 60)}m ${sub.completion_time_seconds % 60}s`
          : "")
      ];

      allQuestionIds.forEach(({ id }) => {
        const response = sub.responses?.[id];
        if (Array.isArray(response)) {
          row.push(escapeCSV(response.join("; ")));
        } else if (response !== null && response !== undefined) {
          row.push(escapeCSV(String(response)));
        } else {
          row.push("");
        }
      });

      return row;
    });

    // Create CSV content
    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    // Download with UTF-8 BOM for Excel compatibility
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form.title}_submissions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    toast.success("CSV exported successfully");
  };

  const getStatusBadge = (status) => {
    const colors = {
      submitted: "bg-blue-100 text-blue-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      in_progress: "bg-yellow-100 text-yellow-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">Form not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{form.title}</h1>
              <p className="text-gray-600 mt-1">{submissions.length} submissions</p>
            </div>
            
            <Button onClick={handleExportCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                All
              </Button>
              <Button
                variant={statusFilter === "submitted" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("submitted")}
              >
                Submitted
              </Button>
              <Button
                variant={statusFilter === "approved" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("approved")}
              >
                Approved
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="list">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="list">Submissions</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Actions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-6">
            {filteredSubmissions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600">No submissions found</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Submitter
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Submitted
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Time Taken
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredSubmissions.map((submission) => (
                          <tr key={submission.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-medium">{submission.submitter_name}</p>
                                <p className="text-sm text-gray-500">{submission.submitter_email}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge className={getStatusBadge(submission.status)}>
                                {submission.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {new Date(submission.submitted_at).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {submission.completion_time_seconds 
                                ? `${Math.floor(submission.completion_time_seconds / 60)}m ${submission.completion_time_seconds % 60}s`
                                : "—"
                              }
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedSubmission(submission)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="bulk" className="mt-6">
            <BulkResponseActions 
              submissions={submissions} 
              onUpdate={() => {
                loadData();
              }} 
            />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <SubmissionAnalytics form={form} submissions={submissions} />
          </TabsContent>

          <TabsContent value="advanced" className="mt-6">
            <AdvancedAnalytics form={form} submissions={submissions} />
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <div className="space-y-6">
              <AdvancedExportManager form={form} submissions={submissions} />
              <CustomReportBuilder form={form} submissions={submissions} />
            </div>
          </TabsContent>
        </Tabs>

        {/* Submission Detail Modal */}
        {selectedSubmission && (
          <SubmissionDetailModal
            submission={selectedSubmission}
            form={form}
            onClose={() => setSelectedSubmission(null)}
            onUpdate={loadData}
          />
        )}
      </div>
    </div>
  );
}

export default withAuthProtection(FormSubmissions, {
  allowedRoles: ['Admin Level 1', 'Admin Level 2', 'Super Administrator', 'Partner Business Administrator', 'Platform Admin']
});