/**
 * OperatorModeAlert
 * Shows when the operator mode pattern (overloaded + overcontrolling) is detected.
 * Appears on Patterns page when signals are present.
 */
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, X, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OperatorModeAlert({ pulses = [], onOpenAtreus }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  // Check last 7 days for operator mode signals
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentPulses = pulses.filter(p => p.created_date && new Date(p.created_date) >= sevenDaysAgo);
  const operatorDays = recentPulses.filter(p =>
    (p.perceived_load === "unsustainable" || p.perceived_load === "heavy") &&
    (p.operator_mode_response === "very_much" || p.operator_mode_response === "somewhat")
  ).length;

  if (operatorDays < 2) return null;

  return (
    <Card className="shadow-sm border border-amber-200 bg-amber-50 rounded-2xl overflow-hidden">
      <CardContent className="px-5 py-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">Operator mode detected</p>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              You've shown signs of overload + overcontrol {operatorDays} time{operatorDays > 1 ? "s" : ""} this week. 
              This pattern is worth exploring — it often signals a need to delegate or deprioritise.
            </p>
            <Button
              size="sm"
              className="mt-3 bg-amber-600 hover:bg-amber-700 text-white text-xs h-7"
              onClick={() => onOpenAtreus?.("I've been in operator mode this week — high load and feeling like I need to control everything. Help me think through what's driving this.")}
            >
              <Brain className="w-3 h-3 mr-1.5" /> Explore with Atreus
            </Button>
          </div>
          <button onClick={() => setDismissed(true)} className="text-amber-400 hover:text-amber-600 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}