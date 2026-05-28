import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/useAuth";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Download, 
  Eye, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  FileText,
  Users,
  Settings as SettingsIcon,
  Lock
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import CalendarConsentCard from "@/components/checkin/CalendarConsentCard";
import VisibilityShareFlags from "@/components/privacy/VisibilityShareFlags";
import PHIDetectionConfig from "@/components/privacy/PHIDetectionConfig";
import AccessLogsViewer from "@/components/privacy/AccessLogsViewer";
import DataDownloadPanel from "@/components/privacy/DataDownloadPanel";
import PrivacyTrainingTracker from "@/components/privacy/PrivacyTrainingTracker";
import DataRetentionSettings from "@/components/privacy/DataRetentionSettings";
import PrivacyComplianceDashboard from "@/components/privacy/PrivacyComplianceDashboard";

function PrivacySettings() {
  const { user, appRole, isPlatformAdmin, isSuperAdmin, isOrgLeader, isProgramManager } = useAuth();
  const [loading, setLoading] = useState(true);
  const [privacyData, setPrivacyData] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [tonePrefs, setTonePrefs] = useState(null);
  const [calendarLoading, setCalendarLoading] = useState(false);

  useEffect(() => {
    loadPrivacyData();
  }, [user]);

  const loadPrivacyData = async () => {
    if (!user?.email) return;
    
    try {
      setLoading(true);
      const userPrefs = user.privacy_preferences || {};
      const trainingStatus = user.privacy_training_completed || false;
      const lastDataDownload = user.last_data_download_date || null;

      // Load calendar consent / tone prefs
      const prefs = await base44.entities.TonePreference.filter({ user_email: user.email }, '-created_date', 1);
      setTonePrefs(prefs[0] || null);
      
      setPrivacyData({
        preferences: userPrefs,
        trainingCompleted: trainingStatus,
        lastDataDownload
      });
    } catch (error) {
      console.error("Error loading privacy data:", error);
      toast.error("Failed to load privacy settings");
    } finally {
      setLoading(false);
    }
  };

  const handleCalendarConsent = async (provider) => {
    setCalendarLoading(true);
    try {
      const data = { calendar_consent_given: true, calendar_connected: true };
      if (tonePrefs?.id) {
        await base44.entities.TonePreference.update(tonePrefs.id, data);
        setTonePrefs(prev => ({ ...prev, ...data }));
      } else {
        const created = await base44.entities.TonePreference.create({ user_email: user.email, ...data });
        setTonePrefs(created);
      }
      toast.success('Calendar connected — Atreus will check in more thoughtfully.');
    } catch (e) {
      toast.error('Could not connect calendar');
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleCalendarDisconnect = async () => {
    if (!window.confirm('Disconnect your calendar? Atreus will no longer use meeting load to time check-ins.')) return;
    setCalendarLoading(true);
    try {
      if (tonePrefs?.id) {
        await base44.entities.TonePreference.update(tonePrefs.id, { calendar_consent_given: false, calendar_connected: false });
        setTonePrefs(prev => ({ ...prev, calendar_consent_given: false, calendar_connected: false }));
      }
      toast.success('Calendar disconnected.');
    } catch (e) {
      toast.error('Could not disconnect calendar');
    } finally {
      setCalendarLoading(false);
    }
  };

  // Determine what tabs are available based on role
  const getAvailableTabs = () => {
    const tabs = [
      { id: "overview", label: "Overview", icon: Shield, roles: ["all"] },
      { id: "my-data", label: "My Data", icon: Download, roles: ["all"] },
      { id: "visibility", label: "Sharing Controls", icon: Users, roles: ["all"] },
      { id: "access-logs", label: "Access Logs", icon: Eye, roles: ["all"] },
      { id: "training", label: "Privacy Training", icon: FileText, roles: ["all"] }
    ];

    // Admin-only tabs
    if (isOrgLeader || isSuperAdmin || isPlatformAdmin) {
      tabs.push(
        { id: "compliance", label: "Compliance Dashboard", icon: CheckCircle2, roles: ["admin"] },
        { id: "phi-detection", label: "PHI Detection", icon: AlertTriangle, roles: ["admin"] },
        { id: "retention", label: "Data Retention", icon: Clock, roles: ["admin"] }
      );
    }

    return tabs;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0202ff]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#0202ff] rounded-xl flex items-center justify-center">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Privacy & Security</h1>
                <p className="text-gray-600">Manage your privacy settings and data controls</p>
              </div>
            </div>
            <Badge variant="outline" className="text-sm">
              {appRole}
            </Badge>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Privacy Training</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {privacyData?.trainingCompleted ? "Complete" : "Pending"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Eye className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Data Access</p>
                  <p className="text-2xl font-bold text-gray-900">Monitored</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Encryption</p>
                  <p className="text-2xl font-bold text-gray-900">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Privacy Management</CardTitle>
            <CardDescription>
              Control your privacy settings and view compliance information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${getAvailableTabs().length}, 1fr)` }}>
                {getAvailableTabs().map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
                <div className="prose max-w-none">
                  <h3 className="text-xl font-semibold mb-4">Your Privacy at a Glance</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-[#0202ff]" />
                        Data Protection
                      </h4>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li>✓ All data encrypted at rest and in transit</li>
                        <li>✓ Role-based access controls active</li>
                        <li>✓ Regular security audits performed</li>
                        <li>✓ GDPR and privacy law compliant</li>
                      </ul>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Users className="w-5 h-5 text-[#0202ff]" />
                        Your Rights
                      </h4>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li>✓ Access your data anytime</li>
                        <li>✓ Request data corrections</li>
                        <li>✓ Download your information</li>
                        <li>✓ Control data sharing preferences</li>
                      </ul>
                    </div>
                  </div>

                  {/* Calendar connection */}
                  <div className="mt-6">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <span>📅</span> Calendar Connection
                    </h4>
                    <CalendarConsentCard
                      tonePrefs={tonePrefs}
                      onConsent={handleCalendarConsent}
                      onDisconnect={handleCalendarDisconnect}
                      loading={calendarLoading}
                    />
                  </div>

                  {user?.client_id && (
                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-yellow-900 mb-1">Healthcare Organization Notice</h4>
                          <p className="text-sm text-yellow-800">
                            This platform is not intended for Protected Health Information (PHI). 
                            Never enter patient data, medical records, or HIPAA-protected information.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="visibility" className="mt-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Sharing Controls</h3>
                  <p className="text-sm text-gray-500">Choose what aggregated signals — if any — are shared beyond your private view.</p>
                </div>
                <VisibilityShareFlags userEmail={user?.email} />
              </TabsContent>

              <TabsContent value="my-data" className="mt-6">
                <DataDownloadPanel 
                  user={user} 
                  lastDownloadDate={privacyData?.lastDataDownload}
                  onDownloadComplete={() => loadPrivacyData()}
                />
              </TabsContent>

              <TabsContent value="access-logs" className="mt-6">
                <AccessLogsViewer 
                  user={user} 
                  canViewOthers={isOrgLeader || isSuperAdmin || isPlatformAdmin}
                />
              </TabsContent>

              <TabsContent value="training" className="mt-6">
                <PrivacyTrainingTracker 
                  user={user}
                  isCompleted={privacyData?.trainingCompleted}
                  onComplete={() => loadPrivacyData()}
                />
              </TabsContent>

              {(isOrgLeader || isSuperAdmin || isPlatformAdmin) && (
                <>
                  <TabsContent value="compliance" className="mt-6">
                    <PrivacyComplianceDashboard user={user} />
                  </TabsContent>

                  <TabsContent value="phi-detection" className="mt-6">
                    <PHIDetectionConfig user={user} />
                  </TabsContent>

                  <TabsContent value="retention" className="mt-6">
                    <DataRetentionSettings user={user} />
                  </TabsContent>
                </>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default withAuthProtection(PrivacySettings);