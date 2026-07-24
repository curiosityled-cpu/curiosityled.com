import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { jsPDF } from 'npm:jspdf@2.5.2';

const CONSTRUCT_LABELS_PDF = {
  signal_delay: "Signal Delay",
  support_friction: "Support Friction",
  proof_defensibility: "Proof & Defensibility",
  fragmentation_admin: "Fragmentation & Admin Burden",
  cost_of_inaction: "Cost of Inaction",
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let body = await req.json();
    // Handle wrapped payloads from different callers
    if (body.data) body = body.data;
    if (body.body) body = body.body;
    if (body.payload) body = body.payload;

    const {
      report,
      scores,
      lead_info,
      intake_answers,
      scored_responses,
      follow_up_answers,
    } = body;

    if (!report || !lead_info || !lead_info.email) {
      return Response.json(
        { error: "Missing required fields: report, lead_info, or lead_info.email" },
        { status: 400 }
      );
    }

    // ── Generate PDF ──
    const pdfBytes = generatePDF(report, scores, lead_info);

    // ── Upload PDF ──
    const fileName = `leadership-reboot-blueprint-${Date.now()}.pdf`;
    const file = new File([pdfBytes], fileName, { type: "application/pdf" });
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
    const pdf_url = uploadResult.file_url;

    // ── Send email via Resend ──
    let emailSent = false;
    let emailError = null;
    try {
      const pdfBase64 = arrayBufferToBase64(pdfBytes);
      const emailHtml = buildEmailHtml(lead_info, pdf_url);
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Curiosity Led <no-reply@curiosityled.com>",
          to: [lead_info.email],
          subject: "Your 90-Day Leadership Support Reboot Blueprint",
          html: emailHtml,
          attachments: [
            {
              filename: "leadership-reboot-blueprint.pdf",
              content: pdfBase64,
            },
          ],
        }),
      });
      if (emailResponse.ok) {
        emailSent = true;
      } else {
        emailError = await emailResponse.text();
      }
    } catch (e) {
      emailError = e.message;
    }

    // ── Create DiagnosticSession ──
    const session = await base44.asServiceRole.entities.DiagnosticSession.create({
      respondent_name: lead_info.name || "",
      intake_answers: intake_answers || {},
      scored_responses: scored_responses || {},
      follow_up_answers: follow_up_answers || {},
      construct_scores: scores?.constructScores || {},
      overall_score: scores?.overallScore || 0,
      overall_label: scores?.overallLabel || "",
      mer_score: scores?.merScore || 0,
      mer_label: scores?.merLabel || "",
      lsc_score: scores?.lscScore || 0,
      lsc_label: scores?.lscLabel || "",
      top_2_pressure_points: scores?.top2PressurePoints || [],
      blueprint_priorities: scores?.blueprintPriorities || [],
      report_json: report,
      pdf_url,
      status: "pdf_emailed",
      email_sent: emailSent,
    });

    // ── Create Prospect ──
    const prospect = await base44.asServiceRole.entities.Prospect.create({
      name: lead_info.name || "",
      email: lead_info.email,
      organization: lead_info.organization || "",
      phone: lead_info.phone || "",
      role: intake_answers?.area_of_focus || "Other",
      source: "offer_diagnostic",
      lead_status: "blueprint_sent",
      blueprint_sent_at: new Date().toISOString(),
      diagnostic_answers: {
        intake_answers,
        scored_responses,
        follow_up_answers,
        scores,
      },
    });

    // ── Link prospect to session ──
    if (prospect && prospect.id) {
      await base44.asServiceRole.entities.DiagnosticSession.update(session.id, {
        prospect_id: prospect.id,
      });
    }

    return Response.json({
      success: true,
      pdf_url,
      session_id: session.id,
      prospect_id: prospect?.id,
      email_sent: emailSent,
      email_error: emailError,
    });
  } catch (error) {
    console.error("generateDiagnosticReport error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ── PDF Generation ──
function generatePDF(report, scores, leadInfo) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;
  const brandBlue = "#0202ff";
  const darkText = [10, 10, 10];
  const grayText = [102, 102, 102];
  const lightGray = [230, 230, 230];

  let y = margin;

  // Helper: add text with wrapping
  function addText(text, fontSize, color, fontStyle, lineHeight, spacingAfter) {
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    doc.setFont("helvetica", fontStyle || "normal");
    const lines = doc.splitTextToSize(text, contentWidth);
    for (const line of lines) {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight || fontSize * 1.4;
    }
    y += spacingAfter || 10;
  }

  // Helper: add a section header
  function sectionHeader(num, title) {
    if (y > pageHeight - 100) {
      doc.addPage();
      y = margin;
    }
    doc.setFillColor(...hexToRgb(brandBlue));
    doc.rect(margin, y - 12, 4, 20, "F");
    doc.setFontSize(9);
    doc.setTextColor(...hexToRgb(brandBlue));
    doc.setFont("helvetica", "bold");
    doc.text(`SECTION ${num}`, margin + 12, y);
    y += 16;
    doc.setFontSize(16);
    doc.setTextColor(...darkText);
    doc.text(title, margin, y);
    y += 24;
  }

  // Helper: score badge
  function scoreBadge(score, label, x, y) {
    const badgeWidth = 120;
    const badgeHeight = 60;
    doc.setFillColor(245, 247, 255);
    doc.roundedRect(x, y, badgeWidth, badgeHeight, 6, 6, "F");
    doc.setFontSize(28);
    doc.setTextColor(...hexToRgb(brandBlue));
    doc.setFont("helvetica", "bold");
    doc.text(String(score), x + 10, y + 32);
    doc.setFontSize(9);
    doc.setTextColor(...grayText);
    doc.setFont("helvetica", "normal");
    doc.text(label, x + 10, y + 48);
  }

  // Horizontal 0-100 score bar. Returns the y after the bar.
  function scoreBar(score, x, y, width) {
    const barH = 8;
    const pct = Math.max(0, Math.min(100, score || 0)) / 100;
    doc.setFillColor(235, 238, 245);
    doc.roundedRect(x, y, width, barH, 4, 4, "F");
    doc.setFillColor(...hexToRgb(brandBlue));
    const fillW = pct > 0 ? Math.max(width * pct, 4) : 0;
    if (fillW > 0) doc.roundedRect(x, y, fillW, barH, 4, 4, "F");
    return y + barH;
  }

  // Helper: horizontal divider
  function divider() {
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 16;
  }

  // ── Page 1: Title + respondent context ──
  const s1 = report.section1_title_context;

  // Top brand bar
  doc.setFillColor(...hexToRgb(brandBlue));
  doc.rect(0, 0, pageWidth, 6, "F");

  y = 60;
  doc.setFontSize(11);
  doc.setTextColor(...hexToRgb(brandBlue));
  doc.setFont("helvetica", "bold");
  doc.text("CURIOSITY LED", margin, y);
  y += 16;
  doc.setFontSize(9);
  doc.setTextColor(...grayText);
  doc.setFont("helvetica", "normal");
  doc.text("LEADERSHIP SUPPORT DIAGNOSTIC", margin, y);
  y += 30;

  doc.setFontSize(24);
  doc.setTextColor(...darkText);
  doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(s1.title, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 30;

  doc.setFontSize(14);
  doc.setTextColor(...grayText);
  doc.setFont("helvetica", "normal");
  doc.text(s1.subtitle, margin, y);
  y += 30;

  divider();

  // Respondent context
  doc.setFontSize(10);
  doc.setTextColor(...grayText);
  doc.setFont("helvetica", "bold");
  doc.text("PREPARED FOR", margin, y);
  y += 16;

  doc.setFontSize(14);
  doc.setTextColor(...darkText);
  doc.text(leadInfo.name || "Respondent", margin, y);
  y += 20;

  const ctx = s1.respondent;
  const contextLines = [
    `Area of focus: ${ctx.area_of_focus || "Not specified"}`,
    `Populations in scope: ${ctx.populations_in_scope?.join(", ") || "Not specified"}`,
    `Organization size: ${ctx.organization_size || "Not specified"}`,
  ];
  if (ctx.urgent_population) {
    contextLines.push(`Most urgent population: ${ctx.urgent_population}`);
  }

  doc.setFontSize(11);
  doc.setTextColor(...grayText);
  doc.setFont("helvetica", "normal");
  for (const line of contextLines) {
    const wrapped = doc.splitTextToSize(line, contentWidth);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 16;
  }
  y += 20;

  // How to read this report
  const htrLines = (report.how_to_read || []).map((l) =>
    doc.splitTextToSize(`\u2022 ${l}`, contentWidth - 24)
  );
  const htrHeight = 24 + htrLines.reduce((a, l) => a + l.length * 12, 0) + 8;
  if (y > pageHeight - htrHeight - 40) { doc.addPage(); y = margin; }
  doc.setFillColor(245, 247, 255);
  doc.roundedRect(margin, y, contentWidth, htrHeight, 6, 6, "F");
  doc.setFontSize(10);
  doc.setTextColor(...hexToRgb(brandBlue));
  doc.setFont("helvetica", "bold");
  doc.text("HOW TO READ THIS REPORT", margin + 12, y + 18);
  doc.setFontSize(9);
  doc.setTextColor(...grayText);
  doc.setFont("helvetica", "normal");
  let hy = y + 32;
  for (const lines of htrLines) {
    doc.text(lines, margin + 12, hy);
    hy += lines.length * 12;
  }
  y += htrHeight + 14;
  if (report.criterion_note) {
    addText(report.criterion_note, 9, grayText, "italic", 12, 14);
  }

  // Overall score
  const s2 = report.section2_overall_result;
  doc.setFontSize(10);
  doc.setTextColor(...hexToRgb(brandBlue));
  doc.setFont("helvetica", "bold");
  doc.text("OVERALL SCORE", margin, y);
  y += 24;
  doc.setFontSize(34);
  doc.setTextColor(...darkText);
  doc.setFont("helvetica", "bold");
  doc.text(String(s2.score), margin, y);
  doc.setFontSize(13);
  doc.setTextColor(...grayText);
  doc.setFont("helvetica", "normal");
  doc.text("/100", margin + doc.getTextWidth(String(s2.score)) + 4, y - 6);
  y += 8;
  y = scoreBar(s2.score, margin, y, contentWidth);
  y += 10;
  doc.setFontSize(13);
  doc.setTextColor(...hexToRgb(brandBlue));
  doc.setFont("helvetica", "bold");
  doc.text(s2.label, margin, y);
  y += 18;
  if (s2.what_it_measures) addText(`What this measures: ${s2.what_it_measures}`, 10, grayText, "normal", 14, 6);
  if (s2.what_100_looks_like) addText(`What 100 looks like: ${s2.what_100_looks_like}`, 10, darkText, "normal", 14, 4);
  if (s2.what_low_means) addText(`What 0 means: ${s2.what_low_means}`, 10, grayText, "normal", 14, 10);

  // ── Section 2: Overall result ──
  if (y > pageHeight - 150) { doc.addPage(); y = margin; }
  addText(s2.interpretation, 11, grayText, "normal", 16, 8);
  if (s2.context_insert) {
    addText(`Context: ${s2.context_insert}`, 10, grayText, "italic", 14, 8);
  }

  // ── The Five Dimensions ──
  doc.addPage();
  y = margin;
  doc.setFillColor(...hexToRgb(brandBlue));
  doc.rect(margin, y - 12, 4, 20, "F");
  doc.setFontSize(16);
  doc.setTextColor(...darkText);
  doc.setFont("helvetica", "bold");
  doc.text("The Five Dimensions Measured", margin, y);
  y += 24;
  const bandLabels = (report.band_ranges || [])
    .map((b) => `${b.min}\u2013${b.max}: ${b.label}`)
    .join("     ");
  doc.setFontSize(9);
  doc.setTextColor(...grayText);
  doc.setFont("helvetica", "normal");
  doc.text(bandLabels, margin, y);
  y += 16;
  const constructDefs = report.score_definitions?.constructs || {};
  for (const key of Object.keys(scores.constructScores)) {
    if (y > pageHeight - 80) { doc.addPage(); y = margin; }
    const cscore = scores.constructScores[key];
    const cdef = constructDefs[key] || {};
    doc.setFontSize(12);
    doc.setTextColor(...darkText);
    doc.setFont("helvetica", "bold");
    doc.text(CONSTRUCT_LABELS_PDF[key] || key, margin, y);
    const scoreStr = `${cscore}/100`;
    doc.setFontSize(13);
    doc.text(scoreStr, pageWidth - margin - doc.getTextWidth(scoreStr), y);
    y += 6;
    y = scoreBar(cscore, margin, y, contentWidth);
    y += 6;
    if (cdef.measures) addText(cdef.measures, 10, grayText, "normal", 14, 10);
  }

  // ── Section 3: Manager Engagement Risk ──
  doc.addPage();
  y = margin;
  sectionHeader(3, "Manager Engagement Risk");
  const s3 = report.section3_manager_engagement_risk;
  const merDef = report.score_definitions?.derived?.manager_engagement_risk || {};
  doc.setFontSize(12);
  doc.setTextColor(...darkText);
  doc.setFont("helvetica", "bold");
  doc.text("Manager Engagement Risk", margin, y);
  const merStr = `${s3.score}/100`;
  doc.setFontSize(13);
  doc.text(merStr, pageWidth - margin - doc.getTextWidth(merStr), y);
  y += 6;
  y = scoreBar(s3.score, margin, y, contentWidth);
  y += 8;
  addText(s3.label, 13, hexToRgb(brandBlue), "bold", 18, 8);
  if (merDef.measures) addText(`What this measures: ${merDef.measures}`, 10, grayText, "normal", 14, 6);
  addText(s3.interpretation, 11, grayText, "normal", 16, 8);
  if (s3.friction_source) {
    addText(`Source of friction: ${s3.friction_source}`, 10, grayText, "italic", 14, 8);
  }

  // Leadership Story Coherence
  y += 10;
  const lsc = report.leadership_story_coherence;
  const lscDef = report.score_definitions?.derived?.leadership_story_coherence || {};
  doc.setFontSize(12);
  doc.setTextColor(...darkText);
  doc.setFont("helvetica", "bold");
  doc.text("Story Coherence", margin, y);
  const lscStr = `${lsc.score}/100`;
  doc.setFontSize(13);
  doc.text(lscStr, pageWidth - margin - doc.getTextWidth(lscStr), y);
  y += 6;
  y = scoreBar(lsc.score, margin, y, contentWidth);
  y += 8;
  addText(lsc.label, 13, hexToRgb(brandBlue), "bold", 18, 8);
  if (lscDef.measures) addText(`What this measures: ${lscDef.measures}`, 10, grayText, "normal", 14, 6);
  addText(lsc.interpretation, 11, grayText, "normal", 16, 8);

  // ── Section 4: Top 2 pressure points ──
  doc.addPage();
  y = margin;
  sectionHeader(4, "Top 2 Pressure Points");
  const s4 = report.section4_top_2_pressure_points;
  for (const pp of s4) {
    if (y > pageHeight - 120) { doc.addPage(); y = margin; }
    addText(pp.headline, 14, darkText, "bold", 20, 6);
    addText(`${pp.construct_label} \u2014 Score: ${pp.score} (${pp.band})`, 10, grayText, "normal", 14, 8);
    addText(pp.interpretation, 11, grayText, "normal", 16, 6);
    if (pp.specificity) {
      addText(pp.specificity, 10, darkText, "italic", 14, 6);
    }
    if (pp.why_for_you) {
      addText(`Why this rose to the top for you: ${pp.why_for_you}`, 10, hexToRgb(brandBlue), "bold", 14, 8);
    }
    if (pp.urgent_tie) {
      addText(pp.urgent_tie, 10, hexToRgb(brandBlue), "bold", 14, 10);
    }
    divider();
  }

  // ── Section 5: What this likely means right now ──
  if (y > pageHeight - 120) { doc.addPage(); y = margin; }
  sectionHeader(5, "What This Likely Means Right Now");
  addText(report.section5_what_this_means.synthesis, 11, grayText, "normal", 16, 8);

  // ── Section 6: 90-Day plan ──
  doc.addPage();
  y = margin;
  sectionHeader(6, "Your 90-Day Leadership Support Reboot Plan");
  const s6 = report.section6_90_day_plan;
  for (const priority of s6) {
    if (y > pageHeight - 160) { doc.addPage(); y = margin; }
    addText(`Priority ${priority.priority}: ${priority.title}`, 14, darkText, "bold", 20, 6);
    addText(priority.why_it_matters, 10, grayText, "italic", 14, 10);
    if (priority.why_for_you) {
      addText(`Why this is priority ${priority.priority} for you: ${priority.why_for_you}`, 10, hexToRgb(brandBlue), "bold", 14, 10);
    }

    addText("Days 1\u201330", 11, hexToRgb(brandBlue), "bold", 15, 4);
    addText(priority.days_1_30, 10, grayText, "normal", 14, 8);
    addText("Days 31\u201360", 11, hexToRgb(brandBlue), "bold", 15, 4);
    addText(priority.days_31_60, 10, grayText, "normal", 14, 8);
    addText("Days 61\u201390", 11, hexToRgb(brandBlue), "bold", 15, 4);
    addText(priority.days_61_90, 10, grayText, "normal", 14, 12);
    divider();
  }

  // ── Section 7: What to bring to leadership ──
  if (y > pageHeight - 140) { doc.addPage(); y = margin; }
  sectionHeader(7, "What to Bring to Leadership");
  const s7 = report.section7_what_to_bring_to_leadership;
  doc.setFontSize(10);
  doc.setTextColor(...grayText);
  doc.setFont("helvetica", "bold");
  doc.text("TALKING POINTS", margin, y);
  y += 16;
  for (const tp of s7.talking_points) {
    addText(`\u2022 ${tp}`, 11, darkText, "normal", 15, 6);
  }
  y += 6;
  addText("Suggested framing:", 10, grayText, "bold", 14, 4);
  addText(s7.framing_sentence, 11, darkText, "italic", 15, 10);

  // ── Section 8: Where implementation gets hard ──
  if (y > pageHeight - 120) { doc.addPage(); y = margin; }
  sectionHeader(8, "Where Implementation Usually Gets Hard");
  const s8 = report.section8_where_it_gets_hard;
  for (const bullet of s8.bullets) {
    addText(`\u2022 ${bullet}`, 11, grayText, "normal", 15, 8);
  }

  // ── Section 9: Curiosity Led bridge ──
  y += 10;
  if (y > pageHeight - 120) { doc.addPage(); y = margin; }
  sectionHeader(9, "The Curiosity Led Bridge");
  const s9 = report.section9_curiosity_led_bridge;
  addText(s9.sentence1, 11, grayText, "normal", 16, 6);
  addText(s9.sentence2, 11, grayText, "normal", 16, 6);
  addText(s9.sentence3, 11, darkText, "bold", 16, 10);

  // Consultant call CTA
  y += 6;
  if (y > pageHeight - 80) { doc.addPage(); y = margin; }
  const consultUrl = "https://cal.com/curiosityled/discoverycall?overlayCalendar=true";
  doc.setFontSize(12);
  doc.setTextColor(...hexToRgb(brandBlue));
  doc.setFont("helvetica", "bold");
  const ctaText = "Schedule a call with a consultant to review your results";
  doc.text(ctaText, margin, y);
  doc.link(margin, y - 12, doc.getTextWidth(ctaText), 16, { url: consultUrl });
  y += 18;
  doc.setFontSize(10);
  doc.setTextColor(...grayText);
  doc.setFont("helvetica", "normal");
  doc.text(consultUrl, margin, y);
  doc.link(margin, y - 12, doc.getTextWidth(consultUrl), 16, { url: consultUrl });
  y += 10;

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...lightGray);
    doc.setFont("helvetica", "normal");
    doc.text(
      "Curiosity Led \u00b7 Leadership Support Diagnostic \u00b7 Confidential",
      margin,
      pageHeight - 20
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 50, pageHeight - 20);
  }

  return doc.output("arraybuffer");
}

