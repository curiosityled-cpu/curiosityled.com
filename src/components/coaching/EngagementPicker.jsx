import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

const ENGAGEMENT_TYPES = [
  { value: '1on1_coaching', label: '1:1 Coaching' },
  { value: 'team_effectiveness', label: 'Team Effectiveness' },
  { value: 'leadership_development', label: 'Leadership Development' },
  { value: 'career_coaching', label: 'Career Coaching' },
  { value: 'performance_improvement', label: 'Performance Improvement' },
  { value: 'executive_coaching', label: 'Executive Coaching' },
];

/**
 * Lightweight engagement picker: select an existing engagement or create one inline.
 * Props: value (engagement_id), onChange(id, engagement), coachEmail, coacheeEmail, clientId
 */
export default function EngagementPicker({ value, onChange, coachEmail, coacheeEmail, clientId }) {
  const [engagements, setEngagements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newEng, setNewEng] = useState({ title: '', engagement_type: '1on1_coaching', total_sessions_planned: 6 });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (coachEmail) loadEngagements();
  }, [coachEmail]);

  const loadEngagements = async () => {
    setLoading(true);
    try {
      const eng = await base44.entities.CoachingEngagement.filter({ coach_email: coachEmail }, '-created_date');
      setEngagements(eng);
    } catch (e) {
      console.error('EngagementPicker load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const selected = engagements.find(e => e.id === value);

  const handleCreate = async () => {
    if (!newEng.title) { toast.error('Enter an engagement title.'); return; }
    setCreating(true);
    try {
      const eng = await base44.entities.CoachingEngagement.create({
        coach_email: coachEmail,
        coachee_email: coacheeEmail || '',
        title: newEng.title,
        engagement_type: newEng.engagement_type,
        status: 'active',
        total_sessions_planned: Number(newEng.total_sessions_planned) || 6,
        client_id: clientId,
      });
      setEngagements(prev => [eng, ...prev]);
      onChange(eng.id, eng);
      setShowCreate(false);
      setNewEng({ title: '', engagement_type: '1on1_coaching', total_sessions_planned: 6 });
      toast.success('Engagement created');
    } catch (e) {
      console.error('Create engagement error:', e);
      toast.error('Failed to create engagement');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading engagements...
      </div>
    );
  }

  if (showCreate) {
    return (
      <div className="space-y-2 p-3 rounded-lg border border-indigo-200 bg-indigo-50/50">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-indigo-700">New engagement</span>
          <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <input
          type="text"
          placeholder="Engagement title (e.g. Q4 Leadership Coaching)"
          value={newEng.title}
          onChange={e => setNewEng(f => ({ ...f, title: e.target.value }))}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={newEng.engagement_type}
            onChange={e => setNewEng(f => ({ ...f, engagement_type: e.target.value }))}
            className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            {ENGAGEMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input
            type="number"
            min="1"
            placeholder="Sessions planned"
            value={newEng.total_sessions_planned}
            onChange={e => setNewEng(f => ({ ...f, total_sessions_planned: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg py-2 transition-colors disabled:opacity-50"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create & select'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <select
        value={value || ''}
        onChange={e => {
          const id = e.target.value;
          const eng = engagements.find(x => x.id === id);
          onChange(id || '', eng);
        }}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
      >
        <option value="">— Select engagement —</option>
        {engagements.map(eng => (
          <option key={eng.id} value={eng.id}>
            {eng.title}{eng.coachee_email ? ` · ${eng.coachee_email}` : ''}
          </option>
        ))}
      </select>
      {selected && (
        <p className="text-xs text-gray-500">
          {selected.coachee_email || `${(selected.team_member_emails || []).length} team members`} · {selected.engagement_type}
        </p>
      )}
      <button
        type="button"
        onClick={() => setShowCreate(true)}
        className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Create new engagement
      </button>
    </div>
  );
}