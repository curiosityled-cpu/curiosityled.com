import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Palette, Save } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function FormThemeEditor({ form, onUpdate }) {
  const [theme, setTheme] = useState({
    primary_color: "#0202ff",
    secondary_color: "#6366f1",
    background_color: "#ffffff",
    text_color: "#1f2937",
    border_color: "#e5e7eb",
    button_color: "#0202ff",
    button_text_color: "#ffffff",
    error_color: "#ef4444",
    success_color: "#10b981"
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (form?.config?.theme) {
      setTheme(prev => ({ ...prev, ...form.config.theme }));
    }
  }, [form?.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.CustomForm.update(form.id, {
        config: {
          ...form.config,
          theme
        }
      });

      toast.success("Theme saved");
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error saving theme:", error);
      toast.error("Failed to save theme");
    } finally {
      setSaving(false);
    }
  };

  const colorFields = [
    { key: "primary_color", label: "Primary Color", description: "Main brand color" },
    { key: "secondary_color", label: "Secondary Color", description: "Accent color" },
    { key: "background_color", label: "Background", description: "Form background" },
    { key: "text_color", label: "Text Color", description: "Body text" },
    { key: "border_color", label: "Border Color", description: "Input borders" },
    { key: "button_color", label: "Button Color", description: "Submit button" },
    { key: "button_text_color", label: "Button Text", description: "Button text color" },
    { key: "error_color", label: "Error Color", description: "Validation errors" },
    { key: "success_color", label: "Success Color", description: "Success messages" }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Theme Editor
        </CardTitle>
        <p className="text-xs text-gray-600 mt-1">
          Customize colors to match your brand
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {colorFields.map(field => (
            <div key={field.key} className="space-y-2">
              <Label className="text-sm font-medium">{field.label}</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={theme[field.key]}
                  onChange={(e) => setTheme({ ...theme, [field.key]: e.target.value })}
                  className="w-16 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={theme[field.key]}
                  onChange={(e) => setTheme({ ...theme, [field.key]: e.target.value })}
                  className="flex-1"
                  placeholder="#000000"
                />
              </div>
              <p className="text-xs text-gray-500">{field.description}</p>
            </div>
          ))}
        </div>

        {/* Preview */}
        <Card className="border-2" style={{ backgroundColor: theme.background_color }}>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-medium" style={{ color: theme.text_color }}>
              Theme Preview
            </h3>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Sample input"
                className="w-full px-3 py-2 rounded-md"
                style={{
                  borderColor: theme.border_color,
                  borderWidth: "1px",
                  color: theme.text_color,
                  backgroundColor: theme.background_color
                }}
              />
              <button
                className="px-4 py-2 rounded-md font-medium"
                style={{
                  backgroundColor: theme.button_color,
                  color: theme.button_text_color
                }}
              >
                Submit Button
              </button>
              <p className="text-sm" style={{ color: theme.error_color }}>
                ⚠ Error message example
              </p>
              <p className="text-sm" style={{ color: theme.success_color }}>
                ✓ Success message example
              </p>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
          style={{ backgroundColor: '#0202ff' }}
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Theme"}
        </Button>
      </CardContent>
    </Card>
  );
}