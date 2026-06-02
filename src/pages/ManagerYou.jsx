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
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 active:bg-white/8 transition-colors cursor-pointer group">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg} opacity-80`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white/80">{title}</p>
          {badge && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-white/20 text-white/50">{badge}</Badge>}
        </div>
        {subtitle && <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>}
      </div>
      <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 flex-shrink-0" />
    </div>
  );
  if (to) return <Link to={to}>{inner}</Link>;
  return <div onClick={onClick}>{inner}</div>;
}

function SectionCard({ children }) {
  return (
    <div className="bg-[#1c1f2a] rounded-2xl border border-white/8 overflow-hidden divide-y divide-white/6">
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return <p className="text-[11px] font-semibold text-white/35 uppercase tracking-wider px-1 pt-4 pb-1">{children}</p>;
}

export default function ManagerYou() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showArchive, setShowArchive] = useState(false);
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-2 min-h-screen bg-[#13151c]">
      {/* Profile hero */}
      <div className="pt-2 pb-3">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">You</p>
        <h1 className="text-2xl font-bold text-white">Your baseline</h1>
      </div>
      <div className="bg-[#1c1f2a] rounded-2xl border border-white/8 px-5 py-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-[#0202ff]/20 flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-bold text-[#5f8aff]">
            {displayName?.[0]?.toUpperCase() || '?'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-white/90 truncate">{displayName}</p>
          <p className="text-xs text-white/40 truncate">{user?.email}</p>
          <Badge variant="outline" className="text-[10px] mt-1.5 border-white/20 text-white/50">{appRole || 'Manager'}</Badge>
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
        <YouRow
          icon={User}
          iconBg="bg-gray-50"
          iconColor="text-gray-600"
          title="My profile"
          subtitle="Name, role, and personal context"
          to="/Profile"
        />
        <YouRow
          icon={Bell}
          iconBg="bg-gray-50"
          iconColor="text-gray-500"
          title="Notifications"
          subtitle="Inbox and notification history"
          to="/Notifications"
        />
        <div
          onClick={() => base44.auth.logout()}
          className="flex items-center gap-4 px-5 py-4 hover:bg-red-500/10 transition-colors cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
            <LogOut className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-sm font-medium text-red-400 flex-1">Log out</p>
        </div>
      </SectionCard>
    </div>
  );
}