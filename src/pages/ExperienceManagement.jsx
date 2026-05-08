import React, { useState, lazy, Suspense, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Loader2, Map, Users, ClipboardList, Settings2,
  Plus, Eye, AlertCircle, Clock, CheckCircle2, XCircle,
  List, LayoutGrid, Search, Sparkles
} from "lucide-react";
import { useAuth } from "@/components/useAuth";
import { getMVPRole } from "@/components/mvp/MVPLayout";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format } from "date-fns";

// Lazy load heavy components
const BuildersHub = lazy(() => import("@/components/experiences/BuildersHub"));
const JourneyManagementDashboard = lazy(() => import("@/components/program-manager/JourneyManagementDashboard"));
const RequestSubmissionForm = lazy(() => import("@/components/requests/RequestSubmissionForm"));
const RequestDetailPanel = lazy(() => import("@/components/requests/RequestDetailPanel"));
const RequestKanbanBoard = lazy(() => import("@/components/requests/RequestKanbanBoard"));
const AssigneeKanban = lazy(() => import("@/components/requests/AssigneeKanban"));
const AdvancedFilters = lazy(() => import("@/components/requests/AdvancedFilters"));
const RequestStatistics = lazy(() => import("@/components/requests/RequestStatistics"));
const ProgramAdminPerformance = lazy(() => import("@/components/requests/ProgramAdminPerformance"));
const ProgramAdminCard = lazy(() => import("@/components/program-admin/ProgramAdminCard"));
const RequestAssignmentPanel = lazy(() => import("@/components/program-admin/RequestAssignmentPanel"));
const AIAssignmentRecommender = lazy(() => import("@/components/program-admin/AIAssignmentRecommender"));
const PublicRequestLinkGenerator = lazy(() => import("@/components/requests/PublicRequestLinkGenerator"));

const SUB_NAV = [
  { id: 'overview', label: 'Experience Management', icon: Settings2 },
  { id: 'journeys', label: 'Journeys', icon: Map },
  { id: 'programs', label: 'Programs', icon: Users },
  { id: 'requests', label: 'Requests', icon: ClipboardList },
];

