import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const toneDescriptions = {
  gentle_observant: 'Observant and kind. Celebrates progress, gently points out patterns.',
  warm_candid: 'Direct but warm. Honest feedback with genuine care.',
  close_friend_candid: 'Like a close friend. No filter, but trust underneath.',
  respectfully_confronting: 'Respectful but firm. Calls out the real issue directly.',
};

export default function AtreusTeamsSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [tonePref, setTonePref] = useState(null);

  const [toneMode, setToneMode] = useState('warm_candid');
  const [cadencePreference, setCadencePreference] = useState('every_other_day');
  const [shareEnergyWithManager, setShareEnergyWithManager] = useState(false);
  const [shareEnergyWithHR, setShareEnergyWithHR] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        const prefs = await base44.entities.TonePreference.filter(
          { user_email: currentUser.email },
          null,
          1
        );

        if (prefs.length > 0) {
          const pref = prefs[0];
          setTonePref(pref);
          setToneMode(pref.tone_mode);
          setCadencePreference(pref.cadence_preference);
          setShareEnergyWithManager(pref.share_energy_with_manager || false);
          setShareEnergyWithHR(pref.share_energy_with_hr || false);
        } else {
          setTonePref({ user_email: currentUser.email });
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        toast.error('Could not load settings');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSave = async () => {
    if (!user || !tonePref) return;

    setSaving(true);
    try {
      const updates = {
        tone_mode: toneMode,
        cadence_preference: cadencePreference,
        share_energy_with_manager: shareEnergyWithManager,
        share_energy_with_hr: shareEnergyWithHR,
        user_understanding_ack: true,
      };

      if (tonePref.id) {
        await base44.entities.TonePreference.update(tonePref.id, updates);
      } else {
        await base44.entities.TonePreference.create({
          user_email: user.email,
          ...updates,
        });
      }

      toast.success('Settings saved');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Atreus Tone & Cadence</CardTitle>
          <CardDescription>
            Personalize how Atreus communicates with you in Teams
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tone Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">How direct should Atreus be?</Label>
            <div className="space-y-2">
              {Object.entries(toneDescriptions).map(([mode, desc]) => (
                <button
                  key={mode}
                  onClick={() => setToneMode(mode)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    toneMode === mode
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="font-medium capitalize">
                        {mode.replace(/_/g, ' ')}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">{desc}</p>
                    </div>
                    {toneMode === mode && (
                      <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Cadence Selection */}
          <div className="space-y-3 pt-4 border-t">
            <Label className="text-base font-semibold">Check-in Frequency</Label>
            <Select value={cadencePreference} onValueChange={setCadencePreference}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="every_other_day">Every other day</SelectItem>
                <SelectItem value="important_only">Important alerts only</SelectItem>
                <SelectItem value="paused">Paused (I'll reach out)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Even on paused, you'll get urgent alerts (confidence dips, extreme load)
            </p>
          </div>

          {/* Privacy & Sharing */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-base">Share Trends (not raw check-ins)</h3>
            <p className="text-sm text-gray-600 mb-4">
              Your daily check-in details are always private. Here you choose whether aggregated trends 
              (14d/28d patterns) can be seen by others.
            </p>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <div>
                <Label className="text-sm font-medium">Share with your manager</Label>
                <p className="text-xs text-gray-500 mt-1">
                  Your manager sees your energy/confidence trends (not raw notes)
                </p>
              </div>
              <Switch
                checked={shareEnergyWithManager}
                onCheckedChange={setShareEnergyWithManager}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <div>
                <Label className="text-sm font-medium">Share with HR</Label>
                <p className="text-xs text-gray-500 mt-1">
                  HR sees only minimum cohort size (10+) aggregated trends for organizational health
                </p>
              </div>
              <Switch
                checked={shareEnergyWithHR}
                onCheckedChange={setShareEnergyWithHR}
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 flex gap-3 justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold mb-1">Your Privacy Matters</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Daily check-in text is always encrypted and sealed to you</li>
                <li>Only trend summaries and scores are shared (never raw notes)</li>
                <li>HR sees only anonymized cohort trends (min 10 people)</li>
                <li>You can change these settings anytime</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}