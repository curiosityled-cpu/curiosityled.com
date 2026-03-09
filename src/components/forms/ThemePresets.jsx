import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ThemePresets({ form, onUpdate }) {
  const presets = [
    {
      name: "Default Blue",
      theme: {
        primary_color: "#0202ff",
        secondary_color: "#6366f1",
        background_color: "#ffffff",
        text_color: "#1f2937",
        border_color: "#e5e7eb",
        button_color: "#0202ff",
        button_text_color: "#ffffff",
        error_color: "#ef4444",
        success_color: "#10b981"
      }
    },
    {
      name: "Professional",
      theme: {
        primary_color: "#1e40af",
        secondary_color: "#3b82f6",
        background_color: "#f9fafb",
        text_color: "#111827",
        border_color: "#d1d5db",
        button_color: "#1e40af",
        button_text_color: "#ffffff",
        error_color: "#dc2626",
        success_color: "#059669"
      }
    },
    {
      name: "Modern Purple",
      theme: {
        primary_color: "#7c3aed",
        secondary_color: "#a78bfa",
        background_color: "#ffffff",
        text_color: "#1f2937",
        border_color: "#e5e7eb",
        button_color: "#7c3aed",
        button_text_color: "#ffffff",
        error_color: "#ef4444",
        success_color: "#10b981"
      }
    },
    {
      name: "Minimalist",
      theme: {
        primary_color: "#000000",
        secondary_color: "#4b5563",
        background_color: "#ffffff",
        text_color: "#000000",
        border_color: "#d1d5db",
        button_color: "#000000",
        button_text_color: "#ffffff",
        error_color: "#dc2626",
        success_color: "#16a34a"
      }
    },
    {
      name: "Warm Sunset",
      theme: {
        primary_color: "#ea580c",
        secondary_color: "#f97316",
        background_color: "#fffbeb",
        text_color: "#78350f",
        border_color: "#fde68a",
        button_color: "#ea580c",
        button_text_color: "#ffffff",
        error_color: "#dc2626",
        success_color: "#16a34a"
      }
    },
    {
      name: "Ocean Blue",
      theme: {
        primary_color: "#0891b2",
        secondary_color: "#06b6d4",
        background_color: "#ecfeff",
        text_color: "#164e63",
        border_color: "#a5f3fc",
        button_color: "#0891b2",
        button_text_color: "#ffffff",
        error_color: "#dc2626",
        success_color: "#059669"
      }
    }
  ];

  const applyPreset = async (preset) => {
    try {
      await base44.entities.CustomForm.update(form.id, {
        config: {
          ...form.config,
          theme: preset.theme
        }
      });

      toast.success(`${preset.name} theme applied`);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error applying preset:", error);
      toast.error("Failed to apply theme");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Theme Presets
        </CardTitle>
        <p className="text-xs text-gray-600 mt-1">
          Quick-apply professionally designed themes
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {presets.map((preset) => (
            <Card key={preset.name} className="border-2 hover:border-blue-300 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">{preset.name}</span>
                  <div className="flex gap-1">
                    {[preset.theme.primary_color, preset.theme.secondary_color, preset.theme.success_color].map((color, idx) => (
                      <div
                        key={idx}
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-2 mb-3">
                  <div className="h-8 rounded" style={{ backgroundColor: preset.theme.background_color, border: `1px solid ${preset.theme.border_color}` }}></div>
                  <div className="h-6 rounded" style={{ backgroundColor: preset.theme.button_color }}></div>
                </div>
                <Button
                  onClick={() => applyPreset(preset)}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Apply Theme
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}