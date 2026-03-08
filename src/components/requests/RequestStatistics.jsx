import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { 
  AlertCircle, CheckCircle, Clock, TrendingUp, 
  AlertTriangle, FileText, Hourglass 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function RequestStatistics({ clientId, refreshTrigger }) {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, [clientId, refreshTrigger]);

  const loadStatistics = async () => {
    try {
      const { data } = await base44.functions.invoke('getRequestAnalytics', {
        client_id: clientId || user.client_id
      });
      setStats(data.summary);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: "Total Requests",
      value: stats.total_requests,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Completed",
      value: stats.completed,
      subtitle: `${stats.completion_rate_percentage}% rate`,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "In Progress",
      value: stats.in_progress,
      icon: Hourglass,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      title: "Awaiting Approval",
      value: stats.awaiting_approval,
      icon: Clock,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "New Requests",
      value: stats.new,
      icon: TrendingUp,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50"
    },
    {
      title: "SLA Compliance",
      value: `${stats.sla_compliance_percentage}%`,
      subtitle: `${stats.sla_breaches} breaches`,
      icon: stats.sla_breaches > 0 ? AlertTriangle : CheckCircle,
      color: stats.sla_breaches > 0 ? "text-red-600" : "text-green-600",
      bgColor: stats.sla_breaches > 0 ? "bg-red-50" : "bg-green-50"
    },
    {
      title: "Avg Response Time",
      value: `${stats.avg_response_time_hours}h`,
      icon: Clock,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Stale Tickets",
      value: stats.stale_tickets,
      icon: AlertCircle,
      color: stats.stale_tickets > 0 ? "text-red-600" : "text-gray-600",
      bgColor: stats.stale_tickets > 0 ? "bg-red-50" : "bg-gray-50"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bgColor} p-2 rounded-lg`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold">{stat.value}</span>
                {stat.subtitle && (
                  <Badge variant="outline" className="text-xs">
                    {stat.subtitle}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}