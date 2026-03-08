import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronRight, Plus, Settings, FolderKanban } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import MilestoneRow from "./MilestoneRow";
import { motion, AnimatePresence } from "framer-motion";

export default function BoardTableView({ 
  milestones, 
  columns, 
  groups,
  onUpdateMilestone,
  onDeleteMilestone,
  onReorderMilestone,
  onAddMilestone,
  onManageColumns,
  onManageGroups
}) {
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const toggleGroup = (groupId) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination } = result;
    
    // If dropped in the same position, do nothing
    if (source.droppableId === destination.droppableId && 
        source.index === destination.index) {
      return;
    }

    // Get source and destination group IDs
    const sourceGroupId = source.droppableId.replace('group-', '');
    const destGroupId = destination.droppableId.replace('group-', '');

    // Get milestones in source group
    const sourceMilestones = milestones.filter(m => m.group_id === sourceGroupId);
    const draggedMilestone = sourceMilestones[source.index];

    if (!draggedMilestone) return;

    // Calculate new order_index and group_id
    const destMilestones = milestones.filter(m => m.group_id === destGroupId);
    const newOrderIndex = destination.index;

    onReorderMilestone(draggedMilestone.id, {
      group_id: destGroupId,
      order_index: newOrderIndex
    });
  };

  const getMilestonesForGroup = (groupId) => {
    return milestones
      .filter(m => m.group_id === groupId)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white p-3 rounded-lg border">
        <div className="flex items-center gap-2">
          <FolderKanban className="w-5 h-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            {milestones.length} Milestone{milestones.length !== 1 ? 's' : ''} across {groups.length} Group{groups.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onManageColumns}>
            <Settings className="w-4 h-4 mr-2" />
            Manage Columns
          </Button>
          <Button variant="outline" size="sm" onClick={onManageGroups}>
            <Settings className="w-4 h-4 mr-2" />
            Manage Groups
          </Button>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        {groups.map((group) => {
          const groupMilestones = getMilestonesForGroup(group.id);
          const isCollapsed = collapsedGroups[group.id];

          return (
            <Card key={group.id} className="overflow-hidden">
              {/* Group Header */}
              <div
                className="flex items-center justify-between p-4 border-b cursor-pointer hover:bg-gray-50"
                style={{ borderLeftWidth: '4px', borderLeftColor: group.color }}
                onClick={() => toggleGroup(group.id)}
              >
                <div className="flex items-center gap-3">
                  {isCollapsed ? (
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  )}
                  <h3 className="font-semibold text-gray-900">{group.title}</h3>
                  <Badge variant="outline">{groupMilestones.length} items</Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddMilestone(group.id);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Milestone
                </Button>
              </div>

              {/* Group Content */}
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {groupMilestones.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-gray-500 text-sm mb-3">No milestones in this group</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onAddMilestone(group.id)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add First Milestone
                        </Button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-8"></TableHead>
                              {columns.map(col => (
                                <TableHead 
                                  key={col.id}
                                  style={{ width: col.width || 'auto' }}
                                >
                                  {col.title}
                                </TableHead>
                              ))}
                              <TableHead className="w-16">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <Droppable droppableId={`group-${group.id}`}>
                            {(provided) => (
                              <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                                {groupMilestones.map((milestone, index) => (
                                  <Draggable
                                    key={milestone.id}
                                    draggableId={milestone.id}
                                    index={index}
                                  >
                                    {(provided) => (
                                      <MilestoneRow
                                        milestone={milestone}
                                        columns={columns}
                                        onUpdate={onUpdateMilestone}
                                        onDelete={onDeleteMilestone}
                                        dragHandleProps={provided.dragHandleProps}
                                        innerRef={provided.innerRef}
                                        draggableProps={provided.draggableProps}
                                      />
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </TableBody>
                            )}
                          </Droppable>
                        </Table>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </DragDropContext>
    </div>
  );
}