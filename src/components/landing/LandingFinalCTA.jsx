import React from "react";
import { base44 } from "@/api/base44Client";

const DEMO_URL = "https://cal.com/curiosityled/discoverycall";

export default function LandingFinalCTA() {
  const handleLogin = () => {
    base44.auth.redirectToLogin("/");
  };

  return (
    <section id="home-final-cta" className="py-24 bg-[#0202FF] px-6">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-3xl lg:text-4xl font-serif font-bold text-white mb-4">
          Give HR a clearer leadership story
        </h2>
        <p className="text-base text-blue-200 leading-relaxed max-w-xl mx-auto mb-10">
          Spot risk earlier, support managers sooner, and see leadership progress more clearly in one place.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href={DEMO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-7 py-3.5 rounded-md text-sm font-semibold bg-white text-gray-900 hover:bg-gray-50 transition-colors shadow-sm"
          >
            Book a demo
          </a>
          <button
            onClick={handleLogin}
            className="text-sm font-medium text-blue-200 hover:text-white transition-colors underline underline-offset-4"
          >
            Log in
          </button>
        </div>
      </div>
    </section>
  );
}