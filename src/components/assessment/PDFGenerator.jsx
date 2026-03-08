
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, FileText, Download, Loader2, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { InvokeLLM } from "@/integrations/Core";

export default function PDFGenerator({ assessmentData, onClose }) {
    const [formData, setFormData] = useState({
        participantName: '',
        company: '',
        position: '',
        additionalNotes: ''
    });
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [generatedReport, setGeneratedReport] = useState('');

    const handleInputChange = (field) => (e) => {
        const value = e.target.value;
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const competencyAnalysis = [
        {
            competency: "Decision Making",
            score: assessmentData.scores.dm_pct,
            interpretation: assessmentData.scores.dm_pct >= 85 ? "Exceptional decision-making abilities (90th+ percentile); demonstrates superior confidence in judgment with comprehensive perspective consideration." : 
                           assessmentData.scores.dm_pct >= 79 ? "Target proficiency in decision-making (50th-75th percentile); competent in making informed decisions with good judgment under pressure." :
                           assessmentData.scores.dm_pct >= 72 ? "Emerging decision-making skills (25th-49th percentile); developing confidence in judgment and would benefit from structured decision frameworks." :
                           "Decision-making development needed (<25th percentile); intensive coaching required in analytical thinking and judgment under pressure."
        },
        {
            competency: "Communication",
            score: assessmentData.scores.comm_pct,
            interpretation: assessmentData.scores.comm_pct >= 87 ? "Exceptional communication skills (90th+ percentile); masterfully articulates ideas and engages diverse audiences with outstanding clarity and impact." :
                           assessmentData.scores.comm_pct >= 80 ? "Target communication proficiency (50th-75th percentile); effectively conveys information and adapts message appropriately to different audiences." :
                           assessmentData.scores.comm_pct >= 73 ? "Emerging communication abilities (25th-49th percentile); developing clarity and engagement skills across different stakeholder groups." :
                           "Communication development needed (<25th percentile); intensive coaching required in message clarity, active listening, and audience adaptation."
        },
        {
            competency: "Resource Management", 
            score: assessmentData.scores.rm_pct,
            interpretation: assessmentData.scores.rm_pct >= 84 ? "Exceptional resource optimization (90th+ percentile); demonstrates superior ability to allocate and maximize efficiency across all resources." :
                           assessmentData.scores.rm_pct >= 77 ? "Target resource management proficiency (50th-75th percentile); competent allocation of people, budget, and time with good efficiency optimization." :
                           assessmentData.scores.rm_pct >= 70 ? "Emerging resource management skills (25th-49th percentile); developing understanding of allocation principles and efficiency strategies." :
                           "Resource management development needed (<25th percentile); intensive coaching required in allocation strategies and efficiency optimization."
        },
        {
            competency: "Stakeholder Management",
            score: assessmentData.scores.sm_pct,
            interpretation: assessmentData.scores.sm_pct >= 85 ? "Exceptional stakeholder engagement (90th+ percentile); builds and maintains outstanding relationships that significantly drive organizational success." :
                           assessmentData.scores.sm_pct >= 78 ? "Target stakeholder management proficiency (50th-75th percentile); effectively engages and maintains productive relationships with key stakeholders." :
                           assessmentData.scores.sm_pct >= 71 ? "Emerging stakeholder skills (25th-49th percentile); developing relationship-building capabilities and engagement strategies." :
                           "Stakeholder management development needed (<25th percentile); intensive coaching required in relationship building and stakeholder engagement strategies."
        },
        {
            competency: "Performance Management",
            score: assessmentData.scores.pm_pct,
            interpretation: assessmentData.scores.pm_pct >= 83 ? "Exceptional performance management (90th+ percentile); masterfully drives team performance through clear expectations, consistent feedback, and strategic development." :
                           assessmentData.scores.pm_pct >= 76 ? "Target performance management proficiency (50th-75th percentile); competently sets expectations and provides feedback with good performance tracking." :
                           assessmentData.scores.pm_pct >= 69 ? "Emerging performance management skills (25th-49th percentile); developing consistency in feedback delivery and performance metric application." :
                           "Performance management development needed (<25th percentile); intensive coaching required in feedback delivery, goal setting, and performance improvement strategies."
        },
        {
            competency: "Situational Intelligence",
            score: assessmentData.scores.si_pct,
            interpretation: assessmentData.scores.si_pct >= 81 ? "Exceptional situational awareness (90th+ percentile); demonstrates superior ability to assess complex situations and adapt strategies with outstanding judgment." :
                           assessmentData.scores.si_pct >= 73 ? "Target situational intelligence (50th-75th percentile); adept at assessing situations and adjusting strategies with good contextual understanding." :
                           assessmentData.scores.si_pct >= 65 ? "Emerging situational intelligence (25th-49th percentile); developing ability to read environmental cues and adapt approach accordingly." :
                           "Situational intelligence development needed (<25th percentile); intensive coaching required in environmental assessment and adaptive strategy development."
        }
    ];

    const generatePDFReport = async () => {
        setIsGenerating(true);
        
        try {
            const reportPrompt = `Create additional leadership development content for ${formData.participantName} at ${formData.company}. Focus on:

CONTEXT:
- Name: ${formData.participantName}
- Company: ${formData.company}
- Position: ${formData.position}
- Leadership Archetype: ${assessmentData.analysis?.archetype || 'Strategic Leader'}

SCORES SUMMARY:
- Decision Making: ${assessmentData.scores.dm_pct}% (${assessmentData.scores.dm_pct >= 75 ? 'Strong' : assessmentData.scores.dm_pct >= 65 ? 'Competent' : 'Developing'})
- Communication: ${assessmentData.scores.comm_pct}% (${assessmentData.scores.comm_pct >= 75 ? 'Excellent' : assessmentData.scores.comm_pct >= 65 ? 'Good' : 'Needs Development'})
- Situational Intelligence: ${assessmentData.scores.si_pct}% (Overall leadership adaptability)

Generate ONLY these sections (no headers, just content):

1. **Executive Summary** (2-3 paragraphs about overall leadership profile and key insights)

2. **90-Day Development Plan** with 4-5 specific, actionable goals with timeframes

3. **Recommended Resources** (2-3 books, 1-2 online courses, 1-2 frameworks/tools)

4. **Business Impact Projections** (how developing these areas will benefit their role and organization)

Additional Context: ${formData.additionalNotes}

Keep it professional, actionable, and specific to their role and scores.`;

            const reportContent = await InvokeLLM({
                prompt: reportPrompt,
                add_context_from_internet: false
            });

            setGeneratedReport(reportContent);
            setIsComplete(true);
            
        } catch (error) {
            console.error('Error generating report:', error);
            alert('There was an error generating the report. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const createSpiderChartSVG = () => {
        const scores = [
            assessmentData.scores.dm_pct,
            assessmentData.scores.comm_pct,
            assessmentData.scores.rm_pct,
            assessmentData.scores.sm_pct,
            assessmentData.scores.pm_pct,
            assessmentData.scores.si_pct
        ];
        
        const benchmarks = [70, 68, 72, 74, 69, 67]; // Industry benchmarks
        const labels = ['Decision Making', 'Communication', 'Resource Mgmt', 'Stakeholder Mgmt', 'Performance Mgmt', 'Situational Intel'];
        
        const centerX = 150;
        const centerY = 150;
        const maxRadius = 120;
        const angleStep = (2 * Math.PI) / 6;
        
        // Create paths for user scores and benchmarks
        let userPath = 'M ';
        let benchmarkPath = 'M ';
        
        for (let i = 0; i < 6; i++) {
            const angle = i * angleStep - Math.PI / 2;
            
            // User score point
            const userRadius = (scores[i] / 100) * maxRadius;
            const userX = centerX + userRadius * Math.cos(angle);
            const userY = centerY + userRadius * Math.sin(angle);
            userPath += `${userX},${userY} `;
            
            // Benchmark point
            const benchmarkRadius = (benchmarks[i] / 100) * maxRadius;
            const benchmarkX = centerX + benchmarkRadius * Math.cos(angle);
            const benchmarkY = centerY + benchmarkRadius * Math.sin(angle);
            benchmarkPath += `${benchmarkX},${benchmarkY} `;
        }
        
        userPath += 'Z';
        benchmarkPath += 'Z';
        
        return `
            <svg width="300" height="300" viewBox="0 0 300 300">
                <!-- Grid circles -->
                <circle cx="150" cy="150" r="24" fill="none" stroke="#e9ecef" stroke-width="1"/>
                <circle cx="150" cy="150" r="48" fill="none" stroke="#e9ecef" stroke-width="1"/>
                <circle cx="150" cy="150" r="72" fill="none" stroke="#e9ecef" stroke-width="1"/>
                <circle cx="150" cy="150" r="96" fill="none" stroke="#e9ecef" stroke-width="1"/>
                <circle cx="150" cy="150" r="120" fill="none" stroke="#e9ecef" stroke-width="1"/>
                
                <!-- Axis lines -->
                ${Array.from({length: 6}, (_, i) => {
                    const angle = i * angleStep - Math.PI / 2;
                    const endX = centerX + maxRadius * Math.cos(angle);
                    const endY = centerY + maxRadius * Math.sin(angle);
                    return `<line x1="150" y1="150" x2="${endX}" y2="${endY}" stroke="#e9ecef" stroke-width="1"/>`;
                }).join('')}
                
                <!-- Benchmark area -->
                <path d="${benchmarkPath}" fill="rgba(156, 163, 175, 0.2)" stroke="#9ca3af" stroke-width="2"/>
                
                <!-- User score area -->
                <path d="${userPath}" fill="rgba(102, 126, 234, 0.3)" stroke="#667eea" stroke-width="3"/>
                
                <!-- Labels -->
                ${labels.map((label, i) => {
                    const angle = i * angleStep - Math.PI / 2;
                    const labelRadius = maxRadius + 25;
                    const labelX = centerX + labelRadius * Math.cos(angle);
                    const labelY = centerY + labelRadius * Math.sin(angle);
                    return `<text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="11" fill="#374151">${label}</text>`;
                }).join('')}
                
                <!-- Legend -->
                <rect x="20" y="250" width="12" height="12" fill="rgba(102, 126, 234, 0.3)" stroke="#667eea"/>
                <text x="37" y="261" font-size="10" fill="#374151">Your Scores</text>
                <rect x="110" y="250" width="12" height="12" fill="rgba(156, 163, 175, 0.2)" stroke="#9ca3af"/>
                <text x="127" y="261" font-size="10" fill="#374151">Industry Benchmark</text>
            </svg>`;
    };

    const downloadPDF = () => {
        const spiderChart = createSpiderChartSVG();
        
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Leadership Assessment Report - ${formData.participantName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background: #f8fafc;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            min-height: 100vh;
        }
        .download-bar {
            background: #667eea;
            color: white;
            padding: 15px 30px;
            text-align: center;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .download-btn {
            background: white;
            color: #667eea;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 14px;
        }
        .download-btn:hover {
            background: #f1f5f9;
            transform: translateY(-1px);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 10px;
        }
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        .content {
            padding: 30px;
        }
        .participant-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 30px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
        }
        .participant-item {
            text-align: center;
        }
        .participant-item h4 {
            color: #667eea;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .participant-item p {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
        }
        .section {
            margin: 40px 0;
        }
        .section h2 {
            color: #1f2937;
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 3px solid #667eea;
        }
        .chart-container {
            display: flex;
            justify-content: center;
            margin: 30px 0;
            background: #f8fafc;
            padding: 20px;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
        }
        .competency-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .competency-table th {
            background: #667eea;
            color: white;
            padding: 16px;
            text-align: left;
            font-weight: 600;
        }
        .competency-table td {
            padding: 16px;
            border-bottom: 1px solid #e2e8f0;
        }
        .competency-table tr:hover {
            background: #f8fafc;
        }
        .score-cell {
            text-align: center;
            font-weight: 700;
            font-size: 18px;
        }
        .score-excellent { color: #059669; }
        .score-good { color: #0d9488; }
        .score-fair { color: #d97706; }
        .score-needs-work { color: #dc2626; }
        .archetype-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            margin: 30px 0;
        }
        .archetype-card h3 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
        }
        .archetype-card p {
            font-size: 16px;
            opacity: 0.9;
        }
        .content-section {
            background: #f8fafc;
            border-radius: 12px;
            padding: 24px;
            margin: 20px 0;
            border-left: 4px solid #667eea;
        }
        .footer {
            background: #1f2937;
            color: white;
            padding: 30px;
            text-align: center;
            margin-top: 40px;
        }
        .footer h4 {
            color: #667eea;
            margin-bottom: 10px;
        }
        @media print {
            body { background: white; }
            .container { box-shadow: none; }
            .download-bar { display: none; }
            .no-print { display: none; }
        }
        @page {
            margin: 0.75in;
            size: letter;
        }
    </style>
</head>
<body>
    <div class="download-bar no-print">
        <span style="margin-right: 15px;">💾 Ready to save as PDF?</span>
        <button class="download-btn" onclick="downloadPDF()">📄 Download as PDF</button>
        <span style="margin-left: 15px; font-size: 12px; opacity: 0.9;">Works in Chrome, Edge, Safari, and Firefox</span>
    </div>

    <div class="container">
        <div class="header">
            <h1>Leadership Index Assessment Report</h1>
            <p>Generated by Curiosity Led • ${new Date().toLocaleDateString()}</p>
        </div>

        <div class="content">
            <div class="participant-card">
                <div class="participant-item">
                    <h4>Participant</h4>
                    <p>${formData.participantName}</p>
                </div>
                <div class="participant-item">
                    <h4>Company</h4>
                    <p>${formData.company}</p>
                </div>
                <div class="participant-item">
                    <h4>Position</h4>
                    <p>${formData.position}</p>
                </div>
            </div>

            <div class="section">
                <h2>Leadership Competency Scores</h2>
                <div class="chart-container">
                    ${spiderChart}
                </div>
            </div>

            <div class="section">
                <h2>Competency Analysis</h2>
                <table class="competency-table">
                    <thead>
                        <tr>
                            <th>Competency</th>
                            <th style="text-align: center;">Score (%)</th>
                            <th>Interpretation</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${competencyAnalysis.map(item => {
                            let scoreClass = 'score-needs-work';
                            if (item.score >= 75) scoreClass = 'score-excellent';
                            else if (item.score >= 65) scoreClass = 'score-good';
                            else if (item.score >= 55) scoreClass = 'score-fair';
                            
                            return `
                                <tr>
                                    <td><strong>${item.competency}</strong></td>
                                    <td class="score-cell ${scoreClass}">${item.score}%</td>
                                    <td>${item.interpretation}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <div class="archetype-card">
                <h3>Your Leadership Archetype</h3>
                <p>${assessmentData.analysis?.archetype || 'Strategic Leader'}</p>
            </div>

            <div class="content-section">
                <div style="white-space: pre-line; line-height: 1.8;">${generatedReport}</div>
            </div>
        </div>

        <div class="footer">
            <h4>Curiosity Led</h4>
            <p>AI-Powered Leadership Development</p>
            <p style="margin-top: 10px; font-size: 14px; opacity: 0.8;">
                For questions or follow-up support, contact team@curiosityled.com
            </p>
        </div>
    </div>

    <script>
        function downloadPDF() {
            // Check if browser supports printing
            if (window.print) {
                // Show a helpful message
                const originalTitle = document.title;
                document.title = 'Preparing PDF - ' + originalTitle;
                
                // Use the browser's print dialog with PDF option
                window.print();
                
                // Restore title after a moment
                setTimeout(() => {
                    document.title = originalTitle;
                }, 1000);
            } else {
                alert('PDF download not supported in this browser. Please use Chrome, Firefox, Safari, or Edge.');
            }
        }

        // Add keyboard shortcut Ctrl+P or Cmd+P
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                downloadPDF();
            }
        });

        // Show a welcome message after page loads
        window.addEventListener('load', function() {
            console.log('Leadership Assessment Report loaded successfully!');
            console.log('Click the "Download as PDF" button or press Ctrl+P (Cmd+P on Mac) to save as PDF');
        });
    </script>
</body>
</html>`;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Leadership_Assessment_Report_${formData.participantName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    };

    const isFormValid = formData.participantName && formData.company && formData.position;

    if (isGenerating) {
        return (
            <Card className="max-w-2xl mx-auto shadow-xl border-0">
                <CardContent className="p-8 text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto mb-6 flex items-center justify-center"
                    >
                        <FileText className="w-8 h-8 text-white" />
                    </motion.div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Generating Your Report</h3>
                    <p className="text-gray-600">Creating your personalized leadership development report...</p>
                </CardContent>
            </Card>
        );
    }

    if (isComplete) {
        return (
            <Card className="max-w-2xl mx-auto shadow-xl border-0">
                <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <CardTitle className="text-2xl">Report Generated Successfully!</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-6">
                    <p className="text-gray-600">
                        Your personalized leadership assessment report is ready for download.
                    </p>
                    
                    <div className="space-y-3">
                        <Button 
                            onClick={downloadPDF}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
                            size="lg"
                        >
                            <Download className="w-5 h-5 mr-2" />
                            Download Report (HTML)
                        </Button>
                        
                        <p className="text-sm text-gray-500">
                            The report downloads as an HTML file. Open it in any browser and use "Print to PDF" for a PDF version.
                        </p>
                    </div>
                    
                    <Button 
                        onClick={onClose}
                        variant="outline"
                        className="w-full"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Results
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="max-w-2xl mx-auto shadow-xl border-0">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={onClose}
                        className="p-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <CardTitle className="text-xl">Generate Leadership Report</CardTitle>
                        <p className="text-gray-600 text-sm">Create a comprehensive assessment report</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="participantName">Participant Name *</Label>
                        <Input
                            id="participantName"
                            value={formData.participantName}
                            onChange={handleInputChange('participantName')}
                            placeholder="Enter full name"
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="company">Company *</Label>
                        <Input
                            id="company"
                            value={formData.company}
                            onChange={handleInputChange('company')}
                            placeholder="Company name"
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="position">Position/Title *</Label>
                        <Input
                            id="position"
                            value={formData.position}
                            onChange={handleInputChange('position')}
                            placeholder="Job title"
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="additionalNotes">Additional Context (Optional)</Label>
                        <Textarea
                            id="additionalNotes"
                            value={formData.additionalNotes}
                            onChange={handleInputChange('additionalNotes')}
                            placeholder="Any additional context for the report..."
                            rows={3}
                        />
                    </div>
                </div>

                <Button 
                    onClick={generatePDFReport}
                    disabled={!isFormValid || isGenerating}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 disabled:opacity-50"
                    size="lg"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating Report...
                        </>
                    ) : (
                        <>
                            <FileText className="w-4 h-4 mr-2" />
                            Generate Report
                        </>
                    )}
                </Button>
                
                {!isFormValid && (
                    <p className="text-sm text-red-600 text-center">
                        Please fill in all required fields (Name, Company, Position)
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
