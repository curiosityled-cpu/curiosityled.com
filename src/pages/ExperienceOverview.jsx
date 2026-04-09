import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Users, AlertTriangle, TrendingUp, CheckCircle, Loader2, Search,
  ChevronRight, Map, BookOpen, Plus, X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";

const getRiskLevel = (insight) => {
  if (!insight) return { label: 'No Data', color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200', dot: 'bg-gray-400' };
  const flags = insight.risk_flags?.length || 0;
  if (flags === 0) return { label: 'On Track', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' };
  if (flags === 1) return { label: 'Developing', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' };
  return { label: 'At Risk', color: 'text-red-700', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' };
};

const PROGRAM_TEMPLATES = [
  {
    id: 'onboarding',
    label: 'New Manager Onboarding Journey',
    icon: Map,
    description: 'A structured 30/60/90-day onboarding journey for first-time managers.',
    color: 'bg-blue-50 border-blue-200 text-blue-800',
    iconBg: 'bg-blue-100',
  },
  {
    id: 'learning',
    label: 'Leadership Development Learning Path',
    icon: BookOpen,
    description: 'A curated learning path covering communication, decision-making, and team leadership.',
    color: 'bg-purple-50 border-purple-200 text-purple-800',
    iconBg: 'bg-purple-100',
  },
];

function AssignTemplateDialog({ open, onClose, managers }) {
  const [selected, setSelected] = useState(null);
  const [selectedManagers, setSelectedManagers] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleAssign = async () => {
    if (!selected || selectedManagers.length === 0) return;
    setAssigning(true);
    await new Promise(r => setTimeout(r, 1000));
    setAssigning(false);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setSelected(null);
      setSelectedManagers([]);
      onClose();
    }, 1500);
  };

  const toggleManager = (id) => {
    setSelectedManagers(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Program Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Choose a Template</p>
            <div className="space-y-2">
              {PROGRAM_TEMPLATES.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelected(t.id)}
                    className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                      selected === t.id ? 'border-[#0202ff] bg-[#0202ff]/5 ring-1 ring-[#0202ff]' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${t.iconBg}`}>
                      <Icon className="w-4 h-4 text-gray-700" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{t.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Assign to Managers
              {selectedManagers.length > 0 && (
                <span className="ml-2 text-xs text-[#0202ff] font-normal">{selectedManagers.length} selected</span>
              )}
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-200 rounded-xl p-2">
              {managers.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No managers found</p>
              )}
              {managers.map(m => (
                <button
                  key={m.id}
                  onClick={() => toggleManager(m.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
                    selectedManagers.includes(m.id) ? 'bg-[#0202ff]/10 text-[#0202ff]' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-[#0202ff]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-[#0202ff]">{m.full_name?.[0] || m.email?.[0]}</span>
                  </div>
                  <span className="text-sm truncate flex-1">{m.full_name || m.email}</span>
                  {selectedManagers.includes(m.id) && <CheckCircle className="w-4 h-4 ml-auto flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleAssign}
            disabled={!selected || selectedManagers.length === 0 || assigning}
            className="bg-[#0202ff] hover:bg-[#0101dd] text-white"
          >
            {assigning ? 'Assigning...' : success ? '✓ Assigned!' : `Assign to ${selectedManagers.length || 0} Manager${selectedManagers.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManagerRow({ manager, insight, onClick }) {
  const risk = getRiskLevel(insight);
  const initial = manager.full_name?.[0] || manager.email?.[0] || '?';
  return (
    <button
      onClick={() => onClick(manager, insight)}
      className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-0"
    >
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
        <ChevronRight className="w-4 h-4 text-gray-300" />
      </div>
    </button>
  );
}

// Inline expandable list of managers for a given category
function CategoryManagerList({ managers, allInsights, onClick, onClose }) {
  return (
    <div className="mt-3 border-t border-gray-100">
      {managers.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No managers in this category</p>
      ) : (
        managers.map(manager => (
          <ManagerRow
            key={manager.id}
            manager={manager}
            insight={allInsights[manager.email]}
            onClick={onClick}
          />
        ))
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

export default function ExperienceOverview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null); // 'atRisk' | 'developing' | 'onTrack'

  const { data: managers = [], isLoading: loadingManagers } = useQuery({
    queryKey: ['managers', user?.client_id],
    queryFn: async () => base44.entities.User.filter({
      client_id: user.client_id,
      app_role: { $in: ['User Level 1', 'User Level 2'] }
    }),
    enabled: !!user?.client_id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: allInsights = {}, isLoading: loadingInsights } = useQuery({
    queryKey: ['all-insights', user?.client_id],
    queryFn: async () => {
      const insights = await base44.entities.AssessmentInsights.filter({
        client_id: user.client_id
      });
      return insights.reduce((acc, i) => { acc[i.user_email] = i; return acc; }, {});
    },
    enabled: !!user?.client_id,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = loadingManagers || loadingInsights;

  const filteredManagers = useMemo(() =>
    managers.filter(m => {
      if (!search) return true;
      const q = search.toLowerCase();
      return m.full_name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q);
    }), [managers, search]);

  const categorizedManagers = useMemo(() => {
    const atRisk = [], developing = [], onTrack = [], noData = [];
    managers.forEach(m => {
      const flags = allInsights[m.email]?.risk_flags?.length;
      if (flags == null) noData.push(m);
      else if (flags === 0) onTrack.push(m);
      else if (flags === 1) developing.push(m);
      else atRisk.push(m);
    });
    return { atRisk, developing, onTrack, noData };
  }, [managers, allInsights]);

  const stats = {
    atRisk: categorizedManagers.atRisk.length,
    developing: categorizedManagers.developing.length,
    onTrack: categorizedManagers.onTrack.length,
    total: managers.length,
  };

  const handleManagerClick = (manager, insight) => {
    navigate(`/manager-detail/${manager.id}`, { state: { manager, insight } });
  };

  const toggleCategory = (cat) => {
    setExpandedCategory(prev => prev === cat ? null : cat);
  };

  const statCards = [
    {
      key: 'atRisk',
      label: 'At Risk',
      value: stats.atRisk,
      icon: AlertTriangle,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-500',
      managers: categorizedManagers.atRisk,
      activeBg: 'ring-2 ring-red-300',
    },
    {
      key: 'developing',
      label: 'Developing',
      value: stats.developing,
      icon: TrendingUp,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-500',
      managers: categorizedManagers.developing,
      activeBg: 'ring-2 ring-amber-300',
    },
    {
      key: 'onTrack',
      label: 'On Track',
      value: stats.onTrack,
      icon: CheckCircle,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-500',
      managers: categorizedManagers.onTrack,
      activeBg: 'ring-2 ring-emerald-300',
    },
  ];

  return (
    <MVPPageLayout
      title="Experience Overview"
      subtitle="Monitor your managers' development and assign programs."
      action={
        <Button
          className="bg-[#0202ff] hover:bg-[#0101dd] text-white"
          onClick={() => setShowAssignDialog(true)}
        >
          <Plus className="w-4 h-4 mr-1.5" /> Assign Program
        </Button>
      }
    >

      {isLoading ? <LoadingSkeleton /> : (
        <>
          {/* Program Templates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PROGRAM_TEMPLATES.map(t => {
              const Icon = t.icon;
              return (
                <Card
                  key={t.id}
                  className={`border shadow-sm cursor-pointer hover:shadow-md transition-all rounded-2xl overflow-hidden ${t.color}`}
                  onClick={() => setShowAssignDialog(true)}
                >
                  <CardContent className="py-4 px-5 flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${t.iconBg}`}>
                      <Icon className="w-5 h-5 text-gray-700" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-snug">{t.label}</p>
                      <p className="text-xs opacity-75 mt-1 line-clamp-2">{t.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Summary Stats — clickable to expand manager list */}
          <div className="grid grid-cols-3 gap-3">
            {statCards.map(({ key, label, value, icon: Icon, iconBg, iconColor, managers: catManagers, activeBg }) => (
              <Card
                key={key}
                onClick={() => toggleCategory(key)}
                className={`border-0 shadow-sm text-center rounded-2xl cursor-pointer hover:shadow-md transition-all ${expandedCategory === key ? activeBg : ''}`}
              >
                <CardContent className="py-5">
                  <div className={`flex items-center justify-center w-9 h-9 ${iconBg} rounded-full mx-auto mb-2.5`}>
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  {value > 0 && (
                    <p className="text-[10px] text-[#0202ff] mt-1 font-medium">
                      {expandedCategory === key ? 'Hide ▲' : 'Show ▼'}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Expanded category panel */}
          {expandedCategory && (
            <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="pb-2 pt-4 px-6 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-900">
                  {statCards.find(s => s.key === expandedCategory)?.label} Managers
                  <span className="ml-1.5 text-gray-400 font-normal">
                    ({statCards.find(s => s.key === expandedCategory)?.managers.length})
                  </span>
                </CardTitle>
                <button
                  onClick={() => setExpandedCategory(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </CardHeader>
              <CardContent className="p-0">
                <CategoryManagerList
                  managers={statCards.find(s => s.key === expandedCategory)?.managers || []}
                  allInsights={allInsights}
                  onClick={handleManagerClick}
                  onClose={() => setExpandedCategory(null)}
                />
              </CardContent>
            </Card>
          )}

          {/* Full Manager List */}
          <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 pt-5 px-6">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0202ff]" />
                All Managers
                <span className="text-sm font-normal text-gray-400">({filteredManagers.length})</span>
              </CardTitle>
              <div className="relative mt-3">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search managers..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm bg-gray-50 border-gray-200"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredManagers.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">
                    {managers.length === 0 ? 'No managers in this organization yet.' : 'No managers match your search.'}
                  </p>
                </div>
              ) : (
                filteredManagers.map(manager => (
                  <ManagerRow
                    key={manager.id}
                    manager={manager}
                    insight={allInsights[manager.email]}
                    onClick={handleManagerClick}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}

      <AssignTemplateDialog
        open={showAssignDialog}
        onClose={() => setShowAssignDialog(false)}
        managers={managers}
      />
    </MVPPageLayout>
  );
}