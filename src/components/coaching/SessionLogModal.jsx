import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const SESSION_TYPES = [
  { value: '1on1_coaching', label: '1:1 Coaching' },
  { value: 'team_effectiveness', label: 'Team Effectiveness' },
  { value: 'leadership_development', label: 'Leadership Development' },
  { value: 'career_coaching', label: 'Career Coaching' },
  { value: 'performance_coaching', label: 'Performance Coaching' },
  { value: 'onboarding_coaching', label: 'Onboarding Coaching' },
];

/**
 * Reusable session log modal. Creates a CoachingSession and, if no engagement_id
 * is provided, auto-creates a lightweight ad_hoc engagement first.
 *
 * Props:
 *  open, onClose, onSaved(engagementId)
 *  engagementId (optional pre-fill), coachEmail, coacheeEmail (optional)
 *  experienceId (optional — stamps session_id back onto this experience)
 *  experienceTitle (optional — pre-fills session title)
 */
export default function SessionLogModal({ open, onClose, onSaved, engagementId, coachEmail, coacheeEmail, experienceId, experienceTitle }) {
  const [form, setForm] = useState({
    title: '',
    session_type: '1on1_coaching',
    scheduled_date: '',
    duration_minutes: 60,
    location_type: 'virtual',
    location: '',
    session_notes: '',
    progress_rating: '',
    engagement_rating: '',
    coachee_satisfaction: '',
    action_items: [],
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    if (open) {
      const now = new Date();
      const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setForm(f => ({
        ...f,
        title: experienceTitle || f.title || '',
        scheduled_date: localISO,
      }));
    }
  }, [open, experienceTitle]);

  const addActionItem = () => {
    setForm(f => ({
      ...f,
      action_items: [...f.action_items, {
        id: crypto.randomUUID(),
        description: '',
        assigned_to: coacheeEmail || '',
        due_date: '',
        status: 'pending',
      }],
    }));
  };

  const updateActionItem = (id, field, value) => {
    setForm(f => ({
      ...f,
      action_items: f.action_items.map(a => a.id === id ? { ...a, [field]: value } : a),
    }));
  };

  const removeActionItem = (id) => {
    setForm(f => ({ ...f, action_items: f.action_items.filter(a => a.id !== id) }));
  };

  const handleSave = async () => {
    if (!form.scheduled_date) { toast.error('Please select a session date.'); return; }
    setSaving(true);
    setSaveError(null);
    try {
      const me = await base44.auth.me();
      const coach = coachEmail || me?.email;
      const clientId = me?.client_id || me?.data?.client_id || null;
      let engId = engagementId;

      // No engagement → create a lightweight ad-hoc engagement
      if (!engId) {
        const eng = await base44.entities.CoachingEngagement.create({
          coach_email: coach,
          coachee_email: coacheeEmail || '',
          title: form.title || 'Ad-hoc session',
          engagement_type: 'ad_hoc',
          status: 'active',
          total_sessions_planned: 1,
          start_date: form.scheduled_date.slice(0, 10),
          client_id: clientId,
        });
        engId = eng.id;
      }

      const sessionData = {
        coach_email: coach,
        coachee_email: coacheeEmail || '',
        engagement_id: engId,
        title: form.title || 'Coaching session',
        session_type: form.session_type,
        status: 'completed',
        scheduled_date: form.scheduled_date,
        actual_start_time: form.scheduled_date,
        duration_minutes: Number(form.duration_minutes) || 60,
        location: form.location,
        location_type: form.location_type,
        session_notes: form.session_notes,
        progress_rating: form.progress_rating ? Number(form.progress_rating) : undefined,
        engagement_rating: form.engagement_rating ? Number(form.engagement_rating) : undefined,
        coachee_satisfaction: form.coachee_satisfaction ? Number(form.coachee_satisfaction) : undefined,
        action_items: form.action_items.filter(a => a.description),
        client_id: clientId,
      };
      const session = await base44.entities.CoachingSession.create(sessionData);

      // Stamp session_id back onto the parent experience
      if (experienceId) {
        await base44.entities.DevelopmentExperience.update(experienceId, { session_id: session.id });
      }

      toast.success('Session logged!');
      onSaved?.(engId);
    } catch (err) {
      console.error('SessionLogModal save error:', err);
      setSaveError(err?.response?.data?.message || err?.message || 'Failed to save session.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Coaching Session</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Engagement badge */}
          {engagementId ? (
            <div className="text-xs px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 text-blue-700">
              Linked to engagement · session will be tracked under this engagement.
            </div>
          ) : (
            <div className="text-xs px-3 py-2 rounded-lg bg-amber-50 border border-amber-100 text-amber-700">
              No engagement selected — a lightweight ad-hoc engagement will be created automatically.
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Session Title</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Session 3 — Delegation practice"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select
                value={form.session_type}
                onChange={e => setForm(f => ({ ...f, session_type: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {SESSION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date & Time</label>
              <input
                type="datetime-local"
                value={form.scheduled_date}
                onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Duration (min)</label>
              <input
                type="number"
                min="15"
                step="15"
                value={form.duration_minutes}
                onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
              <select
                value={form.location_type}
                onChange={e => setForm(f => ({ ...f, location_type: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="virtual">Virtual</option>
                <option value="in_person">In person</option>
                <option value="phone">Phone</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Session Notes</label>
            <textarea
              value={form.session_notes}
              onChange={e => setForm(f => ({ ...f, session_notes: e.target.value }))}
              placeholder="Key topics, insights, and observations..."
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
          </div>

          {/* Ratings */}
          <div className="grid grid-cols-3 gap-3">
            {[
              ['progress_rating', 'Progress'],
              ['engagement_rating', 'Engagement'],
              ['coachee_satisfaction', 'Satisfaction'],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label} (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder="—"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            ))}
          </div>

          {/* Action items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">Action Items</label>
              <button
                type="button"
                onClick={addActionItem}
                className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {form.action_items.map(item => (
                <div key={item.id} className="flex gap-2 items-start">
                  <input
                    type="text"
                    placeholder="Action item..."
                    value={item.description}
                    onChange={e => updateActionItem(item.id, 'description', e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  <input
                    type="date"
                    value={item.due_date}
                    onChange={e => updateActionItem(item.id, 'due_date', e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  <button
                    type="button"
                    onClick={() => removeActionItem(item.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors pt-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {saveError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {saveError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={handleSave}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Log Session
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}