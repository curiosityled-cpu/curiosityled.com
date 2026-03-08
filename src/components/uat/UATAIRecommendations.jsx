import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw, AlertTriangle, TrendingUp, CheckCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";

/**
 * UATAIRecommendations - AI-powered analysis and recommendations for UAT testing
 * @param {Array} testCases - Array of all test cases for context
 * @returns {JSX.Element} AI recommendations card
 */
export default function UATAIRecommendations({ testCases }) {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [error, setError] = useState(null);

  const generateRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Filter high-risk and failed test cases
      const highRiskCases = testCases.filter(tc => (tc.overall_risk_score || 0) >= 50);
      const failedCases = testCases.filter(tc => {
        const latestRun = tc.test_runs?.[tc.test_runs.length - 1];
        return latestRun?.status === 'Failed';
      });

      // Aggregate data for AI analysis
      const analysisData = {
        totalTests: testCases.length,
        highRiskCount: highRiskCases.length,
        failedCount: failedCases.length,
        avgRiskScore: testCases.length > 0 
          ? Math.round(testCases.reduce((sum, tc) => sum + (tc.overall_risk_score || 0), 0) / testCases.length)
          : 0,
        topFailures: failedCases.slice(0, 5).map(tc => ({
          id: tc.test_case_id,
          feature: tc.feature_area,
          role: tc.role,
          riskScore: tc.overall_risk_score,
          latestFailure: tc.test_runs?.[tc.test_runs.length - 1]
        })),
        highRiskAreas: [...new Set(highRiskCases.map(tc => tc.feature_area))].filter(Boolean)
      };

      const prompt = `You are a UAT testing expert analyzing test results for a leadership development platform. Analyze the following UAT test data and provide actionable recommendations.

**Test Overview:**
- Total Test Cases: ${analysisData.totalTests}
- High Risk Cases (≥50): ${analysisData.highRiskCount}
- Failed Cases: ${analysisData.failedCount}
- Average Risk Score: ${analysisData.avgRiskScore}/100

**High-Risk Feature Areas:**
${analysisData.highRiskAreas.length > 0 ? analysisData.highRiskAreas.map(area => `- ${area}`).join('\n') : 'None identified'}

**Top Failed Test Cases:**
${analysisData.topFailures.length > 0 ? analysisData.topFailures.map(tc => 
  `- ${tc.id} (${tc.feature}) - Role: ${tc.role}, Risk: ${tc.riskScore || 0}, Severity: ${tc.latestFailure?.severity || 'N/A'}`
).join('\n') : 'None'}

Provide a structured analysis with:
1. **Priority Issues** - Most critical problems requiring immediate attention
2. **Testing Gaps** - Areas with insufficient coverage or repeated failures
3. **Resource Allocation** - Suggestions for tester assignment and focus areas
4. **Risk Mitigation** - Specific steps to reduce overall risk score
5. **Next Steps** - Concrete action items for the next sprint

Be concise, specific, and actionable. Focus on patterns and systemic issues rather than individual test cases.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      setRecommendations(response);
    } catch (err) {
      console.error('Error generating recommendations:', err);
      setError(err.message || 'Failed to generate recommendations');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (score) => {
    if (score >= 70) return 'text-red-600';
    if (score >= 50) return 'text-orange-600';
    if (score >= 30) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-purple-600" />
            <CardTitle className="text-xl">AI-Powered Recommendations</CardTitle>
          </div>
          <Button 
            onClick={generateRecommendations}
            disabled={loading || testCases.length === 0}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Insights
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {!recommendations && !error && !loading && (
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No recommendations generated yet</p>
            <p className="text-sm text-gray-500">Click "Generate Insights" to analyze your UAT test data and receive AI-powered recommendations</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <RefreshCw className="w-12 h-12 text-purple-600 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600 mb-2">Analyzing test data...</p>
            <p className="text-sm text-gray-500">This may take a few moments</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-3" />
            <p className="text-red-800 font-medium mb-2">Failed to generate recommendations</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {recommendations && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">AI Confidence</span>
                </div>
                <Badge className="bg-purple-600 text-white">High</Badge>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Issues Found</span>
                </div>
                <span className="text-2xl font-bold text-blue-900">
                  {testCases.filter(tc => (tc.overall_risk_score || 0) >= 50).length}
                </span>
              </div>

              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Coverage</span>
                </div>
                <span className="text-2xl font-bold text-green-900">
                  {testCases.length > 0 
                    ? Math.round((testCases.filter(tc => tc.test_runs?.length > 0).length / testCases.length) * 100)
                    : 0}%
                </span>
              </div>
            </div>

            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">{children}</h2>,
                  h2: ({ children }) => <h3 className="text-lg font-semibold text-gray-800 mt-5 mb-2">{children}</h3>,
                  h3: ({ children }) => <h4 className="text-base font-medium text-gray-700 mt-4 mb-2">{children}</h4>,
                  ul: ({ children }) => <ul className="list-disc list-inside space-y-2 my-3">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside space-y-2 my-3">{children}</ol>,
                  li: ({ children }) => <li className="text-gray-700">{children}</li>,
                  p: ({ children }) => <p className="text-gray-700 leading-relaxed mb-3">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                  code: ({ children }) => <code className="bg-gray-100 px-2 py-1 rounded text-sm text-gray-800">{children}</code>
                }}
              >
                {recommendations}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}