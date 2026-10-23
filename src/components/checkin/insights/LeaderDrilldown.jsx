import React from "react";
import { Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SELF = "__self";

/** Scopes the insights to one leader's team and vertical. */
export default function LeaderDrilldown({ leaders = [], value, onChange, selfLabel = "My team (all)" }) {
  if (leaders.length === 0) return null;

  const nameCounts = leaders.reduce((acc, leader) => {
    acc[leader.name] = (acc[leader.name] || 0) + 1;
    return acc;
  }, {});

  const optionLabel = (leader) => {
    const suffix = nameCounts[leader.name] > 1 ? ` (${(leader.email || "").split("@")[0]})` : "";
    return `${leader.name}${suffix} — ${leader.direct_reports} team · ${leader.subtree_size} vertical`;
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Drill down</span>
      <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      <Select value={value || SELF} onValueChange={(next) => onChange(next === SELF ? "" : next)}>
        <SelectTrigger className="h-8 w-[280px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SELF} className="text-xs">{selfLabel}</SelectItem>
          {leaders.map((leader) => (
            <SelectItem key={leader.email} value={leader.email} className="text-xs" title={leader.email}>
              {optionLabel(leader)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}