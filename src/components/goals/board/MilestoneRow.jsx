import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MoreVertical, Trash2, GripVertical, Calendar as CalendarIcon, Save, X } from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function MilestoneRow({ 
  milestone, 
  columns, 
  onUpdate, 
  onDelete,
  dragHandleProps,
  innerRef,
  draggableProps
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    title: milestone.title,
    status: milestone.status,
    priority: milestone.priority,
    data: { ...milestone.data }
  });

  const handleSave = () => {
    onUpdate(milestone.id, editedData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedData({
      title: milestone.title,
      status: milestone.status,
      priority: milestone.priority,
      data: { ...milestone.data }
    });
    setIsEditing(false);
  };

  const renderCell = (column) => {
    const value = column.id === 'title' ? milestone.title : 
                  column.id === 'status' ? milestone.status :
                  column.id === 'priority' ? milestone.priority :
                  milestone.data?.[column.id];

    if (isEditing) {
      switch (column.type) {
        case 'text':
          return (
            <Input
              value={column.id === 'title' ? editedData.title : editedData.data[column.id] || ''}
              onChange={(e) => {
                if (column.id === 'title') {
                  setEditedData({ ...editedData, title: e.target.value });
                } else {
                  setEditedData({
                    ...editedData,
                    data: { ...editedData.data, [column.id]: e.target.value }
                  });
                }
              }}
              className="h-8"
            />
          );

        case 'status':
          return (
            <Select
              value={editedData.status}
              onValueChange={(val) => setEditedData({ ...editedData, status: val })}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {column.options?.map(opt => (
                  <SelectItem key={opt} value={opt}>
                    {opt.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );

        case 'priority':
          return (
            <Select
              value={editedData.priority}
              onValueChange={(val) => setEditedData({ ...editedData, priority: val })}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {column.options?.map(opt => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );

        case 'date':
          return (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {editedData.data[column.id] 
                    ? format(new Date(editedData.data[column.id]), 'MMM d, yyyy')
                    : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={editedData.data[column.id] ? new Date(editedData.data[column.id]) : undefined}
                  onSelect={(date) => {
                    setEditedData({
                      ...editedData,
                      data: { ...editedData.data, [column.id]: date?.toISOString() }
                    });
                  }}
                />
              </PopoverContent>
            </Popover>
          );

        case 'number':
        case 'budget':
          return (
            <Input
              type="number"
              value={editedData.data[column.id] || ''}
              onChange={(e) => setEditedData({
                ...editedData,
                data: { ...editedData.data, [column.id]: parseFloat(e.target.value) || 0 }
              })}
              className="h-8"
            />
          );

        case 'checkbox':
          return (
            <input
              type="checkbox"
              checked={editedData.data[column.id] || false}
              onChange={(e) => setEditedData({
                ...editedData,
                data: { ...editedData.data, [column.id]: e.target.checked }
              })}
              className="w-4 h-4"
            />
          );

        case 'dropdown':
          return (
            <Select
              value={editedData.data[column.id] || ''}
              onValueChange={(val) => setEditedData({
                ...editedData,
                data: { ...editedData.data, [column.id]: val }
              })}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {column.options?.map(opt => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );

        default:
          return (
            <Input
              value={editedData.data[column.id] || ''}
              onChange={(e) => setEditedData({
                ...editedData,
                data: { ...editedData.data, [column.id]: e.target.value }
              })}
              className="h-8"
            />
          );
      }
    }

    // Display mode
    switch (column.type) {
      case 'status':
        const statusColors = {
          'not_started': 'bg-gray-100 text-gray-800',
          'working_on_it': 'bg-blue-100 text-blue-800',
          'done': 'bg-green-100 text-green-800',
          'stuck': 'bg-red-100 text-red-800'
        };
        return (
          <Badge className={statusColors[value] || 'bg-gray-100 text-gray-800'}>
            {value?.replace('_', ' ')}
          </Badge>
        );

      case 'priority':
        const priorityColors = {
          'low': 'border-gray-300 text-gray-700',
          'medium': 'border-yellow-500 text-yellow-700',
          'high': 'border-orange-500 text-orange-700',
          'critical': 'border-red-500 text-red-700'
        };
        return (
          <Badge variant="outline" className={priorityColors[value] || 'border-gray-300'}>
            {value}
          </Badge>
        );

      case 'date':
        return value ? (
          <span className="text-sm text-gray-700">
            {format(new Date(value), 'MMM d, yyyy')}
          </span>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        );

      case 'budget':
        return value ? (
          <span className="text-sm text-gray-700">
            ${parseFloat(value).toLocaleString()}
          </span>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        );

      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={value || false}
            disabled
            className="w-4 h-4"
          />
        );

      default:
        return (
          <span className="text-sm text-gray-700">
            {value || '-'}
          </span>
        );
    }
  };

  return (
    <tr 
      ref={innerRef} 
      {...draggableProps}
      className="border-b hover:bg-gray-50"
    >
      {/* Drag Handle */}
      <td className="p-2 w-8">
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
      </td>

      {/* Columns */}
      {columns.map((column) => (
        <td 
          key={column.id} 
          className="p-2"
          style={{ width: column.width || 'auto' }}
        >
          {renderCell(column)}
        </td>
      ))}

      {/* Actions */}
      <td className="p-2 w-16">
        {isEditing ? (
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={handleSave} className="h-8 w-8">
              <Save className="w-4 h-4 text-green-600" />
            </Button>
            <Button size="icon" variant="ghost" onClick={handleCancel} className="h-8 w-8">
              <X className="w-4 h-4 text-gray-600" />
            </Button>
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(milestone.id)} 
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </td>
    </tr>
  );
}