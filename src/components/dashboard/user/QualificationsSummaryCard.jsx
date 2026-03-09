import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Award, FileText, Plus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

export default function QualificationsSummaryCard({ user }) {
  const { data: qualifications, isLoading } = useQuery({
    queryKey: ['user-qualifications', user?.email],
    queryFn: async () => {
      const [certs, assessments] = await Promise.all([
        base44.entities.Certification.filter({ 
          user_email: user.email, 
          status: { $in: ['verified', 'pending_verification'] }
        }, '-created_date', 5),
        base44.entities.ExternalAssessmentResult.filter({ 
          user_email: user.email,
          status: { $in: ['verified', 'pending_human_review'] }
        }, '-created_date', 3)
      ]);
      return { certifications: certs, assessments };
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000
  });

  if (isLoading || !qualifications) {
    return null;
  }

  const { certifications = [], assessments = [] } = qualifications;
  const totalCount = certifications.length + assessments.length;

  if (totalCount === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-4">
              Add your certifications and assessment results to strengthen your profile
            </p>
            <Link to={createPageUrl('Profile')}>
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Qualifications
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>My Qualifications</span>
          <Badge variant="outline">{totalCount}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {certifications.slice(0, 3).map((cert) => (
          <div key={cert.id} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
            <Award className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{cert.name}</p>
              <p className="text-xs text-gray-600 truncate">{cert.issuing_body}</p>
              <Badge className={cert.status === 'verified' ? 'bg-green-100 text-green-800 text-xs mt-1' : 'bg-yellow-100 text-yellow-800 text-xs mt-1'}>
                {cert.status === 'verified' ? 'Verified' : 'Pending'}
              </Badge>
            </div>
          </div>
        ))}

        {assessments.slice(0, 2).map((assessment) => (
          <div key={assessment.id} className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
            <FileText className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{assessment.assessment_type}</p>
              {assessment.designation_or_score && (
                <p className="text-xs text-gray-600 truncate">Result: {assessment.designation_or_score}</p>
              )}
              <Badge className={assessment.status === 'verified' ? 'bg-green-100 text-green-800 text-xs mt-1' : 'bg-blue-100 text-blue-800 text-xs mt-1'}>
                {assessment.status === 'verified' ? 'Verified' : 'Under Review'}
              </Badge>
            </div>
          </div>
        ))}

        <Link to={createPageUrl('Profile')}>
          <Button variant="outline" size="sm" className="w-full mt-2">
            View All
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}