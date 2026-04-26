import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  X, Download, Mail, Star, Target, Lightbulb, CheckCircle,
  Zap, Brain, Users, BarChart3, Loader2, Send,
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

const COMP_LABELS = {
  si_pct:   { short: "SI",   full: "Situational Intelligence",
    disc: "You read situations accurately and adapt your leadership style to the context — a hallmark of the 'S/C' dimension in personality frameworks." },
  dm_pct:   { short: "DM",   full: "Decision Making",
    disc: "You demonstrate clarity and conviction under pressure, aligning with decisive 'D'-type leadership patterns." },
  comm_pct: { short: "Comm", full: "Communication",
    disc: "You influence through clear, compelling messaging — strongly associated with high 'I' (Influence) behavioral styles." },
  rm_pct:   { short: "RM",   full: "Resource Management",
    disc: "You optimize people, budgets and time efficiently, a core trait of 'C' (Conscientiousness) leadership profiles." },
  sm_pct:   { short: "SM",   full: "Stakeholder Management",
    disc: "You build trust and navigate relationships adeptly — reflecting 'S' (Steadiness) and high relational intelligence." },
  pm_pct:   { short: "PM",   full: "Performance Management",
    disc: "You drive accountability and results, mirroring the outcome-orientation of high 'D' behavioral patterns." },
};

const ARCHETYPE_INSIGHTS = {
  default: {
    type: "Leadership Style",
    description: "Your profile reflects a balanced leadership approach with distinctive strengths across multiple competency domains.",
    disc_parallel: "Your competency pattern mirrors DISC profiles where situational awareness and relationship management are prioritised alongside task execution.",
    mbti_parallel: "Leaders with this profile often exhibit ENTJ or INTJ tendencies — systematic, strategic, and results-oriented with strong interpersonal awareness.",
    principles_parallel: "In Principles You terms, you likely score high on 'Conceptual' thinking and 'Reliable' follow-through, with growth opportunity in adaptive flexibility.",
  }
};

function getArchetypeInsight(archetypeLabel) {
  if (!archetypeLabel) return ARCHETYPE_INSIGHTS.default;
  return {
    type: archetypeLabel,
    description: `The ${archetypeLabel} archetype represents leaders who lead with both strategic clarity and interpersonal fluency.`,
    disc_parallel: "This archetype aligns most closely with high-I/D DISC profiles — energising teams while driving outcomes with conviction.",
    mbti_parallel: "ENTP or ENFJ types frequently share this archetype's blend of visionary communication and decisive action.",
    principles_parallel: "In Principles You terms, this profile scores high on 'Influential' and 'Driven' dimensions, with natural 'Collaborative' tendencies.",
  };
}

// ── Share Email Dialog ────────────────────────────────────────────────────────

