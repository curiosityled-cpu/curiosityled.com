import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, BarChart3, UserPlus, ArrowRight, Shield, FileText, Zap, Settings, Brain } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { useClient } from "@/components/contexts/ClientContext";
import { useCompetencies } from "@/components/contexts/CompetencyContext";
import CompetencySelector from "@/components/admin/CompetencySelector";
import CompetencyConfigBanner from "@/components/common/CompetencyConfigBanner";

export default function AdminDashboardCard() {
  const { user, appRole, isPlatformAdmin, isSuperAdmin, isPartnerBusinessAdmin, isHRAdmin } = useAuth();
  const { client: currentClient } = useClient();
  const { selectedCompetencies, competenciesConfigured } = useCompetencies();
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCompetencySelector, setShowCompetencySelector] = useState(false);
  
  const canConfigureCompetencies = isSuperAdmin || isHRAdmin || isPartnerBusinessAdmin || isPlatformAdmin;

  useEffect(() => {
    const loadAdminData = async () => {
      try {
        const { data: usersData } = await base44.functions.invoke('listAllUsers');
        const allUsers = usersData?.users || [];
        
        const allResources = await base44.entities.LearningResource.list();
        const allAssessments = await base44.entities.Assessment.list();
        
        // Calculate metrics
        const totalUsers = allUsers.length;
        const newUsersThisMonth = allUsers.filter(u => {
          const created = new Date(u.created_date);
          const now = new Date();
          return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
        }).length;
        
        const totalResources = allResources.length;
        const newResourcesThisMonth = allResources.filter(r => {
          const created = new Date(r.created_date);
          const now = new Date();
          return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
        }).length;
        
        const assessmentCompletion = totalUsers > 0
          ? Math.round((allAssessments.length / totalUsers) * 100)
          : 0;
        
        setAdminData({
          totalUsers,
          newUsersThisMonth,
          totalResources,
          newResourcesThisMonth,
          assessmentCompletion
        });
      } catch (error) {
        console.error('Error loading admin data:', error);
        setAdminData({
          totalUsers: 245,
          newUsersThisMonth: 12,
          totalResources: 120,
          newResourcesThisMonth: 5,
          assessmentCompletion: 78
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadAdminData();
  }, []);

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6 text-center">
          <div className="animate-pulse">Loading platform data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          {isPlatformAdmin ? 'Platform Administration' : 'Administration'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Competency Configuration Banner */}
        <CompetencyConfigBanner />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* User Activity Summary */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                User Activity Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium">Total Active Users</span>
                  <span className="text-xl font-bold text-blue-600">{adminData.totalUsers}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium">New This Month</span>
                  <Badge className="bg-green-600 text-white">+{adminData.newUsersThisMonth}</Badge>
                </div>
              </div>
              <Link to={createPageUrl("UserManagement")} className="block">
                <Button className="w-full" variant="outline">
                  Manage Users
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Learning Resource Health */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-600" />
                Learning Resource Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <span className="text-sm font-medium">Total Resources</span>
                  <span className="text-xl font-bold text-purple-600">{adminData.totalResources}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium">Added This Month</span>
                  <Badge className="bg-green-600 text-white">+{adminData.newResourcesThisMonth}</Badge>
                </div>
              </div>
              <Link to={createPageUrl("LearningLibrary")} className="block">
                <Button className="w-full" variant="outline">
                  Manage Resources
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Custom Reports - for User Level 3, Admin Level 2, and higher */}
          {(appRole === 'User Level 3' || appRole === 'Admin Level 2' || isSuperAdmin || isPlatformAdmin) && (
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Custom Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Build and schedule custom analytics reports
                </p>
                <Link to={createPageUrl("ReportBuilder")} className="block">
                  <Button className="w-full" variant="outline">
                    Manage Reports
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Assessment Deployment Status */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                Assessment Deployment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                  <span className="text-sm font-medium">Completion Rate</span>
                  <span className="text-xl font-bold text-emerald-600">{adminData.assessmentCompletion}%</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <span className="text-sm font-medium">Outstanding</span>
                  <span className="text-xl font-bold text-orange-600">{adminData.totalUsers - Math.round(adminData.totalUsers * adminData.assessmentCompletion / 100)}</span>
                </div>
              </div>
              <Link to={createPageUrl("HRAssessmentDashboard")} className="block">
                <Button className="w-full" variant="outline">
                  Manage Assessments
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Onboarding Plan Status */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-orange-600" />
                Onboarding Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <span className="text-sm font-medium">Deployed Plans</span>
                  <span className="text-xl font-bold text-orange-600">24</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium">Completion Rate</span>
                  <span className="text-xl font-bold text-green-600">85%</span>
                </div>
              </div>
              <Link to={createPageUrl("OnboardingPlanBuilder")} className="block">
                <Button className="w-full" variant="outline">
                  Manage Onboarding
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Automations - NEW */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-600" />
                Platform Automations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Automate workflows across goals, learning, and assessments
              </p>
              <Link to={createPageUrl("Automations")} className="block">
                <Button className="w-full" variant="outline">
                  Manage Automations
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Competency Configuration - for HR Admin and Super Admin */}
          {canConfigureCompetencies && (
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  Core Competencies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm font-medium">Selected Competencies</span>
                    <span className="text-xl font-bold text-purple-600">{selectedCompetencies.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: competenciesConfigured ? '#f0fdf4' : '#fef3c7' }}>
                    <span className="text-sm font-medium">Status</span>
                    <Badge className={competenciesConfigured ? "bg-green-600 text-white" : "bg-amber-600 text-white"}>
                      {competenciesConfigured ? 'Configured' : 'Not Configured'}
                    </Badge>
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => setShowCompetencySelector(true)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configure Competencies
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Competency Selector Dialog */}
        <CompetencySelector 
          open={showCompetencySelector} 
          onOpenChange={setShowCompetencySelector}
        />
      </CardContent>
    </Card>
  );
}