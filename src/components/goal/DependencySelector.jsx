import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function DependencySelector({ value = [], onChange, goalId, currentTaskId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadTasks();
    }
  }, [isOpen, goalId]);

  const loadTasks = async () => {
    try {
      const allTasks = await base44.entities.Item.filter({ board_id: goalId });
      // Exclude current task from dependencies
      const availableTasks = allTasks.filter(t => t.id !== currentTaskId);
      setTasks(availableTasks);
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  };

  const handleToggleTask = (taskId) => {
    if (value.includes(taskId)) {
      onChange(value.filter(id => id !== taskId));
    } else {
      onChange([...value, taskId]);
    }
  };

  const getTaskById = (taskId) => tasks.find(t => t.id === taskId);

  const filteredTasks = tasks.filter(task =>
    task.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative">
      <div className="mb-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-gray-400" />
          Dependencies
        </label>
        <div className="flex flex-wrap gap-2 mt-2">
          {value.length === 0 ? (
            <span className="text-sm text-gray-400">No dependencies</span>
          ) : (
            value.map((taskId) => {
              const task = getTaskById(taskId);
              return task ? (
                <div
                  key={taskId}
                  className="flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs"
                >
                  <span>{task.title}</span>
                  <button
                    onClick={() => handleToggleTask(taskId)}
                    className="hover:text-orange-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : null;
            })
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          This task cannot start until dependencies are completed
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full"
      >
        {isOpen ? "Close" : "Add Dependencies"}
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-lg shadow-lg z-10 max-h-64 overflow-hidden flex flex-col">
          <div className="p-2 border-b">
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="overflow-y-auto">
            {filteredTasks.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No tasks available
              </div>
            ) : (
              filteredTasks.map(task => {
                const isSelected = value.includes(task.id);
                const statusLabel = task.data?.status?.replace('_', ' ') || 'not started';
                
                return (
                  <div
                    key={task.id}
                    onClick={() => handleToggleTask(task.id)}
                    className={`p-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
                      isSelected ? 'bg-orange-50' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-gray-500 capitalize">
                        Status: {statusLabel}
                      </p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-orange-600" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}