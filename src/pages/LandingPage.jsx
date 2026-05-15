import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, AlertTriangle, BarChart3, Zap, Shield, Users, TrendingUp } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/be036d547_CuriosityLedIcon_20241030_085533_0000.png"
              alt="Curiosity Led"
              className="w-8 h-8 object-contain"
            />
            <span className="text-base font-bold text-gray-900">Curiosity Led</span>
          </div>
          <Link
            to="/"
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: '#0202ff' }}
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Built for healthcare leadership teams
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
            No capable leader should<br />
            <span style={{ color: '#0202ff' }}>struggle silently</span> while the<br />
            system responds too late.
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Curiosity Led shifts leadership development from reactive and fragmented — to proactive, in-the-workflow, and measurable — before problems escalate.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold text-white shadow-lg hover:shadow-xl transition-all"
              style={{ backgroundColor: '#0202ff' }}
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="mailto:hello@curiosityled.com"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold text-gray-700 bg-white border border-gray-200 hover:border-gray-300 transition-all"
            >
              Request a Demo
            </a>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">The system responds too late</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Healthcare organizations have programs, coaching, and learning platforms. But they share the same problem.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-red-50 border border-red-100 rounded-2xl p-8">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-sm font-semibold text-red-600 uppercase tracking-wide">Today's Reality</span>
              </div>
              <p className="text-lg font-semibold text-gray-800 mb-4">Problem happens → Program or coaching is assigned</p>
              <ul className="space-y-2.5 text-gray-600">
                {[
                  "The behavior already happened",
                  "The team already felt it",
                  "The risk already materialized",
                  "No clear line from development → behavior → impact"
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-8">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#0202ff' }}>With Curiosity Led</span>
              </div>
              <p className="text-lg font-semibold text-gray-800 mb-4">Early detection → In-the-moment support</p>
              <ul className="space-y-2.5 text-gray-600">
                {[
                  "At-risk leaders identified before problems surface",
                  "Support delivered at the moment of need",
                  "Development tied to real behavior",
                  "One clear, measurable leadership story"
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#0202ff' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Before / After table */}
          <div className="overflow-hidden rounded-2xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-6 py-3 font-semibold text-gray-500">Today</th>
                  <th className="text-left px-6 py-3 font-semibold" style={{ color: '#0202ff' }}>Curiosity Led</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  ["Reactive programs", "Early risk detection"],
                  ["Out-of-workflow learning", "In-the-workflow support"],
                  ["Fragmented data", "One leadership view"],
                  ["No behavior tracking", "Behavior → outcome visibility"],
                ].map(([before, after]) => (
                  <tr key={before} className="bg-white">
                    <td className="px-6 py-4 text-gray-500">{before}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Three Personas */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Built for every role in the leadership journey</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: TrendingUp,
                role: "Executive Sponsor",
                quote: "We are investing in leadership—but we still discover risk too late and can't prove impact.",
                points: ["See bench strength, risk & readiness", "Leadership Intelligence Hub", "Prove ROI of development spend"]
              },
              {
                icon: BarChart3,
                role: "HR / L&D Buyer",
                quote: "I have programs and coaching, but no single, defensible talent story.",
                points: ["Assign and monitor at-risk managers", "Unified data across all programs", "One clear talent narrative for executives"]
              },
              {
                icon: Users,
                role: "Manager (Jane)",
                quote: "I don't have time for another program—I need help with what's happening this week.",
                points: ["Get insights from your assessment", "Ask Atreus for real-time coaching", "Set one goal, take one action"]
              }
            ].map(({ icon: Icon, role, quote, points }) => (
              <div key={role} className="bg-white rounded-2xl border border-gray-200 p-7 flex flex-col gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#EEF2FF' }}>
                  <Icon className="w-5 h-5" style={{ color: '#0202ff' }} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{role}</p>
                  <p className="text-sm font-semibold text-gray-800 italic">"{quote}"</p>
                </div>
                <ul className="space-y-2 mt-auto">
                  {points.map(p => (
                    <li key={p} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#0202ff' }} />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 90-Day Promise */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">The 90-day outcome</h2>
          <p className="text-lg text-gray-500 mb-12">
            In 90 days, your CPO can confidently decide where to focus development dollars and attention.
          </p>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Shield, label: "At-risk leaders identified earlier" },
              { icon: Zap, label: "Support at the moment of need" },
              { icon: TrendingUp, label: "Development tied to real behavior" },
              { icon: BarChart3, label: "Executives see who is at risk and who is progressing" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-6 flex flex-col items-center gap-3 text-center">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#EEF2FF' }}>
                  <Icon className="w-5 h-5" style={{ color: '#0202ff' }} />
                </div>
                <p className="text-sm font-medium text-gray-700">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Positioning */}
      <section className="py-20 px-6" style={{ backgroundColor: '#0202ff' }}>
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-blue-200 text-sm font-semibold uppercase tracking-widest mb-4">What we are</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
            Not another LMS. Not another program. Not another coaching layer.
          </h2>
          <p className="text-xl text-blue-100 mb-10">
            A system that makes leadership development <strong className="text-white">timely, measurable, and tied to real behavior</strong> — before problems escalate.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold text-[#0202ff] bg-white hover:bg-blue-50 transition-all shadow-lg"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 bg-gray-900 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/be036d547_CuriosityLedIcon_20241030_085533_0000.png"
            alt="Curiosity Led"
            className="w-6 h-6 object-contain opacity-80"
          />
          <span className="text-sm font-semibold text-gray-300">Curiosity Led</span>
        </div>
        <p className="text-xs text-gray-500">© {new Date().getFullYear()} Curiosity Led. All rights reserved.</p>
      </footer>

    </div>
  );
}