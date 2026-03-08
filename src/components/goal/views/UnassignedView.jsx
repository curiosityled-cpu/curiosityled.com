import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, UserPlus } from "lucide-react";

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

export default function UnassignedView({ milestones = [], onEditTask, onDeleteTask }) {
  const unassignedMilestones = milestones.filter(milestone => !milestone.data?.owner || milestone.data.owner.length === 0);

  return (
    <div className="bg-white rounded-xl border border-[#E1E5F3] p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#323338]">Unassigned Tasks</h2>
          <p className="text-sm text-gray-500 mt-1">
            {unassignedMilestones.length} {unassignedMilestones.length === 1 ? 'task' : 'tasks'} without an owner
          </p>
        </div>
      </div>

      {unassignedMilestones.length > 0 ? (
        <div className="space-y-3">
          {unassignedMilestones.map((milestone) => (
            <div
              key={milestone.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              style={{ borderLeft: `3px solid ${milestone.color || '#0073EA'}` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-[#323338] mb-2">{milestone.title}</h4>
                  
                  {milestone.data?.notes && (
                    <p className="text-sm text-gray-500 mb-3">{milestone.data.notes}</p>
                  )}
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`${priorityColors[milestone.priority]} border text-xs`}>
                      {milestone.priority}
                    </Badge>
                    
                    {milestone.data?.status && (
                      <Badge className={`${statusColors[milestone.data.status]} text-xs`}>
                        {milestone.data.status.replace('_', ' ')}
                      </Badge>
                    )}
                    
                    {milestone.data?.due_date && (
                      <span className="text-xs text-gray-500">
                        Due: {new Date(milestone.data.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {milestone.data?.progress !== undefined && (
                    <div className="flex items-center gap-2 mt-3">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden max-w-xs">
                        <div 
                          className="h-full bg-[#0073EA] transition-all"
                          style={{ width: `${milestone.data.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{milestone.data.progress}%</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-1 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditTask(milestone)}
                    className="text-[#0073EA] hover:bg-[#0073EA]/10 h-8"
                  >
                    <UserPlus className="w-3 h-3 mr-1" />
                    Assign
                  </Button>
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
      ) : (
        <div className="text-center py-12 text-gray-400">
          <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">All tasks are assigned!</p>
          <p className="text-sm">There are no unassigned tasks at the moment.</p>
        </div>
      )}
    </div>
  );
}