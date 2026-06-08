/**
 * OrgVisibilityPanel — "What does my organisation see?"
 * Renders the approved privacy transparency panel for the web app.
 * Shows exactly what is/isn't visible to HR, with data control actions.
 */
import React, { useState } from "react";
import { Shield, Eye, EyeOff, Download, Trash2, ChevronDown, ChevronUp, Lock, Users, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const PRIVATE_TO_YOU = [
  "How you described your energy level",
  "Your confidence responses",
  "Your overload and avoidance reflections",
  "Your morning intentions and evening comparisons",
  "Your delegation commitments",
  "Atreus's pattern narrative about your recent weeks",
  "Any free-text notes you've added",
  "Your motivation and room-today responses",
  "Trend summaries and longitudinal pattern data",
];

const VISIBLE_TO_ORG = [
  { label: "Aggregate meeting load signals", note: "Group average, ≥5 managers minimum" },
  { label: "Overall learning engagement patterns", note: "No individual attribution" },
  { label: "Goal completion rates", note: "Group level only, ≥5 managers minimum" },
];

const NEVER_READ = [
  "Meeting content, agendas, or notes",
  "Email content or attachments",
  "Attendee identities from calendar",
  "Any individual's name tied to an overload or risk signal",
  "Your check-in responses in any HR report",
];

export default function OrgVisibilityPanel({ userEmail }) {
  const [showPrivate, setShowPrivate] = useState(false);
  const [showOrgVisible, setShowOrgVisible] = useState(false);
  const [showNeverRead, setShowNeverRead] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDownload = async () => {
    setDownloadLoading(true);
    try {
      // Fetch all manager-private records for this user
      const [pulses, trends, tonePrefs] = await Promise.all([
        base44.entities.ManagerPulse.filter({ user_email: userEmail }, '-created_date', 200),
        base44.entities.ManagerTrends.filter({ user_email: userEmail }, '-last_trend_computed_at', 1),
        base44.entities.TonePreference.filter({ user_email: userEmail }, '-created_date', 1),
      ]);

      const data = {
        exported_at: new Date().toISOString(),
        user_email: userEmail,
        check_ins: pulses.map(p => ({
          date: p.created_date,
          energy_level: p.energy_level,
          confidence_today: p.confidence_today,
          perceived_load: p.perceived_load,
          room_today: p.room_today,
          motivation_today: p.motivation_today,
          prompt_type: p.prompt_type,
          focus_category: p.focus_category,
          biggest_weight_today: p.biggest_weight_today,
          operator_mode_response: p.operator_mode_response,
        })),
        trend_summary: trends[0] ? {
          energy_trend: trends[0].energy_trend,
          confidence_trend: trends[0].confidence_trend,
          summary_7d: trends[0].summary_7d,
          summary_28d: trends[0].summary_28d,
          trend_narrative: trends[0].trend_narrative,
          last_computed: trends[0].last_trend_computed_at,
        } : null,
        tone_preference: tonePrefs[0] ? {
          tone_mode: tonePrefs[0].tone_mode,
          cadence_preference: tonePrefs[0].cadence_preference,
        } : null,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `curiosity-led-my-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
      toast.success('Your data has been downloaded.');
    } catch (e) {
      toast.error('Could not download data. Please try again.');
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleDeleteCheckins = async () => {
    setDeleteLoading(true);
    try {
      const pulses = await base44.entities.ManagerPulse.filter({ user_email: userEmail }, '-created_date', 200);
      await Promise.all(pulses.map(p => base44.entities.ManagerPulse.delete(p.id)));
      const trends = await base44.entities.ManagerTrends.filter({ user_email: userEmail }, '-last_trend_computed_at', 5);
      await Promise.all(trends.map(t => base44.entities.ManagerTrends.delete(t.id)));
      toast.success('Your check-in history has been deleted.');
      setShowDeleteConfirm(false);
    } catch (e) {
      toast.error('Could not delete check-in history. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Private to you */}
      <Card className="border border-gray-100 rounded-2xl">
        <CardContent className="pt-5 pb-3 px-5">
          <button
            className="w-full flex items-center justify-between"
            onClick={() => setShowPrivate(v => !v)}
          >
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600" />
              <p className="text-sm font-semibold text-gray-900">Private to you — never shared</p>
            </div>
            {showPrivate ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {showPrivate && (
            <ul className="space-y-2 mt-4">
              {PRIVATE_TO_YOU.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <EyeOff className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">{item}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* What org can see */}
      <Card className="border border-gray-100 rounded-2xl">
        <CardContent className="pt-5 pb-3 px-5">
          <button
            className="w-full flex items-center justify-between"
            onClick={() => setShowOrgVisible(v => !v)}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <p className="text-sm font-semibold text-gray-900">What your organisation can see</p>
            </div>
            {showOrgVisible ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {showOrgVisible && (
            <>
              <p className="text-xs text-gray-400 mt-3 mb-3 ml-6">Only aggregate patterns, never individual attribution. Minimum group size: 5 managers.</p>
              <ul className="space-y-3">
                {VISIBLE_TO_ORG.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Eye className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-sm text-gray-700">{item.label}</span>
                      <Badge variant="outline" className="ml-2 text-[10px] text-gray-400 border-gray-200 px-1.5 py-0">{item.note}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      {/* What is never read */}
      <Card className="border border-gray-100 rounded-2xl">
        <CardContent className="pt-5 pb-3 px-5">
          <button
            className="w-full flex items-center justify-between"
            onClick={() => setShowNeverRead(v => !v)}
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-gray-400" />
              <p className="text-sm font-semibold text-gray-900">What is never read or stored</p>
            </div>
            {showNeverRead ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {showNeverRead && (
            <ul className="space-y-2 mt-4">
              {NEVER_READ.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <EyeOff className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">{item}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>


    </div>
  );
}