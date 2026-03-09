import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Check, Users, Target, TrendingUp, Download, FileText } from "lucide-react";
import { motion } from "framer-motion";

export default function PlanDisplay({ planData, profileData }) {
  const [isDownloading, setIsDownloading] = useState(false);

  // Handle undefined planData gracefully
  if (!planData) {
    return (
      <Card className="shadow-lg border-0">
        <CardContent className="p-8 text-center">
          <div className="text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Generating Your Plan</h3>
            <p>Your personalized 90-day plan is being created...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const planPhases = [
    {
      phase: "First 30 Days",
      color: "bg-blue-500",
      focus: "Learn & Listen",
      items: planData["30_days"] || []
    },
    {
      phase: "Days 31-60",
      color: "bg-purple-500", 
      focus: "Plan & Prioritize",
      items: planData["60_days"] || []
    },
    {
      phase: "Days 61-90",
      color: "bg-emerald-500",
      focus: "Execute & Optimize", 
      items: planData["90_days"] || []
    }
  ];

  const downloadPlan = () => {
    setIsDownloading(true);
    
    // Create comprehensive HTML for the 90-day plan
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>90-Day Leadership Plan - ${profileData.role || profileData.newHireRole}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            background: #f8fafc;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
            border-radius: 12px;
            margin-bottom: 30px;
        }
        .header h1 {
            font-size: 32px;
            margin-bottom: 10px;
            font-weight: 700;
        }
        .profile-info {
            background: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .profile-section {
            margin-bottom: 25px;
        }
        .profile-section h3 {
            color: #667eea;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .phase-card {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 25px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .phase-header {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
        }
        .phase-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 12px;
        }
        .phase-blue { background-color: #3b82f6; }
        .phase-purple { background-color: #8b5cf6; }
        .phase-green { background-color: #10b981; }
        .phase-title {
            font-size: 24px;
            font-weight: 700;
            color: #1f2937;
        }
        .phase-focus {
            background: #f1f5f9;
            color: #475569;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 14px;
            margin-left: 12px;
        }
        .task-list {
            list-style: none;
            padding: 0;
        }
        .task-item {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 12px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .task-item:last-child {
            border-bottom: none;
        }
        .check-icon {
            width: 20px;
            height: 20px;
            border: 2px solid #10b981;
            border-radius: 50%;
            margin-top: 2px;
            flex-shrink: 0;
        }
        .priorities-grid {
            display: grid;
            gap: 10px;
            margin: 10px 0;
        }
        .priority-item {
            background: #dbeafe;
            padding: 12px;
            border-radius: 8px;
            border-left: 4px solid #3b82f6;
        }
        .projects-grid {
            display: grid;
            gap: 15px;
            margin: 10px 0;
        }
        .project-item {
            background: #f3e8ff;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #8b5cf6;
        }
        .project-title {
            font-weight: 600;
            margin-bottom: 5px;
        }
        .team-grid {
            display: grid;
            gap: 15px;
            margin: 10px 0;
        }
        .team-member {
            background: #ecfdf5;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #10b981;
        }
        .member-name {
            font-weight: 600;
            margin-bottom: 5px;
        }
        .member-details {
            font-size: 14px;
            color: #6b7280;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            color: #6b7280;
            border-top: 2px solid #e5e7eb;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>90-Day Leadership Onboarding Plan</h1>
        <p>${profileData.role || profileData.newHireRole} at ${profileData.company}</p>
        <p>Generated: ${new Date().toLocaleDateString()}</p>
    </div>

    <div class="profile-info">
        <div class="profile-section">
            <h3>🎯 Quarter Priorities</h3>
            <div class="priorities-grid">
                ${(profileData.org_priorities_qtr || []).map(priority => 
                    `<div class="priority-item">${priority}</div>`
                ).join('')}
            </div>
        </div>

        ${profileData.project_notes && profileData.project_notes.length > 0 ? `
        <div class="profile-section">
            <h3>📁 Key Projects</h3>
            <div class="projects-grid">
                ${profileData.project_notes.map(project => 
                    `<div class="project-item">
                        <div class="project-title">${project.project}</div>
                        <div>${project.notes}</div>
                    </div>`
                ).join('')}
            </div>
        </div>
        ` : ''}

        ${profileData.direct_reports && profileData.direct_reports.length > 0 ? `
        <div class="profile-section">
            <h3>👥 Direct Reports</h3>
            <div class="team-grid">
                ${profileData.direct_reports.map(report => 
                    `<div class="team-member">
                        <div class="member-name">${report.name} (${report.tenure_years} years)</div>
                        <div class="member-details">
                            <strong>Strengths:</strong> ${(report.strengths || []).join(', ')}<br>
                            <strong>Development Areas:</strong> ${(report.risks || []).join(', ')}
                        </div>
                    </div>`
                ).join('')}
            </div>
        </div>
        ` : ''}
    </div>

    ${planPhases.map((phase, index) => `
        <div class="phase-card">
            <div class="phase-header">
                <div class="phase-dot phase-${index === 0 ? 'blue' : index === 1 ? 'purple' : 'green'}"></div>
                <h2 class="phase-title">${phase.phase}</h2>
                <span class="phase-focus">${phase.focus}</span>
            </div>
            <ul class="task-list">
                ${phase.items.map(item => `
                    <li class="task-item">
                        <div class="check-icon"></div>
                        <span>${item}</span>
                    </li>
                `).join('')}
            </ul>
        </div>
    `).join('')}

    <div class="footer">
        <p>Generated by Curiosity Led - AI-Powered Leadership Development</p>
        <p>Visit <strong>curiosityled.com</strong> for more leadership resources</p>
    </div>
</body>
</html>`;

    // Create and download the file
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `90-Day-Plan-${(profileData.role || profileData.newHireRole).replace(/\s+/g, '-')}-${profileData.company.replace(/\s+/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();

    setTimeout(() => setIsDownloading(false), 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Personalized Plan</h2>
          <p className="text-gray-600">AI-generated based on your specific context and priorities</p>
        </div>
        <Button 
          onClick={downloadPlan}
          disabled={isDownloading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isDownloading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Preparing...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Download Plan
            </>
          )}
        </Button>
      </div>
      
      {planPhases.map((phase, phaseIndex) => (
        <motion.div
          key={phase.phase}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: phaseIndex * 0.2 }}
        >
          <Card className="shadow-lg border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 ${phase.color} rounded-full`}></div>
                  <CardTitle className="text-xl">{phase.phase}</CardTitle>
                  <Badge variant="outline">{phase.focus}</Badge>
                </div>
                <CalendarDays className="w-5 h-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              {phase.items.length > 0 ? (
                <ul className="space-y-3">
                  {phase.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="flex items-start gap-3 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">Plan items will be generated based on your profile...</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}