import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2, LayoutDashboard, Map, GraduationCap, Star, Inbox,
  Users, AlertTriangle, TrendingUp, CheckCircle, Search, Plus, X,
  ChevronRight, BookOpen, AlertCircle, Clock, CheckCircle2, XCircle, Eye
} from "lucide-react";
import { useAuth } from "@/components/useAuth";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion } from "framer-motion";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";

// Lazy load heavy components
const JourneyManagementDashboard = lazy(() => import("@/components/program-manager/JourneyManagementDashboard"));
const RequestDetailPanel = lazy(() => import("@/components/requests/RequestDetailPanel"));
const RequestSubmissionForm = lazy(() => import("@/components/requests/RequestSubmissionForm"));
const RequestStatistics = lazy(() => import("@/components/requests/RequestStatistics"));
const AdvancedFilters = lazy(() => import("@/components/requests/AdvancedFilters"));

// ─── Experience Overview helpers ─────────────────────────────────────────────

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

const getRiskLevel = (insight) => {
  if (!insight) return { label: 'No Data', color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200', dot: 'bg-gray-400' };
  const flags = insight.risk_flags?.length || 0;
  if (flags === 0) return { label: 'On Track', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' };
  if (flags === 1) return { label: 'Developing', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' };
  return { label: 'At Risk', color: 'text-red-700', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' };
};

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
    setTimeout(() => { setSuccess(false); setSelected(null); setSelectedManagers([]); onClose(); }, 1500);
  };

  const toggleManager = (id) => setSelectedManagers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Assign Program Template</DialogTitle></DialogHeader>
        <div className="space-y-5 py-2">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Choose a Template</p>
            <div className="space-y-2">
              {PROGRAM_TEMPLATES.map(t => {
                const Icon = t.icon;
                return (
                  <button key={t.id} onClick={() => setSelected(t.id)}
                    className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${selected === t.id ? 'border-[#0202ff] bg-[#0202ff]/5 ring-1 ring-[#0202ff]' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
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
              {selectedManagers.length > 0 && <span className="ml-2 text-xs text-[#0202ff] font-normal">{selectedManagers.length} selected</span>}
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-200 rounded-xl p-2">
              {managers.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No managers found</p>}
              {managers.map(m => (
                <button key={m.id} onClick={() => toggleManager(m.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${selectedManagers.includes(m.id) ? 'bg-[#0202ff]/10 text-[#0202ff]' : 'hover:bg-gray-50 text-gray-700'}`}
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
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAssign} disabled={!selected || selectedManagers.length === 0 || assigning} className="bg-[#0202ff] hover:bg-[#0101dd] text-white">
            {assigning ? 'Assigning...' : success ? '✓ Assigned!' : `Assign to ${selectedManagers.length || 0} Manager${selectedManagers.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ManagerRow({ manager, insight, onClick }) {
  const risk = getRiskLevel(insight);
  const initial = manager.full_name?.[0] || manager.email?.[0] || '?';
  return (
    <button onClick={() => onClick(manager, insight)}
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

// ─── Status / Priority helpers for Requests ──────────────────────────────────

const STATUS_BADGE_COLORS = {
  new: 'bg-blue-100 text-blue-800',
  triaging: 'bg-yellow-100 text-yellow-800',
  waiting_on_requester: 'bg-orange-100 text-orange-800',
  assigned: 'bg-purple-100 text-purple-800',
  in_progress: 'bg-indigo-100 text-indigo-800',
  awaiting_approval: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ExperienceManagement() {
  const { user, hasPermission, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [section, setSection] = useState("overview");

  // ── Experience Overview state ──
  const [search, setSearch] = useState('');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);

  // ── Requests state ──
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestSearch, setRequestSearch] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [programAdmins, setProgramAdmins] = useState([]);
  const [refreshStats, setRefreshStats] = useState(0);
  const [filters, setFilters] = useState({ status: 'all', priority: 'all', request_type: 'all', assigned_to: 'all', approval_status: 'all', has_risks: 'all' });

  // ── Overview data (managers + insights) ──
  const { data: managers = [], isLoading: loadingManagers } = useQuery({
    queryKey: ['exp-mgmt-managers', user?.client_id],
    queryFn: async () => base44.entities.User.filter({ client_id: user.client_id, app_role: { $in: ['User Level 1', 'User Level 2'] } }),
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

  const isLoadingOverview = loadingManagers || loadingInsights;

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

  const statCards = [
    { key: 'atRisk', label: 'At Risk', value: categorizedManagers.atRisk.length, icon: AlertTriangle, iconBg: 'bg-red-50', iconColor: 'text-red-500', managers: categorizedManagers.atRisk, activeBg: 'ring-2 ring-red-300' },
    { key: 'developing', label: 'Developing', value: categorizedManagers.developing.length, icon: TrendingUp, iconBg: 'bg-amber-50', iconColor: 'text-amber-500', managers: categorizedManagers.developing, activeBg: 'ring-2 ring-amber-300' },
    { key: 'onTrack', label: 'On Track', value: categorizedManagers.onTrack.length, icon: CheckCircle, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', managers: categorizedManagers.onTrack, activeBg: 'ring-2 ring-emerald-300' },
  ];

  const handleManagerClick = (manager, insight) => navigate(`/manager-detail/${manager.id}`, { state: { manager, insight } });

  // ── Requests loading ──
  useEffect(() => {
    if (section === 'requests' && user) { loadRequests(); loadProgramAdmins(); }
  }, [section, user]);

  const loadRequests = async () => {
    setLoadingRequests(true);
    try {
      const legacyRequests = await base44.entities.DevelopmentRequest.list('-created_date');
      const requestForms = await base44.entities.CustomForm.filter({ form_type: 'request' });
      const formIds = requestForms.map(f => f.id);
      let formBasedRequests = [];
      if (formIds.length > 0) {
        const submissions = await base44.entities.CustomFormSubmission.filter({ form_id: { $in: formIds } }, '-created_date');
        formBasedRequests = submissions.map(sub => ({
          id: sub.id, title: sub.responses.title || 'Form-based Request', description: sub.responses.description || '',
          request_type: sub.responses.request_type || 'general', priority: sub.responses.priority || 'medium',
          status: sub.status === 'approved' ? 'approved' : sub.status === 'rejected' ? 'cancelled' : 'new',
          requested_by_email: sub.submitter_email, assigned_to_email: sub.responses.assigned_to_email,
          created_date: sub.created_date, updated_date: sub.updated_date,
          is_form_based: true, form_submission_id: sub.id, approval_status: sub.status
        }));
      }
      setRequests([...legacyRequests, ...formBasedRequests]);
      setRefreshStats(prev => prev + 1);
    } catch (error) {
      toast.error('Failed to load requests');
      setRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  const loadProgramAdmins = async () => {
    try {
      const response = await base44.functions.invoke('listAllUsers');
      if (response.data?.success) {
        setProgramAdmins(response.data.users.filter(u => u.app_role === 'Admin Level 1' && u.hr_admin_email === user.email) || []);
      }
    } catch { setProgramAdmins([]); }
  };

  const processedRequests = useMemo(() => {
    let filtered = requests;
    if (requestSearch) {
      const term = requestSearch.toLowerCase();
      filtered = filtered.filter(r => r.title?.toLowerCase().includes(term) || r.description?.toLowerCase().includes(term) || r.requested_by_email?.toLowerCase().includes(term));
    }
    if (filters.status !== 'all') filtered = filtered.filter(r => r.status === filters.status);
    if (filters.priority !== 'all') filtered = filtered.filter(r => r.priority === filters.priority);
    if (filters.request_type !== 'all') filtered = filtered.filter(r => r.request_type === filters.request_type);
    if (filters.assigned_to !== 'all') {
      if (filters.assigned_to === 'unassigned') filtered = filtered.filter(r => !r.assigned_to_email);
      else filtered = filtered.filter(r => r.assigned_to_email === filters.assigned_to);
    }
    if (filters.approval_status !== 'all') filtered = filtered.filter(r => r.approval_status === filters.approval_status);
    if (filters.has_risks === 'yes') filtered = filtered.filter(r => r.risk_flags?.some(f => f !== 'none'));
    if (filters.has_risks === 'no') filtered = filtered.filter(r => !r.risk_flags?.some(f => f !== 'none'));
    return filtered;
  }, [requests, requestSearch, filters]);

  const getStatusBadge = (status) => {
    const StatusIcon = ['approved', 'completed'].includes(status) ? CheckCircle2 : ['cancelled'].includes(status) ? XCircle : Clock;
    return (
      <Badge className={STATUS_BADGE_COLORS[status] || STATUS_BADGE_COLORS.new}>
        <StatusIcon className="w-3 h-3 mr-1" />
        {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#0202ff] rounded-full animate-spin" /></div>;
  }

  if (!user || !hasPermission('experiences.manage_org')) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md"><CardContent className="p-6 text-center"><h2 className="text-xl font-semibold mb-2">Access Denied</h2><p className="text-gray-600">You don't have permission to access Experience Management.</p></CardContent></Card>
      </div>
    );
  }

  const overviewStats = [
    { label: 'Total Managers', value: managers.length, color: 'text-[#0202ff]' },
    { label: 'At Risk', value: categorizedManagers.atRisk.length, color: 'text-red-500' },
    { label: 'On Track', value: categorizedManagers.onTrack.length, color: 'text-emerald-600' },
  ];

  return (
    <MVPPageLayout title="Experience Management" subtitle="Create, deploy, and manage learning experiences across your organization">

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-3">
        {overviewStats.map(s => (
          <Card key={s.label} className="shadow-sm border border-gray-100 rounded-2xl">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Section Toggle */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
          {[
            { id: 'overview', label: 'Experience Overview', icon: LayoutDashboard },
            { id: 'journeys', label: 'Journeys', icon: Map },
            { id: 'programs', label: 'Learning Programs', icon: GraduationCap },
            { id: 'experiences', label: 'Experiences', icon: Star },
            { id: 'requests', label: 'Requests', icon: Inbox },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSection(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-2 rounded-lg transition-all whitespace-nowrap ${section === tab.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ── EXPERIENCE OVERVIEW ── */}
      {section === 'overview' && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
          <div className="flex justify-end">
            <Button className="bg-[#0202ff] hover:bg-[#0101dd] text-white" onClick={() => setShowAssignDialog(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Assign Program
            </Button>
          </div>

          {isLoadingOverview ? (
            <div className="space-y-3"><Skeleton className="h-24 rounded-2xl" /><div className="grid grid-cols-3 gap-3"><Skeleton className="h-20 rounded-2xl" /><Skeleton className="h-20 rounded-2xl" /><Skeleton className="h-20 rounded-2xl" /></div><Skeleton className="h-48 rounded-2xl" /></div>
          ) : (
            <>
              {/* Program Templates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PROGRAM_TEMPLATES.map(t => {
                  const Icon = t.icon;
                  return (
                    <Card key={t.id} className={`border shadow-sm cursor-pointer hover:shadow-md transition-all rounded-2xl overflow-hidden ${t.color}`} onClick={() => setShowAssignDialog(true)}>
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

              {/* Stat cards */}
              <div className="grid grid-cols-3 gap-3">
                {statCards.map(({ key, label, value, icon: Icon, iconBg, iconColor, managers: catManagers, activeBg }) => (
                  <Card key={key} onClick={() => setExpandedCategory(prev => prev === key ? null : key)}
                    className={`border-0 shadow-sm text-center rounded-2xl cursor-pointer hover:shadow-md transition-all ${expandedCategory === key ? activeBg : ''}`}>
                    <CardContent className="py-5">
                      <div className={`flex items-center justify-center w-9 h-9 ${iconBg} rounded-full mx-auto mb-2.5`}>
                        <Icon className={`w-4 h-4 ${iconColor}`} />
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                      {value > 0 && <p className="text-[10px] text-[#0202ff] mt-1 font-medium">{expandedCategory === key ? 'Hide ▲' : 'Show ▼'}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Expanded category */}
              {expandedCategory && (
                <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
                  <CardHeader className="pb-2 pt-4 px-6 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-gray-900">
                      {statCards.find(s => s.key === expandedCategory)?.label} Managers
                      <span className="ml-1.5 text-gray-400 font-normal">({statCards.find(s => s.key === expandedCategory)?.managers.length})</span>
                    </CardTitle>
                    <button onClick={() => setExpandedCategory(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                  </CardHeader>
                  <CardContent className="p-0">
                    {statCards.find(s => s.key === expandedCategory)?.managers.map(manager => (
                      <ManagerRow key={manager.id} manager={manager} insight={allInsights[manager.email]} onClick={handleManagerClick} />
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Full manager list */}
              <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="pb-3 pt-5 px-6">
                  <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#0202ff]" /> All Managers
                    <span className="text-sm font-normal text-gray-400">({filteredManagers.length})</span>
                  </CardTitle>
                  <div className="relative mt-3">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input placeholder="Search managers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm bg-gray-50 border-gray-200" />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {filteredManagers.length === 0 ? (
                    <div className="text-center py-12 text-gray-400"><Users className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm font-medium">{managers.length === 0 ? 'No managers in this organization yet.' : 'No managers match your search.'}</p></div>
                  ) : (
                    filteredManagers.map(manager => <ManagerRow key={manager.id} manager={manager} insight={allInsights[manager.email]} onClick={handleManagerClick} />)
                  )}
                </CardContent>
              </Card>
            </>
          )}

          <AssignTemplateDialog open={showAssignDialog} onClose={() => setShowAssignDialog(false)} managers={managers} />
        </motion.div>
      )}

      {/* ── JOURNEYS + LEARNING PROGRAMS (shared JourneyManagementDashboard) ── */}
      {(section === 'journeys' || section === 'programs') && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" /></div>}>
            <JourneyManagementDashboard initialSubTab={section === 'journeys' ? 'journeys' : 'programs'} />
          </Suspense>
        </motion.div>
      )}

      {/* ── EXPERIENCES ── */}
      {section === 'experiences' && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border border-gray-100 shadow-sm rounded-2xl">
            <CardContent className="p-12 text-center">
              <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Experiences</h3>
              <p className="text-sm text-gray-500">Manage organizational experiences from individual builder dashboards.</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── REQUESTS ── */}
      {section === 'requests' && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" /></div>}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Development Requests</h2>
              <Button onClick={() => setShowSubmitForm(true)} className="bg-[#0202ff] hover:bg-[#0101dd] text-white">
                <Plus className="w-4 h-4 mr-1.5" /> New Request
              </Button>
            </div>

            {loadingRequests ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" /></div>
            ) : (
              <>
                <RequestStatistics clientId={user?.client_id} refreshTrigger={refreshStats} />
                <AdvancedFilters
                  filters={filters}
                  onFilterChange={(key, value) => setFilters({ ...filters, [key]: value })}
                  searchTerm={requestSearch}
                  onSearchChange={setRequestSearch}
                  programAdmins={programAdmins}
                  onReset={() => { setFilters({ status: 'all', priority: 'all', request_type: 'all', assigned_to: 'all', approval_status: 'all', has_risks: 'all' }); setRequestSearch(''); }}
                />
                <Card className="border border-gray-100 shadow-sm rounded-2xl">
                  <CardContent className="p-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Requested By</TableHead>
                          <TableHead>Assigned To</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {processedRequests.map(request => (
                          <TableRow key={request.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium">{request.title}</TableCell>
                            <TableCell><Badge variant="outline">{request.request_type?.replace(/_/g, ' ')}</Badge></TableCell>
                            <TableCell>{getStatusBadge(request.status)}</TableCell>
                            <TableCell><Badge className={PRIORITY_COLORS[request.priority] || PRIORITY_COLORS.medium}>{request.priority?.toUpperCase()}</Badge></TableCell>
                            <TableCell className="text-sm text-gray-600">{request.requested_by_email}</TableCell>
                            <TableCell className="text-sm text-gray-600">{request.assigned_to_email || <span className="text-gray-400 italic">Unassigned</span>}</TableCell>
                            <TableCell className="text-sm text-gray-600">{format(new Date(request.created_date), 'MMM d, yyyy')}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => setSelectedRequestId(request.id)}>
                                <Eye className="w-4 h-4 text-[#0202ff]" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {processedRequests.length === 0 && (
                      <div className="text-center py-12"><Search className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="text-gray-500 text-sm">No requests match your filters</p></div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {selectedRequestId && (
              <RequestDetailPanel requestId={selectedRequestId} onClose={() => setSelectedRequestId(null)} onUpdate={loadRequests} />
            )}

            <Dialog open={showSubmitForm} onOpenChange={setShowSubmitForm}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Submit Development Request</DialogTitle></DialogHeader>
                <RequestSubmissionForm onSuccess={() => { setShowSubmitForm(false); loadRequests(); }} onCancel={() => setShowSubmitForm(false)} />
              </DialogContent>
            </Dialog>
          </Suspense>
        </motion.div>
      )}

    </MVPPageLayout>
  );
}