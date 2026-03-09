import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreVertical, GripVertical, Trash2, Edit2, Calendar as CalendarIcon } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function BoardKanbanView({
  milestones,
  onUpdateMilestone,
  onDeleteMilestone,
  onAddMilestone,
  groupByColumn = 'status'
}) {
  const [expandedCards, setExpandedCards] = useState({});

  // Get unique values for the groupBy column
  const getColumnValues = () => {
    if (groupByColumn === 'status') {
      return [
        { id: 'not_started', label: 'Not Started', color: '#6b7280' },
        { id: 'working_on_it', label: 'Working On It', color: '#3b82f6' },
        { id: 'done', label: 'Done', color: '#10b981' },
        { id: 'stuck', label: 'Stuck', color: '#ef4444' }
      ];
    } else if (groupByColumn === 'priority') {
      return [
        { id: 'low', label: 'Low', color: '#9ca3af' },
        { id: 'medium', label: 'Medium', color: '#f59e0b' },
        { id: 'high', label: 'High', color: '#f97316' },
        { id: 'critical', label: 'Critical', color: '#dc2626' }
      ];
    }
    // Default grouping
    return [{ id: 'all', label: 'All Milestones', color: '#6366f1' }];
  };

  const columns = getColumnValues();

  const getMilestonesForColumn = (columnId) => {
    if (columnId === 'all') return milestones;
    
    return milestones.filter(m => {
      if (groupByColumn === 'status') return m.status === columnId;
      if (groupByColumn === 'priority') return m.priority === columnId;
      return m.data?.[groupByColumn] === columnId;
    });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    // If dropped in the same position
    if (source.droppableId === destination.droppableId && 
        source.index === destination.index) {
      return;
    }

    const milestone = milestones.find(m => m.id === draggableId);
    if (!milestone) return;

    const destColumnId = destination.droppableId.replace('kanban-', '');

    // Update the milestone with new status/priority
    const updates = { ...milestone };
    
    if (groupByColumn === 'status') {
      updates.status = destColumnId;
    } else if (groupByColumn === 'priority') {
      updates.priority = destColumnId;
    } else {
      updates.data = { ...milestone.data, [groupByColumn]: destColumnId };
    }

    onUpdateMilestone(milestone.id, updates);
  };

  const toggleCard = (milestoneId) => {
    setExpandedCards(prev => ({
      ...prev,
      [milestoneId]: !prev[milestoneId]
    }));
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'border-gray-300',
      medium: 'border-yellow-500',
      high: 'border-orange-500',
      critical: 'border-red-500'
    };
    return colors[priority] || 'border-gray-300';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-3 rounded-lg border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            Grouped by: <span className="text-blue-600 capitalize">{groupByColumn}</span>
          </span>
        </div>
        <Badge variant="outline">{milestones.length} Total Milestones</Badge>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map((column) => {
            const columnMilestones = getMilestonesForColumn(column.id);

            return (
              <div key={column.id} className="flex flex-col">
                <div 
                  className="bg-white rounded-t-lg p-3 border-b-4"
                  style={{ borderBottomColor: column.color }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{column.label}</h3>
                    <Badge variant="outline">{columnMilestones.length}</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full text-xs"
                    onClick={() => onAddMilestone()}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Card
                  </Button>
                </div>

                <Droppable droppableId={`kanban-${column.id}`}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 bg-gray-50 rounded-b-lg p-3 space-y-2 min-h-[200px] transition-colors ${
                        snapshot.isDraggingOver ? 'bg-blue-50' : ''
                      }`}
                    >
                      <AnimatePresence>
                        {columnMilestones.map((milestone, index) => {
                          const isExpanded = expandedCards[milestone.id];
                          
                          return (
                            <Draggable
                              key={milestone.id}
                              draggableId={milestone.id}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <motion.div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.9 }}
                                >
                                  <Card 
                                    className={`p-3 cursor-pointer hover:shadow-md transition-all border-l-4 ${
                                      getPriorityColor(milestone.priority)
                                    } ${snapshot.isDragging ? 'shadow-lg rotate-2' : ''}`}
                                    onClick={() => toggleCard(milestone.id)}
                                  >
                                    <div className="flex items-start gap-2">
                                      <div {...provided.dragHandleProps} className="pt-1">
                                        <GripVertical className="w-4 h-4 text-gray-400" />
                                      </div>
                                      
                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-gray-900 text-sm mb-2">
                                          {milestone.title}
                                        </h4>

                                        <div className="flex flex-wrap gap-1 mb-2">
                                          {groupByColumn !== 'priority' && (
                                            <Badge 
                                              variant="outline" 
                                              className={`text-xs ${getPriorityColor(milestone.priority)}`}
                                            >
                                              {milestone.priority}
                                            </Badge>
                                          )}
                                          
                                          {milestone.data?.due_date && (
                                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                                              <CalendarIcon className="w-3 h-3" />
                                              {format(new Date(milestone.data.due_date), 'MMM d')}
                                            </Badge>
                                          )}
                                        </div>

                                        {/* Expanded Details */}
                                        <AnimatePresence>
                                          {isExpanded && (
                                            <motion.div
                                              initial={{ height: 0, opacity: 0 }}
                                              animate={{ height: 'auto', opacity: 1 }}
                                              exit={{ height: 0, opacity: 0 }}
                                              className="space-y-2 pt-2 border-t mt-2"
                                            >
                                              {milestone.data?.owner && (
                                                <div className="text-xs">
                                                  <span className="text-gray-500">Owner:</span>{' '}
                                                  <span className="text-gray-900">{milestone.data.owner}</span>
                                                </div>
                                              )}
                                              
                                              {milestone.data?.description && (
                                                <p className="text-xs text-gray-600">
                                                  {milestone.data.description}
                                                </p>
                                              )}

                                              {Object.entries(milestone.data || {}).map(([key, value]) => {
                                                if (!value || key === 'owner' || key === 'description' || key === 'due_date') return null;
                                                return (
                                                  <div key={key} className="text-xs">
                                                    <span className="text-gray-500 capitalize">{key.replace('_', ' ')}:</span>{' '}
                                                    <span className="text-gray-900">{String(value)}</span>
                                                  </div>
                                                );
                                              })}
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </div>

                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                          <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                                            <MoreVertical className="w-3 h-3" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                          <DropdownMenuItem onClick={() => toggleCard(milestone.id)}>
                                            <Edit2 className="w-3 h-3 mr-2" />
                                            {isExpanded ? 'Collapse' : 'Expand'}
                                          </DropdownMenuItem>
                                          <DropdownMenuItem 
                                            onClick={() => onDeleteMilestone(milestone.id)}
                                            className="text-red-600"
                                          >
                                            <Trash2 className="w-3 h-3 mr-2" />
                                            Delete
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </Card>
                                </motion.div>
                              )}
                            </Draggable>
                          );
                        })}
                      </AnimatePresence>
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}