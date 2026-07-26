import React from "react";
import { motion } from "framer-motion";
import { Download, Mail, RotateCcw, Calendar } from "lucide-react";
import { useDiagnosticConfig } from "./DiagnosticConfigContext";
import ScoreBar from "./ScoreBar";
import ExpandableScoreBar from "./ExpandableScoreBar";
import ScoreGauge from "./ScoreGauge";
import ConstructRadar from "./ConstructRadar";

export default function BpoResultsStage({ report, scores, leadInfo, pdfUrl, emailSent, onStartOver, onBack }) {
  const config = useDiagnosticConfig();
  const { reportConfig } = config;

  if (!report) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-2xl mx-auto px-6 pb-16"
      >
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center bg-red-50">
            <Download className="w-6 h-6 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-[#0a0a0a] mb-2">
            We Couldn't Assemble Your Report
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            Something went wrong while generating your BPO leadership report. Your answers were saved — you can try again or head back to the start.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onStartOver}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-white text-sm shadow-lg transition-all hover:opacity-90"
              style={{ backgroundColor: "#0202ff" }}
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
            <button
              onClick={onBack}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-gray-700 text-sm border border-gray-200 hover:bg-gray-50 transition-all"
            >
              Back to Home
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  const s1 = report.section1_title_context;
  const s2 = report.section2_overall_result;
  const s3 = report.section3_construct_scores;
  const s4 = report.section4_primary_pattern;
  const s5 = report.section5_watch_patterns;
  const s6 = report.section6_what_this_means;
  const s7 = report.section7_90_day_plan;
  const s8 = report.section8_what_to_bring_to_leadership;
  const s9 = report.section9_curiosity_led_bridge;

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
          {emailSent ? <Mail className="w-6 h-6 text-white" /> : <Download className="w-6 h-6 text-white" />}
        </div>
        <h1 className="text-2xl font-bold text-[#0a0a0a] mb-2">
          {leadInfo.firstName}, Your BPO Leadership Report Is Ready
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          {emailSent
            ? `We've emailed the full PDF to ${leadInfo.email}. You can also download it below.`
            : `Your report is ready. Download it below — we're finishing the setup of automated email delivery, so grab it right from here.`}
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
              Download Report (PDF)
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

      {/* How to read these scores */}
      {report.how_to_read && (
        <div className="bg-[#0202ff]/5 border border-[#0202ff]/15 rounded-xl p-5 mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: "#0202ff" }}>
            How to Read These Scores
          </p>
          <ul className="space-y-2">
            {report.how_to_read.map((line, i) => (
              <li key={i} className="text-sm text-gray-700 flex gap-2">
                <span style={{ color: "#0202ff" }}>•</span>
                {line}
              </li>
            ))}
          </ul>
          {report.criterion_note && (
            <p className="text-xs text-gray-500 italic mt-3">{report.criterion_note}</p>
          )}
        </div>
      )}

      {/* Score summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="border-b border-gray-100 pb-4 mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] mb-1" style={{ color: "#0202ff" }}>
            {reportConfig.resultsHeaderLabel}
          </p>
          <h2 className="text-lg font-bold text-[#0a0a0a]">Your Score Summary</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center mb-6">
          <div className="flex flex-col items-center gap-3">
            <ScoreGauge score={s2.score} label="" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500 text-center">
              {reportConfig.overallScoreLabel}
            </p>
          </div>
          <div className="min-w-0">
            <ConstructRadar constructScores={scores.constructScores} />
          </div>
        </div>
        <div className="mb-3">
          <p className="text-sm font-bold text-[#0a0a0a]">{s2.label}</p>
          {s2.what_it_measures && (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{s2.what_it_measures}</p>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">What 100 looks like</p>
            <p className="text-xs text-gray-700 leading-relaxed">{s2.what_100_looks_like}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">What 0 means</p>
            <p className="text-xs text-gray-700 leading-relaxed">{s2.what_low_means}</p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">The Five Dimensions</p>
            <span className="text-[10px] text-gray-400">Tap a row for detail</span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-400 mb-2">
            {report.band_ranges?.map((b) => (
              <span key={b.key}>{b.min}–{b.max}: {b.label}</span>
            ))}
          </div>
          <div className="divide-y divide-gray-100">
            {s3.constructs.map((c) => (
              <ExpandableScoreBar
                key={c.construct}
                label={c.construct_label}
                score={c.score}
                sublabel={c.band}
                measures={c.measures}
                stronger={c.stronger}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Section: Primary risk pattern */}
      <BpoReportSection num="4" title="Your Primary Risk Pattern">
        <div className="border-l-4 pl-4" style={{ borderColor: "#0202ff" }}>
          <div className="flex items-center gap-3 mb-2">
            <p className="text-lg font-bold text-[#0a0a0a]">{s4.label}</p>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: s4.status === "Active" ? "#dc2626" : s4.status === "Emerging" ? "#f59e0b" : "#6b7280" }}
            >
              {s4.status}
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Driven by {s4.driving_construct_label} · Score: {s4.driving_score}/100
          </p>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">What it means</p>
              <p className="text-sm text-gray-700 leading-relaxed">{s4.what_it_means}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">What may be driving it</p>
              <p className="text-sm text-gray-700 leading-relaxed">{s4.what_may_drive_it}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">What is at stake</p>
              <p className="text-sm text-gray-700 leading-relaxed">{s4.what_is_at_stake}</p>
            </div>
            {s4.why_for_you && (
              <p className="text-sm font-semibold mt-2" style={{ color: "#0202ff" }}>
                {s4.why_for_you}
              </p>
            )}
          </div>
        </div>
      </BpoReportSection>

      {/* Section: Secondary watch patterns */}
      {s5.length > 0 && (
        <BpoReportSection num="5" title="Secondary Watch Patterns">
          <div className="space-y-4">
            {s5.map((w, i) => (
              <div key={i} className="border-l-4 pl-4" style={{ borderColor: "#9ca3af" }}>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-bold text-[#0a0a0a]">{w.label}</p>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: w.status === "Active" ? "#dc2626" : w.status === "Emerging" ? "#f59e0b" : "#6b7280" }}
                  >
                    {w.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-2">Driven by {w.driving_construct_label} · Score: {scores.constructScores[w.driving_construct]}/100</p>
                <p className="text-sm text-gray-600 leading-relaxed mb-1">{w.explanation}</p>
                <p className="text-sm text-gray-700 italic">{w.watch_because}</p>
              </div>
            ))}
          </div>
        </BpoReportSection>
      )}

      {/* Section: What this means */}
      <BpoReportSection num="6" title="What This Likely Means Right Now">
        <p className="text-sm text-gray-600 leading-relaxed">{s6.synthesis}</p>
      </BpoReportSection>

      {/* Section: 90-Day Plan */}
      <BpoReportSection num="7" title="Your 90-Day BPO Leadership Action Plan">
        <div className="space-y-6">
          {s7.map((priority, i) => (
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
      </BpoReportSection>

      {/* Section: What to bring to leadership */}
      <BpoReportSection num="8" title="What to Bring to Leadership">
        <ul className="space-y-2 mb-4">
          {s8.talking_points.map((tp, i) => (
            <li key={i} className="text-sm text-gray-600 flex gap-2">
              <span style={{ color: "#0202ff" }}>•</span>
              {tp}
            </li>
          ))}
        </ul>
        <p className="text-sm font-semibold text-[#0a0a0a] mb-1">Suggested framing:</p>
        <p className="text-sm text-gray-600 italic">{s8.framing_sentence}</p>
      </BpoReportSection>

      {/* Section: Curiosity Led bridge */}
      <div className="bg-[#0a0a0a] rounded-xl p-6 mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: "#6C9EFF" }}>
          The Curiosity Led Bridge
        </p>
        <p className="text-sm text-gray-300 mb-3">{s9.sentence1}</p>
        <p className="text-sm text-gray-300 mb-3">{s9.sentence2}</p>
        <p className="text-sm text-white font-medium mb-6">{s9.sentence3}</p>
        <p className="text-sm text-gray-400 mb-5">
          On the call, we'll walk through your results together, help you make sense of the findings, and work with you to strategize implementation — at no cost.
        </p>
        <a
          href="https://cal.com/curiosityled/discoverycall?overlayCalendar=true"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-[#0a0a0a] text-sm transition-all hover:opacity-90 shadow-lg"
          style={{ backgroundColor: "#6C9EFF" }}
        >
          <Calendar className="w-4 h-4" />
          Schedule a Consultation With Us
        </a>
      </div>
    </motion.div>
  );
}

function BpoReportSection({ num, title, children }) {
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

function DayBlock({ label, text }) {
  return (
    <div>
      <p className="text-xs font-bold mb-1" style={{ color: "#0202ff" }}>{label}</p>
      <p className="text-sm text-gray-600">{text}</p>
    </div>
  );
}