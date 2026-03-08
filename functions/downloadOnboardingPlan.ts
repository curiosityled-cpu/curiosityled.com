import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { jsPDF } from 'npm:jspdf@2.5.1';

/**
 * Generates a professional PDF export of an Onboarding Plan with progress tracking
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { planId } = await req.json();

        if (!planId) {
            return Response.json({ 
                success: false, 
                error: 'planId is required' 
            }, { status: 400 });
        }

        // Fetch the onboarding plan
        const plans = await base44.entities.OnboardingPlan.filter({ id: planId });
        
        if (plans.length === 0) {
            return Response.json({ 
                success: false, 
                error: 'Onboarding plan not found' 
            }, { status: 404 });
        }

        const plan = plans[0];

        // Authorization check - can only download if you're the assignee, assigner, or admin
        const isAuthorized = 
            plan.assigned_to_email === user.email ||
            plan.assigned_by === user.email ||
            plan.created_by === user.email ||
            ['Admin Level 1', 'Admin Level 2', 'Admin Level 3'].includes(user.app_role);

        if (!isAuthorized) {
            return Response.json({ 
                success: false, 
                error: 'Unauthorized - You do not have permission to download this plan' 
            }, { status: 403 });
        }

        // Create PDF
        const doc = new jsPDF();
        let yPos = 20;
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 20;
        const maxWidth = pageWidth - (margin * 2);

        // Helper function to add new page if needed
        const checkPageBreak = (neededSpace = 20) => {
            if (yPos + neededSpace > pageHeight - margin) {
                doc.addPage();
                yPos = margin;
                return true;
            }
            return false;
        };

        // Helper function for text wrapping
        const addWrappedText = (text, x, y, maxWidth, fontSize = 10) => {
            doc.setFontSize(fontSize);
            const lines = doc.splitTextToSize(text, maxWidth);
            doc.text(lines, x, y);
            return lines.length * (fontSize * 0.5); // Return height used
        };

        // Header
        doc.setFontSize(24);
        doc.setTextColor(30, 64, 175); // Blue
        doc.text('Onboarding Plan', margin, yPos);
        yPos += 10;

        // Plan Title
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        const titleHeight = addWrappedText(plan.title || 'Untitled Plan', margin, yPos, maxWidth, 16);
        yPos += titleHeight + 5;

        // Metadata
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        
        const metadata = [
            `Role: ${plan.target_role || 'Not specified'}`,
            `Duration: ${plan.duration_days || 'N/A'} days`,
            `Status: ${plan.status || 'draft'}`,
            `Progress: ${plan.completion_percentage || 0}%`,
            `Assigned to: ${plan.assigned_to_email || 'Unassigned'}`,
            `Assigned by: ${plan.assigned_by || plan.created_by || 'Unknown'}`,
            `Generated: ${new Date().toLocaleDateString()}`
        ];

        metadata.forEach(line => {
            doc.text(line, margin, yPos);
            yPos += 5;
        });

        yPos += 5;

        // Description
        if (plan.description) {
            checkPageBreak(30);
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text('Description:', margin, yPos);
            yPos += 7;
            
            doc.setFontSize(10);
            doc.setTextColor(60, 60, 60);
            const descHeight = addWrappedText(plan.description, margin, yPos, maxWidth, 10);
            yPos += descHeight + 10;
        }

        // Overall Progress Bar
        checkPageBreak(20);
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('Overall Progress', margin, yPos);
        yPos += 7;

        const progressBarWidth = maxWidth;
        const progressBarHeight = 8;
        const progressPercentage = plan.completion_percentage || 0;

        // Progress bar background
        doc.setFillColor(230, 230, 230);
        doc.rect(margin, yPos, progressBarWidth, progressBarHeight, 'F');

        // Progress bar fill
        doc.setFillColor(59, 130, 246); // Blue
        doc.rect(margin, yPos, (progressBarWidth * progressPercentage / 100), progressBarHeight, 'F');

        // Progress percentage text
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`${progressPercentage}%`, margin + progressBarWidth + 5, yPos + 6);
        yPos += progressBarHeight + 15;

        // Milestones
        if (plan.milestones && plan.milestones.length > 0) {
            checkPageBreak(20);
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text('Milestones', margin, yPos);
            yPos += 10;

            // Group by phase
            const phases = [...new Set(plan.milestones.map(m => m.phase))].filter(Boolean);
            
            if (phases.length > 0) {
                phases.forEach((phase, phaseIndex) => {
                    const phaseMilestones = plan.milestones.filter(m => m.phase === phase);
                    const phaseLabel = phaseMilestones[0]?.phase_label || phase;

                    checkPageBreak(30);
                    
                    // Phase header
                    doc.setFontSize(12);
                    doc.setTextColor(100, 100, 100);
                    doc.text(phaseLabel, margin, yPos);
                    yPos += 7;

                    // Phase milestones
                    phaseMilestones.forEach((milestone, idx) => {
                        checkPageBreak(25);

                        // Checkbox (completed or not)
                        const checkboxSize = 4;
                        if (milestone.status === 'completed') {
                            doc.setFillColor(34, 197, 94); // Green
                            doc.rect(margin, yPos - 3, checkboxSize, checkboxSize, 'F');
                            doc.setDrawColor(34, 197, 94);
                            doc.setLineWidth(0.5);
                            // Checkmark
                            doc.line(margin + 1, yPos - 1, margin + 2, yPos);
                            doc.line(margin + 2, yPos, margin + 4, yPos - 3);
                        } else {
                            doc.setDrawColor(200, 200, 200);
                            doc.setLineWidth(0.5);
                            doc.rect(margin, yPos - 3, checkboxSize, checkboxSize);
                        }

                        // Milestone title
                        doc.setFontSize(10);
                        doc.setTextColor(0, 0, 0);
                        const titleText = `${milestone.title}`;
                        const titleHeight = addWrappedText(titleText, margin + checkboxSize + 3, yPos, maxWidth - checkboxSize - 3, 10);
                        
                        // Milestone details
                        doc.setFontSize(8);
                        doc.setTextColor(120, 120, 120);
                        const details = [];
                        if (milestone.due_day) details.push(`Day ${milestone.due_day}`);
                        if (milestone.type) details.push(milestone.type);
                        
                        if (details.length > 0) {
                            doc.text(details.join(' • '), margin + checkboxSize + 3, yPos + titleHeight + 2);
                        }

                        yPos += Math.max(titleHeight + 8, 12);
                    });

                    yPos += 5; // Space between phases
                });
            } else {
                // No phases, list all milestones
                plan.milestones.forEach((milestone) => {
                    checkPageBreak(20);

                    const checkboxSize = 4;
                    if (milestone.status === 'completed') {
                        doc.setFillColor(34, 197, 94);
                        doc.rect(margin, yPos - 3, checkboxSize, checkboxSize, 'F');
                    } else {
                        doc.setDrawColor(200, 200, 200);
                        doc.rect(margin, yPos - 3, checkboxSize, checkboxSize);
                    }

                    doc.setFontSize(10);
                    doc.setTextColor(0, 0, 0);
                    const titleHeight = addWrappedText(milestone.title, margin + checkboxSize + 3, yPos, maxWidth - checkboxSize - 3, 10);
                    
                    yPos += Math.max(titleHeight + 5, 10);
                });
            }
        }

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
            `Generated by Curiosity Led on ${new Date().toLocaleDateString()}`,
            margin,
            pageHeight - 10
        );

        // Generate PDF
        const pdfBytes = doc.output('arraybuffer');

        return new Response(pdfBytes, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="onboarding-plan-${plan.title?.replace(/\s+/g, '-') || 'plan'}-${new Date().toISOString().split('T')[0]}.pdf"`
            }
        });

    } catch (error) {
        console.error('Error generating PDF:', error);
        return Response.json({ 
            success: false, 
            error: error.message || 'Failed to generate PDF' 
        }, { status: 500 });
    }
});