import React from "react";
import { Info } from "lucide-react";
import { NOT_PUBLISHED } from "@/components/pricing/pricingContent";

export default function PackageBoundaries() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-7">
      <div className="flex items-center gap-2">
        <Info className="w-4 h-4 text-amber-700" />
        <h3 className="text-base font-bold text-gray-900">What we deliberately don't put on a price list</h3>
      </div>
      <ul className="mt-4 space-y-2.5">
        {NOT_PUBLISHED.map((item) => (
          <li key={item} className="text-[13px] leading-relaxed text-gray-700">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}