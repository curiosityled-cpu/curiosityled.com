import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database, Upload, ArrowRight, Lock, CheckCircle2, Circle, ChevronDown, ChevronUp } from "lucide-react";

const CONNECTION_STEPS = [
  { key: "connect", label: "Connect" },
  { key: "map", label: "Map fields" },
  { key: "validate", label: "Validate" },
  { key: "active", label: "Active" },
];

/**
 * Connection module — shown in place of empty analytics sections.
 * Converts "no data" into a purposeful setup experience.
 */
export default function ConnectionModule({
  icon: Icon,
  iconColor = "text-gray-500",
  title,
  description,
  valueProposition,
  dataSources = [],
  sampleMetrics = [],
  expectedUnlocks = [],
  onConnect,
  onUploadCSV,
}) {
  const [whyOpen, setWhyOpen] = useState(false);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Icon className={`w-5 h-5 ${iconColor}`} />
              {title}
            </CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          </div>
          <Badge className="text-[11px] bg-gray-100 text-gray-500 border-gray-200 border">
            Not connected
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Connection steps progress */}
        <div className="flex items-center gap-0">
          {CONNECTION_STEPS.map((step, i) => (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center gap-1">
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${
                  i === 0 ? "border-indigo-500 bg-indigo-50 text-indigo-600" : "border-gray-200 bg-white text-gray-300"
                }`}>
                  {i === 0 ? <Circle className="w-3 h-3 text-indigo-500" /> : <Circle className="w-3 h-3" />}
                </div>
                <span className={`text-[10px] font-medium whitespace-nowrap ${i === 0 ? "text-indigo-600" : "text-gray-300"}`}>
                  {step.label}
                </span>
              </div>
              {i < CONNECTION_STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 mb-4 ${i === 0 ? "bg-indigo-200" : "bg-gray-100"}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Value proposition + why connect toggle */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <button
            onClick={() => setWhyOpen(v => !v)}
            className="w-full flex items-center justify-between text-left"
          >
            <span className="text-[11px] font-semibold text-slate-700">Why connect this?</span>
            {whyOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>
          {whyOpen && (
            <p className="text-xs text-slate-600 leading-relaxed mt-2">{valueProposition}</p>
          )}
          {!whyOpen && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{valueProposition}</p>
          )}
        </div>

        {/* Expected unlocks */}
        {expectedUnlocks.length > 0 && (
          <div>
            <p className="text-[11px] font-medium text-gray-500 mb-2 uppercase tracking-wide">Expected unlocks</p>
            <div className="space-y-1">
              {expectedUnlocks.map((unlock, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <span>{unlock}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sample metrics — disabled state */}
        {sampleMetrics.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-3.5 h-3.5 text-gray-400" />
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Metrics unlocked after connection</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {sampleMetrics.map((metric, i) => (
                <div key={i} className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3 opacity-60">
                  <div className="text-xl font-bold text-gray-300">—</div>
                  <div className="text-xs font-medium text-gray-400 mt-0.5">{metric.label}</div>
                  <div className="text-[10px] text-gray-300">{metric.hint}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data sources */}
        {dataSources.length > 0 && (
          <div>
            <p className="text-[11px] font-medium text-gray-500 mb-2">Data sources needed</p>
            <div className="flex flex-wrap gap-2">
              {dataSources.map((source, i) => (
                <span key={i} className="flex items-center gap-1 text-[11px] px-2 py-1 bg-white border border-gray-200 rounded-lg text-gray-600">
                  <Database className="w-3 h-3 text-gray-400" />
                  {source}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTAs */}
        <div className="flex flex-wrap gap-2 pt-1">
          {onUploadCSV && (
            <Button variant="outline" size="sm" onClick={onUploadCSV} className="text-xs gap-1.5">
              <Upload className="w-3.5 h-3.5" />
              Upload CSV
            </Button>
          )}
          {onConnect && (
            <Button size="sm" onClick={onConnect} className="text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
              Connect Data Source
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}