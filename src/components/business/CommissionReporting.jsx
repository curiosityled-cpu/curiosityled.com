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
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area
} from "recharts";
import {
  FileDown,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Loader2,
  BarChart3,
  PieChart as PieChartIcon,
  AlertTriangle
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { motion } from "framer-motion";

export default function CommissionReporting() {
  const [loading, setLoading] = useState(false);
  const [partners, setPartners] = useState([]);
  const [activeReport, setActiveReport] = useState('partner_performance');
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(subMonths(new Date(), 11)), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [selectedPartner, setSelectedPartner] = useState('all');
  const [includeDetails, setIncludeDetails] = useState(false);

  useEffect(() => {
    loadPartners();
  }, []);

  useEffect(() => {
    if (activeReport) {
      loadReportData();
    }
  }, [activeReport, dateRange, selectedPartner]);

  const loadPartners = async () => {
    try {
      const allPartners = await base44.entities.Partner.list('-created_date');
      setPartners(allPartners || []);
    } catch (error) {
      console.error('Error loading partners:', error);
    }
  };

  const loadReportData = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('generateCommissionReport', {
        reportType: activeReport,
        partnerId: selectedPartner !== 'all' ? selectedPartner : null,
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
        format: 'json',
        includeDetails
      });

      if (response.data?.success) {
        setReportData(response.data.report);
      }
    } catch (error) {
      console.error('Error loading report:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await base44.functions.invoke('generateCommissionReport', {
        reportType: activeReport,
        partnerId: selectedPartner !== 'all' ? selectedPartner : null,
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
        format: 'csv',
        includeDetails: true
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeReport}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  };

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Commission Reports</h2>
              <p className="text-sm text-gray-600">Comprehensive analytics and reporting</p>
            </div>
            <Button onClick={handleExportCSV} className="bg-green-600 hover:bg-green-700">
              <FileDown className="w-4 h-4 mr-2" />
              Export to CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Partner</label>
              <Select value={selectedPartner} onValueChange={setSelectedPartner}>
                <SelectTrigger>
                  <SelectValue placeholder="Select partner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Partners</SelectItem>
                  {partners.map(partner => (
                    <SelectItem key={partner.id} value={partner.id}>
                      {partner.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">From Date</label>
              <Input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">To Date</label>
              <Input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
              />
            </div>

            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDateRange({
                  from: format(startOfMonth(subMonths(new Date(), 11)), 'yyyy-MM-dd'),
                  to: format(endOfMonth(new Date()), 'yyyy-MM-dd')
                })}
              >
                Last 12 Months
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Tabs value={activeReport} onValueChange={setActiveReport}>
        <TabsList className="grid w-full grid-cols-4 max-w-3xl">
          <TabsTrigger value="partner_performance">
            <Users className="w-4 h-4 mr-2" />
            Partner Performance
          </TabsTrigger>
          <TabsTrigger value="liability_analysis">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Liability Analysis
          </TabsTrigger>
          <TabsTrigger value="payout_trends">
            <TrendingUp className="w-4 h-4 mr-2" />
            Payout Trends
          </TabsTrigger>
          <TabsTrigger value="client_analysis">
            <BarChart3 className="w-4 h-4 mr-2" />
            Client Analysis
          </TabsTrigger>
        </TabsList>

        {loading && (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
            <p className="text-sm text-gray-600">Loading report data...</p>
          </div>
        )}

        {/* Partner Performance Report */}
        <TabsContent value="partner_performance" className="mt-6 space-y-6">
          {reportData && !loading && (
            <>
              <div className="grid md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <Users className="w-5 h-5 text-blue-600 mb-2" />
                    <p className="text-2xl font-bold">{reportData.summary?.total_partners || 0}</p>
                    <p className="text-xs text-gray-600">Active Partners</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <DollarSign className="w-5 h-5 text-green-600 mb-2" />
                    <p className="text-2xl font-bold">
                      ${((reportData.summary?.total_earned || 0) / 100).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600">Total Earned</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <TrendingUp className="w-5 h-5 text-purple-600 mb-2" />
                    <p className="text-2xl font-bold">
                      ${((reportData.summary?.total_paid || 0) / 100).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600">Total Paid</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mb-2" />
                    <p className="text-2xl font-bold">
                      ${((reportData.summary?.total_pending || 0) / 100).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600">Total Pending</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Partner Performance Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={reportData.partners?.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="partner_name" angle={-45} textAnchor="end" height={120} />
                      <YAxis tickFormatter={(value) => `$${(value / 100).toFixed(0)}`} />
                      <RechartsTooltip formatter={(value) => `$${(value / 100).toFixed(2)}`} />
                      <Legend />
                      <Bar dataKey="total_earned" fill="#3b82f6" name="Earned" />
                      <Bar dataKey="total_paid" fill="#10b981" name="Paid" />
                      <Bar dataKey="total_pending" fill="#f59e0b" name="Pending" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Detailed Partner Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead>Partner</TableHead>
                        <TableHead>Earned</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Pending</TableHead>
                        <TableHead>Commissions</TableHead>
                        <TableHead>Clients</TableHead>
                        <TableHead>Avg Commission</TableHead>
                        <TableHead>Conversion</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.partners?.map((partner, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{partner.partner_name}</TableCell>
                          <TableCell className="font-semibold text-blue-600">
                            ${((partner.total_earned || 0) / 100).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-green-600">
                            ${((partner.total_paid || 0) / 100).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-yellow-600">
                            ${((partner.total_pending || 0) / 100).toFixed(2)}
                          </TableCell>
                          <TableCell>{partner.commission_count}</TableCell>
                          <TableCell>{partner.client_count}</TableCell>
                          <TableCell>${((partner.avg_commission || 0) / 100).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {(partner.conversion_rate || 0).toFixed(1)}%
                            </Badge>
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

        {/* Liability Analysis Report */}
        <TabsContent value="liability_analysis" className="mt-6 space-y-6">
          {reportData && !loading && (
            <>
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <AlertTriangle className="w-5 h-5 text-red-600 mb-2" />
                    <p className="text-2xl font-bold text-red-600">
                      ${((reportData.current_liability || 0) / 100).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600">Current Liability</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <TrendingUp className="w-5 h-5 text-blue-600 mb-2" />
                    <p className="text-2xl font-bold">
                      ${((reportData.summary?.total_new || 0) / 100).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600">New Commissions</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <DollarSign className="w-5 h-5 text-green-600 mb-2" />
                    <p className="text-2xl font-bold">
                      ${((reportData.summary?.total_paid || 0) / 100).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600">Payments Made</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Liability Trend Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={reportData.monthly_liability}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `$${(value / 100).toFixed(0)}`} />
                      <RechartsTooltip formatter={(value) => `$${(value / 100).toFixed(2)}`} />
                      <Legend />
                      <Area type="monotone" dataKey="closing_liability" stroke="#ef4444" fill="#fecaca" name="Closing Liability" />
                      <Area type="monotone" dataKey="new_commissions" stroke="#3b82f6" fill="#bfdbfe" name="New Commissions" />
                      <Area type="monotone" dataKey="payments_made" stroke="#10b981" fill="#a7f3d0" name="Payments Made" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Monthly Liability Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Opening</TableHead>
                        <TableHead>New</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Closing</TableHead>
                        <TableHead>Pending</TableHead>
                        <TableHead>Approved</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.monthly_liability?.map((month, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{month.month}</TableCell>
                          <TableCell>${((month.opening_liability || 0) / 100).toFixed(2)}</TableCell>
                          <TableCell className="text-blue-600">
                            ${((month.new_commissions || 0) / 100).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-green-600">
                            ${((month.payments_made || 0) / 100).toFixed(2)}
                          </TableCell>
                          <TableCell className="font-semibold text-red-600">
                            ${((month.closing_liability || 0) / 100).toFixed(2)}
                          </TableCell>
                          <TableCell>{month.pending_count}</TableCell>
                          <TableCell>{month.approved_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Payout Trends Report */}
        <TabsContent value="payout_trends" className="mt-6 space-y-6">
          {reportData && !loading && (
            <>
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <DollarSign className="w-5 h-5 text-green-600 mb-2" />
                    <p className="text-2xl font-bold">
                      ${((reportData.summary?.total_paid || 0) / 100).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600">Total Payouts</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <BarChart3 className="w-5 h-5 text-blue-600 mb-2" />
                    <p className="text-2xl font-bold">{reportData.summary?.total_payouts || 0}</p>
                    <p className="text-xs text-gray-600">Payout Transactions</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <Users className="w-5 h-5 text-purple-600 mb-2" />
                    <p className="text-2xl font-bold">{reportData.summary?.unique_partners || 0}</p>
                    <p className="text-xs text-gray-600">Partners Paid</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Monthly Payout Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={reportData.monthly_payouts}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `$${(value / 100).toFixed(0)}`} />
                      <RechartsTooltip formatter={(value) => `$${(value / 100).toFixed(2)}`} />
                      <Legend />
                      <Line type="monotone" dataKey="total_paid" stroke="#10b981" strokeWidth={2} name="Total Paid" />
                      <Line type="monotone" dataKey="avg_payout" stroke="#3b82f6" strokeWidth={2} name="Avg Payout" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Partner Payout History</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead>Partner</TableHead>
                        <TableHead>Total Paid</TableHead>
                        <TableHead>Payouts</TableHead>
                        <TableHead>Avg Payout</TableHead>
                        <TableHead>Last Payout</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.partner_payouts?.map((partner, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{partner.partner_name}</TableCell>
                          <TableCell className="font-semibold text-green-600">
                            ${((partner.total_paid || 0) / 100).toFixed(2)}
                          </TableCell>
                          <TableCell>{partner.payout_count}</TableCell>
                          <TableCell>
                            ${((partner.total_paid / partner.payout_count) / 100).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {partner.last_payout_date 
                              ? format(new Date(partner.last_payout_date), 'MMM d, yyyy')
                              : '-'
                            }
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

        {/* Client Analysis Report */}
        <TabsContent value="client_analysis" className="mt-6 space-y-6">
          {reportData && !loading && (
            <>
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <Users className="w-5 h-5 text-blue-600 mb-2" />
                    <p className="text-2xl font-bold">{reportData.summary?.total_clients || 0}</p>
                    <p className="text-xs text-gray-600">Total Clients</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <DollarSign className="w-5 h-5 text-green-600 mb-2" />
                    <p className="text-2xl font-bold">
                      ${((reportData.summary?.total_commissions || 0) / 100).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600">Total Commissions</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <BarChart3 className="w-5 h-5 text-purple-600 mb-2" />
                    <p className="text-2xl font-bold">
                      ${((reportData.summary?.avg_per_client || 0) / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-600">Avg per Client</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Top Clients by Commission Volume</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={reportData.clients?.slice(0, 15)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="client_name" angle={-45} textAnchor="end" height={120} />
                      <YAxis tickFormatter={(value) => `$${(value / 100).toFixed(0)}`} />
                      <RechartsTooltip formatter={(value) => `$${(value / 100).toFixed(2)}`} />
                      <Bar dataKey="total_commissions" fill="#3b82f6" name="Total Commissions" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Client Performance Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Partner</TableHead>
                        <TableHead>Total Commissions</TableHead>
                        <TableHead>Count</TableHead>
                        <TableHead>Avg Commission</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.clients?.map((client, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{client.client_name}</TableCell>
                          <TableCell>{client.partner_name}</TableCell>
                          <TableCell className="font-semibold text-blue-600">
                            ${((client.total_commissions || 0) / 100).toFixed(2)}
                          </TableCell>
                          <TableCell>{client.commission_count}</TableCell>
                          <TableCell>${((client.avg_commission || 0) / 100).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}