import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, LayoutGrid } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { base44 } from "@/api/base44Client";

const statusColumns = [
  { id: 'not_started', title: 'Not Started', color: 'bg-gray-50', badgeColor: 'bg-gray-200 text-gray-600' },
  { id: 'in_progress', title: 'Working on it', color: 'bg-orange-50', badgeColor: 'bg-orange-200 text-orange-600' },
  { id: 'completed', title: 'Done', color: 'bg-green-50', badgeColor: 'bg-green-200 text-green-600' },
  { id: 'on_hold', title: 'Stuck', color: 'bg-red-50', badgeColor: 'bg-red-200 text-red-600' }
];

const priorityColors = {
  low: "bg-blue-500",
  medium: "bg-yellow-500",
  high: "bg-orange-500",
  critical: "bg-red-500"
};

export default function KanbanView({ milestones = [], goal, onEditTask, onDeleteTask, onOpenTaskModal, onRefresh }) {
  const [milestonesByStatus, setMilestonesByStatus] = useState(() => {
    return statusColumns.reduce((acc, col) => {
      acc[col.id] = milestones.filter(milestone => milestone.data?.status === col.id);
      return acc;
    }, {});
  });

  useEffect(() => {
    setMilestonesByStatus(statusColumns.reduce((acc, col) => {
      acc[col.id] = milestones.filter(milestone => milestone.data?.status === col.id);
      return acc;
    }, {}));
  }, [milestones]);

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceStatus = source.droppableId;
    const destStatus = destination.droppableId;
    
    const sourceMilestones = Array.from(milestonesByStatus[sourceStatus]);
    const destMilestones = sourceStatus === destStatus ? sourceMilestones : Array.from(milestonesByStatus[destStatus]);
    
    const [movedMilestone] = sourceMilestones.splice(source.index, 1);
    
    if (sourceStatus === destStatus) {
      sourceMilestones.splice(destination.index, 0, movedMilestone);
      setMilestonesByStatus(prev => ({ ...prev, [sourceStatus]: sourceMilestones }));
    } else {
      // Optimistic update
      const updatedMilestone = { ...movedMilestone, data: { ...movedMilestone.data, status: destStatus } };
      destMilestones.splice(destination.index, 0, updatedMilestone);
      setMilestonesByStatus(prev => ({
        ...prev,
        [sourceStatus]: sourceMilestones,
        [destStatus]: destMilestones
      }));

      // Persist to database
      await base44.entities.Milestone.update(draggableId, {
        data: { ...(movedMilestone.data || {}), status: destStatus }
      });

      if (onRefresh) onRefresh();
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-[#E1E5F3] p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Drag and drop to manage your tasks</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Group by:</span>
            <Button variant="outline" size="sm" className="h-8 gap-2">
              <LayoutGrid className="w-3 h-3" />
              Status
            </Button>
          </div>
        </div>
      </div>

      {/* Kanban Columns */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {statusColumns.map((column) => (
            <Droppable key={column.id} droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`rounded-xl border-2 transition-colors ${
                    snapshot.isDraggingOver 
                      ? 'border-blue-400 bg-blue-50' 
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  {/* Column Header */}
                  <div className="p-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-[#323338]">{column.title}</h3>
                      <Badge className={`${column.badgeColor} border-0 rounded-full px-2 py-0.5 text-xs font-semibold`}>
                        {milestonesByStatus[column.id]?.length || 0}
                      </Badge>
                    </div>
                  </div>

                  {/* Column Header */}
                  <div className="p-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-[#323338]">{column.title}</h3>
                      <Badge className={`${column.badgeColor} border-0 rounded-full px-2 py-0.5 text-xs font-semibold`}>
                        {milestonesByStatus[column.id]?.length || 0}
                      </Badge>
                    </div>
                  </div>

                  {/* Column Content */}
                  <div className={`p-3 min-h-[400px] ${column.color}`}>
                    <div className="space-y-2">
                      {milestonesByStatus[column.id]?.map((milestone, index) => (
                        <Draggable key={milestone.id} draggableId={milestone.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white rounded-lg p-3 shadow-sm border border-gray-200 transition-shadow ${
                                snapshot.isDragging ? 'shadow-lg rotate-2' : 'hover:shadow-md'
                              }`}
                              style={{
                                ...provided.draggableProps.style,
                                borderLeft: `3px solid ${milestone.color || '#0073EA'}`
                              }}
                            >
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-[#323338] leading-tight">{milestone.title}</p>
                                
                                {milestone.data?.notes && (
                                  <p className="text-xs text-gray-500 line-clamp-2">{milestone.data.notes}</p>
                                )}
                                
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1">
                                    <div 
                                      className={`w-2 h-2 rounded-full ${priorityColors[milestone.priority]}`}
                                      title={milestone.priority}
                                    />
                                  </div>
                                  
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onEditTask(milestone);
                                      }}
                                      className="text-gray-400 hover:text-[#0073EA] h-6 w-6 p-0"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteTask(milestone.id);
                                      }}
                                      className="text-gray-400 hover:text-red-600 h-6 w-6 p-0"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>

                                {milestone.data?.progress !== undefined && (
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-[#0073EA] transition-all"
                                        style={{ width: `${milestone.data.progress}%` }}
                                      />
                                    </div>
                                    <span className="text-xs text-gray-500">{milestone.data.progress}%</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>

                    {/* Add Task Area */}
                    {(!milestonesByStatus[column.id] || milestonesByStatus[column.id].length === 0) && (
                      <div className="text-center py-12">
                        <div className="inline-flex flex-col items-center gap-2">
                          <div 
                            className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-white transition-colors"
                            onClick={() => {
                              const firstGroup = goal?.groups?.[0];
                              if (firstGroup) onOpenTaskModal(firstGroup.id);
                            }}
                          >
                            <Plus className="w-5 h-5 text-gray-400" />
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500 font-medium">Drag tasks here</p>
                            <p className="text-xs text-gray-400">or click + to add new</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {milestonesByStatus[column.id]?.length > 0 && (
                      <Button
                        variant="ghost"
                        className="w-full mt-2 text-gray-400 hover:text-gray-600 hover:bg-white h-8 text-xs"
                        onClick={() => {
                          const firstGroup = goal?.groups?.[0];
                          if (firstGroup) onOpenTaskModal(firstGroup.id);
                        }}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add task
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}