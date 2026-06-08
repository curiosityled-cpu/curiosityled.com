import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/useAuth";
import { usePageContext } from "../Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import DeleteAccountDialog from "@/components/mobile/DeleteAccountDialog";
import {
  Bell, Mail, MessageSquare, Loader2, Settings as SettingsIcon,
  Sparkles, CheckCircle2, Info, ArrowLeft, Zap, Shield, Paintbrush,
  Users, Eye
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Link, useLocation } from "react-router-dom";
import CheckInSettings from "@/components/checkin/CheckInSettings";
import CalendarConsentCard from "@/components/checkin/CalendarConsentCard";
import OrgVisibilityPanel from "@/components/privacy/OrgVisibilityPanel";
import VisibilityShareFlags from "@/components/privacy/VisibilityShareFlags";
import PHIDetectionConfig from "@/components/privacy/PHIDetectionConfig";
import AccessLogsViewer from "@/components/privacy/AccessLogsViewer";
import DataDownloadPanel from "@/components/privacy/DataDownloadPanel";
import PrivacyTrainingTracker from "@/components/privacy/PrivacyTrainingTracker";
import DataRetentionSettings from "@/components/privacy/DataRetentionSettings";
import PrivacyComplianceDashboard from "@/components/privacy/PrivacyComplianceDashboard";
import { createPageUrl } from "@/utils";

