/**
 * ManagerYou — Personal baseline and control layer.
 * Route: /you
 * Profile, assessments, preferences, privacy, connected tools.
 */
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import {
  User, Shield, Settings, Brain, TrendingUp, Bell,
  ChevronRight, LogOut, Calendar, Sliders, Eye, Archive
} from "lucide-react";
import ResultsArchive from "@/components/you/ResultsArchive";
import ManagerProfileCard from "@/components/you/ManagerProfileCard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function getFirstName(user) {
  const raw = user?.display_name || user?.data?.display_name || user?.full_name;
  return raw && raw.trim() && !raw.includes('@') ? raw.split(' ')[0] : 'there';
}

function YouRow({ icon: Icon, iconBg, iconColor, title, subtitle, to, onClick, badge }) {
  const inner = (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer group">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900">{title}</p>
          {badge && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{badge}</Badge>}
        </div>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
    </div>
  );
  if (to) return <Link to={to}>{inner}</Link>;
  return <div onClick={onClick}>{inner}</div>;
}

function SectionCard({ children }) {
  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden divide-y divide-gray-50">
      {children}
    </Card>
  );
}

function SectionLabel({ children }) {
  return <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-1 pt-4 pb-1">{children}</p>;
}

export default function ManagerYou() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showArchive, setShowArchive] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');
  const firstName = getFirstName(user);
  const displayName = user?.display_name || user?.data?.display_name || user?.full_name || user?.email;
  const appRole = user?.app_role || user?.data?.app_role;

  const { data: latestAssessment } = useQuery({
    queryKey: ['you-assessment', user?.email],
    queryFn: async () => {
      try {
        const rows = await base44.entities.Assessment.filter({ email: user.email }, '-created_date', 1);
        return rows[0] || null;
      } catch { return null; }
    },
    enabled: !!user?.email, staleTime: 10 * 60 * 1000,
  });

  const { data: customSubmissions = [] } = useQuery({
    queryKey: ['you-custom-assessments', user?.email],
    queryFn: async () => {
      try { return await base44.entities.AssessmentSubmission.filter({ user_email: user.email }, '-created_date', 5); } catch { return []; }
    },
    enabled: !!user?.email, staleTime: 10 * 60 * 1000,
  });

  const { data: tonePref } = useQuery({
    queryKey: ['ml-tone', user?.email],
    queryFn: async () => {
      try {
        const rows = await base44.entities.TonePreference.filter({ user_email: user.email }, null, 1);
        return rows[0] || null;
      } catch { return null; }
    },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  const assessmentDate = latestAssessment?.created_date
    ? new Date(latestAssessment.created_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;

  const toneModeLabel = {
    gentle_observant: 'Gentle & observant',
    warm_candid: 'Warm & candid',
    close_friend_candid: 'Close friend, candid',
    respectfully_confronting: 'Respectfully direct',
  }[tonePref?.tone_mode] || 'Not set';

  const YOU_SECTIONS = [
    { id: 'profile', label: 'Profile' },
    { id: 'assessments', label: 'Assessments' },
    { id: 'preferences', label: 'Preferences' },
    { id: 'privacy', label: 'Privacy & Data' },
    { id: 'tools', label: 'Connected Tools' },
    { id: 'account', label: 'Account' },
  ];

  // Desktop two-pane wrapper
  const DesktopNav = () => (
    <div className="hidden md:flex flex-col gap-0.5 w-48 flex-shrink-0">
      {YOU_SECTIONS.map(s => (
        <button
          key={s.id}
          onClick={() => setActiveSection(s.id)}
          className={`text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeSection === s.id
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );

  return (
    <>
    {/* Mobile: single column */}
    <div className="md:hidden max-w-2xl mx-auto px-4 py-6 space-y-2">
      {/* Profile hero */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-[#0202ff]/10 flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-bold text-[#0202ff]">
            {displayName?.[0]?.toUpperCase() || '?'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-gray-900 truncate">{displayName}</p>
          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          <Badge variant="outline" className="text-[10px] mt-1.5">{appRole || 'Manager'}</Badge>
        </div>
      </div>

      {/* Leadership context profile */}
      <SectionLabel>Profile</SectionLabel>
      <ManagerProfileCard />

      {/* Assessments */}
      <SectionLabel>Assessments</SectionLabel>
      <SectionCard>
        <YouRow
          icon={TrendingUp}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          title="Leadership Index"
          subtitle={assessmentDate ? `Last taken ${assessmentDate}` : 'Not yet taken'}
          badge={latestAssessment ? `${Math.round(latestAssessment.overall_pct || 0)}%` : undefined}
          to="/LeadershipAssessment"
        />
        {latestAssessment && (
          <YouRow
            icon={Eye}
            iconBg="bg-indigo-50"
            iconColor="text-indigo-600"
            title="View my results"
            subtitle={latestAssessment.archetype_label ? `Archetype: ${latestAssessment.archetype_label}` : 'See full report'}
            to="/AssessmentResults"
          />
        )}
        <div
          onClick={() => setShowArchive(a => !a)}
          className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
            <Archive className="w-4 h-4 text-slate-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">Results archive</p>
            <p className="text-xs text-gray-500 mt-0.5">History, change over time, development themes</p>
          </div>
          <ChevronRight className={`w-4 h-4 text-gray-300 group-hover:text-gray-400 flex-shrink-0 transition-transform ${showArchive ? 'rotate-90' : ''}`} />
        </div>
        {showArchive && (
          <div className="px-4 pb-4 pt-2 border-t border-gray-50">
            <ResultsArchive />
          </div>
        )}
        {/* Client-selected alternative assessments */}
        {customSubmissions.length > 0 && customSubmissions.map(sub => (
          <YouRow
            key={sub.id}
            icon={TrendingUp}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            title={sub.custom_assessment_id ? `Assessment — ${sub.leadership_level || 'Custom'}` : 'Custom Assessment'}
            subtitle={`Completed ${sub.submission_date ? new Date(sub.submission_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''} · ${sub.status}`}
            badge={sub.status === 'scored' ? 'Scored' : undefined}
            to="/AssessmentResults"
          />
        ))}
        <YouRow
          icon={Eye}
          iconBg="bg-gray-50"
          iconColor="text-gray-500"
          title="Take a new assessment"
          subtitle="Leadership Index or client-assigned"
          to="/LeadershipAssessment"
        />
      </SectionCard>

      {/* Preferences */}
      <SectionLabel>Preferences</SectionLabel>
      <SectionCard>
        <YouRow
          icon={Brain}
          iconBg="bg-[#0202ff]/10"
          iconColor="text-[#0202ff]"
          title="Atreus tone"
          subtitle={`Current: ${toneModeLabel}`}
          to="/Settings"
        />
        <YouRow
          icon={Bell}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          title="Notifications & cadence"
          subtitle="How and when you hear from us"
          to="/Settings"
        />
        <YouRow
          icon={Sliders}
          iconBg="bg-gray-50"
          iconColor="text-gray-600"
          title="All settings"
          subtitle="Full preference configuration"
          to="/Settings"
        />
      </SectionCard>

      {/* Privacy */}
      <SectionLabel>Privacy & data</SectionLabel>
      <SectionCard>
        <YouRow
          icon={Shield}
          iconBg="bg-green-50"
          iconColor="text-green-600"
          title="Privacy & sharing"
          subtitle="What's private, what can be shared"
          to="/PrivacySettings"
        />
      </SectionCard>

      {/* Connected tools */}
      <SectionLabel>Connected tools</SectionLabel>
      <SectionCard>
        <YouRow
          icon={Calendar}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          title="Calendar"
          subtitle="Context-aware prompts and meeting insights"
          to="/teams-settings"
        />
        <YouRow
          icon={Settings}
          iconBg="bg-gray-50"
          iconColor="text-gray-500"
          title="Teams & integrations"
          subtitle="Manage connected apps and channels"
          to="/teams-settings"
        />
      </SectionCard>

      {/* Account */}
      <SectionLabel>Account</SectionLabel>
      <SectionCard>
        <YouRow icon={User} iconBg="bg-gray-50" iconColor="text-gray-600" title="My profile" subtitle="Name, role, and personal context" to="/Profile" />
        <YouRow icon={Bell} iconBg="bg-gray-50" iconColor="text-gray-500" title="Notifications" subtitle="Inbox and notification history" to="/Notifications" />
        <div onClick={() => base44.auth.logout()} className="flex items-center gap-4 px-5 py-4 hover:bg-red-50 transition-colors cursor-pointer group">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <LogOut className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-sm font-medium text-red-600 flex-1">Log out</p>
        </div>
      </SectionCard>
    </div>

    {/* Desktop: two-pane layout */}
    <div className="hidden md:flex max-w-4xl mx-auto px-6 py-8 gap-6">
      <DesktopNav />
      <div className="flex-1 min-w-0 space-y-2">
        {/* Profile hero always shown */}
        <div className="rounded-2xl overflow-hidden mb-4 bg-card border border-border">
          <div className="px-5 py-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-primary">
                {displayName?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold truncate text-card-foreground">{displayName}</p>
              <p className="text-xs truncate text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </div>

        {activeSection === 'profile' && <><SectionLabel>Leadership context</SectionLabel><ManagerProfileCard /></>}
        {activeSection === 'assessments' && (
          <SectionCard>
            <YouRow icon={TrendingUp} iconBg="bg-purple-50" iconColor="text-purple-600" title="Leadership Index" subtitle={assessmentDate ? `Last taken ${assessmentDate}` : 'Not yet taken'} badge={latestAssessment ? `${Math.round(latestAssessment.overall_pct || 0)}%` : undefined} to="/LeadershipAssessment" />
            {latestAssessment && <YouRow icon={Eye} iconBg="bg-indigo-50" iconColor="text-indigo-600" title="View my results" subtitle={latestAssessment.archetype_label ? `Archetype: ${latestAssessment.archetype_label}` : 'See full report'} to="/AssessmentResults" />}
            <div onClick={() => setShowArchive(a => !a)} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer group">
              <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0"><Archive className="w-4 h-4 text-slate-500" /></div>
              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900">Results archive</p><p className="text-xs text-gray-500 mt-0.5">History, change over time, development themes</p></div>
              <ChevronRight className={`w-4 h-4 text-gray-300 group-hover:text-gray-400 flex-shrink-0 transition-transform ${showArchive ? 'rotate-90' : ''}`} />
            </div>
            {showArchive && <div className="px-4 pb-4 pt-2 border-t border-gray-50"><ResultsArchive /></div>}
            <YouRow icon={Eye} iconBg="bg-gray-50" iconColor="text-gray-500" title="Take a new assessment" subtitle="Leadership Index or client-assigned" to="/LeadershipAssessment" />
          </SectionCard>
        )}
        {activeSection === 'preferences' && (
          <SectionCard>
            <YouRow icon={Brain} iconBg="bg-[#0202ff]/10" iconColor="text-[#0202ff]" title="Atreus tone" subtitle={`Current: ${toneModeLabel}`} to="/Settings" />
            <YouRow icon={Bell} iconBg="bg-amber-50" iconColor="text-amber-600" title="Notifications & cadence" subtitle="How and when you hear from us" to="/Settings" />
            <YouRow icon={Sliders} iconBg="bg-gray-50" iconColor="text-gray-600" title="All settings" subtitle="Full preference configuration" to="/Settings" />
          </SectionCard>
        )}
        {activeSection === 'privacy' && (
          <SectionCard>
            <YouRow icon={Shield} iconBg="bg-green-50" iconColor="text-green-600" title="Privacy & sharing" subtitle="What's private, what can be shared" to="/PrivacySettings" />
          </SectionCard>
        )}
        {activeSection === 'tools' && (
          <SectionCard>
            <YouRow icon={Calendar} iconBg="bg-blue-50" iconColor="text-blue-600" title="Calendar" subtitle="Context-aware prompts and meeting insights" to="/teams-settings" />
            <YouRow icon={Settings} iconBg="bg-gray-50" iconColor="text-gray-500" title="Teams & integrations" subtitle="Manage connected apps and channels" to="/teams-settings" />
          </SectionCard>
        )}
        {activeSection === 'account' && (
          <SectionCard>
            <YouRow icon={User} iconBg="bg-gray-50" iconColor="text-gray-600" title="My profile" subtitle="Name, role, and personal context" to="/Profile" />
            <YouRow icon={Bell} iconBg="bg-gray-50" iconColor="text-gray-500" title="Notifications" to="/Notifications" />
            <div onClick={() => base44.auth.logout()} className="flex items-center gap-4 px-5 py-4 hover:bg-red-50 transition-colors cursor-pointer">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0"><LogOut className="w-4 h-4 text-red-500" /></div>
              <p className="text-sm font-medium text-red-600 flex-1">Log out</p>
            </div>
          </SectionCard>
        )}
      </div>
    </div>
    </>
  );
}