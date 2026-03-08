import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, FileText, Users, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TeamQualificationsWidget({ subordinateEmails = [] }) {
  const { data: teamQuals, isLoading } = useQuery({
    queryKey: ['team-qualifications', subordinateEmails],
    queryFn: async () => {
      if (subordinateEmails.length === 0) return { certs: [], assessments: [] };
      
      const [certs, assessments] = await Promise.all([
        base44.entities.Certification.filter({
          user_email: { $in: subordinateEmails },
          status: 'verified'
        }),
        base44.entities.ExternalAssessmentResult.filter({
          user_email: { $in: subordinateEmails },
          status: 'verified'
        })
      ]);
      return { certs, assessments };
    },
    enabled: subordinateEmails.length > 0,
    staleTime: 10 * 60 * 1000
  });

  if (isLoading || !teamQuals) return null;

  const { certs = [], assessments = [] } = teamQuals;
  const totalCount = certs.length + assessments.length;

  if (totalCount === 0) return null;

  // Get unique certifications and assessment types
  const uniqueCerts = [...new Set(certs.map(c => c.name))];
  const uniqueAssessments = [...new Set(assessments.map(a => a.assessment_type))];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-600" />
            Team Qualifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Award className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{certs.length}</p>
              <p className="text-xs text-gray-600">Certifications</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <FileText className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{assessments.length}</p>
              <p className="text-xs text-gray-600">Assessments</p>
            </div>
          </div>

          {uniqueCerts.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-700 mb-2">Top Certifications:</p>
              <div className="flex flex-wrap gap-1">
                {uniqueCerts.slice(0, 5).map((cert, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {cert}
                  </Badge>
                ))}
                {uniqueCerts.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{uniqueCerts.length - 5} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {uniqueAssessments.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">Assessment Types:</p>
              <div className="flex flex-wrap gap-1">
                {uniqueAssessments.map((type, idx) => (
                  <Badge key={idx} className="bg-purple-100 text-purple-800 text-xs">
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}