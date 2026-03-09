import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, FileText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function DataDownloadPanel({ user, lastDownloadDate, onDownloadComplete }) {
  const [downloading, setDownloading] = useState(false);
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
        </CardContent>
      </Card>
    </div>
  );
}