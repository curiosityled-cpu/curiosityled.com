import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const checkContrast = (color1, color2) => {
  const hex2rgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  };

  const luminance = (r, g, b) => {
    const [rs, gs, bs] = [r, g, b].map((c) => {
      const srgb = c / 255;
      return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const [r1, g1, b1] = hex2rgb(color1);
  const [r2, g2, b2] = hex2rgb(color2);
  const l1 = luminance(r1, g1, b1);
  const l2 = luminance(r2, g2, b2);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  return ratio >= 4.5;
};

export default function ColorPicker({ colors, onChange }) {
  const [warnings, setWarnings] = useState([]);

  const handleColorChange = (field, value) => {
    onChange(field, value);
    
    const newWarnings = [];
    if (field === 'text_color' || field === 'header_bg_color') {
      const textColor = field === 'text_color' ? value : colors.text_color;
      const bgColor = field === 'header_bg_color' ? value : colors.header_bg_color;
      if (textColor && bgColor && !checkContrast(textColor, bgColor)) {
        newWarnings.push('Text and background colors may not meet accessibility standards (WCAG AA 4.5:1 ratio)');
      }
    }
    setWarnings(newWarnings);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Color Scheme</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {warnings.length > 0 && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <AlertDescription className="text-sm text-yellow-800">
              {warnings[0]}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="primary_color">Primary Color</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="primary_color"
                type="color"
                value={colors.primary_color || '#1E40AF'}
                onChange={(e) => handleColorChange('primary_color', e.target.value)}
                className="w-16 h-10 p-1"
              />
              <Input
                type="text"
                value={colors.primary_color || '#1E40AF'}
                onChange={(e) => handleColorChange('primary_color', e.target.value)}
                placeholder="#1E40AF"
                pattern="^#[0-9A-Fa-f]{6}$"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="secondary_color">Secondary Color</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="secondary_color"
                type="color"
                value={colors.secondary_color || '#8B5CF6'}
                onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                className="w-16 h-10 p-1"
              />
              <Input
                type="text"
                value={colors.secondary_color || '#8B5CF6'}
                onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                placeholder="#8B5CF6"
                pattern="^#[0-9A-Fa-f]{6}$"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="header_bg_color">Header Background</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="header_bg_color"
                type="color"
                value={colors.header_bg_color || '#FFFFFF'}
                onChange={(e) => handleColorChange('header_bg_color', e.target.value)}
                className="w-16 h-10 p-1"
              />
              <Input
                type="text"
                value={colors.header_bg_color || '#FFFFFF'}
                onChange={(e) => handleColorChange('header_bg_color', e.target.value)}
                placeholder="#FFFFFF"
                pattern="^#[0-9A-Fa-f]{6}$"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="text_color">Text Color</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="text_color"
                type="color"
                value={colors.text_color || '#1F2937'}
                onChange={(e) => handleColorChange('text_color', e.target.value)}
                className="w-16 h-10 p-1"
              />
              <Input
                type="text"
                value={colors.text_color || '#1F2937'}
                onChange={(e) => handleColorChange('text_color', e.target.value)}
                placeholder="#1F2937"
                pattern="^#[0-9A-Fa-f]{6}$"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}