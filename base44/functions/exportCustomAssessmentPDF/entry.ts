import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { jsPDF } from 'npm:jspdf@2.5.1';

/**
 * Generates a PDF export for custom assessments, quizzes, and knowledge checks
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { submissionId } = await req.json();
        
        if (!submissionId) {
            return Response.json({ success: false, error: 'submissionId is required' }, { status: 400 });
        }

        // Fetch submission
        const submissions = await base44.entities.AssessmentSubmission.filter({ 
            id: submissionId, 
            user_email: user.email 
        });
        
        if (submissions.length === 0) {
            return Response.json({ success: false, error: 'Submission not found' }, { status: 404 });
        }

        const submission = submissions[0];
        
        // Fetch assessment details
        const assessments = await base44.entities.CustomAssessment.filter({ id: submission.assessment_id });
        if (assessments.length === 0) {
            return Response.json({ success: false, error: 'Assessment not found' }, { status: 404 });
        }
        
        const assessment = assessments[0];
        
        // Create PDF
        const doc = new jsPDF();
        let yPosition = 20;
        
        // Header
        doc.setFontSize(20);
        doc.setTextColor(37, 99, 235);
        doc.text(assessment.title, 20, yPosition);
        
        yPosition += 10;
        doc.setFontSize(10);
        doc.setTextColor(75, 85, 99);
        doc.text(`Type: ${assessment.type}`, 20, yPosition);
        yPosition += 7;
        doc.text(`Completed: ${new Date(submission.submission_date).toLocaleDateString()}`, 20, yPosition);
        yPosition += 7;
        doc.text(`User: ${user.full_name} (${user.email})`, 20, yPosition);
        
        // Score Section
        yPosition += 15;
        doc.setFontSize(16);
        doc.setTextColor(17, 24, 39);
        doc.text('Results', 20, yPosition);
        
        yPosition += 10;
        doc.setFontSize(24);
        const passedColor = submission.passed ? [34, 197, 94] : [239, 68, 68];
        doc.setTextColor(...passedColor);
        doc.text(`${submission.percentage || 0}%`, 20, yPosition);
        
        yPosition += 8;
        doc.setFontSize(11);
        doc.setTextColor(75, 85, 99);
        doc.text(`Score: ${submission.score || 0} / ${submission.max_score || 0}`, 20, yPosition);
        yPosition += 7;
        doc.text(`Status: ${submission.passed ? 'Passed' : 'Not Passed'}`, 20, yPosition);
        
        if (assessment.passing_score_percentage) {
            yPosition += 7;
            doc.text(`Passing Score: ${assessment.passing_score_percentage}%`, 20, yPosition);
        }
        
        // Responses
        if (submission.user_responses && submission.user_responses.length > 0) {
            yPosition += 15;
            doc.setFontSize(14);
            doc.setTextColor(17, 24, 39);
            doc.text('Question Responses', 20, yPosition);
            
            yPosition += 10;
            doc.setFontSize(10);
            
            submission.user_responses.forEach((response, index) => {
                if (yPosition > 260) {
                    doc.addPage();
                    yPosition = 20;
                }
                
                const question = assessment.config?.questions?.find(q => q.id === response.questionId);
                if (question) {
                    doc.setTextColor(17, 24, 39);
                    doc.setFont(undefined, 'bold');
                    doc.text(`Q${index + 1}:`, 20, yPosition);
                    doc.setFont(undefined, 'normal');
                    
                    const questionText = doc.splitTextToSize(question.text, 160);
                    doc.text(questionText, 30, yPosition);
                    yPosition += questionText.length * 5 + 3;
                    
                    // Show user's answer
                    doc.setTextColor(75, 85, 99);
                    doc.text('Your Answer:', 30, yPosition);
                    yPosition += 5;
                    
                    if (response.answerText) {
                        const answerText = doc.splitTextToSize(response.answerText, 150);
                        doc.text(answerText, 35, yPosition);
                        yPosition += answerText.length * 5;
                    } else if (response.chosenAnswerIds) {
                        response.chosenAnswerIds.forEach(answerId => {
                            const option = question.options?.find(o => o.id === answerId);
                            if (option) {
                                doc.text(`• ${option.text}`, 35, yPosition);
                                yPosition += 5;
                            }
                        });
                    }
                    
                    // Show if correct
                    if (response.isCorrect !== undefined) {
                        const correctText = response.isCorrect ? 'Correct ✓' : 'Incorrect ✗';
                        const correctColor = response.isCorrect ? [34, 197, 94] : [239, 68, 68];
                        doc.setTextColor(...correctColor);
                        doc.text(correctText, 30, yPosition);
                        yPosition += 5;
                    }
                    
                    if (response.pointsEarned !== undefined) {
                        doc.setTextColor(75, 85, 99);
                        doc.text(`Points: ${response.pointsEarned} / ${question.points}`, 30, yPosition);
                        yPosition += 5;
                    }
                    
                    yPosition += 5; // Space between questions
                }
            });
        }
        
        // Manual grading notes
        if (submission.manual_grading_notes) {
            if (yPosition > 250) {
                doc.addPage();
                yPosition = 20;
            }
            
            yPosition += 10;
            doc.setFontSize(14);
            doc.setTextColor(17, 24, 39);
            doc.text('Grading Notes', 20, yPosition);
            
            yPosition += 8;
            doc.setFontSize(10);
            doc.setTextColor(75, 85, 99);
            const notesText = doc.splitTextToSize(submission.manual_grading_notes, 170);
            doc.text(notesText, 20, yPosition);
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
                'Content-Disposition': `attachment; filename="${assessment.title.replace(/\s/g, '-')}-results.pdf"`
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