import React from "react";
import { Lock, Unlock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * SectionCard — consistent wrapper for each org-settings section.
 */
export function SectionCard({ icon: Icon, title, description, children }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-[#0202ff]" />}
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

/**
 * SettingRow — label + description on the left, control on the right,
 * with an optional org-override lock toggle for super admins.
 */
export function SettingRow({ label, description, children, lockKey, locked, onToggleLock, canLock }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {children}
        {canLock && lockKey && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onToggleLock(lockKey)}
                  className={`p-1.5 rounded-md transition-colors ${
                    locked ? "bg-[#0202ff]/10 text-[#0202ff]" : "text-gray-300 hover:text-gray-500 hover:bg-gray-100"
                  }`}
                  aria-label={locked ? "Unlock org override" : "Lock as org override"}
                >
                  {locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {locked ? "Org override ON — users cannot change this" : "Click to lock this as an org override"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}

/**
 * LockBadge — shown on personal settings when an org lock is active.
 */
export function LockBadge({ label = "Set by your organization" }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
            <Lock className="w-2.5 h-2.5" />
            {label}
          </span>
        </TooltipTrigger>
        <TooltipContent>Your organization has locked this setting.</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}