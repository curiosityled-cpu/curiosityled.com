import React, { useState } from "react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PlatformCollapsibleSection({
  icon: Icon,
  iconColor = "text-gray-600",
  title,
  description,
  children,
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center justify-between gap-3 rounded-xl border bg-white px-5 py-4 text-left transition-all hover:bg-gray-50",
            open ? "border-[#0202ff]/30 rounded-b-none" : "border-gray-200"
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Icon className={cn("w-5 h-5 flex-shrink-0", iconColor)} />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 truncate">{title}</h3>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{description}</p>
            </div>
          </div>
          <ChevronDown
            className={cn(
              "w-5 h-5 flex-shrink-0 text-gray-400 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border border-t-0 border-gray-200 rounded-b-xl bg-white p-5">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}