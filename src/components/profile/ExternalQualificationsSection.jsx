import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, Plus, FileText, Clock, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import AddExternalAssessmentModal from "./AddExternalAssessmentModal";
import AddCertificationModal from "./AddCertificationModal";

export default function ExternalQualificationsSection({ user }) {
  const [assessments, setAssessments] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [showCertificationModal, setShowCertificationModal] = useState(false);

  useEffect(() => {
    if (user?.email) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assessmentResults, certificationResults] = await Promise.all([
        base44.entities.ExternalAssessmentResult.filter({ user_email: user.email }, '-created_date'),
        base44.entities.Certification.filter({ user_email: user.email }, '-created_date')
      ]);

      setAssessments(assessmentResults);
      setCertifications(certificationResults);
    } catch (error) {
      console.error('Error loading qualifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending_ai_processing: { icon: Clock, color: 'bg-yellow-100 text-yellow-800', label: 'Processing' },
      ai_processed: { icon: CheckCircle2, color: 'bg-blue-100 text-blue-800', label: 'Processed' },
      needs_manual_input: { icon: AlertCircle, color: 'bg-orange-100 text-orange-800', label: 'Needs Review' },
      pending_human_review: { icon: Clock, color: 'bg-yellow-100 text-yellow-800', label: 'Under Review' },
      verified: { icon: CheckCircle2, color: 'bg-green-100 text-green-800', label: 'Verified' },
      pending_verification: { icon: Clock, color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      rejected: { icon: XCircle, color: 'bg-red-100 text-red-800', label: 'Rejected' },
      expired: { icon: AlertCircle, color: 'bg-gray-100 text-gray-800', label: 'Expired' },
      revoked: { icon: XCircle, color: 'bg-red-100 text-red-800', label: 'Revoked' }
    }[status] || { icon: Clock, color: 'bg-gray-100 text-gray-800', label: status };

    const Icon = config.icon;
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* External Assessments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>External Assessment Results</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  DiSC, MBTI, and other third-party assessments
                </p>
              </div>
              <Button onClick={() => setShowAssessmentModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Assessment
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {assessments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No external assessments recorded yet</p>
                <p className="text-sm mt-1">Add your DiSC, MBTI, or other assessment results</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assessments.map((assessment) => (
                  <div key={assessment.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{assessment.assessment_type}</h4>
                          {getStatusBadge(assessment.status)}
                        </div>
                        {assessment.designation_or_score && (
                          <p className="text-sm text-gray-700 mb-1">
                            <strong>Result:</strong> {assessment.designation_or_score}
                          </p>
                        )}
                        {assessment.ai_summary && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {assessment.ai_summary}
                          </p>
                        )}
                        {assessment.rejection_reason && (
                          <p className="text-sm text-red-600 bg-red-50 p-2 rounded mb-2">
                            <strong>Reason:</strong> {assessment.rejection_reason}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          Completed: {assessment.date_completed ? format(new Date(assessment.date_completed), 'MMM d, yyyy') : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Certifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Professional Certifications</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Licenses, certifications, and credentials
                </p>
              </div>
              <Button onClick={() => setShowCertificationModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Certification
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {certifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Award className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No certifications recorded yet</p>
                <p className="text-sm mt-1">Add your professional certifications and licenses</p>
              </div>
            ) : (
              <div className="space-y-3">
                {certifications.map((cert) => (
                  <div key={cert.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Award className="w-4 h-4 text-blue-600" />
                          <h4 className="font-semibold">{cert.name}</h4>
                          {getStatusBadge(cert.status)}
                        </div>
                        <p className="text-sm text-gray-700 mb-1">
                          <strong>Issuer:</strong> {cert.issuing_body}
                        </p>
                        {(cert.rejection_reason || cert.revocation_reason) && (
                          <p className="text-sm text-red-600 bg-red-50 p-2 rounded mb-2">
                            <strong>Reason:</strong> {cert.rejection_reason || cert.revocation_reason}
                          </p>
                        )}
                        <div className="flex gap-4 text-xs text-gray-500">
                          {cert.issue_date && (
                            <span>Issued: {format(new Date(cert.issue_date), 'MMM yyyy')}</span>
                          )}
                          {cert.expiration_date && (
                            <span>Expires: {format(new Date(cert.expiration_date), 'MMM yyyy')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AddExternalAssessmentModal
        open={showAssessmentModal}
        onClose={() => setShowAssessmentModal(false)}
        onSuccess={loadData}
      />

      <AddCertificationModal
        open={showCertificationModal}
        onClose={() => setShowCertificationModal(false)}
        onSuccess={loadData}
        user={user}
      />
    </>
  );
}