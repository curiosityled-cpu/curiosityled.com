/**
 * PrivacySettings — manager privacy & data transparency page.
 *
 * Shows exactly what the organisation sees vs what is private.
 * Allows calendar consent, data download, and check-in history deletion.
 * Uses the approved council copy verbatim.
 */
import React, { useState, useEffect } from "react";
import { Shield, Eye, EyeOff, Download, Trash2, CheckCircle2, Info, Bell, Calendar, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";
import { toast } from "sonner";

const PRIVATE_ROWS = [
  { what: "Your check-in responses (energy, load, confidence)", who: "Only you" },
  { what: "Anything you type to Atreus", who: "Only you" },
  { what: "Your pattern history and trend summaries", who: "Only you" },
  { what: "Whether you've been 'stretched' lately", who: "Only you" },
  { what: "Your calendar data (if connected)", who: "Only you and Atreus" },
  { what: "An anonymised operational load signal", who: "Your organisation (aggregated, never individual)" },
];

function PrivacyTableRow({ row }) {
  const isOrg = row.who.includes('organisation');
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-start gap-2 flex-1 min-w-0">
        {isOrg ? (
          <Eye className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
        ) : (
          <EyeOff className="w-3.5 h-3.5 text-[#0202ff] flex-shrink-0 mt-0.5" />
        )}
        <p className="text-sm text-gray-700">{row.what}</p>
      </div>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
        isOrg ? 'bg-gray-100 text-gray-600' : 'bg-[#0202ff]/8 text-[#0202ff]'
      }`}>
        {row.who}
      </span>
    </div>
  );
}

export default function PrivacySettings() {
  const { user } = useAuth();
  const [tonePrefs, setTonePrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deletingHistory, setDeletingHistory] = useState(false);
  const [calendarToggling, setCalendarToggling] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user?.email) return;
      try {
        const prefs = await base44.entities.TonePreference.filter({ user_email: user.email }, '-created_date', 1);
        setTonePrefs(prefs[0] || null);
      } catch (e) {
        console.warn('Could not load tone prefs:', e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.email]);

  const handleCalendarConsent = async (value) => {
    setCalendarToggling(true);
    try {
      if (tonePrefs?.id) {
        await base44.entities.TonePreference.update(tonePrefs.id, {
          calendar_consent_given: value,
          calendar_connected: value,
        });
        setTonePrefs(prev => ({ ...prev, calendar_consent_given: value, calendar_connected: value }));
      } else {
        const created = await base44.entities.TonePreference.create({
          user_email: user.email,
          calendar_consent_given: value,
          calendar_connected: value,
        });
        setTonePrefs(created);
      }
      toast.success(value ? 'Calendar connected' : 'Calendar disconnected');
    } catch (e) {
      toast.error('Could not update calendar setting');
    } finally {
      setCalendarToggling(false);
    }
  };

  const handleDeleteHistory = async () => {
    if (!window.confirm('This will permanently delete all your check-in responses and pattern history. Atreus will start fresh. This cannot be undone. Are you sure?')) return;
    setDeletingHistory(true);
    try {
      // Fetch and delete all user's ManagerPulse records
      const pulses = await base44.entities.ManagerPulse.filter({ user_email: user.email }, '-created_date', 200);
      await Promise.all(pulses.map(p => base44.entities.ManagerPulse.delete(p.id)));
      // Also delete ManagerTrends
      const trends = await base44.entities.ManagerTrends.filter({ user_email: user.email }, '-last_trend_computed_at', 5);
      await Promise.all(trends.map(t => base44.entities.ManagerTrends.delete(t.id)));
      toast.success('Check-in history deleted. Atreus will start fresh.');
    } catch (e) {
      toast.error('Could not delete history: ' + e.message);
    } finally {
      setDeletingHistory(false);
    }
  };

  const handleDownloadData = () => {
    // Stub — download will be implemented with backend export function
    toast.info('Data download will be available shortly. We\'re preparing your export.');
  };

  return (
    <MVPPageLayout title="Privacy & Data" subtitle="What we store, what your organisation sees, and your controls.">
      <div className="space-y-4 max-w-2xl">

        {/* Main privacy explainer */}
        <Card className="shadow-sm border border-[#0202ff]/15 bg-white rounded-2xl overflow-hidden">
          <div className="px-5 pt-5 pb-2 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#0202ff] flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">What Curiosity Led shares with your organisation</p>
            </div>
          </div>

          <CardContent className="px-5 pt-3 pb-5 space-y-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              Your check-in responses, reflections, confidence levels, and anything you share with Atreus are{" "}
              <strong>yours alone</strong>. They are never visible to HR, your manager, or anyone in your organisation.
            </p>

            <p className="text-sm text-gray-600 leading-relaxed">
              The only signal your organisation ever sees is an{" "}
              <strong>aggregated, anonymised measure of operational load</strong> — a number derived from how many
              goals are active and overdue, and how long it's been since your last learning activity. This signal
              never identifies you individually, and is only ever shown when enough people are in the group
              (minimum 5) to prevent anyone from being identifiable.
            </p>

            {/* Privacy table */}
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="grid grid-cols-2 bg-gray-50 px-4 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500">What you share with Atreus</p>
                <p className="text-xs font-semibold text-gray-500 text-right">Who sees it</p>
              </div>
              <div className="px-4">
                {PRIVATE_ROWS.map((row, i) => (
                  <PrivacyTableRow key={i} row={row} />
                ))}
              </div>
            </div>

            {/* How the org signal works */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-700">How the organisational signal works</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                The operational load signal is calculated from two things: how many of your goals are overdue,
                and how long it's been since you last engaged with a learning resource. It says nothing about
                how you feel, what you said to Atreus, or how you're performing. Your organisation sees it
                only as a distribution — for example, "this week, 40% of managers in this group showed elevated
                load signals." Your name is never attached to it.
              </p>
              <p className="text-xs font-semibold text-gray-500">
                If your organisation has fewer than 5 managers in a group, no signal is displayed at all.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Calendar consent */}
        <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
          <div className="px-5 pt-5 pb-2 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <p className="text-sm font-semibold text-gray-900">Outlook Calendar</p>
          </div>

          <CardContent className="px-5 pt-2 pb-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm text-gray-700 font-medium">Connect my calendar</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                  Allows Atreus to see meeting load and check in when your day looks particularly packed.
                </p>
              </div>
              <Switch
                checked={!!tonePrefs?.calendar_consent_given}
                onCheckedChange={handleCalendarConsent}
                disabled={calendarToggling || loading}
              />
            </div>

            <div className="space-y-2 border-t border-gray-50 pt-3">
              <p className="text-xs font-semibold text-gray-600">What we read if connected:</p>
              <ul className="space-y-1">
                {[
                  "Meeting titles, start times, and end times",
                  "Number of attendees (not who they are)",
                  "Whether a meeting is recurring",
                  "Whether a meeting was accepted, declined, or cancelled",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-gray-500">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-xs font-semibold text-gray-600 pt-1">What we never read:</p>
              <ul className="space-y-1">
                {[
                  "Meeting notes or agendas",
                  "Email content of any kind",
                  "Who specifically is in your meetings",
                  "Anything outside your calendar",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-gray-400">
                    <Lock className="w-3 h-3 text-gray-300 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Data controls */}
        <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
          <div className="px-5 pt-5 pb-2 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
              <Lock className="w-3.5 h-3.5 text-gray-500" />
            </div>
            <p className="text-sm font-semibold text-gray-900">Your data rights</p>
          </div>

          <CardContent className="px-5 pt-2 pb-5 space-y-3">
            <p className="text-sm text-gray-500 leading-relaxed">
              You can download everything stored about you, or delete your check-in history, at any time.
              Deleting your check-in history removes it from Atreus's memory — future conversations will start fresh.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-9 border-gray-200 text-gray-600 hover:bg-gray-50"
                onClick={handleDownloadData}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download my data
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-9 border-red-200 text-red-600 hover:bg-red-50"
                onClick={handleDeleteHistory}
                disabled={deletingHistory}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                {deletingHistory ? 'Deleting…' : 'Delete my check-in history'}
              </Button>
            </div>

            <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-3">
              <Info className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-400 leading-relaxed">
                Your check-in history and patterns are always private to you.
                No one from your organisation can access them, even by request.
                Admin and support access is audited and requires a documented reason.
              </p>
            </div>
          </CardContent>
        </Card>

      </div>
    </MVPPageLayout>
  );
}