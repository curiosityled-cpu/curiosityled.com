import React from "react";
import { PRICING_FAQ } from "@/components/pricing/pricingContent";

export default function PricingFaq() {
  return (
    <div className="space-y-3">
      {PRICING_FAQ.map((item) => (
        <details key={item.q} className="group rounded-xl border border-gray-200 bg-white px-5 py-4">
          <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-semibold text-gray-900 list-none">
            {item.q}
            <span className="text-gray-400 transition-transform group-open:rotate-45 text-lg leading-none">+</span>
          </summary>
          <p className="mt-3 text-[13px] leading-relaxed text-gray-600">{item.a}</p>
        </details>
      ))}
    </div>
  );
}