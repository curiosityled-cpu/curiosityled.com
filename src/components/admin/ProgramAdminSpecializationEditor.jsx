import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Briefcase, Save, Loader2 } from "lucide-react";

const SPECIALIZATIONS = [
  { value: 'elearning', label: 'E-Learning Content' },
  { value: 'ilt_vilt', label: 'ILT/VILT Programs' },
  { value: 'coaching', label: 'Coaching Programs' },
  { value: 'consulting', label: 'Consulting Services' },
  { value: 'assessment', label: 'Assessment Development' },
  { value: 'onboarding', label: 'Onboarding Programs' },
  { value: 'analytics_reporting', label: 'Analytics & Reporting' },
  { value: 'platform_support', label: 'Platform Support' }
];

export default function ProgramAdminSpecializationEditor({ userId, userEmail, currentSpecializations = [], onSave }) {
  const [selectedSpecializations, setSelectedSpecializations] = useState(currentSpecializations);
  const [saving, setSaving] = useState(false);

  const toggleSpecialization = (value) => {
    setSelectedSpecializations(prev => 
      prev.includes(value) 
        ? prev.filter(s => s !== value)
        : [...prev, value]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke('updateUserById', {
        user_id: userId,
        updates: {
          specializations: selectedSpecializations
        }
      });
      
      toast.success('Specializations updated successfully');
      if (onSave) onSave(selectedSpecializations);
    } catch (error) {
      console.error('Error updating specializations:', error);
      toast.error('Failed to update specializations');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Briefcase className="w-5 h-5" />
          Program Admin Specializations
        </CardTitle>
        <p className="text-sm text-gray-600">
          Select areas of expertise for {userEmail}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SPECIALIZATIONS.map(spec => (
            <div key={spec.value} className="flex items-center space-x-2">
              <Checkbox
                id={spec.value}
                checked={selectedSpecializations.includes(spec.value)}
                onCheckedChange={() => toggleSpecialization(spec.value)}
              />
              <Label htmlFor={spec.value} className="cursor-pointer text-sm">
                {spec.label}
              </Label>
            </div>
          ))}
        </div>

        {selectedSpecializations.length > 0 && (
          <div>
            <Label className="text-sm text-gray-600 mb-2 block">Selected Specializations:</Label>
            <div className="flex flex-wrap gap-2">
              {selectedSpecializations.map(spec => {
                const label = SPECIALIZATIONS.find(s => s.value === spec)?.label || spec;
                return (
                  <Badge key={spec} variant="secondary">
                    {label}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Specializations
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}