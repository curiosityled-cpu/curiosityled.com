import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  User, 
  Mail, 
  Briefcase, 
  Building2, 
  Users, 
  Calendar,
  Loader2,
  CheckCircle2,
  Info,
  ArrowLeft,
  Shield,
  Eye
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { usePageContext } from "../Layout";
import ExternalQualificationsSection from "@/components/profile/ExternalQualificationsSection";
import { Switch } from "@/components/ui/switch";

export default function Profile() {
  const { user, roleDisplayName, loading: authLoading, reloadUser, impersonation } = useAuth();
  const { updatePageContext } = usePageContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [clientName, setClientName] = useState(null);
  const [profileData, setProfileData] = useState({
    display_name: '',
    current_role: '',
    department: '',
    sector: '',
    manager_email: '',
    start_date: '',
    share_career_path_with_manager: false,
    // Assuming notification_preferences might be part of the profile data for context building
    notification_preferences: {} 
  });

  useEffect(() => {
    // Wait for auth to load before loading profile
    if (!authLoading && user) {
      loadProfile();
      // Fetch client name if user has a client_id
      if (user.client_id) {
        base44.entities.Client.list()
          .then(clients => {
            const currentClient = clients.find(c => c.id === user.client_id);
            setClientName(currentClient?.name || null);
          })
          .catch(error => {
            console.error('Error fetching client:', error);
            setClientName(null);
          });
      }
    }
  }, [authLoading, user]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      // Use user from useAuth context - this respects impersonation
      // Only fall back to base44.auth.me() if user isn't loaded yet
      const userData = user || await base44.auth.me();
      setProfileData({
        display_name: userData.display_name || userData.full_name || '',
        current_role: userData.current_role || '',
        department: userData.department || '',
        sector: userData.sector || '',
        manager_email: userData.manager_email || '',
        start_date: userData.start_date || '',
        share_career_path_with_manager: userData.share_career_path_with_manager || false,
        notification_preferences: userData.notification_preferences || {} // Assuming this field exists
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build clean profile data without notification_preferences
      const cleanProfileData = {
        display_name: profileData.display_name,
        current_role: profileData.current_role,
        department: profileData.department,
        sector: profileData.sector,
        manager_email: profileData.manager_email,
        start_date: profileData.start_date,
        share_career_path_with_manager: profileData.share_career_path_with_manager
      };
      
      // Use service-role backend function to update user profile
      const response = await base44.functions.invoke('updateUserProfile', {
        user_id: user.id,
        profile_data: cleanProfileData
      });
      
      const result = response?.data || response;
      
      if (result.success) {
        toast.success('Profile updated successfully!');
        setIsEditing(false);
        reloadUser();
      } else {
        throw new Error(result.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Enhanced: Build comprehensive context for Atreus
  const buildAICoachContext = () => {
    if (!profileData || !user) return {}; // Ensure user is loaded for email/role info

    const completedFields = [
      profileData.display_name,
      user.email, // Use user.email as it's not in profileData state
      profileData.current_role,
      profileData.department,
      profileData.start_date
    ].filter(Boolean).length;

    const totalFields = 5;
    const profileCompleteness = Math.round((completedFields / totalFields) * 100);

    return {
      current_filters: null,
      visible_data_summary: {
        profile_completeness: profileCompleteness,
        has_assessment: !!user?.email, // Keeping as per outline, assuming 'email' is a proxy for something
        role: roleDisplayName, // Use roleDisplayName from useAuth
        department: profileData.department,
        start_date: profileData.start_date,
        manager: profileData.manager_email
      },
      selected_items: null,
      modal_focus: isEditing ? 'profile_edit_mode' : null,
      page_specific_insights: {
        profile_complete: profileCompleteness === 100,
        missing_fields: totalFields - completedFields,
        has_manager: !!profileData.manager_email,
        notification_preferences_set: Object.keys(profileData.notification_preferences || {}).length > 0,
        can_edit: true // Always true for the user's own profile
      },
      available_actions: getAvailableActions(),
      viewing_focus: isEditing ? 'profile_form' : 'profile_view'
    };
  };

  const getAvailableActions = () => {
    const actions = [];
    
    if (!isEditing) {
      actions.push({
        action: 'edit_profile',
        description: 'Update your profile information'
      });
    } else {
      actions.push({
        action: 'save_changes',
        description: 'Save your profile updates'
      });
      
      actions.push({
        action: 'cancel_edit',
        description: 'Discard changes and return to view mode'
      });
    }
    
    const completedFields = [
      profileData.display_name,
      user.email, // Use user.email for completeness check
      profileData.current_role,
      profileData.department,
      profileData.start_date
    ].filter(Boolean).length;
    
    if (completedFields < 5) {
      actions.push({
        action: 'complete_profile',
        description: `Complete your profile (${5 - completedFields} fields remaining)`
      });
    }
    
    actions.push({
      action: 'view_assessment',
      description: 'View your leadership assessment results'
    });
    
    actions.push({
      action: 'manage_notifications',
      description: 'Configure notification preferences'
    });
    
    return actions;
  };

  // Update context when profile data or editing state changes
  useEffect(() => {
    // Only update context if user and profileData are loaded
    if (user && profileData.display_name !== '') { // Use a specific field to check if profileData is loaded
      const context = buildAICoachContext();
      updatePageContext(context);
    }
  }, [profileData, isEditing, user, roleDisplayName]); // Added user and roleDisplayName as dependencies for context

  if (loading || authLoading) { // Combine with authLoading
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                My Profile
              </h1>
              <p className="text-gray-600">
                Manage your personal and professional information
              </p>
            </div>
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)}>
                <User className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <p className="text-sm text-gray-600">
                Core identity fields managed by your administrator
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600">Full Name</Label>
                  <div className="flex items-center gap-2 mt-2 p-3 bg-gray-50 rounded-lg">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-900">{user.full_name}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Contact HR admin to update
                  </p>
                </div>

                <div>
                  <Label className="text-gray-600">Email Address</Label>
                  <div className="flex items-center gap-2 mt-2 p-3 bg-gray-50 rounded-lg">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-900">{user.email}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Contact HR admin to update
                  </p>
                </div>

                <div>
                   <Label className="text-gray-600">Application Role</Label>
                   <div className="mt-2">
                     <Badge variant="outline" className="px-3 py-1.5">
                       <Shield className="w-3 h-3 mr-1" />
                       {roleDisplayName}
                     </Badge>
                   </div>
                   <p className="text-xs text-gray-500 mt-1">
                     Role assigned by administrator
                   </p>
                 </div>

                 {user.client_id && (
                   <div>
                     <Label className="text-gray-600">Organization</Label>
                     <div className="flex items-center gap-2 mt-2 p-3 bg-gray-50 rounded-lg">
                       <Building2 className="w-4 h-4 text-gray-500" />
                       <span className="text-gray-900">{clientName || 'Loading...'}</span>
                     </div>
                   </div>
                 )}

                 {user.created_date && (
                   <div>
                     <Label className="text-gray-600">Member Since</Label>
                     <div className="flex items-center gap-2 mt-2 p-3 bg-gray-50 rounded-lg">
                       <Calendar className="w-4 h-4 text-gray-500" />
                       <span className="text-gray-900">
                         {format(new Date(user.created_date), 'MMMM d, yyyy')}
                       </span>
                     </div>
                   </div>
                 )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <p className="text-sm text-gray-600">
                Update your personal details
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="display_name">Display Name</Label>
                <div className="flex items-center gap-2 mt-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <Input
                    id="display_name"
                    value={profileData.display_name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, display_name: e.target.value }))}
                    placeholder="Enter your display name"
                    disabled={!isEditing}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  This name will be displayed throughout the application
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Professional Information</CardTitle>
              <p className="text-sm text-gray-600">
                Keep your work details up to date
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="current_role">Current Role/Title</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Briefcase className="w-4 h-4 text-gray-500" />
                  <Input
                    id="current_role"
                    value={profileData.current_role}
                    onChange={(e) => setProfileData(prev => ({ ...prev, current_role: e.target.value }))}
                    placeholder="e.g., Senior Manager, Team Lead"
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="department">Department</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    <Input
                      id="department"
                      value={profileData.department}
                      onChange={(e) => setProfileData(prev => ({ ...prev, department: e.target.value }))}
                      placeholder="e.g., Engineering, Sales"
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="sector">Industry Sector</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    <Input
                      id="sector"
                      value={profileData.sector}
                      onChange={(e) => setProfileData(prev => ({ ...prev, sector: e.target.value }))}
                      placeholder="e.g., Technology, Finance"
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="manager_email">Manager's Email</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <Input
                    id="manager_email"
                    type="email"
                    value={profileData.manager_email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, manager_email: e.target.value }))}
                    placeholder="manager@company.com"
                    disabled={!isEditing}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Your direct manager's email address for reporting structure
                </p>
              </div>

              <div>
                <Label htmlFor="start_date">Start Date</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <Input
                    id="start_date"
                    type="date"
                    value={profileData.start_date}
                    onChange={(e) => setProfileData(prev => ({ ...prev, start_date: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Your start date with the organization
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <p className="text-sm text-gray-600">
                Control what information your manager can see
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Eye className="w-4 h-4 text-gray-700" />
                    <Label htmlFor="share_career" className="text-gray-900 font-medium cursor-pointer">
                      Share Career Path with Manager
                    </Label>
                  </div>
                  <p className="text-sm text-gray-600">
                    When enabled, your direct manager can view your career path exploration, 
                    readiness scores, and development areas to better support your growth.
                  </p>
                </div>
                <Switch
                  id="share_career"
                  checked={profileData.share_career_path_with_manager}
                  onCheckedChange={(checked) => setProfileData(prev => ({ ...prev, share_career_path_with_manager: checked }))}
                  disabled={!isEditing}
                />
              </div>
            </CardContent>
          </Card>

          <ExternalQualificationsSection user={user} />

          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              <strong>Password Reset:</strong> To change your password, please contact your administrator or use the password reset link on the login page.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}