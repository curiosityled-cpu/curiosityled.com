import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { Sparkles, Target, Zap, Brain, ChevronRight, AlertCircle, Loader2, Star, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AtreusCoach from "@/components/ai/AtreusCoach";

function InsightCard({ insight }) {
  const riskCount = insight.risk_flags?.length || 0;
  const riskColor = riskCount === 0 ? 'text-emerald-600' : riskCount <= 1 ? 'text-amber-600' : 'text-red-600';
  const riskLabel = riskCount === 0 ? 'On Track' : riskCount <= 1 ? 'Developing' : 'Needs Focus';
  const riskBg = riskCount === 0 ? 'bg-emerald-50 border-emerald-200' : riskCount <= 1 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

  return (
    <Card className="shadow-sm border-0 bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#0202ff]" />
            My Insight
          </CardTitle>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${riskBg} ${riskColor}`}>
            {riskLabel}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {insight.archetype && (
          <div className="bg-[#0202ff]/5 rounded-xl p-4">
            <p className="text-xs text-[#0202ff] font-semibold uppercase tracking-wide mb-1">Your Leadership Archetype</p>
            <p className="text-lg font-bold text-gray-900">{insight.archetype}</p>
          </div>
        )}

        {insight.summary && (
          <p className="text-sm text-gray-600 leading-relaxed">{insight.summary}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {insight.top_strengths?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-500" /> Strengths
              </p>
              <ul className="space-y-1.5">
                {insight.top_strengths.slice(0, 3).map((s, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {insight.development_areas?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-blue-500" /> Growth Areas
              </p>
              <ul className="space-y-1.5">
                {insight.development_areas.slice(0, 3).map((d, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FocusCard({ recommendation }) {
  return (
    <Card className="shadow-sm border-0 bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          My Focus This Week
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <p className="text-sm text-gray-800 leading-relaxed">{recommendation}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function NextStepCard() {
  return (
    <Card className="shadow-sm border-0 bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Target className="w-4 h-4 text-[#0202ff]" />
          My Next Step
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Link to="/Performance">
          <div className="flex items-center justify-between p-3 bg-[#0202ff] text-white rounded-xl hover:bg-[#0101dd] transition-colors cursor-pointer">
            <div>
              <p className="text-sm font-semibold">Set a Leadership Goal</p>
              <p className="text-xs text-blue-100 mt-0.5">Turn your development area into action</p>
            </div>
            <ArrowRight className="w-4 h-4 flex-shrink-0" />
          </div>
        </Link>
        <Link to="/LearningLibrary">
          <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
            <div>
              <p className="text-sm font-semibold text-gray-900">Explore a Resource</p>
              <p className="text-xs text-gray-500 mt-0.5">Find learning aligned to your growth areas</p>
            </div>
            <ArrowRight className="w-4 h-4 flex-shrink-0 text-gray-400" />
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}

function NoInsightState() {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
      <div className="w-14 h-14 bg-[#0202ff]/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <Sparkles className="w-7 h-7 text-[#0202ff]" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Insight is Being Generated</h3>
      <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
        Complete your leadership assessment to unlock your personalized insight, archetype, and recommended next steps.
      </p>
      <Link to="/Assessments">
        <Button className="bg-[#0202ff] hover:bg-[#0101dd] text-white">
          Take Assessment
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </Link>
    </div>
  );
}

export default function MyLeadership() {
  const { user } = useAuth();
  const [showAtreus, setShowAtreus] = useState(false);

  const { data: insights, isLoading } = useQuery({
    queryKey: ['my-insight', user?.email],
    queryFn: async () => {
      const results = await base44.entities.AssessmentInsights.filter(
        { user_email: user.email, status: 'generated' },
        '-created_date',
        1
      );
      return results[0] || null;
    },
    enabled: !!user?.email,
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" />
      </div>
    );
  }

  const firstName = user?.full_name?.split(' ')[0] || 'Leader';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900">My Leadership</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back, {firstName}. Here's your leadership snapshot.</p>
      </div>

      {insights ? (
        <>
          <InsightCard insight={insights} />
          {insights.recommendations?.[0] && <FocusCard recommendation={insights.recommendations[0]} />}
          <NextStepCard />
        </>
      ) : (
        <NoInsightState />
      )}

      {/* Ask Atreus CTA */}
      <Card className="shadow-sm border-0 bg-gradient-to-br from-[#0202ff]/5 to-blue-50">
        <CardContent className="py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0202ff] flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Ask Atreus</p>
              <p className="text-xs text-gray-500">Get real-time coaching support</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-[#0202ff] text-[#0202ff] hover:bg-[#0202ff] hover:text-white"
            onClick={() => setShowAtreus(true)}
          >
            Start Chat
          </Button>
        </CardContent>
      </Card>

      {/* Atreus Coach */}
      {showAtreus && (
        <AtreusCoach
          context={{ pageType: 'my-leadership', userRole: user?.app_role, userEmail: user?.email }}
          isMinimized={false}
          onMinimize={() => setShowAtreus(false)}
          onClose={() => setShowAtreus(false)}
        />
      )}
    </div>
  );
}