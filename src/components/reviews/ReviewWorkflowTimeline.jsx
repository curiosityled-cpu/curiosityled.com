import React from "react";
import { Check } from "lucide-react";

const STEPS = [
  { id: "self", label: "Self review" },
  { id: "manager", label: "Manager" },
  { id: "calibration", label: "Calibration" },
  { id: "conversation", label: "Conversation" },
  { id: "released", label: "Final summary" },
];

const STAGE_INDEX = {
  self: 0,
  manager: 1,
  calibration: 2,
  conversation: 3,
  release: 4,
  released: 4,
};

export default function ReviewWorkflowTimeline({ stage = "self", compact = false }) {
  const current = STAGE_INDEX[stage] ?? 0;

  return (
    <div className="flex items-center gap-1.5">
      {STEPS.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <React.Fragment key={step.id}>
            <div className="flex items-center gap-1.5 min-w-0">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold ${
                  done
                    ? "bg-green-500 text-white"
                    : active
                    ? "bg-[#0202ff] text-white"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {done ? <Check className="w-3 h-3" /> : index + 1}
              </div>
              {!compact && (
                <span
                  className={`text-[10px] font-medium whitespace-nowrap ${
                    done ? "text-green-700" : active ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
              )}
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`h-0.5 flex-1 min-w-2 rounded-full ${
                  index < current ? "bg-green-300" : "bg-gray-200"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}