/**
 * ManagerProfileCard — You › Profile: role, context, team situation, tenure,
 * current leadership environment. Editable in-line, saves to user preferences.
 */
import React, { useState, useEffect } from "react";
import { Edit2, Check, X, Users, Briefcase, Clock, MapPin, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const LEADERSHIP_ENVS = [
  "Stable and growing",
  "Rapid growth / scaling",
  "Restructuring or change",
  "High pressure / delivery",
  "Early team building",
  "Matrix / complex org",
];

const TEAM_SITUATIONS = [
  "Team is performing well",
  "Team is under pressure",
  "Building a new team",
  "Managing performance gaps",
  "Team in transition",
  "Distributed / remote team",
];

function FieldRow({ icon: Icon, label, value, editing, field, onChange, options, placeholder }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
        {editing ? (
          options ? (
            <select
              value={value || ''}
              onChange={e => onChange(field, e.target.value)}
              className="w-full text-sm text-gray-800 bg-white border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0202ff]/20"
            >
              <option value="">Select…</option>
              {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input
              type="text"
              value={value || ''}
              onChange={e => onChange(field, e.target.value)}
              placeholder={placeholder}
              className="w-full text-sm text-gray-800 bg-white border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0202ff]/20"
            />
          )
        ) : (
          <p className="text-sm text-gray-700">{value || <span className="text-gray-400 italic">Not set</span>}</p>
        )}
      </div>
    </div>
  );
}

export default function ManagerProfileCard() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    current_role: '',
    team_size: '',
    tenure_in_role: '',
    leadership_environment: '',
    team_situation: '',
    leadership_context_note: '',
  });

  useEffect(() => {
    if (!user) return;
    // Load from user data fields
    setProfile({
      current_role: user?.data?.current_role || user?.current_role || '',
      team_size: user?.data?.team_size || '',
      tenure_in_role: user?.data?.tenure_in_role || '',
      leadership_environment: user?.data?.leadership_environment || '',
      team_situation: user?.data?.team_situation || '',
      leadership_context_note: user?.data?.leadership_context_note || '',
    });
  }, [user]);

  const handleChange = (field, value) => {
    setProfile(p => ({ ...p, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ data: { ...user?.data, ...profile } });
    } catch {}
    setSaving(false);
    setEditing(false);
  };

  const handleCancel = () => {
    setProfile({
      current_role: user?.data?.current_role || user?.current_role || '',
      team_size: user?.data?.team_size || '',
      tenure_in_role: user?.data?.tenure_in_role || '',
      leadership_environment: user?.data?.leadership_environment || '',
      team_situation: user?.data?.team_situation || '',
      leadership_context_note: user?.data?.leadership_context_note || '',
    });
    setEditing(false);
  };

  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">Leadership context</p>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            <Edit2 className="w-3 h-3" /> Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={handleCancel} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
              <X className="w-3 h-3" /> Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 text-xs text-[#0202ff] hover:opacity-80 font-medium">
              <Check className="w-3 h-3" /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>
      <CardContent className="px-5 pt-1 pb-4">
        <FieldRow icon={Briefcase} label="Current role" value={profile.current_role} editing={editing} field="current_role" onChange={handleChange} placeholder="e.g. Engineering Manager" />
        <FieldRow icon={Users} label="Team size" value={profile.team_size} editing={editing} field="team_size" onChange={handleChange} placeholder="e.g. 6 direct reports" />
        <FieldRow icon={Clock} label="Tenure in role" value={profile.tenure_in_role} editing={editing} field="tenure_in_role" onChange={handleChange} placeholder="e.g. 8 months" />
        <FieldRow icon={MapPin} label="Leadership environment" value={profile.leadership_environment} editing={editing} field="leadership_environment" onChange={handleChange} options={LEADERSHIP_ENVS} />
        <FieldRow icon={Layers} label="Team situation" value={profile.team_situation} editing={editing} field="team_situation" onChange={handleChange} options={TEAM_SITUATIONS} />
        <FieldRow icon={Edit2} label="Context note" value={profile.leadership_context_note} editing={editing} field="leadership_context_note" onChange={handleChange} placeholder="Anything else Atreus should know about your current context…" />
        {!editing && (
          <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">This context helps Atreus personalise your check-ins, patterns, and practice recommendations. It's private to you.</p>
        )}
      </CardContent>
    </Card>
  );
}