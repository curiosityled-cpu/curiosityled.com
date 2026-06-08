import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Lock, Users, Info, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const PRIVATE_TO_YOU = [
  "How you described your energy level",
  "Your confidence responses",
  "Your overload and avoidance reflections",
  "Your morning intentions and evening comparisons",
  "Your delegation commitments",
  "Atreus's pattern narrative about your recent weeks",
  "Any free-text notes you've added",
  "Your motivation and room-today responses",
  "Trend summaries and longitudinal pattern data",
];

const VISIBLE_TO_ORG = [
  { label: "Aggregate meeting load signals", note: "Group average, ≥5 managers minimum" },
  { label: "Overall learning engagement patterns", note: "No individual attribution" },
  { label: "Goal completion rates", note: "Group level only, ≥5 managers minimum" },
];

const NEVER_READ = [
  "Meeting content, agendas, or notes",
  "Email content or attachments",
  "Attendee identities from calendar",
  "Any individual's name tied to an overload or risk signal",
  "Your check-in responses in any HR report",
];

export default function DataDownloadPanel({ user, lastDownloadDate, onDownloadComplete }) {
  const [downloading, setDownloading] = useState(false);
  const [showPrivate, setShowPrivate] = useState(false);
  const [showOrgVisible, setShowOrgVisible] = useState(false);
  const [showNeverRead, setShowNeverRead] = useState(false);
  const [selectedData, setSelectedData] = useState({
    profile: true,
    assessments: true,
    goals: true,
    learning: true,
    conversations: true,
    activityLogs: false
  });

  const dataCategories = [
    { key: "profile", label: "Profile Information", description: "Your personal and professional details" },
    { key: "assessments", label: "Assessment Results", description: "All your leadership assessment data" },
    { key: "goals", label: "Goals & Performance", description: "Your goals, OKRs, and performance metrics" },
    { key: "learning", label: "Learning History", description: "Completed courses and learning resources" },
    { key: "conversations", label: "AI Coach Conversations", description: "Your chat history with Atreus" },
    { key: "activityLogs", label: "Activity Logs", description: "Your platform activity history" }
  ];

  const handleDownload = async () => {
    try {
      setDownloading(true);

      // Collect selected data
      const dataToExport = {};

      if (selectedData.profile) {
        dataToExport.profile = {
          email: user.email,
          full_name: user.full_name,
          role: user.app_role,
          created_date: user.created_date,
          ...user
        };
      }

      if (selectedData.assessments) {
        const assessments = await base44.entities.Assessment.filter({ email: user.email });
        dataToExport.assessments = assessments;
      }

      if (selectedData.goals) {
        const goals = await base44.entities.Goal.filter({ created_by: user.email });
        dataToExport.goals = goals;
      }

      if (selectedData.learning) {
        const learning = await base44.entities.AssignedLearning.filter({ user_email: user.email });
        dataToExport.learning = learning;
      }

      if (selectedData.conversations) {
        const conversations = await base44.entities.Conversation.filter({ created_by: user.email });
        dataToExport.conversations = conversations;
      }

      if (selectedData.activityLogs) {
        const logs = await base44.entities.ActivityLog.filter({
          $or: [
            { initiator_user_email: user.email },
            { target_user_email: user.email }
          ]
        });
        dataToExport.activityLogs = logs;
      }

      // Create JSON file
      const dataStr = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `curiosity-led-data-${format(new Date(), "yyyy-MM-dd")}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Update last download date
      await base44.auth.updateMe({
        last_data_download_date: new Date().toISOString()
      });

      // Log the download
      await base44.entities.ActivityLog.create({
        timestamp: new Date().toISOString(),
        initiator_user_email: user.email,
        action_type: "USER_DATA_DOWNLOAD",
        metadata: {
          categories: Object.keys(selectedData).filter(k => selectedData[k]),
          record_count: Object.values(dataToExport).flat().length
        }
      });

      toast.success("Your data has been downloaded");
      if (onDownloadComplete) onDownloadComplete();
    } catch (error) {
      console.error("Error downloading data:", error);
      toast.error("Failed to download data");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Download Your Data
          </CardTitle>
          <CardDescription>
            Export a copy of your personal data stored in Curiosity Led
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Last Download Info */}
          {lastDownloadDate && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Last downloaded: {format(new Date(lastDownloadDate), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          )}

          {/* Data Categories */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Select data to include:</Label>
            {dataCategories.map((category) => (
              <div key={category.key} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                <Checkbox
                  id={category.key}
                  checked={selectedData[category.key]}
                  onCheckedChange={(checked) =>
                    setSelectedData({ ...selectedData, [category.key]: checked })
                  }
                />
                <div className="flex-1">
                  <Label
                    htmlFor={category.key}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {category.label}
                  </Label>
                  <p className="text-xs text-gray-500 mt-0.5">{category.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Info Box */}
          <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700">
            <p className="font-medium mb-2">What you'll receive:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>A JSON file with your selected data</li>
              <li>Structured format for easy parsing</li>
              <li>All data as of the download date</li>
              <li>Activity is logged for security</li>
            </ul>
          </div>

          {/* Download Button */}
          <Button
            onClick={handleDownload}
            disabled={downloading || !Object.values(selectedData).some(v => v)}
            className="w-full bg-[#0202ff] hover:bg-[#0101dd]"
          >
            <Download className="w-4 h-4 mr-2" />
            {downloading ? "Preparing Download..." : "Download My Data"}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            Your data will be downloaded in JSON format. This process is secure and logged for audit purposes.
          </p>

          {/* Privacy transparency cards */}
          <div className="space-y-3 pt-2">
            {/* Private to you */}
            <Card className="border border-gray-100 rounded-2xl">
              <CardContent className="pt-5 pb-3 px-5">
                <button className="w-full flex items-center justify-between" onClick={() => setShowPrivate(v => !v)}>
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-600" />
                    <p className="text-sm font-semibold text-gray-900">Private to you — never shared</p>
                  </div>
                  {showPrivate ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {showPrivate && (
                  <ul className="space-y-2 mt-4">
                    {PRIVATE_TO_YOU.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <EyeOff className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-600">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* What org can see */}
            <Card className="border border-gray-100 rounded-2xl">
              <CardContent className="pt-5 pb-3 px-5">
                <button className="w-full flex items-center justify-between" onClick={() => setShowOrgVisible(v => !v)}>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <p className="text-sm font-semibold text-gray-900">What your organisation can see</p>
                  </div>
                  {showOrgVisible ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {showOrgVisible && (
                  <>
                    <p className="text-xs text-gray-400 mt-3 mb-3 ml-6">Only aggregate patterns, never individual attribution. Minimum group size: 5 managers.</p>
                    <ul className="space-y-3">
                      {VISIBLE_TO_ORG.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Eye className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="text-sm text-gray-700">{item.label}</span>
                            <Badge variant="outline" className="ml-2 text-[10px] text-gray-400 border-gray-200 px-1.5 py-0">{item.note}</Badge>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </CardContent>
            </Card>

            {/* What is never read */}
            <Card className="border border-gray-100 rounded-2xl">
              <CardContent className="pt-5 pb-3 px-5">
                <button className="w-full flex items-center justify-between" onClick={() => setShowNeverRead(v => !v)}>
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-gray-400" />
                    <p className="text-sm font-semibold text-gray-900">What is never read or stored</p>
                  </div>
                  {showNeverRead ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {showNeverRead && (
                  <ul className="space-y-2 mt-4">
                    {NEVER_READ.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <EyeOff className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-600">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}