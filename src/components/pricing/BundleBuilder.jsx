import React, { useMemo, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { MODULES, BOOK_DEMO_URL } from "@/components/pricing/pricingContent";

const COVERAGE = [
  { package: "Essentials", modules: ["lead", "team", "practice", "intelligence"] },
  { package: "Growth", modules: ["lead", "team", "practice", "intelligence", "development", "performance"] },
  {
    package: "Organization",
    modules: ["lead", "team", "practice", "intelligence", "development", "performance", "talent"],
  },
];

export default function BundleBuilder() {
  const [selected, setSelected] = useState(["lead", "team", "practice", "intelligence"]);

  const toggle = (key) =>
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const fit = useMemo(() => {
    if (selected.length === 0) return { name: null, studio: false };
    const match = COVERAGE.find((c) => selected.every((key) => c.modules.includes(key)));
    return match ? { name: match.package, studio: false } : { name: null, studio: true };
  }, [selected]);

  const handleBook = () => {
    base44.analytics.track({
      eventName: "package_select",
      properties: {
        package: fit.studio ? "studio" : (fit.name || "none").toLowerCase(),
        page: "pricing_builder",
        modules: selected.join(","),
      },
    });
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-7">
      <h3 className="text-lg font-bold text-gray-900">Compose your own bundle</h3>
      <p className="text-sm text-gray-600 mt-1 leading-relaxed max-w-2xl">
        Pick the modules you want. If a package already covers your combination we'll tell you which one; if it doesn't,
        Studio builds the bundle around your mix.
      </p>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {MODULES.map((module) => {
          const active = selected.includes(module.key);
          return (
            <button
              key={module.key}
              type="button"
              onClick={() => toggle(module.key)}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                active ? "border-[#0202ff] bg-blue-50/50" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <span
                className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                  active ? "text-white" : "border-gray-300"
                }`}
                style={active ? { backgroundColor: "#0202ff", borderColor: "#0202ff" } : undefined}
              >
                {active && <Check className="h-3 w-3" />}
              </span>
              <span>
                <span className="block text-[13px] font-semibold text-gray-900">{module.name}</span>
                <span className="block text-[11px] leading-relaxed text-gray-500">{module.blurb}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-xl bg-gray-50 p-5">
        {selected.length === 0 ? (
          <p className="text-sm text-gray-600">Select at least one module to see where your bundle lands.</p>
        ) : fit.studio ? (
          <p className="text-sm text-gray-700 leading-relaxed">
            <span className="font-semibold text-gray-900">This mix isn't a package — that's Studio.</span> We assemble it,
            quote it against your user count, and list the modules line by line on the order form.
          </p>
        ) : (
          <p className="text-sm text-gray-700 leading-relaxed">
            <span className="font-semibold text-gray-900">{fit.name} already covers this combination.</span>{" "}
            {fit.name === "Essentials"
              ? "Start there; you can add modules later."
              : "You could still buy these modules through Studio, but the package is the simpler path."}
          </p>
        )}

        <a
          href={BOOK_DEMO_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleBook}
          className="mt-4 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white px-5 py-3 rounded-xl hover:opacity-90 transition-all"
          style={{ backgroundColor: "#0202ff" }}
        >
          Take this bundle into a demo
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}