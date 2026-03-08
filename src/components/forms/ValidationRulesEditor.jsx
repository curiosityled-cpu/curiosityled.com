import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck } from "lucide-react";

export default function ValidationRulesEditor({ question, onUpdate }) {
  const [validation, setValidation] = useState(question.validation || {});

  const updateValidation = (field, value) => {
    const updated = {
      ...validation,
      [field]: value
    };
    setValidation(updated);
    if (onUpdate) {
      onUpdate({
        ...question,
        validation: Object.keys(updated).length > 0 ? updated : null
      });
    }
  };

  const isNumericType = ["number", "rating_scale", "linear_scale", "calculated"].includes(question.type);
  const isTextType = ["text", "long_text", "email"].includes(question.type);

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="w-4 h-4" />
          Validation Rules
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isTextType && (
          <>
            <div>
              <Label htmlFor="min_length">Minimum Length</Label>
              <Input
                id="min_length"
                type="number"
                min="0"
                value={validation.min_length || ""}
                onChange={(e) => updateValidation("min_length", parseInt(e.target.value) || null)}
                placeholder="No minimum"
              />
            </div>

            <div>
              <Label htmlFor="max_length">Maximum Length</Label>
              <Input
                id="max_length"
                type="number"
                min="0"
                value={validation.max_length || ""}
                onChange={(e) => updateValidation("max_length", parseInt(e.target.value) || null)}
                placeholder="No maximum"
              />
            </div>

            {question.type === "email" && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="email_validation"
                  checked={validation.email_format !== false}
                  onCheckedChange={(checked) => updateValidation("email_format", checked)}
                />
                <label htmlFor="email_validation" className="text-sm cursor-pointer">
                  Enforce valid email format
                </label>
              </div>
            )}

            <div>
              <Label htmlFor="pattern">Custom Pattern (Regex)</Label>
              <Input
                id="pattern"
                value={validation.pattern || ""}
                onChange={(e) => updateValidation("pattern", e.target.value || null)}
                placeholder="e.g., ^[A-Z]{2}[0-9]{4}$"
              />
              <p className="text-xs text-gray-500 mt-1">
                Advanced: Enter a regular expression pattern
              </p>
            </div>
          </>
        )}

        {isNumericType && (
          <>
            <div>
              <Label htmlFor="min_value">Minimum Value</Label>
              <Input
                id="min_value"
                type="number"
                value={validation.min_value || ""}
                onChange={(e) => updateValidation("min_value", parseFloat(e.target.value) || null)}
                placeholder="No minimum"
              />
            </div>

            <div>
              <Label htmlFor="max_value">Maximum Value</Label>
              <Input
                id="max_value"
                type="number"
                value={validation.max_value || ""}
                onChange={(e) => updateValidation("max_value", parseFloat(e.target.value) || null)}
                placeholder="No maximum"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="integer_only"
                checked={validation.integer_only || false}
                onCheckedChange={(checked) => updateValidation("integer_only", checked)}
              />
              <label htmlFor="integer_only" className="text-sm cursor-pointer">
                Accept whole numbers only
              </label>
            </div>
          </>
        )}

        <div>
          <Label htmlFor="error_message">Custom Error Message</Label>
          <Input
            id="error_message"
            value={validation.error_message || ""}
            onChange={(e) => updateValidation("error_message", e.target.value || null)}
            placeholder="Please enter a valid value"
          />
          <p className="text-xs text-gray-500 mt-1">
            Shown when validation fails
          </p>
        </div>
      </CardContent>
    </Card>
  );
}