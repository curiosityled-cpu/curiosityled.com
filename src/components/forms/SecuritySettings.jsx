import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Shield, Save, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function SecuritySettings({ form, onUpdate }) {
  const [security, setSecurity] = useState({
    captcha_enabled: false,
    ip_restrictions_enabled: false,
    allowed_ip_addresses: [],
    blocked_ip_addresses: [],
    max_submissions_per_ip: null,
    require_verification: false,
    prevent_multiple_submissions: false,
    enable_honeypot: true,
    session_timeout_minutes: 30
  });
  const [saving, setSaving] = useState(false);
  const [ipInput, setIpInput] = useState("");

  useEffect(() => {
    if (form?.config?.security) {
      setSecurity(prev => ({ ...prev, ...form.config.security }));
    }
  }, [form?.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.CustomForm.update(form.id, {
        config: {
          ...form.config,
          security
        }
      });

      toast.success("Security settings saved");
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error saving security:", error);
      toast.error("Failed to save security settings");
    } finally {
      setSaving(false);
    }
  };

  const addAllowedIP = () => {
    if (!ipInput || ipInput.trim() === "") return;
    
    // Basic IP validation
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipPattern.test(ipInput.trim())) {
      toast.error("Invalid IP address format");
      return;
    }
    
    if (!security.allowed_ip_addresses.includes(ipInput.trim())) {
      setSecurity({
        ...security,
        allowed_ip_addresses: [...security.allowed_ip_addresses, ipInput.trim()]
      });
      setIpInput("");
    }
  };

  const removeAllowedIP = (ip) => {
    setSecurity({
      ...security,
      allowed_ip_addresses: security.allowed_ip_addresses.filter(i => i !== ip)
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Security Settings
        </CardTitle>
        <p className="text-xs text-gray-600 mt-1">
          Protect your form from spam and unauthorized access
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* CAPTCHA */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Enable CAPTCHA</Label>
            <p className="text-xs text-gray-500">Require human verification</p>
          </div>
          <Switch
            checked={security.captcha_enabled}
            onCheckedChange={(checked) => setSecurity({ ...security, captcha_enabled: checked })}
          />
        </div>

        {/* Honeypot */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Enable Honeypot</Label>
            <p className="text-xs text-gray-500">Hidden spam detection field</p>
          </div>
          <Switch
            checked={security.enable_honeypot}
            onCheckedChange={(checked) => setSecurity({ ...security, enable_honeypot: checked })}
          />
        </div>

        {/* Prevent Multiple Submissions */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Prevent Multiple Submissions</Label>
            <p className="text-xs text-gray-500">One submission per user</p>
          </div>
          <Switch
            checked={security.prevent_multiple_submissions}
            onCheckedChange={(checked) => setSecurity({ ...security, prevent_multiple_submissions: checked })}
          />
        </div>

        {/* Require Email Verification */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Require Email Verification</Label>
            <p className="text-xs text-gray-500">Send verification code before submission</p>
          </div>
          <Switch
            checked={security.require_verification}
            onCheckedChange={(checked) => setSecurity({ ...security, require_verification: checked })}
          />
        </div>

        {/* IP Restrictions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">IP Restrictions</Label>
              <p className="text-xs text-gray-500">Limit access by IP address</p>
            </div>
            <Switch
              checked={security.ip_restrictions_enabled}
              onCheckedChange={(checked) => setSecurity({ ...security, ip_restrictions_enabled: checked })}
            />
          </div>

          {security.ip_restrictions_enabled && (
            <Card className="bg-gray-50 border">
              <CardContent className="p-3 space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Allowed IP Addresses</Label>
                  <div className="flex gap-2">
                    <Input
                      value={ipInput}
                      onChange={(e) => setIpInput(e.target.value)}
                      placeholder="192.168.1.1"
                      className="text-sm"
                    />
                    <Button onClick={addAllowedIP} size="sm">Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {security.allowed_ip_addresses.map((ip, idx) => (
                      <Badge key={idx} variant="secondary" className="cursor-pointer" onClick={() => removeAllowedIP(ip)}>
                        {ip} ×
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Max Submissions per IP */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Max Submissions per IP</Label>
          <Input
            type="number"
            value={security.max_submissions_per_ip || ""}
            onChange={(e) => setSecurity({ ...security, max_submissions_per_ip: parseInt(e.target.value) || null })}
            placeholder="Leave empty for unlimited"
            min="1"
          />
          <p className="text-xs text-gray-500">Prevent spam from single IP</p>
        </div>

        {/* Session Timeout */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Session Timeout (minutes)</Label>
          <Input
            type="number"
            value={security.session_timeout_minutes}
            onChange={(e) => setSecurity({ ...security, session_timeout_minutes: parseInt(e.target.value) || 30 })}
            min="5"
            max="240"
          />
          <p className="text-xs text-gray-500">Auto-save in-progress submissions</p>
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
              Save Security Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}