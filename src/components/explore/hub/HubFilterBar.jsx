import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Database, RefreshCw } from "lucide-react";
import { HUB_PAGE } from "@/lib/exploreHubContent";

export default function HubFilterBar() {
  const [values, setValues] = useState(
    HUB_PAGE.filters.reduce((acc, f) => ({ ...acc, [f.key]: f.value }), {})
  );
  const time = new Date().toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {HUB_PAGE.filters.map((f) => (
          <Select
            key={f.key}
            value={values[f.key]}
            onValueChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
          >
            <SelectTrigger className="h-8 text-xs w-36 bg-gray-50 border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {f.options.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        <div className="flex-1" />

        <Badge className="text-[11px] border gap-1 bg-red-100 text-red-700 border-red-200">
          <Database className="w-3 h-3" />
          Partial data · {HUB_PAGE.dataConfidence}%
        </Badge>

        <span className="flex items-center gap-1 text-[11px] text-gray-400">
          <Clock className="w-3 h-3" />
          {time}
        </span>

        <button className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700 transition-colors">
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>
    </div>
  );
}