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
  Bell,
  Mail,
  MessageSquare,
  Loader2,
  Settings as SettingsIcon,
  Sparkles,
  CheckCircle2,
  Info,
  ArrowLeft,
  Zap,
  Shield,
  Paintbrush,
  Users
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Link, useLocation } from "react-router-dom";
import CheckInSettings from "@/components/checkin/CheckInSettings";
import CalendarConsentCard from "@/components/checkin/CalendarConsentCard";
import { createPageUrl } from "@/utils";

export default function Settings() {
  const { user, appRole, reloadUser } = useAuth();
  const { updatePageContext } = usePageContext();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    notification_preferences: {
      channels: {
        in_app: true,
        email: true,
        teams: false,
        slack: false
      },
      types: {
        goal_reminders: true,
        learning_assignments: true,
        assessment_due: true,
        ai_coach_nudges: true,
        meeting_requests: true
      },
      frequency: 'instant'
    },
    ai_coach_preferences: {
      tone: 'professional',
      proactivity_level: 'suggestive'
    },
    atreus_agent_enabled: true,
    privacy_settings: {
      allow_activity_tracking: true,
      allow_proactive_suggestions: true,
      data_retention_days: 90
    },
    teams_webhook_url: '',
    slack_webhook_url: ''
  });

  const isAdmin = appRole === 'Admin Level 2' || appRole === 'Admin Level 3';
  const isSuperAdmin = appRole === 'Admin Level 3';

  // State for active tab to be used in context
  const [activeTab, setActiveTab] = useState(isAdmin ? "platform" : "notifications");

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const userData = await base44.auth.me();

      if (userData.notification_preferences) {
        setPreferences(prev => ({
          ...prev,
          notification_preferences: {
            ...prev.notification_preferences,
            ...userData.notification_preferences
          }
        }));
      }

      if (userData.ai_coach_preferences) {
        setPreferences(prev => ({
          ...prev,
          ai_coach_preferences: {
            ...prev.ai_coach_preferences,
            ...userData.ai_coach_preferences
          }
        }));
      }

      if (userData.atreus_agent_enabled !== undefined) {
        setPreferences(prev => ({
          ...prev,
          atreus_agent_enabled: userData.atreus_agent_enabled
        }));
      }

      if (userData.privacy_settings) {
        setPreferences(prev => ({
          ...prev,
          privacy_settings: {
            ...prev.privacy_settings,
            ...userData.privacy_settings
          }
        }));
      }

      if (userData.teams_webhook_url !== undefined) { // Check for undefined to allow empty string
        setPreferences(prev => ({
          ...prev,
          teams_webhook_url: userData.teams_webhook_url
        }));
      }

      if (userData.slack_webhook_url !== undefined) { // Check for undefined to allow empty string
        setPreferences(prev => ({
          ...prev,
          slack_webhook_url: userData.slack_webhook_url
        }));
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast.error('Failed to load preferences');
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

      toast.success('Preferences saved successfully!');
      reloadUser(); // Reload user context after saving preferences
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const updateNotificationChannel = (channel, value) => {
    setPreferences(prev => ({
      ...prev,
      notification_preferences: {
        ...prev.notification_preferences,
        channels: {
          ...prev.notification_preferences.channels,
          [channel]: value
        }
      }
    }));
  };

  const updateNotificationType = (type, value) => {
    setPreferences(prev => ({
      ...prev,
      notification_preferences: {
        ...prev.notification_preferences,
        types: {
          ...prev.notification_preferences.types,
          [type]: value
        }
      }
    }));
  };

  const updateAIPreference = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      ai_coach_preferences: {
        ...prev.ai_coach_preferences,
        [key]: value
      }
    }));
  };

  // Enhanced: Build comprehensive context for Atreus
  const buildAICoachContext = () => {
    const notifConfigured = Object.values(preferences.notification_preferences.channels).some(val => val) ||
                            Object.values(preferences.notification_preferences.types).some(val => val);
    const aiCoachConfigured = Object.keys(preferences.ai_coach_preferences).length > 0;
    const integrationsConfigured = !!(preferences.teams_webhook_url || preferences.slack_webhook_url);

    return {
      current_filters: null,
      visible_data_summary: {
        active_tab: activeTab,
        notifications_configured: notifConfigured,
        ai_coach_configured: aiCoachConfigured,
        integrations_configured: integrationsConfigured,
        teams_connected: !!preferences.teams_webhook_url,
        slack_connected: !!preferences.slack_webhook_url
      },
      selected_items: null,
      modal_focus: null,
      page_specific_insights: {
        notification_types_count: Object.keys(preferences.notification_preferences.types).length,
        email_notifications: preferences.notification_preferences.channels.email || false,
        push_notifications: preferences.notification_preferences.channels.in_app || false,
        ai_proactivity: preferences.ai_coach_preferences.proactivity_level || 'suggestive', // Default to 'suggestive' as per initial state
        ai_communication_style: preferences.ai_coach_preferences.tone || 'professional', // Default to 'professional' as per initial state
        integrations_available: 2,
        integrations_active: [preferences.teams_webhook_url, preferences.slack_webhook_url].filter(Boolean).length
      },
      available_actions: getAvailableActions(),
      viewing_focus: `settings_${activeTab}`
    };
  };

  const getAvailableActions = () => {
    const actions = [];

    if (activeTab === 'notifications') {
      actions.push({
        action: 'configure_notifications',
        description: 'Set up notification preferences for channels and types'
      });

      if (Object.values(preferences.notification_preferences.channels).some(val => val) || Object.values(preferences.notification_preferences.types).some(val => val)) {
        actions.push({
          action: 'save_notification_settings',
          description: 'Save your current notification preferences'
        });
      }
    }

    if (activeTab === 'ai-coach') {
      actions.push({
        action: 'configure_ai_coach',
        description: 'Customize AI coach behavior and communication style'
      });

      // Example action, might not be fully functional without a backend test endpoint
      actions.push({
        action: 'test_ai_coach_settings',
        description: 'See an example interaction with current AI coach settings'
      });
    }

    // Refined 'integrations' logic, assuming integration settings are part of 'notifications' tab UI
    if (activeTab === 'notifications') { // Integrations are within the notifications tab
      if (!preferences.teams_webhook_url) {
        actions.push({
          action: 'connect_teams',
          description: 'Connect Microsoft Teams for notifications'
        });
      } else {
        actions.push({
          action: 'disconnect_teams',
          description: 'Disconnect Microsoft Teams'
        });
      }

      if (!preferences.slack_webhook_url) {
        actions.push({
          action: 'connect_slack',
          description: 'Connect Slack for notifications'
        });
      } else {
        actions.push({
          action: 'disconnect_slack',
          description: 'Disconnect Slack'
        });
      }

      if (preferences.teams_webhook_url || preferences.slack_webhook_url) {
        actions.push({
          action: 'send_test_notification',
          description: 'Send a test notification to connected apps'
        });
      }
    }

    actions.push({
      action: 'save_all_settings',
      description: 'Apply and save all changes made in settings'
    });

    return actions;
  };

  // Update context when settings data or active tab changes
  useEffect(() => {
    // Only update context if user data has loaded and we have preferences
    if (!loading && user && preferences) {
      const context = buildAICoachContext();
      updatePageContext(context);
    }
  }, [activeTab, preferences, user, loading]); // Depend on the entire preferences object to detect deep changes

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
          <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Settings
              </h1>
              <p className="text-gray-600">
                Manage your preferences and notification settings
              </p>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        <Tabs defaultValue={isAdmin ? "platform" : "notifications"} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: isAdmin ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)' }}>
            {isAdmin && (
              <TabsTrigger value="platform">
                <SettingsIcon className="w-4 h-4 mr-2" />
                Platform Settings
              </TabsTrigger>
            )}
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="checkin">
              <MessageSquare className="w-4 h-4 mr-2" />
              Check-ins
            </TabsTrigger>
            <TabsTrigger value="ai-coach">
              <Sparkles className="w-4 h-4 mr-2" />
              AI Coach
            </TabsTrigger>
            <TabsTrigger value="atreus-control">
              <Zap className="w-4 h-4 mr-2" />
              Atreus Agent
            </TabsTrigger>
          </TabsList>

          {isAdmin && (
            <TabsContent value="platform">
              <Card>
                <CardHeader>
                  <CardTitle>Platform Settings</CardTitle>
                  <p className="text-sm text-gray-600">
                    Manage global platform configurations
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert>
                    <Info className="w-4 h-4" />
                    <AlertDescription>
                      Platform-wide settings are managed in the Admin Command Center and White Label Settings pages.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 mb-3">APPEARANCE & BRANDING</h3>
                      <div className="space-y-2">
                        <Link to={createPageUrl("WhiteLabel")}>
                          <Button variant="outline" className="w-full justify-start">
                            <Paintbrush className="w-4 h-4 mr-2" />
                            White Label & Branding
                          </Button>
                        </Link>
                        <Link to={createPageUrl("EmailTemplates")}>
                          <Button variant="outline" className="w-full justify-start">
                            <Mail className="w-4 h-4 mr-2" />
                            Email & Notification Templates
                          </Button>
                        </Link>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 mb-3">USER & ACCESS MANAGEMENT</h3>
                      <div className="space-y-2">
                        <Link to={createPageUrl("UserManagement")}>
                          <Button variant="outline" className="w-full justify-start">
                            <Users className="w-4 h-4 mr-2" />
                            User Management
                          </Button>
                        </Link>
                        <Link to={createPageUrl("PrivacySettings")}>
                          <Button variant="outline" className="w-full justify-start">
                            <Shield className="w-4 h-4 mr-2" />
                            Privacy & Compliance
                          </Button>
                        </Link>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 mb-3">OPERATIONS & AUTOMATION</h3>
                      <div className="space-y-2">
                        <Link to={createPageUrl("CommandCenter")}>
                          <Button variant="outline" className="w-full justify-start">
                            <SettingsIcon className="w-4 h-4 mr-2" />
                            Command Center
                          </Button>
                        </Link>
                        <Link to={createPageUrl("Automations")}>
                          <Button variant="outline" className="w-full justify-start">
                            <Zap className="w-4 h-4 mr-2" />
                            Automations
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>

                  {isSuperAdmin && (
                    <div className="pt-6 border-t">
                      <h3 className="font-semibold mb-4">Super Admin Tools</h3>
                      <div className="space-y-3">
                        <Alert className="bg-blue-50 border-blue-200">
                          <Info className="w-4 h-4 text-blue-600" />
                          <AlertDescription className="text-sm text-blue-800">
                            Advanced platform management tools and system diagnostics are available in the Dashboard.
                          </AlertDescription>
                        </Alert>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="notifications">
            <div className="space-y-6">
              <Alert>
                <Shield className="w-4 h-4" />
                <AlertDescription>
                  For advanced privacy controls and data management, visit{" "}
                  <Link to={createPageUrl("PrivacySettings")} className="font-semibold text-[#0202ff] hover:underline">
                    Privacy & Security Settings
                  </Link>
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle>Notification Channels</CardTitle>
                  <p className="text-sm text-gray-600">
                    Choose how you'd like to receive notifications
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="font-medium">In-App Notifications</p>
                        <p className="text-sm text-gray-500">Receive alerts within the platform</p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.notification_preferences.channels.in_app}
                      onCheckedChange={(checked) => updateNotificationChannel('in_app', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="font-medium">Email Notifications</p>
                        <p className="text-sm text-gray-500">Receive updates via email</p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.notification_preferences.channels.email}
                      onCheckedChange={(checked) => updateNotificationChannel('email', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="font-medium">Microsoft Teams</p>
                        <p className="text-sm text-gray-500">Send notifications to Teams</p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.notification_preferences.channels.teams}
                      onCheckedChange={(checked) => updateNotificationChannel('teams', checked)}
                    />
                  </div>

                  {preferences.notification_preferences.channels.teams && (
                    <div className="ml-8 pl-4 border-l-2 border-gray-200">
                      <Label htmlFor="teams_webhook">Teams Webhook URL</Label>
                      <Input
                        id="teams_webhook"
                        type="url"
                        value={preferences.teams_webhook_url}
                        onChange={(e) => setPreferences(prev => ({ ...prev, teams_webhook_url: e.target.value }))}
                        placeholder="https://outlook.office.com/webhook/..."
                        className="mt-2"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Get this from Teams → Connectors → Incoming Webhook
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="font-medium">Slack</p>
                        <p className="text-sm text-gray-500">Send notifications to Slack</p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.notification_preferences.channels.slack}
                      onCheckedChange={(checked) => updateNotificationChannel('slack', checked)}
                    />
                  </div>

                  {preferences.notification_preferences.channels.slack && (
                    <div className="ml-8 pl-4 border-l-2 border-gray-200">
                      <Label htmlFor="slack_webhook">Slack Webhook URL</Label>
                      <Input
                        id="slack_webhook"
                        type="url"
                        value={preferences.slack_webhook_url}
                        onChange={(e) => setPreferences(prev => ({ ...prev, slack_webhook_url: e.target.value }))}
                        placeholder="https://hooks.slack.com/services/..."
                        className="mt-2"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Get this from Slack → Apps → Incoming Webhooks
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notification Types</CardTitle>
                  <p className="text-sm text-gray-600">
                    Select which types of notifications you want to receive
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Goal Reminders</Label>
                    <Switch
                      checked={preferences.notification_preferences.types.goal_reminders}
                      onCheckedChange={(checked) => updateNotificationType('goal_reminders', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Learning Assignments</Label>
                    <Switch
                      checked={preferences.notification_preferences.types.learning_assignments}
                      onCheckedChange={(checked) => updateNotificationType('learning_assignments', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Assessment Due Dates</Label>
                    <Switch
                      checked={preferences.notification_preferences.types.assessment_due}
                      onCheckedChange={(checked) => updateNotificationType('assessment_due', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>AI Coach Nudges</Label>
                    <Switch
                      checked={preferences.notification_preferences.types.ai_coach_nudges}
                      onCheckedChange={(checked) => updateNotificationType('ai_coach_nudges', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>1:1 Meeting Requests</Label>
                    <Switch
                      checked={preferences.notification_preferences.types.meeting_requests}
                      onCheckedChange={(checked) => updateNotificationType('meeting_requests', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notification Frequency</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={preferences.notification_preferences.frequency}
                    onValueChange={(value) => setPreferences(prev => ({
                      ...prev,
                      notification_preferences: {
                        ...prev.notification_preferences,
                        frequency: value
                      }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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

          <TabsContent value="checkin">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Atreus Check-in Settings</h2>
                <p className="text-sm text-gray-500">
                  Control how Atreus reaches out to you, what tone it uses, and what data it draws on.
                </p>
              </div>
              <CheckInSettings />
              <CalendarConsentCard
                onConnect={(provider) => toast.success(`${provider === 'microsoft_365' ? 'Microsoft 365' : 'Google'} calendar connected`)}
                onDisconnect={() => toast.success('Calendar disconnected')}
              />
            </div>
          </TabsContent>

          <TabsContent value="ai-coach">
            <Card>
              <CardHeader>
                <CardTitle>AI Coach Preferences</CardTitle>
                <p className="text-sm text-gray-600">
                  Customize how Atreus Coach interacts with you
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="ai_tone">Communication Tone</Label>
                  <Select
                    value={preferences.ai_coach_preferences.tone}
                    onValueChange={(value) => updateAIPreference('tone', value)}
                  >
                    <SelectTrigger id="ai_tone" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="encouraging">Encouraging</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Choose the tone that resonates with your communication style
                  </p>
                </div>

                <div>
                  <Label htmlFor="ai_proactivity">Proactivity Level</Label>
                  <Select
                    value={preferences.ai_coach_preferences.proactivity_level}
                    onValueChange={(value) => updateAIPreference('proactivity_level', value)}
                  >
                    <SelectTrigger id="ai_proactivity" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on_demand">On-Demand Only</SelectItem>
                      <SelectItem value="suggestive">Suggestive Nudges (Recommended)</SelectItem>
                      <SelectItem value="proactive">Proactive Guidance</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Control how frequently Atreus offers unsolicited guidance
                  </p>
                </div>

                <Alert>
                  <Sparkles className="w-4 h-4" />
                  <AlertDescription>
                    Your AI Coach preferences help Atreus tailor its communication style and frequency to match your learning preferences.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="atreus-control">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Atreus Agent Capabilities</CardTitle>
                  <p className="text-sm text-gray-600">
                    Control what actions Atreus can perform on your behalf
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert>
                    <Sparkles className="w-4 h-4" />
                    <AlertDescription>
                      Atreus can now execute tasks for you! Enable agent capabilities to let Atreus create reminders, assign learning, generate reports, and more based on your natural language requests.
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div>
                      <p className="font-semibold text-gray-900">Enable Agent Actions</p>
                      <p className="text-sm text-gray-600">Allow Atreus to execute tasks on your behalf</p>
                    </div>
                    <Switch
                      checked={preferences.atreus_agent_enabled !== false}
                      onCheckedChange={(checked) => setPreferences(prev => ({
                        ...prev,
                        atreus_agent_enabled: checked
                      }))}
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Available Agent Capabilities</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-700">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>Generate and export reports (PDF/CSV)</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>Create reminders and notifications</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>Assign learning resources to users</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>Create and cascade goals</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>Schedule calendar events</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>Send emails to team members</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>Invite new users (with permission)</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>Bulk operations (assign to team, division, etc.)</span>
                      </div>
                    </div>
                  </div>

                  <Alert className="bg-amber-50 border-amber-200">
                    <Shield className="w-4 h-4 text-amber-600" />
                    <AlertDescription className="text-amber-900">
                      <strong>Security Note:</strong> All agent actions require your explicit confirmation before execution. Atreus will never perform actions without your approval.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Privacy & Data Control</CardTitle>
                  <p className="text-sm text-gray-600">
                    Manage how Atreus uses your data for personalization
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Allow Activity Tracking</Label>
                      <p className="text-xs text-gray-500 mt-1">
                        Let Atreus track your platform usage to provide better recommendations
                      </p>
                    </div>
                    <Switch
                      checked={preferences.privacy_settings?.allow_activity_tracking !== false}
                      onCheckedChange={(checked) => setPreferences(prev => ({
                        ...prev,
                        privacy_settings: {
                          ...prev.privacy_settings,
                          allow_activity_tracking: checked
                        }
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Proactive Suggestions</Label>
                      <p className="text-xs text-gray-500 mt-1">
                        Allow Atreus to proactively suggest actions based on your data
                      </p>
                    </div>
                    <Switch
                      checked={preferences.privacy_settings?.allow_proactive_suggestions !== false}
                      onCheckedChange={(checked) => setPreferences(prev => ({
                        ...prev,
                        privacy_settings: {
                          ...prev.privacy_settings,
                          allow_proactive_suggestions: checked
                        }
                      }))}
                    />
                  </div>

                  <div>
                    <Label>Data Retention Period</Label>
                    <Select
                      value={String(preferences.privacy_settings?.data_retention_days || 90)}
                      onValueChange={(value) => setPreferences(prev => ({
                        ...prev,
                        privacy_settings: {
                          ...prev.privacy_settings,
                          data_retention_days: parseInt(value)
                        }
                      }))}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="60">60 days</SelectItem>
                        <SelectItem value="90">90 days (Recommended)</SelectItem>
                        <SelectItem value="180">180 days</SelectItem>
                        <SelectItem value="365">1 year</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      Activity data older than this will be automatically deleted
                    </p>
                  </div>

                  <Alert>
                    <Info className="w-4 h-4" />
                    <AlertDescription>
                      All data is stored securely and complies with HIPAA and SOC II standards. Visit{" "}
                      <Link to={createPageUrl("PrivacySettings")} className="font-semibold text-[#0202ff] hover:underline">
                        Privacy Settings
                      </Link>{" "}
                      for detailed privacy controls.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Action History</CardTitle>
                  <p className="text-sm text-gray-600">
                    Review actions Atreus has performed on your behalf
                  </p>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.location.href = createPageUrl('Dashboard') + '#agent-history'}
                  >
                    View Agent Action History
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}