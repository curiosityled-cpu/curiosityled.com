
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  Download,
  Filter,
  AlertTriangle,
  Loader2,
  Check,
  CreditCard,
  FileDown,
  Mail
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "framer-motion";

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b'];

export default function CommissionManagement() {
  const [commissions, setCommissions] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCommissions, setSelectedCommissions] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    partner: 'all',
    dateFrom: '',
    dateTo: ''
  });
  const [processing, setProcessing] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('pending');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Use backend function to get commission data with proper permissions
      const [commissionsResponse, allPartners] = await Promise.all([
        base44.functions.invoke('getPartnerCommissions', { 
          status: 'all',
          partnerId: null 
        }),
        base44.entities.Partner.list('-created_date')
      ]);

      setCommissions(commissionsResponse.data?.commissions || []);
      setPartners(allPartners || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load commission data');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedCommissions.length === 0) {
      toast.error('No commissions selected');
      return;
    }

    if (!confirm(`Approve ${selectedCommissions.length} commissions?`)) return;

    setProcessing(true);
    try {
      const response = await base44.functions.invoke('approveCommissions', {
        commissionIds: selectedCommissions
      });

      if (response.data?.success) {
        const { successful, failed } = response.data.results;
        toast.success(`Approved ${successful.length} commissions`);
        if (failed.length > 0) {
          toast.warning(`${failed.length} commissions failed`);
        }
        setSelectedCommissions([]);
        await loadData();
      }
    } catch (error) {
      console.error('Error approving commissions:', error);
      toast.error('Failed to approve commissions');
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessPayout = async (partnerId) => {
    const partnerCommissions = commissions.filter(
      c => c.partner_id === partnerId && c.status === 'approved'
    );

    if (partnerCommissions.length === 0) {
      toast.error('No approved commissions for this partner');
      return;
    }

    const totalAmount = partnerCommissions.reduce((sum, c) => sum + c.commission_amount, 0);

    if (!confirm(`Process payout of $${(totalAmount / 100).toFixed(2)} for ${partnerCommissions[0].partner_name}?`)) {
      return;
    }

    setProcessing(true);
    try {
      const response = await base44.functions.invoke('processCommissionPayouts', {
        partnerId,
        commissionIds: partnerCommissions.map(c => c.id),
        paymentMethod: 'manual'
      });

      if (response.data?.success) {
        toast.success(response.data.message);
        await loadData();
      } else {
        toast.error(response.data?.error || 'Payout failed');
      }
    } catch (error) {
      console.error('Error processing payout:', error);
      toast.error('Failed to process payout');
    } finally {
      setProcessing(false);
    }
  };

  const handleExportCSV = (data, filename) => {
    const csvData = data.map(c => ({
      'Date': format(new Date(c.invoice_date || c.created_date), 'yyyy-MM-dd'),
      'Partner': c.partner_name || '-',
      'Client': c.client_name || '-',
      'Invoice ID': c.stripe_invoice_id || '-',
      'Base Amount': `$${((c.base_amount || 0) / 100).toFixed(2)}`,
      'Rate': `${c.commission_rate}%`,
      'Commission': `$${((c.commission_amount || 0) / 100).toFixed(2)}`,
      'Status': c.status,
      'Approved By': c.approved_by || '-',
      'Payment Date': c.payment_date ? format(new Date(c.payment_date), 'yyyy-MM-dd') : '-'
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
    a.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Export completed');
  };

  const getFilteredCommissions = () => {
    let filtered = [...commissions];

    if (filters.status !== 'all') {
      filtered = filtered.filter(c => c.status === filters.status);
    }

    if (filters.partner !== 'all') {
      filtered = filtered.filter(c => c.partner_id === filters.partner);
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
      .filter(c => c.status === 'pending')
      .reduce((sum, c) => sum + (c.commission_amount || 0), 0);

    const approved = commissions
      .filter(c => c.status === 'approved')
      .reduce((sum, c) => sum + (c.commission_amount || 0), 0);

    const paid = commissions
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + (c.commission_amount || 0), 0);

    const totalLiability = pending + approved;

    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const thisMonth = commissions
      .filter(c => {
        const date = new Date(c.invoice_date || c.created_date);
        return date >= thisMonthStart;
      })
      .reduce((sum, c) => sum + (c.commission_amount || 0), 0);

    return { pending, approved, paid, totalLiability, thisMonth };
  };

  const getPartnerStats = () => {
    const stats = {};
    
    commissions.forEach(c => {
      if (!stats[c.partner_id]) {
        stats[c.partner_id] = {
          partner_name: c.partner_name,
          pending: 0,
          approved: 0,
          paid: 0,
          count: 0
        };
      }

      stats[c.partner_id].count++;

      if (c.status === 'pending') {
        stats[c.partner_id].pending += c.commission_amount;
      } else if (c.status === 'approved') {
        stats[c.partner_id].approved += c.commission_amount;
      } else if (c.status === 'paid') {
        stats[c.partner_id].paid += c.commission_amount;
      }
    });

    return Object.values(stats);
  };

  const getMonthlyTrends = () => {
    const monthlyData = {};
    
    commissions.forEach(c => {
      const date = new Date(c.invoice_date || c.created_date);
      const monthKey = format(date, 'MMM yyyy');
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, earned: 0, paid: 0 };
      }
      
      if (c.status === 'paid') {
        monthlyData[monthKey].paid += (c.commission_amount || 0) / 100;
      }
      monthlyData[monthKey].earned += (c.commission_amount || 0) / 100;
    });

    return Object.values(monthlyData).slice(-12);
  };

  const handleSelectAll = (checked) => {
    const filteredData = getFilteredCommissions().filter(c => c.status === 'pending');
    setSelectedCommissions(checked ? filteredData.map(c => c.id) : []);
  };

  const handleSelectCommission = (id, checked) => {
    setSelectedCommissions(prev =>
      checked ? [...prev, id] : prev.filter(cId => cId !== id)
    );
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

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
        <p className="text-sm text-gray-600">Loading commission data...</p>
      </div>
    );
  }

  const stats = calculateStats();
  const partnerStats = getPartnerStats();
  const monthlyTrends = getMonthlyTrends();
  const filteredCommissions = getFilteredCommissions();
  const pendingCommissions = filteredCommissions.filter(c => c.status === 'pending');
  const approvedCommissions = filteredCommissions.filter(c => c.status === 'approved');

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card className="border-2 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <Badge className="bg-yellow-100 text-yellow-800">
                {commissions.filter(c => c.status === 'pending').length}
              </Badge>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${(stats.pending / 100).toLocaleString()}
            </p>
            <p className="text-xs text-gray-600">Pending Approval</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <Badge className="bg-blue-100 text-blue-800">
                {commissions.filter(c => c.status === 'approved').length}
              </Badge>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${(stats.approved / 100).toLocaleString()}
            </p>
            <p className="text-xs text-gray-600">Approved (Unpaid)</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${(stats.totalLiability / 100).toLocaleString()}
            </p>
            <p className="text-xs text-gray-600">Total Liability</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${(stats.thisMonth / 100).toLocaleString()}
            </p>
            <p className="text-xs text-gray-600">This Month</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${(stats.paid / 100).toLocaleString()}
            </p>
            <p className="text-xs text-gray-600">Total Paid</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Monthly Commission Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Line type="monotone" dataKey="earned" stroke="#f97316" name="Earned" strokeWidth={2} />
                <Line type="monotone" dataKey="paid" stroke="#10b981" name="Paid" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Commissions by Partner</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={partnerStats.slice(0, 6)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ partner_name, count }) => `${partner_name}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {partnerStats.slice(0, 6).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      {selectedCommissions.length > 0 && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className="bg-blue-600 text-white">
                  {selectedCommissions.length} commissions selected
                </Badge>
                <span className="text-sm text-blue-900">
                  Total: ${(
                    commissions
                      .filter(c => selectedCommissions.includes(c.id))
                      .reduce((sum, c) => sum + c.commission_amount, 0) / 100
                  ).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleBulkApprove}
                  disabled={processing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {processing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Approve Selected
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedCommissions([])}
                >
                  Clear
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Commission Tables */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="pending">
            Pending ({pendingCommissions.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedCommissions.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All History ({filteredCommissions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Pending Commissions</CardTitle>
                <div className="flex gap-2">
                  {pendingCommissions.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedCommissions.length > 0 && selectedCommissions.length === pendingCommissions.length}
                        onCheckedChange={handleSelectAll}
                      />
                      <span className="text-sm text-gray-600">Select All</span>
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExportCSV(pendingCommissions, 'pending-commissions')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Base Amount</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingCommissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        No pending commissions
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingCommissions.map(commission => (
                      <TableRow key={commission.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedCommissions.includes(commission.id)}
                            onCheckedChange={(checked) => handleSelectCommission(commission.id, checked)}
                          />
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(commission.invoice_date || commission.created_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="font-medium">{commission.partner_name}</TableCell>
                        <TableCell>{commission.client_name}</TableCell>
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
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Approved Commissions (Ready for Payout)</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExportCSV(approvedCommissions, 'approved-commissions')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Group by Partner */}
              {partnerStats
                .filter(ps => ps.approved > 0)
                .map(partnerStat => {
                  const partnerApproved = approvedCommissions.filter(
                    c => c.partner_name === partnerStat.partner_name
                  );

                  return (
                    <div key={partnerStat.partner_name} className="mb-6 border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-lg">{partnerStat.partner_name}</h4>
                          <p className="text-sm text-gray-600">
                            {partnerApproved.length} commissions · ${(partnerStat.approved / 100).toFixed(2)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleProcessPayout(partnerApproved[0].partner_id)}
                          disabled={processing}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {processing ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <CreditCard className="w-4 h-4 mr-2" />
                          )}
                          Process Payout
                        </Button>
                      </div>
                      <Table>
                        <TableHeader className="bg-gray-50">
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Commission</TableHead>
                            <TableHead>Approved By</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {partnerApproved.map(commission => (
                            <TableRow key={commission.id}>
                              <TableCell className="text-sm">
                                {format(new Date(commission.invoice_date || commission.created_date), 'MMM d')}
                              </TableCell>
                              <TableCell>{commission.client_name}</TableCell>
                              <TableCell className="font-semibold text-green-600">
                                ${((commission.commission_amount || 0) / 100).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {commission.approved_by?.split('@')[0] || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })}

              {approvedCommissions.length === 0 && (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600">No approved commissions pending payout</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">All Commissions</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExportCSV(filteredCommissions, 'all-commissions')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
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
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.partner} onValueChange={(value) => setFilters({...filters, partner: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Partner" />
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
                    <TableHead>Partner</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCommissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No commissions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCommissions.map(commission => (
                      <TableRow key={commission.id}>
                        <TableCell className="text-sm">
                          {format(new Date(commission.invoice_date || commission.created_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="font-medium">{commission.partner_name}</TableCell>
                        <TableCell>{commission.client_name}</TableCell>
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