// ── Email HTML ──
function buildEmailHtml(leadInfo, pdfUrl) {
  return `
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #0a0a0a;">
        <div style="border-top: 4px solid #0202ff; padding-top: 30px;">
          <p style="font-size: 12px; font-weight: 600; letter-spacing: 0.15em; color: #0202ff; text-transform: uppercase;">Curiosity Led</p>
          <h1 style="font-size: 26px; font-weight: 700; margin: 16px 0 8px;">Your 90-Day Leadership Support Reboot Blueprint</h1>
          <p style="font-size: 16px; color: #666; margin: 0 0 24px;">Hi ${leadInfo.name || "there"},</p>
          <p style="font-size: 15px; line-height: 1.6; color: #444;">
            Your Leadership Reboot Diagnostic report is ready. Based on your answers, we've assembled a tailored 90-day plan covering your score, your top two growth blocks, and concrete next steps.
          </p>
          <div style="margin: 32px 0;">
            <a href="${pdfUrl}" download style="display: inline-block; background: #0202ff; color: #fff; font-weight: 600; font-size: 15px; padding: 14px 28px; border-radius: 8px; text-decoration: none;">
              Download My Blueprint (PDF)
            </a>
          </div>
          <p style="font-size: 14px; line-height: 1.6; color: #666;">
            The PDF is also attached to this email for your convenience. If you'd like to pressure-test the plan with our team, just reply to this email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
          <p style="font-size: 12px; color: #999;">
            Results are based on your answers and are not a promise of business performance.<br/>
            © 2026 Curiosity Led LLC · Leadership Support Diagnostic
          </p>
        </div>
      </body>
    </html>
  `;
}

// ── Utilities ──
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}