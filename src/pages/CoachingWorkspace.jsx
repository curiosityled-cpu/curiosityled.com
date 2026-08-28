import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, ClipboardList, TrendingUp } from 'lucide-react';
import MyCoacheesView from '@/components/coaching/MyCoacheesView';
import SessionPrepView from '@/components/coaching/SessionPrepView';
import EngagementOutcomesView from '@/components/coaching/EngagementOutcomesView';

const TABS = [
  { key: 'coachees', label: 'My Coachees', icon: Users },
  { key: 'prep', label: 'Session Prep', icon: ClipboardList },
  { key: 'outcomes', label: 'Engagement Outcomes', icon: TrendingUp },
];

export default function CoachingWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'coachees';
  const selectedEngagement = searchParams.get('engagement') || '';

  const setTab = (newTab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', newTab);
    setSearchParams(next);
  };

  const selectEngagement = (id, targetTab = 'prep') => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', targetTab);
    next.set('engagement', id);
    setSearchParams(next);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Coaching Workspace</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your coachees, prepare for sessions, and track engagement outcomes.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                active
                  ? 'border-[#0202ff] text-[#0202ff]'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === 'coachees' && <MyCoacheesView onSelect={selectEngagement} />}
      {tab === 'prep' && <SessionPrepView engagementId={selectedEngagement} onSelect={selectEngagement} />}
      {tab === 'outcomes' && <EngagementOutcomesView />}
    </div>
  );
}