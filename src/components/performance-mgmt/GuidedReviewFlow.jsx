import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, ChevronRight, ChevronLeft, CheckCircle2, Info, Lightbulb } from "lucide-react";
import { toast } from "sonner";

/**
 * Guided multi-step wizard wrapper for the review form.
 * Provides role-specific guidance, step-by-step navigation, and AI assist at each step.
 * Eliminates the "figure it out" feeling by guiding each participant through their role.
 */

const ROLE_GUIDANCE = {
  self: {
    title: "Self-Assessment",
    intro: "This is your opportunity to reflect on your own performance. Be honest and specific — your manager will use this as input for their review.",
    steps: [
      "Rate yourself on each competency. Think about specific examples from this period.",
      "Review your goal progress. Note what you accomplished and where you fell short.",
      "Review the evidence — accomplishments, feedback, and context documented throughout the period.",
      "Reflect on your strengths and areas for improvement. What development goals do you have?",
      "Provide your overall self-rating and any comments for calibration.",
    ],
  },
  manager: {
    title: "Manager Review",
    intro: "As the direct manager, your assessment carries significant weight. Be fair, evidence-based, and specific. Your rating will be calibrated with other managers.",
    steps: [
      "Rate the employee on each competency. Reference specific behaviors you've observed.",
      "Assess goal achievement. Did they meet, exceed, or fall short of expectations?",
      "Review documented evidence — accomplishments, feedback, and concerns from the period.",
      "Identify key strengths and areas for improvement. What should they focus on next?",
      "Provide your overall rating and calibration comments. Be prepared to discuss in calibration.",
    ],
  },
  peer: {
    title: "Peer Feedback",
    intro: "Your feedback provides a valuable outside perspective. Focus on observable behaviors and collaboration. Your input is confidential and helps calibrate the review.",
    steps: [
      "Rate the colleague on competencies you've observed firsthand. Skip any you can't assess.",
      "Comment on goal achievement where you have direct knowledge.",
      "Reference specific examples of collaboration, impact, or areas for growth.",
      "Suggest development areas that would help them be more effective.",
      "Provide an overall rating and any comments for the manager's consideration.",
    ],
  },
  hr: {
    title: "Skip-Level / HR Review",
    intro: "As a skip-level or HR reviewer, you provide oversight and ensure fairness. Review the manager's assessment for consistency and add your own observations.",
    steps: [
      "Review the employee's competencies from your skip-level perspective.",
      "Assess goal achievement from a broader organizational view.",
      "Review evidence with attention to patterns and consistency across the team.",
      "Note strengths and development areas from your vantage point.",
      "Provide your overall rating and any calibration comments for fairness.",
    ],
  },
};

const STEP_ICONS = {
  competency_ratings: "Rate Competencies",
  goal_achievement: "Assess Goals",
  evidence: "Review Evidence",
  text_sections: "Reflect & Plan",
  overall: "Overall Rating",
};

