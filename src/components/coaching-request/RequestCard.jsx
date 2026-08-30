import React from "react";
import { CATEGORY_CONFIG, STATUS_CONFIG, URGENCY_CONFIG, formatTimeAgo } from "./shared";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";

export default function RequestCard({ request, onClick, showRole = false }) {
  const cat = CATEGORY_CONFIG[request.request_category] || {};
  const status = STATUS_CONFIG[request.status] || {};
  const urgency = URGENCY_CONFIG[request.urgency] || {};
  const Icon = cat.icon;
  const StatusIcon = status.icon;

  return (
    <button
      onClick={() => onClick(request)}
      className="w-full text-left p-4 rounded-xl border border-border bg-card hover:border-[#0202ff]/30 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted">
          {Icon && <Icon className="w-5 h-5 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-sm font-semibold text-foreground truncate">{request.title}</p>
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge variant="outline" className={`text-xs ${status.badge}`}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {status.label}
            </Badge>
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {cat.label}
            </Badge>
            {request.urgency && request.urgency !== "standard" && (
              <Badge variant="outline" className={`text-xs ${urgency.badge}`}>
                {urgency.label}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="truncate">{request.requested_by_name || request.requested_by_email}</span>
            <span>·</span>
            <span>{formatTimeAgo(request.created_date)}</span>
            {showRole && request.assigned_practitioner_role && (
              <>
                <span>·</span>
                <span className="text-[#0202ff]">{request.assigned_practitioner_role}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}