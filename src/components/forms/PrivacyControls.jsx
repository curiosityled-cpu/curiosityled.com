import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Save, Download, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function PrivacyControls({ form, onUpdate }) {
  const [privacy, setPrivacy] = useState({
    allow_anonymous_submissions: false,
    hide_submitter_names: false,
    redact_pii_in_exports: true,
    allow_data_download: true,
    allow_data_deletion: true,
    show_privacy_notice: true,
    collect_consent_timestamp: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (form?.config?.privacy) {
      setPrivacy(prev => ({ ...prev, ...form.config.privacy }));
    }
  }, [form?.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.CustomForm.update(form.id, {
        config: {
          ...form.config,
          privacy
        }
      });

      toast.success("Privacy settings saved");
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error saving privacy:", error);
      toast.error("Failed to save privacy settings");
    } finally {
      setSaving(false);
    }
  };

  const privacyOptions = [
    {
      key: "allow_anonymous_submissions",
      label: "Allow Anonymous Submissions",
      description: "Let users submit without providing identity",
      icon: EyeOff
    },
    {
      key: "hide_submitter_names",
      label: "Hide Submitter Names",
      description: "Show only emails in admin view",
      icon: Eye
    },
    {
      key: "redact_pii_in_exports",
      label: "Redact PII in Exports",
      description: "Remove personal data from CSV exports",
      icon: Download
    },
    {
      key: "allow_data_download",
      label: "Allow Users to Download Data",
      description: "Let users download their own submissions",
      icon: Download
    },
    {
      key: "allow_data_deletion",
      label: "Allow Users to Delete Data",
      description: "Let users delete their submissions",
      icon: EyeOff
    },
    {
      key: "show_privacy_notice",
      label: "Show Privacy Notice",
      description: "Display privacy information on form",
      icon: Eye
    },
    {
      key: "collect_consent_timestamp",
      label: "Collect Consent Timestamp",
      description: "Record when user agreed to terms",
      icon: Eye
    }
  ];

  const activePrivacyCount = Object.values(privacy).filter(v => v === true).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <EyeOff className="w-5 h-5" />
          Privacy Controls
        </CardTitle>
        <p className="text-xs text-gray-600 mt-1">
          Configure data privacy and user rights
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Privacy Level Indicator */}
        <Card className={
          activePrivacyCount >= 5 ? "bg-green-50 border-green-200" :
          activePrivacyCount >= 3 ? "bg-yellow-50 border-yellow-200" :
          "bg-red-50 border-red-200"
        }>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Privacy Level</p>
                <p className="text-xs text-gray-600">
                  {activePrivacyCount} of {privacyOptions.length} protections enabled
                </p>
              </div>
              <Badge className={
                activePrivacyCount >= 5 ? "bg-green-100 text-green-700" :
                activePrivacyCount >= 3 ? "bg-yellow-100 text-yellow-700" :
                "bg-red-100 text-red-700"
              }>
                {activePrivacyCount >= 5 ? "Strong" :
                 activePrivacyCount >= 3 ? "Moderate" : "Weak"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Options */}
        <div className="space-y-3">
          {privacyOptions.map((option) => {
            const Icon = option.icon;
            return (
              <div key={option.key} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex items-start gap-3">
                  <Icon className="w-4 h-4 text-gray-600 mt-1" />
                  <div>
                    <Label className="text-sm font-medium">{option.label}</Label>
                    <p className="text-xs text-gray-500">{option.description}</p>
                  </div>
                </div>
                <Switch
                  checked={privacy[option.key]}
                  onCheckedChange={(checked) => setPrivacy({ ...privacy, [option.key]: checked })}
                />
              </div>
            );
          })}
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
              Save Privacy Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}