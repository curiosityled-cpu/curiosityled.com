import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Copy, QrCode, ExternalLink, Download } from "lucide-react";
import QRCode from "qrcode";

export default function PublicAccessManager({ form, onUpdate }) {
  const [generating, setGenerating] = useState(false);
  const [config, setConfig] = useState({
    custom_message: form.public_access_config?.custom_message || "",
    max_submissions: form.public_access_config?.max_submissions || null,
    expires_at: form.public_access_config?.expires_at || ""
  });

  const publicUrl = form.public_access_config?.token 
    ? `${window.location.origin}/PublicFormSubmission?token=${form.public_access_config.token}`
    : null;

  const handleEnablePublicAccess = async () => {
    if (form.status !== "published") {
      toast.error("Please publish the form before enabling public access");
      return;
    }

    if (!form.config?.sections || form.config.sections.length === 0) {
      toast.error("Cannot enable public access for empty forms");
      return;
    }

    setGenerating(true);
    try {
      const token = `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${crypto.randomUUID().slice(0, 8)}`;
      
      await base44.entities.CustomForm.update(form.id, {
        public_access_enabled: true,
        public_access_config: {
          token,
          ...config,
          expires_at: config.expires_at || null
        }
      });

      toast.success("Public access enabled");
      onUpdate();
    } catch (error) {
      console.error("Error enabling public access:", error);
      toast.error("Failed to enable public access");
    } finally {
      setGenerating(false);
    }
  };

  const handleDisablePublicAccess = async () => {
    try {
      await base44.entities.CustomForm.update(form.id, {
        public_access_enabled: false
      });
      toast.success("Public access disabled");
      onUpdate();
    } catch (error) {
      console.error("Error disabling public access:", error);
      toast.error("Failed to disable public access");
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link copied to clipboard");
  };

  const handleDownloadQR = async () => {
    try {
      const qrDataUrl = await QRCode.toDataURL(publicUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#0202ff',
          light: '#ffffff'
        }
      });

      const link = document.createElement('a');
      link.download = `${form.title.replace(/\s+/g, '_')}_QR.png`;
      link.href = qrDataUrl;
      link.click();
      toast.success("QR code downloaded");
    } catch (error) {
      console.error("Error generating QR code:", error);
      toast.error("Failed to generate QR code");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Public Access</CardTitle>
        <p className="text-sm text-gray-600">
          Allow anyone with the link to submit this form without logging in
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="public-access">Enable Public Access</Label>
          <Switch
            id="public-access"
            checked={form.public_access_enabled}
            onCheckedChange={(checked) => {
              if (checked) {
                handleEnablePublicAccess();
              } else {
                handleDisablePublicAccess();
              }
            }}
          />
        </div>

        {form.public_access_enabled && publicUrl && (
          <>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Label className="text-sm font-medium mb-2 block">Public Form URL</Label>
              <div className="flex gap-2">
                <Input value={publicUrl} readOnly className="font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={handleCopyLink}>
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => window.open(publicUrl, '_blank')}>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Button variant="outline" onClick={handleDownloadQR} className="w-full">
              <QrCode className="w-4 h-4 mr-2" />
              Download QR Code
            </Button>

            <div>
              <Label htmlFor="custom_message">Custom Welcome Message</Label>
              <Textarea
                id="custom_message"
                value={config.custom_message}
                onChange={(e) => setConfig({ ...config, custom_message: e.target.value })}
                placeholder="Optional welcome message for public respondents..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="max_submissions">Max Submissions (optional)</Label>
              <Input
                id="max_submissions"
                type="number"
                value={config.max_submissions || ""}
                onChange={(e) => setConfig({ ...config, max_submissions: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="Unlimited"
              />
            </div>

            <div>
              <Label htmlFor="expires_at">Expiration Date (optional)</Label>
              <Input
                id="expires_at"
                type="datetime-local"
                value={config.expires_at || ""}
                onChange={(e) => setConfig({ ...config, expires_at: e.target.value })}
              />
            </div>

            <Button
              onClick={async () => {
                try {
                  await base44.entities.CustomForm.update(form.id, {
                    public_access_config: {
                      ...form.public_access_config,
                      ...config
                    }
                  });
                  toast.success("Public access settings updated");
                  onUpdate();
                } catch (error) {
                  toast.error("Failed to update settings");
                }
              }}
              className="w-full"
              style={{ backgroundColor: '#0202ff' }}
            >
              Save Settings
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}