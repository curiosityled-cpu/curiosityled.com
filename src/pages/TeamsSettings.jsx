/**
 * TeamsSettings — Microsoft Teams companion tab for Atreus settings.
 *
 * Designed to run as a Teams personal tab (standalone, no main nav).
 * Covers: tone, cadence, visibility/share flags, calendar connection.
 * No authentication wrapper needed — teams_onboarding_complete gate used instead.
 *
 * Route: /teams-settings
 */
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Brain, Shield, Calendar, CheckCircle2, MessageSquare, Clock, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import CheckInSettings from "@/components/checkin/CheckInSettings";
import VisibilityShareFlags from "@/components/privacy/VisibilityShareFlags";
import CalendarConsentCard from "@/components/checkin/CalendarConsentCard";

const TABS = [
  { id: 'atreus', label: 'Atreus', icon: Brain },
  { id: 'visibility', label: 'Privacy', icon: Shield },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
];

export default function TeamsSettings() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('atreus');
  const [tonePrefs, setTonePrefs] = useState(null);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [calendarSaving, setCalendarSaving] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    base44.entities.TonePreference.filter({ user_email: user.email }, null, 1)
      .then(rows => {
        setTonePrefs(rows[0] || null);
        setPrefsLoading(false);
      });
  }, [user?.email]);

  const handleCalendarConsent = async (provider) => {
    setCalendarSaving(true);
    try {
      const data = { calendar_consent_given: true, calendar_provider: provider || 'microsoft_365' };
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
      setCalendarSaving(false);
    }
  };

  const handleCalendarDisconnect = async () => {
    setCalendarSaving(true);
    try {
      if (tonePrefs?.id) {
        await base44.entities.TonePreference.update(tonePrefs.id, {
          calendar_consent_given: false,
          calendar_provider: 'none',
        });
        setTonePrefs(prev => ({ ...prev, calendar_consent_given: false, calendar_provider: 'none' }));
      }
      toast.success('Calendar disconnected');
    } catch (e) {
      toast.error('Could not disconnect calendar');
    } finally {
      setCalendarSaving(false);
    }
  };

  // Mark Teams onboarding complete once the user visits
  useEffect(() => {
    if (!user?.email || prefsLoading) return;
    if (tonePrefs && !tonePrefs.teams_onboarding_complete) {
      base44.entities.TonePreference.update(tonePrefs.id, { teams_onboarding_complete: true })
        .then(() => setTonePrefs(prev => ({ ...prev, teams_onboarding_complete: true })))
        .catch(() => {});
    }
  }, [prefsLoading, tonePrefs?.id]);

  if (authLoading || prefsLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#0202ff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 p-6 text-center">
        <Brain className="w-10 h-10 text-[#0202ff]" />
        <p className="text-sm font-semibold text-gray-900">Sign in to manage your Atreus settings</p>
        <button
          onClick={() => base44.auth.redirectToLogin(window.location.href)}
          className="px-4 py-2 bg-[#0202ff] text-white text-sm font-medium rounded-xl"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Teams-style header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-0 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-[#0202ff] flex items-center justify-center flex-shrink-0">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">Atreus Settings</p>
            <p className="text-[10px] text-gray-400">{user.full_name || user.email}</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-100 -mx-4">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-[#0202ff] text-[#0202ff]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-5">

        {activeTab === 'atreus' && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 bg-[#0202ff]/5 border border-[#0202ff]/15 rounded-xl px-4 py-3">
              <Brain className="w-3.5 h-3.5 text-[#0202ff] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#0202ff] leading-relaxed">
                These settings control how Atreus interacts with you via Teams and in the web app.
              </p>
            </div>
            <CheckInSettings />
          </div>
        )}

        {activeTab === 'visibility' && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
              <Shield className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-700 leading-relaxed">
                Your raw check-ins and personal reflections are <strong>always private</strong>.
                Below you can choose what aggregated signals, if any, are shared more broadly.
              </p>
            </div>
            <VisibilityShareFlags />
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <Calendar className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 leading-relaxed">
                Connecting your calendar lets Atreus time check-ins more thoughtfully — checking in
                before packed days rather than interrupting deep work.
                Only your meeting <em>structure</em> is used (count, density, timing). Not titles or attendees.
              </p>
            </div>
            <CalendarConsentCard
              tonePrefs={tonePrefs}
              onConsent={handleCalendarConsent}
              onDisconnect={handleCalendarDisconnect}
              loading={calendarSaving}
            />
          </div>
        )}
      </div>

      {/* Teams-style bottom safe area */}
      <div className="h-safe-area-inset-bottom bg-gray-50" />
    </div>
  );
}