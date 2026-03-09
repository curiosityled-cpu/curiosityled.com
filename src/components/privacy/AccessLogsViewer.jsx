import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Search, Download } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function AccessLogsViewer({ user, canViewOthers = false }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState("");
  const [filteredLogs, setFilteredLogs] = useState([]);

  useEffect(() => {
    loadLogs();
  }, [user]);

  useEffect(() => {
    if (searchEmail) {
      setFilteredLogs(logs.filter(log => 
        log.target_user_email?.toLowerCase().includes(searchEmail.toLowerCase()) ||
        log.initiator_user_email?.toLowerCase().includes(searchEmail.toLowerCase())
      ));
    } else {
      setFilteredLogs(logs);
    }
  }, [searchEmail, logs]);

  const loadLogs = async () => {
    if (!user?.email) return;
    
    try {
      setLoading(true);
      
      let query = {};
      if (canViewOthers) {
        // Admins can see all logs for their org
        query = { "metadata.client_id": user.client_id };
      } else {
        // Regular users see only their own access logs
        query = { 
          $or: [
            { target_user_email: user.email },
            { initiator_user_email: user.email }
          ]
        };
      }

      const activityLogs = await base44.entities.ActivityLog.filter(
        query,
        '-timestamp',
        100
      );

      setLogs(activityLogs);
      setFilteredLogs(activityLogs);
    } catch (error) {
      console.error("Error loading access logs:", error);
      toast.error("Failed to load access logs");
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = () => {
    const csv = [
      ["Timestamp", "Action", "Initiator", "Target", "Details"],
      ...filteredLogs.map(log => [
        format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss"),
        log.action_type,
        log.initiator_user_email,
        log.target_user_email || "N/A",
        JSON.stringify(log.metadata || {})
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `access-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    toast.success("Access logs exported");
  };

  const getActionBadgeColor = (actionType) => {
    if (actionType.includes("LOGIN") || actionType.includes("ACCESS")) return "bg-green-100 text-green-800";
    if (actionType.includes("DELETE") || actionType.includes("REMOVE")) return "bg-red-100 text-red-800";
    if (actionType.includes("UPDATE") || actionType.includes("CHANGE")) return "bg-blue-100 text-blue-800";
    if (actionType.includes("PHI") || actionType.includes("ALERT")) return "bg-orange-100 text-orange-800";
    return "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0202ff]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Export */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
          <Search className="w-5 h-5 text-gray-400" />
          <Input
            placeholder={canViewOthers ? "Search by email..." : "Search logs..."}
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Button
          variant="outline"
          onClick={exportLogs}
          className="gap-2"
          disabled={filteredLogs.length === 0}
        >
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Access Activity Logs
          </CardTitle>
          <CardDescription>
            {canViewOthers 
              ? "View all access activity for your organization"
              : "View activity related to your account"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Eye className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No access logs found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getActionBadgeColor(log.action_type)}>
                        {log.action_type.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {format(new Date(log.timestamp), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="font-medium">Initiator:</span>{" "}
                      <span className="text-gray-700">{log.initiator_user_email}</span>
                    </p>
                    {log.target_user_email && (
                      <p>
                        <span className="font-medium">Target:</span>{" "}
                        <span className="text-gray-700">{log.target_user_email}</span>
                      </p>
                    )}
                    {log.old_value && (
                      <p>
                        <span className="font-medium">Old Value:</span>{" "}
                        <span className="text-gray-700">{log.old_value}</span>
                      </p>
                    )}
                    {log.new_value && (
                      <p>
                        <span className="font-medium">New Value:</span>{" "}
                        <span className="text-gray-700">{log.new_value}</span>
                      </p>
                    )}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-[#0202ff] hover:underline">
                          View Details
                        </summary>
                        <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}