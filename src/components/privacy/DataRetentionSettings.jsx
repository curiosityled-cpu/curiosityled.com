import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Info } from "lucide-react";
import { toast } from "sonner";

export default function DataRetentionSettings({ user }) {
  const [settings, setSettings] = useState({
    assessmentData: "7_years",
    learningHistory: "5_years",
    conversationLogs: "2_years",
    activityLogs: "1_year",
    deletedUserData: "90_days"
  });
  const [saving, setSaving] = useState(false);

  const retentionOptions = [
    { value: "90_days", label: "90 Days" },
    { value: "6_months", label: "6 Months" },
    { value: "1_year", label: "1 Year" },
    { value: "2_years", label: "2 Years" },
    { value: "5_years", label: "5 Years" },
    { value: "7_years", label: "7 Years" },
    { value: "indefinite", label: "Indefinite" }
  ];

  const categories = [
    {
      key: "assessmentData",
      label: "Assessment Data",
      description: "Leadership assessment results and analytics",
      recommended: "7 Years"
    },
    {
      key: "learningHistory",
      label: "Learning History",
      description: "Completed courses and certifications",
      recommended: "5 Years"
    },
    {
      key: "conversationLogs",
      label: "AI Coach Conversations",
      description: "Chat history with Atreus",
      recommended: "2 Years"
    },
    {
      key: "activityLogs",
      label: "Activity Logs",
      description: "Platform usage and access logs",
      recommended: "1 Year"
    },
    {
      key: "deletedUserData",
      label: "Deleted User Data",
      description: "Grace period before permanent deletion",
      recommended: "90 Days"
    }
  ];

  const handleSave = async () => {
    try {
      setSaving(true);
      // In production, save to client configuration
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Data retention settings saved");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Data Retention Policies
          </CardTitle>
          <CardDescription>
            Configure how long different types of data are retained before automatic deletion
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Retention Settings */}
          <div className="space-y-4">
            {categories.map((category) => (
              <div key={category.key} className="border rounded-lg p-4 space-y-3">
                <div>
                  <Label className="text-sm font-semibold">{category.label}</Label>
                  <p className="text-xs text-gray-500 mt-0.5">{category.description}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Info className="w-3 h-3 text-blue-500" />
                    <span className="text-xs text-blue-600">
                      Recommended: {category.recommended}
                    </span>
                  </div>
                </div>
                
                <Select
                  value={settings[category.key]}
                  onValueChange={(value) =>
                    setSettings({ ...settings, [category.key]: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {retentionOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {/* Warning */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-yellow-900 mb-1">Important</p>
                <p className="text-yellow-800">
                  Reducing retention periods will permanently delete older data. Some data 
                  (e.g., assessment results) may need to be retained for compliance or legal reasons. 
                  Consult with your legal team before making changes.
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#0202ff] hover:bg-[#0101dd]"
            >
              {saving ? "Saving..." : "Save Retention Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Note */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-semibold text-sm mb-2">Compliance Considerations</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• GDPR requires data to be kept no longer than necessary</li>
            <li>• Some jurisdictions require minimum retention periods for employment records</li>
            <li>• Healthcare data may be subject to HIPAA retention requirements</li>
            <li>• Legal holds override automatic deletion policies</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}