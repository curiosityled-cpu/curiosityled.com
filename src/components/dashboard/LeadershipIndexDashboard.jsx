import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X, Loader2, RefreshCw, FileDown, Calendar as CalendarIcon, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { format, subDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
// Import analytics components
import LeadershipIndexSummaryCards from "@/components/analytics/LeadershipIndexSummaryCards";
import CustomizableSpiderChart from "@/components/analytics/CustomizableSpiderChart";
import PlatformHealthPanel from "@/components/analytics/PlatformHealthPanel";
import IndustryPerformanceTable from "@/components/analytics/IndustryPerformanceTable";
import DivisionPerformanceTable from "@/components/analytics/DivisionPerformanceTable";
import LeadershipIndexTrends from "@/components/analytics/LeadershipIndexTrends";
import BusinessGoalTrends from "@/components/analytics/BusinessGoalTrends";
import CompetencyTrendsHeatmap from "@/components/analytics/CompetencyTrendsHeatmap";

export default function LeadershipIndexDashboard() {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [data, setData] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({
    partnerId: 'all',
    clientId: 'all',
    industry: 'all',
    timeframe: '6months'
  });

  const [showCustomDateDialog, setShowCustomDateDialog] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({ from: null, to: null });
  const [appliedCustomDateRange, setAppliedCustomDateRange] = useState({ from: null, to: null });

  // Selected competencies for spider chart (synced with trends)
  const [selectedCompetencies, setSelectedCompetencies] = useState([
    'Situational Intelligence',
    'Decision Making',
    'Communication',
    'Resource Management',
    'Stakeholder Management',
    'Performance Management'
  ]);

  // Separate timeframe for trends charts (Leadership Competency Trends & Business Goal Trends)
  const [trendsTimeframe, setTrendsTimeframe] = useState('6months');
  const [showTrendsCustomDateDialog, setShowTrendsCustomDateDialog] = useState(false);
  const [trendsCustomDateRange, setTrendsCustomDateRange] = useState({ from: null, to: null });
  const [appliedTrendsCustomDateRange, setAppliedTrendsCustomDateRange] = useState({ from: null, to: null });

  useEffect(() => {
    loadData();
  }, [filters.partnerId, filters.clientId, filters.industry, filters.timeframe, appliedCustomDateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {
        partnerId: filters.partnerId,
        clientId: filters.clientId,
        industry: filters.industry,
        timeframe: filters.timeframe
      };

      if (filters.timeframe === 'custom' && appliedCustomDateRange.from && appliedCustomDateRange.to) {
        params.startDate = appliedCustomDateRange.from.toISOString();
        params.endDate = appliedCustomDateRange.to.toISOString();
      }

      const response = await base44.functions.invoke('getLeadershipIndexAnalytics', params);
      
      if (response.data?.success) {
        setData(response.data.data);
      } else {
        toast.error('Failed to load analytics data');
      }
    } catch (error) {
      console.error('Error loading Leadership Index data:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const response = await base44.functions.invoke('exportPlatformAnalyticsPDF', {
        stats: data?.metrics,
        timeRange: filters.timeframe
      });
      
      if (response.data) {
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leadership-index-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success('PDF exported');
      }
    } catch (error) {
      toast.error('Failed to export PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleTimeRangeChange = (value) => {
    if (value === 'custom') {
      setShowCustomDateDialog(true);
    } else {
      setFilters(prev => ({ ...prev, timeframe: value }));
      setCustomDateRange({ from: null, to: null });
      setAppliedCustomDateRange({ from: null, to: null });
    }
  };

  const handleApplyCustomRange = () => {
    if (customDateRange.from && customDateRange.to) {
      setAppliedCustomDateRange(customDateRange);
      setFilters(prev => ({ ...prev, timeframe: 'custom' }));
      setShowCustomDateDialog(false);
    } else {
      toast.error('Please select both dates');
    }
  };

  const handleCancelCustomRange = () => {
    setShowCustomDateDialog(false);
    if (!appliedCustomDateRange.from) {
      setFilters(prev => ({ ...prev, timeframe: '6months' }));
    }
    setCustomDateRange(appliedCustomDateRange);
  };

  const setQuickRange = (days) => {
    setCustomDateRange({ from: subDays(new Date(), days), to: new Date() });
  };

  const clearAllFilters = () => {
    setFilters({
      partnerId: 'all',
      clientId: 'all',
      industry: 'all',
      timeframe: '6months'
    });
    setCustomDateRange({ from: null, to: null });
    setAppliedCustomDateRange({ from: null, to: null });
  };

  const anyFilterActive = 
    filters.partnerId !== 'all' || 
    filters.clientId !== 'all' || 
    filters.industry !== 'all' || 
    filters.timeframe !== '6months';

  // Get available clients based on selected partner
  const availableClients = data?.filterOptions?.clients?.filter(c => 
    filters.partnerId === 'all' || c.partnerId === filters.partnerId
  ) || [];

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#0202ff' }} />
          <p className="text-gray-600">Loading Leadership Index...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>

            {/* Partner Filter */}
            <Select 
              value={filters.partnerId} 
              onValueChange={(val) => setFilters(prev => ({ ...prev, partnerId: val, clientId: 'all' }))}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Partners" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Partners</SelectItem>
                <SelectItem value="none">No Partner (Direct)</SelectItem>
                {data?.filterOptions?.partners?.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Client Filter */}
            <Select 
              value={filters.clientId} 
              onValueChange={(val) => setFilters(prev => ({ ...prev, clientId: val }))}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {availableClients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Industry Filter */}
            <Select 
              value={filters.industry} 
              onValueChange={(val) => setFilters(prev => ({ ...prev, industry: val }))}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Industries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                <SelectItem value="Healthcare">Healthcare</SelectItem>
                <SelectItem value="Technology">Technology</SelectItem>
                <SelectItem value="Finance">Finance</SelectItem>
                <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                <SelectItem value="Retail">Retail</SelectItem>
                <SelectItem value="Education">Education</SelectItem>
                <SelectItem value="Government">Government</SelectItem>
                <SelectItem value="Non-Profit">Non-Profit</SelectItem>
                <SelectItem value="Professional Services">Professional Services</SelectItem>
                <SelectItem value="Energy">Energy</SelectItem>
                <SelectItem value="Real Estate">Real Estate</SelectItem>
                <SelectItem value="Transportation">Transportation</SelectItem>
                <SelectItem value="Hospitality">Hospitality</SelectItem>
                <SelectItem value="Media & Entertainment">Media & Entertainment</SelectItem>
                <SelectItem value="Telecommunications">Telecommunications</SelectItem>
              </SelectContent>
            </Select>

            {/* Time Range */}
            <Select value={filters.timeframe} onValueChange={handleTimeRangeChange}>
              <SelectTrigger className="w-44">
                {filters.timeframe === 'custom' && appliedCustomDateRange.from ? (
                  <span className="text-sm">
                    {format(appliedCustomDateRange.from, 'MMM d')} - {format(appliedCustomDateRange.to, 'MMM d')}
                  </span>
                ) : (
                  <SelectValue />
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="12months">Last 12 Months</SelectItem>
                <SelectItem value="24months">Last 24 Months</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="custom">Custom Range...</SelectItem>
              </SelectContent>
            </Select>

            {anyFilterActive && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                <X className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <LeadershipIndexSummaryCards 
        metrics={data?.metrics} 
        onCardClick={(id) => console.log('Card clicked:', id)}
      />

      {/* Spider Chart + Platform Health */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CustomizableSpiderChart 
            competencyAverages={data?.competencyAverages}
            onSelectionChange={setSelectedCompetencies}
          />
        </div>
        <div>
          <PlatformHealthPanel 
            healthItems={data?.platformHealth}
            onActionClick={(item) => console.log('Action:', item)}
          />
        </div>
      </div>

      {/* Industry Performance */}
      <IndustryPerformanceTable 
        data={data?.industryPerformance}
        onRowClick={(row) => console.log('Industry clicked:', row)}
      />

      {/* Division Performance */}
      <DivisionPerformanceTable 
        divisions={data?.divisionPerformance?.map(d => ({
          name: d.name,
          avgScore: d.avgSI,
          leaders: [],
          readyNow: d.readyNow,
          highPotential: d.highPotential,
          atRisk: d.atRisk
        }))}
        onDivisionClick={(div) => console.log('Division:', div)}
        onCellClick={(div, type) => console.log('Cell:', div, type)}
      />

      {/* Leadership Trends */}
      <LeadershipIndexTrends 
        trendData={data?.trendData}
        selectedCompetencies={selectedCompetencies}
        timeRange={trendsTimeframe}
        onTimeRangeChange={setTrendsTimeframe}
        onCustomRangeClick={() => setShowTrendsCustomDateDialog(true)}
        customRangeLabel={appliedTrendsCustomDateRange.from && appliedTrendsCustomDateRange.to 
          ? `${format(appliedTrendsCustomDateRange.from, 'MMM d')} - ${format(appliedTrendsCustomDateRange.to, 'MMM d')}`
          : null
        }
      />

      {/* Business Goal Trends */}
      <BusinessGoalTrends goalData={data?.goalTrends} timeRange={trendsTimeframe} />

      {/* All Competencies Heatmap & Table */}
      <CompetencyTrendsHeatmap 
        competencyData={data?.allCompetencyTrends}
        timeRange={trendsTimeframe}
        onTimeRangeChange={setTrendsTimeframe}
        onCustomRangeClick={() => setShowTrendsCustomDateDialog(true)}
        customRangeLabel={appliedTrendsCustomDateRange.from && appliedTrendsCustomDateRange.to 
          ? `${format(appliedTrendsCustomDateRange.from, 'MMM d')} - ${format(appliedTrendsCustomDateRange.to, 'MMM d')}`
          : null
        }
      />

      {/* Trends Custom Date Dialog */}
      <Dialog open={showTrendsCustomDateDialog} onOpenChange={(open) => {
        if (!open) {
          setShowTrendsCustomDateDialog(false);
          if (!appliedTrendsCustomDateRange.from) {
            setTrendsTimeframe('6months');
          }
          setTrendsCustomDateRange(appliedTrendsCustomDateRange);
        }
      }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Select Custom Date Range for Trends</DialogTitle>
          </DialogHeader>

          <div className="flex flex-wrap gap-2 py-2 border-b">
            {[7, 14, 30, 60, 90].map(days => (
              <Button key={days} variant="outline" size="sm" onClick={() => setTrendsCustomDateRange({ from: subDays(new Date(), days), to: new Date() })}>
                Last {days} Days
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6 py-4">
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <CalendarIcon className="w-4 h-4" /> From
              </label>
              <Calendar
                mode="single"
                selected={trendsCustomDateRange.from}
                onSelect={(date) => setTrendsCustomDateRange(prev => ({ ...prev, from: date }))}
                disabled={(date) => date > new Date()}
                className="rounded-lg border"
              />
            </div>
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <CalendarIcon className="w-4 h-4" /> To
              </label>
              <Calendar
                mode="single"
                selected={trendsCustomDateRange.to}
                onSelect={(date) => setTrendsCustomDateRange(prev => ({ ...prev, to: date }))}
                disabled={(date) => date > new Date() || (trendsCustomDateRange.from && date < trendsCustomDateRange.from)}
                className="rounded-lg border"
              />
            </div>
          </div>

          {trendsCustomDateRange.from && trendsCustomDateRange.to && (
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'rgba(2,2,255,0.05)' }}>
              <p className="text-sm font-medium" style={{ color: '#0202ff' }}>
                {format(trendsCustomDateRange.from, 'MMM d, yyyy')} - {format(trendsCustomDateRange.to, 'MMM d, yyyy')}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowTrendsCustomDateDialog(false);
              if (!appliedTrendsCustomDateRange.from) {
                setTrendsTimeframe('6months');
              }
              setTrendsCustomDateRange(appliedTrendsCustomDateRange);
            }}>Cancel</Button>
            <Button 
              onClick={() => {
                if (trendsCustomDateRange.from && trendsCustomDateRange.to) {
                  setAppliedTrendsCustomDateRange(trendsCustomDateRange);
                  setTrendsTimeframe('custom');
                  setShowTrendsCustomDateDialog(false);
                } else {
                  toast.error('Please select both dates');
                }
              }}
              disabled={!trendsCustomDateRange.from || !trendsCustomDateRange.to}
              style={{ backgroundColor: '#0202ff' }}
              className="text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Date Dialog */}
      <Dialog open={showCustomDateDialog} onOpenChange={(open) => !open && handleCancelCustomRange()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Select Custom Date Range</DialogTitle>
          </DialogHeader>

          <div className="flex flex-wrap gap-2 py-2 border-b">
            {[7, 14, 30, 60, 90].map(days => (
              <Button key={days} variant="outline" size="sm" onClick={() => setQuickRange(days)}>
                Last {days} Days
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6 py-4">
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <CalendarIcon className="w-4 h-4" /> From
              </label>
              <Calendar
                mode="single"
                selected={customDateRange.from}
                onSelect={(date) => setCustomDateRange(prev => ({ ...prev, from: date }))}
                disabled={(date) => date > new Date()}
                className="rounded-lg border"
              />
            </div>
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <CalendarIcon className="w-4 h-4" /> To
              </label>
              <Calendar
                mode="single"
                selected={customDateRange.to}
                onSelect={(date) => setCustomDateRange(prev => ({ ...prev, to: date }))}
                disabled={(date) => date > new Date() || (customDateRange.from && date < customDateRange.from)}
                className="rounded-lg border"
              />
            </div>
          </div>

          {customDateRange.from && customDateRange.to && (
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'rgba(2,2,255,0.05)' }}>
              <p className="text-sm font-medium" style={{ color: '#0202ff' }}>
                {format(customDateRange.from, 'MMM d, yyyy')} - {format(customDateRange.to, 'MMM d, yyyy')}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelCustomRange}>Cancel</Button>
            <Button 
              onClick={handleApplyCustomRange}
              disabled={!customDateRange.from || !customDateRange.to}
              style={{ backgroundColor: '#0202ff' }}
              className="text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}