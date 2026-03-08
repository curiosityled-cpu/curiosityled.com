
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  Download,
  Filter,
  Calendar,
  Loader2,
  BarChart3,
  Users,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { motion } from "framer-motion";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316'];

export default function CommissionDashboard({ partnerId }) {
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(subMonths(new Date(), 11)), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [comparisonPeriod, setComparisonPeriod] = useState('previous_period');
  const [filters, setFilters] = useState({
    status: 'all',
    client: 'all',
    dateFrom: '',
    dateTo: ''
  });
  const [clients, setClients] = useState([]);

  useEffect(() => {
    if (partnerId) {
      loadData();
      loadAdvancedAnalytics();
    }
  }, [partnerId, dateRange]);

  const loadData = async () => {
    if (!partnerId) return;

    setLoading(true);
    try {
      // Use backend function to get commission data
      const commissionsResponse = await base44.functions.invoke('getPartnerCommissions', {
        partnerId,
        status: 'all'
      });

      setCommissions(commissionsResponse.data?.commissions || []);

      const partnerClients = await base44.entities.Client.filter({
        partner_id: partnerId
      });
      setClients(partnerClients || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load commission data');
    } finally {
      setLoading(false);
    }
  };

  const loadAdvancedAnalytics = async () => {
    if (!partnerId) return;

    try {
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      const daysDiff = Math.floor((toDate - fromDate) / (1000 * 60 * 60 * 24));

      const compareFrom = new Date(fromDate);
      compareFrom.setDate(compareFrom.getDate() - daysDiff - 1);
      const compareTo = new Date(fromDate);
      compareTo.setDate(compareTo.getDate() - 1);

      const response = await base44.functions.invoke('getAdvancedCommissionAnalytics', {
        partnerId,
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
        compareDateFrom: format(compareFrom, 'yyyy-MM-dd'),
        compareDateTo: format(compareTo, 'yyyy-MM-dd'),
        groupBy: 'month'
      });

      if (response.data?.success) {
        setAnalytics(response.data.analytics);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const handleExportCSV = () => {
    const filteredData = getFilteredCommissions();

    const csvData = filteredData.map(c => ({
      'Date': format(new Date(c.invoice_date || c.created_date), 'yyyy-MM-dd'),
      'Client': c.client_name || '-',
      'Invoice ID': c.stripe_invoice_id || '-',
      'Base Amount': `$${((c.base_amount || 0) / 100).toFixed(2)}`,
      'Commission Rate': `${c.commission_rate}%`,
      'Commission Amount': `$${((c.commission_amount || 0) / 100).toFixed(2)}`,
      'Status': c.status,
      'Payment Date': c.payment_date ? format(new Date(c.payment_date), 'yyyy-MM-dd') : 'Pending'
    }));

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commissions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Commission report exported');
  };

  const handleExportReport = async (reportType) => {
    try {
      const response = await base44.functions.invoke('generateCommissionReport', {
        reportType,
        partnerId,
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
        format: 'csv',
        includeDetails: true
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  };

  const getFilteredCommissions = () => {
    let filtered = [...commissions];

    if (filters.status !== 'all') {
      filtered = filtered.filter(c => c.status === filters.status);
    }

    if (filters.client !== 'all') {
      filtered = filtered.filter(c => c.client_id === filters.client);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(c => {
        const date = new Date(c.invoice_date || c.created_date);
        return date >= new Date(filters.dateFrom);
      });
    }

    if (filters.dateTo) {
      filtered = filtered.filter(c => {
        const date = new Date(c.invoice_date || c.created_date);
        return date <= new Date(filters.dateTo);
      });
    }

    return filtered.sort((a, b) => 
      new Date(b.invoice_date || b.created_date) - new Date(a.invoice_date || a.created_date)
    );
  };

  const calculateStats = () => {
    const pending = commissions
      .filter(c => c.status === 'pending' || c.status === 'approved')
      .reduce((sum, c) => sum + (c.commission_amount || 0), 0);

    const paid = commissions
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + (c.commission_amount || 0), 0);

    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const thisMonth = commissions
      .filter(c => {
        const date = new Date(c.invoice_date || c.created_date);
        return date >= thisMonthStart;
      })
      .reduce((sum, c) => sum + (c.commission_amount || 0), 0);

    const paidCommissions = commissions.filter(c => c.status === 'paid' && c.payment_date);
    const lastPayout = paidCommissions.length > 0
      ? paidCommissions.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))[0].payment_date
      : null;

    return {
      totalPending: pending,
      totalPaid: paid,
      thisMonth,
      lastPayout
    };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'disputed': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && !analytics) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-orange-600" />
        <p className="text-sm text-gray-600">Loading commission data...</p>
      </div>
    );
  }

  const stats = calculateStats();
  const filteredCommissions = getFilteredCommissions();

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">Date Range:</span>
            </div>
            <Input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
              className="w-40"
            />
            <span className="text-gray-500">to</span>
            <Input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
              className="w-40"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDateRange({
                from: format(startOfMonth(subMonths(new Date(), 11)), 'yyyy-MM-dd'),
                to: format(endOfMonth(new Date()), 'yyyy-MM-dd')
              })}
            >
              Last 12 Months
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDateRange({
                from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
                to: format(endOfMonth(new Date()), 'yyyy-MM-dd')
              })}
            >
              This Month
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards with Growth Indicators */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              {analytics?.growth && (
                <div className={`flex items-center text-xs ${analytics.growth.earned >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analytics.growth.earned >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {Math.abs(analytics.growth.earned).toFixed(1)}%
                </div>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${(stats.totalPending / 100).toFixed(2)}
            </p>
            <p className="text-xs text-gray-600">Pending Commissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              {analytics?.growth && (
                <div className={`flex items-center text-xs ${analytics.growth.paid >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analytics.growth.paid >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {Math.abs(analytics.growth.paid).toFixed(1)}%
                </div>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${(stats.totalPaid / 100).toFixed(2)}
            </p>
            <p className="text-xs text-gray-600">Total Paid (Lifetime)</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              {analytics?.growth && (
                <div className={`flex items-center text-xs ${analytics.growth.count >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analytics.growth.count >= 0 ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                  {Math.abs(analytics.growth.count).toFixed(1)}%
                </div>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${(stats.thisMonth / 100).toFixed(2)}
            </p>
            <p className="text-xs text-gray-600">This Month's Earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.lastPayout ? format(new Date(stats.lastPayout), 'MMM d') : 'Never'}
            </p>
            <p className="text-xs text-gray-600">Last Payout Date</p>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Analytics Tabs */}
      <Tabs value={activeAnalyticsTab} onValueChange={setActiveAnalyticsTab}>
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="by_client">By Client</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {analytics && (
            <>
              {/* Monthly Trend Chart */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Monthly Commission Trend</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => handleExportReport('partner_performance')}>
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.current_period.grouped}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis tickFormatter={(value) => `$${(value / 100).toFixed(0)}`} />
                      <RechartsTooltip formatter={(value) => `$${(value / 100).toFixed(2)}`} />
                      <Legend />
                      <Line type="monotone" dataKey="earned" stroke="#f97316" name="Earned" strokeWidth={2} />
                      <Line type="monotone" dataKey="paid" stroke="#10b981" name="Paid" strokeWidth={2} />
                      <Line type="monotone" dataKey="pending" stroke="#f59e0b" name="Pending" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Key Insights */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics.insights.conversion_rate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-600">Payout Conversion Rate</p>
                    <p className="text-xs text-gray-500 mt-1">Earned → Paid</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <Clock className="w-5 h-5 text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics.insights.avg_days_to_payment.toFixed(0)} days
                    </p>
                    <p className="text-xs text-gray-600">Avg Time to Payment</p>
                    <p className="text-xs text-gray-500 mt-1">Commission → Payout</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      ${((analytics.current_period.metrics.avg_commission || 0) / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-600">Avg Commission</p>
                    <p className="text-xs text-gray-500 mt-1">Per Transaction</p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* By Client Tab */}
        <TabsContent value="by_client" className="mt-6 space-y-6">
          {analytics && analytics.insights.top_clients.length > 0 && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Performance by Client</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => handleExportReport('client_analysis')}>
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.insights.top_clients.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="client_name" angle={-45} textAnchor="end" height={100} />
                      <YAxis tickFormatter={(value) => `$${(value / 100).toFixed(0)}`} />
                      <RechartsTooltip formatter={(value) => `$${(value / 100).toFixed(2)}`} />
                      <Bar dataKey="earned" fill="#3b82f6" name="Total Earned" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Client Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Commissions</TableHead>
                        <TableHead>Total Earned</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Pending</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.insights.top_clients.map((client, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{client.client_name || 'Unknown'}</TableCell>
                          <TableCell>{client.count}</TableCell>
                          <TableCell className="font-semibold text-orange-600">
                            ${((client.earned || 0) / 100).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-green-600">
                            ${((client.paid || 0) / 100).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-yellow-600">
                            ${((client.pending || 0) / 100).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="mt-6 space-y-6">
          {analytics && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Period Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Total Earned</p>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold">${((analytics.current_period.metrics.total_earned || 0) / 100).toFixed(2)}</span>
                        <div className={`flex items-center text-sm ${analytics.growth.earned >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {analytics.growth.earned >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                          {Math.abs(analytics.growth.earned).toFixed(1)}%
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        vs ${((analytics.comparison_period.metrics.total_earned || 0) / 100).toFixed(2)} previous period
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-2">Total Paid</p>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold">${((analytics.current_period.metrics.total_paid || 0) / 100).toFixed(2)}</span>
                        <div className={`flex items-center text-sm ${analytics.growth.paid >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {analytics.growth.paid >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                          {Math.abs(analytics.growth.paid).toFixed(1)}%
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        vs ${((analytics.comparison_period.metrics.total_paid || 0) / 100).toFixed(2)} previous period
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-2">Commission Count</p>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold">{analytics.current_period.metrics.count}</span>
                        <div className={`flex items-center text-sm ${analytics.growth.count >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {analytics.growth.count >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                          {Math.abs(analytics.growth.count).toFixed(1)}%
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        vs {analytics.comparison_period.metrics.count} previous period
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Earned vs Paid Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.current_period.grouped}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis tickFormatter={(value) => `$${(value / 100).toFixed(0)}`} />
                      <RechartsTooltip formatter={(value) => `$${(value / 100).toFixed(2)}`} />
                      <Legend />
                      <Bar dataKey="earned" fill="#f97316" name="Earned" />
                      <Bar dataKey="paid" fill="#10b981" name="Paid" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Commission History</CardTitle>
                <Button size="sm" variant="outline" onClick={handleExportCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.client} onValueChange={(value) => setFilters({...filters, client: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                  placeholder="From Date"
                />

                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                  placeholder="To Date"
                />
              </div>

              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Base Amount</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCommissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        No commissions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCommissions.map(commission => (
                      <TableRow key={commission.id}>
                        <TableCell>
                          {format(new Date(commission.invoice_date || commission.created_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="font-medium">{commission.client_name || '-'}</TableCell>
                        <TableCell className="text-xs text-gray-600">{commission.stripe_invoice_id || '-'}</TableCell>
                        <TableCell>${((commission.base_amount || 0) / 100).toFixed(2)}</TableCell>
                        <TableCell>{commission.commission_rate}%</TableCell>
                        <TableCell className="font-semibold text-orange-600">
                          ${((commission.commission_amount || 0) / 100).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(commission.status)}>
                            {commission.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {commission.payment_date 
                            ? format(new Date(commission.payment_date), 'MMM d, yyyy')
                            : '-'
                          }
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
