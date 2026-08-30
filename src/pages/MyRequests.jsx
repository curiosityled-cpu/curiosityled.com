import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import RequestSubmissionForm from "../components/requests/RequestSubmissionForm";
import RequestDetailPanel from "../components/requests/RequestDetailPanel";

function MyRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);

  useEffect(() => {
    loadMyRequests();
  }, [user]);

  useEffect(() => {
    filterRequests();
  }, [requests, searchTerm, statusFilter]);

  const loadMyRequests = async () => {
    if (!user?.email) return;
    
    setLoading(true);
    try {
      // Load legacy requests
      const legacyRequests = await base44.entities.DevelopmentRequest.filter({
        requested_by_email: user.email
      }, '-created_date');
      
      // Load form-based requests
      const requestForms = await base44.entities.CustomForm.filter({ form_type: 'request' });
      const formIds = requestForms.map(f => f.id);
      
      let formBasedRequests = [];
      if (formIds.length > 0) {
        const submissions = await base44.entities.CustomFormSubmission.filter({
          form_id: { $in: formIds },
          submitter_email: user.email
        }, '-created_date');
        
        // Transform to request format
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
          form_submission_id: sub.id
        }));
      }
      
      // Merge both sources
      const allRequests = [...legacyRequests, ...formBasedRequests];
      setRequests(allRequests);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = [...requests];

    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    setFilteredRequests(filtered);
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'new':
      case 'triaging':
        return <Clock className="w-4 h-4 text-blue-600" />;
      default:
        return <Clock className="w-4 h-4 text-orange-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
      case 'assigned':
        return 'bg-orange-100 text-orange-800';
      case 'awaiting_approval':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'new', label: 'New' },
    { value: 'triaging', label: 'Triaging' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'awaiting_approval', label: 'Awaiting Approval' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  if (showSubmitForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <RequestSubmissionForm
            onSubmit={async () => {
              setShowSubmitForm(false);
              await loadMyRequests();
            }}
            onCancel={() => setShowSubmitForm(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Requests</h1>
            <p className="text-gray-600 mt-1">Track and manage your development requests</p>
          </div>
          <Button
            onClick={() => setShowSubmitForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Submit New Request
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search requests..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {statusOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Request List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No requests found</p>
              <Button
                onClick={() => setShowSubmitForm(true)}
                variant="outline"
                className="mt-4"
              >
                Submit Your First Request
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredRequests.map((request) => (
              <Card
                key={request.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedRequestId(request.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{request.title}</CardTitle>
                      <p className="text-sm text-gray-600 line-clamp-2">{request.description}</p>
                    </div>
                    {getStatusIcon(request.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge className={getStatusColor(request.status)}>
                      {request.status.replace(/_/g, ' ')}
                    </Badge>
                    <Badge variant="outline" className={getPriorityColor(request.priority)}>
                      {request.priority}
                    </Badge>
                    <Badge variant="outline">
                      {request.request_type.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Submitted {format(new Date(request.created_date), 'MMM d, yyyy')}</span>
                    {request.assigned_to_email && (
                      <span>Assigned to {request.assigned_to_email}</span>
                    )}
                  </div>

                  {request.due_date && (
                    <div className="flex items-center gap-1 text-xs text-gray-600 mt-2">
                      <Clock className="w-3 h-3" />
                      Due {format(new Date(request.due_date), 'MMM d, yyyy')}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Request Detail Panel */}
        {selectedRequestId && (
          <RequestDetailPanel
            requestId={selectedRequestId}
            onClose={() => setSelectedRequestId(null)}
            onUpdate={loadMyRequests}
          />
        )}
      </div>
    </div>
  );
}

export default withAuthProtection(MyRequests);