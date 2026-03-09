import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Eye
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAuth } from "@/components/useAuth";

export default function OrganizationUsersPanel({ organization, onClose }) {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [assigning, setAssigning] = useState(false);
  const { startImpersonation } = useAuth();
  const [impersonating, setImpersonating] = useState(false);

  useEffect(() => {
    loadData();
  }, [organization]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load client users
      const { data: orgData } = await base44.functions.invoke('getClientUsers', {
        client_id: organization.id
      });
      setUsers(orgData.users);
      setStats(orgData.stats);

      // Load all users for assignment
      const allUsersData = await base44.entities.User.list();
      // Filter out users already in this client
      const availableUsers = allUsersData.filter(
        u => !u.client_id || u.client_id !== organization.id
      );
      setAllUsers(availableUsers);

    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignUsers = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one user');
      return;
    }

    setAssigning(true);
    try {
      const { data } = await base44.functions.invoke('bulkAssignUsersToClient', {
        user_ids: selectedUsers,
        client_id: organization.id
      });

      toast.success(data.message);
      setSelectedUsers([]);
      await loadData();
    } catch (error) {
      console.error('Error assigning users:', error);
      toast.error(error.response?.data?.error || 'Failed to assign users');
    } finally {
      setAssigning(false);
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleProxyAsUser = async (user) => {
    setImpersonating(true);
    try {
      const result = await startImpersonation(user.id);
      if (result.success) {
        toast.success(`Now viewing as ${user.full_name || user.email}`);
        // Close the panel and reload
        setTimeout(() => {
          onClose();
          window.location.href = '/';
        }, 1000);
      } else {
        toast.error(result.error || 'Failed to start impersonation');
      }
    } catch (error) {
      console.error('Error starting impersonation:', error);
      toast.error('Failed to proxy as user');
    } finally {
      setImpersonating(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.app_role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredAvailableUsers = allUsers.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <Card className="max-w-4xl w-full mx-4">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading users...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center overflow-y-auto p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl w-full my-8"
      >
        <Card className="border-0 shadow-2xl">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Users className="w-6 h-6 text-blue-600" />
                  Users - {organization.name}
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Manage user access and assignments for this client
                </p>
              </div>
              <Button variant="ghost" onClick={onClose}>✕</Button>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Stats */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4 text-center">
                  <Users className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-900">{stats.total_users || 0}</p>
                  <p className="text-xs text-blue-700">Total Users</p>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4 text-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-900">{stats.active_users || 0}</p>
                  <p className="text-xs text-green-700">Active Users</p>
                </CardContent>
              </Card>

              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-4 text-center">
                  <AlertCircle className="w-5 h-5 text-orange-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-orange-900">{stats.at_risk_users || 0}</p>
                  <p className="text-xs text-orange-700">At Risk</p>
                </CardContent>
              </Card>

              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-4 text-center">
                  <Users className="w-5 h-5 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-900">
                    {organization.seats_used || 0}/{organization.license_count}
                  </p>
                  <p className="text-xs text-purple-700">Licenses Used</p>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filters */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="User Level 1">User Level 1</SelectItem>
                  <SelectItem value="User Level 2">User Level 2</SelectItem>
                  <SelectItem value="User Level 3">User Level 3</SelectItem>
                  <SelectItem value="Admin Level 1">Admin Level 1</SelectItem>
                  <SelectItem value="Admin Level 2">Admin Level 2</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Current Users List */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Client Users</h3>
              {filteredUsers.length === 0 ? (
                <Card className="bg-gray-50">
                  <CardContent className="p-8 text-center">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">No users found in this client</p>
                  </CardContent>
                </Card>
              ) : (
                filteredUsers.map((user, index) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-medium text-gray-900">{user.full_name || user.email}</p>
                          <Badge className="text-xs">{user.app_role}</Badge>
                          {user.at_risk_flag && (
                            <Badge className="bg-red-100 text-red-800 text-xs">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              At Risk
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        {user.current_role && (
                          <p className="text-xs text-gray-500 mt-1">{user.current_role} • {user.department}</p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleProxyAsUser(user)}
                        disabled={impersonating}
                        className="gap-2"
                      >
                        {impersonating ? (
                          <>
                            <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                            Proxying...
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4" />
                            Proxy As
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Available Users for Assignment */}
            {allUsers.length > 0 && (
              <div className="space-y-3 border-t pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Assign Users to Client</h3>
                  {selectedUsers.length > 0 && (
                    <Button
                      onClick={handleAssignUsers}
                      disabled={assigning}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {assigning ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <UserPlus className="w-4 h-4 mr-2" />
                      )}
                      Assign {selectedUsers.length} User{selectedUsers.length !== 1 ? 's' : ''}
                    </Button>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2">
                  {filteredAvailableUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        selectedUsers.includes(user.id)
                          ? 'bg-blue-50 border-2 border-blue-500'
                          : 'bg-gray-50 border-2 border-transparent hover:border-gray-300'
                      }`}
                      onClick={() => toggleUserSelection(user.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{user.full_name || user.email}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                        <Badge className="text-xs">{user.app_role}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}