function ShareEmailDialog({ open, onClose, user, assessment, insight }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) return;
    setSending(true);
    try {
      const name = user?.full_name || "A leader";
      const overall = assessment?.overall_pct ?? "—";
      const archetype = insight?.archetype || assessment?.archetype_label || "—";
      const band = assessment?.band_overall || getBand(overall);

      await base44.integrations.Core.SendEmail({
        to: email.trim(),
        subject: `${name}'s Leadership Profile`,
        body: `
<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
  <h1 style="color:#0012ff;font-size:22px;margin-bottom:4px;">Leadership Profile — ${name}</h1>
  <p style="color:#6b7280;font-size:14px;margin-top:0;">${user?.current_role || ""}${user?.sector ? " · " + user.sector : ""}</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
  <h2 style="font-size:16px;color:#111827;">Leadership Index: <span style="color:#0012ff;">${overall}%</span> — ${band}</h2>
  ${archetype !== "—" ? `<p style="color:#374151;font-size:14px;"><strong>Archetype:</strong> ${archetype}</p>` : ""}
  <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:13px;">
    <tr style="background:#f9fafb;"><th style="text-align:left;padding:8px 12px;color:#6b7280;">Competency</th><th style="text-align:right;padding:8px 12px;color:#6b7280;">Score</th><th style="text-align:right;padding:8px 12px;color:#6b7280;">Level</th></tr>
    ${[
      ["Situational Intelligence", assessment?.si_pct],
      ["Decision Making",         assessment?.dm_pct],
      ["Communication",           assessment?.comm_pct],
      ["Resource Management",     assessment?.rm_pct],
      ["Stakeholder Management",  assessment?.sm_pct],
      ["Performance Management",  assessment?.pm_pct],
    ].map(([label, score]) => score != null
      ? `<tr><td style="padding:8px 12px;border-top:1px solid #f3f4f6;">${label}</td><td style="padding:8px 12px;border-top:1px solid #f3f4f6;text-align:right;font-weight:600;">${score}%</td><td style="padding:8px 12px;border-top:1px solid #f3f4f6;text-align:right;color:#6b7280;">${getBand(score)}</td></tr>`
      : ""
    ).join("")}
  </table>
  <p style="font-size:12px;color:#9ca3af;margin-top:32px;">Shared via Curiosity Led Leadership Development Platform</p>
</div>`.trim(),
      });
      setSent(true);
    } catch (e) {
      console.error("Share email failed:", e);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#0012ff]" /> Share Profile
          </DialogTitle>
        </DialogHeader>
        {sent ? (
          <div className="py-6 text-center space-y-2">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
            <p className="font-semibold text-gray-800">Profile sent!</p>
            <p className="text-sm text-gray-500">A summary was emailed to <strong>{email}</strong>.</p>
            <Button className="mt-4" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-gray-500">Enter an email address to share this leadership profile summary.</p>
            <input
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0012ff]/30"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                disabled={!email.trim() || sending}
                onClick={handleSend}
                style={{ backgroundColor: '#0012ff' }}
                className="text-white"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                Send
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────

export default function FullProfileModal({ open, onClose, user, assessment, insight, narrative }) {
  const [showShare, setShowShare] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const printRef = useRef(null);

  if (!assessment) return null;

  const archInfo = getArchetypeInsight(insight?.archetype || assessment?.archetype_label);
  const overall  = assessment.overall_pct ?? 0;
  const band     = assessment.band_overall || getBand(overall);
  const name     = user?.full_name || "Leader";

  const compRows = [
    { key: "si_pct",   ...COMP_LABELS.si_pct },
    { key: "dm_pct",   ...COMP_LABELS.dm_pct },
    { key: "comm_pct", ...COMP_LABELS.comm_pct },
    { key: "rm_pct",   ...COMP_LABELS.rm_pct },
    { key: "sm_pct",   ...COMP_LABELS.sm_pct },
    { key: "pm_pct",   ...COMP_LABELS.pm_pct },
  ].map(c => ({ ...c, score: assessment[c.key] ?? 0, band: getBand(assessment[c.key] ?? 0) }));

  const BENCHMARKS = { si_pct: 68, dm_pct: 70, comm_pct: 72, rm_pct: 71, sm_pct: 72, pm_pct: 69 };
  const radarData = compRows.map(c => ({
    competency: c.short, score: c.score, benchmark: BENCHMARKS[c.key], fullName: c.full,
  }));

  const strengths = insight?.top_strengths?.length
    ? insight.top_strengths
    : compRows.sort((a, b) => b.score - a.score).slice(0, 3).map(c => `${c.full} (${c.score}%)`);

  const devAreas = insight?.development_areas?.length
    ? insight.development_areas
    : [...compRows].sort((a, b) => a.score - b.score).slice(0, 3).map(c => `${c.full} (${c.score}%)`);

  const summary = insight?.summary || narrative;

  const handlePDF = async () => {
    setPdfLoading(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = 210; const margin = 16; const colW = (W - margin * 2) / 2;

      // Header band
      doc.setFillColor(0, 18, 255);
      doc.rect(0, 0, W, 36, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18); doc.setFont("helvetica", "bold");
      doc.text("Leadership Full Profile", margin, 14);
      doc.setFontSize(11); doc.setFont("helvetica", "normal");
      doc.text(name, margin, 22);
      if (user?.current_role) doc.text(user.current_role + (user?.sector ? ` · ${user.sector}` : ""), margin, 29);
      doc.setFontSize(22); doc.setFont("helvetica", "bold");
      doc.text(`${overall}%`, W - margin - 20, 20, { align: "right" });
      doc.setFontSize(9); doc.setFont("helvetica", "normal");
      doc.text(`Leadership Index · ${band}`, W - margin, 27, { align: "right" });

      let y = 44;
      doc.setTextColor(30, 30, 30);

      // Archetype
      if (archInfo.type) {
        doc.setFontSize(11); doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 18, 255);
        doc.text(`Archetype: ${archInfo.type}`, margin, y); y += 6;
        doc.setTextColor(80, 80, 80); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
        const descLines = doc.splitTextToSize(archInfo.description, W - margin * 2);
        doc.text(descLines, margin, y); y += descLines.length * 4 + 4;
      }

      // Narrative
      if (summary) {
        doc.setFontSize(9); doc.setFont("helvetica", "italic"); doc.setTextColor(60, 60, 60);
        const narLines = doc.splitTextToSize(`"${summary}"`, W - margin * 2);
        doc.text(narLines, margin, y); y += narLines.length * 4 + 6;
      }

      // Competency table
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(30, 30, 30);
      doc.text("Competency Breakdown", margin, y); y += 5;

      compRows.forEach((c) => {
        doc.setFillColor(245, 247, 250);
        doc.roundedRect(margin, y, W - margin * 2, 10, 2, 2, "F");
        doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(30, 30, 30);
        doc.text(c.full, margin + 3, y + 6.5);
        doc.setFont("helvetica", "bold");
        doc.text(`${c.score}%`, W - margin - 3, y + 6.5, { align: "right" });
        doc.setFont("helvetica", "normal"); doc.setTextColor(120, 120, 120);
        doc.text(c.band, W - margin - 20, y + 6.5, { align: "right" });
        y += 12;
      });

      y += 4;

      // Style parallels
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(30, 30, 30);
      doc.text("Behavioral Style Parallels", margin, y); y += 5;

      [
        ["DISC Parallel",          archInfo.disc_parallel],
        ["MBTI Parallel",          archInfo.mbti_parallel],
        ["Principles You Parallel",archInfo.principles_parallel],
      ].forEach(([label, text]) => {
        doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(0, 18, 255);
        doc.text(label, margin, y); y += 4;
        doc.setFont("helvetica", "normal"); doc.setTextColor(60, 60, 60);
        const lines = doc.splitTextToSize(text, W - margin * 2);
        doc.text(lines, margin, y); y += lines.length * 4 + 4;
      });

      // Footer
      doc.setFontSize(8); doc.setTextColor(160, 160, 160);
      doc.text(`Generated ${new Date().toLocaleDateString()} · Curiosity Led Leadership Platform`, margin, 290);

      doc.save(`${name.replace(/ /g, "_")}_Leadership_Profile.pdf`);
    } catch (e) {
      console.error("PDF generation error:", e);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          {/* Header */}
          <div className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between"
            style={{ background: "linear-gradient(to right, #0012ff, #3b30ff)" }}>
            <div>
              <h2 className="text-lg font-bold text-white">Full Leadership Profile</h2>
              <p className="text-indigo-200 text-sm">{name}{user?.current_role ? ` · ${user.current_role}` : ""}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/20"
                onClick={() => setShowShare(true)}>
                <Mail className="w-4 h-4 mr-1" /> Share
              </Button>
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/20"
                onClick={handlePDF} disabled={pdfLoading}>
                {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
                Save PDF
              </Button>
              <button onClick={onClose} className="text-white/70 hover:text-white ml-1">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div ref={printRef} className="p-6 space-y-8">

            {/* ── Section 1: Leadership Index ── */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="text-5xl font-extrabold" style={{ color: '#0012ff' }}>{overall}%</span>
                  <Badge className={`${BAND_META[band]?.color || "bg-gray-100 text-gray-700"} text-sm px-3 py-1`}>
                    {band}
                  </Badge>
                </div>
                <p className="text-gray-500 text-sm">Overall Leadership Index</p>
                {summary && (
                  <p className="mt-3 text-gray-600 leading-relaxed text-sm italic border-l-4 border-[#0012ff]/30 pl-3">
                    "{summary}"
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

            {/* ── Section 2: Archetype & Style Parallels (DISC/MBTI/PY) ── */}
            <div>
              <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-indigo-600" /> Leadership Archetype & Style Profile
              </h3>
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-[#0012ff] text-white text-sm px-3">{archInfo.type}</Badge>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">{archInfo.description}</p>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { icon: <Users className="w-4 h-4 text-purple-600" />, bg: "bg-purple-50 border-purple-100", label: "DISC Parallel",           text: archInfo.disc_parallel },
                  { icon: <Brain className="w-4 h-4 text-teal-600" />,   bg: "bg-teal-50 border-teal-100",     label: "MBTI Parallel",           text: archInfo.mbti_parallel },
                  { icon: <Zap className="w-4 h-4 text-amber-600" />,    bg: "bg-amber-50 border-amber-100",   label: "Principles You Parallel", text: archInfo.principles_parallel },
                ].map(({ icon, bg, label, text }) => (
                  <div key={label} className={`rounded-xl border p-4 ${bg}`}>
                    <div className="flex items-center gap-2 mb-2 font-semibold text-sm text-gray-800">
                      {icon} {label}
                    </div>
                    <p className="text-gray-600 text-xs leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Section 3: Competency Deep-Dive ── */}
            <div>
              <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#0012ff]" /> Competency Deep-Dive
              </h3>
              <div className="space-y-3">
                {compRows.map(c => {
                  const meta = BAND_META[c.band] || BAND_META.Awareness;
                  return (
                    <div key={c.key} className="rounded-xl border border-gray-100 p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-gray-800">{c.full}</span>
                        <div className="flex items-center gap-2">
                          <Badge className={`${meta.color} text-xs`}>{c.band}</Badge>
                          <span className="font-bold text-sm" style={{ color: '#0012ff' }}>{c.score}%</span>
                        </div>
                      </div>
                      <Progress value={c.score} className="h-2 mb-2" />
                      <p className="text-xs text-gray-500 leading-relaxed">{c.disc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Section 4: Strengths & Development Focus ── */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-green-600" /> Natural Strengths
                </h3>
                <ul className="space-y-2">
                  {strengths.slice(0, 4).map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600" /> Development Focus
                </h3>
                <ul className="space-y-2">
                  {devAreas.slice(0, 4).map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ── Section 5: Proficiency Band Guide ── */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-3">Proficiency Band Guide</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(BAND_META).map(([band, meta]) => (
                  <div key={band} className={`rounded-lg border px-3 py-2 ${meta.color.replace("text-", "border-").replace("bg-", "border-").split(" ")[0]} bg-white border-gray-100`}>
                    <div className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mb-1 ${meta.color}`}>{meta.label}</div>
                    <p className="text-xs text-gray-500">{meta.range}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-center text-xs text-gray-400 pt-2 border-t border-gray-100">
              Generated {new Date().toLocaleDateString()} · Curiosity Led Leadership Development Platform
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <ShareEmailDialog
        open={showShare}
        onClose={() => setShowShare(false)}
        user={user}
        assessment={assessment}
        insight={insight}
      />
    </>
  );
}