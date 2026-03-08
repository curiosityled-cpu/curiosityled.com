import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LivePreview({ branding }) {
  // Provide safe defaults
  const safeBranding = branding || {
    logo_url: '',
    platform_name: 'Platform Name',
    tagline: 'Platform Tagline',
    primary_color: '#1E40AF',
    secondary_color: '#8B5CF6',
    header_bg_color: '#FFFFFF',
    text_color: '#1F2937',
    heading_font: 'Inter, sans-serif',
    body_font: 'Inter, sans-serif'
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="border rounded-lg overflow-hidden"
          style={{
            backgroundColor: safeBranding.header_bg_color || '#FFFFFF',
            fontFamily: safeBranding.body_font || 'Inter, sans-serif'
          }}
        >
          {/* Header Preview */}
          <div className="p-4 border-b flex items-center gap-3">
            {safeBranding.logo_url && (
              <img
                src={safeBranding.logo_url}
                alt="Logo"
                className="h-8 max-w-[120px] object-contain"
              />
            )}
            <div>
              <h3
                className="font-bold text-sm"
                style={{
                  color: safeBranding.text_color || '#1F2937',
                  fontFamily: safeBranding.heading_font || 'Inter, sans-serif'
                }}
              >
                {safeBranding.platform_name || 'Platform Name'}
              </h3>
              <p className="text-xs text-gray-500">
                {safeBranding.tagline || 'Platform Tagline'}
              </p>
            </div>
          </div>

          {/* Sample Content */}
          <div className="p-4 space-y-3">
            <button
              className="px-4 py-2 rounded text-white text-sm font-medium w-full"
              style={{ backgroundColor: safeBranding.primary_color || '#1E40AF' }}
            >
              Primary Button
            </button>
            <button
              className="px-4 py-2 rounded text-white text-sm font-medium w-full"
              style={{ backgroundColor: safeBranding.secondary_color || '#8B5CF6' }}
            >
              Secondary Button
            </button>
            <p
              className="text-sm"
              style={{ color: safeBranding.text_color || '#1F2937' }}
            >
              Sample body text in {(safeBranding.body_font || 'Inter').split(',')[0]} font
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}