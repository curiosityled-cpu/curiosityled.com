import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const WEB_SAFE_FONTS = [
  'Arial, sans-serif',
  'Helvetica, sans-serif',
  'Times New Roman, serif',
  'Georgia, serif',
  'Verdana, sans-serif',
  'Courier New, monospace',
  'Inter, sans-serif',
  'Roboto, sans-serif'
];

export default function TypographySelector({ headingFont, bodyFont, fontUrl, onChange }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Typography</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="heading_font">Heading Font</Label>
          <Select
            value={headingFont || 'Inter, sans-serif'}
            onValueChange={(value) => onChange('heading_font', value)}
          >
            <SelectTrigger id="heading_font" className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEB_SAFE_FONTS.map((font) => (
                <SelectItem key={font} value={font}>
                  <span style={{ fontFamily: font }}>{font.split(',')[0]}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="body_font">Body Font</Label>
          <Select
            value={bodyFont || 'Inter, sans-serif'}
            onValueChange={(value) => onChange('body_font', value)}
          >
            <SelectTrigger id="body_font" className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEB_SAFE_FONTS.map((font) => (
                <SelectItem key={font} value={font}>
                  <span style={{ fontFamily: font }}>{font.split(',')[0]}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="font_url">Custom Google Fonts URL (Optional)</Label>
          <Input
            id="font_url"
            type="url"
            value={fontUrl || ''}
            onChange={(e) => onChange('font_url', e.target.value)}
            placeholder="https://fonts.googleapis.com/css2?family=..."
            className="mt-2"
          />
          <p className="text-xs text-gray-500 mt-1">
            Paste a Google Fonts embed URL for custom fonts
          </p>
        </div>
      </CardContent>
    </Card>
  );
}