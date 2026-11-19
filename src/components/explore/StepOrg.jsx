import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Lock, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ONBOARDING, ORG, DEMO_VERSION } from "@/lib/exploreDemoContent";
import ProfileSummary from "@/components/explore/ProfileSummary";

const statusStyle = {
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  due: "bg-amber-50 text-amber-700 border-amber-200",
  locked: "bg-gray-50 text-gray-500 border-gray-200",
};

const bandColor = { green: "#10b981", amber: "#f59e0b", gray: "#d1d5db" };

export default function StepOrg({ profile, onRestart }) {
  const total = ORG.bands.reduce((s, b) => s + b.value, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-sm font-bold text-gray-900">{ONBOARDING.title}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{ONBOARDING.subtitle}</p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
            Sample
          </span>
        </div>
        <div className="space-y-2">
          {ONBOARDING.milestones.map((m) => (
            <div key={m.title} className="flex items-start gap-2.5">
              <span
                className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 border ${statusStyle[m.status]}`}
              >
                {m.status === "done" && <Check className="w-2.5 h-2.5" />}
                {m.status === "locked" && <Lock className="w-2.5 h-2.5" />}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-[13px] leading-snug ${
                    m.status === "locked" ? "text-gray-400" : "text-gray-800"
                  }`}
                >
                  {m.title}
                </p>
                <p className="text-[10px] text-gray-400">{m.when}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-sm font-bold text-gray-900">Leadership Intelligence</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {ORG.managers} managers · this quarter
            </p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
            Sample
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xl font-bold text-gray-900">{ORG.practising}</p>
            <p className="text-[10px] text-gray-500 leading-tight mt-0.5">practising weekly</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-3">
            <p className="text-xl font-bold text-amber-700">{ORG.atRisk}</p>
            <p className="text-[10px] text-amber-700 leading-tight mt-0.5">need attention</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xl font-bold text-gray-900">
              {Math.round((ORG.practising / ORG.managers) * 100)}%
            </p>
            <p className="text-[10px] text-gray-500 leading-tight mt-0.5">adoption</p>
          </div>
        </div>

        <div className="space-y-2">
          {ORG.bands.map((b) => (
            <div key={b.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-gray-600">{b.label}</span>
                <span className="text-[11px] font-semibold text-gray-900">{b.value}</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(b.value / total) * 100}%`, backgroundColor: bandColor[b.tone] }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-100 p-3">
          <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#0202ff" }} />
          <p className="text-[11px] text-gray-600 leading-relaxed">{ORG.privacyNote}</p>
        </div>
      </div>

      {profile && <ProfileSummary scores={profile} compact />}

      <div className="rounded-xl p-6 text-white" style={{ backgroundColor: "#0f0f1a" }}>
        <h2 className="text-xl font-bold leading-snug">That's the whole loop.</h2>
        <p className="mt-2 text-sm text-gray-300 leading-relaxed">
          See yourself, get support, keep the rhythm, show the movement. Every manager, every week,
          with evidence underneath it.
        </p>
        <div className="mt-5 flex flex-col sm:flex-row gap-2">
          <Button asChild className="text-white" style={{ backgroundColor: "#0202ff" }}>
            <a
              href="https://cal.com/curiosityled/bookdemo"
              target="_blank"
              rel="noopener noreferrer"
            >
              Book a demo with your own org
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </a>
          </Button>
          <Button
            variant="outline"
            onClick={onRestart}
            className="bg-transparent text-white border-white/25 hover:bg-white/10 hover:text-white"
          >
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Start the demo again
          </Button>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white"
          >
            Back to the site
          </Link>
        </div>
      </div>

      <p className="text-[10px] text-gray-400">Demo content version {DEMO_VERSION}. Illustrative data throughout.</p>
    </div>
  );
}