import React from "react";
import { Badge } from "@/components/ui/badge";
import { Calendar, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export default function ExpirationStatusBadge({ user }) {
  if (!user.account_expires_at) {
    return <span className="text-sm text-gray-400">No expiration</span>;
  }

  const expDate = new Date(user.account_expires_at);
  const now = new Date();
  const isExpired = expDate <= now;
  const daysUntilExpiry = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
  const isExpiringSoon = !isExpired && daysUntilExpiry <= 30;

  return (
    <div className="flex flex-col gap-1">
      <Badge className={
        isExpired ? 'bg-red-100 text-red-800 border-red-300' :
        isExpiringSoon ? 'bg-amber-100 text-amber-800 border-amber-300' :
        'bg-gray-100 text-gray-800 border-gray-300'
      }>
        <Calendar className="w-3 h-3 mr-1" />
        {format(expDate, 'MMM d, yyyy')}
      </Badge>
      {isExpired && (
        <Badge className="bg-red-100 text-red-800 text-xs">
          <AlertTriangle className="w-2 h-2 mr-1" />
          Expired
        </Badge>
      )}
      {isExpiringSoon && !isExpired && (
        <Badge className="bg-amber-100 text-amber-800 text-xs">
          {daysUntilExpiry} days left
        </Badge>
      )}
    </div>
  );
}