import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Award, Mail } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function AutoScoringManager({ form, onUpdate }) {
  const [config, setConfig] = useState(form.config || {});
  const [saving, setSaving] = useState(false);

  const scoringConfig = config.scoring_config || {
    enabled: false,
    passing_score: 70,
    show_correct_answers: false,
    show_score_immediately: true,
    send_results_email: false,
    grading_method: "automatic"
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.CustomForm.update(form.id, {
        config: {
          ...config,
          scoring_config: scoringConfig
        }
      });
      toast.success("Scoring settings saved");
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error saving scoring:", error);
      toast.error("Failed to save scoring settings");
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (field, value) => {
    const updated = { ...scoringConfig, [field]: value };
    setConfig({ ...config, scoring_config: updated });
  };

  const isQuizOrExam = ["quiz", "exam"].includes(form.form_type);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5" />
          Auto-Scoring Configuration
        </CardTitle>
        {isQuizOrExam && (
          <p className="text-xs text-blue-600 mt-1">
            Recommended for {form.form_type} forms
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="enable_scoring"
            checked={scoringConfig.enabled}
            onCheckedChange={(checked) => updateConfig("enabled", checked)}
          />
          <label htmlFor="enable_scoring" className="text-sm font-medium cursor-pointer">
            Enable automatic scoring
          </label>
        </div>

        {scoringConfig.enabled && (
          <>
            <div>
              <Label htmlFor="passing_score">Passing Score (%)</Label>
              <Input
                id="passing_score"
                type="number"
                min="0"
                max="100"
                value={scoringConfig.passing_score}
                onChange={(e) => updateConfig("passing_score", parseInt(e.target.value) || 70)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum percentage required to pass
              </p>
            </div>

            <div>
              <Label htmlFor="grading_method">Grading Method</Label>
              <Select
                value={scoringConfig.grading_method}
                onValueChange={(value) => updateConfig("grading_method", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatic">Automatic (instant)</SelectItem>
                  <SelectItem value="manual">Manual review required</SelectItem>
                  <SelectItem value="hybrid">Hybrid (auto + manual review)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="show_score"
                  checked={scoringConfig.show_score_immediately}
                  onCheckedChange={(checked) => updateConfig("show_score_immediately", checked)}
                />
                <label htmlFor="show_score" className="text-sm cursor-pointer">
                  Show score immediately after submission
                </label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="show_answers"
                  checked={scoringConfig.show_correct_answers}
                  onCheckedChange={(checked) => updateConfig("show_correct_answers", checked)}
                />
                <label htmlFor="show_answers" className="text-sm cursor-pointer">
                  Show correct answers after submission
                </label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="send_email"
                  checked={scoringConfig.send_results_email}
                  onCheckedChange={(checked) => updateConfig("send_results_email", checked)}
                />
                <label htmlFor="send_email" className="text-sm cursor-pointer">
                  <Mail className="w-3 h-3 inline mr-1" />
                  Email results to submitter
                </label>
              </div>
            </div>
          </>
        )}

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
          style={{ backgroundColor: '#0202ff' }}
        >
          {saving ? "Saving..." : "Save Scoring Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}