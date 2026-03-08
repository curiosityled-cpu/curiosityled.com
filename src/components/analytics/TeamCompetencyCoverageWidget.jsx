import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Users, Target } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function TeamCompetencyCoverageWidget({ subordinateEmails = [] }) {
  const { data, isLoading } = useQuery({
    queryKey: ['team-competency-coverage', subordinateEmails],
    queryFn: async () => {
      if (subordinateEmails.length === 0) return null;
      
      const [certs, competencies] = await Promise.all([
        base44.entities.Certification.filter({
          user_email: { $in: subordinateEmails },
          status: 'verified'
        }),
        base44.entities.Competency.list()
      ]);

      // Map certifications to competencies
      const competencyCoverage = {};
      
      certs.forEach(cert => {
        if (cert.competency_ids && cert.competency_ids.length > 0) {
          cert.competency_ids.forEach(compId => {
            if (!competencyCoverage[compId]) {
              competencyCoverage[compId] = {
                count: 0,
                users: new Set(),
                competency: competencies.find(c => c.id === compId)
              };
            }
            competencyCoverage[compId].count++;
            competencyCoverage[compId].users.add(cert.user_email);
          });
        }
      });

      // Convert to array and calculate coverage percentage
      const coverage = Object.values(competencyCoverage)
        .filter(c => c.competency)
        .map(c => ({
          competency: c.competency.name,
          count: c.count,
          userCount: c.users.size,
          coveragePercentage: Math.round((c.users.size / subordinateEmails.length) * 100)
        }))
        .sort((a, b) => b.coveragePercentage - a.coveragePercentage);

      return {
        totalCerts: certs.length,
        coverage: coverage.slice(0, 5) // Top 5
      };
    },
    enabled: subordinateEmails.length > 0,
    staleTime: 10 * 60 * 1000
  });

  if (isLoading || !data || data.coverage.length === 0) return null;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="w-5 h-5 text-green-600" />
          Team Competency Coverage by Certifications
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm mb-4">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-600" />
              <span className="text-gray-600">{data.totalCerts} verified certifications</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              <span className="text-gray-600">{subordinateEmails.length} team members</span>
            </div>
          </div>

          {data.coverage.map((item, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-900">{item.competency}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {item.userCount} / {subordinateEmails.length}
                  </Badge>
                  <span className="text-gray-600">{item.coveragePercentage}%</span>
                </div>
              </div>
              <Progress value={item.coveragePercentage} className="h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}