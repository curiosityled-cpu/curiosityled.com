import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckSquare, XSquare, Clock, User } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function FormApprovalWorkflow({ form, onUpdate }) {
  const [approvalConfig, setApprovalConfig] = useState(form.config?.approval_workflow || {
    enabled: false,
    required_approvers: [],
    approvals: []
  });
  const [approvalNotes, setApprovalNotes] = useState("");

  const toggleApprovalWorkflow = async (enabled) => {
    try {
      await base44.entities.CustomForm.update(form.id, {
        config: {
          ...form.config,
          approval_workflow: {
            ...approvalConfig,
            enabled
          }
        }
      });
      
      setApprovalConfig({ ...approvalConfig, enabled });
      toast.success(enabled ? "Approval workflow enabled" : "Approval workflow disabled");
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error updating approval workflow:", error);
      toast.error("Failed to update approval workflow");
    }
  };

  const submitForApproval = async () => {
    try {
      const user = await base44.auth.me();
      
      const approval = {
        id: `approval_${Date.now()}`,
        submitted_by: user.email,
        submitted_at: new Date().toISOString(),
        status: "pending",
        notes: approvalNotes
      };

      await base44.entities.CustomForm.update(form.id, {
        config: {
          ...form.config,
          approval_workflow: {
            ...approvalConfig,
            approvals: [...(approvalConfig.approvals || []), approval]
          }
        }
      });

      toast.success("Submitted for approval");
      setApprovalNotes("");
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error submitting for approval:", error);
      toast.error("Failed to submit for approval");
    }
  };

  const processApproval = async (approvalId, decision, reviewNotes) => {
    try {
      const user = await base44.auth.me();
      
      const updatedApprovals = approvalConfig.approvals.map(a =>
        a.id === approvalId ? {
          ...a,
          status: decision,
          reviewed_by: user.email,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes
        } : a
      );

      await base44.entities.CustomForm.update(form.id, {
        config: {
          ...form.config,
          approval_workflow: {
            ...approvalConfig,
            approvals: updatedApprovals
          }
        }
      });

      toast.success(`Form ${decision}`);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error processing approval:", error);
      toast.error("Failed to process approval");
    }
  };

  const pendingApprovals = approvalConfig.approvals?.filter(a => a.status === "pending") || [];
  const completedApprovals = approvalConfig.approvals?.filter(a => a.status !== "pending") || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5" />
          Approval Workflow
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="enable_approval"
            checked={approvalConfig.enabled}
            onCheckedChange={toggleApprovalWorkflow}
          />
          <label htmlFor="enable_approval" className="text-sm font-medium cursor-pointer">
            Require approval before publishing changes
          </label>
        </div>

        {approvalConfig.enabled && (
          <>
            {form.status === "draft" && (
              <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Label>Submit for Approval</Label>
                <Textarea
                  placeholder="Add notes for approvers..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={3}
                />
                <Button
                  onClick={submitForApproval}
                  size="sm"
                  className="w-full"
                  style={{ backgroundColor: '#0202ff' }}
                >
                  Submit for Approval
                </Button>
              </div>
            )}

            {/* Pending Approvals */}
            {pendingApprovals.length > 0 && (
              <div className="space-y-2">
                <Label>Pending Approvals</Label>
                {pendingApprovals.map((approval) => (
                  <Card key={approval.id} className="border-orange-200 bg-orange-50">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-4 h-4 text-orange-600" />
                            <span className="text-sm font-medium">Pending Review</span>
                          </div>
                          <p className="text-xs text-gray-600">
                            Submitted by {approval.submitted_by}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(approval.submitted_at).toLocaleString()}
                          </p>
                          {approval.notes && (
                            <p className="text-sm mt-2 italic">{approval.notes}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => processApproval(approval.id, "approved", "")}
                          className="flex-1 text-green-600"
                        >
                          <CheckSquare className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => processApproval(approval.id, "rejected", "")}
                          className="flex-1 text-red-600"
                        >
                          <XSquare className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Approval History */}
            {completedApprovals.length > 0 && (
              <div className="space-y-2">
                <Label>Approval History</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {completedApprovals.map((approval) => (
                    <Card key={approval.id} className="border">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <Badge className={
                            approval.status === "approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }>
                            {approval.status}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(approval.reviewed_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">
                          Reviewed by {approval.reviewed_by}
                        </p>
                        {approval.review_notes && (
                          <p className="text-xs text-gray-500 mt-1 italic">{approval.review_notes}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}