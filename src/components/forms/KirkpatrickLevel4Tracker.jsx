import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Save, Loader2, Plus, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function KirkpatrickLevel4Tracker({ submission, onUpdate }) {
  const [metrics, setMetrics] = useState({
    manual_metrics: [],
    linked_metrics: []
  });
  const [saving, setSaving] = useState(false);
  const [newMetric, setNewMetric] = useState({
    name: "",
    baseline: "",
    target: "",
    actual: "",
    metric_type: "manual"
  });

  useEffect(() => {
    if (submission?.result_data?.kirkpatrick_l4_metrics) {
      setMetrics(submission.result_data.kirkpatrick_l4_metrics);
    }
  }, [submission?.id]);

  const healthcareMetrics = [
    { value: "turnover_rate", label: "Staff Turnover Rate (%)" },
    { value: "patient_satisfaction", label: "Patient Satisfaction (NPS)" },
    { value: "safety_incidents", label: "Safety Incidents (per 1000 patient days)" },
    { value: "length_of_stay", label: "Average Length of Stay (days)" },
    { value: "readmission_rate", label: "30-Day Readmission Rate (%)" },
    { value: "employee_engagement", label: "Employee Engagement Score" },
    { value: "productivity", label: "Productivity (cases per day)" },
    { value: "cost_savings", label: "Cost Savings ($)" },
    { value: "quality_metrics", label: "Quality Metrics Score" },
    { value: "compliance_score", label: "Compliance Score (%)" }
  ];

  const handleAddMetric = () => {
    if (!newMetric.name || !newMetric.baseline || !newMetric.target) {
      toast.error("Please fill in metric name, baseline, and target");
      return;
    }

    const updatedManual = [...metrics.manual_metrics, { 
      ...newMetric, 
      id: Date.now().toString(),
      date_recorded: new Date().toISOString()
    }];
    
    setMetrics({ ...metrics, manual_metrics: updatedManual });
    setNewMetric({ name: "", baseline: "", target: "", actual: "", metric_type: "manual" });
  };

  const handleRemoveMetric = (id) => {
    setMetrics({
      ...metrics,
      manual_metrics: metrics.manual_metrics.filter(m => m.id !== id)
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedResultData = {
        ...submission.result_data,
        kirkpatrick_l4_metrics: metrics
      };

      await base44.entities.CustomFormSubmission.update(submission.id, {
        result_data: updatedResultData
      });

      toast.success("Level 4 metrics saved");
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error saving metrics:", error);
      toast.error("Failed to save metrics");
    } finally {
      setSaving(false);
    }
  };

  const calculateROI = (metric) => {
    const baseline = parseFloat(metric.baseline) || 0;
    const actual = parseFloat(metric.actual) || 0;
    const target = parseFloat(metric.target) || 0;
    
    if (baseline === 0) return 0;
    
    const improvement = ((actual - baseline) / baseline) * 100;
    const targetImprovement = ((target - baseline) / baseline) * 100;
    
    return {
      improvement: improvement.toFixed(1),
      targetImprovement: targetImprovement.toFixed(1),
      achievedPercentage: targetImprovement !== 0 ? ((improvement / targetImprovement) * 100).toFixed(0) : 0
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Kirkpatrick Level 4: Results & ROI
        </CardTitle>
        <p className="text-xs text-gray-600 mt-1">
          Track business impact and return on investment
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add New Metric */}
        <Card className="bg-gray-50 border-dashed">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Add New Metric</Label>
              <Badge variant="outline">Manual Input</Badge>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Label className="text-xs">Metric Name</Label>
                <Select
                  value={newMetric.name}
                  onValueChange={(value) => setNewMetric({ ...newMetric, name: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select metric..." />
                  </SelectTrigger>
                  <SelectContent>
                    {healthcareMetrics.map(m => (
                      <SelectItem key={m.value} value={m.label}>
                        {m.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom Metric</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newMetric.name === "Custom Metric" && (
                <div className="col-span-2">
                  <Label className="text-xs">Custom Metric Name</Label>
                  <Input
                    value={newMetric.custom_name || ""}
                    onChange={(e) => setNewMetric({ ...newMetric, custom_name: e.target.value, name: e.target.value })}
                    placeholder="Enter custom metric name"
                  />
                </div>
              )}

              <div>
                <Label className="text-xs">Baseline Value</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newMetric.baseline}
                  onChange={(e) => setNewMetric({ ...newMetric, baseline: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div>
                <Label className="text-xs">Target Value</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newMetric.target}
                  onChange={(e) => setNewMetric({ ...newMetric, target: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div>
                <Label className="text-xs">Actual Value (Optional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newMetric.actual}
                  onChange={(e) => setNewMetric({ ...newMetric, actual: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <Button onClick={handleAddMetric} size="sm" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Metric
            </Button>
          </CardContent>
        </Card>

        {/* Display Metrics */}
        {metrics.manual_metrics.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Tracked Metrics</Label>
            {metrics.manual_metrics.map((metric) => {
              const roi = calculateROI(metric);
              return (
                <Card key={metric.id} className="border">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">{metric.name}</p>
                        <p className="text-xs text-gray-500">
                          Recorded {new Date(metric.date_recorded).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleRemoveMetric(metric.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                      <div>
                        <p className="text-gray-500">Baseline</p>
                        <p className="font-medium">{metric.baseline}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Target</p>
                        <p className="font-medium">{metric.target}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Actual</p>
                        <p className="font-medium">{metric.actual || "TBD"}</p>
                      </div>
                    </div>

                    {metric.actual && (
                      <div className="bg-blue-50 p-2 rounded space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-700">Improvement:</span>
                          <Badge className={parseFloat(roi.improvement) > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                            {roi.improvement}%
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-700">Target Achievement:</span>
                          <Badge className="bg-blue-100 text-blue-700">
                            {roi.achievedPercentage}%
                          </Badge>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
          style={{ backgroundColor: '#0202ff' }}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Level 4 Metrics
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}