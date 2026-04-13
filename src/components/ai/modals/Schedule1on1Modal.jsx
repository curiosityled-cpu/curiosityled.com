import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Clock, Video, MapPin, Calendar as CalendarIcon } from "lucide-react";
import MobileAwareCalendar from "@/components/mobile/MobileAwareCalendar";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";
import { format, addDays, setHours, setMinutes } from "date-fns";

export default function Schedule1on1Modal({ open, onClose, targetUserEmail, onSuccess }) {
  const { user: currentUser } = useAuth();
  const [targetUser, setTargetUser] = useState(null);
  const [formData, setFormData] = useState({
    meeting_date: null,
    meeting_time: "09:00",
    duration: "30",
    meeting_type: "development",
    location: "virtual",
    agenda: "",
    notes: ""
  });
  const [submitting, setSubmitting] = useState(false);

  // Predefined suggestions for the agenda
  const agendaSuggestions = [
    "Review Q1 performance",
    "Discuss project X progress",
    "Career development goals",
    "Feedback session",
    "Brainstorming new features",
    "Team collaboration improvements"
  ];

  useEffect(() => {
    if (targetUserEmail) {
      loadTargetUser();
    }
  }, [targetUserEmail]);

  const loadTargetUser = async () => {
    try {
      const users = await base44.entities.User.filter({ email: targetUserEmail });
      if (users.length > 0) {
        setTargetUser(users[0]);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const handleAddSuggestion = (suggestion) => {
    setFormData(prev => ({
      ...prev,
      agenda: prev.agenda ? `${prev.agenda}\n- ${suggestion}` : `- ${suggestion}`
    }));
  };

  const handleSubmit = async () => {
    if (!formData.meeting_date) {
      toast.error("Please select a meeting date");
      return;
    }

    setSubmitting(true);
    try {
      // Combine date and time
      const [hours, minutes] = formData.meeting_time.split(':');
      const meetingDateTime = setMinutes(
        setHours(new Date(formData.meeting_date), parseInt(hours)),
        parseInt(minutes)
      );

      // Send email to both parties
      const meetingDetails = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h2 style="color: white; margin: 0;">🗓️ 1-on-1 Meeting Scheduled</h2>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
            <div style="margin-bottom: 25px;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 5px 0;">Meeting Type</p>
              <p style="color: #111827; font-weight: 600; font-size: 16px; margin: 0; text-transform: capitalize;">${formData.meeting_type.replace('_', ' ')}</p>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
              <div>
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 5px 0;">📅 Date</p>
                <p style="color: #111827; font-weight: 600; margin: 0;">${format(meetingDateTime, 'PPPP')}</p>
              </div>
              <div>
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 5px 0;">⏰ Time</p>
                <p style="color: #111827; font-weight: 600; margin: 0;">${format(meetingDateTime, 'p')} (${formData.duration} min)</p>
              </div>
            </div>

            <div style="margin-bottom: 25px;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 5px 0;">📍 Location</p>
              <p style="color: #111827; font-weight: 600; margin: 0; text-transform: capitalize;">${formData.location}</p>
            </div>

            ${formData.agenda ? `
              <div style="margin-bottom: 25px;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">Agenda</p>
                <div style="background: #f9fafb; padding: 15px; border-radius: 6px;">
                  <p style="color: #374151; white-space: pre-wrap; line-height: 1.6; margin: 0;">${formData.agenda}</p>
                </div>
              </div>
            ` : ''}

            <div style="background: #eff6ff; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <p style="color: #1e40af; font-size: 14px; margin: 0;">
                Please confirm your attendance and add this to your calendar.
              </p>
            </div>
          </div>
        </div>
      `;

      // Send to target user
      await base44.integrations.invoke('Core', 'SendEmail', {
        to: targetUserEmail,
        subject: `1-on-1 Meeting Invitation from ${currentUser.full_name}`,
        body: meetingDetails,
        from_name: currentUser.full_name
      });

      // Send confirmation to manager
      await base44.integrations.invoke('Core', 'SendEmail', {
        to: currentUser.email,
        subject: `1-on-1 Scheduled: ${targetUser?.full_name || targetUserEmail}`,
        body: meetingDetails,
        from_name: 'Curiosity Led'
      });

      // Create notification
      await base44.functions.invoke('createNotification', {
        user_email: targetUserEmail,
        type: '1on1_scheduled',
        title: `1-on-1 Meeting with ${currentUser.full_name}`,
        message: `Scheduled for ${format(meetingDateTime, 'PPP')} at ${format(meetingDateTime, 'p')}`,
        priority: 'high',
        scheduled_for: meetingDateTime.toISOString()
      });

      toast.success('1-on-1 meeting scheduled!');
      if (onSuccess) onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error scheduling 1-on-1:', error);
      toast.error('Failed to schedule meeting');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      meeting_date: null,
      meeting_time: "09:00",
      duration: "30",
      meeting_type: "development",
      location: "virtual",
      agenda: "",
      notes: ""
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            Schedule 1-on-1 Meeting
            {targetUser && <span className="text-sm font-normal text-gray-600">with {targetUser.full_name}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Meeting Date *</Label>
              <MobileAwareCalendar
                selected={formData.meeting_date}
                onSelect={(date) => setFormData(prev => ({ ...prev, meeting_date: date }))}
                disabled={(date) => date < new Date()}
                placeholder="Select date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting_time">Time *</Label>
              <Input
                id="meeting_time"
                type="time"
                value={formData.meeting_time}
                onChange={(e) => setFormData(prev => ({ ...prev, meeting_time: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Select value={formData.duration} onValueChange={(value) => setFormData(prev => ({ ...prev, duration: value }))}>
                <SelectTrigger id="duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting_type">Meeting Type</Label>
              <Select value={formData.meeting_type} onValueChange={(value) => setFormData(prev => ({ ...prev, meeting_type: value }))}>
                <SelectTrigger id="meeting_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="development">Development Discussion</SelectItem>
                  <SelectItem value="performance">Performance Review</SelectItem>
                  <SelectItem value="check_in">Regular Check-in</SelectItem>
                  <SelectItem value="coaching">Coaching Session</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Select value={formData.location} onValueChange={(value) => setFormData(prev => ({ ...prev, location: value }))}>
              <SelectTrigger id="location">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="virtual">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Virtual / Video Call
                  </div>
                </SelectItem>
                <SelectItem value="in_person">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    In Person
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agenda">Agenda (Optional)</Label>
            <Textarea
              id="agenda"
              value={formData.agenda}
              onChange={(e) => setFormData(prev => ({ ...prev, agenda: e.target.value }))}
              placeholder="Topics to discuss during the meeting..."
              rows={4}
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {agendaSuggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddSuggestion(suggestion)}
                  className="text-xs h-auto px-2 py-1"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={submitting || !formData.meeting_date}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <CalendarIcon className="w-4 h-4 mr-2" />
                Schedule Meeting
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}