export default function Settings() {
  const { user, appRole, reloadUser, isPlatformAdmin, isSuperAdmin, isOrgLeader } = useAuth();
  const { updatePageContext } = usePageContext();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Notification / AI prefs
  const [preferences, setPreferences] = useState({
    notification_preferences: {
      channels: { in_app: true, email: true, teams: false, slack: false },
      types: { goal_reminders: true, learning_assignments: true, assessment_due: true, ai_coach_nudges: true, meeting_requests: true, morning_checkin_reminder: true, evening_checkin_reminder: true, midday_loop_reminder: true, weekly_reflection_reminder: true },
      frequency: 'instant'
    },
    ai_coach_preferences: { tone: 'professional', proactivity_level: 'suggestive' },
    atreus_agent_enabled: true,
    privacy_settings: { allow_activity_tracking: true, allow_proactive_suggestions: true, data_retention_days: 90 },
    teams_webhook_url: '',
    slack_webhook_url: ''
  });

  // Privacy / calendar state
  const [tonePrefs, setTonePrefs] = useState(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [privacyData, setPrivacyData] = useState(null);

  const isAdmin = appRole === 'Admin Level 2' || appRole === 'Admin Level 3';
  const [activeTab, setActiveTab] = useState("notifications");

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [userData, prefs] = await Promise.all([
        base44.auth.me(),
        user?.email ? base44.entities.TonePreference.filter({ user_email: user.email }, '-created_date', 1) : Promise.resolve([])
      ]);

      if (userData.notification_preferences) {
        setPreferences(prev => ({ ...prev, notification_preferences: { ...prev.notification_preferences, ...userData.notification_preferences } }));
      }
      if (userData.ai_coach_preferences) {
        setPreferences(prev => ({ ...prev, ai_coach_preferences: { ...prev.ai_coach_preferences, ...userData.ai_coach_preferences } }));
      }
      if (userData.atreus_agent_enabled !== undefined) {
        setPreferences(prev => ({ ...prev, atreus_agent_enabled: userData.atreus_agent_enabled }));
      }
      if (userData.privacy_settings) {
        setPreferences(prev => ({ ...prev, privacy_settings: { ...prev.privacy_settings, ...userData.privacy_settings } }));
      }
      if (userData.teams_webhook_url !== undefined) setPreferences(prev => ({ ...prev, teams_webhook_url: userData.teams_webhook_url }));
      if (userData.slack_webhook_url !== undefined) setPreferences(prev => ({ ...prev, slack_webhook_url: userData.slack_webhook_url }));

      setTonePrefs(prefs[0] || null);
      setPrivacyData({
        preferences: userData.privacy_preferences || {},
        trainingCompleted: userData.privacy_training_completed || false,
        lastDataDownload: userData.last_data_download_date || null
      });
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        notification_preferences: preferences.notification_preferences,
        ai_coach_preferences: preferences.ai_coach_preferences,
        atreus_agent_enabled: preferences.atreus_agent_enabled,
        privacy_settings: preferences.privacy_settings,
        teams_webhook_url: preferences.teams_webhook_url || null,
        slack_webhook_url: preferences.slack_webhook_url || null
      });
      toast.success('Preferences saved!');
      reloadUser();
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleCalendarConsent = async (provider) => {
    setCalendarLoading(true);
    try {
      const data = { calendar_consent_given: true, calendar_connected: true, calendar_provider: provider || 'microsoft_365' };
      if (tonePrefs?.id) {
        await base44.entities.TonePreference.update(tonePrefs.id, data);
        setTonePrefs(prev => ({ ...prev, ...data }));
      } else {
        const created = await base44.entities.TonePreference.create({ user_email: user.email, ...data });
        setTonePrefs(created);
      }
      toast.success('Calendar connected');
    } catch (e) {
      toast.error('Could not connect calendar');
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleCalendarDisconnect = async () => {
    setCalendarLoading(true);
    try {
      if (tonePrefs?.id) {
        await base44.entities.TonePreference.update(tonePrefs.id, { calendar_consent_given: false, calendar_connected: false });
        setTonePrefs(prev => ({ ...prev, calendar_consent_given: false, calendar_connected: false }));
      }
      toast.success('Calendar disconnected');
    } catch (e) {
      toast.error('Could not disconnect calendar');
    } finally {
      setCalendarLoading(false);
    }
  };

  const updateNotificationChannel = (channel, value) => setPreferences(prev => ({
    ...prev, notification_preferences: { ...prev.notification_preferences, channels: { ...prev.notification_preferences.channels, [channel]: value } }
  }));

  const updateNotificationType = (type, value) => setPreferences(prev => ({
    ...prev, notification_preferences: { ...prev.notification_preferences, types: { ...prev.notification_preferences.types, [type]: value } }
  }));

  const updateAIPreference = (key, value) => setPreferences(prev => ({
    ...prev, ai_coach_preferences: { ...prev.ai_coach_preferences, [key]: value }
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage your preferences, privacy, and integrations</p>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><CheckCircle2 className="w-4 h-4 mr-2" />Save Changes</>}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="notifications" onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1">
            {isAdmin && (
              <TabsTrigger value="platform"><SettingsIcon className="w-4 h-4 mr-2" />Platform</TabsTrigger>
            )}
            <TabsTrigger value="notifications"><Bell className="w-4 h-4 mr-2" />Notifications</TabsTrigger>
            <TabsTrigger value="checkin"><MessageSquare className="w-4 h-4 mr-2" />Atreus</TabsTrigger>
            <TabsTrigger value="privacy-visibility"><Shield className="w-4 h-4 mr-2" />Privacy & Data</TabsTrigger>
          </TabsList>

          {/* ── Platform (admin only) ── */}
          {isAdmin && (
            <TabsContent value="platform">
              <Card>
                <CardHeader>
                  <CardTitle>Platform Settings</CardTitle>
                  <p className="text-sm text-gray-600">Manage global platform configurations</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert><Info className="w-4 h-4" /><AlertDescription>Platform-wide settings are managed in the Admin Command Center and White Label Settings pages.</AlertDescription></Alert>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 mb-3">APPEARANCE & BRANDING</h3>
                      <div className="space-y-2">
                        <Link to={createPageUrl("WhiteLabel")}><Button variant="outline" className="w-full justify-start"><Paintbrush className="w-4 h-4 mr-2" />White Label & Branding</Button></Link>
                        <Link to={createPageUrl("EmailTemplates")}><Button variant="outline" className="w-full justify-start"><Mail className="w-4 h-4 mr-2" />Email & Notification Templates</Button></Link>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 mb-3">USER & ACCESS MANAGEMENT</h3>
                      <div className="space-y-2">
                        <Link to={createPageUrl("UserManagement")}><Button variant="outline" className="w-full justify-start"><Users className="w-4 h-4 mr-2" />User Management</Button></Link>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 mb-3">OPERATIONS & AUTOMATION</h3>
                      <div className="space-y-2">
                        <Link to={createPageUrl("CommandCenter")}><Button variant="outline" className="w-full justify-start"><SettingsIcon className="w-4 h-4 mr-2" />Command Center</Button></Link>
                        <Link to={createPageUrl("Automations")}><Button variant="outline" className="w-full justify-start"><Zap className="w-4 h-4 mr-2" />Automations</Button></Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ── Notifications ── */}
          <TabsContent value="notifications">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Channels</CardTitle>
                  <p className="text-sm text-gray-600">Choose how you'd like to receive notifications</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { key: 'in_app', label: 'In-App Notifications', sub: 'Receive alerts within the platform', icon: Bell },
                    { key: 'email', label: 'Email Notifications', sub: 'Receive updates via email', icon: Mail },
                  ].map(({ key, label, sub, icon: Icon }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-gray-600" />
                        <div><p className="font-medium">{label}</p><p className="text-sm text-gray-500">{sub}</p></div>
                      </div>
                      <Switch checked={preferences.notification_preferences.channels[key]} onCheckedChange={(v) => updateNotificationChannel(key, v)} />
                    </div>
                  ))}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-gray-600" />
                      <div><p className="font-medium">Microsoft Teams</p><p className="text-sm text-gray-500">Send notifications to Teams</p></div>
                    </div>
                    <Switch checked={preferences.notification_preferences.channels.teams} onCheckedChange={(v) => updateNotificationChannel('teams', v)} />
                  </div>
                  {preferences.notification_preferences.channels.teams && (
                    <div className="ml-8 pl-4 border-l-2 border-gray-200">
                      <Label htmlFor="teams_webhook">Teams Webhook URL</Label>
                      <Input id="teams_webhook" type="url" value={preferences.teams_webhook_url} onChange={(e) => setPreferences(prev => ({ ...prev, teams_webhook_url: e.target.value }))} placeholder="https://outlook.office.com/webhook/..." className="mt-2" />
                      <p className="text-xs text-gray-500 mt-1">Get this from Teams → Connectors → Incoming Webhook</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-gray-600" />
                      <div><p className="font-medium">Slack</p><p className="text-sm text-gray-500">Send notifications to Slack</p></div>
                    </div>
                    <Switch checked={preferences.notification_preferences.channels.slack} onCheckedChange={(v) => updateNotificationChannel('slack', v)} />
                  </div>
                  {preferences.notification_preferences.channels.slack && (
                    <div className="ml-8 pl-4 border-l-2 border-gray-200">
                      <Label htmlFor="slack_webhook">Slack Webhook URL</Label>
                      <Input id="slack_webhook" type="url" value={preferences.slack_webhook_url} onChange={(e) => setPreferences(prev => ({ ...prev, slack_webhook_url: e.target.value }))} placeholder="https://hooks.slack.com/services/..." className="mt-2" />
                      <p className="text-xs text-gray-500 mt-1">Get this from Slack → Apps → Incoming Webhooks</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notification Types</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">General</p>
                  {[
                    { key: 'goal_reminders', label: 'Goal Reminders' },
                    { key: 'learning_assignments', label: 'Learning Assignments' },
                    { key: 'assessment_due', label: 'Assessment Due Dates' },
                    { key: 'ai_coach_nudges', label: 'AI Coach Nudges' },
                    { key: 'meeting_requests', label: '1:1 Meeting Requests' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label>{label}</Label>
                      <Switch checked={preferences.notification_preferences.types[key]} onCheckedChange={(v) => updateNotificationType(key, v)} />
                    </div>
                  ))}

                  <div className="border-t pt-4 mt-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Daily Rhythm Reminders</p>
                    <div className="space-y-3">
                      {[
                        { key: 'morning_checkin_reminder', label: 'Morning Check-in Reminder', sub: 'Prompt to start your day with a self-check' },
                        { key: 'evening_checkin_reminder', label: 'Evening Check-in Reminder', sub: 'Prompt to reflect and plan tomorrow\'s Big 3' },
                        { key: 'midday_loop_reminder', label: 'Midday Priority Loop', sub: 'Nudge to check how your Big 3 is tracking' },
                        { key: 'weekly_reflection_reminder', label: 'Weekly Rhythm Reflection', sub: 'Friday summary of your week\'s patterns and insights' },
                      ].map(({ key, label, sub }) => (
                        <div key={key} className="flex items-center justify-between">
                          <div>
                            <Label>{label}</Label>
                            <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
                          </div>
                          <Switch
                            checked={preferences.notification_preferences.types[key] ?? true}
                            onCheckedChange={(v) => updateNotificationType(key, v)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Notification Frequency</CardTitle></CardHeader>
                <CardContent>
                  <Select value={preferences.notification_preferences.frequency} onValueChange={(v) => setPreferences(prev => ({ ...prev, notification_preferences: { ...prev.notification_preferences, frequency: v } }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instant">Instant (as they happen)</SelectItem>
                      <SelectItem value="daily">Daily Digest</SelectItem>
                      <SelectItem value="weekly">Weekly Summary</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Atreus Check-in Settings ── */}
          <TabsContent value="checkin">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Atreus Settings</h2>
                <p className="text-sm text-gray-500">Manage how Atreus works for you — your tone, check-in style, calendar access, and more.</p>
              </div>
              <CheckInSettings />
              <CalendarConsentCard
                tonePrefs={tonePrefs}
                onConnect={handleCalendarConsent}
                onConsent={handleCalendarConsent}
                onDisconnect={handleCalendarDisconnect}
                loading={calendarLoading}
              />
            </div>
          </TabsContent>

          {/* ── Privacy & Data (merged from PrivacySettings) ── */}
          <TabsContent value="privacy-visibility">
            <div className="space-y-6">
              {/* Merged Privacy & Sharing Controls */}
              <Card>
                <CardHeader>
                  <CardTitle>Privacy & Sharing Controls</CardTitle>
                  <p className="text-sm text-gray-600">Control how your data is used and what is shared with your organisation</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* DailyCheckIn privacy statement */}
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 space-y-1">
                    <p className="text-xs font-semibold text-blue-800">Daily Check-in Data — Private to You</p>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Your morning and evening check-in responses, Big 3 priorities, and all self-reported scores are stored privately and are only accessible to you and Atreus (to generate your personal insights). They are never shared with HR, your manager, or anyone else.
                    </p>
                  </div>

                  {/* Pattern Watch opt-out */}
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Allow Atreus to observe behavioral patterns</p>
                      <p className="text-xs text-gray-500 mt-0.5">Atreus learns from your check-in history to detect recurring patterns and surface them as insights. Disabling this turns off the Pattern Watch layer.</p>
                    </div>
                    <Switch
                      checked={preferences.privacy_settings?.allow_activity_tracking ?? true}
                      onCheckedChange={(v) => setPreferences(prev => ({ ...prev, privacy_settings: { ...prev.privacy_settings, allow_activity_tracking: v } }))}
                    />
                  </div>

                  {/* Fine-grained sharing flags */}
                  <div className="space-y-3 border-t pt-4">
                    <VisibilityShareFlags userEmail={user?.email} />
                  </div>
                </CardContent>
              </Card>

              {/* Data download */}
              <Card>
                <CardHeader><CardTitle>My Data</CardTitle></CardHeader>
                <CardContent>
                  <DataDownloadPanel user={user} lastDownloadDate={privacyData?.lastDataDownload} onDownloadComplete={loadAll} />
                </CardContent>
              </Card>

              {/* Privacy training */}
              <Card>
                <CardHeader><CardTitle>Privacy Training</CardTitle></CardHeader>
                <CardContent>
                  <PrivacyTrainingTracker user={user} isCompleted={privacyData?.trainingCompleted} onComplete={loadAll} />
                </CardContent>
              </Card>

              {/* Admin-only */}
              {(isOrgLeader || isSuperAdmin || isPlatformAdmin) && (
                <>
                  <Card>
                    <CardHeader><CardTitle>Compliance Dashboard</CardTitle></CardHeader>
                    <CardContent><PrivacyComplianceDashboard user={user} /></CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>PHI Detection</CardTitle></CardHeader>
                    <CardContent><PHIDetectionConfig user={user} /></CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Data Retention</CardTitle></CardHeader>
                    <CardContent><DataRetentionSettings user={user} /></CardContent>
                  </Card>
                </>
              )}

              {/* Account deletion — always at the bottom */}
              <Card>
                <CardHeader><CardTitle>Account</CardTitle></CardHeader>
                <CardContent>
                  <DeleteAccountDialog userEmail={user?.email} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}