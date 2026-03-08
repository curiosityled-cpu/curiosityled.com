import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Image, Save, Upload, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function FormBrandingManager({ form, onUpdate }) {
  const [branding, setBranding] = useState({
    logo_url: "",
    background_image_url: "",
    custom_css: "",
    header_text: "",
    footer_text: ""
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (form?.config?.branding) {
      setBranding(prev => ({ ...prev, ...form.config.branding }));
    }
  }, [form?.id]);

  const handleUpload = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setBranding({ ...branding, [field]: file_url });
      toast.success("Image uploaded");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.CustomForm.update(form.id, {
        config: {
          ...form.config,
          branding
        }
      });

      toast.success("Branding saved");
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error saving branding:", error);
      toast.error("Failed to save branding");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="w-5 h-5" />
          Branding Manager
        </CardTitle>
        <p className="text-xs text-gray-600 mt-1">
          Add your logo, background, and custom styling
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Logo Upload */}
        <div className="space-y-2">
          <Label>Logo</Label>
          {branding.logo_url ? (
            <div className="relative inline-block">
              <img
                src={branding.logo_url}
                alt="Logo"
                className="h-16 object-contain border rounded"
              />
              <Button
                size="icon"
                variant="destructive"
                className="absolute -top-2 -right-2 h-6 w-6"
                onClick={() => setBranding({ ...branding, logo_url: "" })}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <div>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleUpload(e, "logo_url")}
                disabled={uploading}
                className="cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-1">
                Recommended: 200x60px PNG with transparent background
              </p>
            </div>
          )}
        </div>

        {/* Background Image Upload */}
        <div className="space-y-2">
          <Label>Background Image (Optional)</Label>
          {branding.background_image_url ? (
            <div className="relative inline-block">
              <img
                src={branding.background_image_url}
                alt="Background"
                className="h-32 w-full object-cover border rounded"
              />
              <Button
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={() => setBranding({ ...branding, background_image_url: "" })}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <div>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleUpload(e, "background_image_url")}
                disabled={uploading}
                className="cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-1">
                Recommended: 1920x1080px for best quality
              </p>
            </div>
          )}
        </div>

        {/* Header Text */}
        <div className="space-y-2">
          <Label>Custom Header Text (Optional)</Label>
          <Input
            value={branding.header_text}
            onChange={(e) => setBranding({ ...branding, header_text: e.target.value })}
            placeholder="e.g., Powered by Your Company"
          />
        </div>

        {/* Footer Text */}
        <div className="space-y-2">
          <Label>Custom Footer Text (Optional)</Label>
          <Input
            value={branding.footer_text}
            onChange={(e) => setBranding({ ...branding, footer_text: e.target.value })}
            placeholder="e.g., © 2025 Your Company. All rights reserved."
          />
        </div>

        {/* Custom CSS */}
        <div className="space-y-2">
          <Label>Custom CSS (Advanced)</Label>
          <Textarea
            value={branding.custom_css}
            onChange={(e) => setBranding({ ...branding, custom_css: e.target.value })}
            placeholder=".form-container { ... }"
            className="font-mono text-sm"
            rows={6}
          />
          <p className="text-xs text-gray-500">
            Add custom CSS to override default styles
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || uploading}
          className="w-full"
          style={{ backgroundColor: '#0202ff' }}
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Branding"}
        </Button>
      </CardContent>
    </Card>
  );
}