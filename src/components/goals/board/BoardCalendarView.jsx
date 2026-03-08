import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { motion } from "framer-motion";

export default function BoardCalendarView({
  milestones,
  onUpdateMilestone,
  onDeleteMilestone,
  onAddMilestone
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get first day of week (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = monthStart.getDay();

  // Create array for calendar grid (including padding days)
  const calendarDays = [];
  
  // Add padding days from previous month
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }
  
  // Add actual days
  calendarDays.push(...daysInMonth);

  const getMilestonesForDate = (date) => {
    if (!date) return [];
    
    return milestones.filter(m => {
      const dueDate = m.data?.due_date;
      if (!dueDate) return false;
      
      try {
        return isSameDay(new Date(dueDate), date);
      } catch {
        return false;
      }
    });
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-700',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-orange-100 text-orange-700',
      critical: 'bg-red-100 text-red-700'
    };
    return colors[priority] || 'bg-gray-100';
  };

  const getStatusColor = (status) => {
    const colors = {
      not_started: 'bg-gray-500',
      working_on_it: 'bg-blue-500',
      done: 'bg-green-500',
      stuck: 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const dayMilestones = getMilestonesForDate(day);
            const isToday = isSameDay(day, new Date());
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            return (
              <motion.div
                key={day.toISOString()}
                whileHover={{ scale: 1.02 }}
                className={`aspect-square border rounded-lg p-2 cursor-pointer transition-all ${
                  !isSameMonth(day, currentMonth) ? 'opacity-50' : ''
                } ${isToday ? 'bg-blue-50 border-blue-500' : 'bg-white hover:bg-gray-50'} ${
                  isSelected ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedDate(day)}
              >
                <div className="flex flex-col h-full">
                  <div className={`text-sm font-medium mb-1 ${
                    isToday ? 'text-blue-600' : 'text-gray-900'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  
                  <div className="flex-1 space-y-1 overflow-y-auto">
                    {dayMilestones.slice(0, 3).map(milestone => (
                      <div
                        key={milestone.id}
                        className={`text-xs p-1 rounded truncate ${getPriorityColor(milestone.priority)}`}
                        title={milestone.title}
                      >
                        <div className="flex items-center gap-1">
                          <div 
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(milestone.status)}`}
                          />
                          <span className="truncate">{milestone.title}</span>
                        </div>
                      </div>
                    ))}
                    
                    {dayMilestones.length > 3 && (
                      <div className="text-xs text-gray-500 font-medium">
                        +{dayMilestones.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Card>

      {/* Selected Date Details */}
      {selectedDate && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </h3>
            <Button size="sm" onClick={() => onAddMilestone()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Milestone
            </Button>
          </div>

          {getMilestonesForDate(selectedDate).length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">
              No milestones scheduled for this date
            </p>
          ) : (
            <div className="space-y-2">
              {getMilestonesForDate(selectedDate).map(milestone => (
                <Card key={milestone.id} className="p-3 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">{milestone.title}</h4>
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityColor(milestone.priority)}>
                          {milestone.priority}
                        </Badge>
                        <Badge 
                          className={
                            milestone.status === 'done' ? 'bg-green-100 text-green-800' :
                            milestone.status === 'working_on_it' ? 'bg-blue-100 text-blue-800' :
                            milestone.status === 'stuck' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }
                        >
                          {milestone.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onDeleteMilestone(milestone.id)} className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}