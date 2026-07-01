import React from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { getIndustryConfig } from "./industryConfig";

export default function IndustryHero({ industry }) {
  const cfg = getIndustryConfig(industry);
  const { hero, mockup, badge, badgeColor, accent } = cfg;

  const scrollToHow = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex flex-col justify-center pt-24 pb-16 overflow-hidden bg-white">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(#0202ff 1px, transparent 1px), linear-gradient(90deg, #0202ff 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />
      {/* Industry accent blob */}
      <div
        className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-[0.06] blur-3xl pointer-events-none"
        style={{ background: accent }}
      />

      <div className="relative max-w-6xl mx-auto px-6 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Copy */}
          <div>
            {/* Industry badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span
                className="inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-6"
                style={{ color: badgeColor, backgroundColor: badgeColor + "15" }}
              >
                {badge}
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-4xl lg:text-5xl xl:text-[52px] font-bold text-[#0a0a0a] leading-[1.1] tracking-tight mb-6"
            >
              {hero.headline[0]}{" "}
              <span style={{ color: "#0202ff" }}>{hero.headline[1]}</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="text-lg text-gray-600 leading-relaxed mb-8 font-medium"
            >
              {hero.subheadline}
            </motion.p>

            {/* Bullets */}
            <motion.ul
              className="space-y-3 mb-10"
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.6 } },
              }}
            >
              {hero.bullets.map((b, i) => (
                <motion.li
                  key={i}
                  variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
                  className="flex items-start gap-3"
                >
                  <span
                    className="mt-1 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: "#0202ff" }}
                  >
                    ✓
                  </span>
                  <span className="text-gray-700 text-sm leading-relaxed">{b}</span>
                </motion.li>
              ))}
            </motion.ul>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.1 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <a
                href={hero.primaryCta.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-semibold text-white text-sm transition-all hover:opacity-90"
                style={{ backgroundColor: "#0202ff" }}
              >
                {hero.primaryCta.label}
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href={hero.secondaryCta.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-semibold text-gray-700 text-sm border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
              >
                {hero.secondaryCta.label}
              </a>
            </motion.div>
          </div>

          {/* Right: Tailored App Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 80, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.5, ease: "easeOut" }}
            className="relative"
          >
            <IndustryMockup mockup={mockup} />

            {/* Floating badge */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.6 }}
              className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-3 flex items-center gap-3"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: mockup.floatingBadge.color }}
              >
                {mockup.floatingBadge.icon}
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900">{mockup.floatingBadge.title}</div>
                <div className="text-[10px] text-gray-500">{mockup.floatingBadge.subtitle}</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ── Tailored App Mockup ──────────────────────────────────────────────────────
// Renders the config-driven "app preview" with browser chrome and industry-
// specific stats, flagged items, and footer note.
function IndustryMockup({ mockup }) {
  return (
    <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-100">
      {/* Browser chrome */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 mx-4">
          <div className="bg-white rounded-md px-3 py-1 text-xs text-gray-400 border border-gray-200 max-w-[220px] mx-auto text-center">
            {mockup.browserLabel}
          </div>
        </div>
      </div>

      {/* App content */}
      <div className="bg-white p-4 h-[400px] overflow-hidden">
        {/* Title row (optional badge for coaching) */}
        <div className="flex items-center gap-2 mb-1">
          {mockup.titleBadge && (
            <div
              className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-bold"
              style={{ backgroundColor: mockup.titleBadge.color }}
            >
              {mockup.titleBadge.label}
            </div>
          )}
          <div className="text-sm font-bold text-gray-900">{mockup.title}</div>
        </div>
        <div className="text-[10px] text-gray-500 mb-3">{mockup.subtitle}</div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {mockup.stats.map((s) => (
            <div key={s.label} className="bg-gray-50 rounded-lg p-2 border border-gray-100 text-center">
              <div className="text-sm font-bold" style={{ color: s.color }}>
                {s.value}
              </div>
              <div className="text-[9px] text-gray-500 leading-tight mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Optional alert banner (healthcare / coaching) */}
        {mockup.alertBanner && (
          <div
            className="rounded-xl px-3 py-2 mb-3 border"
            style={{ backgroundColor: mockup.alertBanner.bg, borderColor: mockup.alertBanner.borderColor }}
          >
            <div className="text-[10px] font-bold mb-1" style={{ color: mockup.alertBanner.titleColor }}>
              {mockup.alertBanner.title}
            </div>
            <div className="text-[9px] leading-relaxed" style={{ color: mockup.alertBanner.descColor }}>
              {mockup.alertBanner.desc}
            </div>
          </div>
        )}

        {/* Flagged items */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-3">
          <div className="px-3 py-2 border-b border-gray-100">
            <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">
              {mockup.flaggedTitle}
            </span>
          </div>
          {mockup.flaggedItems.map((item) => (
            <div key={item.name} className="px-3 py-2 flex items-center justify-between border-b border-gray-50 last:border-0">
              <div>
                <div className="text-[11px] font-semibold text-gray-800">{item.name}</div>
                <div className="text-[9px] text-gray-400">{item.detail}</div>
              </div>
              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: item.color + "20", color: item.color }}
              >
                {item.badge || "Active"}
              </span>
            </div>
          ))}
        </div>

        {/* Optional footer note (BPO) */}
        {mockup.footerNote && (
          <div className="rounded-lg px-3 py-2 flex items-center gap-2" style={{ backgroundColor: mockup.footerNote.bg }}>
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
              style={{ backgroundColor: mockup.footerNote.color }}
            >
              {mockup.footerNote.icon}
            </div>
            <div className="text-[10px] font-medium" style={{ color: mockup.footerNote.color }}>
              {mockup.footerNote.text}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}