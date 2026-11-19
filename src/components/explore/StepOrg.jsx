import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Lock,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ONBOARDING, ORG, DEMO_VERSION } from "@/lib/exploreDemoContent";

const statusStyle = {
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  due: "bg-amber-50 text-amber-700 border-amber-200",
  locked: "bg-gray-50 text-gray-500 border-gray-200",
};

const bandColor = { green: "#10b981", amber: "#f59e0b", gray: "#d1d5db" };

function StatCard({ label, value, sub, icon: Icon, iconBg, iconColor, valueColor }) {
  return (
    <Card className="border-0 shadow-sm text-center rounded-2xl">
      <CardContent className="py-6">
        <div className={`flex items-center justify-center w-11 h-11 ${iconBg} rounded-full mx-auto mb-3`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <p className={`text-3xl font-bold ${valueColor}`}>{value}</p>
        <p className="text-xs font-medium text-gray-600 mt-1">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}

export default function StepOrg({ onRestart }) {
  const total = ORG.bands.reduce((s, b) => s + b.value, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full min-w-0 overflow-x-hidden px-4 sm:px-6 py-4 sm:py-6 space-y-4">
        {/* Page header, as the hub renders it */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-[1.15]">
              Leadership Intelligence
            </h1>
            <p className="text-[0.9375rem] text-gray-600 mt-1.5 leading-relaxed">
              {ORG.managers} managers · this quarter · aggregates only
            </p>
          </div>
          <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200">
            Sample
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="practising weekly"
            value={ORG.practising}
            sub="managers"
            icon={Users}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            valueColor="text-gray-900"
          />
          <StatCard
            label="need attention"
            value={ORG.atRisk}
            sub="flagged by pattern"
            icon={AlertTriangle}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            valueColor="text-amber-600"
          />
          <StatCard
            label="adoption"
            value={`${Math.round((ORG.practising / ORG.managers) * 100)}%`}
            sub="of managers"
            icon={TrendingUp}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            valueColor="text-emerald-600"
          />
        </div>

        <Card className="border border-gray-100 shadow-sm rounded-2xl">
          <CardContent className="py-5">
            <p className="text-sm font-bold text-gray-900 mb-4">Where the organisation sits</p>
            <div className="space-y-3">
              {ORG.bands.map((b) => (
                <div key={b.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">{b.label}</span>
                    <span className="text-xs font-semibold text-gray-900">{b.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
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
          </CardContent>
        </Card>

        <Card className="border border-gray-100 shadow-sm rounded-2xl">
          <CardContent className="py-5">
            <p className="text-sm font-bold text-gray-900">{ONBOARDING.title}</p>
            <p className="text-[11px] text-gray-500 mt-0.5 mb-4">{ONBOARDING.subtitle}</p>
            <div className="space-y-2.5">
              {ONBOARDING.milestones.map((m) => (
                <div key={m.title} className="flex items-start gap-2.5">
                  <span
                    className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 border ${statusStyle[m.status]}`}
                  >
                    {m.status === "done" && <Check className="w-2.5 h-2.5" />}
                    {m.status === "locked" && <Lock className="w-2.5 h-2.5" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] leading-snug ${m.status === "locked" ? "text-gray-400" : "text-gray-800"}`}>
                      {m.title}
                    </p>
                    <p className="text-[10px] text-gray-400">{m.when}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="rounded-2xl p-6 text-white" style={{ backgroundColor: "#0f0f1a" }}>
          <h2 className="text-xl font-bold leading-snug">That's the whole loop.</h2>
          <p className="mt-2 text-sm text-gray-300 leading-relaxed">
            See yourself, get support, keep the rhythm, show the movement. Every manager, every week, with evidence
            underneath it.
          </p>
          <div className="mt-5 flex flex-col sm:flex-row gap-2">
            <Button asChild className="text-white" style={{ backgroundColor: "#0202ff" }}>
              <a href="https://cal.com/curiosityled/bookdemo" target="_blank" rel="noopener noreferrer">
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

        <p className="text-[10px] text-gray-400 pb-4">
          Demo content version {DEMO_VERSION}. Illustrative data throughout.
        </p>
      </div>
    </div>
  );
}