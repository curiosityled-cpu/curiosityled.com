import React from "react";

// Honest pre-launch trust block.
// TODO: Replace the three stat cells with real numbers (managers assessed,
// pilot organizations) and add two named testimonials (name, role, organization)
// once that data is available. The current copy is intentionally honest about
// the pilot stage — it does not invent usage numbers or customer names.
export default function LandingPilotStatus() {
  return (
    <section className="py-14 bg-gray-50 border-y border-gray-100">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full border border-blue-100 bg-blue-50">
            <span className="w-2 h-2 rounded-full bg-[#0202ff]" />
            <span className="text-xs font-semibold text-[#0202ff] uppercase tracking-wider">Where we are today</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 text-center">
          <div>
            <div className="text-2xl font-bold text-[#0a0a0a]">In pilot</div>
            <div className="text-xs text-gray-500 mt-1 max-w-[160px]">Healthcare and BPO operations teams</div>
          </div>
          <div className="hidden md:block w-px h-12 bg-gray-200" />
          <div>
            <div className="text-2xl font-bold text-[#0a0a0a]">8-min diagnostic</div>
            <div className="text-xs text-gray-500 mt-1 max-w-[160px]">Live — real scenarios, real judgment profiles</div>
          </div>
          <div className="hidden md:block w-px h-12 bg-gray-200" />
          <div>
            <div className="text-2xl font-bold text-[#0a0a0a]">Microsoft-native</div>
            <div className="text-xs text-gray-500 mt-1 max-w-[160px]">Teams, Slack, and email — no new tool to deploy</div>
          </div>
        </div>
      </div>
    </section>
  );
}