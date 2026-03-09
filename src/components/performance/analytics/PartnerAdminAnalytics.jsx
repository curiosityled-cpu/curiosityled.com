
import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building2, Target, TrendingUp, Users, Loader2, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function PartnerAdminAnalytics({ user }) {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [allGoals, setAllGoals] = useState([]);
  const [allItems, setAllItems] = useState([]);

  useEffect(() => {
    loadPartnerData();
  }, [user]);

  const loadPartnerData = async () => {
    setLoading(true);
    try {
      const partnerClientIds = user.partner_client_ids || [];
      
      const [clientsData, goalsData, itemsData] = await Promise.all([
        base44.entities.Client.filter({ id: { $in: partnerClientIds } }),
        base44.entities.Goal.filter({ client_id: { $in: partnerClientIds } }, "-updated_date"),
        base44.entities.Item.list("-updated_date")
      ]);

      const goalIds = goalsData.map(g => g.id);
      const partnerItemsData = itemsData.filter(item => goalIds.includes(item.board_id));

      setClients(clientsData);
      setAllGoals(goalsData);
      setAllItems(partnerItemsData);
    } catch (error) {
      console.error("Error loading partner data:", error);
    }
    setLoading(false);
  };

  const metrics = useMemo(() => {
    const totalClients = clients.length;
    const totalGoals = allGoals.length;
    const totalTasks = allItems.length;
    const completedTasks = allItems.filter(item => item.data?.status === 'completed').length;
    const avgCompletion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const clientPerformance = clients.map(client => {
      const clientGoals = allGoals.filter(g => g.client_id === client.id);
      const clientGoalIds = clientGoals.map(g => g.id);
      const clientTasks = allItems.filter(item => clientGoalIds.includes(item.board_id));
      const clientCompleted = clientTasks.filter(t => t.data?.status === 'completed').length;
      const clientCompletion = clientTasks.length > 0 
        ? Math.round((clientCompleted / clientTasks.length) * 100)
        : 0;

      return {
        name: client.name,
        goals: clientGoals.length,
        tasks: clientTasks.length,
        completion: clientCompletion
      };
    }).sort((a, b) => b.completion - a.completion);

    return {
      totalClients,
      totalGoals,
      totalTasks,
      avgCompletion,
      clientPerformance
    };
  }, [clients, allGoals, allItems]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Partner Portfolio Performance</h2>
        <p className="text-gray-600 mt-1">Performance metrics across all your managed clients</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 font-medium">
                <Building2 className="w-5 h-5" />
                Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.totalClients}</div>
              <p className="text-indigo-100 text-sm mt-1">Managed clients</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 font-medium">
                <Target className="w-5 h-5" />
                Total Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.totalGoals}</div>
              <p className="text-blue-100 text-sm mt-1">Across all clients</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 font-medium">
                <TrendingUp className="w-5 h-5" />
                Avg Completion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.avgCompletion}%</div>
              <Progress value={metrics.avgCompletion} className="mt-2 bg-green-300 h-1.5" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 font-medium">
                <Users className="w-5 h-5" />
                Total Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.totalTasks}</div>
              <p className="text-purple-100 text-sm mt-1">All clients</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Client Benchmarking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" />
            Client Performance Benchmarking
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.clientPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.clientPerformance}>
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

      {/* Client Details */}
      <Card>
        <CardHeader>
          <CardTitle>Client Portfolio Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.clientPerformance.map((client, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{client.name}</p>
                  <p className="text-sm text-gray-500">{client.goals} goals · {client.tasks} tasks</p>
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
            {metrics.clientPerformance.length === 0 && (
              <p className="text-gray-500 text-center py-8">No clients assigned</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
