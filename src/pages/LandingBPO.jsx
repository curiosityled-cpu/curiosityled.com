import React, { useState } from "react";
import IndustryNav from "@/components/landing/shared/IndustryNav";
import MicrosoftTrustBar from "@/components/landing/shared/MicrosoftTrustBar";
import SharedFooter from "@/components/landing/shared/SharedFooter";

const PATTERNS = [
  {
    bucket: "Operational Risk",
    color: "red",
    items: [
      {
        name: "Reactive Leadership",
        definition: "Managers respond to performance dips after they've already damaged SLA — not before.",
        stake: "Missed SLA targets, client escalations, punitive review cycles.",
        kpis: ["SLA Adherence", "Escalation Rate", "QA Score"],
        action: "Get a daily risk signal 48–72 hrs before a KPI breach.",
      },
      {
        name: "Metric Myopia",
        definition: "Leaders track lagging indicators (AHT, FCR) while ignoring the leading behavioural signals that drive them.",
        stake: "Decisions based on yesterday's data while today's performance is already drifting.",
        kpis: ["AHT", "FCR", "QA Drift"],
        action: "Surface the leadership behaviour behind every KPI movement.",
      },
      {
        name: "Accountability Gaps",
        definition: "Commitments made in QA debrief or team huddles don't get tracked or followed through.",
        stake: "Repeat defects, low coaching ROI, disengaged agents.",
        kpis: ["QA Score", "Repeat Error Rate"],
        action: "Auto-capture commitments and create a follow-through loop.",
      },
    ],
  },
  {
    bucket: "People Risk",
    color: "amber",
    items: [
      {
        name: "Performance Avoidance",
        definition: "Managers delay or soften difficult feedback, creating subjective performance conversations.",
        stake: "Underperformers persist, high-performers disengage, attrition accelerates.",
        kpis: ["Attrition Rate", "Agent Tenure", "Recognition Frequency"],
        action: "Coach managers to have objective, evidence-based performance conversations.",
      },
      {
        name: "Attrition Risk Behaviour",
        definition: "Signals of disengagement, reduced 1:1 frequency, or one-way communication appear weeks before an agent leaves.",
        stake: "Replacement cost per agent is 50–200% of salary. Early signal = early intervention.",
        kpis: ["Attrition Rate", "1:1 Frequency", "Engagement Signals"],
        action: "Receive a proactive nudge when attrition signals emerge on your team.",
      },
      {
        name: "Coaching Deficit",
        definition: "Leaders spend time managing work, not developing people. Coaching becomes a quarterly event, not a daily rhythm.",
        stake: "Agent skill stagnation, poor QA scores, reduced FCR.",
        kpis: ["Coaching Frequency", "QA Score", "FCR"],
        action: "Build a lightweight daily coaching ritual that fits into the flow of operations.",
      },
    ],
  },
  {
    bucket: "Execution Risk",
    color: "blue",
    items: [
      {
        name: "Decision Inconsistency",
        definition: "Team leads apply different standards to similar situations, creating fairness concerns and unpredictable outcomes.",
        stake: "Employee relations risk, leadership trust erosion, inconsistent client outcomes.",
        kpis: ["Compliance Rate", "Escalation Rate"],
        action: "Track decision patterns and surface inconsistency before it becomes a risk.",
      },
    ],
  },
];

