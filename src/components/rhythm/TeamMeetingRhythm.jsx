/**
 * TeamMeetingRhythm
 * Shows 1:1 cadence and meeting load from UserActivity data on the Team page.
 */
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, AlertCircle } from "lucide-react";

export default function TeamMeetingRhythm() {
  const { user } = useAuth();

  const { data: activities = [] } = useQuery({
    queryKey: ["team-activity", user?.email],
    queryFn: async () => {
      const rows = await base44.entities.UserActivity.filter(
        { user_email: user.email }, "-date", 14
      );
      return rows;
    },
    enabled: !!user?.email,
    staleTime: 15 * 60 * 1000,
  });

  if (activities.length === 0) return null;

  const avg1on1 = activities.reduce((s, a) => s + (a.one_to_one_count || 0), 0) / activities.length;
  const avgMeetingMins = activities.reduce((s, a) => s + (a.meeting_minutes_day || 0), 0) / activities.length;
  const avgB2B = activities.reduce((s, a) => s + (a.back_to_back_density || 0), 0) / activities.length;

  const loadSignal = avgMeetingMins > 300 ? "high" : avgMeetingMins > 180 ? "moderate" : "light";
  const LOAD_COLORS = { high: "text-rose-600 bg-rose-50", moderate: "text-amber-600 bg-amber-50", light: "text-emerald-600 bg-emerald-50" };

  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-2 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
        </div>
        <p className="text-sm font-semibold text-gray-900">Calendar signals</p>
        <span className="text-[10px] text-gray-400 ml-auto">Last 14 days</span>
      </div>
      <CardContent className="px-5 pt-2 pb-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-xl font-bold text-gray-900">{avg1on1.toFixed(1)}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">avg 1:1s/day</p>
          </div>
          <div className={`text-center p-3 rounded-xl ${LOAD_COLORS[loadSignal]}`}>
            <p className="text-xl font-bold">{Math.round(avgMeetingMins / 60)}h</p>
            <p className="text-[10px] mt-0.5">avg meeting/day</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-xl font-bold text-gray-900">{Math.round(avgB2B * 100)}%</p>
            <p className="text-[10px] text-gray-500 mt-0.5">back-to-back</p>
          </div>
        </div>

        {avgB2B > 0.5 && (
          <div className="flex items-start gap-2 mt-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              High back-to-back density detected. Consider adding buffer time between meetings to improve decision quality.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}