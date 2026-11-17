import React from "react";
import { ArrowRight, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { BUNDLES, MODULES, BOOK_DEMO_URL } from "@/components/pricing/pricingContent";

const moduleName = (key) => MODULES.find((m) => m.key === key)?.name;

export default function PackageCards() {
  const select = (key) => {
    base44.analytics.track({ eventName: "package_select", properties: { package: key, page: "pricing" } });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
      {BUNDLES.map((bundle) => (
        <div
          key={bundle.key}
          className={`rounded-2xl border bg-white p-6 flex flex-col ${
            bundle.promoted ? "border-[#0202ff] shadow-xl shadow-blue-100/60" : "border-gray-200"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-lg font-bold text-gray-900">{bundle.name}</h2>
            {bundle.badge && (
              <span
                className="text-[10px] font-bold uppercase tracking-wider text-white px-2 py-1 rounded"
                style={{ backgroundColor: "#0202ff" }}
              >
                {bundle.badge}
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-gray-500 mt-1 leading-relaxed">{bundle.tagline}</p>

          {bundle.continuity && (
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{bundle.continuity}</p>
          )}

          <ul className="mt-3 space-y-2 flex-1">
            {bundle.custom ? (
              <li className="text-[13px] leading-relaxed text-gray-600">
                Choose any modules, including combinations no package covers. We assemble and quote the bundle with you.
              </li>
            ) : (
              bundle.includes.map((key) => (
                <li key={key} className="flex gap-2 text-[13px] leading-relaxed text-gray-700">
                  <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#0202ff" }} />
                  <span className="font-medium">{moduleName(key)}</span>
                </li>
              ))
            )}
          </ul>

          <p className="mt-4 pt-4 border-t border-gray-100 text-[11px] text-gray-500 leading-relaxed">
            Quoted by user count, organization size and structure. Minimum $5,000 a year.
          </p>

          <a
            href={BOOK_DEMO_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => select(bundle.key)}
            className={`mt-4 flex items-center justify-center gap-2 text-[13px] font-semibold px-4 py-3 rounded-xl transition-all ${
              bundle.promoted ? "text-white hover:opacity-90" : "border border-gray-300 text-gray-800 hover:border-gray-400"
            }`}
            style={bundle.promoted ? { backgroundColor: "#0202ff" } : undefined}
          >
            {bundle.cta}
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      ))}
    </div>
  );
}