const colorMap = {
  red: { bg: "bg-red-50", border: "border-red-200", badge: "bg-red-100 text-red-700", dot: "bg-red-500" },
  amber: { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  blue: { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
};

function PatternCard({ pattern, bucketColor }) {
  const [open, setOpen] = useState(false);
  const c = colorMap[bucketColor];
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-5 transition-all`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${c.dot}`} />
          <h4 className="font-semibold text-slate-800 text-sm">{pattern.name}</h4>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="text-xs text-slate-500 hover:text-slate-800 transition-colors flex-shrink-0"
        >
          {open ? "Less ↑" : "Detail ↓"}
        </button>
      </div>
      <p className="text-slate-600 text-sm mt-2 ml-4">{pattern.definition}</p>
      {open && (
        <div className="mt-3 ml-4 space-y-2">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">The Stake</span>
            <p className="text-sm text-slate-600 mt-0.5">{pattern.stake}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">KPI Linkage</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {pattern.kpis.map((k) => (
                <span key={k} className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.badge}`}>{k}</span>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">How Curiosity Led Helps</span>
            <p className="text-sm text-slate-700 mt-0.5">{pattern.action}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LandingBPO() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <IndustryNav />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-700 text-white px-4 pt-20 pb-24">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block bg-red-500/20 text-red-300 text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-5">
            BPO & Operations
          </span>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-5">
            Help BPO leaders spot risk earlier<br className="hidden md:block" /> and coach faster.
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-8">
            Curiosity Led bridges the gap between your operational KPIs and the leadership behaviours driving them — giving frontline managers the signal to act before a dip becomes a miss.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="mailto:hello@curiosityled.com?subject=BPO Pilot Request"
              className="bg-white text-slate-900 font-semibold px-6 py-3 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Start a Pilot
            </a>
            <a
              href="mailto:hello@curiosityled.com?subject=BPO Demo Request"
              className="border border-white/30 text-white font-medium px-6 py-3 rounded-lg hover:bg-white/10 transition-colors"
            >
              Book a Demo
            </a>
          </div>
        </div>
      </section>

      <MicrosoftTrustBar />

      {/* The Problem */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-8 text-center">
            The two problems BPO leadership hasn't solved yet
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <div className="text-2xl mb-3">🎯</div>
              <h3 className="font-bold text-slate-800 mb-2">The Subjectivity Trap</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Performance management in BPO relies on fragmented scorecards and subjective memory. This creates a trust gap between managers and agents, leads to inconsistent coaching, and prevents leadership from seeing performance trends until they've already impacted your SLA.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <div className="text-2xl mb-3">🔥</div>
              <h3 className="font-bold text-slate-800 mb-2">The Firefighting Cycle</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Frontline managers monitor AHT, QA scores, and escalations in real-time — but without a system bridging those KPIs to behavioral coaching, leadership becomes reactive. You're not just losing time. You're losing your best agents.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Seven Patterns */}
      <section className="py-16 px-4 bg-slate-50 border-y border-slate-200">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Pattern Engine</span>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mt-2 mb-3">
              The Seven BPO Leadership Patterns
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-sm">
              Curiosity Led detects these leadership risk patterns in real time — connecting manager behaviour to your operational KPIs before a metric moves.
            </p>
          </div>
          <div className="space-y-8">
            {PATTERNS.map((bucket) => (
              <div key={bucket.bucket}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded ${colorMap[bucket.color].badge}`}>
                    {bucket.bucket}
                  </span>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bucket.items.map((p) => (
                    <PatternCard key={p.name} pattern={p} bucketColor={bucket.color} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
              Leadership intelligence, in the flow of operations
            </h2>
            <p className="text-slate-500 text-sm max-w-xl mx-auto">
              BPO managers live in Microsoft Teams. So does Curiosity Led. No portal switching. No new login. Just the right signal at the right moment.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Daily Rhythm",
                desc: "A 2-minute check-in inside Teams surfaces your top 3 priorities, energy level, and any emerging risk signals — before the shift starts.",
              },
              {
                step: "02",
                title: "Pattern Detection",
                desc: "Curiosity Led connects your daily inputs to operational KPIs — flagging Reactive Leadership, Metric Myopia, or Attrition Risk behaviour as it emerges.",
              },
              {
                step: "03",
                title: "Coaching Action",
                desc: "Every detected pattern links to a lightweight coaching flow — a concrete next step the manager can take in the next 24 hours.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center p-6">
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-bold text-slate-800 mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-slate-900 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            See the seven patterns in your operation
          </h2>
          <p className="text-slate-300 mb-8 text-sm">
            We'll map our pattern engine to your team's specific KPIs — SLA, QA, FCR, AHT — in a 30-minute discovery call.
          </p>
          <a
            href="mailto:hello@curiosityled.com?subject=BPO Pilot Request"
            className="bg-white text-slate-900 font-semibold px-8 py-3 rounded-lg hover:bg-slate-100 transition-colors inline-block"
          >
            Start a Pilot Conversation
          </a>
        </div>
      </section>

      <SharedFooter />
    </div>
  );
}