import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Slider } from "@/components/ui/slider";
import AssigneeSelector from "./AssigneeSelector";
import DependencySelector from "./DependencySelector";

export default function CreateTaskModal({ isOpen, onClose, onSubmit, groupId, task, goalId, goalMembers = [] }) {
  const [formData, setFormData] = useState({
    title: "",
    priority: "medium",
    color: "#0073EA",
    notes: "",
    due_date: null,
    status: "not_started",
    progress: 0,
    assignees: [],
    depends_on: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || "",
        priority: task.priority || "medium",
        color: task.color || "#0073EA",
        notes: task.data?.notes || "",
        due_date: task.data?.due_date ? new Date(task.data.due_date) : null,
        status: task.data?.status || "not_started",
        progress: task.data?.progress || 0,
        assignees: task.assignees || [],
        depends_on: task.depends_on || []
      });
    } else {
      setFormData({
        title: "",
        priority: "medium",
        color: "#0073EA",
        notes: "",
        due_date: null,
        status: "not_started",
        progress: 0,
        assignees: [],
        depends_on: []
      });
    }
  }, [task, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const taskData = {
      title: formData.title,
      priority: formData.priority,
      color: formData.color,
      assignees: formData.assignees,
      depends_on: formData.depends_on,
      data: {
        notes: formData.notes,
        due_date: formData.due_date ? formData.due_date.toISOString() : null,
        status: formData.status,
        progress: formData.progress
      }
    };

    await onSubmit(taskData);
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Create New Task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add task details or notes..."
              rows={3}
            />
          </div>

          <AssigneeSelector
            value={formData.assignees}
            onChange={(assignees) => setFormData({ ...formData, assignees })}
            goalMembers={goalMembers}
          />

          <DependencySelector
            value={formData.depends_on}
            onChange={(depends_on) => setFormData({ ...formData, depends_on })}
            goalId={goalId}
            currentTaskId={task?.id}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.due_date ? format(formData.due_date, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.due_date}
                  onSelect={(date) => setFormData({ ...formData, due_date: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Progress</Label>
              <span className="text-sm font-medium text-[#0073EA]">{formData.progress}%</span>
            </div>
            <Slider
              value={[formData.progress]}
              onValueChange={(value) => setFormData({ ...formData, progress: value[0] })}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {['#0073EA', '#00C875', '#FFCB00', '#E2445C', '#9D99B9', '#FF5AC4', '#784BD1', '#225091'].map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === color ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.title.trim()}
              className="flex-1 bg-[#0073EA] hover:bg-[#0056B3]"
            >
              {isSubmitting ? "Saving..." : task ? "Update Task" : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}