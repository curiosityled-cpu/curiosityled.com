import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, User, Calendar, Shield } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";

export default function FormAuditLog({ form }) {
  const [auditEntries, setAuditEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuditLog();
  }, [form.id]);

  const loadAuditLog = async () => {
    try {
      // In a real implementation, this would fetch from a dedicated AuditLog entity
      // For now, we'll create entries based on form history
      const entries = [];

      // Form creation
      entries.push({
        id: "1",
        timestamp: form.created_date,
        action: "form_created",
        user_email: form.created_by,
        details: `Form "${form.title}" created`
      });

      // Status changes
      if (form.status === "published") {
        entries.push({
          id: "2",
          timestamp: form.updated_date,
          action: "form_published",
          user_email: form.created_by,
          details: "Form published"
        });
      }

      // Submissions
      const submissions = await base44.entities.CustomFormSubmission.filter({
        form_id: form.id
      }, '-created_date', 50);

      submissions.forEach((sub, idx) => {
        entries.push({
          id: `sub-${idx}`,
          timestamp: sub.created_date,
          action: "submission_received",
          user_email: sub.submitter_email,
          details: `Submission from ${sub.submitter_name || sub.submitter_email}`
        });
      });

      // Sort by timestamp
      entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setAuditEntries(entries.slice(0, 50));
    } catch (error) {
      console.error("Error loading audit log:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action) => {
    switch (action) {
      case "form_created":
        return <Badge className="bg-blue-100 text-blue-700">Created</Badge>;
      case "form_published":
        return <Badge className="bg-green-100 text-green-700">Published</Badge>;
      case "submission_received":
        return <Badge className="bg-purple-100 text-purple-700">Submission</Badge>;
      case "form_updated":
        return <Badge className="bg-yellow-100 text-yellow-700">Updated</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Audit Log
        </CardTitle>
        <p className="text-xs text-gray-600 mt-1">
          Track all form activity and changes
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-6 text-center">
            <p className="text-sm text-gray-500">Loading audit log...</p>
          </div>
        ) : auditEntries.length === 0 ? (
          <div className="py-6 text-center">
            <Shield className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No audit entries yet</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {auditEntries.map((entry) => (
                <Card key={entry.id} className="border">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      {getActionBadge(entry.action)}
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm mb-1">{entry.details}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {entry.user_email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}