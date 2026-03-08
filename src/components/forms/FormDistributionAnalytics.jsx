import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Eye, MousePointer, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function FormDistributionAnalytics({ form }) {
  const [analytics, setAnalytics] = useState({
    total_views: 0,
    total_submissions: 0,
    conversion_rate: 0,
    sources: [],
    peak_times: []
  });

  useEffect(() => {
    loadAnalytics();
  }, [form.id]);

  const loadAnalytics = async () => {
    try {
      const submissions = await base44.entities.CustomFormSubmission.filter({
        form_id: form.id
      });

      // Calculate basic analytics
      const totalSubmissions = submissions.length;
      const estimatedViews = Math.max(totalSubmissions * 3, totalSubmissions); // Rough estimate, minimum is submissions
      const conversionRate = estimatedViews > 0 ? ((totalSubmissions / estimatedViews) * 100).toFixed(1) : 0;

      // Analyze submission sources
      const sourceCounts = {};
      submissions.forEach(sub => {
        const source = sub.submission_source || "direct";
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      });

      const sources = Object.entries(sourceCounts).map(([source, count]) => ({
        name: source,
        count,
        percentage: ((count / totalSubmissions) * 100).toFixed(1)
      }));

      setAnalytics({
        total_views: estimatedViews,
        total_submissions: totalSubmissions,
        conversion_rate: parseFloat(conversionRate),
        sources,
        peak_times: []
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Distribution Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Eye className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-blue-600">Est. Views</span>
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {analytics.total_views}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-600">Submissions</span>
              </div>
              <div className="text-2xl font-bold text-green-900">
                {analytics.total_submissions}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conversion Rate */}
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MousePointer className="w-4 h-4 text-purple-600" />
                  <span className="text-xs text-purple-600">Conversion Rate</span>
                </div>
                <div className="text-2xl font-bold text-purple-900">
                  {analytics.conversion_rate}%
                </div>
              </div>
              <Badge variant={
                analytics.conversion_rate > 30 ? "default" :
                analytics.conversion_rate > 15 ? "secondary" : "outline"
              }>
                {analytics.conversion_rate > 30 ? "Excellent" :
                 analytics.conversion_rate > 15 ? "Good" : "Low"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Traffic Sources */}
        {analytics.sources.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Traffic Sources
            </h4>
            {analytics.sources.map((source, idx) => (
              <Card key={idx} className="border">
                <CardContent className="py-2 px-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium capitalize">
                        {source.name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {source.count}
                      </Badge>
                    </div>
                    <span className="text-sm text-gray-600">
                      {source.percentage}%
                    </span>
                  </div>
                  <div className="mt-1 bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full"
                      style={{ width: `${source.percentage}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {analytics.total_submissions === 0 && (
          <div className="text-center py-6 text-gray-500 text-sm">
            <TrendingUp className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            No analytics data yet. Share your form to start collecting data.
          </div>
        )}
      </CardContent>
    </Card>
  );
}