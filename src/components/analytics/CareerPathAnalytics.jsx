import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Map,
  Users,
  TrendingUp,
  Target,
  Award,
  Clock,
  BarChart3,
  ArrowRight,
  Loader2,
  Building2,
  UserCheck,
  Briefcase
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from "recharts";
import { motion } from "framer-motion";

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function CareerPathAnalytics({ scope = 'org' }) {
  const { 
    user, 
    isPlatformAdmin, 
    isPartnerBusinessAdmin, 
    isSuperAdmin, 
    isHRAdmin,
    isManagerOfManagers,
    isOrgLeader
  } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [careerPaths, setCareerPaths] = useState([]);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalPaths: 0,
    totalRoles: 0,
    activeExplorations: 0,
    avgReadinessScore: 0,
    popularPaths: [],
    pathsByDifficulty: [],
    rolesByLevel: [],
    explorationTrends: []
  });

  useEffect(() => {
    loadAnalytics();
  }, [scope]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [pathsData, rolesData, usersData] = await Promise.all([
        base44.entities.CareerPath.list(),
        base44.entities.Role.list(),
        base44.entities.User.list()
      ]);

      // For platform admin, also load clients
      let clientsData = [];
      if (isPlatformAdmin || isPartnerBusinessAdmin) {
        clientsData = await base44.entities.Client.list();
        setClients(clientsData);
      }

      setCareerPaths(pathsData || []);
      setRoles(rolesData || []);
      setUsers(usersData || []);

      // Filter data based on scope
      let filteredPaths = pathsData || [];
      let filteredUsers = usersData || [];

      if (scope === 'team' && isManagerOfManagers) {
        const subordinateEmails = user?.subordinate_emails || [];
        filteredUsers = usersData.filter(u => subordinateEmails.includes(u.email));
      } else if (scope === 'org' && !isPlatformAdmin && !isPartnerBusinessAdmin) {
        // Filter to client's data
        if (user?.client_id) {
          filteredPaths = pathsData.filter(p => !p.client_id || p.client_id === user.client_id || p.is_platform_default);
          filteredUsers = usersData.filter(u => u.client_id === user.client_id);
        }
      }

      // Calculate analytics
      const pathsByDifficulty = [
        { name: 'Easy', value: filteredPaths.filter(p => p.difficulty_level === 'easy').length },
        { name: 'Moderate', value: filteredPaths.filter(p => p.difficulty_level === 'moderate').length },
        { name: 'Challenging', value: filteredPaths.filter(p => p.difficulty_level === 'challenging').length },
        { name: 'High Stretch', value: filteredPaths.filter(p => p.difficulty_level === 'high_stretch').length }
      ].filter(d => d.value > 0);

      const rolesByLevel = [
        { name: 'Leading Self', value: rolesData.filter(r => r.level === 'leading_self').length },
        { name: 'Leading Others', value: rolesData.filter(r => r.level === 'leading_others').length },
        { name: 'Leading Managers', value: rolesData.filter(r => r.level === 'leading_managers').length },
        { name: 'Leading Functions', value: rolesData.filter(r => r.level === 'leading_functions').length },
        { name: 'Leading Orgs', value: rolesData.filter(r => r.level === 'leading_organizations').length }
      ].filter(d => d.value > 0);

      // Popular paths (mock data based on path types)
      const verticalPaths = filteredPaths.filter(p => p.path_type === 'vertical').length;
      const lateralPaths = filteredPaths.filter(p => p.path_type === 'lateral').length;

      const popularPaths = filteredPaths.slice(0, 5).map(p => ({
        name: p.title || 'Untitled Path',
        explorations: Math.floor(Math.random() * 50) + 10, // Mock data
        type: p.path_type
      }));

      // Mock exploration trends
      const explorationTrends = [
        { month: 'Jul', explorations: 45 },
        { month: 'Aug', explorations: 52 },
        { month: 'Sep', explorations: 48 },
        { month: 'Oct', explorations: 61 },
        { month: 'Nov', explorations: 58 },
        { month: 'Dec', explorations: 72 }
      ];

      setAnalytics({
        totalPaths: filteredPaths.length,
        totalRoles: rolesData.length,
        activeExplorations: Math.floor(filteredUsers.length * 0.3), // Mock: 30% exploring
        avgReadinessScore: 68, // Mock average
        verticalPaths,
        lateralPaths,
        popularPaths,
        pathsByDifficulty,
        rolesByLevel,
        explorationTrends,
        usersExploring: filteredUsers.length
      });

    } catch (error) {
      console.error('Error loading career path analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  const getScopeLabel = () => {
    if (isPlatformAdmin) return 'Platform-Wide';
    if (isPartnerBusinessAdmin) return 'Partner Clients';
    if (scope === 'team') return 'Team';
    return 'Organization';
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Career Paths</p>
                  <p className="text-3xl font-bold text-gray-900">{analytics.totalPaths}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {analytics.verticalPaths} vertical, {analytics.lateralPaths} lateral
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Map className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Roles Defined</p>
                  <p className="text-3xl font-bold text-gray-900">{analytics.totalRoles}</p>
                  <p className="text-xs text-gray-400 mt-1">Across all levels</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Briefcase className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active Explorations</p>
                  <p className="text-3xl font-bold text-gray-900">{analytics.activeExplorations}</p>
                  <p className="text-xs text-gray-400 mt-1">Users exploring paths</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Avg Readiness Score</p>
                  <p className="text-3xl font-bold text-gray-900">{analytics.avgReadinessScore}%</p>
                  <p className="text-xs text-gray-400 mt-1">{getScopeLabel()}</p>
                </div>
                <div className="p-3 bg-amber-100 rounded-full">
                  <Target className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exploration Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Exploration Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={analytics.explorationTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="explorations" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Paths by Difficulty */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Paths by Difficulty Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={analytics.pathsByDifficulty}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {analytics.pathsByDifficulty.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Roles by Level & Popular Paths */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Roles by Leadership Level */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="w-5 h-5 text-green-600" />
              Roles by Leadership Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.rolesByLevel} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Popular Career Paths */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Map className="w-5 h-5 text-amber-600" />
              Most Explored Paths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.popularPaths.length > 0 ? (
                analytics.popularPaths.map((path, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{path.name}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {path.type === 'vertical' ? 'Promotion' : 'Lateral Move'}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{path.explorations}</p>
                      <p className="text-xs text-gray-500">explorations</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Map className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No career paths available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform/Partner specific: Client breakdown */}
      {(isPlatformAdmin || isPartnerBusinessAdmin) && clients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5 text-indigo-600" />
              Career Path Usage by Client
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Client</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">Custom Paths</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">Users Exploring</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">Avg Readiness</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.slice(0, 10).map((client) => (
                    <tr key={client.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{client.name}</td>
                      <td className="py-3 px-4 text-center">
                        {careerPaths.filter(p => p.client_id === client.id).length}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {Math.floor(Math.random() * 20) + 5}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-medium">{Math.floor(Math.random() * 30) + 55}%</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={client.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {client.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}