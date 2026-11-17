import React from "react";
import { Check, ArrowRight, Rocket, TrendingUp, Building2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { TIERS, BOOK_DEMO_URL } from "@/components/pricing/pricingContent";

const ICONS = { essentials: Rocket, growth: TrendingUp, organization: Building2 };

export default function PackageCards() {
  const select = (key) => {
    base44.analytics.track({ eventName: "package_select", properties: { package: key, page: "pricing" } });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {TIERS.map((tier) => {
        const Icon = ICONS[tier.key];
        return (
          <div
            key={tier.key}
            className="relative rounded-2xl border border-gray-200 bg-white p-7 flex flex-col overflow-hidden hover:border-blue-300 hover:shadow-lg transition-all"
          >
            <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: "#0202ff", opacity: tier.key === "essentials" ? 0.35 : tier.key === "growth" ? 0.65 : 1 }} />

            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#eef2ff" }}>
                <Icon className="w-4 h-4" style={{ color: "#0202ff" }} />
              </span>
              <div>
                <h2 className="text-lg font-bold text-gray-900 leading-tight">{tier.name}</h2>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{tier.bestFor}</p>
              </div>
            </div>

            <p className="mt-4 text-sm font-medium text-gray-900 leading-relaxed">{tier.emphasis}</p>
            <p className="mt-3 text-[13px] text-gray-500 leading-relaxed">{tier.suitedTo}</p>

            <ul className="mt-5 pt-5 border-t border-gray-100 space-y-2 flex-1">
              {tier.features.map((f) => (
                <li key={f} className="flex gap-2 text-[13px] leading-relaxed text-gray-700">
                  <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#0202ff" }} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <a
              href={BOOK_DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => select(tier.key)}
              className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-white px-5 py-3 rounded-xl hover:opacity-90 transition-all"
              style={{ backgroundColor: "#0202ff" }}
            >
              Talk to us about {tier.name}
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        );
      })}
    </div>
  );
}