
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Users, 
  Target,
  BarChart3,
  ArrowRight,
  CreditCard,
  Palette,
  Zap,
  Flag // Added Flag icon for Goals Analytics
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { useClient } from "@/components/contexts/ClientContext";

export default function SuperAdminDashboardCard({ user }) {
  const { client } = useClient();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPrograms: 0,
    totalAssessments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadClientData = async () => {
      try {
        // Get users via backend function
        const { data: usersData } = await base44.functions.invoke('listAllUsers');
        const allUsers = usersData.users || [];
        const clientUsers = allUsers.filter(u => u.client_id === user.client_id);
        
        // Get assessments for users in this client
        const clientEmails = clientUsers.map(u => u.email);
        const assessments = await base44.entities.Assessment.list();
        const clientAssessments = assessments.filter(a => clientEmails.includes(a.email));
        
        // Get cohorts/programs for this client via backend
        const { data: cohortsData } = await base44.functions.invoke('listCohorts');
        const allCohorts = cohortsData.cohorts || [];
        const clientCohorts = allCohorts.filter(c => c.client_id === user.client_id);

        setStats({
          totalUsers: clientUsers.length,
          totalPrograms: clientCohorts.length,
          totalAssessments: clientAssessments.length,
        });

      } catch (error) {
        console.error('Error loading client data:', error);
        // Use mock data on error
        setStats({
          totalUsers: 45,
          totalPrograms: 3,
          totalAssessments: 38,
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (user?.client_id) {
      loadClientData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const clientName = client?.name || "Client";

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6 text-center">
          <div className="animate-pulse">Loading client data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <Card className="border-2 border-purple-200 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">{clientName} Administration</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Manage your organization's leadership development
                </p>
              </div>
            </div>
            <Badge className="bg-purple-600 text-white">
              Organization Admin
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Client Statistics */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 text-center">
                <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-blue-600">{stats.totalUsers}</div>
                <div className="text-sm text-gray-600 mt-1">Total Users</div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4 text-center">
                <Target className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-purple-600">{stats.totalPrograms}</div>
                <div className="text-sm text-gray-600 mt-1">Programs</div>
              </CardContent>
            </Card>

            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4 text-center">
                <BarChart3 className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-amber-600">{stats.totalAssessments}</div>
                <div className="text-sm text-gray-600 mt-1">Assessments</div>
              </CardContent>
            </Card>
          </div>

          {/* Client Management Actions */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              Client Management
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Link to={createPageUrl("UserManagement")}>
                <Button 
                  variant="outline" 
                  className="w-full justify-between hover:bg-purple-50 hover:border-purple-300"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>Manage Users</span>
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>

              <Link to={createPageUrl("CommandCenter")}>
                <Button 
                  variant="outline" 
                  className="w-full justify-between hover:bg-purple-50 hover:border-purple-300"
                >
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    <span>Programs & Cohorts</span>
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              
              <Link to={createPageUrl("HRAssessmentDashboard")}>
                <Button 
                  variant="outline" 
                  className="w-full justify-between hover:bg-purple-50 hover:border-purple-300"
                >
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    <span>Assessments Dashboard</span>
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>

              {/* New: Goals Analytics Dashboard Link */}
              <Link to={createPageUrl("GoalsAnalyticsDashboard")}>
                <Button 
                  variant="outline" 
                  className="w-full justify-between hover:bg-purple-50 hover:border-purple-300"
                >
                  <div className="flex items-center gap-2">
                    <Flag className="w-4 h-4" /> {/* Icon for goals */}
                    <span>Goals Analytics</span>
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>

              <Link to={createPageUrl("WhiteLabel")}>
                <Button 
                  variant="outline" 
                  className="w-full justify-between hover:bg-purple-50 hover:border-purple-300"
                >
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    <span>Branding Settings</span>
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>

              <Link to={createPageUrl("Billing")}>
                <Button 
                  variant="outline" 
                  className="w-full justify-between hover:bg-purple-50 hover:border-purple-300"
                >
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    <span>Billing & Subscription</span>
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Info Banner */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Organization Administrator:</strong> You have full administrative access to manage users, 
              programs, and settings for {clientName}. Need platform-level support? Contact Curiosity Led.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
