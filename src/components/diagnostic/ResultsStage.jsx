import React from "react";
import { motion } from "framer-motion";
import { Download, Mail, RotateCcw, Calendar } from "lucide-react";
import { CONSTRUCT_LABELS } from "@/lib/diagnostic/scoring";

export default function ResultsStage({ report, scores, leadInfo, pdfUrl, emailSent, onStartOver, onBack }) {
  const s1 = report.section1_title_context;
  const s2 = report.section2_overall_result;
  const s3 = report.section3_manager_engagement_risk;
  const s4 = report.section4_top_2_pressure_points;
  const s5 = report.section5_what_this_means;
  const s6 = report.section6_90_day_plan;
  const s7 = report.section7_what_to_bring_to_leadership;
  const s8 = report.section8_where_it_gets_hard;
  const s9 = report.section9_curiosity_led_bridge;
  const lsc = report.leadership_story_coherence;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto px-6 pb-16"
    >
      {/* Success banner */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8 text-center">
        <div
          className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ backgroundColor: "#0202ff" }}
        >
          <Mail className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-[#0a0a0a] mb-2">
          {leadInfo.firstName}, Your Blueprint Is Ready
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          {emailSent
            ? `We've emailed the full PDF to ${leadInfo.email}. You can also download it below.`
            : `Your report has been generated. Download it below.`}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {pdfUrl && (
            <a
              href={pdfUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-white text-sm transition-all hover:opacity-90 shadow-lg"
              style={{ backgroundColor: "#0202ff" }}
            >
              <Download className="w-4 h-4" />
              Download Blueprint (PDF)
            </a>
          )}
          <button
            onClick={onStartOver}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-gray-700 text-sm border border-gray-200 hover:bg-gray-50 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Take Again
          </button>
        </div>
      </div>

      {/* Score summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="border-b border-gray-100 pb-4 mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] mb-1" style={{ color: "#0202ff" }}>
            Leadership Reboot Diagnostic
          </p>
          <h2 className="text-lg font-bold text-[#0a0a0a]">Your Score Summary</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <ScoreCard label="Overall" score={s2.score} sublabel={s2.label} />
          <ScoreCard label="Manager Engagement Risk" score={s3.score} sublabel={s3.label} />
          <ScoreCard label="Story Coherence" score={lsc.score} sublabel={lsc.label} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mt-4">
          {Object.entries(scores.constructScores).map(([key, score]) => (
            <div key={key} className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-[#0a0a0a]">{score}</p>
              <p className="text-[10px] text-gray-500 leading-tight mt-1">
                {CONSTRUCT_LABELS[key]}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Section: What this means */}
      <ReportSection num="5" title="What This Likely Means Right Now">
        <p className="text-sm text-gray-600 leading-relaxed">{s5.synthesis}</p>
      </ReportSection>

      {/* Section: Top 2 pressure points */}
      <ReportSection num="4" title="Your Top 2 Pressure Points">
        <div className="space-y-6">
          {s4.map((pp, i) => (
            <div key={i} className="border-l-4 pl-4" style={{ borderColor: "#0202ff" }}>
              <p className="text-sm font-bold text-[#0a0a0a] mb-1">{pp.headline}</p>
              <p className="text-xs text-gray-400 mb-2">
                {pp.construct_label} · Score: {pp.score} · {pp.band}
              </p>
              <p className="text-sm text-gray-600 leading-relaxed mb-2">{pp.interpretation}</p>
              {pp.specificity && (
                <p className="text-sm text-gray-700 italic">{pp.specificity}</p>
              )}
            </div>
          ))}
        </div>
      </ReportSection>

      {/* Section: 90-Day Plan */}
      <ReportSection num="6" title="Your 90-Day Leadership Support Reboot Plan">
        <div className="space-y-6">
          {s6.map((priority, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: "#0202ff" }}
                >
                  {priority.priority}
                </span>
                <p className="text-sm font-bold text-[#0a0a0a]">{priority.title}</p>
              </div>
              <p className="text-xs text-gray-500 italic mb-4">{priority.why_it_matters}</p>
              <div className="space-y-3">
                <DayBlock label="Days 1–30" text={priority.days_1_30} />
                <DayBlock label="Days 31–60" text={priority.days_31_60} />
                <DayBlock label="Days 61–90" text={priority.days_61_90} />
              </div>
            </div>
          ))}
        </div>
      </ReportSection>

      {/* Section: What to bring to leadership */}
      <ReportSection num="7" title="What to Bring to Leadership">
        <ul className="space-y-2 mb-4">
          {s7.talking_points.map((tp, i) => (
            <li key={i} className="text-sm text-gray-600 flex gap-2">
              <span style={{ color: "#0202ff" }}>•</span>
              {tp}
            </li>
          ))}
        </ul>
        <p className="text-sm font-semibold text-[#0a0a0a] mb-1">Suggested framing:</p>
        <p className="text-sm text-gray-600 italic">{s7.framing_sentence}</p>
      </ReportSection>

      {/* Section: Where it gets hard */}
      <ReportSection num="8" title="Where Implementation Usually Gets Hard">
        <ul className="space-y-2">
          {s8.bullets.map((b, i) => (
            <li key={i} className="text-sm text-gray-600 flex gap-2">
              <span style={{ color: "#0202ff" }}>•</span>
              {b}
            </li>
          ))}
        </ul>
      </ReportSection>

      {/* Section: Curiosity Led bridge */}
      <div className="bg-[#0a0a0a] rounded-xl p-6 mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: "#6C9EFF" }}>
          The Curiosity Led Bridge
        </p>
        <p className="text-sm text-gray-300 mb-3">{s9.sentence1}</p>
        <p className="text-sm text-gray-300 mb-3">{s9.sentence2}</p>
        <p className="text-sm text-white font-medium mb-6">{s9.sentence3}</p>
        <a
          href="https://calendly.com/curiosityled/consultation"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-[#0a0a0a] text-sm transition-all hover:opacity-90 shadow-lg"
          style={{ backgroundColor: "#6C9EFF" }}
        >
          <Calendar className="w-4 h-4" />
          Schedule a Call with a Consultant
        </a>
      </div>
    </motion.div>
  );
}

function ReportSection({ num, title, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
        <span
          className="text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center text-white"
          style={{ backgroundColor: "#0202ff" }}
        >
          {num}
        </span>
        <h2 className="text-base font-bold text-[#0a0a0a]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ScoreCard({ label, score, sublabel }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 text-center">
      <p className="text-3xl font-bold text-[#0a0a0a]">{score}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
      <p className="text-xs font-medium mt-1" style={{ color: "#0202ff" }}>{sublabel}</p>
    </div>
  );
}

function DayBlock({ label, text }) {
  return (
    <div>
      <p className="text-xs font-bold mb-1" style={{ color: "#0202ff" }}>{label}</p>
      <p className="text-sm text-gray-600">{text}</p>
    </div>
  );
}