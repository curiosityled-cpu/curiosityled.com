import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const colorOptions = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

export default function GroupManager({ open, onClose, groups, onSave }) {
  const [localGroups, setLocalGroups] = useState([...groups]);

  const handleAddGroup = () => {
    const newGroup = {
      id: `group-${Date.now()}`,
      title: 'New Group',
      color: colorOptions[localGroups.length % colorOptions.length],
      collapsed: false,
      hidden_columns: []
    };
    setLocalGroups([...localGroups, newGroup]);
  };

  const handleUpdateGroup = (groupId, updates) => {
    setLocalGroups(localGroups.map(grp => 
      grp.id === groupId ? { ...grp, ...updates } : grp
    ));
  };

  const handleDeleteGroup = (groupId) => {
    if (localGroups.length <= 1) {
      alert('You must have at least one group');
      return;
    }
    setLocalGroups(localGroups.filter(grp => grp.id !== groupId));
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(localGroups);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setLocalGroups(items);
  };

  const handleSave = () => {
    onSave(localGroups);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Groups</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="groups">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                  {localGroups.map((group, index) => (
                    <Draggable key={group.id} draggableId={group.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="bg-white border rounded-lg p-4"
                        >
                          <div className="flex items-start gap-3">
                            <div {...provided.dragHandleProps} className="pt-2">
                              <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
                            </div>

                            <div className="flex-1 space-y-3">
                              <div>
                                <Label className="text-xs">Group Title</Label>
                                <Input
                                  value={group.title}
                                  onChange={(e) => handleUpdateGroup(group.id, { title: e.target.value })}
                                  className="mt-1"
                                />
                              </div>

                              <div>
                                <Label className="text-xs">Color</Label>
                                <div className="flex gap-2 mt-2">
                                  {colorOptions.map(color => (
                                    <button
                                      key={color}
                                      onClick={() => handleUpdateGroup(group.id, { color })}
                                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                                        group.color === color ? 'border-gray-900 scale-110' : 'border-gray-200'
                                      }`}
                                      style={{ backgroundColor: color }}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteGroup(group.id)}
                              className="text-red-600"
                              disabled={localGroups.length <= 1}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <Button
            onClick={handleAddGroup}
            variant="outline"
            className="w-full mt-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Group
          </Button>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}