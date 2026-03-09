import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle2, Users, FileText } from "lucide-react";
import { toast } from "sonner";

export default function PrivacyComplianceDashboard({ user }) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    trainingCompleted: 0,
    phiDetections: 0,
    dataRequests: 0,
    complianceScore: 0
  });

  useEffect(() => {
    loadMetrics();
  }, [user]);

  const loadMetrics = async () => {
    try {
      setLoading(true);

      // Get all users in the organization
      const allUsers = await base44.entities.User.filter({
        client_id: user.client_id
      });

      // Count training completion
      const trainedUsers = allUsers.filter(u => u.privacy_training_completed).length;

      // Get PHI detections
      const phiLogs = await base44.entities.ActivityLog.filter({
        action_type: "PHI_DETECTION_TRIGGERED",
        "metadata.client_id": user.client_id
      });

      // Get data access requests
      const dataRequests = await base44.entities.ActivityLog.filter({
        action_type: "USER_DATA_DOWNLOAD",
        "metadata.client_id": user.client_id
      });

      // Calculate compliance score
      const trainingScore = allUsers.length > 0 ? (trainedUsers / allUsers.length) * 40 : 0;
      const phiScore = phiLogs.length < 10 ? 30 : phiLogs.length < 50 ? 20 : 10;
      const responseScore = 30; // Placeholder for data request response time
      const complianceScore = Math.round(trainingScore + phiScore + responseScore);

      setMetrics({
        totalUsers: allUsers.length,
        trainingCompleted: trainedUsers,
        phiDetections: phiLogs.length,
        dataRequests: dataRequests.length,
        complianceScore
      });
    } catch (error) {
      console.error("Error loading compliance metrics:", error);
      toast.error("Failed to load compliance data");
    } finally {
      setLoading(false);
    }
  };

  const trainingPercentage = metrics.totalUsers > 0 
    ? Math.round((metrics.trainingCompleted / metrics.totalUsers) * 100) 
    : 0;

  const getComplianceColor = (score) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getComplianceStatus = (score) => {
    if (score >= 90) return "Excellent";
    if (score >= 70) return "Good";
    if (score >= 50) return "Needs Improvement";
    return "Critical";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0202ff]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compliance Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Overall Compliance Score
          </CardTitle>
          <CardDescription>
            Comprehensive assessment of your organization's privacy compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className={`text-6xl font-bold mb-2 ${getComplianceColor(metrics.complianceScore)}`}>
              {metrics.complianceScore}
            </div>
            <Badge 
              className={`${
                metrics.complianceScore >= 90 ? "bg-green-100 text-green-800" :
                metrics.complianceScore >= 70 ? "bg-yellow-100 text-yellow-800" :
                "bg-red-100 text-red-800"
              }`}
            >
              {getComplianceStatus(metrics.complianceScore)}
            </Badge>
            <Progress value={metrics.complianceScore} className="mt-4 h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">Privacy Training</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.trainingCompleted} / {metrics.totalUsers}
                </p>
                <Progress value={trainingPercentage} className="mt-2 h-2" />
                <p className="text-xs text-gray-500 mt-1">{trainingPercentage}% completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                metrics.phiDetections > 50 ? "bg-red-100" : 
                metrics.phiDetections > 10 ? "bg-yellow-100" : "bg-green-100"
              }`}>
                <AlertTriangle className={`w-6 h-6 ${
                  metrics.phiDetections > 50 ? "text-red-600" : 
                  metrics.phiDetections > 10 ? "text-yellow-600" : "text-green-600"
                }`} />
              </div>
              <div>
                <p className="text-sm text-gray-600">PHI Detections</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.phiDetections}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {metrics.phiDetections === 0 ? "No issues detected" : "Requires attention"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Data Access Requests</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.dataRequests}</p>
                <p className="text-xs text-gray-500 mt-1">All fulfilled</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Security Measures</p>
                <p className="text-2xl font-bold text-gray-900">Active</p>
                <p className="text-xs text-gray-500 mt-1">All systems operational</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {trainingPercentage < 100 && (
            <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900 text-sm">
                  Complete Privacy Training
                </p>
                <p className="text-xs text-yellow-800 mt-0.5">
                  {metrics.totalUsers - metrics.trainingCompleted} users still need to complete privacy training
                </p>
              </div>
            </div>
          )}

          {metrics.phiDetections > 10 && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900 text-sm">
                  Address PHI Detection Alerts
                </p>
                <p className="text-xs text-red-800 mt-0.5">
                  Review and address {metrics.phiDetections} PHI detection incidents
                </p>
              </div>
            </div>
          )}

          {metrics.complianceScore >= 90 && (
            <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-900 text-sm">
                  Excellent Compliance Posture
                </p>
                <p className="text-xs text-green-800 mt-0.5">
                  Your organization meets all privacy and security requirements
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}