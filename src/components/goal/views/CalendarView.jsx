import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Edit, Trash2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO, isToday } from "date-fns";

const priorityColors = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800"
};

export default function CalendarView({ milestones = [], onEditTask, onDeleteTask }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startDayOfWeek = monthStart.getDay();
  const leadingEmptyDays = Array(startDayOfWeek).fill(null);

  const getTasksForDay = (day) => {
    return milestones.filter(milestone => {
      if (!milestone.data?.due_date) return false;
      try {
        return isSameDay(parseISO(milestone.data.due_date), day);
      } catch {
        return false;
      }
    });
  };

  return (
    <div className="bg-white rounded-xl border border-[#E1E5F3] p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#323338]">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-semibold text-sm text-gray-600 py-2">
            {day}
          </div>
        ))}

        {leadingEmptyDays.map((_, idx) => (
          <div key={`empty-${idx}`} className="min-h-[120px] bg-gray-50 rounded-lg" />
        ))}

        {daysInMonth.map(day => {
          const tasksForDay = getTasksForDay(day);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={day.toString()}
              className={`min-h-[120px] border rounded-lg p-2 ${
                isCurrentDay ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'
              }`}
            >
              <div className={`text-sm font-semibold mb-2 ${isCurrentDay ? 'text-blue-600' : 'text-gray-600'}`}>
                {format(day, 'd')}
              </div>
              
              <div className="space-y-1">
                {tasksForDay.slice(0, 2).map(task => (
                  <div
                    key={task.id}
                    className={`text-xs p-1.5 rounded ${priorityColors[task.priority]} cursor-pointer hover:opacity-80 truncate`}
                    onClick={() => onEditTask(task)}
                  >
                    {task.title}
                  </div>
                ))}
                {tasksForDay.length > 2 && (
                  <div className="text-xs text-gray-500 pl-1.5">
                    +{tasksForDay.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}