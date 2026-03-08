import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function PlatformIdentityEditor({ platformName, tagline, onChange }) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="platform_name">Platform Name</Label>
        <Input
          id="platform_name"
          value={platformName || ''}
          onChange={(e) => onChange('platform_name', e.target.value)}
          placeholder="e.g., Acme Leadership Academy"
          className="mt-2"
        />
      </div>

      <div>
        <Label htmlFor="tagline">Tagline</Label>
        <Input
          id="tagline"
          value={tagline || ''}
          onChange={(e) => onChange('tagline', e.target.value)}
          placeholder="e.g., Building Tomorrow's Leaders"
          className="mt-2"
        />
      </div>
    </div>
  );
}