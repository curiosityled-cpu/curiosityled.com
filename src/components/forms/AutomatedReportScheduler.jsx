import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Mail, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function AutomatedReportScheduler({ form, onUpdate }) {
  const [schedules, setSchedules] = useState(form.config?.report_schedules || []);
  const [newSchedule, setNewSchedule] = useState({
    name: "",
    frequency: "weekly",
    recipients: [],
    format: "pdf",
    includeCharts: true,
    enabled: true
  });
  const [recipientEmail, setRecipientEmail] = useState("");

  const addRecipient = () => {
    if (!recipientEmail) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      toast.error("Invalid email address");
      return;
    }

    if (newSchedule.recipients.includes(recipientEmail)) {
      toast.error("Email already added");
      return;
    }

    setNewSchedule({
      ...newSchedule,
      recipients: [...newSchedule.recipients, recipientEmail]
    });
    setRecipientEmail("");
  };

  const removeRecipient = (email) => {
    setNewSchedule({
      ...newSchedule,
      recipients: newSchedule.recipients.filter(e => e !== email)
    });
  };

  const addSchedule = async () => {
    if (!newSchedule.name) {
      toast.error("Please enter a schedule name");
      return;
    }

    if (newSchedule.recipients.length === 0) {
      toast.error("Please add at least one recipient");
      return;
    }

    const schedule = {
      id: `schedule_${Date.now()}`,
      ...newSchedule,
      created_at: new Date().toISOString(),
      next_run: calculateNextRun(newSchedule.frequency)
    };

    const updated = [...schedules, schedule];
    setSchedules(updated);
    await saveSchedules(updated);

    setNewSchedule({
      name: "",
      frequency: "weekly",
      recipients: [],
      format: "pdf",
      includeCharts: true,
      enabled: true
    });
    toast.success("Report schedule created");
  };

  const removeSchedule = async (scheduleId) => {
    const updated = schedules.filter(s => s.id !== scheduleId);
    setSchedules(updated);
    await saveSchedules(updated);
    toast.success("Schedule removed");
  };

  const toggleSchedule = async (scheduleId) => {
    const updated = schedules.map(s => 
      s.id === scheduleId ? { ...s, enabled: !s.enabled } : s
    );
    setSchedules(updated);
    await saveSchedules(updated);
  };

  const saveSchedules = async (updatedSchedules) => {
    try {
      await base44.entities.CustomForm.update(form.id, {
        config: {
          ...form.config,
          report_schedules: updatedSchedules
        }
      });
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error saving schedules:", error);
      toast.error("Failed to save schedules");
    }
  };

  const calculateNextRun = (frequency) => {
    const now = new Date();
    switch (frequency) {
      case "daily":
        now.setDate(now.getDate() + 1);
        break;
      case "weekly":
        now.setDate(now.getDate() + 7);
        break;
      case "monthly":
        now.setMonth(now.getMonth() + 1);
        break;
      default:
        now.setDate(now.getDate() + 7);
    }
    return now.toISOString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Automated Report Scheduler
        </CardTitle>
        <p className="text-xs text-gray-600 mt-1">
          Schedule automated reports to be sent to stakeholders
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add New Schedule */}
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
          <Label>Create New Schedule</Label>
          
          <div>
            <Label htmlFor="schedule_name" className="text-sm">Schedule Name</Label>
            <Input
              id="schedule_name"
              placeholder="Weekly Executive Summary"
              value={newSchedule.name}
              onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="frequency" className="text-sm">Frequency</Label>
              <Select
                value={newSchedule.frequency}
                onValueChange={(value) => setNewSchedule({ ...newSchedule, frequency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="format" className="text-sm">Report Format</Label>
              <Select
                value={newSchedule.format}
                onValueChange={(value) => setNewSchedule({ ...newSchedule, format: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-sm mb-2 block">Recipients</Label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="email@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
              />
              <Button onClick={addRecipient} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {newSchedule.recipients.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {newSchedule.recipients.map((email) => (
                  <div key={email} className="flex items-center gap-1 bg-white px-2 py-1 rounded border text-sm">
                    <Mail className="w-3 h-3" />
                    {email}
                    <button onClick={() => removeRecipient(email)} className="ml-1">
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="include_charts"
              checked={newSchedule.includeCharts}
              onCheckedChange={(checked) => 
                setNewSchedule({ ...newSchedule, includeCharts: checked })
              }
            />
            <label htmlFor="include_charts" className="text-sm cursor-pointer">
              Include charts and visualizations
            </label>
          </div>

          <Button
            onClick={addSchedule}
            size="sm"
            className="w-full"
            style={{ backgroundColor: '#0202ff' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Schedule
          </Button>
        </div>

        {/* Existing Schedules */}
        {schedules.length > 0 ? (
          <div className="space-y-2">
            <Label>Active Schedules</Label>
            {schedules.map((schedule) => (
              <Card key={schedule.id} className="border">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">{schedule.name}</h4>
                      <p className="text-xs text-gray-600">
                        {schedule.frequency} • {schedule.format.toUpperCase()} • {schedule.recipients.length} recipient(s)
                      </p>
                      {schedule.next_run && (
                        <p className="text-xs text-gray-500 mt-1">
                          Next run: {new Date(schedule.next_run).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSchedule(schedule.id)}
                      >
                        {schedule.enabled ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSchedule(schedule.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            No report schedules configured
          </p>
        )}
      </CardContent>
    </Card>
  );
}