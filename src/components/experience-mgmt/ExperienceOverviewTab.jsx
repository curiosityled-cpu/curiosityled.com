import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, AlertTriangle, TrendingUp, CheckCircle, Search, X,
  ChevronRight, Plus, Pencil, Trash2, BookOpen, Layers, Star
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";

const getRiskLevel = (insight) => {
  if (!insight) return { label: 'No Data', color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200', dot: 'bg-gray-400' };
  const flags = insight.risk_flags?.length || 0;
  if (flags === 0) return { label: 'On Track', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' };
  if (flags === 1) return { label: 'Developing', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' };
  return { label: 'At Risk', color: 'text-red-700', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' };
};

const STATUS_BADGE = {
  assigned: "bg-gray-100 text-gray-700",
  started: "bg-blue-100 text-blue-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
};

// Dialog: view & manage a single user's assignments
function UserAssignmentsDialog({ open, onClose, manager, allUsers }) {
  const qc = useQueryClient();
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignTitle, setAssignTitle] = useState('');
  const [assignType, setAssignType] = useState('journey');
  const [saving, setSaving] = useState(false);

  const { data: assignments = [], isLoading, refetch } = useQuery({
    queryKey: ['user-assignments', manager?.email],
    queryFn: () => base44.entities.AssignedLearning.filter({ user_email: manager?.email }),
    enabled: open && !!manager?.email,
  });

  const { data: devPlans = [], refetch: refetchPlans } = useQuery({
    queryKey: ['user-dev-plans', manager?.email],
    queryFn: () => base44.entities.DevelopmentPlan.filter({ created_by: manager?.email }),
    enabled: open && !!manager?.email,
  });

  const handleUnenroll = async (id) => {
    await base44.entities.AssignedLearning.delete(id);
    toast.success('Unenrolled successfully');
    refetch();
  };

  const handleUpdateStatus = async (id, status) => {
    const updateData = { status };
    if (status === 'completed') updateData.completion_date = new Date().toISOString();
    await base44.entities.AssignedLearning.update(id, updateData);
    refetch();
  };

  const handleAssign = async () => {
    if (!assignTitle.trim()) return;
    setSaving(true);
    await base44.entities.AssignedLearning.create({
      user_email: manager.email,
      learning_resource_id: 'manual',
      assigned_by: manager.email, // will be overridden by admin email
      title: assignTitle,
      status: 'assigned',
      priority: 'medium',
    });
    toast.success('Assignment created');
    setAssignTitle('');
    setShowAssignForm(false);
    setSaving(false);
    refetch();
  };

  if (!manager) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#0202ff]/10 flex items-center justify-center">
              <span className="text-sm font-bold text-[#0202ff]">{manager.full_name?.[0] || manager.email?.[0]}</span>
            </div>
            {manager.full_name || manager.email}
          </DialogTitle>
          <p className="text-xs text-gray-400 mt-1">{manager.email}</p>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Assigned Learning */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-900">Learning Assignments</p>
              <Button size="sm" variant="outline" onClick={() => setShowAssignForm(!showAssignForm)} className="h-7 text-xs">
                <Plus className="w-3 h-3 mr-1" /> Assign
              </Button>
            </div>

            {showAssignForm && (
              <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-2">
                <Input
                  placeholder="Assignment title..."
                  value={assignTitle}
                  onChange={e => setAssignTitle(e.target.value)}
                  className="h-8 text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAssign} disabled={saving || !assignTitle.trim()} className="bg-[#0202ff] hover:bg-[#0101dd] text-white h-7 text-xs flex-1">
                    {saving ? 'Saving...' : 'Create Assignment'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAssignForm(false)} className="h-7 text-xs">Cancel</Button>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="space-y-2"><Skeleton className="h-12 rounded-xl" /><Skeleton className="h-12 rounded-xl" /></div>
            ) : assignments.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No learning assignments</p>
            ) : (
              <div className="space-y-2">
                {assignments.map(item => (
                  <div key={item.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-3 py-2.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                    </div>
                    <select
                      value={item.status}
                      onChange={e => handleUpdateStatus(item.id, e.target.value)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#0202ff]/30 ${STATUS_BADGE[item.status] || STATUS_BADGE.assigned}`}
                    >
                      <option value="assigned">Enrolled</option>
                      <option value="started">Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                    <button onClick={() => handleUnenroll(item.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors flex-shrink-0">Unenroll</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dev Plans */}
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-2">Journeys ({devPlans.length})</p>
            {devPlans.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No journeys found</p>
            ) : (
              <div className="space-y-2">
                {devPlans.map(plan => (
                  <div key={plan.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-3 py-2.5">
                    <Layers className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{plan.title}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[plan.status] || 'bg-gray-100 text-gray-600'}`}>{plan.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ManagerAdminRow({ manager, insight, onManage }) {
  const risk = getRiskLevel(insight);
  const initial = manager.full_name?.[0] || manager.email?.[0] || '?';
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
      <div className="w-9 h-9 rounded-full bg-[#0202ff]/10 flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-bold text-[#0202ff]">{initial}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{manager.full_name || manager.email}</p>
        <p className="text-xs text-gray-400 truncate mt-0.5">{insight?.archetype || 'Assessment pending'}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${risk.bg} ${risk.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${risk.dot}`} />
          {risk.label}
        </span>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onManage(manager)}>
          <Pencil className="w-3 h-3 mr-1" /> Manage
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs text-[#0202ff] hover:bg-[#0202ff]/5" onClick={() => navigate(`/manager-detail/${manager.id}`, { state: { manager, insight } })}>
          View <ChevronRight className="w-3 h-3 ml-0.5" />
        </Button>
      </div>
    </div>
  );
}

export default function ExperienceOverviewTab({ user }) {
  const [search, setSearch] = useState('');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [managingUser, setManagingUser] = useState(null);

  const { data: managers = [], isLoading: loadingManagers } = useQuery({
    queryKey: ['exp-mgmt-managers', user?.client_id],
    queryFn: () => base44.entities.User.filter({ client_id: user.client_id, app_role: { $in: ['User Level 1', 'User Level 2'] } }),
    enabled: !!user?.client_id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: allInsights = {}, isLoading: loadingInsights } = useQuery({
    queryKey: ['exp-mgmt-insights', user?.client_id],
    queryFn: async () => {
      const insights = await base44.entities.AssessmentInsights.filter({ client_id: user.client_id, status: 'generated' });
      return insights.reduce((acc, i) => { acc[i.user_email] = i; return acc; }, {});
    },
    enabled: !!user?.client_id,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = loadingManagers || loadingInsights;

  const filteredManagers = useMemo(() =>
    managers.filter(m => !search || m.full_name?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase())),
    [managers, search]);

  const categorized = useMemo(() => {
    const atRisk = [], developing = [], onTrack = [];
    managers.forEach(m => {
      const flags = allInsights[m.email]?.risk_flags?.length;
      if (flags == null || flags === undefined) return;
      if (flags === 0) onTrack.push(m);
      else if (flags === 1) developing.push(m);
      else atRisk.push(m);
    });
    return { atRisk, developing, onTrack };
  }, [managers, allInsights]);

  const statCards = [
    { key: 'atRisk', label: 'At Risk', value: categorized.atRisk.length, icon: AlertTriangle, iconBg: 'bg-red-50', iconColor: 'text-red-500', list: categorized.atRisk, activeBg: 'ring-2 ring-red-200' },
    { key: 'developing', label: 'Developing', value: categorized.developing.length, icon: TrendingUp, iconBg: 'bg-amber-50', iconColor: 'text-amber-500', list: categorized.developing, activeBg: 'ring-2 ring-amber-200' },
    { key: 'onTrack', label: 'On Track', value: categorized.onTrack.length, icon: CheckCircle, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', list: categorized.onTrack, activeBg: 'ring-2 ring-emerald-200' },
  ];

  if (isLoading) {
    return <div className="space-y-3"><Skeleton className="h-20 rounded-2xl" /><div className="grid grid-cols-3 gap-3"><Skeleton className="h-20 rounded-2xl" /><Skeleton className="h-20 rounded-2xl" /><Skeleton className="h-20 rounded-2xl" /></div><Skeleton className="h-64 rounded-2xl" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Risk stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {statCards.map(({ key, label, value, icon: Icon, iconBg, iconColor, list, activeBg }) => (
          <Card key={key} onClick={() => setExpandedCategory(prev => prev === key ? null : key)}
            className={`border-0 shadow-sm text-center rounded-2xl cursor-pointer hover:shadow-md transition-all ${expandedCategory === key ? activeBg : ''}`}>
            <CardContent className="py-5">
              <div className={`flex items-center justify-center w-9 h-9 ${iconBg} rounded-full mx-auto mb-2`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              {value > 0 && <p className="text-[10px] text-[#0202ff] mt-1 font-medium">{expandedCategory === key ? 'Hide ▲' : 'View ▼'}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Expanded category */}
      {expandedCategory && (
        <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-900">
              {statCards.find(s => s.key === expandedCategory)?.label} Users
              <span className="ml-1.5 text-gray-400 font-normal">({statCards.find(s => s.key === expandedCategory)?.list.length})</span>
            </CardTitle>
            <button onClick={() => setExpandedCategory(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </CardHeader>
          <CardContent className="p-0">
            {statCards.find(s => s.key === expandedCategory)?.list.map(manager => (
              <ManagerAdminRow key={manager.id} manager={manager} insight={allInsights[manager.email]} onManage={setManagingUser} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* All Users */}
      <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0202ff]" /> All Users
            <span className="text-sm font-normal text-gray-400">({filteredManagers.length})</span>
          </CardTitle>
          <div className="relative mt-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm bg-gray-50 border-gray-200" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredManagers.length === 0 ? (
            <div className="text-center py-10 text-gray-400"><Users className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">{managers.length === 0 ? 'No users in this organization yet.' : 'No users match your search.'}</p></div>
          ) : (
            filteredManagers.map(manager => (
              <ManagerAdminRow key={manager.id} manager={manager} insight={allInsights[manager.email]} onManage={setManagingUser} />
            ))
          )}
        </CardContent>
      </Card>

      <UserAssignmentsDialog
        open={!!managingUser}
        onClose={() => setManagingUser(null)}
        manager={managingUser}
        allUsers={managers}
      />
    </div>
  );
}