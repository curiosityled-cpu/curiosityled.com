import React, { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Loader2, Map, GraduationCap, Star, Inbox, BarChart2,
  Search, Plus, Clock, CheckCircle2, XCircle, Eye
} from "lucide-react";
import { useAuth } from "@/components/useAuth";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion } from "framer-motion";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";
import AdminJourneysTab from "@/components/experience-mgmt/AdminJourneysTab";
import AdminLearningManagementTab from "@/components/experience-mgmt/AdminLearningManagementTab";
import AdminExperiencesTab from "@/components/experience-mgmt/AdminExperiencesTab";
import ExperienceAnalyticsTab from "@/components/experience-mgmt/ExperienceAnalyticsTab";

// Lazy load request components
const RequestDetailPanel = lazy(() => import("@/components/requests/RequestDetailPanel"));
const RequestSubmissionForm = lazy(() => import("@/components/requests/RequestSubmissionForm"));
const RequestStatistics = lazy(() => import("@/components/requests/RequestStatistics"));
const AdvancedFilters = lazy(() => import("@/components/requests/AdvancedFilters"));

const STATUS_BADGE_COLORS = {
  new: 'bg-blue-100 text-blue-800', triaging: 'bg-yellow-100 text-yellow-800',
  waiting_on_requester: 'bg-orange-100 text-orange-800', assigned: 'bg-purple-100 text-purple-800',
  in_progress: 'bg-indigo-100 text-indigo-800', awaiting_approval: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800', completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-800', medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800', urgent: 'bg-red-100 text-red-800',
};

const TABS = [
  { id: 'analytics', label: 'Overview & Analytics', icon: BarChart2 },
  { id: 'journeys', label: 'Journeys', icon: Map },
  { id: 'programs', label: 'Learning', icon: GraduationCap },
  { id: 'experiences', label: 'Experiences', icon: Star },
  { id: 'requests', label: 'Requests', icon: Inbox },
];

export default function ExperienceManagement() {
  const { user, hasPermission, loading: authLoading } = useAuth();
  const [section, setSection] = useState("analytics");

  // ── Requests state ──
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestSearch, setRequestSearch] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [programAdmins, setProgramAdmins] = useState([]);
  const [refreshStats, setRefreshStats] = useState(0);
  const [filters, setFilters] = useState({
    status: 'all', priority: 'all', request_type: 'all',
    assigned_to: 'all', approval_status: 'all', has_risks: 'all'
  });

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
          id: sub.id, title: sub.responses.title || 'Form-based Request',
          description: sub.responses.description || '', request_type: sub.responses.request_type || 'general',
          priority: sub.responses.priority || 'medium',
          status: sub.status === 'approved' ? 'approved' : sub.status === 'rejected' ? 'cancelled' : 'new',
          requested_by_email: sub.submitter_email, assigned_to_email: sub.responses.assigned_to_email,
          created_date: sub.created_date, updated_date: sub.updated_date,
          is_form_based: true, form_submission_id: sub.id, approval_status: sub.status
        }));
      }
      setRequests([...legacyRequests, ...formBasedRequests]);
      setRefreshStats(prev => prev + 1);
    } catch { toast.error('Failed to load requests'); setRequests([]); }
    finally { setLoadingRequests(false); }
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
    const StatusIcon = ['approved', 'completed'].includes(status) ? CheckCircle2 : status === 'cancelled' ? XCircle : Clock;
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

  return (
    <MVPPageLayout title="Development Manager" subtitle="Create, deploy, and manage development experiences across your organization">

      {/* Section Toggle */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setSection(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-2 rounded-lg transition-all whitespace-nowrap ${section === tab.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ── JOURNEYS ── */}
      {section === 'journeys' && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <AdminJourneysTab user={user} />
        </motion.div>
      )}

      {/* ── LEARNING ── */}
      {section === 'programs' && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <AdminLearningManagementTab user={user} />
        </motion.div>
      )}

      {/* ── EXPERIENCES ── */}
      {section === 'experiences' && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <AdminExperiencesTab user={user} />
        </motion.div>
      )}

      {/* ── ANALYTICS ── */}
      {section === 'analytics' && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <ExperienceAnalyticsTab user={user} />
        </motion.div>
      )}

      {/* ── REQUESTS ── */}
      {section === 'requests' && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-4">
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
                          <TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead>
                          <TableHead>Priority</TableHead><TableHead>Requested By</TableHead>
                          <TableHead>Assigned To</TableHead><TableHead>Created</TableHead>
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
                      <div className="text-center py-10"><Search className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="text-gray-500 text-sm">No requests match your filters</p></div>
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