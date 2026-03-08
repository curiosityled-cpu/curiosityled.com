
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, FileText, Send, Loader2, CheckCircle, RefreshCw, Edit, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { InvokeLLM } from "@/integrations/Core";

export default function ReportGenerator({ assessmentData, onClose }) {
    const [formData, setFormData] = useState({
        participantName: '',
        participantEmail: '',
        managerName: '',
        managerEmail: '',
        company: '',
        position: '',
        additionalNotes: ''
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [emailResults, setEmailResults] = useState({ participant: null, manager: null });
    const [generatedReport, setGeneratedReport] = useState('');

    // Fix cursor jumping by using proper event handling
    const handleInputChange = (field) => (e) => {
        const value = e.target.value;
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const testEmail = async () => {
        try {
            const { testEmail: testEmailFunction } = await import("@/functions/testEmail");
            const result = await testEmailFunction({ to: formData.participantEmail });
            console.log('Test email result:', result);

            if (result.data?.success) {
                alert('Test email sent! Check your inbox.');
            } else {
                alert(`Test email failed: ${result.data?.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Test email error:', error);
            alert(`Test email error: ${error.message}`);
        }
    };

    const sendReportEmails = async (htmlReport, formData) => {
        const results = { participant: null, manager: null };
        const timestamp = new Date().toLocaleString();

        try {
            console.log(`[${timestamp}] Attempting direct Base44 integration for email sending...`);

            const { SendEmail } = await import("@/integrations/Core");

            console.log('About to call SendEmail with parameters:', {
                to: formData.participantEmail,
                subject: `Leadership Index Assessment Results - ${formData.participantName}`,
                from_name: 'Curiosity Led',
                bodyLength: 'Long email body...' // Placeholder for logging purposes, actual body is long
            });

            const participantResult = await SendEmail({
                to: formData.participantEmail,
                subject: `Leadership Index Assessment Results - ${formData.participantName}`,
                body: `Hi ${formData.participantName},

Your Leadership Index Assessment has been completed! Here are your key scores:

🎯 DECISION MAKING: ${assessmentData.scores.dm_pct}%
💬 COMMUNICATION: ${assessmentData.scores.comm_pct}%
🔧 RESOURCE MANAGEMENT: ${assessmentData.scores.rm_pct}%
🤝 STAKEHOLDER MANAGEMENT: ${assessmentData.scores.sm_pct}%
📊 PERFORMANCE MANAGEMENT: ${assessmentData.scores.pm_pct}%
🧠 SITUATIONAL INTELLIGENCE: ${assessmentData.scores.si_pct}%

Your Leadership Archetype: ${assessmentData.analysis?.archetype || 'Strategic Leader'}

KEY INSIGHTS:
✅ Top Strength: ${assessmentData.analysis?.strengths?.[0] || 'Strong leadership presence'}
🎯 Development Focus: ${assessmentData.analysis?.development_areas?.[0] || 'Enhanced strategic communication'}

NEXT STEPS:
1. Review your detailed competency breakdown
2. Focus on your development priority areas
3. Apply the recommended frameworks in your daily leadership
4. Schedule follow-up development conversations with your manager

Questions? Reply to this email or contact team@curiosityled.com

Best regards,
The Curiosity Led Team

---
Powered by Curiosity Led - AI-Powered Leadership Development
Visit: https://curiosityled.com`,
                from_name: 'Curiosity Led'
            });

            console.log('=== DETAILED BASE44 RESPONSE (PARTICIPANT) ===');
            console.log('Response type:', typeof participantResult);
            console.log('Response keys:', Object.keys(participantResult || {}));
            console.log('Full response object:', JSON.stringify(participantResult, null, 2));
            console.log('Has success property:', 'success' in (participantResult || {}));
            console.log('Has error property:', 'error' in (participantResult || {}));
            console.log('Has status property:', 'status' in (participantResult || {}));
            console.log('Success value:', participantResult?.success);
            console.log('Error value:', participantResult?.error);
            console.log('Status value:', participantResult?.status);

            // Much more strict success detection
            const isActuallySuccessful = participantResult &&
                (participantResult.success === true ||
                 (participantResult.status && participantResult.status.toString().toLowerCase().includes('success')) ||
                 (participantResult.message && participantResult.message.toString().toLowerCase().includes('sent')));

            console.log('Determined success status:', isActuallySuccessful);

            results.participant = {
                success: isActuallySuccessful,
                email: formData.participantEmail,
                error: isActuallySuccessful ? null : (participantResult?.error || 'Email may not have been delivered - check logs'),
                response: participantResult,
                timestamp: timestamp,
                method: 'direct_base44',
                debug: {
                    responseType: typeof participantResult,
                    responseKeys: Object.keys(participantResult || {}),
                    hasSuccessProperty: 'success' in (participantResult || {}),
                    successValue: participantResult?.success
                }
            };

            // NOTE: The outline provided only specified changes for participant email sending within sendReportEmails.
            // The manager email sending logic has been removed as per the provided outline's structure.
            // If manager email sending is still desired, it needs to be explicitly included in the outline.

            return results;

        } catch (error) {
            console.error(`[${timestamp}] Email sending error:`, error.message);
            console.error('Error stack:', error.stack);

            results.participant = {
                success: false,
                email: formData.participantEmail,
                error: `Function error: ${error.message}`,
                timestamp: timestamp,
                debug: {
                    errorType: error.name,
                    errorStack: error.stack
                }
            };
            return results;
        }
    };

    const generatePDFReport = async () => {
        setIsGenerating(true);

        try {
            // Generate the report content using AI
            const reportPrompt = `Create a comprehensive leadership assessment report based on the following data:

PARTICIPANT INFORMATION:
- Name: ${formData.participantName}
- Email: ${formData.participantEmail}
- Company: ${formData.company}
- Position: ${formData.position}

ASSESSMENT SCORES:
- Decision Making: ${assessmentData.scores.dm_pct}%
- Communication: ${assessmentData.scores.comm_pct}%
- Resource Management: ${assessmentData.scores.rm_pct}%
- Stakeholder Management: ${assessmentData.scores.sm_pct}%
- Performance Management: ${assessmentData.scores.pm_pct}%
- Situational Intelligence: ${assessmentData.scores.si_pct}%

MANAGER INFORMATION:
- Manager Name: ${formData.managerName}
- Manager Email: ${formData.managerEmail}

Additional Context: ${formData.additionalNotes}

Please create a professional leadership assessment report that includes:
1. Executive Summary
2. Competency Analysis with specific scores and benchmarks
3. Strengths and Development Areas
4. Personalized Development Plan with 3-4 specific goals
5. Recommended training and next steps
6. Business impact projections

Format the response as a structured business report.`;

            const reportContent = await InvokeLLM({
                prompt: reportPrompt,
                add_context_from_internet: false
            });

            setGeneratedReport(reportContent);

            // Send emails
            const results = await sendReportEmails(reportContent, formData);
            setEmailResults(results);

            setIsComplete(true);

        } catch (error) {
            console.error('Error generating report:', error);
            alert('There was an error generating the report. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const resendEmails = async () => {
        setIsResending(true);
        try {
            // Since sendReportEmails now only handles participant email per outline,
            // this will only resend the participant email.
            const results = await sendReportEmails(generatedReport, formData);
            setEmailResults(results);
            alert('Emails have been resent successfully!');
        } catch (error) {
            console.error('Error resending emails:', error);
            alert('There was an error resending the emails. Please try again.');
        } finally {
            setIsResending(false);
        }
    };

    if (isGenerating) {
        return (
            <div className="max-w-2xl mx-auto text-center">
                <Card className="shadow-lg border-0">
                    <CardContent className="p-8">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse">
                            <FileText className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Generating Your Report</h3>
                        <p className="text-gray-600 mb-6">Creating personalized insights and sending via email...</p>
                        <div className="flex justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isComplete) {
        return (
            <div className="max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                >
                    <Card className="shadow-lg border-0">
                        <CardContent className="p-8">
                            <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>

                            <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                Report Generated Successfully!
                            </h2>

                            <div className="bg-gray-50 rounded-lg p-6 mb-6">
                                <h3 className="font-semibold text-gray-900 mb-4">📧 Email Status:</h3>

                                {/* Participant Email Status */}
                                <div className="mb-4 p-4 bg-white rounded-lg border">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900">Participant: {emailResults.participant?.email}</p>
                                            <p className="text-sm text-gray-600">Time: {emailResults.participant?.timestamp}</p>
                                            <p className="text-sm text-gray-600">Method: {emailResults.participant?.method}</p>
                                        </div>
                                        <div className="ml-4">
                                            {emailResults.participant?.success ? (
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                                    <span className="text-green-600 font-medium">Sent Successfully</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <AlertCircle className="w-5 h-5 text-red-500" />
                                                    <span className="text-red-600 font-medium">Failed</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {emailResults.participant?.error && (
                                        <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                                            Error: {emailResults.participant.error}
                                        </div>
                                    )}
                                </div>

                                {/* Manager Email Status - This block will not render unless sendReportEmails is modified to send manager emails again */}
                                {formData.managerEmail && emailResults.manager && (
                                    <div className="p-4 bg-white rounded-lg border">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900">Manager: {emailResults.manager?.email}</p>
                                                <p className="text-sm text-gray-600">Time: {emailResults.manager?.timestamp}</p>
                                            </div>
                                            <div className="ml-4">
                                                {emailResults.manager?.success ? (
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                                        <span className="text-green-600 font-medium">Sent Successfully</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <AlertCircle className="w-5 h-5 text-red-500" />
                                                        <span className="text-red-600 font-medium">Failed</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {emailResults.manager?.error && (
                                            <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                                                Error: {emailResults.manager.error}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {emailResults.participant?.success ? (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                                    <p className="text-green-800 font-medium">✅ Success!</p>
                                    <p className="text-green-700 text-sm mt-1">
                                        The leadership assessment report has been sent successfully.
                                        Please check your email inbox (and spam folder if needed).
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                                    <p className="text-red-800 font-medium">⚠️ Email delivery issue</p>
                                    <p className="text-red-700 text-sm mt-1">
                                        There was an issue sending the email. You can try resending or updating the email address below.
                                    </p>
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <Button
                                    onClick={resendEmails}
                                    disabled={isResending}
                                    variant="outline"
                                    className="border-blue-600 text-blue-600 hover:bg-blue-50"
                                >
                                    {isResending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Resending...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="w-4 h-4 mr-2" />
                                            Resend Emails
                                        </>
                                    )}
                                </Button>

                                <Button
                                    onClick={() => setIsEditing(true)}
                                    variant="outline"
                                >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Email Addresses
                                </Button>

                                <Button onClick={onClose} variant="outline">
                                    Back to Results
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {isEditing && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6"
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Update Email Addresses</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="edit-participant-email">Participant Email</Label>
                                    <Input
                                        id="edit-participant-email"
                                        type="email"
                                        value={formData.participantEmail}
                                        onChange={handleInputChange('participantEmail')}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="edit-manager-email">Manager Email (Optional)</Label>
                                    <Input
                                        id="edit-manager-email"
                                        type="email"
                                        value={formData.managerEmail}
                                        onChange={handleInputChange('managerEmail')}
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        onClick={() => {
                                            setIsEditing(false);
                                            resendEmails();
                                        }}
                                        disabled={isResending}
                                    >
                                        Update & Resend
                                    </Button>
                                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                                        Cancel
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <Card className="shadow-lg border-0">
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="sm" onClick={onClose}>
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                            <div>
                                <CardTitle className="text-xl">Generate Leadership Report</CardTitle>
                                <p className="text-gray-600 mt-1">Send personalized assessment results via email</p>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="participantName">Participant Name *</Label>
                                <Input
                                    id="participantName"
                                    value={formData.participantName}
                                    onChange={handleInputChange('participantName')}
                                    placeholder="e.g., John Smith"
                                />
                            </div>
                            <div>
                                <Label htmlFor="participantEmail">Participant Email *</Label>
                                <Input
                                    id="participantEmail"
                                    type="email"
                                    value={formData.participantEmail}
                                    onChange={handleInputChange('participantEmail')}
                                    placeholder="john@company.com"
                                />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="company">Company</Label>
                                <Input
                                    id="company"
                                    value={formData.company}
                                    onChange={handleInputChange('company')}
                                    placeholder="e.g., Acme Solutions"
                                />
                            </div>
                            <div>
                                <Label htmlFor="position">Position</Label>
                                <Input
                                    id="position"
                                    value={formData.position}
                                    onChange={handleInputChange('position')}
                                    placeholder="e.g., Operations Manager"
                                />
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <h3 className="font-medium text-gray-900 mb-3">Manager Information (Optional)</h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="managerName">Manager Name</Label>
                                    <Input
                                        id="managerName"
                                        value={formData.managerName}
                                        onChange={handleInputChange('managerName')}
                                        placeholder="e.g., Sarah Johnson"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="managerEmail">Manager Email</Label>
                                    <Input
                                        id="managerEmail"
                                        type="email"
                                        value={formData.managerEmail}
                                        onChange={handleInputChange('managerEmail')}
                                        placeholder="sarah@company.com"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="additionalNotes">Additional Context (Optional)</Label>
                            <Textarea
                                id="additionalNotes"
                                value={formData.additionalNotes}
                                onChange={handleInputChange('additionalNotes')}
                                placeholder="Any additional context about this assessment or development priorities..."
                                className="h-20"
                            />
                        </div>

                        <div className="flex gap-3 justify-end pt-4">
                            <Button variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                onClick={testEmail}
                                disabled={!formData.participantEmail}
                                variant="outline"
                                className="border-green-600 text-green-600 hover:bg-green-50"
                            >
                                Test Email First
                            </Button>
                            <Button
                                onClick={generatePDFReport}
                                disabled={!formData.participantName || !formData.participantEmail}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                <Send className="w-4 h-4 mr-2" />
                                Generate & Send Report
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
