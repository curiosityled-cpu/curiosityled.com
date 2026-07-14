import React from "react";
import { ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

const AUDIENCES = [
  {
    tag: "Managers",
    body: "Not another generic program. Get personalized support on real leadership challenges in tools you already use — without weaponizing or surveillance mining your private reflections.",
  },
  {
    tag: "HR / Talent",
    body: "Run a structured, competency-aligned reboot and finally see which leaders are at risk or ready and where support is landing.",
  },
  {
    tag: "Executive sponsors",
    body: "Use a live Intelligence Hub to decide where to focus attention and budget, with data you can stand behind.",
  },
];

export default function OfferPage() {
  return (
    <div className="min-h-screen bg-black text-white antialiased">
      {/* Hero */}
      <section className="px-6 pt-20 pb-14 max-w-3xl mx-auto text-center">
        <p className="text-xs font-semibold tracking-[0.3em] text-white/50 uppercase mb-6">
          12-Week Leadership Development Reboot
        </p>
        <h1 className="text-4xl sm:text-6xl font-bold leading-[1.05] tracking-tight mb-6">
          Stop funding leadership programs you can't defend.
        </h1>
        <p className="text-lg sm:text-xl text-white/70 leading-relaxed max-w-2xl mx-auto">
          With the 12-Week Leadership Development Reboot, Curiosity Led gives HR
          and executive sponsors a live view of manager risk, readiness, and
          progress in one Leadership Intelligence Hub — instead of scattered
          tools and spreadsheets.
        </p>
        <a
          href="mailto:team@curiosityled.com?subject=12-Week Leadership Reboot Pilot"
          className="inline-flex items-center gap-2 mt-10 px-8 py-4 bg-white text-black rounded-full font-semibold text-base hover:bg-white/90 transition-colors"
        >
          Book the pilot call
          <ArrowRight className="w-4 h-4" />
        </a>
      </section>

      {/* Audience strip */}
      <section className="px-6 py-16 border-t border-white/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center text-2xl sm:text-3xl font-bold mb-12">
            Built for everyone who has to defend the spend.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {AUDIENCES.map((a) => (
              <div
                key={a.tag}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 flex flex-col"
              >
                <p className="text-sm font-semibold tracking-wide text-white mb-3">
                  {a.tag}
                </p>
                <p className="text-white/70 text-sm leading-relaxed">{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Guarantee */}
      <section className="px-6 py-20 bg-white/[0.02] border-t border-white/10">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-white/60 text-xs font-semibold tracking-[0.25em] uppercase mb-6">
            <ShieldCheck className="w-4 h-4" />
            The Guarantee
          </div>
          <p className="text-xl sm:text-2xl font-medium leading-relaxed">
            If HR and your executive sponsor don't get a live Leadership
            Intelligence Hub and a clearer, competency-aligned story of which
            managers are at risk, ready, and where support should go next, we'll
            keep working with your cohort at no additional charge until they do.
          </p>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="px-6 py-20 text-center border-t border-white/10">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            12 weeks. One Hub. A cohort you can defend.
          </h2>
          <p className="text-white/60 mb-8">
            Limited pilot cohorts. Reply to hold a seat.
          </p>
          <a
            href="mailto:team@curiosityled.com?subject=12-Week Leadership Reboot Pilot"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black rounded-full font-semibold text-base hover:bg-white/90 transition-colors"
          >
            Book the pilot call
            <ArrowRight className="w-4 h-4" />
          </a>
          <div className="mt-10">
            <Link
              to="/LandingPage"
              className="text-white/40 text-xs hover:text-white/70 transition-colors"
            >
              ← Back to main site
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}