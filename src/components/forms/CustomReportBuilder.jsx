import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, Filter, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function CustomReportBuilder({ form, submissions }) {
  const [reportName, setReportName] = useState("");
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [filters, setFilters] = useState([]);
  const [groupBy, setGroupBy] = useState("none");
  const [includeMetrics, setIncludeMetrics] = useState({
    completionTime: true,
    status: true,
    submissionDate: true
  });

  // Get all questions
  const allQuestions = useMemo(() => {
    const questions = [];
    if (form.config?.sections) {
      form.config.sections.forEach(section => {
        section.questions?.forEach(q => {
          questions.push({
            id: q.id,
            text: q.question_text,
            type: q.type,
            sectionTitle: section.title
          });
        });
      });
    }
    return questions;
  }, [form]);

  const handleToggleQuestion = (questionId) => {
    setSelectedQuestions(prev =>
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const handleAddFilter = () => {
    setFilters([...filters, { field: "status", operator: "equals", value: "" }]);
  };

  const handleRemoveFilter = (index) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const handleUpdateFilter = (index, field, value) => {
    const newFilters = [...filters];
    newFilters[index][field] = value;
    setFilters(newFilters);
  };

  const applyFilters = (submissions) => {
    if (!submissions || submissions.length === 0) return [];
    if (!filters || filters.length === 0) return submissions;

    return submissions.filter(sub => {
      return filters.every(filter => {
        const { field, operator, value } = filter;
        
        // Skip filters with empty values
        if (!value && value !== 0) return true;
        
        if (field === "status") {
          return operator === "equals" ? sub.status === value : sub.status !== value;
        }
        
        if (field === "submissionDate") {
          try {
            const subDate = new Date(sub.submitted_at);
            const filterDate = new Date(value);
            if (isNaN(subDate.getTime()) || isNaN(filterDate.getTime())) return true;
            if (operator === "after") return subDate > filterDate;
            if (operator === "before") return subDate < filterDate;
          } catch {
            return true;
          }
          return true;
        }

        if (field === "completionTime") {
          const time = sub.completion_time_seconds || 0;
          const threshold = parseInt(value) || 0;
          if (operator === "greater") return time > threshold;
          if (operator === "less") return time < threshold;
          return true;
        }

        // Question-based filters
        const response = sub.responses?.[field];
        if (response === undefined || response === null) return operator !== "equals";
        if (operator === "equals") return response === value;
        if (operator === "contains") return String(response).toLowerCase().includes(value.toLowerCase());
        
        return true;
      });
    });
  };

  const generateReport = () => {
    if (!selectedQuestions || selectedQuestions.length === 0) {
      toast.error("Please select at least one question");
      return null;
    }

    if (!submissions || submissions.length === 0) {
      toast.error("No submissions available");
      return null;
    }

    const filteredSubmissions = applyFilters(submissions);

    if (filteredSubmissions.length === 0) {
      toast.error("No submissions match the selected filters");
      return null;
    }

    // Build report data
    const reportData = {
      reportName: reportName || `${form.title} Report`,
      generatedAt: new Date().toISOString(),
      filters: filters,
      totalSubmissions: filteredSubmissions.length,
      data: []
    };

    // Group data if needed
    if (groupBy === "status") {
      const grouped = {};
      filteredSubmissions.forEach(sub => {
        const key = sub.status;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(sub);
      });

      reportData.groups = Object.entries(grouped).map(([status, subs]) => ({
        status,
        count: subs.length,
        submissions: buildSubmissionData(subs)
      }));
    } else {
      reportData.data = buildSubmissionData(filteredSubmissions);
    }

    return reportData;
  };

  const buildSubmissionData = (subs) => {
    if (!subs || subs.length === 0) return [];

    return subs.map(sub => {
      const row = {};

      if (includeMetrics.submissionDate && sub.submitted_at) {
        try {
          row.submittedAt = new Date(sub.submitted_at).toLocaleString();
        } catch {
          row.submittedAt = "—";
        }
      }
      if (includeMetrics.status) {
        row.status = sub.status || "—";
      }
      if (includeMetrics.completionTime) {
        row.completionTime = sub.completion_time_seconds 
          ? `${Math.floor(sub.completion_time_seconds / 60)}m ${sub.completion_time_seconds % 60}s`
          : "—";
      }

      row.submitter = sub.submitter_email || "—";

      selectedQuestions.forEach(qId => {
        const question = allQuestions.find(q => q.id === qId);
        if (question) {
          const response = sub.responses?.[qId];
          row[question.text] = Array.isArray(response) 
            ? response.join("; ") 
            : (response !== undefined && response !== null ? String(response) : "—");
        }
      });

      return row;
    });
  };

  const handleExportJSON = () => {
    const report = generateReport();
    if (!report) return;

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.reportName}_${format(new Date(), "yyyy-MM-dd")}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    toast.success("Report exported");
  };

  const handleExportCSV = () => {
    const report = generateReport();
    if (!report) return;

    const escapeCSV = (value) => {
      if (value == null) return "";
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const data = groupBy === "status" 
      ? report.groups.flatMap(g => g.submissions)
      : report.data;

    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(h => escapeCSV(row[h])).join(","));

    const csvContent = [
      `# ${report.reportName}`,
      `# Generated: ${new Date(report.generatedAt).toLocaleString()}`,
      `# Total Submissions: ${report.totalSubmissions}`,
      "",
      headers.map(escapeCSV).join(","),
      ...rows
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.reportName}_${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    toast.success("Report exported as CSV");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Name */}
          <div>
            <Label htmlFor="reportName">Report Name</Label>
            <Input
              id="reportName"
              placeholder="e.g., Q1 Feedback Summary"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
            />
          </div>

          {/* Select Questions */}
          <div>
            <Label className="mb-3 block">Select Questions to Include</Label>
            <div className="max-h-64 overflow-y-auto border rounded-lg p-4 space-y-3">
              {allQuestions.map(q => (
                <div key={q.id} className="flex items-start gap-3">
                  <Checkbox
                    id={q.id}
                    checked={selectedQuestions.includes(q.id)}
                    onCheckedChange={() => handleToggleQuestion(q.id)}
                  />
                  <label htmlFor={q.id} className="text-sm cursor-pointer flex-1">
                    <span className="font-medium">{q.text}</span>
                    <span className="text-gray-500 block text-xs">
                      {q.sectionTitle} • {q.type}
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Include Metrics */}
          <div>
            <Label className="mb-3 block">Include Metrics</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="completionTime"
                  checked={includeMetrics.completionTime}
                  onCheckedChange={(checked) => 
                    setIncludeMetrics({...includeMetrics, completionTime: checked})
                  }
                />
                <label htmlFor="completionTime" className="text-sm cursor-pointer">
                  Completion Time
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="status"
                  checked={includeMetrics.status}
                  onCheckedChange={(checked) => 
                    setIncludeMetrics({...includeMetrics, status: checked})
                  }
                />
                <label htmlFor="status" className="text-sm cursor-pointer">
                  Submission Status
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="submissionDate"
                  checked={includeMetrics.submissionDate}
                  onCheckedChange={(checked) => 
                    setIncludeMetrics({...includeMetrics, submissionDate: checked})
                  }
                />
                <label htmlFor="submissionDate" className="text-sm cursor-pointer">
                  Submission Date
                </label>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Filters</Label>
              <Button onClick={handleAddFilter} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Filter
              </Button>
            </div>

            <div className="space-y-3">
              {filters.map((filter, index) => (
                <div key={index} className="flex gap-2 items-start p-3 border rounded-lg">
                  <Select
                    value={filter.field}
                    onValueChange={(value) => handleUpdateFilter(index, "field", value)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="submissionDate">Submission Date</SelectItem>
                      <SelectItem value="completionTime">Completion Time</SelectItem>
                      {allQuestions.map(q => (
                        <SelectItem key={q.id} value={q.id}>{q.text}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filter.operator}
                    onValueChange={(value) => handleUpdateFilter(index, "operator", value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">Equals</SelectItem>
                      <SelectItem value="contains">Contains</SelectItem>
                      <SelectItem value="greater">Greater than</SelectItem>
                      <SelectItem value="less">Less than</SelectItem>
                      <SelectItem value="after">After</SelectItem>
                      <SelectItem value="before">Before</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input
                    placeholder="Value"
                    value={filter.value}
                    onChange={(e) => handleUpdateFilter(index, "value", e.target.value)}
                    className="flex-1"
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveFilter(index)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Group By */}
          <div>
            <Label htmlFor="groupBy">Group By</Label>
            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Grouping</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Export Buttons */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleExportJSON} variant="outline" className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </Button>
            <Button onClick={handleExportCSV} className="flex-1" style={{ backgroundColor: '#0202ff' }}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}