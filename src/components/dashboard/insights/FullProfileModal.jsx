import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  X, Download, Mail, Star, Target, Lightbulb, CheckCircle,
  Zap, Brain, Users, BarChart3, Loader2, Send, AlertTriangle,
  Eye, Sun, Coffee, Moon, TrendingUp, Layers, BookOpen, ChevronDown, ChevronUp
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip as RechartsTooltip,
} from "recharts";

// ── Helpers ───────────────────────────────────────────────────────────────────

const BAND_META = {
  Mastery:    { color: "bg-green-100 text-green-800",  bar: "bg-green-500",  label: "Mastery",    range: "80–100%" },
  Proficient: { color: "bg-blue-100 text-blue-800",    bar: "bg-blue-500",   label: "Proficient", range: "65–79%" },
  Developing: { color: "bg-amber-100 text-amber-800",  bar: "bg-amber-500",  label: "Developing", range: "50–64%" },
  Awareness:  { color: "bg-gray-100 text-gray-700",    bar: "bg-gray-400",   label: "Awareness",  range: "< 50%" },
};

function getBand(score) {
  if (score >= 80) return "Mastery";
  if (score >= 65) return "Proficient";
  if (score >= 50) return "Developing";
  return "Awareness";
}

const COMP_KEYS = [
  { key: "si_pct",   short: "SI",   full: "Situational Intelligence" },
  { key: "dm_pct",   short: "DM",   full: "Decision Making" },
  { key: "comm_pct", short: "Comm", full: "Communication" },
  { key: "rm_pct",   short: "RM",   full: "Resource Management" },
  { key: "sm_pct",   short: "SM",   full: "Stakeholder Management" },
  { key: "pm_pct",   short: "PM",   full: "Performance Management" },
];

// ── Section: Tab Navigation ───────────────────────────────────────────────────

const TABS = [
  { id: "overview",    label: "Overview",          icon: Brain },
  { id: "behavior",   label: "Behavioral Style",  icon: Users },
  { id: "stress",     label: "Stress Analysis",   icon: AlertTriangle },
  { id: "blindspots", label: "Blind Spots",        icon: Eye },
  { id: "practices",  label: "Daily Practices",    icon: Sun },
  { id: "plan",       label: "Development Plan",   icon: Target },
];

// ── Share Email Dialog ────────────────────────────────────────────────────────

