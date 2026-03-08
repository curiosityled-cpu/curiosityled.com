import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BookOpen, 
  Target, 
  Mail, 
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Filter,
  TrendingUp
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function InterventionHistoryTab({ managerEmail }) {
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (managerEmail) {
      loadInterventions();
    }
  }, [managerEmail]);

  const loadInterventions = async () => {
    setLoading(true);
    try {
      // Fetch all interventions created by this manager
      const [goals, learning, notifications] = await Promise.all([
        base44.entities.Goal.filter({ assigned_by: managerEmail }, '-created_date', 100),
        base44.entities.AssignedLearning.filter({ assigned_by: managerEmail }, '-created_date', 100),
        base44.entities.Notification.filter({ 
          created_by: managerEmail,
          type: { "$in": ["nudge", "1on1_scheduled"] }
        }, '-created_date', 100)
      ]);

      // Combine and normalize
      const combined = [
        ...goals.map(g => ({
          id: g.id,
          type: 'goal',
          target_email: g.user_email,
          title: g.title,
          status: g.status,
          created_date: g.created_date,
          due_date: g.due_date,
          completion: g.completion_percentage || 0
        })),
        ...learning.map(l => ({
          id: l.id,
          type: 'learning',
          target_email: l.user_email,
          title: l.title,
          status: l.status,
          created_date: l.created_date,
          due_date: l.due_date,
          completion: l.status === 'completed' ? 100 : 0
        })),
        ...notifications.map(n => ({
          id: n.id,
          type: n.type === '1on1_scheduled' ? '1on1' : 'nudge',
          target_email: n.user_email,
          title: n.title,
          status: n.status,
          created_date: n.created_date,
          completion: n.status === 'sent' ? 100 : 0
        }))
      ];

      // Sort by date descending
      combined.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      
      setInterventions(combined);
    } catch (error) {
      console.error('Error loading interventions:', error);
      toast.error('Failed to load intervention history');
    } finally {
      setLoading(false);
    }
  };

  const filteredInterventions = interventions.filter(i => {
    const typeMatch = filterType === 'all' || i.type === filterType;
    const statusMatch = filterStatus === 'all' || i.status === filterStatus;
    return typeMatch && statusMatch;
  });

  const interventionStats = {
    total: interventions.length,
    goals: interventions.filter(i => i.type === 'goal').length,
    learning: interventions.filter(i => i.type === 'learning').length,
    nudges: interventions.filter(i => i.type === 'nudge').length,
    completed: interventions.filter(i => i.status === 'completed').length,
    completionRate: interventions.length > 0 
      ? Math.round((interventions.filter(i => i.status === 'completed').length / interventions.length) * 100)
      : 0
  };

  const getInterventionIcon = (type) => {
    switch(type) {
      case 'goal': return Target;
      case 'learning': return BookOpen;
      case 'nudge': return Mail;
      case '1on1': return Calendar;
      default: return Clock;
    }
  };

  const getInterventionColor = (type) => {
    switch(type) {
      case 'goal': return 'text-green-600';
      case 'learning': return 'text-purple-600';
      case 'nudge': return 'text-orange-600';
      case '1on1': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'completed': { bg: 'bg-green-100 text-green-800', icon: CheckCircle },
      'active': { bg: 'bg-blue-100 text-blue-800', icon: Clock },
      'pending_acceptance': { bg: 'bg-yellow-100 text-yellow-800', icon: Clock },
      'assigned': { bg: 'bg-blue-100 text-blue-800', icon: Clock },
      'in_progress': { bg: 'bg-purple-100 text-purple-800', icon: Clock },
      'overdue': { bg: 'bg-red-100 text-red-800', icon: AlertCircle },
      'sent': { bg: 'bg-green-100 text-green-800', icon: CheckCircle }
    };

    const config = statusConfig[status] || statusConfig['active'];
    const Icon = config.icon;

    return (
      <Badge className={config.bg}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{interventionStats.total}</p>
            <p className="text-xs text-gray-600">Total</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{interventionStats.goals}</p>
            <p className="text-xs text-gray-600">Goals</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <BookOpen className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{interventionStats.learning}</p>
            <p className="text-xs text-gray-600">Learning</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Mail className="w-6 h-6 text-orange-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{interventionStats.nudges}</p>
            <p className="text-xs text-gray-600">Nudges</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{interventionStats.completed}</p>
            <p className="text-xs text-gray-600">Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{interventionStats.completionRate}%</p>
            <p className="text-xs text-gray-600">Success Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filter Interventions
            </CardTitle>
            <Button variant="outline" size="sm" onClick={loadInterventions}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label className="text-xs text-gray-600 mb-1 block">Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="goal">Goals</SelectItem>
                  <SelectItem value="learning">Learning</SelectItem>
                  <SelectItem value="nudge">Nudges</SelectItem>
                  <SelectItem value="1on1">1:1 Meetings</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Label className="text-xs text-gray-600 mb-1 block">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending_acceptance">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interventions List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Your Interventions ({filteredInterventions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredInterventions.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">
                {interventions.length === 0 
                  ? "No interventions yet. Start supporting your team's development!" 
                  : "No interventions match your filters."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInterventions.map((intervention, idx) => {
                const Icon = getInterventionIcon(intervention.type);
                const color = getInterventionColor(intervention.type);

                return (
                  <motion.div
                    key={intervention.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="p-4 border rounded-lg hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-5 h-5 ${color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 mb-1">{intervention.title}</h4>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                            <span className="truncate">To: {intervention.target_email}</span>
                            {intervention.due_date && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Due: {format(new Date(intervention.due_date), 'MMM d, yyyy')}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs capitalize">
                              {intervention.type}
                            </Badge>
                            {getStatusBadge(intervention.status)}
                            <span className="text-xs text-gray-500">
                              {format(new Date(intervention.created_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {intervention.type !== 'nudge' && intervention.completion !== undefined && (
                        <div className="text-right ml-4">
                          <p className="text-sm font-medium text-gray-900">{intervention.completion}%</p>
                          <p className="text-xs text-gray-600">Complete</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}