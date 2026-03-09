import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle2, Shield } from "lucide-react";
import { toast } from "sonner";

export default function PHIDetectionConfig({ user }) {
  const [config, setConfig] = useState({
    enabled: true,
    blockOnDetection: true,
    notifyAdmins: true,
    patterns: {
      ssn: true,
      mrn: true,
      dob: true,
      zipCode: false,
      phoneNumber: false,
      emailAddress: false
    }
  });
  const [saving, setSaving] = useState(false);
  const [detectionStats, setDetectionStats] = useState({
    totalDetections: 0,
    blockedAttempts: 0,
    lastDetection: null
  });

  useEffect(() => {
    loadConfig();
    loadStats();
  }, []);

  const loadConfig = async () => {
    try {
      // Load from user's client settings
      const settings = user.client_phi_settings || {};
      if (Object.keys(settings).length > 0) {
        setConfig(settings);
      }
    } catch (error) {
      console.error("Error loading PHI config:", error);
    }
  };

  const loadStats = async () => {
    try {
      // Load detection statistics from ActivityLog
      const logs = await base44.entities.ActivityLog.filter({
        action_type: "PHI_DETECTION_TRIGGERED",
        "metadata.client_id": user.client_id
      }, '-timestamp', 100);

      setDetectionStats({
        totalDetections: logs.length,
        blockedAttempts: logs.filter(l => l.metadata?.blocked).length,
        lastDetection: logs[0]?.timestamp || null
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Update user's client PHI settings
      await base44.auth.updateMe({
        client_phi_settings: config
      });

      // Log the configuration change
      await base44.entities.ActivityLog.create({
        timestamp: new Date().toISOString(),
        initiator_user_email: user.email,
        action_type: "PHI_DETECTION_CONFIG_UPDATED",
        metadata: {
          client_id: user.client_id,
          new_config: config
        }
      });

      toast.success("PHI detection settings saved");
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const patternDescriptions = {
    ssn: "Social Security Numbers (XXX-XX-XXXX)",
    mrn: "Medical Record Numbers",
    dob: "Dates of Birth in various formats",
    zipCode: "ZIP codes (potential identifier)",
    phoneNumber: "Phone numbers",
    emailAddress: "Email addresses"
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Detections</p>
                <p className="text-2xl font-bold">{detectionStats.totalDetections}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Blocked Attempts</p>
                <p className="text-2xl font-bold">{detectionStats.blockedAttempts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-lg font-bold">{config.enabled ? "Active" : "Disabled"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>PHI Detection Configuration</CardTitle>
          <CardDescription>
            Configure automated detection and blocking of Protected Health Information patterns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enabled">Enable PHI Detection</Label>
                <p className="text-sm text-gray-500">Automatically scan inputs for PHI patterns</p>
              </div>
              <Switch
                id="enabled"
                checked={config.enabled}
                onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="block">Block on Detection</Label>
                <p className="text-sm text-gray-500">Prevent submission when PHI is detected</p>
              </div>
              <Switch
                id="block"
                checked={config.blockOnDetection}
                onCheckedChange={(checked) => setConfig({ ...config, blockOnDetection: checked })}
                disabled={!config.enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notify">Notify Administrators</Label>
                <p className="text-sm text-gray-500">Send alerts when PHI patterns are detected</p>
              </div>
              <Switch
                id="notify"
                checked={config.notifyAdmins}
                onCheckedChange={(checked) => setConfig({ ...config, notifyAdmins: checked })}
                disabled={!config.enabled}
              />
            </div>
          </div>

          {/* Pattern Selection */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Detection Patterns</h3>
            <div className="space-y-3 bg-gray-50 rounded-lg p-4">
              {Object.entries(config.patterns).map(([key, enabled]) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <Label htmlFor={key} className="text-sm font-medium">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </Label>
                    <p className="text-xs text-gray-500">{patternDescriptions[key]}</p>
                  </div>
                  <Switch
                    id={key}
                    checked={enabled}
                    onCheckedChange={(checked) => 
                      setConfig({
                        ...config,
                        patterns: { ...config.patterns, [key]: checked }
                      })
                    }
                    disabled={!config.enabled}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Warning */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-yellow-900 mb-1">Important Notice</p>
                <p className="text-yellow-800">
                  PHI detection is a preventive measure but not foolproof. Users must still be trained 
                  to never enter patient information. This tool should be used alongside comprehensive 
                  privacy training and organizational policies.
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
              {saving ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}