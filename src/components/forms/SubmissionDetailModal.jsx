import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, Award, Users, TrendingUp, DollarSign, Target } from "lucide-react";
import AIResponseAnalyzer from "./AIResponseAnalyzer";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

export default function SubmissionDetailModal({ submission, form, onClose, onUpdate }) {
  if (!submission || !form) return null;
  
  // Specialized result renderers
  const render360Results = () => {
    if (!submission.result_data?.aggregated_scores) return null;

    const { aggregated_scores, response_count, respondent_breakdown } = submission.result_data;
    
    const radarData = Object.entries(aggregated_scores).map(([competency, score]) => ({
      competency: competency.replace(/_/g, ' '),
      score: score
    }));

    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            360 Assessment Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{response_count || 0}</p>
              <p className="text-sm text-gray-600">Total Responses</p>
            </div>
            {respondent_breakdown && Object.entries(respondent_breakdown).map(([type, count]) => (
              <div key={type} className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{count}</p>
                <p className="text-sm text-gray-600">{type.replace(/_/g, ' ')}</p>
              </div>
            ))}
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="competency" />
                <PolarRadiusAxis angle={90} domain={[0, 5]} />
                <Radar name="Average Score" dataKey="score" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            {Object.entries(aggregated_scores).map(([competency, score]) => (
              <div key={competency} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="font-medium">{competency.replace(/_/g, ' ')}</span>
                <span className="text-lg font-bold text-blue-600">{score.toFixed(2)} / 5</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderDISCResults = () => {
    if (!submission.result_data?.disc_profile) return null;

    const { primary_style, secondary_style, scores, description } = submission.result_data.disc_profile;
    
    const chartData = Object.entries(scores).map(([style, score]) => ({
      style,
      score
    }));

    const styleColors = {
      D: '#ef4444',
      I: '#f59e0b',
      S: '#10b981',
      C: '#3b82f6'
    };

    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>DISC Personality Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Primary Style</p>
            <p className="text-4xl font-bold" style={{ color: styleColors[primary_style] }}>
              {primary_style}
            </p>
            {secondary_style && (
              <p className="text-lg text-gray-600 mt-2">
                Secondary: <span className="font-semibold">{secondary_style}</span>
              </p>
            )}
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="style" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="score" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {description && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Profile Description</p>
              <p className="text-sm text-gray-600">{description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {Object.entries(scores).map(([style, score]) => (
              <div key={style} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-lg">{style}</span>
                  <span className="text-2xl font-bold" style={{ color: styleColors[style] }}>
                    {score}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all"
                    style={{ 
                      width: `${score}%`,
                      backgroundColor: styleColors[style]
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderMBTIResults = () => {
    if (!submission.result_data?.mbti_type) return null;

    const { mbti_type, dimensions, description } = submission.result_data;

    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>MBTI Personality Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center p-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Your Type</p>
            <p className="text-5xl font-bold text-indigo-600">{mbti_type}</p>
          </div>

          {dimensions && (
            <div className="space-y-4">
              <p className="font-semibold">Dimension Scores</p>
              {Object.entries(dimensions).map(([dimension, score]) => (
                <div key={dimension} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{dimension}</span>
                    <span className="text-sm text-gray-600">{score}%</span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 transition-all"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {description && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Type Description</p>
              <p className="text-sm text-gray-600">{description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderKirkpatrickL4Results = () => {
    if (!submission.result_data?.roi_metrics) return null;

    const { roi_metrics, business_impact, recommendations } = submission.result_data;
    const { 
      program_cost, 
      total_benefits, 
      roi_percentage, 
      payback_period_months,
      benefit_cost_ratio 
    } = roi_metrics;

    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Kirkpatrick Level 4: ROI Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{roi_percentage}%</p>
              <p className="text-xs text-gray-600">ROI</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <DollarSign className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">${total_benefits?.toLocaleString()}</p>
              <p className="text-xs text-gray-600">Total Benefits</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg text-center">
              <Target className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">{benefit_cost_ratio?.toFixed(2)}:1</p>
              <p className="text-xs text-gray-600">Benefit/Cost</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg text-center">
              <Clock className="w-6 h-6 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-600">{payback_period_months}</p>
              <p className="text-xs text-gray-600">Payback (months)</p>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="font-semibold mb-2">Program Investment</p>
            <p className="text-2xl font-bold text-gray-700">${program_cost?.toLocaleString()}</p>
          </div>

          {business_impact && (
            <div className="space-y-3">
              <p className="font-semibold">Business Impact Metrics</p>
              {Object.entries(business_impact).map(([metric, value]) => (
                <div key={metric} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm">{metric.replace(/_/g, ' ')}</span>
                  <span className="font-semibold">{value}</span>
                </div>
              ))}
            </div>
          )}

          {recommendations && recommendations.length > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="font-semibold mb-2">Recommendations</p>
              <ul className="space-y-2">
                {recommendations.map((rec, idx) => (
                  <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      await base44.entities.CustomFormSubmission.update(submission.id, {
        status: newStatus,
        reviewed_by: (await base44.auth.me()).email,
        reviewed_at: new Date().toISOString()
      });
      toast.success(`Submission ${newStatus}`);
      onUpdate();
      onClose();
    } catch (error) {
      console.error("Error updating submission:", error);
      toast.error("Failed to update submission");
    }
  };

  const renderResponse = (question, response) => {
    if (response === null || response === undefined || response === "") {
      return <span className="text-gray-400">No response</span>;
    }

    switch (question.type) {
      case "checkboxes":
        if (Array.isArray(response)) {
          return response.length > 0 ? response.join(", ") : <span className="text-gray-400">No selection</span>;
        }
        return String(response);
      case "rating_scale":
        return `${response} / ${question.max_value || 5} stars`;
      case "linear_scale":
        const labels = question.min_label && question.max_label 
          ? ` (${question.min_label} → ${question.max_label})`
          : '';
        return `${response}${labels}`;
      case "yes_no":
        return response === "yes" ? "Yes" : "No";
      case "date":
        try {
          return new Date(response).toLocaleDateString();
        } catch {
          return String(response);
        }
      default:
        // Sanitize to prevent XSS
        const sanitized = String(response).replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return <span dangerouslySetInnerHTML={{ __html: sanitized }} />;
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submission Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Submission Info */}
          <Card className="p-4 bg-gray-50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Submitter</p>
                <p className="text-base">{submission.submitter_name}</p>
                <p className="text-sm text-gray-500">{submission.submitter_email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Status</p>
                <Badge className="mt-1">
                  {submission.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Submitted</p>
                <p className="text-base">
                  {new Date(submission.submitted_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Time Taken</p>
                <p className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {submission.completion_time_seconds 
                    ? `${Math.floor(submission.completion_time_seconds / 60)}m ${submission.completion_time_seconds % 60}s`
                    : "—"
                  }
                </p>
              </div>
            </div>
          </Card>

          {/* Score Display */}
          {submission.score !== undefined && submission.score !== null && (
            <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Score</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {submission.score}/{submission.max_score || 0}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {submission.percentage || 0}% • {submission.passed ? "PASSED ✓" : "FAILED"}
                  </p>
                </div>
                <Award className="w-12 h-12 text-orange-400" />
              </div>
            </div>
          )}

          {/* Responses */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Responses</h3>
            
            {form.config?.sections?.map((section) => (
              <Card key={section.id} className="p-4">
                <h4 className="font-semibold mb-4">{section.title}</h4>
                <div className="space-y-4">
                  {section.questions?.map((question) => (
                    <div key={question.id} className="border-l-2 border-gray-200 pl-4">
                      <p className="font-medium text-sm text-gray-700">
                        {question.question_text}
                      </p>
                      <p className="text-base mt-1">
                        {renderResponse(question, submission.responses?.[question.id])}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          {/* Specialized Result Views */}
          {form.form_type === '360_assessment' && render360Results()}
          {form.form_type === 'disc_assessment' && renderDISCResults()}
          {form.form_type === 'mbti_assessment' && renderMBTIResults()}
          {form.form_type === 'kirkpatrick_level_4' && renderKirkpatrickL4Results()}

          {/* AI Analysis */}
          <AIResponseAnalyzer 
            submission={submission}
            form={form}
            onUpdate={onUpdate}
          />

          {/* Actions */}
          {submission.status === "submitted" && (
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => handleUpdateStatus("rejected")}
                className="text-red-600"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => handleUpdateStatus("approved")}
                style={{ backgroundColor: '#0202ff' }}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}