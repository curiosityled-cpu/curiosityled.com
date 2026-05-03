import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sparkles,
  Target,
  AlertTriangle,
  Zap,
  CheckCircle,
  Search,
  Maximize2,
  X,
} from "lucide-react";
import { isAfter, isBefore, startOfDay, subDays } from "date-fns";

const PAGE_SIZE = 10;

// Shared profile card content (used in both inline accordion and modal)
function ProfileContent({ insight, u }) {
  return (
    <div className="space-y-3">
      {insight.summary && (
        <p className="text-sm text-gray-700 leading-relaxed">{insight.summary}</p>
      )}
      <div className="grid md:grid-cols-3 gap-3">
        {insight.top_strengths?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-green-700 mb-1 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Top Strengths
            </p>
            <ul className="space-y-0.5">
              {insight.top_strengths.slice(0, 3).map((s, i) => (
                <li key={i} className="text-xs text-gray-600">· {s}</li>
              ))}
            </ul>
          </div>
        )}
        {insight.development_areas?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-orange-700 mb-1 flex items-center gap-1">
              <Target className="w-3 h-3" /> Development Areas
            </p>
            <ul className="space-y-0.5">
              {insight.development_areas.slice(0, 3).map((d, i) => (
                <li key={i} className="text-xs text-gray-600">· {d}</li>
              ))}
            </ul>
          </div>
        )}
        {insight.risk_flags?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Risk Flags
            </p>
            <ul className="space-y-0.5">
              {insight.risk_flags.map((r, i) => (
                <li key={i} className="text-xs text-gray-600">· {r.replace(/_/g, ' ')}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {insight.recommendations?.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1">
            <Zap className="w-3 h-3" /> Recommendations
          </p>
          <ul className="space-y-0.5">
            {insight.recommendations.slice(0, 2).map((rec, i) => (
              <li key={i} className="text-xs text-gray-600">· {rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Shared raw assessment content
function RawAssessmentContent({ a }) {
  const score = a.overall_pct || 0;
  return (
    <div className="space-y-3">
      {a.archetype_label && (
        <p className="text-xs text-purple-700 font-medium">Archetype: {a.archetype_label}</p>
      )}
      <div className="grid grid-cols-3 gap-2 text-xs">
        {[
          { label: 'Situational Intel', val: a.si_pct },
          { label: 'Decision Making', val: a.dm_pct },
          { label: 'Communication', val: a.comm_pct },
          { label: 'Resource Mgmt', val: a.rm_pct },
          { label: 'Stakeholder Mgmt', val: a.sm_pct },
          { label: 'Performance Mgmt', val: a.pm_pct },
        ].map(({ label, val }) => val != null && (
          <div key={label} className="bg-gray-50 rounded p-2">
            <div className="text-gray-500">{label}</div>
            <div className={`font-bold ${(val || 0) >= 70 ? 'text-green-700' : (val || 0) >= 55 ? 'text-yellow-700' : 'text-red-700'}`}>
              {val}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfilesAccordion({ profiles, allUsers, mode }) {
  const isInsightMode = mode === 'insights';

  return (
    <Accordion type="single" collapsible className="space-y-2">
      {profiles.map((item, idx) => {
        const u = allUsers.find(u => u.email === (isInsightMode ? item.user_email : item.email));
        const name = u?.full_name || (isInsightMode ? item.user_email : item.email);
        const role = u?.current_role || '';
        const dept = u?.department ? ` · ${u.department}` : '';

        if (isInsightMode) {
          return (
            <AccordionItem key={item.id || idx} value={`profile-${idx}`} className="border rounded-lg px-1 bg-white">
              <AccordionTrigger className="px-3 py-3 hover:no-underline">
                <div className="flex items-center gap-3 text-left flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{name}</p>
                    {(role || dept) && <p className="text-xs text-gray-500 truncate">{role}{dept}</p>}
                  </div>
                  <Badge className="bg-purple-100 text-purple-800 shrink-0 text-xs">
                    {item.archetype || 'Processing...'}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-4">
                <ProfileContent insight={item} u={u} />
              </AccordionContent>
            </AccordionItem>
          );
        }

        // Raw assessment fallback
        const score = item.overall_pct || 0;
        const band = item.band_overall || (score >= 80 ? 'Proficient' : score >= 60 ? 'Developing' : 'Awareness');
        const bandColor = band === 'Mastery' || band === 'Proficient'
          ? 'bg-green-100 text-green-800'
          : band === 'Developing'
          ? 'bg-yellow-100 text-yellow-800'
          : 'bg-red-100 text-red-800';

        return (
          <AccordionItem key={item.id || idx} value={`profile-${idx}`} className="border rounded-lg px-1 bg-white">
            <AccordionTrigger className="px-3 py-3 hover:no-underline">
              <div className="flex items-center gap-3 text-left flex-1 min-w-0">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{name}</p>
                  {(role || dept) && <p className="text-xs text-gray-500 truncate">{role}{dept}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={`${bandColor} text-xs`}>{band}</Badge>
                  <span className="font-bold text-gray-800 text-sm">{score}%</span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-4">
              <RawAssessmentContent a={item} />
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

export default function LeaderInsightProfilesCard({ rawData }) {
  const [search, setSearch] = useState('');
  const [archetypeFilter, setArchetypeFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);

  const hasInsights = rawData.assessmentInsights.length > 0;
  const hasAssessments = rawData.assessments.length > 0;

  // Deduplicated raw assessments by email
  const latestByEmail = useMemo(() => Object.values(
    rawData.assessments.reduce((acc, a) => {
      const email = a.email;
      if (!acc[email] || new Date(a.submission_ts || a.created_date) > new Date(acc[email].submission_ts || acc[email].created_date)) {
        acc[email] = a;
      }
      return acc;
    }, {})
  ), [rawData.assessments]);

  // Available archetypes for filter dropdown
  const archetypes = useMemo(() => {
    if (!hasInsights) return [];
    return [...new Set(rawData.assessmentInsights.map(i => i.archetype).filter(Boolean))];
  }, [rawData.assessmentInsights, hasInsights]);

  // Available departments from allUsers
  const departments = useMemo(() => {
    return [...new Set(rawData.allUsers.map(u => u.department).filter(Boolean))].sort();
  }, [rawData.allUsers]);

  const getDateCutoff = () => {
    const now = new Date();
    switch (dateFilter) {
      case '30days': return subDays(now, 30);
      case '90days': return subDays(now, 90);
      case '6months': return subDays(now, 180);
      case '12months': return subDays(now, 365);
      default: return null;
    }
  };

  // Apply filters
  const filteredProfiles = useMemo(() => {
    if (!hasInsights && !hasAssessments) return [];
    const cutoff = getDateCutoff();

    if (hasInsights) {
      return rawData.assessmentInsights.filter(item => {
        const u = rawData.allUsers.find(u => u.email === item.user_email);
        const name = (u?.full_name || item.user_email || '').toLowerCase();
        const matchSearch = !search || name.includes(search.toLowerCase()) || (item.user_email || '').toLowerCase().includes(search.toLowerCase());
        const matchArchetype = archetypeFilter === 'all' || item.archetype === archetypeFilter;
        const matchRisk = riskFilter === 'all'
          || (riskFilter === 'has_risks' && item.risk_flags?.length > 0)
          || (riskFilter === 'no_risks' && (!item.risk_flags || item.risk_flags.length === 0));
        const matchDept = departmentFilter === 'all' || u?.department === departmentFilter;
        const matchDate = !cutoff || isAfter(new Date(item.created_date || item.last_attempted_at || 0), cutoff);
        return matchSearch && matchArchetype && matchRisk && matchDept && matchDate;
      });
    }

    return latestByEmail.filter(item => {
      const u = rawData.allUsers.find(u => u.email === item.email);
      const name = (u?.full_name || item.email || '').toLowerCase();
      const matchSearch = !search || name.includes(search.toLowerCase()) || (item.email || '').toLowerCase().includes(search.toLowerCase());
      const score = item.overall_pct || 0;
      const matchRisk = riskFilter === 'all'
        || (riskFilter === 'has_risks' && score < 60)
        || (riskFilter === 'no_risks' && score >= 60);
      const matchDept = departmentFilter === 'all' || u?.department === departmentFilter;
      const matchDate = !cutoff || isAfter(new Date(item.submission_ts || item.created_date || 0), cutoff);
      return matchSearch && matchRisk && matchDept && matchDate;
    });
  }, [rawData, hasInsights, hasAssessments, search, archetypeFilter, riskFilter, departmentFilter, dateFilter, latestByEmail]);

  const mode = hasInsights ? 'insights' : 'raw';

  const FiltersRow = () => (
    <div className="flex flex-wrap gap-2 mt-3">
      <div className="relative flex-1 min-w-[160px]">
        <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8 h-9 text-sm"
        />
      </div>
      {departments.length > 0 && (
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-40 h-9 text-sm">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select value={dateFilter} onValueChange={setDateFilter}>
        <SelectTrigger className="w-36 h-9 text-sm">
          <SelectValue placeholder="All Time" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Time</SelectItem>
          <SelectItem value="30days">Last 30 Days</SelectItem>
          <SelectItem value="90days">Last 90 Days</SelectItem>
          <SelectItem value="6months">Last 6 Months</SelectItem>
          <SelectItem value="12months">Last 12 Months</SelectItem>
        </SelectContent>
      </Select>
      {hasInsights && archetypes.length > 0 && (
        <Select value={archetypeFilter} onValueChange={setArchetypeFilter}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <SelectValue placeholder="All Archetypes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Archetypes</SelectItem>
            {archetypes.map(a => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select value={riskFilter} onValueChange={setRiskFilter}>
        <SelectTrigger className="w-36 h-9 text-sm">
          <SelectValue placeholder="All Profiles" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Profiles</SelectItem>
          <SelectItem value="has_risks">Has Risk Flags</SelectItem>
          <SelectItem value="no_risks">No Risk Flags</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
  const visibleProfiles = filteredProfiles.slice(0, PAGE_SIZE);
  const totalCount = filteredProfiles.length;

  if (!hasInsights && !hasAssessments) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Leader Insight Profiles
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">Pre-generated AI insights from completed assessments</p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="font-medium">No assessment data yet</p>
            <p className="text-sm mt-1">Leader insights appear here once your team completes their leadership assessment.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Leader Insight Profiles
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Pre-generated AI insights from completed assessments — updated automatically after each submission
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowModal(true)} className="shrink-0">
              <Maximize2 className="w-4 h-4 mr-2" />
              View All ({totalCount})
            </Button>
          </div>

          {/* Filters */}
          <FiltersRow />
        </CardHeader>

        <CardContent>
          {!hasInsights && (
            <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-3">
              Showing summary profiles from raw assessment data. Detailed AI insights generate automatically after each submission.
            </p>
          )}

          {visibleProfiles.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No profiles match your filters.</div>
          ) : (
            <div className="overflow-y-auto max-h-[560px] pr-1">
              <ProfilesAccordion profiles={visibleProfiles} allUsers={rawData.allUsers} mode={mode} />
              {totalCount > PAGE_SIZE && (
                <p className="text-sm text-center text-gray-500 mt-3">
                  Showing {PAGE_SIZE} of {totalCount} profiles —{' '}
                  <button className="text-purple-600 hover:underline" onClick={() => setShowModal(true)}>
                    View all
                  </button>
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full profiles modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Leader Insight Profiles ({totalCount})
              </DialogTitle>
            </div>

            {/* Same filters in modal */}
            <FiltersRow />
          </DialogHeader>

          <div className="overflow-y-auto flex-1 pr-1 mt-2">
            {!hasInsights && (
              <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-3">
                Showing summary profiles from raw assessment data.
              </p>
            )}
            {filteredProfiles.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No profiles match your filters.</div>
            ) : (
              <ProfilesAccordion profiles={filteredProfiles} allUsers={rawData.allUsers} mode={mode} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}