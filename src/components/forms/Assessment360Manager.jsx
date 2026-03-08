import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Save, Loader2, Mail, CheckCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function Assessment360Manager({ form, onUpdate }) {
  const [config, setConfig] = useState({
    is_360_assessment: false,
    target_user_email: "",
    respondent_emails: [],
    aggregation_status: "collecting"
  });
  const [respondentInput, setRespondentInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    if (form) {
      setConfig({
        is_360_assessment: form.is_360_assessment || false,
        target_user_email: form.target_user_email || "",
        respondent_emails: form.respondent_emails || [],
        aggregation_status: form.aggregation_status || "collecting"
      });
      loadSubmissions();
    }
  }, [form?.id]);

  const loadSubmissions = async () => {
    if (!form?.id) return;
    
    try {
      const subs = await base44.entities.CustomFormSubmission.filter({
        form_id: form.id,
        status: "submitted"
      });
      setSubmissions(subs);
    } catch (error) {
      console.error("Error loading submissions:", error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.CustomForm.update(form.id, {
        is_360_assessment: config.is_360_assessment,
        target_user_email: config.target_user_email,
        respondent_emails: config.respondent_emails,
        aggregation_status: config.aggregation_status
      });

      toast.success("360 assessment configuration saved");
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error saving 360 config:", error);
      toast.error("Failed to save 360 configuration");
    } finally {
      setSaving(false);
    }
  };

  const addRespondent = () => {
    if (!respondentInput || !respondentInput.includes('@')) {
      toast.error("Please enter a valid email");
      return;
    }

    if (config.respondent_emails.includes(respondentInput)) {
      toast.error("Respondent already added");
      return;
    }

    setConfig({
      ...config,
      respondent_emails: [...config.respondent_emails, respondentInput]
    });
    setRespondentInput("");
  };

  const removeRespondent = (email) => {
    setConfig({
      ...config,
      respondent_emails: config.respondent_emails.filter(e => e !== email)
    });
  };

  const responseProgress = config.respondent_emails.length > 0
    ? (submissions.length / config.respondent_emails.length) * 100
    : 0;

  const completedRespondents = submissions.map(s => s.submitter_email);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          360 Assessment Configuration
        </CardTitle>
        <p className="text-xs text-gray-600 mt-1">
          Configure multi-respondent 360-degree assessment
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Target User */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Person Being Assessed</Label>
          <Input
            type="email"
            value={config.target_user_email}
            onChange={(e) => setConfig({ ...config, target_user_email: e.target.value })}
            placeholder="user@example.com"
          />
          <p className="text-xs text-gray-500">
            The individual receiving feedback in this 360 assessment
          </p>
        </div>

        {/* Respondents */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Respondents</Label>
          <div className="flex gap-2">
            <Input
              type="email"
              value={respondentInput}
              onChange={(e) => setRespondentInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addRespondent()}
              placeholder="respondent@example.com"
            />
            <Button onClick={addRespondent} size="sm">
              <Mail className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>

          {config.respondent_emails.length > 0 && (
            <div className="space-y-2">
              {config.respondent_emails.map((email, idx) => (
                <Card key={idx} className="border">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{email}</span>
                      {completedRespondents.includes(email) && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    <Button
                      onClick={() => removeRespondent(email)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                    >
                      Remove
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Response Progress */}
        {config.respondent_emails.length > 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-blue-900">Response Progress</span>
                <Badge className="bg-blue-100 text-blue-700">
                  {submissions.length} / {config.respondent_emails.length}
                </Badge>
              </div>
              <Progress value={responseProgress} className="h-2" />
              <p className="text-xs text-blue-700">
                {submissions.length === config.respondent_emails.length
                  ? "All responses collected! Ready to aggregate."
                  : `Waiting for ${config.respondent_emails.length - submissions.length} more responses`
                }
              </p>
            </CardContent>
          </Card>
        )}

        {/* Aggregation Status */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Aggregation Status</Label>
          <div className="flex gap-2">
            {["collecting", "ready", "completed"].map(status => (
              <Badge
                key={status}
                variant={config.aggregation_status === status ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setConfig({ ...config, aggregation_status: status })}
              >
                {status}
              </Badge>
            ))}
          </div>
        </div>

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
              Save 360 Configuration
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}