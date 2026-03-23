import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { jsPDF } from 'npm:jspdf@2.5.1';

/**
 * Generates a professional PDF export of Leadership Index Assessment results
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { assessmentId } = await req.json();
        
        if (!assessmentId) {
            return Response.json({ success: false, error: 'assessmentId is required' }, { status: 400 });
        }

        // Fetch assessment
        const assessments = await base44.entities.Assessment.filter({ id: assessmentId, email: user.email });
        
        if (assessments.length === 0) {
            return Response.json({ success: false, error: 'Assessment not found' }, { status: 404 });
        }

        const assessment = assessments[0];
        
        // Create PDF
        const doc = new jsPDF();
        let yPosition = 20;
        
        // Header
        doc.setFontSize(24);
        doc.setTextColor(37, 99, 235); // Blue color
        doc.text('Leadership Assessment Results', 20, yPosition);
        
        yPosition += 15;
        doc.setFontSize(12);
        doc.setTextColor(75, 85, 99); // Gray color
        doc.text(`${user.full_name}`, 20, yPosition);
        yPosition += 7;
        doc.text(`Completed: ${new Date(assessment.submission_ts).toLocaleDateString()}`, 20, yPosition);
        
        // Overall Score Section
        yPosition += 15;
        doc.setFontSize(16);
        doc.setTextColor(17, 24, 39); // Dark gray
        doc.text('Overall Leadership Score', 20, yPosition);
        
        yPosition += 10;
        doc.setFontSize(32);
        doc.setTextColor(37, 99, 235);
        doc.text(`${assessment.overall_pct}%`, 20, yPosition);
        
        yPosition += 10;
        doc.setFontSize(12);
        doc.setTextColor(75, 85, 99);
        doc.text(`Archetype: ${assessment.archetype_label || 'N/A'}`, 20, yPosition);
        yPosition += 7;
        doc.text(`Proficiency Band: ${assessment.band_overall || 'N/A'}`, 20, yPosition);
        
        // Competency Scores
        yPosition += 15;
        doc.setFontSize(16);
        doc.setTextColor(17, 24, 39);
        doc.text('Competency Breakdown', 20, yPosition);
        
        yPosition += 10;
        doc.setFontSize(11);
        
        const competencies = [
            { name: 'Situational Intelligence', score: assessment.si_pct },
            { name: 'Decision-Making', score: assessment.dm_pct },
            { name: 'Communication', score: assessment.comm_pct },
            { name: 'Resource Management', score: assessment.rm_pct },
            { name: 'Stakeholder Management', score: assessment.sm_pct },
            { name: 'Performance Management', score: assessment.pm_pct }
        ];
        
        competencies.forEach(comp => {
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 20;
            }
            
            doc.setTextColor(75, 85, 99);
            doc.text(`${comp.name}:`, 20, yPosition);
            doc.setTextColor(37, 99, 235);
            doc.text(`${comp.score}%`, 120, yPosition);
            
            // Draw progress bar
            doc.setDrawColor(229, 231, 235); // Gray border
            doc.rect(140, yPosition - 3, 50, 5);
            doc.setFillColor(37, 99, 235); // Blue fill
            doc.rect(140, yPosition - 3, (50 * comp.score) / 100, 5, 'F');
            
            yPosition += 8;
        });
        
        // AI Insights (if available)
        if (assessment.record?.analysis) {
            yPosition += 10;
            if (yPosition > 250) {
                doc.addPage();
                yPosition = 20;
            }
            
            doc.setFontSize(16);
            doc.setTextColor(17, 24, 39);
            doc.text('Key Insights', 20, yPosition);
            
            yPosition += 10;
            doc.setFontSize(10);
            doc.setTextColor(75, 85, 99);
            
            const insights = assessment.record.analysis;
            if (insights.strengths) {
                doc.text('Strengths:', 20, yPosition);
                yPosition += 6;
                const strengthsText = doc.splitTextToSize(insights.strengths.join(', '), 170);
                doc.text(strengthsText, 20, yPosition);
                yPosition += strengthsText.length * 5 + 5;
            }
            
            if (insights.development_areas) {
                if (yPosition > 260) {
                    doc.addPage();
                    yPosition = 20;
                }
                doc.text('Development Areas:', 20, yPosition);
                yPosition += 6;
                const devText = doc.splitTextToSize(insights.development_areas.join(', '), 170);
                doc.text(devText, 20, yPosition);
                yPosition += devText.length * 5;
            }
        }
        
        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(156, 163, 175);
            doc.text(`Page ${i} of ${pageCount}`, 20, 285);
            doc.text('Generated by Curiosity Led', 150, 285);
        }
        
        const pdfBytes = doc.output('arraybuffer');
        
        return new Response(pdfBytes, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="leadership-assessment-${user.full_name.replace(/\s/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf"`
            }
        });
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        return Response.json({ 
            success: false, 
            error: 'Failed to generate PDF',
            details: error.message 
        }, { status: 500 });
    }
});