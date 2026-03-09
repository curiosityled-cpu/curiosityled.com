import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Eye,
  User,
  Calendar,
  DollarSign,
  Users as UsersIcon
} from "lucide-react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const COLUMNS = [
  { id: 'new', title: 'New Requests', color: 'bg-blue-100', icon: AlertCircle },
  { id: 'triaging', title: 'Triaging', color: 'bg-yellow-100', icon: Clock },
  { id: 'assigned', title: 'Assigned', color: 'bg-purple-100', icon: User },
  { id: 'in_progress', title: 'In Progress', color: 'bg-indigo-100', icon: Clock },
  { id: 'awaiting_approval', title: 'Awaiting Approval', color: 'bg-amber-100', icon: Clock },
  { id: 'completed', title: 'Completed', color: 'bg-green-100', icon: CheckCircle2 }
];

export default function RequestKanbanBoard({ requests, onRequestClick, onUpdate }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnd = async (result) => {
    setIsDragging(false);
    
    if (!result.destination) return;
    
    const { draggableId, destination, source } = result;
    const newStatus = destination.droppableId;
    const oldStatus = source.droppableId;
    const requestId = draggableId;

    // No change if dropped in the same column
    if (oldStatus === newStatus) return;

    try {
      const updates = { status: newStatus };
      
      // Set first_response_at when moving from 'new'
      const request = requests.find(r => r.id === requestId);
      if (request?.status === 'new' && newStatus !== 'new' && !request.first_response_at) {
        updates.first_response_at = new Date().toISOString();
      }
      
      // Set completed_at when moving to 'completed'
      if (newStatus === 'completed' && !request?.completed_at) {
        updates.completed_at = new Date().toISOString();
      }

      await base44.entities.DevelopmentRequest.update(requestId, updates);
      toast.success('Request status updated');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Failed to update request status');
      if (onUpdate) onUpdate(); // Refresh to revert UI
    }
  };

  const getColumnRequests = (columnId) => {
    return requests.filter(r => r.status === columnId);
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority] || colors.medium;
  };

  const isStale = (request) => {
    if (!['assigned', 'in_progress'].includes(request.status)) return false;
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    return new Date(request.updated_date) < fourteenDaysAgo;
  };

  const breachesSLA = (request) => {
    if (request.status !== 'new' || request.first_response_at) return false;
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    return new Date(request.created_date) < threeDaysAgo;
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd} onDragStart={() => setIsDragging(true)}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {COLUMNS.map(column => {
          const Icon = column.icon;
          const columnRequests = getColumnRequests(column.id);
          
          return (
            <div key={column.id} className="flex flex-col">
              <div className={`${column.color} rounded-t-lg p-3 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <h3 className="font-semibold text-sm">{column.title}</h3>
                </div>
                <Badge variant="secondary" className="bg-white/50">
                  {columnRequests.length}
                </Badge>
              </div>
              
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`bg-gray-50 rounded-b-lg p-2 min-h-[500px] flex-1 ${
                      snapshot.isDraggingOver ? 'bg-blue-50 ring-2 ring-blue-300' : ''
                    }`}
                  >
                    <div className="space-y-2">
                      {columnRequests.map((request, index) => {
                        const hasRisks = request.risk_flags?.some(flag => flag !== 'none');
                        const isRequestStale = isStale(request);
                        const isRequestBreachingSLA = breachesSLA(request);
                        
                        return (
                          <Draggable key={request.id} draggableId={request.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <Card 
                                  className={`cursor-pointer hover:shadow-md transition-all ${
                                    snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                                  } ${isRequestBreachingSLA ? 'border-2 border-red-400' : ''} ${
                                    isRequestStale ? 'border-2 border-orange-400' : ''
                                  }`}
                                  onClick={() => onRequestClick(request.id)}
                                >
                                  <CardHeader className="p-3 pb-2">
                                    <CardTitle className="text-sm font-semibold line-clamp-2">
                                      {request.title}
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="p-3 pt-0 space-y-2">
                                    <div className="flex flex-wrap gap-1">
                                      <Badge className={getPriorityColor(request.priority)}>
                                        {request.priority}
                                      </Badge>
                                      {hasRisks && (
                                        <Badge className="bg-red-100 text-red-800 text-xs">
                                          <AlertCircle className="w-3 h-3 mr-1" />
                                          Risk
                                        </Badge>
                                      )}
                                      {isRequestBreachingSLA && (
                                        <Badge className="bg-red-100 text-red-800 text-xs">
                                          SLA Breach
                                        </Badge>
                                      )}
                                      {isRequestStale && (
                                        <Badge className="bg-orange-100 text-orange-800 text-xs">
                                          Stale
                                        </Badge>
                                      )}
                                    </div>

                                    <p className="text-xs text-gray-600 line-clamp-2">
                                      {request.description}
                                    </p>

                                    <div className="text-xs text-gray-500 space-y-1">
                                      {request.assigned_to_email && (
                                        <div className="flex items-center gap-1">
                                          <User className="w-3 h-3" />
                                          <span className="truncate">{request.assigned_to_email.split('@')[0]}</span>
                                        </div>
                                      )}
                                      {request.due_date && (
                                        <div className="flex items-center gap-1">
                                          <Calendar className="w-3 h-3" />
                                          <span>{format(new Date(request.due_date), 'MMM d')}</span>
                                        </div>
                                      )}
                                      {request.estimated_effort_hours && (
                                        <div className="flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          <span>{request.estimated_effort_hours}h</span>
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t">
                                      <span className="text-xs text-gray-400">
                                        {format(new Date(request.created_date), 'MMM d')}
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onRequestClick(request.id);
                                        }}
                                      >
                                        <Eye className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                    </div>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}