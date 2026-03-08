import React from "react";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  LayoutGrid, 
  UserCheck, 
  TrendingUp, 
  Mail, 
  FileText,
  MessageSquare,
  CheckCircle,
  ArrowRight,
  Settings
} from "lucide-react";

function RequestSystemGuide() {
  const sections = [
    {
      title: "For End Users (Requesters)",
      icon: Users,
      color: "bg-blue-100 text-blue-800",
      features: [
        {
          name: "Submit Requests",
          path: "/MyRequests",
          description: "Click 'Submit New Request' to create a development request with details, priority, budget, and attachments."
        },
        {
          name: "Track Your Requests",
          path: "/MyRequests",
          description: "View all your submitted requests with status updates, filter by status, and search by title/description."
        },
        {
          name: "View Progress",
          path: "/MyRequests",
          description: "Click any request card to see detailed status, assigned administrator, timeline, and notes."
        }
      ]
    },
    {
      title: "For Program Administrators",
      icon: UserCheck,
      color: "bg-purple-100 text-purple-800",
      features: [
        {
          name: "Request Dashboard",
          path: "/RequestDashboard",
          description: "Access the main dashboard showing all requests across clients. Switch between Table, Kanban, and Assignee views."
        },
        {
          name: "Kanban Workflow",
          path: "/RequestDashboard",
          description: "Drag and drop requests between status columns (New → Triaging → Assigned → In Progress → Completed)."
        },
        {
          name: "Auto-Triage",
          path: "/RequestDashboard",
          description: "Click 'Auto-Triage' on new requests to automatically determine approval needs and suggest assignees based on specializations."
        },
        {
          name: "Specializations",
          path: "/UserManagement",
          description: "Set your areas of expertise (E-Learning, Coaching, Assessment, etc.) in User Management to receive matched requests."
        },
        {
          name: "Request Agent",
          path: "/RequestDashboard",
          description: "Click the AI chat icon to ask the Request Agent about requests, get insights, or perform actions via natural language."
        }
      ]
    },
    {
      title: "For HR Administrators",
      icon: Settings,
      color: "bg-green-100 text-green-800",
      features: [
        {
          name: "Full Dashboard Access",
          path: "/RequestDashboard",
          description: "View and manage all requests across the organization with advanced filtering and analytics."
        },
        {
          name: "Advanced Filters",
          path: "/RequestDashboard",
          description: "Filter by status, priority, type, assignee, approval status, and risk flags. Search across all fields."
        },
        {
          name: "Assignee Kanban",
          path: "/RequestDashboard",
          description: "Switch to Assignee view to see requests organized by Program Admin for workload balancing."
        },
        {
          name: "Analytics Dashboard",
          path: "/RequestDashboard",
          description: "View key metrics: total requests, SLA compliance, completion rates, and Program Admin performance."
        },
        {
          name: "Approval Management",
          path: "/RequestDashboard",
          description: "Review approval workflows, approve/reject requests requiring leadership sign-off, and track approval chains."
        },
        {
          name: "Decision Packets",
          path: "/RequestDashboard",
          description: "Generate AI-powered decision packets with business impact analysis, resource requirements, and recommendations."
        },
        {
          name: "Email Integration",
          path: "Backend Function",
          description: "Forward emails to parseEmailToRequest function to automatically create and triage requests from email."
        },
        {
          name: "Public Submission Links",
          path: "/RequestDashboard",
          description: "Generate shareable links and QR codes that allow unauthenticated users to submit requests without logging in. Perfect for events, presentations, or internal communications."
        }
      ]
    },
    {
      title: "Automated Features",
      icon: MessageSquare,
      color: "bg-orange-100 text-orange-800",
      features: [
        {
          name: "SLA Monitoring",
          path: "Automated",
          description: "System sends alerts for requests not responded to within 72 hours (configurable)."
        },
        {
          name: "Stale Ticket Alerts",
          path: "Automated",
          description: "Automatic notifications for requests inactive for 14+ days."
        },
        {
          name: "Due Date Reminders",
          path: "Automated",
          description: "3-day advance reminders for approaching due dates sent to assignees and requesters."
        },
        {
          name: "Request Agent - WhatsApp",
          path: "Dashboard",
          description: "Connect WhatsApp to interact with the Request Agent for updates, submissions, and tracking on-the-go."
        }
      ]
    }
  ];

  const quickStart = [
    {
      role: "End User",
      steps: [
        "Navigate to 'My Requests' from the main navigation",
        "Click 'Submit New Request' button",
        "Fill in request details (title, description, type, priority, budget)",
        "Add attachments if needed and submit",
        "Track progress by viewing your requests list and clicking for details"
      ]
    },
    {
      role: "Program Admin",
      steps: [
        "Go to Request Dashboard from main navigation",
        "Set your specializations in User Management",
        "Review new requests in the 'New Requests' column",
        "Use Auto-Triage to determine approval needs",
        "Drag requests to 'Assigned' and work through pipeline",
        "Use AI Request Agent for insights and assistance"
      ]
    },
    {
      role: "HR Admin",
      steps: [
        "Access Request Dashboard with full system view",
        "Use Advanced Filters to segment requests",
        "Monitor Analytics tab for performance metrics",
        "Review approval queue for leadership decisions",
        "Generate Decision Packets for high-value requests",
        "Balance workload using Assignee Kanban view"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Request Management System Guide
          </h1>
          <p className="text-lg text-gray-600">
            Complete guide to accessing and using all request management features
          </p>
        </div>

        {/* Quick Start Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Quick Start by Role
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              {quickStart.map((guide, idx) => (
                <div key={idx} className="space-y-3">
                  <h3 className="font-semibold text-lg text-gray-900">{guide.role}</h3>
                  <ol className="space-y-2">
                    {guide.steps.map((step, stepIdx) => (
                      <li key={stepIdx} className="flex gap-2 text-sm">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-semibold">
                          {stepIdx + 1}
                        </span>
                        <span className="text-gray-700">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Feature Sections */}
        {sections.map((section, idx) => {
          const Icon = section.icon;
          return (
            <Card key={idx}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${section.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <CardTitle>{section.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {section.features.map((feature, featureIdx) => (
                    <div key={featureIdx} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{feature.name}</h4>
                        {feature.path !== "Automated" && feature.path !== "Backend Function" && (
                          <Badge variant="outline" className="text-xs">
                            {feature.path}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Key Features Highlight */}
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              Key System Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 text-gray-900">Phase 1: Foundation</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                    <span>DevelopmentRequest entity with comprehensive fields</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                    <span>Request submission form with validation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                    <span>Role-based security (RLS) for data access</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-3 text-gray-900">Phase 2: Workflow</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                    <span>Drag-and-drop Kanban board</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                    <span>Auto-triage with specialization matching</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                    <span>Multiple view modes (Table, Kanban, Assignee)</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-3 text-gray-900">Phase 3: Approvals</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                    <span>Multi-step approval workflows</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                    <span>Risk-based approval triggers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                    <span>Approval chain tracking</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-3 text-gray-900">Phase 4: AI & Integration</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                    <span>Email-to-request parser with AI</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                    <span>AI-powered decision packets</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                    <span>Request Agent with WhatsApp integration</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                    <span>Automated notifications and reminders</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                    <span>Performance analytics dashboard</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Tips */}
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-6 h-6 text-purple-600" />
              Pro Tips for Administrators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex gap-3">
                <ArrowRight className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">Email Integration Setup</p>
                  <p className="text-sm text-gray-600">
                    Configure email forwarding to automatically create requests. Forward to your parseEmailToRequest function endpoint with proper authentication.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <ArrowRight className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">Specialization Matching</p>
                  <p className="text-sm text-gray-600">
                    Ensure Program Admins set their specializations in User Management for optimal auto-assignment. The system matches request types to admin expertise.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <ArrowRight className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">SLA Monitoring</p>
                  <p className="text-sm text-gray-600">
                    Set up scheduleRequestReminders as a cron job to run daily. This ensures timely alerts for SLA breaches and stale tickets.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <ArrowRight className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">Decision Packets</p>
                  <p className="text-sm text-gray-600">
                    Use AI-generated decision packets for high-value requests (&gt;$5k budget, &gt;100 users) to streamline approval processes with data-driven insights.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <ArrowRight className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">WhatsApp Agent</p>
                  <p className="text-sm text-gray-600">
                    Share the WhatsApp connect link from the Request Agent to enable mobile access. Users can submit, track, and get updates via WhatsApp.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <ArrowRight className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">Public Submission Links</p>
                  <p className="text-sm text-gray-600">
                    Click 'Public Link' button in Request Dashboard to generate shareable URLs and QR codes. Share in presentations, emails, or posters to collect requests from unauthenticated users. Links expire after your chosen duration (default: 365 days). All submissions automatically route to your organization.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="w-6 h-6 text-gray-700" />
              Navigation Paths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900 mb-3">End Users</h4>
                <div className="text-sm space-y-2">
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded">/MyRequests</span>
                    <span>→ Submit & track requests</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900 mb-3">Administrators</h4>
                <div className="text-sm space-y-2">
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded">/RequestDashboard</span>
                    <span>→ Full request management</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded">/UserManagement</span>
                    <span>→ Set specializations</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded">/RequestSystemTest</span>
                    <span>→ System validation</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900 mb-3">Unauthenticated Submission</h4>
                <div className="text-sm space-y-2">
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded">/PublicRequestSubmission</span>
                    <span>→ Via shared link/QR code</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default withAuthProtection(RequestSystemGuide);