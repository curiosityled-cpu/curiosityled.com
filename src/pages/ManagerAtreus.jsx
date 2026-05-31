/**
 * ManagerAtreus — Immersive Atreus space. Guided journeys, reflection flows,
 * conversation prep, coaching threads, decision journal.
 * Route: /atreus-guide
 */
import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useAtreusChat } from "@/components/ai/AtreusContext";
import { Brain, MessageSquare, BookOpen, Target, ChevronRight, ArrowRight, Lock, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import DecisionJournal from "@/components/intelligence/DecisionJournal";
import WeeklyFocusReflection from "@/components/checkin/WeeklyFocusReflection";
import { useQueryClient } from "@tanstack/react-query";

function SectionHeader({ title, subtitle }) {
  return (
    <div className="pt-2 pb-1">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

const GUIDED_JOURNEYS = [
  { label: "Make sense of my week", prompt: "Help me reflect on this week as a manager. What went well, what was hard, and what should I carry forward?", icon: BookOpen, color: "text-blue-600 bg-blue-50 border-blue-100", tag: "Weekly reflection" },
  { label: "Understand a recurring pattern", prompt: "I want to explore a pattern I keep noticing in myself as a leader. Can you help me understand it better?", icon: Brain, color: "text-purple-600 bg-purple-50 border-purple-100", tag: "Pattern exploration" },
  { label: "Work through a decision", prompt: "I have a complex decision to make. Help me think through the considerations, tradeoffs, and what might be influencing my thinking.", icon: Lightbulb, color: "text-amber-600 bg-amber-50 border-amber-100", tag: "Decision support" },
  { label: "Prepare for a difficult moment", prompt: "I have something coming up that feels difficult — a conversation, a decision, or a situation I'm dreading. Help me prepare.", icon: Target, color: "text-emerald-600 bg-emerald-50 border-emerald-100", tag: "Situational prep" },
  { label: "Explore what's weighing on me", prompt: "Something has been sitting on me as a leader. I'm not sure exactly what it is. Can we explore it together?", icon: MessageSquare, color: "text-rose-600 bg-rose-50 border-rose-100", tag: "Open reflection" },
];

export default function ManagerAtreus() {
  const { user } = useAuth();
  const { openWithContext } = useAtreusChat();
  const queryClient = useQueryClient();
  const [showReflection, setShowReflection] = useState(false);
  const [launched, setLaunched] = useState(null);

  const launchJourney = (journey) => {
    setLaunched(journey.label);
    openWithContext({
      context: { pageType: 'atreus-guide', user_name: user?.full_name, journey: journey.tag },
      starterMessage: journey.prompt,
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <SectionHeader title="Atreus" subtitle="Deeper guidance — when a nudge isn't enough and you want to think something through." />

      {/* Hero prompt to open Atreus directly */}
      <div className="bg-[#0202ff] rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-5 h-5" />
          <p className="text-sm font-semibold">Open conversation</p>
        </div>
        <p className="text-sm text-white/80 mb-4 leading-relaxed">
          Start a free-form conversation with Atreus about anything on your mind as a leader.
        </p>
        <Button
          size="sm"
          className="bg-white text-[#0202ff] hover:bg-white/90 text-xs font-semibold"
          onClick={() => openWithContext({ context: { pageType: 'atreus-guide', user_name: user?.full_name }, starterMessage: null })}
        >
          <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Start a conversation
        </Button>
      </div>

      {/* Guided journeys */}
      <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-2">
          <p className="text-sm font-semibold text-gray-900">Guided journeys</p>
          <p className="text-xs text-gray-400 mt-0.5">Structured starting points for deeper exploration</p>
        </div>
        <CardContent className="px-5 pt-2 pb-5 space-y-2">
          {GUIDED_JOURNEYS.map((j) => {
            const Icon = j.icon;
            return (
              <button
                key={j.label}
                onClick={() => launchJourney(j)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors text-left group"
              >
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${j.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{j.label}</p>
                  <span className="text-[10px] text-gray-400">{j.tag}</span>
                </div>
                {launched === j.label ? (
                  <span className="text-[10px] text-[#0202ff] font-medium">Opened</span>
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Weekly reflection */}
      <Card
        className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setShowReflection(true)}
      >
        <CardContent className="px-5 py-4 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center">
            <BookOpen className="w-3.5 h-3.5 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">Weekly focus reflection</p>
            <p className="text-xs text-gray-500">Reflect on this week's wins, surprises, and learnings</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </CardContent>
      </Card>

      {/* Decision journal */}
      <DecisionJournal />

      {/* Privacy note */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
        <Lock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <p className="text-xs text-gray-500">Everything in Atreus is private to you unless you choose to share it.</p>
      </div>

      <WeeklyFocusReflection
        isOpen={showReflection}
        onClose={() => setShowReflection(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['ml-pulses', user?.email] })}
        userEmail={user?.email}
      />
    </div>
  );
}