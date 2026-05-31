/**
 * NextMoveCard — One recommended action for the manager right now.
 * Reduces ambiguity. Routes into the right Practice flow.
 */
import React, { useState } from "react";
import { Zap, ArrowRight, CheckCircle2, Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

function buildNextMove(pulse, trends, goals, assignments, insight) {
  // Priority 1: avoidance signal
  if (pulse?.avoidance_flag === 'yes') {
    return {
      move: "Name what you're avoiding.",
      reason: "You flagged something earlier. Taking 5 minutes to write it out often dissolves half the resistance.",
      cta: "Work through it",
      flow: "practice",
      atreus: true,
      atreusMsg: "I flagged that I might be avoiding something today. Can you help me name it and think through a next step?",
    };
  }

  // Priority 2: overload → delegation
  if (trends?.overload_pattern_strength > 60 || pulse?.perceived_load === 'unsustainable') {
    return {
      move: "Identify one thing to hand off today.",
      reason: "Your pattern data suggests you're absorbing more than you should. Delegation is a leadership act, not a shortcut.",
      cta: "Plan delegation",
      flow: "practice",
      atreus: true,
      atreusMsg: "I want to think through what I should delegate. Can you help me work through it?",
    };
  }

  // Priority 3: stalled goal
  const stalledGoal = goals.find(g => g.status === 'active' && (g.progress || 0) < 25);
  if (stalledGoal) {
    return {
      move: `Make one move on "${stalledGoal.title}"`,
      reason: "This goal hasn't moved much. Small, specific actions compound. What's the next 20-minute step?",
      cta: "Open goal",
      flow: "goals",
      atreus: false,
      link: "/my-goals",
    };
  }

  // Priority 4: overdue learning
  const overdueItem = assignments.find(a => a.status === 'assigned' && a.due_date && new Date(a.due_date) < new Date());
  if (overdueItem) {
    return {
      move: `Complete: ${overdueItem.title}`,
      reason: "This learning is overdue. Even a partial session helps close the loop.",
      cta: "Go to learning",
      flow: "development",
      atreus: false,
      link: "/my-development",
    };
  }

  // Priority 5: identity friction
  if (trends?.identity_friction_active) {
    return {
      move: "Reconnect with your leadership identity.",
      reason: "Something in your recent signals suggests uncertainty about your role or approach. That's worth a short conversation.",
      cta: "Reflect with Atreus",
      flow: "practice",
      atreus: true,
      atreusMsg: "I've been feeling some uncertainty about my role as a leader. Can you help me think through it?",
    };
  }

  // Priority 6: no hard data → prep for 1:1
  return {
    move: "Prepare one good question for your next 1:1.",
    reason: "Intentional questions before team conversations are one of the most consistent differentiators of effective managers.",
    cta: "Prep with Atreus",
    flow: "practice",
    atreus: true,
    atreusMsg: "I want to prepare for an upcoming 1:1. Can you help me think through a good coaching question?",
  };
}

export default function NextMoveCard({ pulse, trends, goals, assignments, insight, onOpenAtreus }) {
  const [done, setDone] = useState(false);
  const move = buildNextMove(pulse, trends, goals, assignments, insight);

  const handleAtreus = () => {
    onOpenAtreus(move.atreusMsg);
  };

  return (
    <Card className="shadow-sm border border-[#0202ff]/10 bg-gradient-to-br from-[#0202ff]/5 to-white rounded-2xl overflow-hidden">
      <CardContent className="px-5 py-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0202ff] flex items-center justify-center flex-shrink-0">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <p className="text-[11px] font-semibold text-[#0202ff] uppercase tracking-wider">Next move</p>
        </div>

        {done ? (
          <div className="flex items-center gap-2 py-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <p className="text-sm font-medium text-gray-700">Nice. That's done.</p>
          </div>
        ) : (
          <>
            <p className="text-base font-semibold text-gray-900 leading-snug">{move.move}</p>
            <p className="text-xs text-gray-500 leading-relaxed">{move.reason}</p>

            <div className="flex gap-2 pt-1">
              {move.atreus ? (
                <Button
                  size="sm"
                  className="flex-1 bg-[#0202ff] hover:bg-[#0101dd] text-white text-xs h-8"
                  onClick={handleAtreus}
                >
                  <Brain className="w-3 h-3 mr-1.5" /> {move.cta}
                </Button>
              ) : (
                <Link to={move.link} className="flex-1">
                  <Button size="sm" className="w-full bg-[#0202ff] hover:bg-[#0101dd] text-white text-xs h-8">
                    {move.cta} <ArrowRight className="w-3 h-3 ml-1.5" />
                  </Button>
                </Link>
              )}
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8 border-gray-200 text-gray-500 hover:bg-gray-50"
                onClick={() => setDone(true)}
              >
                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" /> Done
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}