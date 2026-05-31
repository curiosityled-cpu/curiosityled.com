/**
 * ManagerTeam — 1:1 prep, delegation, team focus, conversation prep.
 * Route: /team
 */
import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useAtreusChat } from "@/components/ai/AtreusContext";
import { Users, MessageSquare, Brain, ChevronRight, Calendar, Target, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import TeamMeetingRhythm from "@/components/rhythm/TeamMeetingRhythm";

function SectionHeader({ title, subtitle }) {
  return (
    <div className="pt-2 pb-1">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

const QUICK_ACTIONS = [
  { label: "Prep a 1:1 conversation", icon: MessageSquare, prompt: "Help me prepare for an upcoming 1:1. What questions should I be thinking about?", color: "text-[#0202ff] bg-blue-50 border-blue-100" },
  { label: "Think through a delegation", icon: Target, prompt: "I want to delegate something to my team but I'm not sure how to frame it. Can you help me think it through?", color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
  { label: "Prep for a hard conversation", icon: Users, prompt: "I have a difficult conversation coming up with someone on my team. Help me prepare.", color: "text-amber-600 bg-amber-50 border-amber-100" },
  { label: "Reflect on my team leadership", icon: Brain, prompt: "I want to reflect on how I've been showing up as a leader for my team this week. What questions should I be asking myself?", color: "text-purple-600 bg-purple-50 border-purple-100" },
];

const TEAM_RESOURCES = [
  { label: "Schedule or log a 1:1", sub: "Track your team conversations", path: "/GoalManager", icon: Calendar },
  { label: "Review team goals", sub: "Goals and progress for your team", path: "/GoalManager", icon: Target },
  { label: "Team performance overview", sub: "How your team is developing", path: "/PerformanceManager", icon: Users },
];

export default function ManagerTeam() {
  const { user } = useAuth();
  const { openWithContext } = useAtreusChat();
  const [prompted, setPrompted] = useState(null);

  const handleAction = (action) => {
    setPrompted(action.label);
    openWithContext({
      context: { pageType: 'team', user_name: user?.full_name },
      starterMessage: action.prompt,
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <SectionHeader title="Team" subtitle="Prepare for conversations, support your team, and lead with intention." />

      {/* Quick actions via Atreus */}
      <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-2 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0202ff] flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-white" />
          </div>
          <p className="text-sm font-semibold text-gray-900">Team actions with Atreus</p>
        </div>
        <CardContent className="px-5 pt-2 pb-5 space-y-2">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => handleAction(action)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors text-left group"
              >
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${action.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-gray-800 flex-1">{action.label}</span>
                {prompted === action.label ? (
                  <CheckCircle2 className="w-4 h-4 text-[#0202ff] flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Calendar signals */}
      <TeamMeetingRhythm />

      {/* Team resources */}
      <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-2">
          <p className="text-sm font-semibold text-gray-900">Team tools</p>
        </div>
        <CardContent className="px-5 pt-2 pb-5 space-y-1">
          {TEAM_RESOURCES.map((r) => {
            const Icon = r.icon;
            return (
              <Link key={r.path + r.label} to={r.path}>
                <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors group">
                  <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{r.label}</p>
                    <p className="text-xs text-gray-400">{r.sub}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400" />
                </div>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}