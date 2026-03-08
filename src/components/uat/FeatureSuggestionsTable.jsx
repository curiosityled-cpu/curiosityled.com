import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, CheckCircle, XCircle, Clock, Lightbulb, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format } from "date-fns";

export default function FeatureSuggestionsTable({ suggestions, onUpdate }) {
  const [viewingSuggestion, setViewingSuggestion] = useState(null);
  const [reviewData, setReviewData] = useState({
    status: '',
    priority: '',
    admin_notes: ''
  });

  const handleReview = async () => {
    if (!reviewData.status) {
      toast.error('Please select a status');
      return;
    }

    try {
      await base44.entities.FeatureSuggestion.update(viewingSuggestion.id, {
        status: reviewData.status,
        priority: reviewData.priority || null,
        admin_notes: reviewData.admin_notes,
        reviewed_by: base44.auth.me().then(u => u.email),
        reviewed_date: new Date().toISOString()
      });
      
      toast.success('Suggestion updated');
      setViewingSuggestion(null);
      setReviewData({ status: '', priority: '', admin_notes: '' });
      onUpdate();
    } catch (error) {
      console.error('Error updating suggestion:', error);
      toast.error('Failed to update suggestion');
    }
  };

  const getCategoryBadge = (category) => {
    const config = {
      missing_feature: { color: 'bg-red-100 text-red-800', label: 'Missing Feature' },
      gap: { color: 'bg-orange-100 text-orange-800', label: 'Gap' },
      new_idea: { color: 'bg-blue-100 text-blue-800', label: 'New Idea' },
      improvement: { color: 'bg-green-100 text-green-800', label: 'Improvement' }
    }[category] || { color: 'bg-gray-100 text-gray-800', label: category };
    
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
      reviewed: { color: 'bg-blue-100 text-blue-800', icon: Eye, label: 'Reviewed' },
      planned: { color: 'bg-purple-100 text-purple-800', icon: Lightbulb, label: 'Planned' },
      implemented: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Implemented' },
      rejected: { color: 'bg-gray-100 text-gray-800', icon: XCircle, label: 'Rejected' }
    }[status] || { color: 'bg-gray-100 text-gray-800', icon: AlertCircle, label: status };
    
    const Icon = config.icon;
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority) => {
    if (!priority) return null;
    const config = {
      critical: { color: 'bg-red-600 text-white', label: 'Critical' },
      high: { color: 'bg-orange-600 text-white', label: 'High' },
      medium: { color: 'bg-yellow-600 text-white', label: 'Medium' },
      low: { color: 'bg-blue-600 text-white', label: 'Low' }
    }[priority] || { color: 'bg-gray-600 text-white', label: priority };
    
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  return (
    <>
      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-48">Title</TableHead>
              <TableHead className="w-40">Category</TableHead>
              <TableHead className="w-32">Status</TableHead>
              <TableHead className="w-28">Priority</TableHead>
              <TableHead className="w-48">Submitted By</TableHead>
              <TableHead className="w-32">Date</TableHead>
              <TableHead className="w-40">Related Test</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suggestions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                  <Lightbulb className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">No feature suggestions yet</p>
                  <p className="text-sm">Testers can submit suggestions during UAT testing</p>
                </TableCell>
              </TableRow>
            ) : (
              suggestions.map((suggestion) => (
                <TableRow 
                  key={suggestion.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setViewingSuggestion(suggestion)}
                >
                  <TableCell className="font-medium">{suggestion.title}</TableCell>
                  <TableCell>{getCategoryBadge(suggestion.category)}</TableCell>
                  <TableCell>{getStatusBadge(suggestion.status)}</TableCell>
                  <TableCell>{getPriorityBadge(suggestion.priority)}</TableCell>
                  <TableCell className="text-sm">{suggestion.suggested_by_email}</TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(suggestion.created_date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-sm font-mono">
                    {suggestion.uat_test_case_id || '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingSuggestion(suggestion);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* View/Review Dialog */}
      <Dialog open={!!viewingSuggestion} onOpenChange={() => setViewingSuggestion(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Lightbulb className="w-5 h-5 text-yellow-600" />
              {viewingSuggestion?.title}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Category</h4>
                {getCategoryBadge(viewingSuggestion?.category)}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Submitted By</h4>
                <p className="text-sm text-gray-900">{viewingSuggestion?.suggested_by_email}</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Description</h4>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{viewingSuggestion?.description}</p>
            </div>

            {viewingSuggestion?.uat_test_case_id && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Related Test Case</h4>
                <Badge variant="outline" className="font-mono">{viewingSuggestion.uat_test_case_id}</Badge>
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Submission Details</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Submitted: {format(new Date(viewingSuggestion?.created_date || new Date()), 'PPpp')}</p>
                {viewingSuggestion?.uat_cycle && <p>UAT Cycle: {viewingSuggestion.uat_cycle}</p>}
                {viewingSuggestion?.reviewed_by && (
                  <>
                    <p>Reviewed by: {viewingSuggestion.reviewed_by}</p>
                    <p>Reviewed: {format(new Date(viewingSuggestion.reviewed_date), 'PPpp')}</p>
                  </>
                )}
              </div>
            </div>

            <hr />

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Review & Update</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select
                    value={reviewData.status || viewingSuggestion?.status}
                    onValueChange={(value) => setReviewData({ ...reviewData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="reviewed">Reviewed</SelectItem>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="implemented">Implemented</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Priority</label>
                  <Select
                    value={reviewData.priority || viewingSuggestion?.priority || ''}
                    onValueChange={(value) => setReviewData({ ...reviewData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Set priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Admin Notes</label>
                  <Textarea
                    value={reviewData.admin_notes || viewingSuggestion?.admin_notes || ''}
                    onChange={(e) => setReviewData({ ...reviewData, admin_notes: e.target.value })}
                    placeholder="Add notes about this suggestion..."
                    rows={4}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingSuggestion(null)}>
              Close
            </Button>
            <Button onClick={handleReview} className="bg-blue-600 hover:bg-blue-700">
              Update Suggestion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}