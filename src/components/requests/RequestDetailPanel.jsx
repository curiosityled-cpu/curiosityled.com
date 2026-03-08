import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  X,
  Loader2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Link as LinkIcon,
  User,
  Clock,
  DollarSign,
  Users
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import ApprovalWorkflowPanel from "./ApprovalWorkflowPanel";

export default function RequestDetailPanel({ requestId, onClose, onUpdate }) {
  const { user, isHRAdmin, isProgramManager } = useAuth();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [programAdmins, setProgramAdmins] = useState([]);
  const [triaging, setTriaging] = useState(false);

  useEffect(() => {
    loadRequest();
    loadProgramAdmins();
  }, [requestId]);

  const loadRequest = async () => {
    if (!requestId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const requests = await base44.entities.DevelopmentRequest.filter({ id: requestId });
      if (requests.length > 0) {
        setRequest(requests[0]);
      } else {
        toast.error('Request not found');
        onClose();
      }
    } catch (error) {
      console.error('Error loading request:', error);
      toast.error('Failed to load request details');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const loadProgramAdmins = async () => {
    try {
      const response = await base44.functions.invoke('listAllUsers');
      if (response.data?.success) {
        const admins = response.data.users.filter(u => 
          u.app_role === 'Admin Level 1' || u.app_role === 'Admin Level 2'
        );
        setProgramAdmins(admins);
      }
    } catch (error) {
      console.error('Error loading program admins:', error);
    }
  };

  const handleUpdateRequest = async (updates) => {
    setSaving(true);
    try {
      // Update first_response_at if changing from 'new' to another status
      if (request.status === 'new' && updates.status && updates.status !== 'new' && !request.first_response_at) {
        updates.first_response_at = new Date().toISOString();
      }

      // Update completed_at if marking as completed
      if (updates.status === 'completed' && !request.completed_at) {
        updates.completed_at = new Date().toISOString();
      }

      await base44.entities.DevelopmentRequest.update(requestId, updates);
      toast.success('Request updated successfully');
      await loadRequest();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Failed to update request');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoTriage = async () => {
    setTriaging(true);
    try {
      const { data } = await base44.functions.invoke('autoTriageRequest', { 
        request_id: requestId 
      });
      
      if (data.success) {
        toast.success('Auto-triage completed');
        if (data.suggested_assignee) {
          toast.info(`Suggested assignee: ${data.suggested_assignee}`);
        }
        await loadRequest();
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Error auto-triaging request:', error);
      toast.error('Failed to auto-triage request');
    } finally {
      setTriaging(false);
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      >
        <div className="bg-white rounded-lg p-8">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
        </div>
      </motion.div>
    );
  }

  if (!request) {
    return null;
  }

  const hasRisks = request.risk_flags?.some(flag => flag !== 'none');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-900">Request Details</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Header Info */}
          <div>
            <h3 className="text-xl font-semibold mb-2">{request.title}</h3>
            <div className="flex flex-wrap gap-2">
              {request.status && (
                <Badge className="bg-blue-100 text-blue-800">
                  {request.status.replace(/_/g, ' ').toUpperCase()}
                </Badge>
              )}
              {request.priority && (
                <Badge className={
                  request.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                  request.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                  request.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }>
                  {request.priority.toUpperCase()} PRIORITY
                </Badge>
              )}
              {hasRisks && (
                <Badge className="bg-red-100 text-red-800">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  RISK FLAGS
                </Badge>
              )}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid md:grid-cols-4 gap-4">
            {request.budget_amount !== undefined && (
              <Card>
                <CardContent className="p-4">
                  <DollarSign className="w-5 h-5 text-green-600 mb-2" />
                  <p className="text-2xl font-bold">${request.budget_amount?.toLocaleString()}</p>
                  <p className="text-xs text-gray-600">Budget</p>
                </CardContent>
              </Card>
            )}

            {request.audience_size !== undefined && (
              <Card>
                <CardContent className="p-4">
                  <Users className="w-5 h-5 text-blue-600 mb-2" />
                  <p className="text-2xl font-bold">{request.audience_size}</p>
                  <p className="text-xs text-gray-600">Audience Size</p>
                </CardContent>
              </Card>
            )}

            {request.estimated_effort_hours !== undefined && (
              <Card>
                <CardContent className="p-4">
                  <Clock className="w-5 h-5 text-purple-600 mb-2" />
                  <p className="text-2xl font-bold">{request.estimated_effort_hours}h</p>
                  <p className="text-xs text-gray-600">Est. Effort</p>
                </CardContent>
              </Card>
            )}

            {request.due_date && (
              <Card>
                <CardContent className="p-4">
                  <Calendar className="w-5 h-5 text-orange-600 mb-2" />
                  <p className="text-sm font-bold">{format(new Date(request.due_date), 'MMM d, yyyy')}</p>
                  <p className="text-xs text-gray-600">Due Date</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Description */}
          <div>
            <Label className="text-base font-semibold">Description</Label>
            <p className="mt-2 text-gray-700 whitespace-pre-wrap">{request.description}</p>
          </div>

          {/* Risk Flags */}
          {hasRisks && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900">Risk Flags Identified</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {request.risk_flags.filter(f => f !== 'none').map(flag => (
                      <Badge key={flag} className="bg-red-100 text-red-800">
                        {flag.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Meeting Link */}
          {request.meeting_link && (
            <div>
              <Label className="text-base font-semibold">Discovery Call Link</Label>
              <div className="mt-2 flex items-center gap-2">
                <Input value={request.meeting_link} readOnly className="flex-1" />
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(request.meeting_link);
                    toast.success('Meeting link copied to clipboard');
                  }}
                >
                  <LinkIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Attachments */}
          {request.attachments && request.attachments.length > 0 && (
            <div>
              <Label className="text-base font-semibold">Attachments</Label>
              <div className="mt-2 space-y-2">
                {request.attachments.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                  >
                    <LinkIcon className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-600 truncate flex-1">
                      {url.split('/').pop()}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Approval Workflow */}
          {request.requires_approval && (
            <ApprovalWorkflowPanel request={request} onUpdate={loadRequest} />
          )}

          {/* Admin Actions */}
          {(isHRAdmin || isProgramManager) && (
            <div className="pt-6 border-t space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Administrative Actions</h3>
                {request.status === 'new' && (
                  <Button
                    onClick={handleAutoTriage}
                    disabled={triaging}
                    variant="outline"
                    size="sm"
                  >
                    {triaging ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Triaging...
                      </>
                    ) : (
                      'Auto-Triage'
                    )}
                  </Button>
                )}
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Update Status</Label>
                  <Select
                    value={request.status}
                    onValueChange={(value) => handleUpdateRequest({ status: value })}
                    disabled={saving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="triaging">Triaging</SelectItem>
                      <SelectItem value="waiting_on_requester">Waiting on Requester</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="awaiting_approval">Awaiting Approval</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="assigned_to">Assign To</Label>
                  <Select
                    value={request.assigned_to_email || 'unassigned'}
                    onValueChange={(value) => handleUpdateRequest({ 
                      assigned_to_email: value === 'unassigned' ? null : value,
                      status: value !== 'unassigned' && request.status === 'new' ? 'assigned' : request.status
                    })}
                    disabled={saving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {programAdmins.map(admin => (
                        <SelectItem key={admin.id} value={admin.email}>
                          {admin.full_name || admin.email}
                          {admin.specializations && admin.specializations.length > 0 && (
                            <span className="text-xs text-gray-500 ml-2">
                              ({admin.specializations.join(', ')})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="meeting_link">Meeting Link (Zoom, Teams, etc.)</Label>
                <Input
                  id="meeting_link"
                  value={request.meeting_link || ''}
                  onChange={(e) => setRequest({ ...request, meeting_link: e.target.value })}
                  placeholder="Paste meeting link here..."
                  onBlur={(e) => {
                    if (e.target.value !== request.meeting_link) {
                      handleUpdateRequest({ meeting_link: e.target.value });
                    }
                  }}
                />
              </div>

              <div>
                <Label htmlFor="initial_notes">Notes</Label>
                <Textarea
                  id="initial_notes"
                  value={request.initial_notes || ''}
                  onChange={(e) => setRequest({ ...request, initial_notes: e.target.value })}
                  placeholder="Add notes about this request..."
                  rows={4}
                  onBlur={(e) => {
                    if (e.target.value !== request.initial_notes) {
                      handleUpdateRequest({ initial_notes: e.target.value });
                    }
                  }}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await base44.functions.invoke('sendRequestNotification', {
                        request_id: requestId,
                        notification_type: 'status_change',
                        recipient_email: request.requested_by_email,
                        custom_message: request.initial_notes
                      });
                      toast.success('Notification sent to requester');
                    } catch (error) {
                      toast.error('Failed to send notification');
                    }
                  }}
                  disabled={saving}
                >
                  📧 Notify Requester
                </Button>

                {request.assigned_to_email && (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        await base44.functions.invoke('sendRequestNotification', {
                          request_id: requestId,
                          notification_type: 'status_change',
                          recipient_email: request.assigned_to_email,
                          custom_message: request.initial_notes
                        });
                        toast.success('Notification sent to assignee');
                      } catch (error) {
                        toast.error('Failed to send notification');
                      }
                    }}
                    disabled={saving}
                  >
                    📧 Notify Assignee
                  </Button>
                )}

                {request.requires_approval && (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      setSaving(true);
                      try {
                        const { data } = await base44.functions.invoke('generateDecisionPacket', {
                          request_id: requestId
                        });
                        await loadRequest();
                        toast.success('Decision packet generated');
                      } catch (error) {
                        toast.error('Failed to generate decision packet');
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                  >
                    📋 Generate Decision Packet
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Request Metadata */}
          <div className="pt-6 border-t">
            <h3 className="text-lg font-semibold mb-4">Request Information</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Requested By</p>
                <p className="font-medium">{request.requested_by_email}</p>
              </div>
              <div>
                <p className="text-gray-600">Source</p>
                <p className="font-medium">{request.source?.replace(/_/g, ' ').toUpperCase()}</p>
              </div>
              <div>
                <p className="text-gray-600">Created</p>
                <p className="font-medium">{format(new Date(request.created_date), 'PPpp')}</p>
              </div>
              {request.first_response_at && (
                <div>
                  <p className="text-gray-600">First Response</p>
                  <p className="font-medium">{format(new Date(request.first_response_at), 'PPpp')}</p>
                </div>
              )}
              {request.completed_at && (
                <div>
                  <p className="text-gray-600">Completed</p>
                  <p className="font-medium">{format(new Date(request.completed_at), 'PPpp')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}