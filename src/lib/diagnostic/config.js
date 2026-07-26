// Curiosity Led Diagnostic — Configuration registry
// Maps variant ("general" | "bpo") to all diagnostic modules + UI copy + report config.

import * as generalQuestions from "./questions";
import * as generalScoring from "./scoring";
import { determineFollowUps as generalDetermineFollowUps } from "./followUpTriggers";
import * as generalScoreAnchors from "./scoreAnchors";
import * as generalCopyBlocks from "./copyBlocks";
import { assembleReport as generalAssembleReport } from "./assembleReport";

import * as bpoQuestions from "./bpo/questions";
import * as bpoScoring from "./bpo/scoring";
import { determinePatterns as bpoDeterminePatterns } from "./bpo/patternLogic";
import * as bpoScoreAnchors from "./bpo/scoreAnchors";
import * as bpoCopyBlocks from "./bpo/copyBlocks";
import { assembleReport as bpoAssembleReport } from "./bpo/assembleReport";

export const DIAGNOSTIC_CONFIGS = {
  general: {
    variant: "general",
    questions: generalQuestions,
    scoring: generalScoring,
    followUpTriggers: { determineFollowUps: generalDetermineFollowUps },
    scoreAnchors: generalScoreAnchors,
    copyBlocks: generalCopyBlocks,
    assembleReport: { assembleReport: generalAssembleReport },
    reportConfig: {
      title: "Curiosity Led Leadership Reboot Diagnostic",
      subtitle: "90-Day Leadership Support Reboot Plan",
      source: "offer_diagnostic",
      emailSubject: "Your 90-Day Leadership Support Reboot Blueprint",
      pdfFooterLabel: "Leadership Support Diagnostic",
      overallScoreLabel: "Leadership Readiness Score",
      resultsHeaderLabel: "Leadership Reboot Diagnostic",
      resultsPageTitle: "90-Day Leadership Development Reboot Blueprint · Curiosity Led",
      pageEyebrow: "Leadership Support Diagnostic",
    },
    uiCopy: {
      nameStage: {
        heading: "First — What Should I Call You?",
        subtext: "I'll use your name to personalize the questions and build your report as we go.",
        buttonText: "Start My Assessment",
        helperText: "26 Questions + Tailored Follow-ups · About 5 Minutes · Straight Answers",
      },
      intakeStage: {
        section1Heading: (firstName) => `${firstName}, Tell Me About Your Context`,
        section1Subtext: "This helps me tailor the report to your lens and population.",
        section2Heading: (firstName) => `${firstName}, What's Your Current Reality?`,
        section2Subtext: "Choose what feels most true right now. This sharpens your blueprint.",
        continueButton: "Start Diagnostic Questions",
      },
      leadCaptureStage: {
        heading: (firstName) => `${firstName}, Your Leadership Reboot Blueprint Is Ready.`,
        subtext: "Add your delivery details one step at a time. Your full score, pressure points, and 90-day plan are ready on the next screen.",
        summaryItems: [
          { num: "01", title: "Five-Construct Scorecard", desc: "See what is strong and what needs work" },
          { num: "02", title: "Your Top 2 Pressure Points", desc: "Know where to focus first" },
          { num: "03", title: "Your 90-Day Plan", desc: "Download, print, and share it" },
        ],
        finalButton: "See My Results",
      },
      generatingStage: {
        heading: (firstName) => `${firstName}, Assembling Your Blueprint…`,
        description: "Scoring your 15 answers across 5 leadership constructs, identifying your top pressure points, and building your 90-day plan.",
      },
    },
  },

  bpo: {
    variant: "bpo",
    questions: bpoQuestions,
    scoring: bpoScoring,
    followUpTriggers: { determineFollowUps: () => [] }, // BPO has no follow-ups
    scoreAnchors: bpoScoreAnchors,
    copyBlocks: bpoCopyBlocks,
    assembleReport: { assembleReport: bpoAssembleReport },
    reportConfig: {
      title: "Curiosity Led BPO Leadership Diagnostic",
      subtitle: "90-Day BPO Leadership Action Plan",
      source: "bpo_diagnostic",
      emailSubject: "Your BPO Leadership Diagnostic Report",
      pdfFooterLabel: "BPO Leadership Diagnostic",
      overallScoreLabel: "BPO Leadership Score",
      resultsHeaderLabel: "BPO Leadership Diagnostic",
      resultsPageTitle: "BPO Leadership Diagnostic · Curiosity Led",
      pageEyebrow: "BPO Leadership Diagnostic",
    },
    uiCopy: {
      nameStage: {
        heading: "First — What Should I Call You?",
        subtext: "I'll use your name to personalize the questions and build your BPO leadership report as we go.",
        buttonText: "Start My Diagnostic",
        helperText: "15 Questions + 8 Context Questions · About 5 Minutes · Straight Answers",
      },
      intakeStage: {
        section1Heading: (firstName) => `${firstName}, Tell Me About Your Operation`,
        section1Subtext: "This helps me tailor the report to your BPO context.",
        section2Heading: (firstName) => `${firstName}, What's Your Current Reality?`,
        section2Subtext: "Choose what feels most true right now. This sharpens your pattern analysis.",
        continueButton: "Start Diagnostic Questions",
      },
      leadCaptureStage: {
        heading: (firstName) => `${firstName}, Your BPO Leadership Report Is Ready.`,
        subtext: "Add your delivery details one step at a time. Your pattern analysis and 90-day action plan are ready on the next screen.",
        summaryItems: [
          { num: "01", title: "Five-Construct Scorecard", desc: "See where leadership risk is building" },
          { num: "02", title: "Your Primary Risk Pattern", desc: "Know the pattern most worth fixing first" },
          { num: "03", title: "Your 90-Day Action Plan", desc: "Download, print, and share it" },
        ],
        finalButton: "See My Results",
      },
      generatingStage: {
        heading: (firstName) => `${firstName}, Assembling Your BPO Report…`,
        description: "Scoring your 15 answers across 5 BPO leadership dimensions, identifying your primary risk pattern, and building your 90-day action plan.",
      },
    },
  },
};

export function getConfig(variant) {
  return DIAGNOSTIC_CONFIGS[variant] || DIAGNOSTIC_CONFIGS.general;
}