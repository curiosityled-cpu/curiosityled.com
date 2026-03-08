import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Clock, AlertCircle, User } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ApprovalWorkflowPanel({ request, onUpdate }) {
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState("");

  const approvalChain = request.approval_chain || [];
  const currentUserApprovalStep = approvalChain.find(
    step => step.approver_email === user?.email && step.status === 'pending'
  );

  const handleApprovalDecision = async (decision) => {
    if (!currentUserApprovalStep) return;

    setProcessing(true);
    try {
      // Update the approval step
      const updatedChain = approvalChain.map(step => 
        step.approver_email === user.email && step.status === 'pending'
          ? {
              ...step,
              status: decision,
              decision_date: new Date().toISOString(),
              decision_notes: decisionNotes
            }
          : step
      );

      // Check if all steps are complete
      const allApproved = updatedChain.every(step => 
        step.status === 'approved' || step.status === 'skipped'
      );
      const anyRejected = updatedChain.some(step => step.status === 'rejected');

      let newStatus = request.status;
      if (anyRejected) {
        newStatus = 'cancelled';
      } else if (allApproved && request.status === 'awaiting_approval') {
        newStatus = 'approved';
      }

      const updates = {
        approval_chain: updatedChain,
        approval_status: anyRejected ? 'rejected' : allApproved ? 'approved' : 'pending',
        status: newStatus
      };

      await base44.entities.DevelopmentRequest.update(request.id, updates);
      
      toast.success(decision === 'approved' ? 'Request approved' : 'Request rejected');
      setDecisionNotes("");
      
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error processing approval:', error);
      toast.error('Failed to process approval decision');
    } finally {
      setProcessing(false);
    }
  };

  if (!request.requires_approval) {
    return null;
  }

  const getStepIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-amber-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStepBadge = (status) => {
    const configs = {
      approved: { color: 'bg-green-100 text-green-800', label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
      pending: { color: 'bg-amber-100 text-amber-800', label: 'Pending' },
      skipped: { color: 'bg-gray-100 text-gray-800', label: 'Skipped' }
    };
    const config = configs[status] || configs.pending;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          Approval Workflow
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm font-medium text-amber-900">
            This request requires leadership approval before proceeding.
          </p>
          <p className="text-xs text-amber-700 mt-1">
            Overall Status: <strong>{request.approval_status?.toUpperCase()}</strong>
          </p>
        </div>

        {/* Approval Chain */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Approval Steps</h4>
          {approvalChain
            .sort((a, b) => a.sequence - b.sequence)
            .map((step, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${
                  step.approver_email === user?.email && step.status === 'pending'
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStepIcon(step.status)}
                    <div>
                      <p className="font-medium text-sm">Step {step.sequence}</p>
                      <p className="text-xs text-gray-600">{step.approver_email}</p>
                    </div>
                  </div>
                  {getStepBadge(step.status)}
                </div>

                {step.decision_date && (
                  <p className="text-xs text-gray-500 mt-2">
                    Decision on {format(new Date(step.decision_date), 'PPp')}
                  </p>
                )}

                {step.decision_notes && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                    <p className="font-medium mb-1">Notes:</p>
                    <p className="text-gray-700">{step.decision_notes}</p>
                  </div>
                )}

                {/* Action Buttons for Current User */}
                {step.approver_email === user?.email && step.status === 'pending' && (
                  <div className="mt-4 space-y-3 pt-3 border-t">
                    <div>
                      <Label htmlFor="decision_notes" className="text-xs">Decision Notes (Optional)</Label>
                      <Textarea
                        id="decision_notes"
                        value={decisionNotes}
                        onChange={(e) => setDecisionNotes(e.target.value)}
                        placeholder="Add notes about your decision..."
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApprovalDecision('approved')}
                        disabled={processing}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleApprovalDecision('rejected')}
                        disabled={processing}
                        variant="destructive"
                        className="flex-1"
                        size="sm"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}