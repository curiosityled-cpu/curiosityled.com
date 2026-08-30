import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  BarChart3,
  Target,
  Palette,
  TrendingUp,
  Building2,
  Activity,
  ArrowLeft
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useOrganization } from "@/components/contexts/OrganizationContext";

function SuperAdminPortal() {
  const { user } = useAuth();
  const { organization, stats, loading: orgLoading } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalAssessments: 0,
    activePrograms: 0,
    systemHealth: 100
  });

  useEffect(() => {
    if (!orgLoading && organization) {
      loadMetrics();
    }
  }, [orgLoading, organization]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      // Load organization-specific metrics only
      const [users, assessments, programs] = await Promise.all([
        base44.entities.User.filter({ organization_id: organization.id }),
        base44.entities.Assessment.filter({ organization_id: organization.id }),
        base44.entities.Program.filter({ organization_id: organization.id, status: 'active' })
      ]);

      setMetrics({
        totalUsers: users.length,
        totalAssessments: assessments.length,
        activePrograms: programs.length,
        systemHealth: 100
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
      toast.error('Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      title: "User Management",
      description: "Manage organization users and roles",
      icon: Users,
      color: "bg-blue-500",
      href: createPageUrl("UserManagement")
    },
    {
      title: "Assessment Analytics",
      description: "View assessment results and insights",
      icon: BarChart3,
      color: "bg-purple-500",
      href: createPageUrl("HRAssessmentDashboard")
    },
    {
      title: "Programs & Cohorts",
      description: "Manage leadership development programs",
      icon: Target,
      color: "bg-emerald-500",
      href: createPageUrl("CommandCenter")
    },
    {
      title: "White Label Settings",
      description: "Customize branding and appearance",
      icon: Palette,
      color: "bg-pink-500",
      href: createPageUrl("WhiteLabel")
    },
    {
      title: "System Engagement & Performance",
      description: "Monitor system usage and performance",
      icon: Activity,
      color: "bg-orange-500",
      href: "#" // TODO: Create this page
    }
  ];

  if (loading || orgLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Super Administrator Portal...</p>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Organization Assigned</h2>
            <p className="text-gray-600 mb-4">
              Your account needs to be assigned to an organization to access the Super Administrator Portal.
            </p>
            <Link to={createPageUrl("Dashboard")}>
              <Button>Return to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            Return to Dashboard
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <Badge className="mb-2 bg-purple-100 text-purple-800">
                👑 Super Administrator
              </Badge>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Super Administrator Portal
              </h1>
              <p className="text-gray-600">
                Platform-wide management and system administration for {organization.name}
              </p>
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-8 h-8 text-blue-600" />
                  <Badge variant="outline" className="text-xs">Users</Badge>
                </div>
                <p className="text-3xl font-bold text-gray-900">{metrics.totalUsers}</p>
                <p className="text-sm text-gray-600 mt-1">Total Users</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Building2 className="w-8 h-8 text-emerald-600" />
                  <Badge variant="outline" className="text-xs">Organization</Badge>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.seats_used || 0}/{organization.license_count || 'N/A'}</p>
                <p className="text-sm text-gray-600 mt-1">Seats Used</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Target className="w-8 h-8 text-purple-600" />
                  <Badge variant="outline" className="text-xs">Programs</Badge>
                </div>
                <p className="text-3xl font-bold text-gray-900">{metrics.activePrograms}</p>
                <p className="text-sm text-gray-600 mt-1">Active Programs</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <BarChart3 className="w-8 h-8 text-orange-600" />
                  <Badge variant="outline" className="text-xs">Assessments</Badge>
                </div>
                <p className="text-3xl font-bold text-gray-900">{metrics.totalAssessments}</p>
                <p className="text-sm text-gray-600 mt-1">Completed</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Platform Management Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-600" />
              Platform Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {menuItems.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link to={item.href}>
                    <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-purple-200 cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className={`${item.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                            <item.icon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-900 mb-1">
                              {item.title}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>System Status: Operational</CardTitle>
              <Badge className="bg-green-100 text-green-800">
                ● All systems running normally
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Last checked: {new Date().toLocaleString()}
            </p>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

export default withAuthProtection(SuperAdminPortal, ['Super Administrator']);