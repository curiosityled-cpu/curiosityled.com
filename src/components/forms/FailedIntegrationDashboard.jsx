import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, RefreshCw, ExternalLink, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

export default function FailedIntegrationDashboard() {
  const [failedSubmissions, setFailedSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState({});

  useEffect(() => {
    loadFailedSubmissions();
  }, []);

  const loadFailedSubmissions = async () => {
    setLoading(true);
    try {
      const submissions = await base44.entities.CustomFormSubmission.filter({
        integration_status: "failed"
      }, '-created_date');
      setFailedSubmissions(submissions);
    } catch (error) {
      console.error("Error loading failed submissions:", error);
      toast.error("Failed to load submissions");
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (submissionId) => {
    setRetrying({ ...retrying, [submissionId]: true });
    try {
      // Call the processing function again
      const response = await base44.functions.invoke('processFormSubmission', {
        submission_id: submissionId
      });

      if (response.data.success) {
        toast.success("Integration processed successfully");
        loadFailedSubmissions();
      } else {
        toast.error(response.data.error || "Integration failed again");
      }
    } catch (error) {
      console.error("Error retrying integration:", error);
      toast.error("Failed to retry integration");
    } finally {
      setRetrying({ ...retrying, [submissionId]: false });
    }
  };

  const handleViewSubmission = (formId, submissionId) => {
    window.location.href = `${createPageUrl("FormSubmissions")}?formId=${formId}&submissionId=${submissionId}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          Failed Integrations
        </CardTitle>
        <p className="text-sm text-gray-600">
          Form submissions that failed to create linked entities
        </p>
      </CardHeader>
      <CardContent>
        {failedSubmissions.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No failed integrations</p>
          </div>
        ) : (
          <div className="space-y-3">
            {failedSubmissions.map((submission) => (
              <Card key={submission.id} className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm">{submission.submitter_name || submission.submitter_email}</p>
                        <Badge variant="destructive" className="text-xs">Failed</Badge>
                      </div>
                      <p className="text-xs text-gray-600">
                        Form ID: {submission.form_id}
                      </p>
                      <p className="text-xs text-gray-600">
                        Submitted: {new Date(submission.created_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {submission.integration_error && (
                    <Card className="bg-white border-red-300 mb-3">
                      <CardContent className="p-3">
                        <p className="text-xs font-medium text-red-700 mb-1">Error Details:</p>
                        <p className="text-xs text-red-600">{submission.integration_error}</p>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleRetry(submission.id)}
                      disabled={retrying[submission.id]}
                      size="sm"
                      variant="outline"
                      className="flex-1"
                    >
                      {retrying[submission.id] ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Retrying...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Retry Integration
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={() => handleViewSubmission(submission.form_id, submission.id)}
                      size="sm"
                      variant="ghost"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}