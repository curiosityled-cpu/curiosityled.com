import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  RefreshCw, 
  Play, 
  Mail, 
  Download, 
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";
import { toast } from "sonner";

export default function ProvisioningBatchDetail() {
  const navigate = useNavigate();
  const { user, isPlatformAdmin, isSuperAdmin } = useAuth();
  const [batch, setBatch] = useState(null);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Get batchId from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const batchId = urlParams.get('batchId');
  const tenantId = user?.client_id || 'default';

  useEffect(() => {
    if (batchId) {
      loadBatchDetail();
    }
  }, [batchId]);

  useEffect(() => {
    filterUsers();
  }, [users, statusFilter, searchQuery]);

  const loadBatchDetail = async () => {
    try {
      setLoading(true);
      
      // Note: tenantId is now derived server-side from user.client_id
      const response = await base44.functions.invoke('provisioningGetBatchDetail', {
        batchId,
        tenantId: user?.app_role === 'Platform Admin' ? tenantId : undefined,
        includeUsers: true
      });
      
      if (response.data?.batch) {
        setBatch(response.data.batch);
        setUsers(response.data.users || []);
      }
    } catch (error) {
      console.error('Load batch detail error:', error);
      toast.error(`Failed to load batch details: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(u => u.apply_status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        u.email.toLowerCase().includes(query) ||
        u.first_name.toLowerCase().includes(query) ||
        u.last_name.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  };

  const handleApply = async () => {
    try {
      setApplying(true);
      
      const response = await base44.functions.invoke('provisioningApplyBatch', {
        batchId,
        mode: 'RESUME',
        dryRun: false
      });

      if (response.data) {
        const { results, circuitBreakerTripped } = response.data;
        const summary = `Applied: ${results.profileUpserted} profiles, ${results.failed} failed${results.skipped ? `, ${results.skipped} skipped` : ''}`;
        
        if (results.failed === 0) {
          toast.success(summary);
        } else {
          toast.warning(summary);
        }

        if (circuitBreakerTripped) {
          toast.error('Circuit breaker triggered due to consecutive failures. Check error logs.');
        }

        await loadBatchDetail();
      }
    } catch (error) {
      console.error('Apply batch error:', error);
      toast.error(`Failed to apply batch: ${error.message || 'Unknown error'}`);
    } finally {
      setApplying(false);
    }
  };

  const [inviteProgress, setInviteProgress] = useState({ current: 0, total: 0, failures: [] });

  const handleInviteReadyUsers = async () => {
    const readyUsers = users.filter(u => u.apply_status === 'READY_TO_INVITE');
    
    if (readyUsers.length === 0) {
      toast.info('No users ready to invite');
      return;
    }

    try {
      setInviting(true);
      setInviteProgress({ current: 0, total: readyUsers.length, failures: [] });
      
      let successCount = 0;
      let failCount = 0;
      const failures = [];

      // Invite users one by one with throttling (250ms between invites)
      for (let i = 0; i < readyUsers.length; i++) {
        const provUser = readyUsers[i];

        // Rate limit handling with exponential backoff
        let inviteSucceeded = false;
        let inviteAttempts = 0;
        const maxInviteRetries = 3;

        while (!inviteSucceeded && inviteAttempts < maxInviteRetries) {
          try {
            // Get app_role from profile_payload (default to 'user')
            const appRole = provUser.profile_payload?.appRole || 'user';

            // Frontend SDK call to invite user
            await base44.users.inviteUser(provUser.email, appRole);

            // Mark as invited in backend
            await base44.functions.invoke('provisioningMarkInvitesSent', {
              batchId,
              emails: [provUser.email]
            });

            successCount++;
            inviteSucceeded = true;
          } catch (error) {
            inviteAttempts++;

            // Check if rate limit error
            const isRateLimit = error.message?.includes('rate limit') || 
                               error.message?.includes('429') ||
                               error.response?.status === 429;

            if (isRateLimit && inviteAttempts < maxInviteRetries) {
              // Exponential backoff: 1s, 2s, 4s
              const backoffMs = Math.pow(2, inviteAttempts) * 1000;
              console.warn(`Rate limit hit for ${provUser.email}, backing off ${backoffMs}ms (attempt ${inviteAttempts}/${maxInviteRetries})`);
              await new Promise(resolve => setTimeout(resolve, backoffMs));
              continue;
            }

            // Non-retryable error or max retries reached
            console.error(`Invite failed for ${provUser.email}:`, error);
            failCount++;
            failures.push({
              email: provUser.email,
              error: error.message || 'Unknown error'
            });
            break;
          }
        }

        setInviteProgress({ current: i + 1, total: readyUsers.length, failures });

        // Throttle between invites (250ms)
        if (i < readyUsers.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 250));
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully invited ${successCount} user${successCount > 1 ? 's' : ''}`);
      }
      if (failCount > 0) {
        toast.error(`${failCount} invite${failCount > 1 ? 's' : ''} failed`);
      }

      await loadBatchDetail();
    } catch (error) {
      console.error('Invite users error:', error);
      toast.error('Failed to invite users');
    } finally {
      setInviting(false);
      setInviteProgress({ current: 0, total: 0, failures: [] });
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      NOT_APPLIED: { variant: "secondary", icon: Clock, color: "text-gray-600" },
      PROFILE_UPSERTED: { variant: "secondary", icon: CheckCircle, color: "text-blue-600" },
      ENTITLEMENTS_APPLIED: { variant: "secondary", icon: CheckCircle, color: "text-blue-600" },
      READY_TO_INVITE: { variant: "default", icon: Mail, color: "text-green-600" },
      INVITE_SENT: { variant: "outline", icon: CheckCircle, color: "text-indigo-600" },
      AWAITING_LOGIN: { variant: "outline", icon: Clock, color: "text-purple-600" },
      LINKED: { variant: "default", icon: CheckCircle, color: "text-green-700" },
      ACTIVE: { variant: "default", icon: CheckCircle, color: "text-green-700" },
      APPLY_FAILED: { variant: "destructive", icon: AlertCircle, color: "text-red-600" }
    };

    const config = variants[status] || variants.NOT_APPLIED;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        <span className={config.color}>{status.replace(/_/g, ' ')}</span>
      </Badge>
    );
  };

  if (!isPlatformAdmin && !isSuperAdmin) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertCircle className="w-5 h-5" />
              <p>Admin access required.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600">Batch not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const readyCount = users.filter(u => u.apply_status === 'READY_TO_INVITE').length;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(createPageUrl('ProvisioningBatches'))}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Batches
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Batch: {batch.file_name}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                ID: {batch.id}
              </p>
            </div>
            <Badge variant="outline">{batch.source_system}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600">Total Rows</p>
              <p className="text-2xl font-bold">{batch.total_rows}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Valid</p>
              <p className="text-2xl font-bold text-green-600">{batch.valid_rows}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Invalid</p>
              <p className="text-2xl font-bold text-red-600">{batch.invalid_rows}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">New Users</p>
              <p className="text-2xl font-bold text-blue-600">{batch.new_users}</p>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            {(batch.status === 'VALIDATED' || batch.status === 'PARTIALLY_APPLIED') && (
              <Button onClick={handleApply} disabled={applying}>
                <Play className="w-4 h-4 mr-2" />
                {applying ? 'Applying...' : batch.status === 'PARTIALLY_APPLIED' ? 'Resume Apply' : 'Apply Batch'}
              </Button>
            )}
            
            {readyCount > 0 && (
              <Button onClick={handleInviteReadyUsers} disabled={inviting}>
                <Mail className="w-4 h-4 mr-2" />
                {inviting ? `Inviting ${inviteProgress.current}/${inviteProgress.total}...` : `Invite ${readyCount} Users`}
              </Button>
            )}

            {inviting && inviteProgress.total > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <RefreshCw className="w-4 h-4 animate-spin" />
                {inviteProgress.current} / {inviteProgress.total}
                {inviteProgress.failures.length > 0 && (
                  <span className="text-red-600">({inviteProgress.failures.length} failed)</span>
                )}
              </div>
            )}

            {batch.invalid_rows > 0 && (
              <Button variant="outline" onClick={() => {
                const tenantParam = user?.app_role === 'Platform Admin' ? `&tenantId=${tenantId}` : '';
                window.open(`/api/functions/provisioningExportInvalidCSV/batches/${batchId}/exports/invalid.csv?batchId=${batchId}${tenantParam}`, '_blank');
              }}>
                <Download className="w-4 h-4 mr-2" />
                Export Invalid ({batch.invalid_rows})
              </Button>
            )}
            
            <Button variant="outline" onClick={() => {
              const tenantParam = user?.app_role === 'Platform Admin' ? `&tenantId=${tenantId}` : '';
              window.open(`/api/functions/provisioningExportStatusCSV/batches/${batchId}/exports/status.csv?batchId=${batchId}${tenantParam}`, '_blank');
            }}>
              <Download className="w-4 h-4 mr-2" />
              Export Status
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4 flex-wrap">
            <Input
              placeholder="Search by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="NOT_APPLIED">Not Applied</SelectItem>
                <SelectItem value="READY_TO_INVITE">Ready to Invite</SelectItem>
                <SelectItem value="INVITE_SENT">Invite Sent</SelectItem>
                <SelectItem value="LINKED">Linked</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="APPLY_FAILED">Failed</SelectItem>
                <SelectItem value="INVALID">Invalid</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-gray-600 flex items-center">
              Showing {filteredUsers.length} of {users.length} users
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Validation</TableHead>
                <TableHead>Errors</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((provUser) => (
                <TableRow key={provUser.id}>
                  <TableCell className="font-medium">{provUser.email}</TableCell>
                  <TableCell>{provUser.first_name} {provUser.last_name}</TableCell>
                  <TableCell>{provUser.profile_payload?.department || '-'}</TableCell>
                  <TableCell>{getStatusBadge(provUser.apply_status)}</TableCell>
                  <TableCell>
                    {provUser.validation_status === 'INVALID' ? (
                      <Badge variant="destructive">Invalid</Badge>
                    ) : (
                      <Badge variant="outline">Valid</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {provUser.validation_errors && provUser.validation_errors.length > 0 ? (
                      <div className="text-xs text-red-600 max-w-xs truncate">
                        {provUser.validation_errors.map(e => e.message).join('; ')}
                      </div>
                    ) : provUser.last_apply_error ? (
                      <div className="text-xs text-red-600 max-w-xs truncate">
                        {provUser.last_apply_error.message}
                      </div>
                    ) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredUsers.length === 0 && users.length > 0 && (
            <div className="text-center py-8 text-gray-500">
              No users match the current filters
            </div>
          )}

          {users.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              No users in this batch
            </div>
          )}

          {inviteProgress.failures.length > 0 && (
            <Card className="mt-4 border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-sm text-red-900">Invite Failures ({inviteProgress.failures.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-xs text-red-700">
                  {inviteProgress.failures.map((f, idx) => (
                    <div key={idx}>
                      <strong>{f.email}:</strong> {f.error}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}