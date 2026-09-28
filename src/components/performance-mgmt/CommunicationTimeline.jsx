import React from "react";
import { Mail, Calendar, CheckCircle2, Clock, Bell, Scale, FileText } from "lucide-react";

const TIMELINE_PHASES = [
  { day: -30, label: "Cycle Announcement", icon: Mail, description: "Notify all participants of timeline" },
  { day: -21, label: "Roster Confirmed", icon: CheckCircle2, description: "Forms distributed to participants" },
  { day: -14, label: "Self-Assessment Opens", icon: Bell, description: "Employees begin self-assessment" },
  { day: -7, label: "Self-Assessment Due", icon: Clock, description: "Reminder sent to non-submitters" },
  { day: 0, label: "Manager Review Opens", icon: Calendar, description: "Managers begin reviews" },
  { day: 3, label: "Calibration Session", icon: Scale, description: "Ratings aligned across org" },
  { day: 7, label: "Acknowledgment Opens", icon: Bell, description: "Employees review final ratings" },
  { day: 14, label: "Cycle Closes", icon: FileText, description: "Final records archived" },
];

export default function CommunicationTimeline({ periodEnd }) {
  const endDate = periodEnd ? new Date(periodEnd) : null;

  return (
    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/30">
      <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Communication Timeline</h4>
      <p className="text-[10px] text-gray-400 mb-3">
        {endDate ? "Dates relative to review period end" : "Days relative to review period end"}
      </p>
      <div className="space-y-2">
        {TIMELINE_PHASES.map((phase, i) => {
          const Icon = phase.icon;
          let dateLabel = `T${phase.day >= 0 ? "+" : ""}${phase.day}d`;
          if (endDate) {
            const phaseDate = new Date(endDate);
            phaseDate.setDate(phaseDate.getDate() + phase.day);
            dateLabel = phaseDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          }
          return (
            <div key={i} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-white border border-gray-100 flex items-center justify-center flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-[#0202ff]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700">{phase.label}</p>
                <p className="text-[10px] text-gray-400">{phase.description}</p>
              </div>
              <span className="text-[10px] text-gray-500 font-medium flex-shrink-0">{dateLabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}