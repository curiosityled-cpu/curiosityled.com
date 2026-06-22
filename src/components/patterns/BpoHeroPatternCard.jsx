import React from "react";
import { AlertTriangle, Users, Zap, ArrowRight, TrendingDown, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const BUCKET_STYLES = {
  'Operational Risk': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: AlertTriangle },
  'People Risk':      { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: Users },
  'Execution':        { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: Zap },
};

const STATUS_STYLES = {
  Emerging:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  Active:     'bg-orange-100 text-orange-800 border-orange-200',
  Persistent: 'bg-red-100 text-red-800 border-red-200',
};

export default function BpoHeroPatternCard({ pattern, onOpenAtreus }) {
  const navigate = useNavigate();

  if (!pattern) return null;

  const { name, bucket, status, tagline, whatsAtStake, kpiLinks, cta, ctaType, evidence } = pattern;
  const style = BUCKET_STYLES[bucket] || BUCKET_STYLES['Execution'];
  const BucketIcon = style.icon;

  const handleCta = () => {
    if (ctaType === 'practice') navigate('/practice');
    else if (ctaType === 'today') navigate('/today');
    else if (onOpenAtreus) onOpenAtreus(`I want to work on: ${name}. ${tagline}`);
  };

  return (
    <Card className={`shadow-sm border ${style.border} ${style.bg} rounded-2xl overflow-hidden`}>
      {/* Top accent bar */}
      <div className={`h-1 ${status === 'Persistent' ? 'bg-red-500' : status === 'Active' ? 'bg-orange-400' : 'bg-yellow-400'}`} />

      <CardContent className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${style.bg} border ${style.border}`}>
              <BucketIcon className={`w-4 h-4 ${style.text}`} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-0.5">{bucket}</p>
              <h3 className="text-base font-bold text-gray-900 leading-tight">{name}</h3>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <Badge variant="outline" className={`text-[10px] font-semibold px-2 py-0.5 border ${STATUS_STYLES[status] || ''}`}>
              {status}
            </Badge>
          </div>
        </div>

        {/* Tagline */}
        <p className="text-sm text-gray-700 font-medium mb-3 leading-snug">{tagline}</p>

        {/* Evidence bullets */}
        {evidence.length > 0 && (
          <div className="mb-3 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">What's driving this</p>
            {evidence.slice(0, 3).map((e, i) => (
              <div key={i} className="flex items-start gap-2">
                <TrendingDown className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-600 leading-snug">{e}</p>
              </div>
            ))}
          </div>
        )}

        {/* What's at stake */}
        <div className={`rounded-lg px-3 py-2 mb-3 border ${style.border} bg-white/60`}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">What's at stake</p>
          <p className="text-xs text-gray-700 leading-snug">{whatsAtStake}</p>
        </div>

        {/* KPI linkage */}
        {kpiLinks?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {kpiLinks.map(kpi => (
              <span key={kpi} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-gray-200 text-[10px] font-medium text-gray-600">
                <Activity className="w-2.5 h-2.5 text-gray-400" />
                {kpi}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        <Button
          onClick={handleCta}
          size="sm"
          className="w-full text-white text-xs font-semibold"
          style={{ backgroundColor: '#0202ff' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#0101dd')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#0202ff')}
        >
          {cta}
          <ArrowRight className="w-3 h-3 ml-1.5" />
        </Button>
      </CardContent>
    </Card>
  );
}