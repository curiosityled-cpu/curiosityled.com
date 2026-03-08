import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { ClipboardList, User, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";

export default function RequestAssignmentPanel({ requests, programAdmins, onAssign }) {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedAdmin, setSelectedAdmin] = useState("");
  const [assigning, setAssigning] = useState(false);

  const handleAssign = async () => {
    if (!selectedRequest || !selectedAdmin) {
      toast.error('Please select a request and an admin');
      return;
    }

    setAssigning(true);
    try {
      await base44.entities.DevelopmentRequest.update(selectedRequest.id, {
        assigned_to_email: selectedAdmin,
        status: 'assigned'
      });

      toast.success('Request assigned successfully');
      setSelectedRequest(null);
      setSelectedAdmin("");
      onAssign();
    } catch (error) {
      console.error('Error assigning request:', error);
      toast.error('Failed to assign request');
    } finally {
      setAssigning(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unassigned Requests ({requests.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {requests.map(request => (
            <div
              key={request.id}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedRequest?.id === request.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedRequest(request)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{request.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{request.description}</p>
                </div>
                <Badge className={getPriorityColor(request.priority)}>
                  {request.priority}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-gray-600 mt-3">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {request.requested_by_email}
                </div>
                {request.due_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(request.due_date), 'MMM d, yyyy')}
                  </div>
                )}
                {request.budget_amount && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    ${request.budget_amount.toLocaleString()}
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-3">
                <Badge variant="outline">{request.request_type.replace(/_/g, ' ')}</Badge>
                {request.visibility === 'public' && (
                  <Badge className="bg-green-100 text-green-800">Public</Badge>
                )}
              </div>
            </div>
          ))}

          {requests.length === 0 && (
            <div className="text-center py-12">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No unassigned requests</p>
            </div>
          )}

          {selectedRequest && (
            <div className="border-t pt-4 mt-4">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Assign to Program Admin
                  </label>
                  <Select value={selectedAdmin} onValueChange={setSelectedAdmin}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select admin..." />
                    </SelectTrigger>
                    <SelectContent>
                      {programAdmins.map(admin => (
                        <SelectItem key={admin.id} value={admin.email}>
                          {admin.full_name} ({admin.workload?.active_requests || 0} active)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleAssign}
                  disabled={assigning || !selectedAdmin}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Assign Request
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}