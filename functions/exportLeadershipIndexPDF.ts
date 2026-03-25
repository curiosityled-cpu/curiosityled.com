import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { submissionId } = await req.json();

    if (!submissionId) {
      return Response.json({ error: 'Submission ID required' }, { status: 400 });
    }

    // Fetch submission data
    const submissions = await base44.entities.AssessmentSubmission.filter({ id: submissionId });
    if (!submissions || submissions.length === 0) {
      return Response.json({ error: 'Submission not found' }, { status: 404 });
    }

    const submission = submissions[0];
    const doc = new jsPDF();
    
    let yPos = 20;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const contentWidth = pageWidth - (2 * margin);

    // Helper to add new page if needed
    const checkPageBreak = (needed = 20) => {
      if (yPos + needed > pageHeight - margin) {
        doc.addPage();
        yPos = 20;
        return true;
      }
      return false;
    };

    // Header
    doc.setFontSize(24);
    doc.setTextColor(66, 66, 66);
    doc.text('Leadership Index Assessment', margin, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setTextColor(128, 128, 128);
    doc.text('Comprehensive Leadership Profile Report', margin, yPos);
    yPos += 15;

    // Participant Info
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Participant: ${submission.user_email}`, margin, yPos);
    yPos += 6;
    doc.text(`Leadership Level: ${submission.leadership_level || 'N/A'}`, margin, yPos);
    yPos += 6;
    doc.text(`Sector: ${submission.sector || 'N/A'}`, margin, yPos);
    yPos += 6;
    doc.text(`Assessment Date: ${new Date(submission.submission_date || submission.created_date).toLocaleDateString()}`, margin, yPos);
    yPos += 15;

    // Overall Proficiency Section
    checkPageBreak(40);
    doc.setFillColor(240, 240, 255);
    doc.rect(margin, yPos, contentWidth, 35, 'F');
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Overall Proficiency', margin + 5, yPos + 10);
    
    const proficiency = submission.proficiency_scores?.overall_proficiency || 0;
    const benchmark = submission.proficiency_scores?.overall_benchmark || 0;
    const band = submission.proficiency_scores?.proficiency_band || 'N/A';
    
    doc.setFontSize(32);
    doc.setTextColor(67, 56, 202);
    doc.text(`${proficiency.toFixed(2)}`, margin + 5, yPos + 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`/ 4.0`, margin + 30, yPos + 25);
    doc.text(`Benchmark: ${benchmark.toFixed(2)}`, margin + 5, yPos + 32);
    
    doc.setFontSize(12);
    doc.setTextColor(67, 56, 202);
    doc.text(`${band}`, pageWidth - margin - 40, yPos + 20);
    
    yPos += 45;

    // Performance Summary
    if (submission.proficiency_scores?.performance_summary) {
      checkPageBreak(30);
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      const summaryLines = doc.splitTextToSize(submission.proficiency_scores.performance_summary, contentWidth - 10);
      doc.text(summaryLines, margin + 5, yPos);
      yPos += (summaryLines.length * 6) + 10;
    }

    // Leadership Archetype
    if (submission.leadership_style_profile?.primary_style) {
      checkPageBreak(50);
      doc.setFillColor(250, 240, 255);
      doc.rect(margin, yPos, contentWidth, 45, 'F');
      
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Leadership Archetype', margin + 5, yPos + 10);
      
      doc.setFontSize(18);
      doc.setTextColor(147, 51, 234);
      doc.text(submission.leadership_style_profile.primary_style, margin + 5, yPos + 22);
      
      if (submission.leadership_style_profile.style_description) {
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        const styleLines = doc.splitTextToSize(submission.leadership_style_profile.style_description, contentWidth - 10);
        doc.text(styleLines, margin + 5, yPos + 30);
      }
      
      yPos += 55;
    }

    // Competency Scores
    checkPageBreak(60);
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Competency Proficiency Scores', margin, yPos);
    yPos += 10;

    const competencyScores = submission.proficiency_scores?.competency_scores || {};
    for (const [compName, compData] of Object.entries(competencyScores)) {
      checkPageBreak(25);
      
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.text(compName, margin, yPos);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`${compData.proficiency_level?.toFixed(2) || 'N/A'} / 4.0`, margin + 90, yPos);
      
      const gapColor = compData.gap > 0.3 ? [34, 197, 94] : compData.gap < -0.3 ? [239, 68, 68] : [59, 130, 246];
      doc.setTextColor(...gapColor);
      doc.text(compData.gap_label || 'N/A', margin + 130, yPos);
      
      // Progress bar
      const barWidth = 60;
      const barHeight = 4;
      const barX = pageWidth - margin - barWidth;
      const fillWidth = (compData.proficiency_level / 4) * barWidth;
      
      doc.setFillColor(220, 220, 220);
      doc.rect(barX, yPos - 3, barWidth, barHeight, 'F');
      doc.setFillColor(67, 56, 202);
      doc.rect(barX, yPos - 3, fillWidth, barHeight, 'F');
      
      yPos += 8;
    }
    
    yPos += 10;

    // Style Strengths
    if (submission.leadership_style_profile?.style_strengths?.length > 0) {
      checkPageBreak(40);
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Style Strengths', margin, yPos);
      yPos += 8;
      
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      submission.leadership_style_profile.style_strengths.forEach((strength) => {
        checkPageBreak(8);
        doc.text(`• ${strength}`, margin + 5, yPos);
        yPos += 6;
      });
      yPos += 8;
    }

    // Development Areas
    if (submission.leadership_style_profile?.style_development_areas?.length > 0) {
      checkPageBreak(40);
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Development Considerations', margin, yPos);
      yPos += 8;
      
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      submission.leadership_style_profile.style_development_areas.forEach((area) => {
        checkPageBreak(8);
        doc.text(`• ${area}`, margin + 5, yPos);
        yPos += 6;
      });
      yPos += 8;
    }

    // Development Insights
    if (submission.development_insights?.length > 0) {
      checkPageBreak(40);
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Personalized Development Insights', margin, yPos);
      yPos += 10;
      
      submission.development_insights.forEach((insight, idx) => {
        checkPageBreak(35);
        
        doc.setFillColor(255, 248, 240);
        doc.rect(margin, yPos, contentWidth, 30, 'F');
        
        doc.setFontSize(11);
        doc.setTextColor(67, 56, 202);
        doc.text(`${idx + 1}. ${insight.competency_name}`, margin + 5, yPos + 8);
        
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        
        if (insight.observation) {
          const obsLines = doc.splitTextToSize(`Observation: ${insight.observation}`, contentWidth - 10);
          doc.text(obsLines, margin + 5, yPos + 15);
          yPos += obsLines.length * 4;
        }
        
        if (insight.recommendation) {
          const recLines = doc.splitTextToSize(`Recommendation: ${insight.recommendation}`, contentWidth - 10);
          doc.text(recLines, margin + 5, yPos + 15);
          yPos += recLines.length * 4;
        }
        
        yPos += 15;
      });
    }

    // Footer
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      doc.text('Generated by Curiosity Led Leadership Platform', pageWidth / 2, pageHeight - 5, { align: 'center' });
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=leadership-index-${submission.user_email.replace('@', '-')}-${new Date().toISOString().split('T')[0]}.pdf`
      }
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});