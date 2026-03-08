import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Award, Users, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function OrganizationalSkillMapWidget({ clientId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['org-skill-map', clientId],
    queryFn: async () => {
      // Fetch all users and certifications for the organization
      const [users, certs] = await Promise.all([
        base44.entities.User.filter({ client_id: clientId }),
        base44.entities.Certification.filter({ 
          client_id: clientId,
          status: 'verified'
        })
      ]);

      // Group by department
      const departmentMap = {};
      
      users.forEach(user => {
        const dept = user.department || 'Unassigned';
        if (!departmentMap[dept]) {
          departmentMap[dept] = {
            users: new Set(),
            certifications: [],
            uniqueCerts: new Set()
          };
        }
        departmentMap[dept].users.add(user.email);
      });

      certs.forEach(cert => {
        const user = users.find(u => u.email === cert.user_email);
        const dept = user?.department || 'Unassigned';
        
        if (departmentMap[dept]) {
          departmentMap[dept].certifications.push(cert);
          departmentMap[dept].uniqueCerts.add(cert.name);
        }
      });

      // Convert to array and calculate metrics
      const departments = Object.entries(departmentMap)
        .map(([name, data]) => ({
          name,
          userCount: data.users.size,
          certCount: data.certifications.length,
          uniqueCertCount: data.uniqueCerts.size,
          avgCertsPerUser: data.users.size > 0 
            ? (data.certifications.length / data.users.size).toFixed(1)
            : 0
        }))
        .sort((a, b) => b.certCount - a.certCount);

      return {
        departments,
        totalUsers: users.length,
        totalCerts: certs.length,
        totalUniqueCerts: new Set(certs.map(c => c.name)).size
      };
    },
    enabled: !!clientId,
    staleTime: 15 * 60 * 1000
  });

  if (isLoading || !data) return null;

  const maxCerts = Math.max(...data.departments.map(d => d.certCount), 1);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          Organizational Skill Map
        </CardTitle>
        <p className="text-sm text-gray-500">Certification distribution by department</p>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <Users className="w-6 h-6 text-blue-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-900">{data.totalUsers}</p>
            <p className="text-xs text-gray-600">Total Users</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <Award className="w-6 h-6 text-green-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-900">{data.totalCerts}</p>
            <p className="text-xs text-gray-600">Certifications</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <TrendingUp className="w-6 h-6 text-purple-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-900">{data.totalUniqueCerts}</p>
            <p className="text-xs text-gray-600">Unique Certs</p>
          </div>
        </div>

        {/* Department Breakdown */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 text-sm">By Department</h4>
          {data.departments.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-4">No departments with certifications</p>
          ) : (
            <div className="space-y-3">
              {data.departments.map((dept, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">{dept.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {dept.userCount} users
                      </Badge>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-900">{dept.certCount}</span>
                      <span className="text-xs text-gray-500 ml-1">certs</span>
                      <span className="text-xs text-gray-400 ml-2">
                        ({dept.avgCertsPerUser} avg)
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={(dept.certCount / maxCerts) * 100} 
                    className="h-2"
                  />
                  <p className="text-xs text-gray-500">
                    {dept.uniqueCertCount} unique certification{dept.uniqueCertCount !== 1 ? 's' : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}