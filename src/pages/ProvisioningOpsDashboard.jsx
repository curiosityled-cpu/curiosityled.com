import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, TrendingUp, AlertTriangle, CheckCircle2, Users, Shield, Calendar, ExternalLink } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function ProvisioningOpsDashboard() {
  const { user, isPlatformAdmin, isSuperAdmin } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Filters
  const [dateRange, setDateRange] = useState('7d');
  const [tenantId, setTenantId] = useState('all');
  const [sourceSystem, setSourceSystem] = useState('all');
  const [batchIdSearch, setBatchIdSearch] = useState('');
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    if (isPlatformAdmin || isSuperAdmin) {
      loadTenants();
    }
  }, [isPlatformAdmin, isSuperAdmin]);

  useEffect(() => {
    loadMetrics();
  }, [dateRange, tenantId, sourceSystem, batchIdSearch]);

  const loadTenants = async () => {
    try {
      const allTenants = await base44.entities.Tenant.list();
      setTenants(allTenants);
    } catch (error) {
      console.error('Load tenants error:', error);
    }
  };

  const loadMetrics = async () => {
    try {
      setLoading(true);
      
      // Calculate time range
      const now = new Date();
      let from;
      
      switch (dateRange) {
        case '24h':
          from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      const response = await base44.functions.invoke('provisioningGetOpsMetrics', {
        timeRange: {
          from: from.toISOString(),
          to: now.toISOString()
        },
        tenantId: tenantId !== 'all' ? tenantId : undefined,
        sourceSystem: sourceSystem !== 'all' ? sourceSystem : undefined,
        batchId: batchIdSearch || undefined
      });

      setMetrics(response);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Load metrics error:', error);
      toast.error('Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  if (!isPlatformAdmin && !isSuperAdmin && user?.app_role !== 'Admin Level 2') {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              <p>Admin access required to view provisioning operations dashboard.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const kpis = metrics?.kpis || {};
  const trends = metrics?.trends || {};
  const tables = metrics?.tables || {};
  const aggregates = metrics?.aggregates || {};

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Provisioning Operations</h1>
          <p className="text-gray-600 mt-1">Monitor batch processing, invites, and security metrics</p>
        </div>
        <Button onClick={loadMetrics} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Time Range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isPlatformAdmin && (
              <div>
                <label className="text-sm font-medium mb-2 block">Tenant</label>
                <Select value={tenantId} onValueChange={setTenantId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tenants</SelectItem>
                    {tenants.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Source System</label>
              <Select value={sourceSystem} onValueChange={setSourceSystem}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="WIX">Wix</SelectItem>
                  <SelectItem value="MANUAL">Manual</SelectItem>
                  <SelectItem value="IAM">IAM</SelectItem>
                  <SelectItem value="SCIM">SCIM</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Batch ID (optional)</label>
              <Input
                placeholder="Filter by batch ID..."
                value={batchIdSearch}
                onChange={(e) => setBatchIdSearch(e.target.value)}
              />
            </div>
          </div>

          {lastUpdated && (
            <p className="text-xs text-gray-500 mt-3">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Batches Created</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <span className="text-2xl font-bold">{kpis.batchesCreated || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Apply Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-2xl font-bold">{kpis.applySuccessRate || 0}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Invite Failure Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span className="text-2xl font-bold">{kpis.inviteFailureRate || 0}%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {kpis.inviteFailed || 0} / {(kpis.invitesSent || 0) + (kpis.inviteFailed || 0)} failed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Activation Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  <span className="text-2xl font-bold">{kpis.activationRateApprox || 0}%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {kpis.links || 0} linked / {kpis.invitesSent || 0} invited
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Security Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-600" />
                  <span className="text-2xl font-bold">{kpis.externalRejects || 0}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {kpis.circuitBreakerTrips || 0} circuit breaker trips
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Trend Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Batches Created per Day</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trends.batchesByDay || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Applies per Day by Result</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trends.appliesByDay || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="success" stroke="#10b981" strokeWidth={2} name="Success" />
                    <Line type="monotone" dataKey="partial" stroke="#f59e0b" strokeWidth={2} name="Partial" />
                    <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} name="Failed" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invites & Failures per Day</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trends.invitesByDay || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="invited" stroke="#3b82f6" strokeWidth={2} name="Invited" />
                    <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} name="Failed" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Links & Rejects per Day</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trends.linksByDay || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} name="Links" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Security Rejects Summary */}
          {kpis.externalRejects > 0 && (
            <Card className="mb-6 border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-600" />
                  Security Events ({kpis.externalRejects})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Rejects by Reason</p>
                    <div className="space-y-1">
                      {Object.entries(aggregates.rejectsByReason || {}).map(([reason, count]) => (
                        <div key={reason} className="flex justify-between text-sm">
                          <span className="text-gray-700">{reason}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Top API Keys by Rejects</p>
                    <div className="space-y-1">
                      {Object.entries(aggregates.rejectsByApiKey || {}).slice(0, 5).map(([prefix, count]) => (
                        <div key={prefix} className="flex justify-between text-sm">
                          <span className="text-gray-700 font-mono">{prefix}...</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Drill-down Tables */}
          <div className="space-y-6">
            {/* Recent Batches */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Batches ({tables.recentBatches?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {tables.recentBatches && tables.recentBatches.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Tenant</TableHead>
                        <TableHead>Batch ID</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Valid</TableHead>
                        <TableHead>Invalid</TableHead>
                        <TableHead>Request ID</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tables.recentBatches.map((batch, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs">{new Date(batch.timestamp).toLocaleString()}</TableCell>
                          <TableCell className="text-xs font-mono">{batch.tenant_id?.substring(0, 8)}...</TableCell>
                          <TableCell className="text-xs font-mono">{batch.batch_id?.substring(0, 8)}...</TableCell>
                          <TableCell><Badge variant="outline">{batch.source_system}</Badge></TableCell>
                          <TableCell>{batch.total_rows}</TableCell>
                          <TableCell className="text-green-600">{batch.valid_rows}</TableCell>
                          <TableCell className="text-red-600">{batch.invalid_rows}</TableCell>
                          <TableCell>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(batch.request_id);
                                toast.success('Request ID copied');
                              }}
                              className="text-xs font-mono text-blue-600 hover:underline"
                            >
                              {batch.request_id?.substring(0, 8)}...
                            </button>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(batch.batch_id);
                                  toast.success('Batch ID copied');
                                }}
                                className="text-xs px-2 py-1 hover:bg-gray-100 rounded"
                                title="Copy Batch ID"
                              >
                                Copy
                              </button>
                              <Link to={createPageUrl('ProvisioningBatchDetail') + `?batchId=${batch.batch_id}`}>
                                <Button variant="ghost" size="sm">
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-6">No batches created in selected range</p>
                )}
              </CardContent>
            </Card>

            {/* Apply Issues */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Apply Issues ({tables.applyIssues?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {tables.applyIssues && tables.applyIssues.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Batch ID</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Failed</TableHead>
                        <TableHead>Skipped</TableHead>
                        <TableHead>Circuit Breaker</TableHead>
                        <TableHead>Request ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tables.applyIssues.map((issue, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs">{new Date(issue.timestamp).toLocaleString()}</TableCell>
                          <TableCell>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(issue.batch_id);
                                toast.success('Batch ID copied');
                              }}
                              className="text-xs font-mono text-blue-600 hover:underline"
                            >
                              {issue.batch_id?.substring(0, 8)}...
                            </button>
                          </TableCell>
                          <TableCell>
                            <Badge variant={issue.result === 'PARTIAL' ? 'outline' : 'destructive'}>
                              {issue.result}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-red-600">{issue.failed}</TableCell>
                          <TableCell>{issue.skipped}</TableCell>
                          <TableCell>
                            {issue.circuit_breaker_tripped && (
                              <Badge variant="destructive">TRIPPED</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(issue.request_id);
                                toast.success('Request ID copied');
                              }}
                              className="text-xs font-mono text-blue-600 hover:underline"
                            >
                              {issue.request_id?.substring(0, 8)}...
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-6">No apply issues in selected range ✓</p>
                )}
              </CardContent>
            </Card>

            {/* Invite Issues */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invite Failures ({tables.inviteIssues?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {tables.inviteIssues && tables.inviteIssues.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Batch ID</TableHead>
                        <TableHead>Invited</TableHead>
                        <TableHead>Failed</TableHead>
                        <TableHead>Result</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tables.inviteIssues.map((issue, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs">{new Date(issue.timestamp).toLocaleString()}</TableCell>
                          <TableCell className="text-xs font-mono">{issue.batch_id?.substring(0, 8)}...</TableCell>
                          <TableCell className="text-green-600">{issue.invited_count}</TableCell>
                          <TableCell className="text-red-600">{issue.failed_count}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{issue.result}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-6">No invite failures in selected range ✓</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Links */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent User Links ({tables.recentLinks?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {tables.recentLinks && tables.recentLinks.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Base44 User ID</TableHead>
                        <TableHead>Source</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tables.recentLinks.map((link, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs">{new Date(link.timestamp).toLocaleString()}</TableCell>
                          <TableCell className="text-sm">{link.email}</TableCell>
                          <TableCell className="text-xs font-mono">{link.base44_user_id?.substring(0, 12)}...</TableCell>
                          <TableCell><Badge variant="outline">{link.source_system}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-6">No user links in selected range</p>
                )}
              </CardContent>
            </Card>

            {/* Security Rejects Detail */}
            {tables.rejects && tables.rejects.length > 0 && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="w-5 h-5 text-red-600" />
                    Security Rejections ({tables.rejects.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Endpoint</TableHead>
                        <TableHead>API Key Prefix</TableHead>
                        <TableHead>Request ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tables.rejects.map((reject, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs">{new Date(reject.timestamp).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">{reject.reason}</Badge>
                          </TableCell>
                          <TableCell className="text-xs">{reject.endpoint_key}</TableCell>
                          <TableCell className="text-xs font-mono">{reject.api_key_prefix || 'N/A'}</TableCell>
                          <TableCell className="text-xs font-mono">{reject.request_id?.substring(0, 8)}...</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}