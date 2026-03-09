import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ShieldCheck, Save, FileText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ComplianceManager({ form, onUpdate }) {
  const [compliance, setCompliance] = useState({
    gdpr_compliant: false,
    hipaa_compliant: false,
    ccpa_compliant: false,
    data_retention_days: 365,
    encryption_enabled: true,
    audit_logging_enabled: true,
    privacy_policy_url: "",
    terms_url: "",
    consent_text: "I agree to the privacy policy and terms of service",
    require_consent: true,
    data_processing_agreement: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (form?.config?.compliance) {
      setCompliance(prev => ({ ...prev, ...form.config.compliance }));
    }
  }, [form?.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.CustomForm.update(form.id, {
        config: {
          ...form.config,
          compliance
        }
      });

      toast.success("Compliance settings saved");
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error saving compliance:", error);
      toast.error("Failed to save compliance settings");
    } finally {
      setSaving(false);
    }
  };

  const complianceStandards = [
    { key: "gdpr_compliant", label: "GDPR", description: "EU data protection" },
    { key: "hipaa_compliant", label: "HIPAA", description: "Healthcare data privacy" },
    { key: "ccpa_compliant", label: "CCPA", description: "California privacy law" }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" />
          Compliance Manager
        </CardTitle>
        <p className="text-xs text-gray-600 mt-1">
          Configure compliance and data protection settings
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Compliance Standards */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Compliance Standards</Label>
          {complianceStandards.map((standard) => (
            <div key={standard.key} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={compliance[standard.key]}
                  onCheckedChange={(checked) => setCompliance({ ...compliance, [standard.key]: checked })}
                />
                <div>
                  <Label className="text-sm font-medium cursor-pointer">
                    {standard.label}
                  </Label>
                  <p className="text-xs text-gray-500">{standard.description}</p>
                </div>
              </div>
              {compliance[standard.key] && (
                <Badge className="bg-green-100 text-green-700">Active</Badge>
              )}
            </div>
          ))}
        </div>

        {/* Data Protection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Data Protection</Label>
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Encryption Enabled</Label>
              <p className="text-xs text-gray-500">Encrypt sensitive data at rest</p>
            </div>
            <Switch
              checked={compliance.encryption_enabled}
              onCheckedChange={(checked) => setCompliance({ ...compliance, encryption_enabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Audit Logging</Label>
              <p className="text-xs text-gray-500">Track all form access and changes</p>
            </div>
            <Switch
              checked={compliance.audit_logging_enabled}
              onCheckedChange={(checked) => setCompliance({ ...compliance, audit_logging_enabled: checked })}
            />
          </div>
        </div>

        {/* Data Retention */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Data Retention Period (days)</Label>
          <Input
            type="number"
            value={compliance.data_retention_days}
            onChange={(e) => setCompliance({ ...compliance, data_retention_days: parseInt(e.target.value) || 365 })}
            min="1"
            max="3650"
          />
          <p className="text-xs text-gray-500">
            Automatically delete submissions after this period
          </p>
        </div>

        {/* User Consent */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">User Consent</Label>
          
          <div className="flex items-center justify-between">
            <Label className="text-sm">Require Consent</Label>
            <Switch
              checked={compliance.require_consent}
              onCheckedChange={(checked) => setCompliance({ ...compliance, require_consent: checked })}
            />
          </div>

          {compliance.require_consent && (
            <div className="space-y-2">
              <Label className="text-xs">Consent Text</Label>
              <Textarea
                value={compliance.consent_text}
                onChange={(e) => setCompliance({ ...compliance, consent_text: e.target.value })}
                placeholder="I agree to..."
                rows={2}
              />
            </div>
          )}
        </div>

        {/* Legal URLs */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Legal Documents</Label>
          
          <div className="space-y-2">
            <Label className="text-xs">Privacy Policy URL</Label>
            <Input
              value={compliance.privacy_policy_url}
              onChange={(e) => setCompliance({ ...compliance, privacy_policy_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Terms of Service URL</Label>
            <Input
              value={compliance.terms_url}
              onChange={(e) => setCompliance({ ...compliance, terms_url: e.target.value })}
              placeholder="https://..."
            />
          </div>
        </div>

        {/* Active Compliance Badges */}
        {(compliance.gdpr_compliant || compliance.hipaa_compliant || compliance.ccpa_compliant) && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-900">Active Standards:</span>
                {compliance.gdpr_compliant && <Badge className="bg-blue-100 text-blue-700">GDPR</Badge>}
                {compliance.hipaa_compliant && <Badge className="bg-blue-100 text-blue-700">HIPAA</Badge>}
                {compliance.ccpa_compliant && <Badge className="bg-blue-100 text-blue-700">CCPA</Badge>}
              </div>
            </CardContent>
          </Card>
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
              Save Security Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}