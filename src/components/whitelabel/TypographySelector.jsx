import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";

const WEB_SAFE_FONTS = [
  'Inter, sans-serif',
  'Roboto, sans-serif',
  'Arial, sans-serif',
  'Helvetica, sans-serif',
  'Georgia, serif',
  'Times New Roman, serif',
  'Verdana, sans-serif',
  'Courier New, monospace'
];

// Extract font family name from a Google Fonts URL
function extractFontNameFromUrl(url) {
  if (!url) return null;
  try {
    // Handles URLs like:
    // https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700
    // https://fonts.google.com/specimen/Montserrat
    const familyMatch = url.match(/family=([^:&+]+)/);
    if (familyMatch) {
      return familyMatch[1].replace(/\+/g, ' ');
    }
    // Handle Google Fonts specimen URLs
    const specimenMatch = url.match(/specimen\/([^?&]+)/);
    if (specimenMatch) {
      return specimenMatch[1].replace(/\+/g, ' ');
    }
  } catch {}
  return null;
}

const isGoogleFontUrl = (url) => url && (url.includes('fonts.googleapis.com') || url.includes('fonts.google.com'));

export default function TypographySelector({ headingFont, bodyFont, fontUrl, headingFontMode, bodyFontMode, onChange }) {
  const usingGoogleFont = isGoogleFontUrl(fontUrl);
  const detectedFontName = extractFontNameFromUrl(fontUrl);
  
  // Use passed-in modes from parent (persisted in DB), default to 'dropdown'
  const headingUseGoogle = headingFontMode === 'google';
  const bodyUseGoogle = bodyFontMode === 'google';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Typography</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Google Fonts URL */}
        <div>
          <Label htmlFor="font_url">Custom Google Fonts URL (Optional)</Label>
          <Input
            id="font_url"
            type="url"
            value={fontUrl || ''}
            onChange={(e) => onChange('font_url', e.target.value)}
            placeholder="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700"
            className="mt-2"
          />
          <p className="text-xs text-gray-500 mt-1">
            Paste a Google Fonts embed URL — then choose how to apply it below for each font.
          </p>
          {usingGoogleFont && detectedFontName && (
            <div className="flex items-center gap-2 mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
              <Info className="w-4 h-4 text-green-600 shrink-0" />
              <p className="text-xs text-green-800">
                Detected Google Font: <strong>{detectedFontName}</strong>. Toggle "Use Google Font" for each heading/body below to apply it.
              </p>
            </div>
          )}
          {usingGoogleFont && !detectedFontName && (
            <div className="flex items-center gap-2 mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
              <Info className="w-4 h-4 text-yellow-600 shrink-0" />
              <p className="text-xs text-yellow-800">
                URL detected. Toggle "Use Google Font" below and enter the font name (e.g. "Montserrat").
              </p>
            </div>
          )}
        </div>

        {/* Heading Font */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label htmlFor="heading_font">Heading Font</Label>
            {usingGoogleFont && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={headingUseGoogle}
                  onChange={(e) => {
                    const newMode = e.target.checked ? 'google' : 'dropdown';
                    onChange('heading_font_mode', newMode);
                    if (!e.target.checked) {
                      onChange('heading_font', 'Inter, sans-serif');
                    }
                  }}
                  className="w-4 h-4"
                />
                <span className="text-gray-700">Use Google Font</span>
              </label>
            )}
          </div>
          {headingUseGoogle && usingGoogleFont ? (
            <Input
              id="heading_font"
              value={headingFont || ''}
              onChange={(e) => onChange('heading_font', e.target.value)}
              placeholder={detectedFontName ? `e.g. ${detectedFontName}, sans-serif` : 'e.g. Montserrat, sans-serif'}
            />
          ) : (
            <Select
              value={headingFont || 'Inter, sans-serif'}
              onValueChange={(value) => onChange('heading_font', value)}
            >
              <SelectTrigger id="heading_font">
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
          )}
          {headingUseGoogle && usingGoogleFont && (
            <p className="text-xs text-gray-500 mt-1">
              Enter the exact font name from Google Fonts (e.g. "Montserrat, sans-serif")
            </p>
          )}
        </div>

        {/* Body Font */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label htmlFor="body_font">Body Font</Label>
            {usingGoogleFont && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={bodyUseGoogle}
                  onChange={(e) => {
                    const newMode = e.target.checked ? 'google' : 'dropdown';
                    onChange('body_font_mode', newMode);
                    if (!e.target.checked) {
                      onChange('body_font', 'Inter, sans-serif');
                    }
                  }}
                  className="w-4 h-4"
                />
                <span className="text-gray-700">Use Google Font</span>
              </label>
            )}
          </div>
          {bodyUseGoogle && usingGoogleFont ? (
            <Input
              id="body_font"
              value={bodyFont || ''}
              onChange={(e) => onChange('body_font', e.target.value)}
              placeholder={detectedFontName ? `e.g. ${detectedFontName}, sans-serif` : 'e.g. Montserrat, sans-serif'}
            />
          ) : (
            <Select
              value={bodyFont || 'Inter, sans-serif'}
              onValueChange={(value) => onChange('body_font', value)}
            >
              <SelectTrigger id="body_font">
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
          )}
          {bodyUseGoogle && usingGoogleFont && (
            <p className="text-xs text-gray-500 mt-1">
              Enter the exact font name from Google Fonts (e.g. "Montserrat, sans-serif")
            </p>
          )}
        </div>

        {!usingGoogleFont && (
          <p className="text-xs text-gray-400 italic">
            To use a Google Font, paste a Google Fonts URL above — you'll then see toggles to choose Google Font or dropdown for each font independently.
          </p>
        )}
      </CardContent>
    </Card>
  );
}