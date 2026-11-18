import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { setPageSEO } from "@/lib/seo";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import PackageCards from "@/components/pricing/PackageCards";
import ModuleMatrix from "@/components/pricing/ModuleMatrix";
import TierLadder from "@/components/pricing/TierLadder";
import PricingFaq from "@/components/pricing/PricingFaq";
import IntegrationsNote from "@/components/pricing/IntegrationsNote";
import { PRICING_NOTE, BOOK_DEMO_URL, DIAGNOSTIC_URL } from "@/components/pricing/pricingContent";

export default function Pricing() {
  useEffect(() => {
    setPageSEO(
      "Pricing & packaging — Curiosity Led",
      "Three packages built on one platform: Essentials, Growth and Organization. Pricing varies by user count, organization size and corporate structure, with a $5,000/year minimum."
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

      <section className="pt-32 pb-16 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500 mb-5">Pricing &amp; packaging</p>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-6">
              One platform. Three ways to grow.
            </h1>
            <p className="text-lg text-gray-700 leading-relaxed">
              Every package runs on the same manager experience. What grows is how much of the platform your managers can use
              — performance, then development, then your whole talent bench.
            </p>
            <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
              <p className="text-sm font-medium text-gray-900 leading-relaxed">{PRICING_NOTE}</p>
            </div>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a
                href={BOOK_DEMO_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleContact}
                className="inline-flex items-center justify-center gap-2 text-sm font-bold text-white px-7 py-3.5 rounded-xl hover:opacity-90 transition-all"
                style={{ backgroundColor: "#0202ff" }}
              >
                Talk to us
                <ArrowRight className="w-4 h-4" />
              </a>
              <Link
                to={DIAGNOSTIC_URL}
                className="inline-flex items-center justify-center gap-2 text-sm font-bold text-gray-800 px-7 py-3.5 rounded-xl border border-gray-300 hover:border-gray-400 transition-all"
              >
                Take the diagnostic
              </Link>
            </div>
          </div>
          <TierLadder />
        </div>
      </section>

      <section className="py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <PackageCards />
        </div>
      </section>

      <section className="py-14 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">What's in each package</h2>
              <p className="text-sm text-gray-600 mt-1">One platform, unlocked in three stages.</p>
            </div>
            <p className="text-xs text-gray-500">Hover a row to follow a module across packages.</p>
          </div>
          <ModuleMatrix />
        </div>
      </section>

      <section className="py-10 px-6">
        <div className="max-w-5xl mx-auto">
          <IntegrationsNote />
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Pricing questions</h2>
          <PricingFaq />
        </div>
      </section>

      <section className="py-20 bg-[#0202ff] px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight">
            Tell us your team. We'll tell you the package.
          </h2>
          <p className="text-blue-200 text-lg leading-relaxed mb-8">
            A 30-minute conversation about your managers and your structure. You leave with one package and one figure, in
            writing.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={BOOK_DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white font-bold text-sm px-8 py-4 rounded-xl hover:bg-blue-50 transition-all shadow-lg"
              style={{ color: "#0202ff" }}
            >
              Talk to us
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