function AIStepAssist({ role, stepIndex, stepTitle, employeeEmail, sectionType }) {
  const [loading, setLoading] = useState(false);
  const [tip, setTip] = useState(null);

  const getTip = async () => {
    setLoading(true);
    try {
      const roleLabel = ROLE_GUIDANCE[role]?.title || "Reviewer";
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert HR coach helping a ${roleLabel} complete a performance review step: "${stepTitle}".
The step type is: ${sectionType}.
The employee being reviewed is: ${employeeEmail}.

Provide ONE concise, actionable tip (2-3 sentences max) to help the reviewer complete this step effectively. Focus on:
- What to pay attention to
- A specific question to ask themselves
- What good looks like

Keep it practical and encouraging. No fluff.`,
        response_json_schema: {
          type: "object",
          properties: {
            tip: { type: "string" },
          },
        },
      });
      setTip(res.tip);
    } catch (err) {
      setTip("Focus on specific, observable behaviors and examples from this review period.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <Button
        size="sm"
        variant="ghost"
        onClick={getTip}
        disabled={loading}
        className="h-7 text-xs gap-1 text-indigo-600 hover:bg-indigo-50"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
        {loading ? "Getting tip..." : "AI Tip for this step"}
      </Button>
      {tip && (
        <div className="flex items-start gap-2 bg-indigo-50 rounded-lg p-2.5 border border-indigo-100">
          <Lightbulb className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-indigo-900">{tip}</p>
        </div>
      )}
    </div>
  );
}

import ReviewFormRenderer from "./ReviewFormRenderer";

export default function GuidedReviewFlow({
  role,
  employeeEmail,
  formConfig,
  responses,
  onChange,
  onSubmit,
  submitting,
}) {
  const [step, setStep] = useState(0); // 0 = intro, then 1..N for sections, N+1 = review
  const guidance = ROLE_GUIDANCE[role] || ROLE_GUIDANCE.self;
  const sections = formConfig?.sections || [];
  const totalSteps = sections.length + 2; // intro + sections + review
  const isIntro = step === 0;
  const isReview = step === totalSteps - 1;
  const currentSectionIndex = step - 1;
  const currentSection = isIntro || isReview ? null : sections[currentSectionIndex];

  // Progress percentage
  const progress = Math.round((step / (totalSteps - 1)) * 100);

  const canProceed = () => {
    if (isIntro) return true;
    if (isReview) return true;
    return true; // allow navigation; validation happens on submit
  };

  const next = () => {
    if (step < totalSteps - 1) setStep(step + 1);
  };
  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="space-y-4">
      {/* Progress stepper */}
      <div className="flex items-center gap-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              i <= step ? "bg-[#0202ff]" : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-[10px] border-gray-200 text-gray-500">
          Step {step + 1} of {totalSteps}
        </Badge>
        <span className="text-xs text-gray-500">{guidance.title}</span>
      </div>

      {/* Intro step */}
      {isIntro && (
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Info className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Welcome to your {guidance.title}</h3>
                <p className="text-xs text-gray-600 mt-1">{guidance.intro}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-700">Here's what you'll do:</p>
            {guidance.steps.map((s, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-gray-500">{i + 1}</span>
                </div>
                <p className="text-xs text-gray-600">{s}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button onClick={next} className="bg-[#0202ff] hover:bg-[#0101dd] text-white gap-1.5">
              Start Review <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Section steps */}
      {!isIntro && !isReview && currentSection && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <span className="text-xs font-bold text-[#0202ff]">{currentSectionIndex + 1}</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{currentSection.title}</h3>
              {currentSection.description && (
                <p className="text-[10px] text-gray-400">{currentSection.description}</p>
              )}
            </div>
          </div>

          {/* AI tip for this step */}
          <AIStepAssist
            role={role}
            stepIndex={currentSectionIndex}
            stepTitle={currentSection.title}
            employeeEmail={employeeEmail}
            sectionType={currentSection.type}
          />

          {/* Render only the current section */}
          <div className="border border-gray-100 rounded-xl p-4">
            <ReviewFormRenderer
              formConfig={formConfig}
              employeeEmail={employeeEmail}
              responses={responses}
              onChange={onChange}
              activeSection={currentSectionIndex}
            />
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={back} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            <Button onClick={next} className="bg-[#0202ff] hover:bg-[#0101dd] text-white gap-1">
              {step === totalSteps - 2 ? "Review & Submit" : "Next"} <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Review & submit step */}
      {isReview && (
        <div className="space-y-4">
          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Ready to Submit</h3>
                <p className="text-xs text-gray-600 mt-1">
                  Review your responses below. Once submitted, your {guidance.title} will be recorded for this cycle.
                </p>
              </div>
            </div>
          </div>

          {/* Show all sections collapsed */}
          <div className="space-y-2">
            {sections.map((section, i) => (
              <details key={i} className="border border-gray-100 rounded-xl">
                <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 rounded-xl">
                  {section.title}
                </summary>
                <div className="p-3 border-t border-gray-100">
                  <ReviewFormRenderer
                    formConfig={formConfig}
                    employeeEmail={employeeEmail}
                    responses={responses}
                    onChange={onChange}
                    activeSection={i}
                  />
                </div>
              </details>
            ))}
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={back} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            <Button
              onClick={onSubmit}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Submit {guidance.title}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}