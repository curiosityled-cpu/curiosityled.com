import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Award,
  Target
} from "lucide-react";
import { format, differenceInDays, differenceInHours } from "date-fns";

export default function ProgramAdminPerformance({ requests, programAdmins }) {
  const adminMetrics = useMemo(() => {
    return programAdmins.map(admin => {
      const adminRequests = requests.filter(r => r.assigned_to_email === admin.email);
      const completedRequests = adminRequests.filter(r => r.status === 'completed');
      const inProgressRequests = adminRequests.filter(r => r.status === 'in_progress');
      const staleRequests = adminRequests.filter(r => {
        if (!['assigned', 'in_progress'].includes(r.status)) return false;
        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        return new Date(r.updated_date) < fourteenDaysAgo;
      });

      // Calculate average time to first response
      const responseTimes = adminRequests
        .filter(r => r.first_response_at)
        .map(r => differenceInHours(new Date(r.first_response_at), new Date(r.created_date)));
      
      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : null;

      // Calculate average completion time
      const completionTimes = completedRequests
        .filter(r => r.completed_at)
        .map(r => differenceInDays(new Date(r.completed_at), new Date(r.created_date)));
      
      const avgCompletionTime = completionTimes.length > 0
        ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
        : null;

      const completionRate = adminRequests.length > 0
        ? (completedRequests.length / adminRequests.length) * 100
        : 0;

      return {
        admin,
        total: adminRequests.length,
        completed: completedRequests.length,
        inProgress: inProgressRequests.length,
        stale: staleRequests.length,
        avgResponseTime,
        avgCompletionTime,
        completionRate
      };
    });
  }, [requests, programAdmins]);

  // Sort by total requests descending
  const sortedMetrics = adminMetrics.sort((a, b) => b.total - a.total);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5 text-purple-600" />
          Program Admin Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedMetrics.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No assigned requests yet</p>
          ) : (
            sortedMetrics.map(metric => (
              <Card key={metric.admin.id} className="border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold">{metric.admin.full_name || metric.admin.email}</p>
                      {metric.admin.specializations && metric.admin.specializations.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {metric.admin.specializations.slice(0, 3).map(spec => (
                            <Badge key={spec} variant="outline" className="text-xs">
                              {spec.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">
                      {metric.total} Total
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div className="text-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
                      <p className="text-lg font-bold">{metric.completed}</p>
                      <p className="text-xs text-gray-600">Completed</p>
                    </div>
                    <div className="text-center">
                      <Clock className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
                      <p className="text-lg font-bold">{metric.inProgress}</p>
                      <p className="text-xs text-gray-600">In Progress</p>
                    </div>
                    <div className="text-center">
                      <AlertCircle className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                      <p className="text-lg font-bold">{metric.stale}</p>
                      <p className="text-xs text-gray-600">Stale (14d)</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Completion Rate</span>
                        <span>{metric.completionRate.toFixed(0)}%</span>
                      </div>
                      <Progress value={metric.completionRate} className="h-2" />
                    </div>

                    {metric.avgResponseTime !== null && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Avg Response Time</span>
                        <span className="font-medium">{metric.avgResponseTime.toFixed(1)}h</span>
                      </div>
                    )}

                    {metric.avgCompletionTime !== null && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Avg Completion Time</span>
                        <span className="font-medium">{metric.avgCompletionTime.toFixed(1)} days</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}