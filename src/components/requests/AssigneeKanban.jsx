import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Clock, Flag, Users } from "lucide-react";
import { format } from "date-fns";

export default function AssigneeKanban({ requests, programAdmins, onRequestClick, onAssigneeChange }) {
  const getRequestsForAdmin = (adminEmail) => {
    return requests.filter(r => r.assigned_to_email === adminEmail);
  };

  const unassignedRequests = requests.filter(r => !r.assigned_to_email);

  const handleDragStart = (e, request) => {
    e.dataTransfer.setData('requestId', request.id);
    e.dataTransfer.setData('currentAssignee', request.assigned_to_email || '');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, newAssigneeEmail) => {
    e.preventDefault();
    const requestId = e.dataTransfer.getData('requestId');
    const currentAssignee = e.dataTransfer.getData('currentAssignee');
    
    if (currentAssignee === newAssigneeEmail) return;
    
    await onAssigneeChange(requestId, newAssigneeEmail);
  };

  const renderRequestCard = (request) => {
    const isOverdue = request.due_date && new Date(request.due_date) < new Date();
    const isStale = new Date(request.updated_date) < new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const hasRisks = request.risk_flags?.length > 0;

    return (
      <Card
        key={request.id}
        draggable
        onDragStart={(e) => handleDragStart(e, request)}
        onClick={() => onRequestClick(request.id)}
        className="mb-2 cursor-move hover:shadow-md transition-all border-l-4"
        style={{
          borderLeftColor: 
            request.priority === 'urgent' ? '#ef4444' :
            request.priority === 'high' ? '#f97316' :
            request.priority === 'medium' ? '#3b82f6' : '#6b7280'
        }}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="text-sm font-medium line-clamp-2">{request.title}</h4>
            {request.priority === 'urgent' && (
              <Flag className="w-4 h-4 text-red-500 flex-shrink-0" />
            )}
          </div>

          <div className="flex flex-wrap gap-1 mb-2">
            <Badge variant="outline" className="text-xs">
              {request.request_type?.replace(/_/g, ' ')}
            </Badge>
            <Badge 
              variant={request.status === 'completed' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {request.status?.replace(/_/g, ' ')}
            </Badge>
          </div>

          {(isOverdue || isStale || hasRisks) && (
            <div className="flex flex-wrap gap-1">
              {isOverdue && (
                <div className="flex items-center gap-1 text-xs text-red-600">
                  <Clock className="w-3 h-3" />
                  Overdue
                </div>
              )}
              {isStale && (
                <div className="flex items-center gap-1 text-xs text-orange-600">
                  <AlertCircle className="w-3 h-3" />
                  Stale
                </div>
              )}
              {hasRisks && (
                <div className="flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="w-3 h-3" />
                  Risk
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-gray-500 mt-2">
            {request.created_date && format(new Date(request.created_date), 'MMM d')}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {/* Unassigned Column */}
      <div 
        className="flex-shrink-0 w-80"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, null)}
      >
        <Card>
          <CardHeader className="bg-gray-50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Unassigned
              </CardTitle>
              <Badge variant="secondary">{unassignedRequests.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            <ScrollArea className="h-[calc(100vh-300px)]">
              {unassignedRequests.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8">
                  No unassigned requests
                </div>
              ) : (
                unassignedRequests.map(renderRequestCard)
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Program Admin Columns */}
      {programAdmins.map((admin) => {
        const adminRequests = getRequestsForAdmin(admin.email);
        const adminName = admin.display_name || admin.full_name || admin.email;

        return (
          <div
            key={admin.email}
            className="flex-shrink-0 w-80"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, admin.email)}
          >
            <Card>
              <CardHeader className="bg-blue-50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium">{adminName}</CardTitle>
                    {admin.specializations?.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {admin.specializations.slice(0, 2).join(', ')}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary">{adminRequests.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-3">
                <ScrollArea className="h-[calc(100vh-300px)]">
                  {adminRequests.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-8">
                      No requests assigned
                    </div>
                  ) : (
                    adminRequests.map(renderRequestCard)
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}