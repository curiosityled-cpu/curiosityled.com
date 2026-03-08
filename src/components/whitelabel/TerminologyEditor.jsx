import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const DEFAULT_TERMS = [
  { key: 'Assessment', label: 'Assessment (singular)' },
  { key: 'Assessments', label: 'Assessments (plural)' },
  { key: 'Goal', label: 'Goal (singular)' },
  { key: 'Goals', label: 'Goals (plural)' },
  { key: 'Learning Resource', label: 'Learning Resource (singular)' },
  { key: 'Learning Resources', label: 'Learning Resources (plural)' }
];

export default function TerminologyEditor({ overrides = {}, onChange }) {
  const [localOverrides, setLocalOverrides] = useState(overrides);

  const handleChange = (key, value) => {
    const newOverrides = { ...localOverrides, [key]: value };
    if (!value) {
      delete newOverrides[key];
    }
    setLocalOverrides(newOverrides);
    onChange('terminology_overrides', newOverrides);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Terminology Customization</CardTitle>
        <p className="text-sm text-gray-600">
          Customize platform terminology to match your organization's language
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {DEFAULT_TERMS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3">
            <div className="flex-1">
              <Label className="text-xs text-gray-600">{label}</Label>
              <Input
                value={localOverrides[key] || ''}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={key}
                className="mt-1"
              />
            </div>
            {localOverrides[key] && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleChange(key, '')}
                className="mt-5"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}