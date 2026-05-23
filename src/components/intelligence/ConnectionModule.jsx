import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database, Upload, ArrowRight, Lock } from "lucide-react";

/**
 * Connection module — shown in place of empty analytics sections.
 * Converts "no data" into a setup experience with sample metrics shown in disabled state.
 */
export default function ConnectionModule({ icon: Icon, iconColor = "text-gray-500", title, description, valueProposition, dataSources = [], sampleMetrics = [], onConnect, onUploadCSV }) {
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
      <CardContent className="space-y-5">
        {/* Value proposition */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <p className="text-xs text-slate-700 leading-relaxed">{valueProposition}</p>
        </div>

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