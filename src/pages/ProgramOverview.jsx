import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { Users, AlertTriangle, TrendingUp, CheckCircle, Loader2, Search, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const getRiskLevel = (insight) => {
  if (!insight) return { label: 'No Data', color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200', dot: 'bg-gray-400' };
  const flags = insight.risk_flags?.length || 0;
  if (flags === 0) return { label: 'On Track', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' };
  if (flags === 1) return { label: 'Developing', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' };
  return { label: 'At Risk', color: 'text-red-700', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' };
};

function ManagerRow({ manager, insight, onClick }) {
  const risk = getRiskLevel(insight);
  const initial = manager.full_name?.[0] || manager.email?.[0] || '?';

  return (
    <button
      onClick={() => onClick(manager, insight)}
      className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-0"
    >
      <div className="w-9 h-9 rounded-full bg-[#0202ff]/10 flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-bold text-[#0202ff]">{initial}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{manager.full_name || manager.email}</p>
        <p className="text-xs text-gray-500 truncate">{insight?.archetype || 'Assessment pending'}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${risk.bg} ${risk.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${risk.dot}`} />
          {risk.label}
        </span>
        <ChevronRight className="w-4 h-4 text-gray-300" />
      </div>
    </button>
  );
}

export default function ProgramOverview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: managers, isLoading: loadingManagers } = useQuery({
    queryKey: ['managers', user?.client_id],
    queryFn: async () => {
      const users = await base44.entities.User.filter({
        client_id: user.client_id,
        app_role: { $in: ['User Level 1', 'User Level 2'] }
      });
      return users;
    },
    enabled: !!user?.client_id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: allInsights, isLoading: loadingInsights } = useQuery({
    queryKey: ['all-insights', user?.client_id],
    queryFn: async () => {
      const insights = await base44.entities.AssessmentInsights.filter({
        client_id: user.client_id,
        status: 'generated'
      });
      // Index by user_email for fast lookup
      return insights.reduce((acc, i) => { acc[i.user_email] = i; return acc; }, {});
    },
    enabled: !!user?.client_id,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = loadingManagers || loadingInsights;

  const filteredManagers = (managers || []).filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return m.full_name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q);
  });

  // Summary stats
  const stats = React.useMemo(() => {
    if (!managers || !allInsights) return null;
    let atRisk = 0, developing = 0, onTrack = 0, noData = 0;
    managers.forEach(m => {
      const insight = allInsights[m.email];
      const flags = insight?.risk_flags?.length || 0;
      if (!insight) noData++;
      else if (flags === 0) onTrack++;
      else if (flags === 1) developing++;
      else atRisk++;
    });
    return { atRisk, developing, onTrack, noData, total: managers.length };
  }, [managers, allInsights]);

  const handleManagerClick = (manager, insight) => {
    navigate(`/manager-detail/${manager.id}`, { state: { manager, insight } });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Program Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor your managers' leadership development and risk signals.</p>
      </div>

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-0 shadow-sm text-center">
            <CardContent className="py-4">
              <div className="flex items-center justify-center w-8 h-8 bg-red-50 rounded-full mx-auto mb-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.atRisk}</p>
              <p className="text-xs text-gray-500 mt-0.5">At Risk</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm text-center">
            <CardContent className="py-4">
              <div className="flex items-center justify-center w-8 h-8 bg-amber-50 rounded-full mx-auto mb-2">
                <TrendingUp className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.developing}</p>
              <p className="text-xs text-gray-500 mt-0.5">Developing</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm text-center">
            <CardContent className="py-4">
              <div className="flex items-center justify-center w-8 h-8 bg-emerald-50 rounded-full mx-auto mb-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.onTrack}</p>
              <p className="text-xs text-gray-500 mt-0.5">On Track</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Manager List */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0202ff]" />
              Managers ({filteredManagers.length})
            </CardTitle>
          </div>
          <div className="relative mt-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search managers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredManagers.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No managers found</p>
            </div>
          ) : (
            <div>
              {filteredManagers.map(manager => (
                <ManagerRow
                  key={manager.id}
                  manager={manager}
                  insight={allInsights?.[manager.email]}
                  onClick={handleManagerClick}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}