import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle2, AlertCircle, Eye, Calendar, FileText, Loader2, Brain } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ExternalAssessmentReviewPanel() {
  const queryClient = useQueryClient();
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: pendingAssessments = [], isLoading } = useQuery({
    queryKey: ['pending-assessments'],
    queryFn: async () => {
      const assessments = await base44.entities.ExternalAssessmentResult.filter({
        status: { $in: ['pending_human_review', 'needs_manual_input'] }
      }, '-created_date');
      return assessments;
    },
    refetchInterval: 30000 // Auto-refresh every 30 seconds
  });

  const filteredAssessments = pendingAssessments.filter(assessment => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      assessment.assessment_type?.toLowerCase().includes(search) ||
      assessment.user_email?.toLowerCase().includes(search) ||
      assessment.designation_or_score?.toLowerCase().includes(search)
    );
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ assessmentId, new_status, rejection_reason }) => {
      const response = await base44.functions.invoke('verifyExternalAssessment', {
        assessmentId,
        new_status,
        rejection_reason
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-assessments'] });
      toast.success('Assessment status updated successfully');
      setShowRejectModal(false);
      setSelectedAssessment(null);
      setRejectionReason('');
    },
    onError: (error) => {
      toast.error(`Failed to update assessment: ${error.message}`);
    }
  });

  const handleViewDocument = async (assessment) => {
    if (!assessment.document_uri) {
      toast.error('No document attached');
      return;
    }

    try {
      const result = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri: assessment.document_uri,
        expires_in: 300
      });
      window.open(result.signed_url, '_blank');
    } catch (error) {
      toast.error('Failed to load document');
    }
  };

  const handleVerify = (assessment) => {
    verifyMutation.mutate({
      assessmentId: assessment.id,
      new_status: 'verified'
    });
  };

  const handleMarkNeedsInput = (assessment) => {
    setSelectedAssessment(assessment);
    setShowRejectModal(true);
  };

  const confirmReject = () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    verifyMutation.mutate({
      assessmentId: selectedAssessment.id,
      new_status: 'needs_manual_input',
      rejection_reason: rejectionReason
    });
  };

  const getStatusBadge = (status) => {
    const config = {
      pending_human_review: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending Review' },
      needs_manual_input: { color: 'bg-orange-100 text-orange-800', label: 'Needs More Info' }
    }[status] || { color: 'bg-gray-100 text-gray-800', label: status };

    return <Badge className={config.color}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>External Assessments for Review</span>
            <Badge variant="outline">{filteredAssessments.length} pending</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by type, email, or result..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {filteredAssessments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No assessments pending review</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAssessments.map((assessment) => (
                <Card key={assessment.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">{assessment.assessment_type}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Submitted by: {assessment.user_email}
                        </p>
                      </div>
                      {getStatusBadge(assessment.status)}
                    </div>

                    {assessment.designation_or_score && (
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">
                          <strong>Result/Designation:</strong>
                        </p>
                        <p className="text-sm font-medium">{assessment.designation_or_score}</p>
                      </div>
                    )}

                    {assessment.ai_summary && (
                      <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="w-4 h-4 text-blue-600" />
                          <p className="text-sm font-medium text-blue-900">AI Summary:</p>
                        </div>
                        <p className="text-sm text-gray-700">{assessment.ai_summary}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      {assessment.date_completed && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Completed:</span>
                          <span className="font-medium">
                            {format(new Date(assessment.date_completed), 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}

                      {assessment.is_private && (
                        <div className="flex items-center gap-2 text-sm">
                          <AlertCircle className="w-4 h-4 text-orange-400" />
                          <span className="font-medium text-orange-600">Private Assessment</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {assessment.document_uri && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDocument(assessment)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Document
                        </Button>
                      )}

                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleVerify(assessment)}
                        disabled={verifyMutation.isPending}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Verify
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkNeedsInput(assessment)}
                        disabled={verifyMutation.isPending}
                      >
                        <AlertCircle className="w-4 h-4 mr-1" />
                        Needs More Info
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Needs Input Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Additional Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Please explain what additional information is needed for{' '}
              <strong>{selectedAssessment?.assessment_type}</strong>
            </p>
            <Textarea
              placeholder="Describe what information is missing or unclear..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmReject}
              disabled={verifyMutation.isPending || !rejectionReason.trim()}
            >
              {verifyMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <AlertCircle className="w-4 h-4 mr-2" />
              )}
              Request Info
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}