import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Globe, Building2, Target, TrendingUp, Loader2, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function PlatformAdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [allGoals, setAllGoals] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    loadPlatformData();
  }, []);

  const loadPlatformData = async () => {
    setLoading(true);
    try {
      const [clientsData, goalsData, itemsData, usersResponse] = await Promise.all([
        base44.entities.Client.list("-created_date"),
        base44.entities.Goal.list("-updated_date"),
        base44.entities.Item.list("-updated_date"),
        base44.functions.invoke('listAllUsers')
      ]);

      setClients(clientsData);
      setAllGoals(goalsData);
      setAllItems(itemsData);
      setAllUsers(usersResponse.data?.users || []);
    } catch (error) {
      console.error("Error loading platform data:", error);
    }
    setLoading(false);
  };

  const metrics = useMemo(() => {
    const totalClients = clients.length;
    const totalGoals = allGoals.length;
    const totalTasks = allItems.length;
    const totalUsers = allUsers.length;
    const completedTasks = allItems.filter(item => item.data?.status === 'completed').length;
    const platformCompletion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const clientRanking = clients.map(client => {
      const clientGoals = allGoals.filter(g => g.client_id === client.id);
      const clientGoalIds = clientGoals.map(g => g.id);
      const clientTasks = allItems.filter(item => clientGoalIds.includes(item.board_id));
      const clientCompleted = clientTasks.filter(t => t.data?.status === 'completed').length;
      const completion = clientTasks.length > 0 
        ? Math.round((clientCompleted / clientTasks.length) * 100)
        : 0;
      
      const clientUsers = allUsers.filter(u => u.client_id === client.id).length;

      return {
        name: client.name,
        goals: clientGoals.length,
        tasks: clientTasks.length,
        users: clientUsers,
        completion
      };
    }).sort((a, b) => b.completion - a.completion);

    return {
      totalClients,
      totalGoals,
      totalTasks,
      totalUsers,
      platformCompletion,
      clientRanking
    };
  }, [clients, allGoals, allItems, allUsers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="w-12 h-12 rounded-lg bg-purple-500 flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{metrics.totalClients}</div>
              <p className="text-sm text-gray-500 mt-1">Total Clients</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{metrics.totalUsers}</div>
              <p className="text-sm text-gray-500 mt-1">Total Users</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{metrics.totalGoals}</div>
              <p className="text-sm text-gray-500 mt-1">Total Goals</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="w-12 h-12 rounded-lg bg-emerald-500 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{metrics.platformCompletion}%</div>
              <p className="text-sm text-gray-500 mt-1">Completion Rate</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="w-12 h-12 rounded-lg bg-orange-500 flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{metrics.totalTasks}</div>
              <p className="text-sm text-gray-500 mt-1">Total Tasks</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Client Performance Ranking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Client Performance Ranking
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.clientRanking.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={metrics.clientRanking}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: 'Completion %', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="completion" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No client data available</p>
          )}
        </CardContent>
      </Card>

      {/* Client Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Client Portfolio Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.clientRanking.map((client, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-600' : 'bg-gray-300'
                  } text-white text-sm font-bold`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{client.name}</p>
                    <p className="text-sm text-gray-500">
                      {client.users} users · {client.goals} goals · {client.tasks} tasks
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500"
                      style={{ width: `${client.completion}%` }}
                    />
                  </div>
                  <Badge variant="outline" className="min-w-[3rem] justify-center">
                    {client.completion}%
                  </Badge>
                </div>
              </div>
            ))}
            {metrics.clientRanking.length === 0 && (
              <p className="text-gray-500 text-center py-8">No clients found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}