import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";

const priorityColors = {
  low: "bg-blue-100 text-blue-800 border-blue-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  critical: "bg-red-100 text-red-800 border-red-200"
};

const statusColors = {
  not_started: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  on_hold: "bg-yellow-100 text-yellow-800"
};

export default function TimelineView({ milestones = [], onEditTask, onDeleteTask }) {
  const sortedMilestones = [...milestones].sort((a, b) => {
    const dateA = a.data?.due_date ? new Date(a.data.due_date) : new Date('2099-12-31');
    const dateB = b.data?.due_date ? new Date(b.data.due_date) : new Date('2099-12-31');
    return dateA - dateB;
  });

  const milestonesWithDates = sortedMilestones.filter(milestone => milestone.data?.due_date);
  const milestonesWithoutDates = sortedMilestones.filter(milestone => !milestone.data?.due_date);

  return (
    <div className="bg-white rounded-xl border border-[#E1E5F3] p-6">
      <h2 className="text-xl font-semibold text-[#323338] mb-6">Timeline View</h2>
      
      <div className="space-y-6">
        {milestonesWithDates.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase">Scheduled Tasks</h3>
            <div className="relative pl-8 space-y-4">
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-300" />
              
              {milestonesWithDates.map((milestone, index) => {
                const dueDate = milestone.data?.due_date ? parseISO(milestone.data.due_date) : null;
                
                return (
                  <div key={milestone.id} className="relative">
                    <div className="absolute -left-[26px] w-4 h-4 rounded-full bg-[#0073EA] border-2 border-white shadow" />
                    
                    <div
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      style={{ borderLeft: `3px solid ${milestone.color || '#0073EA'}` }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {dueDate && (
                              <span className="text-sm font-medium text-gray-600">
                                {format(dueDate, 'MMM d, yyyy')}
                              </span>
                            )}
                            {milestone.data?.status && (
                              <Badge className={`${statusColors[milestone.data.status]} text-xs`}>
                                {milestone.data.status.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                          
                          <h4 className="font-semibold text-[#323338] mb-1">{milestone.title}</h4>
                          
                          {milestone.data?.notes && (
                            <p className="text-sm text-gray-500 mb-3">{milestone.data.notes}</p>
                          )}
                          
                          <div className="flex items-center gap-2">
                            <Badge className={`${priorityColors[milestone.priority]} border text-xs`}>
                              {milestone.priority}
                            </Badge>
                            
                            {milestone.data?.progress !== undefined && (
                              <div className="flex items-center gap-2 flex-1 max-w-xs">
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
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
                        
                        <div className="flex items-center gap-1 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditTask(milestone)}
                            className="text-gray-400 hover:text-[#0073EA] h-8 w-8 p-0"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteTask(milestone.id)}
                            className="text-gray-400 hover:text-red-600 h-8 w-8 p-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {milestonesWithoutDates.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase">Unscheduled Tasks</h3>
            <div className="space-y-2">
              {milestonesWithoutDates.map((milestone) => (
                <div
                  key={milestone.id}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
                  style={{ borderLeft: `3px solid ${milestone.color || '#0073EA'}` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-[#323338] mb-1">{milestone.title}</h4>
                      <div className="flex items-center gap-2">
                        <Badge className={`${priorityColors[milestone.priority]} border text-xs`}>
                          {milestone.priority}
                        </Badge>
                        {milestone.data?.status && (
                          <Badge className={`${statusColors[milestone.data.status]} text-xs`}>
                            {milestone.data.status.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditTask(milestone)}
                        className="text-gray-400 hover:text-[#0073EA] h-8 w-8 p-0"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteTask(milestone.id)}
                        className="text-gray-400 hover:text-red-600 h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {milestones.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>No tasks to display in timeline</p>
          </div>
        )}
      </div>
    </div>
  );
}