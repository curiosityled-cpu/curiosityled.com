import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function SchedulingManager({ form, onUpdate }) {
  const [scheduling, setScheduling] = useState(form.scheduling || {
    start_date: null,
    end_date: null,
    auto_close_on_end: true,
    auto_close_on_max_submissions: false,
    timezone: "UTC"
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Validate dates
      if (scheduling.start_date && scheduling.end_date) {
        const start = new Date(scheduling.start_date);
        const end = new Date(scheduling.end_date);
        
        if (end <= start) {
          toast.error("End date must be after start date");
          setSaving(false);
          return;
        }
      }

      await base44.entities.CustomForm.update(form.id, {
        scheduling: scheduling
      });

      toast.success("Scheduling settings saved");
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error saving scheduling:", error);
      toast.error("Failed to save scheduling settings");
    } finally {
      setSaving(false);
    }
  };

  const isFormActive = () => {
    if (!scheduling || (!scheduling.start_date && !scheduling.end_date)) return true;
    
    const now = new Date();
    const start = scheduling.start_date ? new Date(scheduling.start_date) : null;
    const end = scheduling.end_date ? new Date(scheduling.end_date) : null;

    // Check for invalid dates
    if (start && isNaN(start.getTime())) return true;
    if (end && isNaN(end.getTime())) return true;

    if (start && now < start) return false;
    if (end && now > end) return false;
    return true;
  };

  const getStatusMessage = () => {
    if (!scheduling || (!scheduling.start_date && !scheduling.end_date)) {
      return { text: "Form is always open", color: "text-green-600" };
    }

    const now = new Date();
    let start = scheduling.start_date ? new Date(scheduling.start_date) : null;
    let end = scheduling.end_date ? new Date(scheduling.end_date) : null;

    // Handle invalid dates
    if (start && isNaN(start.getTime())) start = null;
    if (end && isNaN(end.getTime())) end = null;

    if (start && now < start) {
      return { 
        text: `Form will open on ${start.toLocaleString()}`, 
        color: "text-yellow-600" 
      };
    }

    if (end && now > end) {
      return { 
        text: `Form closed on ${end.toLocaleString()}`, 
        color: "text-red-600" 
      };
    }

    if (end) {
      const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
      return { 
        text: `Form closes in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`, 
        color: "text-blue-600" 
      };
    }

    return { text: "Form is currently open", color: "text-green-600" };
  };

  const status = getStatusMessage();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Form Scheduling
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className={`p-3 rounded-lg border ${isFormActive() ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <div className="flex items-center gap-2">
            <Clock className={`w-4 h-4 ${status.color}`} />
            <span className={`text-sm font-medium ${status.color}`}>
              {status.text}
            </span>
          </div>
        </div>

        {/* Start Date */}
        <div>
          <Label htmlFor="start_date">Start Date (Optional)</Label>
          <Input
            id="start_date"
            type="datetime-local"
            value={scheduling.start_date ? new Date(scheduling.start_date).toISOString().slice(0, 16) : ''}
            onChange={(e) => setScheduling({
              ...scheduling,
              start_date: e.target.value ? new Date(e.target.value).toISOString() : null
            })}
          />
          <p className="text-xs text-gray-500 mt-1">
            Form will not accept submissions before this date
          </p>
        </div>

        {/* End Date */}
        <div>
          <Label htmlFor="end_date">End Date (Optional)</Label>
          <Input
            id="end_date"
            type="datetime-local"
            value={scheduling.end_date ? new Date(scheduling.end_date).toISOString().slice(0, 16) : ''}
            onChange={(e) => setScheduling({
              ...scheduling,
              end_date: e.target.value ? new Date(e.target.value).toISOString() : null
            })}
          />
          <p className="text-xs text-gray-500 mt-1">
            Form will not accept submissions after this date
          </p>
        </div>

        {/* Auto-close options */}
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center gap-2">
            <Checkbox
              id="auto_close_end"
              checked={scheduling.auto_close_on_end}
              onCheckedChange={(checked) => setScheduling({
                ...scheduling,
                auto_close_on_end: checked
              })}
            />
            <label htmlFor="auto_close_end" className="text-sm cursor-pointer">
              Automatically archive form when end date is reached
            </label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="auto_close_max"
              checked={scheduling.auto_close_on_max_submissions}
              onCheckedChange={(checked) => setScheduling({
                ...scheduling,
                auto_close_on_max_submissions: checked
              })}
            />
            <label htmlFor="auto_close_max" className="text-sm cursor-pointer">
              Automatically close when max submissions reached
            </label>
          </div>
        </div>

        {/* Timezone */}
        <div>
          <Label htmlFor="timezone">Timezone</Label>
          <Select
            value={scheduling.timezone}
            onValueChange={(value) => setScheduling({ ...scheduling, timezone: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UTC">UTC</SelectItem>
              <SelectItem value="America/New_York">Eastern Time</SelectItem>
              <SelectItem value="America/Chicago">Central Time</SelectItem>
              <SelectItem value="America/Denver">Mountain Time</SelectItem>
              <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
              <SelectItem value="Europe/London">London</SelectItem>
              <SelectItem value="Europe/Paris">Paris</SelectItem>
              <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
          style={{ backgroundColor: '#0202ff' }}
        >
          {saving ? "Saving..." : "Save Scheduling Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}