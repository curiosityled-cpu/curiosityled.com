import React from 'react';
import { useAuth } from '@/components/useAuth';
import CertificationVerificationPanel from '@/components/admin/CertificationVerificationPanel';
import ExternalAssessmentReviewPanel from '@/components/admin/ExternalAssessmentReviewPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldCheck, FileCheck } from 'lucide-react';
import { AccessDeniedPage } from '@/components/AccessDeniedPage';

export default function QualificationsReview() {
  const { user, loading, hasAnyPermission } = useAuth();

  // Check if user has admin permissions
  const hasAccess = user && (
    user.app_role === 'Admin Level 1' ||
    user.app_role === 'Admin Level 2' ||
    user.app_role === 'Super Administrator' ||
    user.app_role === 'Partner Business Administrator' ||
    user.app_role === 'Platform Admin'
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return <AccessDeniedPage />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Qualifications Review</h1>
        <p className="text-gray-600 mt-2">
          Review and verify user-submitted certifications and external assessments
        </p>
      </div>

      <Tabs defaultValue="certifications" className="space-y-6">
        <TabsList>
          <TabsTrigger value="certifications" className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Certifications
          </TabsTrigger>
          <TabsTrigger value="assessments" className="flex items-center gap-2">
            <FileCheck className="w-4 h-4" />
            External Assessments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="certifications">
          <CertificationVerificationPanel />
        </TabsContent>

        <TabsContent value="assessments">
          <ExternalAssessmentReviewPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}