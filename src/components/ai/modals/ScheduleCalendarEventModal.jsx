import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, Users, Mail, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ScheduleCalendarEventModal({ 
  isOpen, 
  onClose, 
  suggestedEvent = null,
  userEmail
}) {
  const [eventData, setEventData] = useState({
    title: suggestedEvent?.title || "",
    description: suggestedEvent?.description || "",
    event_type: suggestedEvent?.event_type || "coaching_session",
    date: suggestedEvent?.date || "",
    time: suggestedEvent?.time || "",
    duration_minutes: suggestedEvent?.duration_minutes || 60,
    attendee_emails: suggestedEvent?.attendee_emails || [],
    location: suggestedEvent?.location || "",
    calendar_notes: suggestedEvent?.calendar_notes || ""
  });

  const [attendeeInput, setAttendeeInput] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);

  const handleAddAttendee = () => {
    if (attendeeInput.trim() && !eventData.attendee_emails.includes(attendeeInput.trim())) {
      setEventData({
        ...eventData,
        attendee_emails: [...eventData.attendee_emails, attendeeInput.trim()]
      });
      setAttendeeInput("");
    }
  };

  const handleRemoveAttendee = (email) => {
    setEventData({
      ...eventData,
      attendee_emails: eventData.attendee_emails.filter(e => e !== email)
    });
  };

  const handleSchedule = async () => {
    if (!eventData.title || !eventData.date || !eventData.time) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsScheduling(true);
    try {
      // Create notification for the user
      const eventDateTime = new Date(`${eventData.date}T${eventData.time}`);
      const reminderTime = new Date(eventDateTime.getTime() - 24 * 60 * 60 * 1000); // 24 hours before

      await base44.entities.Notification.create({
        user_email: userEmail,
        type: "1on1_scheduled",
        title: eventData.title,
        message: `${eventData.event_type === 'coaching_session' ? 'Coaching session' : eventData.event_type === 'review_meeting' ? 'Review meeting' : 'Meeting'} scheduled for ${eventDateTime.toLocaleDateString()} at ${eventDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${eventData.description ? `: ${eventData.description}` : ''}`,
        scheduled_for: reminderTime.toISOString(),
        priority: "high",
        related_entity_type: "CalendarEvent",
        metadata: {
          event_type: eventData.event_type,
          event_datetime: eventDateTime.toISOString(),
          duration_minutes: eventData.duration_minutes,
          location: eventData.location,
          attendees: eventData.attendee_emails
        }
      });

      // Send notifications to all attendees
      for (const attendee of eventData.attendee_emails) {
        try {
          await base44.integrations.Core.SendEmail({
            to: attendee,
            subject: `Meeting Invitation: ${eventData.title}`,
            body: `You've been invited to ${eventData.title}\n\nDate: ${eventDateTime.toLocaleDateString()}\nTime: ${eventDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\nDuration: ${eventData.duration_minutes} minutes\n${eventData.location ? `Location: ${eventData.location}\n` : ''}${eventData.description ? `\nDescription:\n${eventData.description}` : ''}\n\nOrganized by: ${userEmail}`
          });
        } catch (emailError) {
          console.error(`Failed to send email to ${attendee}:`, emailError);
        }
      }

      toast.success("Calendar event scheduled successfully!");
      onClose();
    } catch (error) {
      console.error("Error scheduling event:", error);
      toast.error("Failed to schedule event");
    } finally {
      setIsScheduling(false);
    }
  };

  const eventTypes = [
    { value: "coaching_session", label: "Coaching Session" },
    { value: "review_meeting", label: "Performance Review" },
    { value: "one_on_one", label: "1-on-1 Meeting" },
    { value: "team_checkin", label: "Team Check-in" },
    { value: "goal_review", label: "Goal Review" },
    { value: "development_planning", label: "Development Planning" }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            Schedule Calendar Event
          </DialogTitle>
          <DialogDescription>
            Create a calendar event and send invitations to attendees
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Event Type */}
          <div>
            <Label>Event Type *</Label>
            <Select value={eventData.event_type} onValueChange={(value) => setEventData({ ...eventData, event_type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {eventTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div>
            <Label>Event Title *</Label>
            <Input
              value={eventData.title}
              onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
              placeholder="e.g., Q1 Performance Review"
            />
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <Textarea
              value={eventData.description}
              onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
              placeholder="Meeting agenda or notes..."
              rows={3}
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={eventData.date}
                onChange={(e) => setEventData({ ...eventData, date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <Label>Time *</Label>
              <Input
                type="time"
                value={eventData.time}
                onChange={(e) => setEventData({ ...eventData, time: e.target.value })}
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <Label>Duration (minutes)</Label>
            <Select value={eventData.duration_minutes.toString()} onValueChange={(value) => setEventData({ ...eventData, duration_minutes: parseInt(value) })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div>
            <Label>Location/Meeting Link</Label>
            <Input
              value={eventData.location}
              onChange={(e) => setEventData({ ...eventData, location: e.target.value })}
              placeholder="Office, Zoom link, Teams link, etc."
            />
          </div>

          {/* Attendees */}
          <div>
            <Label>Attendees</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={attendeeInput}
                onChange={(e) => setAttendeeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAttendee();
                  }
                }}
                placeholder="Enter email address"
              />
              <Button type="button" onClick={handleAddAttendee} variant="outline" size="sm">
                Add
              </Button>
            </div>
            {eventData.attendee_emails.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {eventData.attendee_emails.map((email, idx) => (
                  <div key={idx} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    <Mail className="w-3 h-3" />
                    {email}
                    <button onClick={() => handleRemoveAttendee(email)} className="text-blue-500 hover:text-blue-700">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSchedule} 
              disabled={isScheduling || !eventData.title || !eventData.date || !eventData.time}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isScheduling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Schedule Event
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}