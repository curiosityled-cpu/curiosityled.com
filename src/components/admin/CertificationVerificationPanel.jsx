import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle2, XCircle, Eye, Calendar, Building2, Hash, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function CertificationVerificationPanel() {
  const queryClient = useQueryClient();
  const [selectedCert, setSelectedCert] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [revocationReason, setRevocationReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: allCerts = [], isLoading } = useQuery({
    queryKey: ['certifications-review'],
    queryFn: async () => {
      const [pending, verified] = await Promise.all([
        base44.entities.Certification.filter({ status: 'pending_verification' }, '-created_date'),
        base44.entities.Certification.filter({ status: 'verified' }, '-created_date', 50)
      ]);
      return [...pending, ...verified];
    },
    refetchInterval: 30000 // Auto-refresh every 30 seconds
  });

  const filteredCerts = allCerts.filter(cert => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      cert.name?.toLowerCase().includes(search) ||
      cert.user_email?.toLowerCase().includes(search) ||
      cert.issuing_body?.toLowerCase().includes(search)
    );
  });

  const pendingCerts = filteredCerts.filter(c => c.status === 'pending_verification');
  const verifiedCerts = filteredCerts.filter(c => c.status === 'verified');

  const verifyMutation = useMutation({
    mutationFn: async ({ certificationId, status, rejection_reason }) => {
      const response = await base44.functions.invoke('verifyCertification', {
        certificationId,
        status,
        rejection_reason
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certifications-review'] });
      toast.success('Certification status updated successfully');
      setShowRejectModal(false);
      setShowRevokeModal(false);
      setSelectedCert(null);
      setRejectionReason('');
      setRevocationReason('');
    },
    onError: (error) => {
      toast.error(`Failed to update certification: ${error.message}`);
    }
  });

  const handleViewDocument = async (cert) => {
    if (!cert.document_uri) {
      toast.error('No document attached');
      return;
    }

    try {
      const result = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri: cert.document_uri,
        expires_in: 300
      });
      window.open(result.signed_url, '_blank');
    } catch (error) {
      toast.error('Failed to load document');
    }
  };

  const handleVerify = (cert) => {
    verifyMutation.mutate({
      certificationId: cert.id,
      status: 'verified'
    });
  };

  const handleReject = (cert) => {
    setSelectedCert(cert);
    setShowRejectModal(true);
  };

  const handleRevoke = (cert) => {
    setSelectedCert(cert);
    setShowRevokeModal(true);
  };

  const confirmReject = () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    verifyMutation.mutate({
      certificationId: selectedCert.id,
      status: 'rejected',
      rejection_reason: rejectionReason
    });
  };

  const confirmRevoke = () => {
    if (!revocationReason.trim()) {
      toast.error('Please provide a revocation reason');
      return;
    }

    verifyMutation.mutate({
      certificationId: selectedCert.id,
      status: 'revoked',
      rejection_reason: revocationReason
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Certifications Review</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{pendingCerts.length} pending</Badge>
              <Badge variant="outline" className="bg-green-50">{verifiedCerts.length} verified</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by name, email, or issuer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {filteredCerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No certifications to review</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCerts.map((cert) => (
                <Card key={cert.id} className="border-l-4 border-l-yellow-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">{cert.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Submitted by: {cert.user_email}
                        </p>
                      </div>
                      <Badge className={cert.status === 'verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {cert.status === 'verified' ? 'Verified' : 'Pending Review'}
                      </Badge>
                    </div>

                    {cert.competency_ids && cert.competency_ids.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1">Linked Competencies:</p>
                        <div className="flex gap-1 flex-wrap">
                          {cert.competency_ids.slice(0, 3).map((id, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              Competency {idx + 1}
                            </Badge>
                          ))}
                          {cert.competency_ids.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{cert.competency_ids.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Issuer:</span>
                        <span className="font-medium">{cert.issuing_body}</span>
                      </div>

                      {cert.issue_date && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Issued:</span>
                          <span className="font-medium">
                            {format(new Date(cert.issue_date), 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}

                      {cert.expiration_date && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Expires:</span>
                          <span className="font-medium">
                            {format(new Date(cert.expiration_date), 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}

                      {cert.credential_id_or_url && (
                        <div className="flex items-center gap-2 text-sm">
                          <Hash className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Credential:</span>
                          <span className="font-medium truncate">
                            {cert.credential_id_or_url}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {cert.document_uri && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDocument(cert)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Document
                        </Button>
                      )}

                      {cert.status === 'pending_verification' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleVerify(cert)}
                            disabled={verifyMutation.isPending}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Verify
                          </Button>

                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleReject(cert)}
                            disabled={verifyMutation.isPending}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}

                      {cert.status === 'verified' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevoke(cert)}
                          disabled={verifyMutation.isPending}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Revoke
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Certification</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Please provide a reason for rejecting <strong>{selectedCert?.name}</strong>
            </p>
            <Textarea
              placeholder="Explain why this certification is being rejected..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={verifyMutation.isPending || !rejectionReason.trim()}
            >
              {verifyMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Modal */}
      <Dialog open={showRevokeModal} onOpenChange={setShowRevokeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Certification</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Please provide a reason for revoking <strong>{selectedCert?.name}</strong>
            </p>
            <Textarea
              placeholder="Explain why this certification is being revoked..."
              value={revocationReason}
              onChange={(e) => setRevocationReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRevoke}
              disabled={verifyMutation.isPending || !revocationReason.trim()}
            >
              {verifyMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}