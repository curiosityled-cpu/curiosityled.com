import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  AlertTriangle,
  Layers,
  Database,
  RefreshCw,
  FileText,
  Download,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import HubFilterBar from "@/components/explore/HubFilterBar";
import HubMetricCard from "@/components/explore/HubMetricCard";
import HubLifecycleGrid from "@/components/explore/HubLifecycleGrid";
import { HUB, ORG, DEMO_VERSION } from "@/lib/exploreDemoContent";

const METRIC_ICONS = {
  shield: Shield,
  alert: AlertTriangle,
  layers: Layers,
  database: Database,
};

const DOT = {
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  gray: "bg-gray-400",
};

export default function StepOrg({ onRestart }) {
  const [values, setValues] = useState(
    HUB.filters.reduce((acc, f) => ({ ...acc, [f.key]: f.options[0] }), {})
  );
  const [stage, setStage] = useState(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full min-w-0 overflow-x-hidden px-4 sm:px-6 py-4 sm:py-6 space-y-4">
        {/* Header, as the hub renders it */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-[1.15]">{HUB.title}</h1>
            <p className="text-[0.9375rem] text-gray-600 mt-1.5 leading-relaxed">{HUB.subtitle}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500">
              <RefreshCw className="w-3.5 h-3.5" />
            </span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500">
              <FileText className="w-3.5 h-3.5" />
            </span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500">
              <Download className="w-3.5 h-3.5" />
            </span>
            <span className="ml-2 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200">
              Sample
            </span>
          </div>
        </div>

        <HubFilterBar
          filters={HUB.filters}
          values={values}
          onChange={(key, value) => setValues((v) => ({ ...v, [key]: value }))}
          status={HUB.status}
          updated={HUB.updated}
        />

        {/* Four key metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {HUB.metrics.map((m) => (
            <HubMetricCard
              key={m.key}
              icon={METRIC_ICONS[m.icon] || Shield}
              tone={m.tone}
              value={m.value}
              label={m.label}
              description={m.description}
              footnote={m.footnote}
            />
          ))}
        </div>

        {/* Priority areas */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Priority areas</span>
          {HUB.priorityAreas.map((p) => (
            <span
              key={p.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${DOT[p.tone] || DOT.gray}`} />
              {p.label}
            </span>
          ))}
        </div>

        <HubLifecycleGrid stages={HUB.lifecycle} selected={stage} onSelect={setStage} />

        {stage && (
          <p className="text-[11px] text-gray-500 px-1">
            Filtering by lifecycle stage:{" "}
            <span className="font-semibold text-[#0202ff]">{HUB.lifecycle.find((s) => s.id === stage)?.label}</span>
            <button onClick={() => setStage(null)} className="ml-2 underline text-gray-400 hover:text-gray-600">
              Clear
            </button>
          </p>
        )}

        <div className="flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5">
          <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-700" />
          <p className="text-[11px] text-gray-700 leading-relaxed">{ORG.privacyNote}</p>
        </div>

        {/* Demo close-out */}
        <div className="rounded-2xl p-6 text-white" style={{ backgroundColor: "#0f0f1a" }}>
          <h2 className="text-xl font-bold leading-snug">That's the whole loop.</h2>
          <p className="mt-2 text-sm text-gray-300 leading-relaxed">
            See yourself, get support, keep the rhythm, train, show the movement. Every manager, every week, with
            evidence underneath it.
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