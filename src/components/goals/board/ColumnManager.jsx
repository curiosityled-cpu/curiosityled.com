import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function ColumnManager({ open, onClose, columns, onSave }) {
  const [localColumns, setLocalColumns] = useState([...columns]);
  const [editingColumn, setEditingColumn] = useState(null);

  const handleAddColumn = () => {
    const newColumn = {
      id: `col-${Date.now()}`,
      title: 'New Column',
      type: 'text',
      width: 150,
      options: []
    };
    setLocalColumns([...localColumns, newColumn]);
    setEditingColumn(newColumn.id);
  };

  const handleUpdateColumn = (columnId, updates) => {
    setLocalColumns(localColumns.map(col => 
      col.id === columnId ? { ...col, ...updates } : col
    ));
  };

  const handleDeleteColumn = (columnId) => {
    setLocalColumns(localColumns.filter(col => col.id !== columnId));
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(localColumns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setLocalColumns(items);
  };

  const handleSave = () => {
    onSave(localColumns);
    onClose();
  };

  const columnTypes = [
    { value: 'text', label: 'Text' },
    { value: 'status', label: 'Status' },
    { value: 'priority', label: 'Priority' },
    { value: 'date', label: 'Date' },
    { value: 'people', label: 'People' },
    { value: 'number', label: 'Number' },
    { value: 'budget', label: 'Budget' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'dropdown', label: 'Dropdown' },
    { value: 'tags', label: 'Tags' }
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Columns</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="columns">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                  {localColumns.map((column, index) => (
                    <Draggable key={column.id} draggableId={column.id} index={index}>
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
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs">Column Title</Label>
                                  <Input
                                    value={column.title}
                                    onChange={(e) => handleUpdateColumn(column.id, { title: e.target.value })}
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Type</Label>
                                  <Select
                                    value={column.type}
                                    onValueChange={(value) => handleUpdateColumn(column.id, { type: value })}
                                  >
                                    <SelectTrigger className="mt-1">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {columnTypes.map(type => (
                                        <SelectItem key={type.value} value={type.value}>
                                          {type.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div>
                                <Label className="text-xs">Width (px)</Label>
                                <Input
                                  type="number"
                                  value={column.width}
                                  onChange={(e) => handleUpdateColumn(column.id, { width: parseInt(e.target.value) })}
                                  className="mt-1 w-32"
                                />
                              </div>

                              {['status', 'priority', 'dropdown'].includes(column.type) && (
                                <div>
                                  <Label className="text-xs">Options (comma-separated)</Label>
                                  <Input
                                    value={column.options?.join(', ') || ''}
                                    onChange={(e) => handleUpdateColumn(column.id, { 
                                      options: e.target.value.split(',').map(o => o.trim()).filter(Boolean)
                                    })}
                                    placeholder="e.g., Option 1, Option 2, Option 3"
                                    className="mt-1"
                                  />
                                </div>
                              )}
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteColumn(column.id)}
                              className="text-red-600"
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
            onClick={handleAddColumn}
            variant="outline"
            className="w-full mt-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Column
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