import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, HelpCircle, CheckCircle, BarChart3, Radio, MessageSquare } from "lucide-react";

const SIGNAL_TYPES = [
  {
    id: "assessment",
    label: "Assessment",
    description: "Competency-mapped evaluation with scoring and proficiency levels.",
    icon: ClipboardList,
    color: "#A25DDC",
  },
  {
    id: "quiz",
    label: "Quiz",
    description: "Scored questions with right/wrong answers and a pass threshold.",
    icon: HelpCircle,
    color: "#0202ff",
  },
  {
    id: "knowledge_check",
    label: "Knowledge Check",
    description: "Quick confirmation that a learner understood specific content.",
    icon: CheckCircle,
    color: "#3b82f6",
  },
  {
    id: "survey",
    label: "Survey",
    description: "Collect structured responses — no scoring, just feedback.",
    icon: BarChart3,
    color: "#10b981",
  },
  {
    id: "pulse",
    label: "Pulse",
    description: "Short, frequent one-question check on sentiment or sentiment.",
    icon: Radio,
    color: "#f59e0b",
  },
  {
    id: "feedback",
    label: "Feedback",
    description: "Gather feedback about an experience, session, or program.",
    icon: MessageSquare,
    color: "#ec4899",
  },
];

export default function SignalTypeSelector({ onSelect }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Choose the type of signal you want to create. Each type routes to the right builder automatically.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SIGNAL_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <Card
              key={type.id}
              className="hover:shadow-lg transition-all cursor-pointer border border-gray-100 hover:border-gray-200"
              onClick={() => onSelect(type.id)}
            >
              <CardContent className="p-5 space-y-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${type.color}15` }}>
                  <Icon className="w-5.5 h-5.5" style={{ color: type.color }} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{type.label}</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{type.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}