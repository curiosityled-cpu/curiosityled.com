import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Target, ClipboardList, Eye, AlertCircle } from "lucide-react";

export default function ProgramAdminCard({ admin, onSelect }) {
  const workload = admin.workload || {};
  const totalWorkload = (workload.active_requests || 0) + 
                        (workload.upcoming_classes || 0) * 2 + 
                        (workload.coaching_sessions || 0) * 1.5;

  const getWorkloadColor = () => {
    if (totalWorkload > 15) return 'text-red-600';
    if (totalWorkload > 10) return 'text-orange-600';
    return 'text-green-600';
  };

  return (
    <Card className="hover:shadow-lg transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{admin.full_name}</h3>
            <p className="text-sm text-gray-500">{admin.email}</p>
            <p className="text-xs text-gray-400 mt-1">{admin.current_role || 'Program Admin'}</p>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${getWorkloadColor()}`}>
              {workload.active_requests || 0}
            </p>
            <p className="text-xs text-gray-500">Requests</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center p-2 bg-purple-50 rounded">
            <Calendar className="w-4 h-4 text-purple-600 mx-auto mb-1" />
            <p className="text-sm font-semibold">{workload.upcoming_classes || 0}</p>
            <p className="text-xs text-gray-600">Classes</p>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <Users className="w-4 h-4 text-green-600 mx-auto mb-1" />
            <p className="text-sm font-semibold">{workload.coaching_sessions || 0}</p>
            <p className="text-xs text-gray-600">Coaching</p>
          </div>
          <div className="text-center p-2 bg-orange-50 rounded">
            <Target className="w-4 h-4 text-orange-600 mx-auto mb-1" />
            <p className="text-sm font-semibold">{workload.active_goals || 0}</p>
            <p className="text-xs text-gray-600">Goals</p>
          </div>
        </div>

        {workload.overdue_requests > 0 && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <p className="text-sm text-red-800">
              {workload.overdue_requests} overdue
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-1 mb-3">
          {admin.specializations?.map(spec => (
            <Badge key={spec} variant="outline" className="text-xs">
              {spec.replace(/_/g, ' ')}
            </Badge>
          ))}
        </div>

        <Button
          onClick={onSelect}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <Eye className="w-4 h-4 mr-2" />
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}