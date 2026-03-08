import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Table2, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function AdvancedExportManager({ form, submissions }) {
  const [exporting, setExporting] = useState(false);
  const [exportConfig, setExportConfig] = useState({
    format: "csv",
    includeMetadata: true,
    includeScores: true,
    includeTimestamps: true,
    groupByStatus: false,
    includeCharts: false
  });

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const questions = form.config.sections.flatMap(s => s.questions || []);
      
      // Prepare data for PDF
      const reportData = {
        form_title: form.title,
        form_type: form.form_type,
        total_submissions: submissions.length,
        date_generated: new Date().toISOString(),
        submissions: submissions.map(sub => ({
          submitter: sub.submitter_name || sub.submitter_email,
          submitted_at: sub.submitted_at,
          status: sub.status,
          score: sub.score,
          percentage: sub.percentage,
          responses: questions.map(q => ({
            question: q.question_text,
            answer: sub.responses?.[q.id] || "No answer"
          }))
        }))
      };

      // Generate PDF using LLM to create formatted content
      const pdfContent = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a professional PDF report for this form submission data:

Title: ${reportData.form_title}
Total Submissions: ${reportData.total_submissions}
Date: ${new Date().toLocaleDateString()}

Create a well-formatted summary with:
1. Executive summary
2. Key statistics
3. Submission details table
4. Insights and trends

Data: ${JSON.stringify(reportData)}

Return HTML that can be converted to PDF.`,
        response_json_schema: {
          type: "object",
          properties: {
            html_content: { type: "string" },
            summary: { type: "string" }
          }
        }
      });

      // Download as HTML (can be printed to PDF by browser)
      const blob = new Blob([pdfContent.html_content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${form.title}_report.html`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();

      toast.success("PDF report generated successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setExporting(false);
    }
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const questions = form.config.sections.flatMap(s => s.questions || []);
      
      // Create CSV with advanced formatting
      let csv = "";
      
      // Headers
      const headers = ["Submitter", "Email", "Submitted At", "Status"];
      if (exportConfig.includeScores) {
        headers.push("Score", "Max Score", "Percentage", "Passed");
      }
      questions.forEach(q => headers.push(q.question_text));
      if (exportConfig.includeMetadata) {
        headers.push("Completion Time (s)", "Source");
      }
      
      csv += headers.map(h => `"${h}"`).join(",") + "\n";
      
      // Group by status if requested
      let orderedSubmissions = submissions;
      if (exportConfig.groupByStatus) {
        orderedSubmissions = [...submissions].sort((a, b) => 
          (a.status || "").localeCompare(b.status || "")
        );
      }
      
      // Data rows
      orderedSubmissions.forEach(sub => {
        const row = [];
        row.push(`"${sub.submitter_name || ""}"`);
        row.push(`"${sub.submitter_email || ""}"`);
        row.push(`"${sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : ""}"`);
        row.push(`"${sub.status || ""}"`);
        
        if (exportConfig.includeScores) {
          row.push(sub.score ?? "");
          row.push(sub.max_score ?? "");
          row.push(sub.percentage ?? "");
          row.push(sub.passed ? "Yes" : "No");
        }
        
        questions.forEach(q => {
          const answer = sub.responses?.[q.id];
          const answerStr = Array.isArray(answer) ? answer.join("; ") : (answer || "");
          row.push(`"${String(answerStr).replace(/"/g, '""')}"`);
        });
        
        if (exportConfig.includeMetadata) {
          row.push(sub.completion_time_seconds || "");
          row.push(`"${sub.submission_source || ""}"`);
        }
        
        csv += row.join(",") + "\n";
      });
      
      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${form.title}_export.csv`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
      
      toast.success("Excel export completed");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export to Excel");
    } finally {
      setExporting(false);
    }
  };

  const exportToJSON = () => {
    try {
      const exportData = {
        form: {
          title: form.title,
          type: form.form_type,
          category: form.form_category,
          config: form.config
        },
        submissions: submissions.map(sub => ({
          ...sub,
          form_snapshot: exportConfig.includeMetadata ? sub.form_snapshot : undefined
        })),
        metadata: {
          exported_at: new Date().toISOString(),
          total_submissions: submissions.length,
          export_config: exportConfig
        }
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${form.title}_export.json`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
      
      toast.success("JSON export completed");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export to JSON");
    }
  };

  const handleExport = async () => {
    switch (exportConfig.format) {
      case "pdf":
        await exportToPDF();
        break;
      case "excel":
        await exportToExcel();
        break;
      case "json":
        exportToJSON();
        break;
      default:
        await exportToExcel(); // Default to CSV
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          Advanced Export Manager
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Export Format</Label>
          <Select
            value={exportConfig.format}
            onValueChange={(value) => setExportConfig({ ...exportConfig, format: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">
                <div className="flex items-center gap-2">
                  <Table2 className="w-4 h-4" />
                  CSV / Excel
                </div>
              </SelectItem>
              <SelectItem value="excel">
                <div className="flex items-center gap-2">
                  <Table2 className="w-4 h-4" />
                  Excel (Advanced)
                </div>
              </SelectItem>
              <SelectItem value="pdf">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  PDF Report
                </div>
              </SelectItem>
              <SelectItem value="json">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  JSON (Full Data)
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <Label className="text-sm font-medium">Export Options</Label>
          
          <div className="flex items-center gap-2">
            <Checkbox
              id="include_metadata"
              checked={exportConfig.includeMetadata}
              onCheckedChange={(checked) => 
                setExportConfig({ ...exportConfig, includeMetadata: checked })
              }
            />
            <label htmlFor="include_metadata" className="text-sm cursor-pointer">
              Include metadata (timestamps, source, etc.)
            </label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="include_scores"
              checked={exportConfig.includeScores}
              onCheckedChange={(checked) => 
                setExportConfig({ ...exportConfig, includeScores: checked })
              }
            />
            <label htmlFor="include_scores" className="text-sm cursor-pointer">
              Include scores and results
            </label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="group_by_status"
              checked={exportConfig.groupByStatus}
              onCheckedChange={(checked) => 
                setExportConfig({ ...exportConfig, groupByStatus: checked })
              }
            />
            <label htmlFor="group_by_status" className="text-sm cursor-pointer">
              Group by submission status
            </label>
          </div>

          {exportConfig.format === "pdf" && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="include_charts"
                checked={exportConfig.includeCharts}
                onCheckedChange={(checked) => 
                  setExportConfig({ ...exportConfig, includeCharts: checked })
                }
              />
              <label htmlFor="include_charts" className="text-sm cursor-pointer">
                Include charts and visualizations
              </label>
            </div>
          )}
        </div>

        <Button
          onClick={handleExport}
          disabled={exporting || submissions.length === 0}
          className="w-full"
          style={{ backgroundColor: '#0202ff' }}
        >
          {exporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export {submissions.length} Submission{submissions.length !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}