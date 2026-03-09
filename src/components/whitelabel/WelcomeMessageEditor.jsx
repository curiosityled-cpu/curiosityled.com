import React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export default function WelcomeMessageEditor({ message, onChange }) {
  return (
    <div className="space-y-3">
      <Label htmlFor="welcome_message">Dashboard Welcome Message</Label>
      <Textarea
        id="welcome_message"
        value={message || ''}
        onChange={(e) => onChange('welcome_message', e.target.value)}
        placeholder="Welcome back, {{user.first_name}}!"
        rows={3}
        maxLength={200}
      />
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription className="text-xs">
          You can use <code className="bg-gray-100 px-1 py-0.5 rounded">{'{{user.first_name}}'}</code> and <code className="bg-gray-100 px-1 py-0.5 rounded">{'{{user.role}}'}</code> for personalization
        </AlertDescription>
      </Alert>
    </div>
  );
}