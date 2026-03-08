import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Award, Calendar, AlertTriangle } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export default function CertificationTrendsWidget({ clientId, timeframe = 6 }) {
  const { data, isLoading } = useQuery({
    queryKey: ['cert-trends', clientId, timeframe],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = subMonths(endDate, timeframe);

      const [certs, expiringCerts] = await Promise.all([
        base44.entities.Certification.filter({
          client_id: clientId,
          created_date: { $gte: startDate.toISOString() }
        }, '-created_date'),
        base44.entities.Certification.filter({
          client_id: clientId,
          status: 'verified',
          expiration_date: { 
            $gte: new Date().toISOString(),
            $lte: subMonths(new Date(), -3).toISOString() // Next 3 months
          }
        })
      ]);

      // Group by month
      const monthlyData = {};
      for (let i = 0; i < timeframe; i++) {
        const monthDate = subMonths(endDate, i);
        const monthKey = format(startOfMonth(monthDate), 'MMM yyyy');
        monthlyData[monthKey] = {
          verified: 0,
          pending: 0,
          rejected: 0
        };
      }

      certs.forEach(cert => {
        const monthKey = format(startOfMonth(new Date(cert.created_date)), 'MMM yyyy');
        if (monthlyData[monthKey]) {
          if (cert.status === 'verified') monthlyData[monthKey].verified++;
          else if (cert.status === 'pending_verification') monthlyData[monthKey].pending++;
          else if (cert.status === 'rejected') monthlyData[monthKey].rejected++;
        }
      });

      // Calculate trends
      const months = Object.keys(monthlyData).reverse();
      const currentMonth = months[months.length - 1];
      const previousMonth = months[months.length - 2];
      
      const currentTotal = monthlyData[currentMonth]?.verified || 0;
      const previousTotal = monthlyData[previousMonth]?.verified || 0;
      const trend = previousTotal > 0 
        ? Math.round(((currentTotal - previousTotal) / previousTotal) * 100)
        : 0;

      return {
        monthlyData,
        months,
        expiringCount: expiringCerts.length,
        trend,
        totalVerified: certs.filter(c => c.status === 'verified').length,
        totalPending: certs.filter(c => c.status === 'pending_verification').length
      };
    },
    enabled: !!clientId,
    staleTime: 15 * 60 * 1000
  });

  if (isLoading || !data) return null;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          Certification Trends
        </CardTitle>
        <p className="text-sm text-gray-500">Last {timeframe} months</p>
      </CardHeader>
      <CardContent>
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Award className="w-5 h-5 text-green-600" />
              <Badge className={
                data.trend > 0 ? 'bg-green-100 text-green-800' :
                data.trend < 0 ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }>
                {data.trend > 0 ? '+' : ''}{data.trend}%
              </Badge>
            </div>
            <p className="text-2xl font-bold text-gray-900">{data.totalVerified}</p>
            <p className="text-xs text-gray-600">Verified</p>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              {data.expiringCount > 0 && (
                <Badge className="bg-orange-100 text-orange-800">Alert</Badge>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900">{data.expiringCount}</p>
            <p className="text-xs text-gray-600">Expiring Soon</p>
          </div>
        </div>

        {/* Monthly Breakdown */}
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Monthly Activity
          </h4>
          <div className="space-y-2">
            {data.months.slice().reverse().slice(0, 3).map(month => {
              const monthData = data.monthlyData[month];
              const total = monthData.verified + monthData.pending + monthData.rejected;
              
              return (
                <div key={month} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-700">{month}</span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-green-600">{monthData.verified}</span>
                      <span className="text-xs text-gray-400">verified</span>
                    </div>
                    {monthData.pending > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-yellow-600">{monthData.pending}</span>
                        <span className="text-xs text-gray-400">pending</span>
                      </div>
                    )}
                    <Badge variant="outline" className="text-xs">{total} total</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {data.totalPending > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              {data.totalPending} certification{data.totalPending !== 1 ? 's' : ''} pending verification
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}