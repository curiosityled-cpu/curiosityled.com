import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { setPageSEO } from "@/lib/seo";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import PackageCards from "@/components/pricing/PackageCards";
import BundleBuilder from "@/components/pricing/BundleBuilder";
import IncludedBaseline from "@/components/pricing/IncludedBaseline";
import PackageBoundaries from "@/components/pricing/PackageBoundaries";
import PricingFaq from "@/components/pricing/PricingFaq";
import { CAPACITY_BLOCKS, BOOK_DEMO_URL, DIAGNOSTIC_URL, PRICING_BASIS } from "@/components/pricing/pricingContent";

export default function Pricing() {
  useEffect(() => {
    setPageSEO(
      "Pricing & packaging — Curiosity Led",
      "Four bundles built from seven modules: Essentials, Growth, Organization and Studio. Pricing may vary based on User Count, Organization Size, or Corporate Structure (Minimum pricing $5,000/year)."
    );
    base44.analytics.track({ eventName: "pricing_view", properties: { page: "pricing" } });
    return () => { document.title = "Curiosity Led"; };
  }, []);

  const handleContact = () => {
    base44.analytics.track({ eventName: "contact_request", properties: { page: "pricing", source: "hero" } });
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      <LandingNav />

      <section className="pt-32 pb-14 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500 mb-5">Pricing &amp; packaging</p>
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-6">
            Buy the modules your managers actually need.
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">{PRICING_BASIS}</p>
          <p className="mt-4 text-sm text-gray-600 leading-relaxed max-w-2xl mx-auto">
            Four bundles built from seven modules. Essentials covers the core manager loop; Growth adds development and
            performance; Organization adds talent. Studio lets you compose your own mix.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={BOOK_DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleContact}
              className="inline-flex items-center justify-center gap-2 text-sm font-bold text-white px-7 py-3.5 rounded-xl hover:opacity-90 transition-all"
              style={{ backgroundColor: "#0202ff" }}
            >
              Book a demo
              <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              to={DIAGNOSTIC_URL}
              className="inline-flex items-center justify-center gap-2 text-sm font-bold text-gray-800 px-7 py-3.5 rounded-xl border border-gray-300 hover:border-gray-400 transition-all"
            >
              Take the diagnostic
            </Link>
          </div>
          <p className="mt-6 text-xs text-gray-500">
            Annual agreements · Quotes built from your user count and structure · No AI allowance published while it is
            being measured
          </p>
        </div>
      </section>

      <section className="py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <PackageCards />
        </div>
      </section>

      <section className="py-14 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-3">
            <BundleBuilder />
          </div>
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Capacity blocks</h2>
            <p className="text-sm text-gray-600 mb-5 leading-relaxed">
              Added as line items on the order form, never as a different bundle.
            </p>
            <div className="space-y-3">
              {CAPACITY_BLOCKS.map((block) => (
                <div key={block.name} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-900">{block.name}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                      {block.terms}
                    </p>
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-gray-600">{block.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">What every bundle includes</h2>
          <p className="text-sm text-gray-600 mb-7">And which modules each one carries.</p>
          <IncludedBaseline />
        </div>
      </section>

      <section className="pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <PackageBoundaries />
        </div>
      </section>

      <section id="faq" className="pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Pricing questions</h2>
          <PricingFaq />
        </div>
      </section>

      <section className="py-20 bg-[#0202ff] px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight">
            Bring your module list, leave with a number.
          </h2>
          <p className="text-blue-200 text-lg leading-relaxed mb-8">
            In a 30-minute scoping call we map your managers and participants, pick the modules you need, and put the
            first-year figure and implementation scope in writing.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={BOOK_DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white font-bold text-sm px-8 py-4 rounded-xl hover:bg-blue-50 transition-all shadow-lg"
              style={{ color: "#0202ff" }}
            >
              Book a demo
              <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              to={DIAGNOSTIC_URL}
              className="inline-flex items-center justify-center gap-2 border border-white/30 text-white font-bold text-sm px-8 py-4 rounded-xl hover:bg-white/10 transition-all"
            >
              Take the diagnostic
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}