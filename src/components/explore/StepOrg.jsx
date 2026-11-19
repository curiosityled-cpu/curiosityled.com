import React from "react";
import { Link } from "react-router-dom";
import {
  RefreshCw,
  FileText,
  Download,
  ChevronDown,
  Clock,
  Info,
  ShieldCheck,
  AlertTriangle,
  Users,
  Gauge,
  Magnet,
  UserPlus,
  Sparkles,
  TrendingUp,
  Network,
  Heart,
  LogOut,
  LayoutGrid,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HUB, ORG, DEMO_VERSION } from "@/lib/exploreDemoContent";

const TONES = {
  blue: {
    card: "bg-blue-50/60 border-blue-100",
    icon: "bg-blue-100 text-blue-700",
    value: "text-blue-700",
  },
  green: {
    card: "bg-emerald-50/60 border-emerald-100",
    icon: "bg-emerald-100 text-emerald-700",
    value: "text-emerald-700",
  },
  purple: {
    card: "bg-violet-50/60 border-violet-100",
    icon: "bg-violet-100 text-violet-700",
    value: "text-violet-700",
  },
  gray: {
    card: "bg-gray-50 border-gray-200",
    icon: "bg-gray-200 text-gray-600",
    value: "text-gray-700",
  },
};

const METRIC_ICONS = { health: Gauge, risk: AlertTriangle, succession: Users, confidence: ShieldCheck };

const PRIORITY_TONES = {
  amber: "bg-amber-50 text-amber-800 border-amber-200",
  gray: "bg-gray-100 text-gray-600 border-gray-200",
};

const LIFECYCLE_ICONS = [Magnet, UserPlus, Sparkles, TrendingUp, Network, Heart, LogOut];

function FilterPill({ label }) {
  return (
    <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-600 hover:border-gray-300">
      {label}
      <ChevronDown className="w-3 h-3 text-gray-400" />
    </button>
  );
}

function MetricCard({ metric }) {
  const tone = TONES[metric.tone];
  const Icon = METRIC_ICONS[metric.id] || Gauge;
  return (
    <div className={`rounded-xl border px-4 py-3.5 ${tone.card}`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${tone.icon}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <Info className="w-3.5 h-3.5 text-gray-400" />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{metric.label}</p>
      <p className={`text-3xl font-extrabold leading-none mt-1 ${tone.value}`}>{metric.value}</p>
      <p className="text-[11px] text-gray-600 mt-1.5 leading-snug">{metric.headline}</p>
      <p className="text-[10px] text-gray-400 mt-1">{metric.foot}</p>
    </div>
  );
}

function LifecycleTile({ stage, icon: Icon }) {
  const ok = stage.status === "ok";
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3.5 py-3 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
          <Icon className="w-3.5 h-3.5 text-gray-500" />
        </div>
        <span
          className={`w-4 h-4 rounded-[4px] flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
            ok ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {ok ? "\u2713" : "~"}
        </span>
      </div>
      <p className="text-[12px] font-semibold text-gray-900 mt-2 leading-tight">{stage.label}</p>
      <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">{stage.description}</p>
    </div>
  );
}

export default function StepOrg({ onRestart }) {
  const time = new Date().toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="px-4 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight leading-tight">{HUB.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{HUB.subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {[RefreshCw, FileText, Download].map((Icon, i) => (
            <span
              key={i}
              className="w-7 h-7 rounded-md border border-gray-200 bg-white flex items-center justify-center text-gray-500"
            >
              <Icon className="w-3.5 h-3.5" />
            </span>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {HUB.filters.map((f) => (
          <FilterPill key={f} label={f} />
        ))}
        <span className="ml-auto flex items-center gap-2">
          <span className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700">
            Partial data · {HUB.dataConfidence}%
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
            <Clock className="w-3 h-3" />
            {time}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-600">
            <RefreshCw className="w-3 h-3" />
            Refresh
          </span>
        </span>
      </div>

      {/* Headline metrics */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {HUB.metrics.map((m) => (
          <MetricCard key={m.id} metric={m} />
        ))}
      </div>

      {/* Priority areas */}
      <div className="mt-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Priority Areas</p>
        <div className="flex flex-wrap gap-1.5">
          {HUB.priorityAreas.map((p) => (
            <span
              key={p.label}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${PRIORITY_TONES[p.tone]}`}
            >
              {p.label}
              <ChevronDown className="w-3 h-3 opacity-60" />
            </span>
          ))}
        </div>
      </div>

      {/* Leadership lifecycle */}
      <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-bold text-gray-900">Leadership Lifecycle</h2>
        <p className="text-[11px] text-gray-500 mt-0.5 mb-3">
          Select a stage to re-prioritise the intelligence view. Executive Pulse stays fixed.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {HUB.lifecycle.map((stage, i) => (
            <LifecycleTile key={stage.label} stage={stage} icon={LIFECYCLE_ICONS[i] || Sparkles} />
          ))}
          <button className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 flex flex-col items-center justify-center gap-1.5 text-gray-600 hover:bg-gray-100 transition-colors">
            <LayoutGrid className="w-4 h-4" />
            <span className="text-[11px] font-semibold">View All Stages</span>
          </button>
        </div>
      </div>

      {/* Privacy line, as the hub states it */}
      <div className="mt-3 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-2.5">
        <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#0202ff" }} />
        <p className="text-[11px] text-gray-600 leading-relaxed">
          {ORG.privacyNote}
        </p>
      </div>

      {/* Demo close */}
      <div className="mt-5 rounded-2xl border border-gray-200 bg-white px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
        <p className="text-[11px] text-gray-500 sm:mr-auto">
          That's the whole loop: see yourself, get support, keep the rhythm, show the movement.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <Button asChild size="sm" className="text-white" style={{ backgroundColor: "#0202ff" }}>
            <a href="https://cal.com/curiosityled/bookdemo" target="_blank" rel="noopener noreferrer">
              Book a demo
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </a>
          </Button>
          <Button variant="outline" size="sm" onClick={onRestart}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Start again
          </Button>
          <Link to="/" className="text-[11px] font-semibold text-gray-500 hover:text-gray-900 px-1">
            Back to the site
          </Link>
        </div>
      </div>

      <p className="mt-3 text-[10px] text-gray-400 pb-2">
        Illustrative sample data throughout · demo content {DEMO_VERSION}
      </p>
    </div>
  );
}