import React from "react";
import { Check, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { TIER_CARDS, BOOK_DEMO_URL } from "@/components/pricing/pricingContent";

export default function PackageCards() {
  const select = (key) => {
    base44.analytics.track({ eventName: "package_select", properties: { package: key, page: "pricing" } });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {TIER_CARDS.map((tier) => (
        <div
          key={tier.key}
          className={`rounded-2xl border bg-white p-7 flex flex-col ${
            tier.promoted ? "border-[#0202ff] shadow-xl shadow-blue-100/60" : "border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-gray-900">{tier.name}</h2>
            {tier.promoted && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-white px-2 py-1 rounded" style={{ backgroundColor: "#0202ff" }}>
                Published price
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-gray-500 mt-1">{tier.promise}</p>

          <div className="mt-5 pb-5 border-b border-gray-100">
            {tier.price ? (
              <>
                <p className="text-4xl font-bold text-gray-900 leading-none">{tier.price}</p>
                <p className="text-xs text-gray-500 mt-2">{tier.unit}</p>
                <p className="text-xs text-gray-600 font-medium mt-2">{tier.implementation}</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-gray-900 leading-tight">{tier.priceLabel}</p>
                <p className="text-xs text-gray-500 mt-2">{tier.unit}</p>
                <p className="text-xs text-gray-600 font-medium mt-2">{tier.implementation}</p>
              </>
            )}
            <p className="text-xs text-gray-500 mt-3">{tier.fit}</p>
          </div>

          <ul className="mt-5 space-y-2.5 flex-1">
            {tier.features.map((f) => (
              <li key={f} className="flex gap-2 text-[13px] leading-relaxed text-gray-600">
                <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#0202ff" }} />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 space-y-2">
            <a
              href={BOOK_DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => select(tier.key)}
              className={`flex items-center justify-center gap-2 text-sm font-semibold px-5 py-3 rounded-xl transition-all ${
                tier.promoted
                  ? "text-white hover:opacity-90"
                  : "border border-gray-300 text-gray-800 hover:border-gray-400"
              }`}
              style={tier.promoted ? { backgroundColor: "#0202ff" } : undefined}
            >
              {tier.cta}
              <ArrowRight className="w-4 h-4" />
            </a>
            {tier.secondary && (
              <Link
                to={tier.secondary.href}
                className="flex items-center justify-center gap-2 text-xs font-medium text-gray-600 hover:text-gray-900 py-2"
              >
                {tier.secondary.label}
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}