import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle, Ban } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function SecurityAnalytics({ form }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecurityAnalytics();
  }, [form.id]);

  const loadSecurityAnalytics = async () => {
    try {
      const submissions = await base44.entities.CustomFormSubmission.filter({
        form_id: form.id
      }, '-created_date', 200);

      // Analyze submission sources
      const sourceCounts = {};
      submissions.forEach(sub => {
        const source = sub.submission_source || "direct";
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      });

      const sourceData = Object.entries(sourceCounts).map(([source, count]) => ({
        source,
        count
      }));

      // Check for suspicious patterns
      const suspiciousPatterns = detectSuspiciousActivity(submissions);

      // IP analysis (simulated - would need actual IP tracking)
      const uniqueUsers = new Set(submissions.map(s => s.submitter_email)).size;
      const suspiciousRatio = submissions.length > 0 ? (suspiciousPatterns.length / submissions.length) * 100 : 0;

      setAnalytics({
        sourceData,
        suspiciousPatterns,
        totalSubmissions: submissions.length,
        uniqueUsers,
        suspiciousRatio: suspiciousRatio.toFixed(1)
      });
    } catch (error) {
      console.error("Error loading security analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const detectSuspiciousActivity = (submissions) => {
    const suspicious = [];

    if (!submissions || submissions.length === 0) return suspicious;

    // Detect rapid submissions from same user
    const userSubmissions = {};
    submissions.forEach(sub => {
      if (!sub.submitter_email || !sub.created_date) return;
      
      if (!userSubmissions[sub.submitter_email]) {
        userSubmissions[sub.submitter_email] = [];
      }
      userSubmissions[sub.submitter_email].push(new Date(sub.created_date));
    });

    Object.entries(userSubmissions).forEach(([email, dates]) => {
      if (dates.length > 5) {
        dates.sort((a, b) => a - b);
        for (let i = 1; i < dates.length; i++) {
          const timeDiff = (dates[i] - dates[i - 1]) / 1000;
          if (timeDiff < 10) {
            suspicious.push({
              type: "rapid_submission",
              email,
              description: `Multiple submissions within ${timeDiff}s`
            });
            break;
          }
        }
      }
    });

    // Detect very short completion times
    submissions.forEach(sub => {
      if (sub.completion_time_seconds && sub.completion_time_seconds < 5) {
        suspicious.push({
          type: "fast_completion",
          email: sub.submitter_email,
          description: `Completed in ${sub.completion_time_seconds}s`
        });
      }
    });

    return suspicious.slice(0, 10);
  };

  const COLORS = ['#0202ff', '#6366f1', '#a78bfa', '#c4b5fd'];

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <p className="text-sm text-gray-600">Loading security analytics...</p>
        </CardContent>
      </Card>
    );
  }

  if (!analytics || analytics.totalSubmissions === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <Shield className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">No security data available yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Security Analytics
        </CardTitle>
        <p className="text-xs text-gray-600 mt-1">
          Monitor security threats and submission patterns
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Security Status */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-blue-600">Unique Users</span>
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {analytics.uniqueUsers}
              </div>
            </CardContent>
          </Card>

          <Card className={
            parseFloat(analytics.suspiciousRatio) > 10 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"
          }>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                {parseFloat(analytics.suspiciousRatio) > 10 ? (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
                <span className={`text-xs ${parseFloat(analytics.suspiciousRatio) > 10 ? "text-red-600" : "text-green-600"}`}>
                  Suspicious
                </span>
              </div>
              <div className={`text-2xl font-bold ${parseFloat(analytics.suspiciousRatio) > 10 ? "text-red-900" : "text-green-900"}`}>
                {analytics.suspiciousRatio}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submission Sources */}
        {analytics.sourceData.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Submission Sources</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.sourceData}
                    dataKey="count"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    label
                  >
                    {analytics.sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Suspicious Activity */}
        {analytics.suspiciousPatterns.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              Suspicious Activity Detected
            </h4>
            {analytics.suspiciousPatterns.map((pattern, idx) => (
              <Card key={idx} className="border-red-200 bg-red-50">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <Ban className="w-4 h-4 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="destructive" className="text-xs">
                          {pattern.type}
                        </Badge>
                        <span className="text-xs text-gray-600">{pattern.email}</span>
                      </div>
                      <p className="text-xs text-gray-700">{pattern.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {analytics.suspiciousPatterns.length === 0 && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-3 text-center">
              <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-green-900 font-medium">No suspicious activity detected</p>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}