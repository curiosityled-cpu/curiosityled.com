
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area"; // Added ScrollArea import
import { useAuth } from "@/components/useAuth";
import { base44 } from "@/api/base44Client";
import { Bell, Calendar as CalendarIcon, Clock, Mail, MessageSquare, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

export default function ScheduleFollowUpModal({ isOpen, onClose, riskData }) {
  const { user } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState(addDays(new Date(), 7));
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("medium");
  const [channels, setChannels] = useState({
    in_app: true,
    email: true,
    teams: false,
    slack: false
  });
  const [loading, setLoading] = useState(false);
  const [userSettings, setUserSettings] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadUserSettings();
      setDefaultMessage();
    }
  }, [isOpen, riskData]);

  const loadUserSettings = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUserSettings(currentUser);
      
      // Set channel availability based on user settings
      setChannels({
        in_app: true,
        email: true,
        teams: !!currentUser.teams_webhook_url,
        slack: !!currentUser.slack_webhook_url
      });
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
  };

  const setDefaultMessage = () => {
    const defaultMsg = riskData?.title 
      ? `Review strategic action plan for: ${riskData.title}`
      : "Review strategic action plan and assess progress";
    setMessage(defaultMsg);
  };

  const setQuickDate = (days) => {
    setSelectedDate(addDays(new Date(), days));
  };

  const handleChannelToggle = (channel) => {
    setChannels(prev => ({ ...prev, [channel]: !prev[channel] }));
  };

  const handleSchedule = async () => {
    // Validate at least one channel is selected
    if (!channels.in_app && !channels.email && !channels.teams && !channels.slack) {
      toast.error('Please select at least one notification channel');
      return;
    }

    if (!message.trim()) {
      toast.error('Please enter a reminder message');
      return;
    }

    setLoading(true);
    try {
      // Combine date and time
      const scheduledDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':');
      scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Create notification with user's channel preferences
      await base44.functions.invoke('createNotification', {
        user_email: user.email,
        type: 'reminder',
        title: 'Strategic Follow-up Reminder',
        message: message,
        priority: priority,
        scheduled_for: scheduledDateTime.toISOString(),
        action_url: riskData ? `/AILeadershipIntelligenceHub` : null
      });

      // The createNotification function will automatically dispatch to selected channels
      // based on the user's notification_preferences and available webhook URLs

      toast.success(`Reminder scheduled for ${format(scheduledDateTime, 'MMM d, yyyy at h:mm a')}`);
      onClose();
    } catch (error) {
      console.error('Error scheduling follow-up:', error);
      toast.error('Failed to schedule reminder');
    } finally {
      setLoading(false);
    }
  };

  const needsWebhookSetup = (channels.teams && !userSettings?.teams_webhook_url) || 
                            (channels.slack && !userSettings?.slack_webhook_url);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Schedule Follow-up Reminder
          </DialogTitle>
          <p className="text-sm text-gray-600">Set a reminder to review your strategic action plan</p>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Quick Date Options */}
            <div>
              <Label className="mb-3 block">Quick Options</Label>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setQuickDate(1)}>
                  In 1 day
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDate(3)}>
                  In 3 days
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDate(7)}>
                  In 1 week
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDate(14)}>
                  In 2 weeks
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDate(30)}>
                  In 1 month
                </Button>
              </div>
            </div>

            {/* Date & Time Selection */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {format(selectedDate, 'MMM d, yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label className="mb-2 block">Time</Label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger>
                    <Clock className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, '0');
                      return (
                        <React.Fragment key={hour}>
                          <SelectItem value={`${hour}:00`}>{`${hour}:00`}</SelectItem>
                          <SelectItem value={`${hour}:30`}>{`${hour}:30`}</SelectItem>
                        </React.Fragment>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Message */}
            <div>
              <Label className="mb-2 block">Reminder Message</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What would you like to be reminded about?"
                rows={3}
              />
            </div>

            {/* Priority */}
            <div>
              <Label className="mb-2 block">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notification Channels */}
            <div>
              <Label className="mb-3 block">Send Reminder Via</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="channel-app"
                    checked={channels.in_app}
                    onCheckedChange={() => handleChannelToggle('in_app')}
                  />
                  <label htmlFor="channel-app" className="text-sm cursor-pointer flex items-center gap-2">
                    <Bell className="w-4 h-4 text-blue-600" />
                    In-App Notification (Always available)
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="channel-email"
                    checked={channels.email}
                    onCheckedChange={() => handleChannelToggle('email')}
                  />
                  <label htmlFor="channel-email" className="text-sm cursor-pointer flex items-center gap-2">
                    <Mail className="w-4 h-4 text-green-600" />
                    Email
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="channel-teams"
                    checked={channels.teams}
                    onCheckedChange={() => handleChannelToggle('teams')}
                    disabled={!userSettings?.teams_webhook_url}
                  />
                  <label htmlFor="channel-teams" className={`text-sm cursor-pointer flex items-center gap-2 ${!userSettings?.teams_webhook_url ? 'opacity-50' : ''}`}>
                    <MessageSquare className="w-4 h-4 text-purple-600" />
                    Microsoft Teams
                    {!userSettings?.teams_webhook_url && (
                      <span className="text-xs text-gray-500">(Not configured)</span>
                    )}
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="channel-slack"
                    checked={channels.slack}
                    onCheckedChange={() => handleChannelToggle('slack')}
                    disabled={!userSettings?.slack_webhook_url}
                  />
                  <label htmlFor="channel-slack" className={`text-sm cursor-pointer flex items-center gap-2 ${!userSettings?.slack_webhook_url ? 'opacity-50' : ''}`}>
                    <MessageSquare className="w-4 h-4 text-orange-600" />
                    Slack
                    {!userSettings?.slack_webhook_url && (
                      <span className="text-xs text-gray-500">(Not configured)</span>
                    )}
                  </label>
                </div>
              </div>
            </div>

            {/* Warning for webhook setup */}
            {needsWebhookSetup && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <AlertDescription className="text-orange-900 text-sm">
                  To enable Teams or Slack notifications, please configure webhook URLs in your{' '}
                  <a href={createPageUrl('Settings')} className="underline font-medium inline-flex items-center gap-1">
                    Settings
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </AlertDescription>
              </Alert>
            )}

            {/* Preview */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-900 mb-2">Reminder Preview:</p>
              <p className="text-sm text-blue-800">
                You will be reminded on <strong>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</strong> at{' '}
                <strong>{selectedTime}</strong> via{' '}
                <strong>
                  {[
                    channels.in_app && 'In-App',
                    channels.email && 'Email',
                    channels.teams && userSettings?.teams_webhook_url && 'Teams',
                    channels.slack && userSettings?.slack_webhook_url && 'Slack'
                  ].filter(Boolean).join(', ')}
                </strong>
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 mt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSchedule} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 mr-2" />
                Schedule Reminder
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
