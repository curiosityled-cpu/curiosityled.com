import React, { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { SCORED_ITEMS } from "@/lib/diagnostic/questions";
import { computeAllScores } from "@/lib/diagnostic/scoring";
import { determineFollowUps } from "@/lib/diagnostic/followUpTriggers";
import { assembleReport } from "@/lib/diagnostic/assembleReport";

import NameStage from "./NameStage";
import IntakeStage from "./IntakeStage";
import ScoredQuestionsStage from "./ScoredQuestionsStage";
import FollowUpStage from "./FollowUpStage";
import LeadCaptureStage from "./LeadCaptureStage";
import GeneratingStage from "./GeneratingStage";
import ResultsStage from "./ResultsStage";

const STAGES = [
  "name",
  "intake",
  "questions",
  "follow_ups",
  "lead_capture",
  "generating",
  "results",
];

export default function DiagnosticFlow({ onBackToLanding }) {
  const [stage, setStage] = useState("name");
  const [data, setData] = useState({
    firstName: "",
    lastName: "",
    intakeAnswers: {},
    scoredResponses: {},
    followUpAnswers: {},
    leadInfo: {},
  });
  const [scores, setScores] = useState(null);
  const [triggeredFollowUps, setTriggeredFollowUps] = useState([]);
  const [report, setReport] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");

  // ── Scroll to top whenever the stage changes ──
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [stage]);

  // ── Stage transitions ──
  const handleNameComplete = (nameData) => {
    setData((prev) => ({ ...prev, ...nameData }));
    setStage("intake");
  };

  const handleIntakeComplete = (intakeAnswers) => {
    setData((prev) => ({ ...prev, intakeAnswers }));
    setStage("questions");
  };

  const handleQuestionsComplete = (scoredResponses) => {
    setData((prev) => ({ ...prev, scoredResponses }));
    // Compute scores
    const computedScores = computeAllScores(SCORED_ITEMS, scoredResponses);
    setScores(computedScores);
    // Determine triggered follow-ups
    const followUps = determineFollowUps(computedScores, data.intakeAnswers);
    setTriggeredFollowUps(followUps);
    // Go to follow-ups or skip to lead capture
    if (followUps.length > 0) {
      setStage("follow_ups");
    } else {
      setStage("lead_capture");
    }
  };

  const handleFollowUpComplete = (followUpAnswers) => {
    setData((prev) => ({ ...prev, followUpAnswers }));
    setStage("lead_capture");
  };

  const handleLeadCaptureComplete = async (leadInfo) => {
    const fullLeadInfo = {
      ...leadInfo,
      name: `${data.firstName} ${data.lastName}`.trim(),
      firstName: data.firstName,
    };
    setData((prev) => ({ ...prev, leadInfo: fullLeadInfo }));
    setStage("generating");

    // Assemble report
    const assembledReport = assembleReport(scores, data.intakeAnswers, data.followUpAnswers);
    setReport(assembledReport);

    // Call backend function to generate PDF + send email + save entities
    try {
      const response = await base44.functions.invoke("generateDiagnosticReport", {
        report: assembledReport,
        scores: {
          constructScores: scores.constructScores,
          overallScore: scores.overallScore,
          overallLabel: scores.overallLabel,
          merScore: scores.merScore,
          merLabel: scores.merLabel,
          lscScore: scores.lscScore,
          lscLabel: scores.lscLabel,
          top2PressurePoints: scores.top2PressurePoints,
          blueprintPriorities: scores.blueprintPriorities,
        },
        lead_info: fullLeadInfo,
        intake_answers: data.intakeAnswers,
        scored_responses: data.scoredResponses,
        follow_up_answers: data.followUpAnswers,
      });

      setPdfUrl(response.data?.pdf_url || null);
      setEmailSent(response.data?.email_sent || false);
      if (response.data?.email_error) {
        console.warn("Email sending error:", response.data.email_error);
      }
      setStage("results");
    } catch (err) {
      setError(err?.message || "Something went wrong generating your report.");
      setStage("results");
    }
  };

  const handleStartOver = () => {
    setData({
      firstName: "",
      lastName: "",
      intakeAnswers: {},
      scoredResponses: {},
      followUpAnswers: {},
      leadInfo: {},
    });
    setScores(null);
    setTriggeredFollowUps([]);
    setReport(null);
    setPdfUrl(null);
    setEmailSent(false);
    setError("");
    onBackToLanding();
  };

  const handleBackToLanding = () => {
    onBackToLanding();
  };

  // ── Render current stage ──
  return (
    <div className="relative pt-24 pb-16 min-h-screen">
      {error && (
        <div className="max-w-2xl mx-auto px-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {stage === "name" && (
          <NameStage key="name" onComplete={handleNameComplete} />
        )}
        {stage === "intake" && (
          <IntakeStage
            key="intake"
            firstName={data.firstName}
            onComplete={handleIntakeComplete}
            onBack={() => setStage("name")}
          />
        )}
        {stage === "questions" && (
          <ScoredQuestionsStage
            key="questions"
            firstName={data.firstName}
            onComplete={handleQuestionsComplete}
            onBack={() => setStage("intake")}
          />
        )}
        {stage === "follow_ups" && (
          <FollowUpStage
            key="follow_ups"
            triggeredFollowUps={triggeredFollowUps}
            intakeAnswers={data.intakeAnswers}
            firstName={data.firstName}
            onComplete={handleFollowUpComplete}
            onBack={() => setStage("questions")}
          />
        )}
        {stage === "lead_capture" && (
          <LeadCaptureStage
            key="lead_capture"
            firstName={data.firstName}
            onComplete={handleLeadCaptureComplete}
            onBack={() =>
              triggeredFollowUps.length > 0
                ? setStage("follow_ups")
                : setStage("questions")
            }
          />
        )}
        {stage === "generating" && (
          <GeneratingStage key="generating" firstName={data.firstName} />
        )}
        {stage === "results" && (
          <ResultsStage
            key="results"
            report={report}
            scores={scores}
            leadInfo={data.leadInfo}
            pdfUrl={pdfUrl}
            emailSent={emailSent}
            onStartOver={handleStartOver}
            onBack={handleBackToLanding}
          />
        )}
      </AnimatePresence>
    </div>
  );
}