function RequestsPanel({ user, isHRAdmin, isAnyAdmin, isPlatformAdmin }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [programAdmins, setProgramAdmins] = useState([]);
  const [showPublicLinkGenerator, setShowPublicLinkGenerator] = useState(false);
  const [refreshStats, setRefreshStats] = useState(0);
  const [activeSubtab, setActiveSubtab] = useState('requests');
  const [showAIRecommender, setShowAIRecommender] = useState(false);
  const [adminSearchTerm, setAdminSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    status: 'all', priority: 'all', request_type: 'all',
    assigned_to: 'all', approval_status: 'all', has_risks: 'all'
  });

  useEffect(() => {
    loadRequests();
    loadProgramAdmins();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const legacyRequests = await base44.entities.DevelopmentRequest.list('-created_date');
      const requestForms = await base44.entities.CustomForm.filter({ form_type: 'request' });
      const formIds = requestForms.map(f => f.id);
      let formBasedRequests = [];
      if (formIds.length > 0) {
        const submissions = await base44.entities.CustomFormSubmission.filter({ form_id: { $in: formIds } }, '-created_date');
        formBasedRequests = submissions.map(sub => ({
          id: sub.id,
          title: sub.responses.title || 'Form-based Request',
          description: sub.responses.description || '',
          request_type: sub.responses.request_type || 'general',
          priority: sub.responses.priority || 'medium',
          status: sub.status === 'approved' ? 'approved' : sub.status === 'rejected' ? 'cancelled' : 'new',
          requested_by_email: sub.submitter_email,
          assigned_to_email: sub.responses.assigned_to_email,
          created_date: sub.created_date,
          updated_date: sub.updated_date,
          is_form_based: true,
          form_submission_id: sub.id,
          approval_status: sub.status
        }));
      }
      setRequests([...legacyRequests, ...formBasedRequests]);
      setRefreshStats(prev => prev + 1);
    } catch (error) {
      toast.error('Failed to load requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProgramAdmins = async () => {
    try {
      const response = await base44.functions.invoke('listAllUsers');
      if (response.data?.success) {
        const admins = response.data.users.filter(u => u.app_role === 'Admin Level 1' && u.hr_admin_email === user?.email);
        setProgramAdmins(admins || []);
      }
    } catch { setProgramAdmins([]); }
  };

  const processedRequests = useMemo(() => {
    let filtered = requests;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.title?.toLowerCase().includes(term) ||
        r.description?.toLowerCase().includes(term) ||
        r.requested_by_email?.toLowerCase().includes(term)
      );
    }
    if (filters.status !== 'all') filtered = filtered.filter(r => r.status === filters.status);
    if (filters.priority !== 'all') filtered = filtered.filter(r => r.priority === filters.priority);
    if (filters.request_type !== 'all') filtered = filtered.filter(r => r.request_type === filters.request_type);
    if (filters.assigned_to !== 'all') {
      if (filters.assigned_to === 'unassigned') filtered = filtered.filter(r => !r.assigned_to_email);
      else filtered = filtered.filter(r => r.assigned_to_email === filters.assigned_to);
    }
    if (filters.approval_status !== 'all') filtered = filtered.filter(r => r.approval_status === filters.approval_status);
    if (filters.has_risks !== 'all') {
      if (filters.has_risks === 'yes') filtered = filtered.filter(r => r.risk_flags?.some(f => f !== 'none'));
      else if (filters.has_risks === 'no') filtered = filtered.filter(r => !r.risk_flags?.some(f => f !== 'none'));
    }
    return filtered;
  }, [requests, searchTerm, filters]);

  const statistics = useMemo(() => {
    const now = new Date();
    const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);
    return {
      total: requests.length,
      new: requests.filter(r => r.status === 'new').length,
      inProgress: requests.filter(r => r.status === 'in_progress').length,
      awaitingApproval: requests.filter(r => r.status === 'awaiting_approval').length,
      breachingSLA: requests.filter(r => r.status === 'new' && !r.first_response_at && new Date(r.created_date) < threeDaysAgo).length,
      stale: requests.filter(r => ['assigned', 'in_progress'].includes(r.status) && new Date(r.updated_date) < fourteenDaysAgo).length,
    };
  }, [requests]);

  const getStatusBadge = (status) => {
    const configs = {
      new: { color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
      triaging: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      waiting_on_requester: { color: 'bg-orange-100 text-orange-800', icon: Clock },
      assigned: { color: 'bg-purple-100 text-purple-800', icon: Clock },
      in_progress: { color: 'bg-indigo-100 text-indigo-800', icon: Clock },
      awaiting_approval: { color: 'bg-amber-100 text-amber-800', icon: Clock },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
      cancelled: { color: 'bg-gray-100 text-gray-800', icon: XCircle }
    };
    const config = configs[status] || configs.new;
    const Icon = config.icon;
    return <Badge className={config.color}><Icon className="w-3 h-3 mr-1" />{status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const colors = { low: 'bg-gray-100 text-gray-800', medium: 'bg-blue-100 text-blue-800', high: 'bg-orange-100 text-orange-800', urgent: 'bg-red-100 text-red-800' };
    return <Badge className={colors[priority] || colors.medium}>{priority?.toUpperCase()}</Badge>;
  };

  const unassignedRequests = requests.filter(r => !r.assigned_to_email && r.status === 'new');
  const filteredAdmins = programAdmins.filter(a =>
    a.full_name?.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
    a.email?.toLowerCase().includes(adminSearchTerm.toLowerCase())
  );

  const RequestsTable = () => (
    <Card className="mt-6">
      <CardHeader><CardTitle className="text-lg">Requests ({processedRequests.length})</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead>
                <TableHead>Priority</TableHead><TableHead>Requested By</TableHead>
                <TableHead>Assigned To</TableHead><TableHead>Created</TableHead>
                <TableHead>Risk</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedRequests.map(request => {
                const hasRisks = request.risk_flags?.some(f => f !== 'none');
                const isStale = ['assigned', 'in_progress'].includes(request.status) && new Date(request.updated_date) < new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
                const breachesSLA = request.status === 'new' && !request.first_response_at && new Date(request.created_date) < new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
                return (
                  <TableRow key={request.id} className={`hover:bg-gray-50 ${breachesSLA ? 'bg-red-50' : isStale ? 'bg-orange-50' : ''}`}>
                    <TableCell className="font-medium">{request.title}</TableCell>
                    <TableCell><Badge variant="outline">{request.request_type?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>{getPriorityBadge(request.priority)}</TableCell>
                    <TableCell className="text-sm text-gray-600">{request.requested_by_email}</TableCell>
                    <TableCell className="text-sm text-gray-600">{request.assigned_to_email || <span className="text-gray-400 italic">Unassigned</span>}</TableCell>
                    <TableCell className="text-sm text-gray-600">{format(new Date(request.created_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{hasRisks && <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Risk</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedRequestId(request.id)}>
                        <Eye className="w-4 h-4 text-blue-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {processedRequests.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">No requests match your filters</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-10 h-10 animate-spin text-[#0202ff]" /></div>;

  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="w-10 h-10 animate-spin text-[#0202ff]" /></div>}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-6">
        <Button onClick={() => setShowSubmitForm(true)} className="bg-[#0202ff] hover:bg-blue-700" size="sm">
          <Plus className="w-4 h-4 mr-1" /> New
        </Button>
        {isHRAdmin && (
          <Button onClick={() => setShowPublicLinkGenerator(!showPublicLinkGenerator)} variant="outline" size="sm">
            Public Link
          </Button>
        )}
        <div className="border-l h-6 mx-2" />
        <Button variant={viewMode === 'table' ? 'default' : 'outline'} onClick={() => setViewMode('table')} size="sm"><List className="w-4 h-4" /></Button>
        <Button variant={viewMode === 'kanban' ? 'default' : 'outline'} onClick={() => setViewMode('kanban')} size="sm"><LayoutGrid className="w-4 h-4" /></Button>
        <Button variant={viewMode === 'assignee' ? 'default' : 'outline'} onClick={() => setViewMode('assignee')} size="sm"><Users className="w-4 h-4" /></Button>
      </div>

      {isHRAdmin ? (
        <Tabs value={activeSubtab} onValueChange={setActiveSubtab}>
          <TabsList>
            <TabsTrigger value="requests" className="gap-2"><List className="w-4 h-4" />Requests ({requests.length})</TabsTrigger>
            <TabsTrigger value="admins" className="gap-2"><Users className="w-4 h-4" />My Program Admins ({programAdmins.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="requests">
            <RequestStatistics clientId={user?.client_id} refreshTrigger={refreshStats} />
            <AdvancedFilters filters={filters} onFilterChange={(k, v) => setFilters({...filters, [k]: v})} searchTerm={searchTerm} onSearchChange={setSearchTerm} programAdmins={programAdmins} onReset={() => { setFilters({ status:'all', priority:'all', request_type:'all', assigned_to:'all', approval_status:'all', has_risks:'all' }); setSearchTerm(''); }} />
            {(isHRAdmin || isAnyAdmin) && programAdmins.length > 0 && <div className="mt-6"><ProgramAdminPerformance requests={requests} programAdmins={programAdmins} /></div>}
            {viewMode === 'assignee' ? (
              <div className="mt-6"><AssigneeKanban requests={processedRequests} programAdmins={programAdmins} onRequestClick={setSelectedRequestId} onAssigneeChange={async (reqId, email) => { await base44.entities.DevelopmentRequest.update(reqId, { assigned_to_email: email, status: email ? 'assigned' : 'new' }); loadRequests(); toast.success('Reassigned'); }} /></div>
            ) : viewMode === 'kanban' ? (
              <div className="mt-6"><RequestKanbanBoard requests={processedRequests} onRequestClick={setSelectedRequestId} onUpdate={loadRequests} /></div>
            ) : <RequestsTable />}
          </TabsContent>
          <TabsContent value="admins">
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="p-4 text-center"><Users className="w-6 h-6 text-blue-600 mx-auto mb-2" /><p className="text-2xl font-bold">{programAdmins.length}</p><p className="text-xs text-gray-600">Program Admins</p></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><ClipboardList className="w-6 h-6 text-purple-600 mx-auto mb-2" /><p className="text-2xl font-bold">{programAdmins.reduce((s, a) => s + (a.workload?.active_requests || 0), 0)}</p><p className="text-xs text-gray-600">Active Requests</p></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><Clock className="w-6 h-6 text-green-600 mx-auto mb-2" /><p className="text-2xl font-bold">{programAdmins.reduce((s, a) => s + (a.workload?.upcoming_classes || 0), 0)}</p><p className="text-xs text-gray-600">Upcoming Classes</p></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-2" /><p className="text-2xl font-bold">{programAdmins.reduce((s, a) => s + (a.workload?.overdue_requests || 0), 0)}</p><p className="text-xs text-gray-600">Overdue</p></CardContent></Card>
              </div>
              {unassignedRequests.length > 0 && (
                <Card className="border-2 border-purple-200 bg-purple-50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
                        <div><p className="font-medium text-purple-900">{unassignedRequests.length} Unassigned Request{unassignedRequests.length !== 1 ? 's' : ''}</p><p className="text-sm text-purple-700 mt-1">Get AI-powered assignment recommendations based on expertise and workload</p></div>
                      </div>
                      <Button onClick={() => setShowAIRecommender(true)} className="bg-purple-600 hover:bg-purple-700"><Sparkles className="w-4 h-4 mr-2" />Get AI Recommendations</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Program Admins ({filteredAdmins.length})</CardTitle>
                    <div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input placeholder="Search admins..." value={adminSearchTerm} onChange={e => setAdminSearchTerm(e.target.value)} className="pl-10" /></div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">{filteredAdmins.map(admin => <ProgramAdminCard key={admin.id} admin={admin} />)}</div>
                  {filteredAdmins.length === 0 && <div className="text-center py-12"><Users className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-600">{adminSearchTerm ? 'No admins match your search' : 'No Program Admins assigned yet'}</p></div>}
                </CardContent>
              </Card>
              {unassignedRequests.length > 0 && <RequestAssignmentPanel requests={unassignedRequests} programAdmins={programAdmins} onAssign={loadRequests} />}
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <>
          <RequestStatistics clientId={user?.client_id} refreshTrigger={refreshStats} />
          <AdvancedFilters filters={filters} onFilterChange={(k, v) => setFilters({...filters, [k]: v})} searchTerm={searchTerm} onSearchChange={setSearchTerm} programAdmins={programAdmins} onReset={() => { setFilters({ status:'all', priority:'all', request_type:'all', assigned_to:'all', approval_status:'all', has_risks:'all' }); setSearchTerm(''); }} />
          {viewMode === 'assignee' ? (
            <div className="mt-6"><AssigneeKanban requests={processedRequests} programAdmins={programAdmins} onRequestClick={setSelectedRequestId} onAssigneeChange={async (reqId, email) => { await base44.entities.DevelopmentRequest.update(reqId, { assigned_to_email: email, status: email ? 'assigned' : 'new' }); loadRequests(); }} /></div>
          ) : viewMode === 'kanban' ? (
            <div className="mt-6"><RequestKanbanBoard requests={processedRequests} onRequestClick={setSelectedRequestId} onUpdate={loadRequests} /></div>
          ) : <RequestsTable />}
        </>
      )}

      {showAIRecommender && <AIAssignmentRecommender requests={unassignedRequests} programAdmins={programAdmins} onClose={() => setShowAIRecommender(false)} onAssign={loadRequests} />}

      <Dialog open={showSubmitForm} onOpenChange={setShowSubmitForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Submit Development Request</DialogTitle></DialogHeader>
          <RequestSubmissionForm onSuccess={() => { setShowSubmitForm(false); loadRequests(); }} onCancel={() => setShowSubmitForm(false)} />
        </DialogContent>
      </Dialog>

      {selectedRequestId && <RequestDetailPanel requestId={selectedRequestId} onClose={() => setSelectedRequestId(null)} onUpdate={loadRequests} />}

      <Dialog open={showPublicLinkGenerator} onOpenChange={setShowPublicLinkGenerator}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Generate Public Submission Link</DialogTitle></DialogHeader>
          <PublicRequestLinkGenerator clientId={user?.client_id} isAdmin={isAnyAdmin || isPlatformAdmin} />
        </DialogContent>
      </Dialog>
    </Suspense>
  );
}

export default function ExperienceManagement() {
  const { user, hasPermission, roleDisplayName, loading: authLoading, isHRAdmin, isAnyAdmin, isPlatformAdmin } = useAuth();
  const location = useLocation();

  const getInitialTab = () => {
    const hash = location.hash.replace('#', '');
    const valid = SUB_NAV.map(s => s.id);
    return valid.includes(hash) ? hash : 'journeys';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  const handleTabClick = (id) => {
    setActiveTab(id);
    window.history.replaceState(null, '', `#${id}`);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#0202ff]" />
      </div>
    );
  }

  if (!user || !hasPermission('experiences.manage_org')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-500">You don't have permission to access Experience Management.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-0">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Experience Management</h1>
              <p className="text-gray-500 mt-1 text-sm">Create, deploy, and manage learning experiences across your organization</p>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full border border-[#0202ff]/20 bg-[#0202ff]/5 text-[#0202ff] text-xs font-medium">
              {roleDisplayName}
            </span>
          </div>

          {/* Sub Navigation */}
          <div className="flex gap-1 overflow-x-auto">
            {SUB_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-[#0202ff] text-[#0202ff]'
                      : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="w-10 h-10 animate-spin text-[#0202ff]" /></div>}>
          {activeTab === 'overview' && <BuildersHub />}
          {activeTab === 'journeys' && <JourneyManagementDashboard initialSubTab="journeys" />}
          {activeTab === 'programs' && <JourneyManagementDashboard initialSubTab="programs" />}
          {activeTab === 'requests' && <RequestsPanel user={user} isHRAdmin={isHRAdmin} isAnyAdmin={isAnyAdmin} isPlatformAdmin={isPlatformAdmin} />}
        </Suspense>
      </div>
    </div>
  );
}