import React, { useState, lazy, Suspense, useEffect } from "react";
import { Tabs } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Wrench, 
  Inbox, 
  Users, 
  Bookmark,
  Loader2,
  ClipboardList,
  Map
} from "lucide-react";
import { useAuth } from "@/components/useAuth";
import { getMVPRole } from "@/components/mvp/MVPLayout";
import PageHeader from "@/components/common/PageHeader";
import SubNavMenu from "@/components/common/SubNavMenu";
import { useLocation } from "react-router-dom";

// Lazy load heavy components
const BuildersHub = lazy(() => import("@/components/experiences/BuildersHub"));
const JourneyManagementDashboard = lazy(() => import("@/components/program-manager/JourneyManagementDashboard"));
const RequestKanbanBoard = lazy(() => import("@/components/requests/RequestKanbanBoard"));
const RequestStatistics = lazy(() => import("@/components/requests/RequestStatistics"));
const AssigneeKanban = lazy(() => import("@/components/requests/AssigneeKanban"));
const AdvancedFilters = lazy(() => import("@/components/requests/AdvancedFilters"));
const RequestDetailPanel = lazy(() => import("@/components/requests/RequestDetailPanel"));
const RequestSubmissionForm = lazy(() => import("@/components/requests/RequestSubmissionForm"));

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, Eye, AlertCircle, Clock, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ExperienceManagement() {
  const { user, hasPermission, roleDisplayName, loading: authLoading, isHRAdmin, isProgramManager, isAnyAdmin, isPlatformAdmin } = useAuth();
  const location = useLocation();
  const mvpRole = getMVPRole(user?.app_role);
  const isMVPBuyer = mvpRole === 'buyer';

  // Define tab items — restrict to Programs & Journeys for MVP buyers
  const allTabItems = [
    { id: 'requests', label: 'Requests', icon: Inbox },
    { id: 'builders', label: 'Builders', icon: Wrench },
    { id: 'programs', label: 'Programs', icon: Users },
    { id: 'templates', label: 'Templates', icon: Bookmark }
  ];
  const tabItems = isMVPBuyer
    ? [
        { id: 'journeys', label: 'Journeys', icon: Map },
        { id: 'programs', label: 'Programs', icon: Users },
      ]
    : allTabItems;

  // Initialize activeTab from URL hash
  const getInitialTab = () => {
    const hash = location.hash.replace('#', '');
    const validTabs = tabItems.map(t => t.id);
    return validTabs.includes(hash) ? hash : tabItems[0].id;
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab);
  
  // Get subtab from URL params
  const searchParams = new URLSearchParams(location.search);
  const subtab = isMVPBuyer ? 'journeys' : searchParams.get('subtab');

  // For MVP buyers, map the top-level tab selection to the right subtab
  const handleMVPBuyerTabClick = (tabId) => {
    if (tabId === 'journeys') {
      setActiveTab('programs');
      setActiveMVPSubTab('journeys');
    } else {
      setActiveTab('programs');
      setActiveMVPSubTab('programs');
    }
  };

  const [activeMVPSubTab, setActiveMVPSubTab] = useState(isMVPBuyer ? 'journeys' : null);

  // Requests tab state
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  const [programAdmins, setProgramAdmins] = useState([]);
  const [refreshStats, setRefreshStats] = useState(0);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    request_type: 'all',
    assigned_to: 'all',
    approval_status: 'all',
    has_risks: 'all'
  });

  useEffect(() => {
    if (activeTab === 'requests' && user) {
      loadRequests();
      loadProgramAdmins();
    }
  }, [activeTab, user]);

  const loadRequests = async () => {
    setLoadingRequests(true);
    try {
      const legacyRequests = await base44.entities.DevelopmentRequest.list('-created_date');
      const requestForms = await base44.entities.CustomForm.filter({ form_type: 'request' });
      const formIds = requestForms.map(f => f.id);
      
      let formBasedRequests = [];
      if (formIds.length > 0) {
        const submissions = await base44.entities.CustomFormSubmission.filter({
          form_id: { $in: formIds }
        }, '-created_date');
        
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
      
      const allRequests = [...legacyRequests, ...formBasedRequests];
      setRequests(allRequests || []);
      setRefreshStats(prev => prev + 1);
    } catch (error) {
      console.error('Error loading requests:', error);
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
        const admins = response.data.users.filter(u => 
          u.app_role === 'Admin Level 1' && u.hr_admin_email === user.email
        );
        setProgramAdmins(admins || []);
      }
    } catch (error) {
      console.error('Error loading program admins:', error);
      setProgramAdmins([]);
    }
  };

  const processedRequests = React.useMemo(() => {
    let filtered = requests;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.title?.toLowerCase().includes(term) ||
        r.description?.toLowerCase().includes(term) ||
        r.requested_by_email?.toLowerCase().includes(term)
      );
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(r => r.status === filters.status);
    }

    if (filters.priority !== 'all') {
      filtered = filtered.filter(r => r.priority === filters.priority);
    }

    if (filters.request_type !== 'all') {
      filtered = filtered.filter(r => r.request_type === filters.request_type);
    }

    if (filters.assigned_to !== 'all') {
      if (filters.assigned_to === 'unassigned') {
        filtered = filtered.filter(r => !r.assigned_to_email);
      } else {
        filtered = filtered.filter(r => r.assigned_to_email === filters.assigned_to);
      }
    }

    if (filters.approval_status !== 'all') {
      filtered = filtered.filter(r => r.approval_status === filters.approval_status);
    }

    if (filters.has_risks !== 'all') {
      if (filters.has_risks === 'yes') {
        filtered = filtered.filter(r => r.risk_flags?.some(flag => flag !== 'none'));
      } else if (filters.has_risks === 'no') {
        filtered = filtered.filter(r => !r.risk_flags?.some(flag => flag !== 'none'));
      }
    }

    return filtered;
  }, [requests, searchTerm, filters]);

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
    
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge className={colors[priority] || colors.medium}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !hasPermission('experiences.manage_org')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access Experience Management.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PageHeader
          title={isMVPBuyer ? "Experience Overview" : "Organizational Experience Administration"}
          subtitle="Create, deploy, and manage learning experiences across your organization"
          badges={[
            { text: roleDisplayName, className: "bg-white text-[#0201ff]" }
          ]}
          headerColor="#0201ff"
          additionalHeaderContent={
            <SubNavMenu
              items={tabItems}
              activeId={isMVPBuyer ? (activeMVPSubTab || 'journeys') : activeTab}
              onItemClick={isMVPBuyer ? handleMVPBuyerTabClick : setActiveTab}
            />
          }
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {activeTab === 'builders' && (
            <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-12 h-12 animate-spin text-blue-600" /></div>}>
              <BuildersHub />
            </Suspense>
          )}

          {activeTab === 'requests' && (
            <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-12 h-12 animate-spin text-blue-600" /></div>}>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="w-8 h-8 text-blue-600" />
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Development Requests & Workload</h2>
                      <p className="text-gray-600">Manage development requests and monitor team workload</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowSubmitForm(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Request
                  </Button>
                </div>

                {loadingRequests ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading requests...</p>
                  </div>
                ) : (
                  <>
                    <RequestStatistics clientId={user?.client_id} refreshTrigger={refreshStats} />

                    <AdvancedFilters
                      filters={filters}
                      onFilterChange={(key, value) => setFilters({...filters, [key]: value})}
                      searchTerm={searchTerm}
                      onSearchChange={setSearchTerm}
                      programAdmins={programAdmins}
                      onReset={() => {
                        setFilters({
                          status: 'all',
                          priority: 'all',
                          request_type: 'all',
                          assigned_to: 'all',
                          approval_status: 'all',
                          has_risks: 'all'
                        });
                        setSearchTerm('');
                      }}
                    />

                    <Card>
                        <CardContent className="p-6">
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
                                  <TableCell>
                                    <Badge variant="outline">{request.request_type?.replace(/_/g, ' ')}</Badge>
                                  </TableCell>
                                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                                  <TableCell>{getPriorityBadge(request.priority)}</TableCell>
                                  <TableCell className="text-sm text-gray-600">{request.requested_by_email}</TableCell>
                                  <TableCell className="text-sm text-gray-600">
                                    {request.assigned_to_email || <span className="text-gray-400 italic">Unassigned</span>}
                                  </TableCell>
                                  <TableCell className="text-sm text-gray-600">
                                    {format(new Date(request.created_date), 'MMM d, yyyy')}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setSelectedRequestId(request.id)}
                                    >
                                      <Eye className="w-4 h-4 text-blue-600" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>

                          {processedRequests.length === 0 && (
                            <div className="text-center py-12">
                              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                              <p className="text-gray-600">No requests match your filters</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                  </>
                )}
              </div>

              {/* Request Detail Panel */}
              {selectedRequestId && (
                <RequestDetailPanel
                  requestId={selectedRequestId}
                  onClose={() => setSelectedRequestId(null)}
                  onUpdate={loadRequests}
                />
              )}

              {/* Submit Form Modal */}
              <Dialog open={showSubmitForm} onOpenChange={setShowSubmitForm}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Submit Development Request</DialogTitle>
                  </DialogHeader>
                  <RequestSubmissionForm
                    onSuccess={() => {
                      setShowSubmitForm(false);
                      loadRequests();
                    }}
                    onCancel={() => setShowSubmitForm(false)}
                  />
                </DialogContent>
              </Dialog>
            </Suspense>
          )}

          {activeTab === 'programs' && (
            <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-12 h-12 animate-spin text-blue-600" /></div>}>
              <JourneyManagementDashboard initialSubTab={isMVPBuyer ? activeMVPSubTab : subtab} />
            </Suspense>
          )}

          {activeTab === 'templates' && (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <Bookmark className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Templates Library</h3>
                <p className="text-gray-600">
                  Access templates from individual builder dashboards (Journeys, Onboarding, Forms)
                </p>
              </CardContent>
            </Card>
          )}
        </Tabs>
      </div>
    </div>
  );
}