import React from "react";
import { ArrowDown, FileText } from "lucide-react";

export default function GuideHero() {
  return (
    <section className="max-w-6xl mx-auto px-6 pt-14 pb-10 md:pt-20">
      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-12 lg:gap-16 items-center">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] mb-5" style={{ color: "#0202ff" }}>
            Succession planning
          </p>
          <h1 className="font-serif text-[2.6rem] leading-[1.06] tracking-[-0.02em] text-[#151515] md:text-[3.6rem]">
            Template for Succession Planning: Fill-in-the-Blank Guide
          </h1>
          <p className="mt-6 text-[1.0625rem] leading-relaxed text-[#5B5651] max-w-2xl">
            Seven sections per critical role, each shipped with a completed worked example — so you can defend your
            bench strength to the board instead of describing it.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
            <a
              href="#workbook-form"
              className="inline-flex items-center justify-center gap-2 text-[15px] font-semibold text-white px-6 py-3.5 rounded-xl transition-transform hover:-translate-y-0.5"
              style={{ backgroundColor: "#0202ff" }}
            >
              Download the workbook
              <ArrowDown className="w-4 h-4" />
            </a>
            <span className="text-[13px] text-[#7A746E]">Free PDF · Sent to your inbox · No card required</span>
          </div>

          <div className="mt-10 flex items-center gap-3 text-[13px] text-[#7A746E]">
            <span className="h-px w-8 bg-[#D8D2C6]" />
            14 minute read · Updated for the 2026 board cycle
          </div>
        </div>

        <div className="relative">
          <div
            className="absolute -inset-6 rounded-[28px] opacity-[0.7]"
            style={{ background: "radial-gradient(circle at 70% 30%, #E8E6FF 0%, rgba(251,250,247,0) 70%)" }}
          />
          <div className="relative rounded-[18px] bg-[#0F0F1A] p-8 shadow-[0_24px_60px_-24px_rgba(15,15,26,0.55)] md:rotate-[1.4deg]">
            <div className="flex items-center justify-between mb-10">
              <img
                src="https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/afe1cf141_CuriosityLedLogoWBB.png"
                alt="Curiosity Led"
                className="h-7 object-contain"
              />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Workbook</span>
            </div>
            <p className="font-serif text-[1.85rem] leading-tight text-white">
              Succession
              <br />
              Planning
            </p>
            <p className="mt-3 text-[13px] text-white/55">Fill-in-the-blank guide for eight critical roles</p>
            <div className="mt-8 h-px w-full bg-white/12" />
            <div className="mt-5 flex items-center gap-2 text-[11px] text-white/45">
              <FileText className="w-3.5 h-3.5" />
              PDF · Includes worked ICU example
            </div>
            <div className="mt-8 flex gap-1.5">
              {["Role", "Risk", "Slate", "Readiness"].map((label) => (
                <span key={label} className="text-[9px] uppercase tracking-wider text-white/40 border border-white/10 rounded px-1.5 py-1">
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}