function ShareEmailDialog({ open, onClose, user, assessment, report, onGeneratePdf }) {
  const [inputEmail, setInputEmail] = useState("");
  const [emails, setEmails] = useState([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const addEmail = () => {
    const trimmed = inputEmail.trim();
    if (!trimmed) return;
    if (!isValidEmail(trimmed)) { setError("Please enter a valid email address."); return; }
    if (emails.includes(trimmed)) { setError("This email is already added."); return; }
    setEmails(prev => [...prev, trimmed]);
    setInputEmail("");
    setError("");
  };

  const removeEmail = (e) => setEmails(prev => prev.filter(x => x !== e));

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addEmail(); }
  };

  const handleSend = async () => {
    const finalEmails = [...emails];
    const trimmed = inputEmail.trim();
    if (trimmed && isValidEmail(trimmed) && !finalEmails.includes(trimmed)) {
      finalEmails.push(trimmed);
    }
    if (!finalEmails.length) { setError("Add at least one email address."); return; }

    setSending(true);
    setError("");
    try {
      // Generate PDF as base64
      let pdf_base64 = null;
      if (onGeneratePdf) {
        pdf_base64 = await onGeneratePdf();
      }

      await base44.functions.invoke("shareLeadershipProfile", {
        to_emails: finalEmails,
        name: user?.full_name || "A leader",
        sender_name: user?.full_name || "A leader",
        overall: assessment?.overall_pct ?? "—",
        band: assessment?.band_overall || getBand(assessment?.overall_pct ?? 0),
        archetype: report?.archetype || assessment?.archetype_label || "",
        pdf_base64,
      });
      setSent(true);
      setEmails(finalEmails);
    } catch (e) {
      console.error("Share email failed:", e);
      setError("Failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setInputEmail(""); setEmails([]); setSent(false); setError("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-5 h-5 text-[#0012ff]" />
            <h2 className="font-semibold text-gray-900">Share Full Leadership Profile</h2>
          </div>
          {sent ? (
            <div className="py-6 text-center space-y-2">
              <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
              <p className="font-semibold text-gray-800">Profile sent!</p>
              <p className="text-sm text-gray-500">
                Full PDF report emailed to <strong>{emails.join(", ")}</strong>.
              </p>
              <Button className="mt-4" onClick={handleClose}>Done</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                The full profile PDF will be attached to the email. Add one or more recipients.
              </p>

              {/* Email chips */}
              {emails.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {emails.map(e => (
                    <span key={e} className="flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-full px-3 py-1">
                      {e}
                      <button onClick={() => removeEmail(e)} className="hover:text-red-500 ml-1">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="colleague@company.com"
                  value={inputEmail}
                  onChange={e => { setInputEmail(e.target.value); setError(""); }}
                  onKeyDown={handleKeyDown}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0012ff]/30"
                />
                <Button variant="outline" size="sm" onClick={addEmail} type="button">Add</Button>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <p className="text-xs text-gray-400">Press Enter or comma to add multiple recipients.</p>

              <div className="flex gap-2 justify-end pt-1">
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button
                  disabled={(!emails.length && !inputEmail.trim()) || sending}
                  onClick={handleSend}
                  style={{ backgroundColor: '#0012ff' }}
                  className="text-white"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                  {sending ? "Sending…" : "Send PDF"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Section Components ────────────────────────────────────────────────────────

function SectionHeading({ icon: Icon, title, color = "text-[#0012ff]", bg = "bg-blue-50" }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className={`p-2 rounded-lg ${bg}`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <h3 className="text-base font-bold text-gray-900">{title}</h3>
    </div>
  );
}

function OverviewTab({ report, assessment, user }) {
  const overall = assessment?.overall_pct ?? 0;
  const band = assessment?.band_overall || getBand(overall);
  const compRows = COMP_KEYS.map(c => ({ ...c, score: assessment?.[c.key] ?? 0, band: getBand(assessment?.[c.key] ?? 0) }));
  const BENCHMARKS = { si_pct: 68, dm_pct: 70, comm_pct: 72, rm_pct: 71, sm_pct: 72, pm_pct: 69 };
  const radarData = compRows.map(c => ({ competency: c.short, score: c.score, benchmark: BENCHMARKS[c.key], fullName: c.full }));

  return (
    <div className="space-y-6">
      {/* Hero scores */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-6 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
        <div className="flex-1">
          <div className="flex items-baseline gap-3 mb-1">
            <span className="text-5xl font-extrabold" style={{ color: '#0012ff' }}>{overall}%</span>
            <Badge className={`${BAND_META[band]?.color || "bg-gray-100 text-gray-700"} text-sm px-3 py-1`}>{band}</Badge>
          </div>
          <p className="text-gray-500 text-sm mb-1">Overall Leadership Index</p>
          {report?.leadership_dna?.description && (
            <p className="mt-3 text-gray-700 leading-relaxed text-sm italic border-l-4 border-[#0012ff]/40 pl-3">
              "{report.leadership_dna.description}"
            </p>
          )}
        </div>
        <div className="h-48 w-full sm:w-56 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="competency" tick={{ fontSize: 11, fill: "#0012ff", fontWeight: 600 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="Benchmark" dataKey="benchmark" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.08} strokeDasharray="4 3" strokeWidth={1.5} />
              <Radar name="Your Score" dataKey="score" stroke="#0012ff" fill="#0012ff" fillOpacity={0.25} strokeWidth={2} />
              <RechartsTooltip formatter={(v, n, p) => [`${v}%`, n === "Your Score" ? p.payload.fullName : `${p.payload.fullName} Benchmark`]} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Leadership DNA */}
      <div>
        <SectionHeading icon={Brain} title="Your Leadership DNA" />
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 mb-4">
          <Badge className="bg-[#0012ff] text-white text-sm px-3 mb-3">{report?.archetype || assessment?.archetype_label}</Badge>
          <p className="text-gray-600 text-sm italic font-medium mb-2">"{report?.leadership_dna?.headline}"</p>
          <p className="text-gray-700 text-sm leading-relaxed">{report?.leadership_dna?.unique_value}</p>
        </div>
      </div>

      {/* Competency Detail */}
      <div>
        <SectionHeading icon={BarChart3} title="Competencies" />
        <CompetenciesTab report={report} assessment={assessment} />
      </div>
    </div>
  );
}

function BehaviorTab({ report }) {
  const bp = report?.behavioral_patterns;
  if (!bp) return <p className="text-gray-500 text-sm">No behavioral data available.</p>;

  return (
    <div className="space-y-6">
      <div>
        <SectionHeading icon={Brain} title="How You Make Decisions" />
        <p className="text-gray-700 text-sm leading-relaxed mb-4">{bp.decision_making}</p>
        {bp.decision_questions?.length > 0 && (
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-3">Questions you naturally ask</p>
            <ul className="space-y-2">
              {bp.decision_questions.map((q, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-[#0012ff] font-bold mt-0.5">›</span> "{q}"
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div>
        <SectionHeading icon={Users} title="Your Communication Style" color="text-purple-600" bg="bg-purple-50" />
        <p className="text-gray-700 text-sm leading-relaxed mb-4">{bp.communication_style}</p>
        {bp.communication_phrases?.length > 0 && (
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
            <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider mb-3">Phrases you might use</p>
            <ul className="space-y-2">
              {bp.communication_phrases.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-purple-500 font-bold mt-0.5">›</span> "{p}"
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {bp.daily_approach?.length > 0 && (
        <div>
          <SectionHeading icon={Layers} title="Leadership Approach" color="text-teal-600" bg="bg-teal-50" />
          <div className="space-y-3">
            {bp.daily_approach.map((item, i) => (
              <div key={i} className="flex gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-32 shrink-0">
                  <span className="text-sm font-semibold text-gray-800">{item.label}</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StressTab({ report }) {
  const sa = report?.stress_analysis;
  if (!sa) return <p className="text-gray-500 text-sm">No stress analysis available.</p>;

  return (
    <div className="space-y-6">
      <div>
        <SectionHeading icon={AlertTriangle} title="What Triggers Your Stress" color="text-red-600" bg="bg-red-50" />
        <div className="space-y-3">
          {sa.triggers?.map((t, i) => (
            <div key={i} className="p-4 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-sm font-semibold text-red-800 mb-1">{t.title}</p>
              <p className="text-sm text-gray-600 leading-relaxed">{t.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionHeading icon={TrendingUp} title="How Stress Shows Up in Your Behavior" color="text-amber-600" bg="bg-amber-50" />
        <div className="space-y-4">
          {[
            { label: "Early Stage", items: sa.early_stage, color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-100" },
            { label: "Moderate Stage", items: sa.moderate_stage, color: "text-orange-700", bg: "bg-orange-50 border-orange-100" },
            { label: "High Stage", items: sa.high_stage, color: "text-red-700", bg: "bg-red-50 border-red-100" },
          ].map(({ label, items, color, bg }) => (
            <div key={label} className={`p-4 rounded-xl border ${bg}`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${color}`}>{label}</p>
              <ul className="space-y-1.5">
                {items?.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-50" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {sa.recovery_strategies?.length > 0 && (
        <div>
          <SectionHeading icon={CheckCircle} title="Your Stress Recovery Strategies" color="text-green-600" bg="bg-green-50" />
          <div className="space-y-3">
            {sa.recovery_strategies.map((s, i) => (
              <div key={i} className="flex gap-4 p-4 bg-green-50 border border-green-100 rounded-xl">
                <span className="w-7 h-7 rounded-full bg-green-500 text-white text-sm font-bold flex items-center justify-center shrink-0">{s.number || i + 1}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{s.title}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BlindSpotsTab({ report }) {
  const bs = report?.blind_spots;
  if (!bs) return <p className="text-gray-500 text-sm">No blind spot analysis available.</p>;

  return (
    <div className="space-y-6">
      {[
        { data: bs.primary, icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100", tagBg: "bg-orange-100 text-orange-800" },
        { data: bs.secondary, icon: Eye, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", tagBg: "bg-amber-100 text-amber-800" },
      ].map(({ data, icon: Icon, color, bg, border, tagBg }, idx) => {
        if (!data) return null;
        return (
          <div key={idx} className={`rounded-xl border ${border} overflow-hidden`}>
            <div className={`px-5 py-4 ${bg}`}>
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 ${color} mt-0.5 shrink-0`} />
                <div>
                  <p className="text-sm font-bold text-gray-900">{data.title}</p>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed"><span className="font-semibold">Why this happens:</span> {data.why_it_happens}</p>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 grid sm:grid-cols-2 gap-5 bg-white">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">How It Shows Up</p>
                <ul className="space-y-1.5">
                  {data.how_it_shows_up?.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Practical Solutions</p>
                <ul className="space-y-1.5">
                  {data.solutions?.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PracticesTab({ report }) {
  const dp = report?.daily_practices;
  if (!dp) return <p className="text-gray-500 text-sm">No daily practices available.</p>;

  const sections = [
    { label: "Planning", icon: Sun, items: dp.morning, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", time: "5 minutes" },
    { label: "Mid-Day Check-In", icon: Coffee, items: dp.midday, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100", time: "3 minutes" },
    { label: "Evening Reflection", icon: Moon, items: dp.evening, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100", time: "5 minutes" },
  ];

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500 leading-relaxed">
        These daily micro-practices are tailored to your <strong>{report?.archetype}</strong> archetype. Consistent small actions compound into significant leadership growth.
      </p>
      {sections.map(({ label, icon: Icon, items, color, bg, border, time }) => (
        <div key={label} className={`rounded-xl border ${border} overflow-hidden`}>
          <div className={`px-5 py-3 ${bg} flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="font-semibold text-sm text-gray-800">{label}</span>
            </div>
            <span className="text-xs text-gray-500">{time}</span>
          </div>
          <ul className="px-5 py-4 space-y-2.5 bg-white">
            {items?.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function CompetenciesTab({ report, assessment }) {
  const insights = report?.competency_insights;
  if (!insights?.length) return <p className="text-gray-500 text-sm">No competency insights available.</p>;

  return (
    <div className="space-y-4">
      {insights.map((c, i) => {
        const band = getBand(c.score);
        const meta = BAND_META[band] || BAND_META.Awareness;
        return (
          <div key={i} className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">{c.competency}</span>
              <div className="flex items-center gap-2">
                <Badge className={`${meta.color} text-xs`}>{band}</Badge>
                <span className="font-bold text-sm" style={{ color: '#0012ff' }}>{c.score}%</span>
              </div>
            </div>
            <div className="px-5 pt-2 pb-1 bg-white">
              <Progress value={c.score} className="h-2 mb-3" />
              <div className="grid sm:grid-cols-2 gap-4 pb-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">What This Means</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{c.strength_narrative}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Growth Opportunity</p>
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                    {c.growth_area}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DevelopmentPlanTab({ report }) {
  const plan = report?.development_plan;
  if (!plan?.length) return <p className="text-gray-500 text-sm">No development plan available.</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 leading-relaxed">
        Your personalized development plan is tailored to your current competency levels and <strong>{report?.archetype}</strong> leadership style. Focus on 1–2 areas at a time for maximum impact.
      </p>
      {plan.map((item, i) => {
        const compInfo = COMP_KEYS.find(c => c.full === item.competency);
        const insightComp = report?.competency_insights?.find(c => c.competency === item.competency);
        const score = insightComp?.score ?? 0;
        const band = getBand(score);
        const meta = BAND_META[band];
        return (
          <div key={i} className="rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#0012ff]/10 rounded-lg">
                  <BookOpen className="w-4 h-4 text-[#0012ff]" />
                </div>
                <span className="font-semibold text-sm text-gray-900">{item.competency}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`${meta?.color} text-xs`}>{band}</Badge>
                <span className="text-sm font-bold" style={{ color: '#0012ff' }}>{score}%</span>
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1.5">Actionable Steps</p>
              <p className="text-sm text-gray-700 leading-relaxed">{item.actionable_steps}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────

export default function FullProfileModal({ open, onClose, user, assessment, insight, narrative, assessmentId, preloadedReport }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [showShare, setShowShare] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);

  const targetAssessmentId = assessmentId || assessment?.id;

  // Sync preloadedReport into state whenever it arrives (may arrive after mount)
  useEffect(() => {
    if (preloadedReport) {
      setReport(preloadedReport);
    }
  }, [preloadedReport]);

  // Only fetch/generate if we have no preloaded report and the modal is open
  useEffect(() => {
    if (open && targetAssessmentId && !preloadedReport && !report) {
      loadOrGenerateReport();
    }
  }, [open, targetAssessmentId]);

  const loadOrGenerateReport = async () => {
    setReportLoading(true);
    setReportError(null);
    try {
      // No cached report — invoke the backend to generate it (slow, first time only)
      const response = await base44.functions.invoke("generateLeadershipProfile", {
        assessment_id: targetAssessmentId
      });
      setReport(response.data?.report || null);
    } catch (e) {
      console.error("Failed to load leadership profile:", e);
      setReportError("Unable to generate your profile report. Please try again.");
    } finally {
      setReportLoading(false);
    }
  };

  if (!assessment) return null;

  const overall = assessment.overall_pct ?? 0;
  const band = assessment.band_overall || getBand(overall);
  const name = user?.full_name || "Leader";

  // Returns base64 string (for sharing) or triggers download (for saving)
  const buildPDF = async (returnBase64 = false) => {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = 210; const margin = 16; const pageH = 297;
      const maxY = pageH - 20;

      const checkPage = (y, needed = 15) => {
        if (y + needed > maxY) { doc.addPage(); return 20; }
        return y;
      };

      // Header
      doc.setFillColor(0, 18, 255);
      doc.rect(0, 0, W, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20); doc.setFont("helvetica", "bold");
      doc.text("Leadership Full Profile Report", margin, 15);
      doc.setFontSize(12); doc.setFont("helvetica", "normal");
      doc.text(name, margin, 24);
      if (user?.current_role) doc.text(user.current_role + (user?.sector ? ` · ${user.sector}` : ""), margin, 31);
      doc.setFontSize(24); doc.setFont("helvetica", "bold");
      doc.text(`${overall}%`, W - margin, 20, { align: "right" });
      doc.setFontSize(9); doc.setFont("helvetica", "normal");
      doc.text(`Leadership Index · ${band}`, W - margin, 28, { align: "right" });
      if (report?.archetype || assessment?.archetype_label) {
        doc.setFontSize(10);
        doc.text(`Archetype: ${report?.archetype || assessment?.archetype_label}`, W - margin, 35, { align: "right" });
      }

      let y = 50;
      doc.setTextColor(30, 30, 30);

      // Section helper
      const sectionTitle = (title, yPos) => {
        doc.setFillColor(240, 244, 255);
        doc.rect(margin - 2, yPos - 4, W - margin * 2 + 4, 10, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(0, 18, 255);
        doc.text(title, margin, yPos + 2);
        doc.setTextColor(30, 30, 30);
        return yPos + 10;
      };

      const bodyText = (text, yPos, maxW = W - margin * 2, size = 9) => {
        doc.setFont("helvetica", "normal"); doc.setFontSize(size); doc.setTextColor(60, 60, 60);
        const lines = doc.splitTextToSize(text, maxW);
        doc.text(lines, margin, yPos);
        return yPos + lines.length * (size * 0.45) + 3;
      };

      // 1. Leadership DNA
      y = sectionTitle("1. Your Leadership DNA", y);
      if (report?.leadership_dna?.headline) {
        doc.setFont("helvetica", "italic"); doc.setFontSize(10); doc.setTextColor(0, 18, 255);
        doc.text(`"${report.leadership_dna.headline}"`, margin, y); y += 7;
        doc.setTextColor(30, 30, 30);
      }
      if (report?.leadership_dna?.unique_value) y = bodyText(report.leadership_dna.unique_value, y);
      if (report?.leadership_dna?.description) {
        doc.setFont("helvetica", "italic"); doc.setTextColor(80, 80, 80);
        const lines = doc.splitTextToSize(`"${report.leadership_dna.description}"`, W - margin * 2);
        doc.text(lines, margin, y); y += lines.length * 4 + 5;
        doc.setTextColor(30, 30, 30);
      }
      y += 4;

      // 2. Competency Scores
      y = checkPage(y, 60);
      y = sectionTitle("2. Competency Scores", y);
      COMP_KEYS.forEach(c => {
        y = checkPage(y, 12);
        const score = assessment[c.key] ?? 0;
        const b = getBand(score);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, y, W - margin * 2, 9, 1, 1, "F");
        doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(30, 30, 30);
        doc.text(c.full, margin + 3, y + 5.5);
        doc.setFont("helvetica", "bold"); doc.setTextColor(0, 18, 255);
        doc.text(`${score}%`, W - margin - 20, y + 5.5, { align: "right" });
        doc.setFont("helvetica", "normal"); doc.setTextColor(120, 120, 120);
        doc.text(b, W - margin - 3, y + 5.5, { align: "right" });
        y += 11;
      });
      y += 4;

      // 3. Behavioral Patterns
      if (report?.behavioral_patterns) {
        y = checkPage(y, 30);
        y = sectionTitle("3. Natural Behavioral Patterns", y);
        if (report.behavioral_patterns.decision_making) y = bodyText(`Decision Making: ${report.behavioral_patterns.decision_making}`, y);
        if (report.behavioral_patterns.communication_style) y = bodyText(`Communication Style: ${report.behavioral_patterns.communication_style}`, y);
        y += 4;
      }

      // 4. Stress Analysis
      if (report?.stress_analysis?.triggers?.length) {
        y = checkPage(y, 30);
        y = sectionTitle("4. Stress Analysis", y);
        report.stress_analysis.triggers.slice(0, 3).forEach(t => {
          y = checkPage(y, 12);
          doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(180, 30, 30);
          doc.text(t.title, margin, y); y += 5;
          y = bodyText(t.detail, y);
        });
        y += 4;
      }

      // 5. Blind Spots
      if (report?.blind_spots) {
        y = checkPage(y, 40);
        y = sectionTitle("5. Blind Spot Analysis", y);
        [report.blind_spots.primary, report.blind_spots.secondary].forEach(bs => {
          if (!bs) return;
          y = checkPage(y, 25);
          doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(200, 80, 0);
          doc.text(bs.title, margin, y); y += 5;
          y = bodyText(bs.why_it_happens, y);
          y += 3;
        });
        y += 2;
      }

      // 6. Daily Practices
      if (report?.daily_practices) {
        y = checkPage(y, 40);
        y = sectionTitle("6. Daily Practices", y);
        [{ label: "Planning (5 min)", items: report.daily_practices.morning }, { label: "Mid-Day (3 min)", items: report.daily_practices.midday }, { label: "Evening (5 min)", items: report.daily_practices.evening }].forEach(({ label, items }) => {
          if (!items?.length) return;
          y = checkPage(y, 20);
          doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(0, 18, 255);
          doc.text(label, margin, y); y += 5;
          items.forEach(item => {
            y = checkPage(y, 8);
            y = bodyText(`• ${item}`, y);
          });
          y += 3;
        });
      }

      // 7. Development Plan
      if (report?.development_plan?.length) {
        y = checkPage(y, 30);
        y = sectionTitle("7. Personalized Development Plan", y);
        report.development_plan.forEach(item => {
          y = checkPage(y, 18);
          doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(30, 30, 30);
          doc.text(item.competency, margin, y); y += 5;
          y = bodyText(item.actionable_steps, y);
          y += 3;
        });
      }

      // Footer on all pages
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setTextColor(160, 160, 160);
        doc.text(`Generated ${new Date().toLocaleDateString()} · Curiosity Led Leadership Platform · Page ${i} of ${totalPages}`, margin, pageH - 8);
      }

      if (returnBase64) {
        return doc.output("datauristring").split(",")[1]; // base64 only
      } else {
        doc.save(`${name.replace(/ /g, "_")}_Full_Leadership_Profile.pdf`);
      }
  };

  const handlePDF = async () => {
    setPdfLoading(true);
    try {
      await buildPDF(false);
    } catch (e) {
      console.error("PDF generation error:", e);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleGeneratePdfForShare = async () => {
    try {
      return await buildPDF(true);
    } catch (e) {
      console.error("PDF for share failed:", e);
      return null;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden p-0 flex flex-col">
          {/* Header */}
          <div className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between shrink-0"
            style={{ background: "linear-gradient(to right, #0012ff, #3b30ff)" }}>
            <div>
              <h2 className="text-lg font-bold text-white">Full Leadership Profile Report</h2>
              <p className="text-indigo-200 text-sm">{name}{user?.current_role ? ` · ${user.current_role}` : ""} · {overall}% · {band}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/20"
                onClick={() => setShowShare(true)}>
                <Mail className="w-4 h-4 mr-1" /> Share
              </Button>
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/20"
                onClick={handlePDF} disabled={pdfLoading || !report}>
                {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
                Save PDF
              </Button>
              <button onClick={onClose} className="text-white/70 hover:text-white ml-1">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="shrink-0 border-b border-gray-200 bg-white overflow-x-auto">
            <div className="flex min-w-max px-4">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                      isActive ? "border-[#0012ff] text-[#0012ff]" : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {reportLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-[#0012ff]" />
                <div className="text-center">
                  <p className="font-semibold text-gray-800">Generating your full leadership profile…</p>
                  <p className="text-sm text-gray-500 mt-1">Our AI is analyzing your archetype and scores. This takes about 15–20 seconds the first time.</p>
                </div>
              </div>
            ) : reportError ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                <AlertTriangle className="w-10 h-10 text-red-400" />
                <p className="text-gray-700">{reportError}</p>
                <Button onClick={loadOrGenerateReport} style={{ backgroundColor: '#0012ff' }} className="text-white">
                  Try Again
                </Button>
              </div>
            ) : (
              <>
                {activeTab === "overview"     && <OverviewTab report={report} assessment={assessment} user={user} />}
                {activeTab === "behavior"     && <BehaviorTab report={report} />}
                {activeTab === "stress"       && <StressTab report={report} />}
                {activeTab === "blindspots"   && <BlindSpotsTab report={report} />}
                {activeTab === "practices"    && <PracticesTab report={report} />}
                {activeTab === "plan"         && <DevelopmentPlanTab report={report} />}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ShareEmailDialog
        open={showShare}
        onClose={() => setShowShare(false)}
        user={user}
        assessment={assessment}
        report={report}
        onGeneratePdf={handleGeneratePdfForShare}
      />
    </>
  );
}