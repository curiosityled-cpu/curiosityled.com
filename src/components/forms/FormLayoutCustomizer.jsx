import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layout, Save } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function FormLayoutCustomizer({ form, onUpdate }) {
  const [layout, setLayout] = useState({
    style: "single-column",
    spacing: "normal",
    card_style: "elevated",
    alignment: "left",
    max_width: "800px",
    question_spacing: "medium"
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (form?.config?.layout) {
      setLayout(prev => ({ ...prev, ...form.config.layout }));
    }
  }, [form?.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.CustomForm.update(form.id, {
        config: {
          ...form.config,
          layout
        }
      });

      toast.success("Layout saved");
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error saving layout:", error);
      toast.error("Failed to save layout");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layout className="w-5 h-5" />
          Layout Customizer
        </CardTitle>
        <p className="text-xs text-gray-600 mt-1">
          Customize form layout and spacing
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Layout Style */}
        <div className="space-y-3">
          <Label>Layout Style</Label>
          <RadioGroup value={layout.style} onValueChange={(value) => setLayout({ ...layout, style: value })}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="single-column" id="single" />
              <Label htmlFor="single" className="font-normal cursor-pointer">
                Single Column
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="two-column" id="two" />
              <Label htmlFor="two" className="font-normal cursor-pointer">
                Two Columns
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="card-per-question" id="card" />
              <Label htmlFor="card" className="font-normal cursor-pointer">
                Card Per Question
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Card Style */}
        <div className="space-y-2">
          <Label>Card Style</Label>
          <Select value={layout.card_style} onValueChange={(value) => setLayout({ ...layout, card_style: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="elevated">Elevated (Shadow)</SelectItem>
              <SelectItem value="bordered">Bordered</SelectItem>
              <SelectItem value="flat">Flat (No Border)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Spacing */}
        <div className="space-y-2">
          <Label>Overall Spacing</Label>
          <Select value={layout.spacing} onValueChange={(value) => setLayout({ ...layout, spacing: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="compact">Compact</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="relaxed">Relaxed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Question Spacing */}
        <div className="space-y-2">
          <Label>Question Spacing</Label>
          <Select value={layout.question_spacing} onValueChange={(value) => setLayout({ ...layout, question_spacing: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="large">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Alignment */}
        <div className="space-y-2">
          <Label>Content Alignment</Label>
          <Select value={layout.alignment} onValueChange={(value) => setLayout({ ...layout, alignment: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Max Width */}
        <div className="space-y-2">
          <Label>Maximum Width</Label>
          <Select value={layout.max_width} onValueChange={(value) => setLayout({ ...layout, max_width: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="600px">Narrow (600px)</SelectItem>
              <SelectItem value="800px">Normal (800px)</SelectItem>
              <SelectItem value="1000px">Wide (1000px)</SelectItem>
              <SelectItem value="100%">Full Width</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Preview */}
        <Card className={`
          ${layout.card_style === 'elevated' ? 'shadow-lg' : ''}
          ${layout.card_style === 'bordered' ? 'border-2' : ''}
          ${layout.card_style === 'flat' ? 'border-0 shadow-none' : ''}
        `}>
          <CardContent className={`
            ${layout.spacing === 'compact' ? 'p-3' : ''}
            ${layout.spacing === 'normal' ? 'p-4' : ''}
            ${layout.spacing === 'relaxed' ? 'p-6' : ''}
            ${layout.alignment === 'center' ? 'text-center' : 'text-left'}
          `}>
            <p className="text-sm font-medium mb-2">Layout Preview</p>
            <p className="text-xs text-gray-600">
              Style: {layout.style} | Spacing: {layout.spacing}
            </p>
          </CardContent>
        </Card>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
          style={{ backgroundColor: '#0202ff' }}
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Layout"}
        </Button>
      </CardContent>
    </Card>
  );
}