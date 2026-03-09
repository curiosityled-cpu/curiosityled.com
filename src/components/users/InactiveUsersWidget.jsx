import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Loader2, Mail, UserX } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format } from "date-fns";

export default function InactiveUsersWidget({ onUserClick }) {
  const [loading, setLoading] = useState(true);
  const [inactiveData, setInactiveData] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadInactiveUsers();
  }, []);

  const loadInactiveUsers = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('identifyInactiveUsers', {
        inactiveDays: 30,
        includeNeverLoggedIn: true
      });

      if (data.success) {
        setInactiveData(data);
      }
    } catch (error) {
      console.error('Error loading inactive users:', error);
      toast.error('Failed to load inactive users');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (!inactiveData || inactiveData.summary.total_inactive === 0) {
    return (
      <Card className="border-2 border-green-200">
        <CardContent className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <UserX className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-sm font-medium text-gray-900">All Users Active</p>
          <p className="text-xs text-gray-600">No inactive users detected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-amber-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Inactive Users
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={loadInactiveUsers}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-amber-50 rounded-lg">
            <p className="text-2xl font-bold text-amber-900">
              {inactiveData.summary.total_inactive}
            </p>
            <p className="text-xs text-amber-700">Total Inactive</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-2xl font-bold text-red-900">
              {inactiveData.summary.inactive_90_plus_days}
            </p>
            <p className="text-xs text-red-700">90+ Days</p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span className="text-gray-600">Never logged in:</span>
            <Badge variant="outline">{inactiveData.summary.never_logged_in}</Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span className="text-gray-600">30-60 days:</span>
            <Badge variant="outline">{inactiveData.summary.inactive_30_60_days}</Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span className="text-gray-600">60-90 days:</span>
            <Badge variant="outline">{inactiveData.summary.inactive_60_90_days}</Badge>
          </div>
        </div>

        {!expanded && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded(true)}
            className="w-full"
          >
            View Inactive Users
          </Button>
        )}

        {expanded && (
          <div className="space-y-3 pt-3 border-t max-h-96 overflow-y-auto">
            {inactiveData.users.never_logged_in.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2">Never Logged In</h4>
                {inactiveData.users.never_logged_in.map(u => (
                  <div
                    key={u.email}
                    onClick={() => onUserClick?.(u.email)}
                    className="p-2 bg-red-50 rounded border border-red-200 mb-2 cursor-pointer hover:bg-red-100"
                  >
                    <p className="text-sm font-medium">{u.full_name}</p>
                    <p className="text-xs text-gray-600">{u.email}</p>
                    {u.days_since_signup && (
                      <p className="text-xs text-red-600 mt-1">
                        Invited {u.days_since_signup} days ago
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {inactiveData.users.inactive_90_plus_days.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2">Inactive 90+ Days</h4>
                {inactiveData.users.inactive_90_plus_days.slice(0, 5).map(u => (
                  <div
                    key={u.email}
                    onClick={() => onUserClick?.(u.email)}
                    className="p-2 bg-amber-50 rounded border border-amber-200 mb-2 cursor-pointer hover:bg-amber-100"
                  >
                    <p className="text-sm font-medium">{u.full_name}</p>
                    <p className="text-xs text-gray-600">{u.email}</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Last login: {u.days_inactive} days ago
                    </p>
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(false)}
              className="w-full"
            >
              Show Less
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}