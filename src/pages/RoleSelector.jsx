import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, Check, AlertCircle, User, Users, Building2, Target, Crown, Sparkles, BarChart3, Settings as SettingsIcon, Trophy, Bell } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/useAuth";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

function RoleSelector() {
  const { user, refreshUser } = useAuth();
  
  const roles = [
    {
      id: 'User Level 1',
      title: 'User',
      description: 'Managers and high-potential individual contributors',
      icon: User,
      color: 'bg-blue-500'
    },
    {
      id: 'User Level 2',
      title: 'Team Leader',
      description: 'Manage direct reports and team development',
      icon: Users,
      color: 'bg-purple-500'
    },
    {
      id: 'Analyst',
      title: 'Analyst',
      description: 'Organizational analytics and reporting (read-only)',
      icon: BarChart3,
      color: 'bg-emerald-500'
    },
    {
      id: 'Executive',
      title: 'Executive',
      description: 'Executive-level organizational insights and analytics',
      icon: Crown,
      color: 'bg-teal-500'
    },
    {
      id: 'Admin Level 1',
      title: 'Program Administrator',
      description: 'Manage leadership development programs',
      icon: Target,
      color: 'bg-orange-500'
    },
    {
      id: 'Admin Level 2',
      title: 'HR Administrator',
      description: 'HR administration and analytics',
      icon: Shield,
      color: 'bg-red-500'
    },
    {
      id: 'Super Administrator',
      title: 'Super Administrator',
      description: 'Organization-level super administrator',
      icon: Crown,
      color: 'bg-yellow-500',
      badge: 'Organization Admin'
    },
    {
      id: 'Partner Business Administrator',
      title: 'Partner Business Administrator',
      description: 'Partner-level administration and client management',
      icon: Sparkles,
      color: 'bg-gradient-to-r from-indigo-600 to-purple-600',
      badge: 'Partner Admin'
    },
    {
      id: 'Platform Admin',
      title: 'Platform Administrator',
      description: 'Curiosity Led staff - Full platform access',
      icon: Sparkles,
      color: 'bg-gradient-to-r from-purple-600 to-pink-600',
      badge: 'Curiosity Led Only'
    }
  ];

  const [selectedRole, setSelectedRole] = useState(user?.app_role || "User Level 1");
  const [updating, setUpdating] = useState(false);

  const currentUserRole = roles.find((r) => r.id === user?.app_role);
  const CurrentRoleIcon = currentUserRole?.icon || Shield;

  const handleUpdateRole = async () => {
    setUpdating(true);
    try {
      const response = await base44.functions.invoke('setMyRole', { role: selectedRole });
      
      if (response.data?.success) {
        toast.success(`Role updated to ${roles.find(r => r.id === selectedRole)?.title}`);
        await refreshUser();
        
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        toast.error(response.data?.error || 'Failed to update role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex">
      {/* Left Sidebar Navigation */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-gray-200 flex-col sticky top-16 h-fit">
        <div className="p-6 space-y-1">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">User Pages</h3>
          <Link to={createPageUrl("Profile")} className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            <User className="w-4 h-4" />
            <span className="text-sm font-medium">My Profile</span>
          </Link>
          <Link to={createPageUrl("Achievements")} className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            <Trophy className="w-4 h-4" />
            <span className="text-sm font-medium">Achievements</span>
          </Link>
          <Link to={createPageUrl("Notifications")} className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            <Bell className="w-4 h-4" />
            <span className="text-sm font-medium">Notifications</span>
          </Link>
          <Link to={createPageUrl("Settings")} className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            <SettingsIcon className="w-4 h-4" />
            <span className="text-sm font-medium">Settings</span>
          </Link>
          <Link to={createPageUrl("RoleSelector")} className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-blue-600 bg-blue-50 transition-colors font-medium border-l-2 border-blue-600">
            <Target className="w-4 h-4" />
            <span className="text-sm font-medium">Change Role</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center"
          >
            <Badge className="mb-4 bg-purple-100 text-purple-800">
              Role Management
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Update Your Role
            </h1>
            <p className="text-gray-600">
              Change your role to test different user experiences
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="shadow-xl border-0">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <CurrentRoleIcon className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle>Current Role</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  {currentUserRole && (
                    <Badge className={`${currentUserRole.color} text-white`}>
                      {currentUserRole.title}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Testing Feature</p>
                      <p className="text-xs text-blue-700 mt-1">
                        This page allows you to change your role for testing purposes. 
                        In production, roles would be managed by administrators only.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">
                    Select New Role
                  </label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          <div className="flex items-center gap-2">
                            <role.icon className="h-4 w-4 text-gray-500" />
                            <div className="flex flex-col">
                              <span className="font-medium flex items-center gap-2">
                                {role.title}
                                {role.badge && (
                                  <Badge variant="outline" className="text-xs px-1 py-0.5 ml-2 border-purple-400 text-purple-700">
                                    {role.badge}
                                  </Badge>
                                )}
                              </span>
                              <span className="text-xs text-gray-500">{role.description}</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedRole !== user?.app_role && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 bg-amber-50 rounded-lg border border-amber-200"
                  >
                    <p className="text-sm text-amber-800">
                      <strong>Note:</strong> Changing your role will reload the page and update 
                      your access permissions throughout the application.
                    </p>
                  </motion.div>
                )}

                <Button
                  onClick={handleUpdateRole}
                  disabled={updating || selectedRole === user?.app_role}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  size="lg"
                >
                  {updating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating Role...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Update My Role
                    </>
                  )}
                </Button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  {roles.map((role) => (
                    <div
                      key={role.id}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedRole === role.id
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 bg-white'
                      } flex items-start gap-3`}
                    >
                      <role.icon className="h-5 w-5 text-gray-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 flex items-center">
                          {role.title}
                          {role.badge && (
                            <Badge variant="outline" className="text-xs px-1 py-0.5 ml-2 border-purple-400 text-purple-700">
                              {role.badge}
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{role.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default withAuthProtection(RoleSelector);