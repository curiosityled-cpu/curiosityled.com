/**
 * CalendarConsentCard — in-platform calendar connection UI.
 *
 * Supports both Microsoft 365 (Outlook) and Google Calendar.
 * Shows what is read, what is never read, and the privacy boundary.
 * Respects the approved consent copy.
 */
import React, { useState } from "react";
import { Calendar, CheckCircle2, Lock, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const WHAT_IS_READ = [
  "Meeting titles and subject lines",
  "Start and end times",
  "Number of attendees (not who they are)",
  "Whether a meeting is recurring",
  "Whether a meeting was accepted, tentative, or cancelled",
];

const WHAT_IS_NEVER_READ = [
  "Meeting notes or agenda content",
  "Email messages of any kind",
  "Who specifically is in your meetings",
  "Any content outside your calendar",
  "Attachments or linked files",
];

const PROVIDERS = [
  {
    id: 'microsoft',
    label: 'Microsoft 365',
    description: 'Outlook Calendar via Microsoft Graph',
    icon: '🏢',
  },
  {
    id: 'google',
    label: 'Google Workspace',
    description: 'Google Calendar',
    icon: '📅',
  },
];

export default function CalendarConsentCard({ tonePrefs, onConsent, onDisconnect, loading }) {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const isConnected = tonePrefs?.calendar_connected && tonePrefs?.calendar_consent_given;

  const handleConnect = (providerId) => {
    setSelectedProvider(providerId);
    setConfirming(true);
  };

  const handleConfirm = () => {
    onConsent?.(selectedProvider);
    setConfirming(false);
    setSelectedProvider(null);
  };

  const handleCancel = () => {
    setConfirming(false);
    setSelectedProvider(null);
  };

  if (isConnected) {
    return (
      <Card className="shadow-sm border border-emerald-100 bg-emerald-50/40 rounded-2xl">
        <CardContent className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Calendar connected</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Atreus can see your meeting load to check in at the right moments.
                </p>
              </div>
            </div>
            <button
              onClick={onDisconnect}
              disabled={loading}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Disconnect
            </button>
          </div>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-3 transition-colors"
          >
            {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            What does Atreus see?
          </button>

          {showDetails && (
            <div className="mt-3 space-y-2 pt-3 border-t border-emerald-100">
              <p className="text-xs font-semibold text-gray-600">What Atreus reads:</p>
              <ul className="space-y-1">
                {WHAT_IS_READ.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-gray-500">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-xs font-semibold text-gray-600 pt-1">Never read:</p>
              <ul className="space-y-1">
                {WHAT_IS_NEVER_READ.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-gray-400">
                    <Lock className="w-3 h-3 text-gray-300 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex items-start gap-2 bg-white/60 rounded-lg p-2.5 mt-2">
                <AlertCircle className="w-3 h-3 text-[#0202ff] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-500">
                  Your calendar data is <strong>never visible to HR or your manager</strong>. It is only used by Atreus to understand your load patterns and check in at the right moments.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Confirmation step
  if (confirming && selectedProvider) {
    const provider = PROVIDERS.find(p => p.id === selectedProvider);
    return (
      <Card className="shadow-sm border border-[#0202ff]/15 bg-white rounded-2xl">
        <CardContent className="px-5 py-5 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{provider.icon}</span>
            <div>
              <p className="text-sm font-semibold text-gray-900">Connect {provider.label}?</p>
              <p className="text-xs text-gray-500">{provider.description}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-600">Atreus will read:</p>
            <ul className="space-y-1">
              {WHAT_IS_READ.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-gray-500">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            <p className="text-xs font-semibold text-gray-600 pt-1">Atreus will never read:</p>
            <ul className="space-y-1">
              {WHAT_IS_NEVER_READ.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-gray-400">
                  <Lock className="w-3 h-3 text-gray-300 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[#0202ff]/5 border border-[#0202ff]/10 rounded-xl p-3">
            <p className="text-xs text-gray-600 leading-relaxed">
              <strong>Your calendar is private.</strong> This data is only used by Atreus to understand
              your meeting load and check in when your day looks particularly heavy. Your manager and
              HR cannot see your calendar data, ever.
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="flex-1 h-9 text-xs"
              style={{ backgroundColor: '#0202ff' }}
              onClick={handleConfirm}
              disabled={loading}
            >
              Connect my calendar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-9 text-xs"
              onClick={handleCancel}
            >
              Not right now
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default: provider selection
  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl">
      <CardContent className="px-5 py-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Connect your calendar</p>
            <p className="text-xs text-gray-400">So Atreus can check in when your day gets heavy.</p>
          </div>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed">
          When your calendar is connected, Atreus can see how full your days look and time
          check-ins more thoughtfully — for example, checking in after a packed day rather than
          interrupting a light one. Your calendar data is never shared with HR or your manager.
        </p>

        <div className="space-y-2">
          {PROVIDERS.map(provider => (
            <button
              key={provider.id}
              onClick={() => handleConnect(provider.id)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 hover:border-[#0202ff]/30 hover:bg-blue-50/40 transition-all text-left"
            >
              <span className="text-xl">{provider.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{provider.label}</p>
                <p className="text-xs text-gray-400">{provider.description}</p>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          What exactly will Atreus read?
        </button>

        {showDetails && (
          <div className="space-y-2 pt-1 border-t border-gray-50">
            <ul className="space-y-1">
              {WHAT_IS_READ.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-gray-500">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-400 font-medium mt-2">Never:</p>
            <ul className="space-y-1">
              {WHAT_IS_NEVER_READ.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-gray-400">
                  <Lock className="w-3 h-3 text-gray-300 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}