import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Clock, User, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ImpersonationHistoryTab({ userEmail }) {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    loadHistory();
  }, [userEmail]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('getImpersonationHistory', {
        userEmail,
        limit: 50
      });

      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error loading impersonation history:', error);
      toast.error('Failed to load impersonation history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
        <p className="text-sm text-gray-600">Loading impersonation history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Impersonation History</h3>
          <p className="text-sm text-gray-600">
            Audit trail of all impersonation sessions for this user
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadHistory}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Eye className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-600">No impersonation sessions recorded</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id} className="border-l-4 border-purple-500">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-sm">
                      {log.admin_email}
                    </span>
                  </div>
                  {log.ended_at ? (
                    <Badge className="bg-gray-100 text-gray-800">
                      Completed
                    </Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-800">
                      Active
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-3 h-3" />
                    Started: {format(new Date(log.started_at), 'MMM d, yyyy h:mm a')}
                  </div>
                  
                  {log.ended_at && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-3 h-3" />
                      Ended: {format(new Date(log.ended_at), 'MMM d, h:mm a')}
                    </div>
                  )}

                  {log.duration_minutes && (
                    <div className="text-gray-600">
                      Duration: {log.duration_minutes} minutes
                    </div>
                  )}

                  {log.ip_address && (
                    <div className="text-gray-600">
                      IP: {log.ip_address}
                    </div>
                  )}
                </div>

                {log.reason && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-600 mb-1">Reason:</p>
                    <p className="text-sm bg-purple-50 p-2 rounded border border-purple-200">
                      {log.reason}
                    </p>
                  </div>
                )}

                {log.actions_performed && log.actions_performed.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-600 mb-2">Actions Performed:</p>
                    <div className="space-y-1">
                      {log.actions_performed.slice(0, 5).map((action, idx) => (
                        <div key={idx} className="text-xs text-gray-700 bg-gray-50 p-2 rounded">
                          {action.action} - {action.timestamp && format(new Date(action.timestamp), 'h:mm a')}
                        </div>
                      ))}
                      {log.actions_performed.length > 5 && (
                        <p className="text-xs text-gray-500">
                          +{log.actions_performed.length - 5} more actions
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}