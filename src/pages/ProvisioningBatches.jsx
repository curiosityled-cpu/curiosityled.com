import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, RefreshCw, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import CSVUploadModal from "@/components/provisioning/CSVUploadModal";

export default function ProvisioningBatches() {
  const { user, isPlatformAdmin, isSuperAdmin } = useAuth();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // TODO: Get tenantId from user context
  const tenantId = user?.client_id || 'default';

  useEffect(() => {
    loadBatches();
  }, [tenantId]);

  const loadBatches = async () => {
    try {
      setLoading(true);
      
      // Note: tenantId is now derived server-side from user.client_id
      // We still pass it for Platform Admin debugging capability
      const response = await base44.functions.invoke('provisioningGetBatches', {
        tenantId: user?.app_role === 'Platform Admin' ? tenantId : undefined
      });
      
      if (response.data?.batches) {
        setBatches(response.data.batches);
      }
    } catch (error) {
      console.error('Load batches error:', error);
      toast.error(`Failed to load batches: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      IMPORTED: { variant: "secondary", icon: Clock },
      VALIDATED: { variant: "secondary", icon: CheckCircle },
      APPLIED: { variant: "default", icon: CheckCircle },
      PARTIALLY_APPLIED: { variant: "outline", icon: AlertCircle },
      FAILED: { variant: "destructive", icon: AlertCircle }
    };

    const config = variants[status] || variants.IMPORTED;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {status}
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
              <p>Admin access required to view provisioning batches.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Provisioning Console</h1>
          <p className="text-gray-600 mt-1">
            Manage bulk user provisioning batches
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={loadBatches} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowUploadModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Provisioning Batches</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : batches.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No batches yet. Upload a CSV to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch ID</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valid</TableHead>
                  <TableHead className="text-right">Invalid</TableHead>
                  <TableHead className="text-right">New</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-mono text-sm">
                      {batch.id.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{batch.source_system}</Badge>
                    </TableCell>
                    <TableCell>{batch.file_name}</TableCell>
                    <TableCell>{getStatusBadge(batch.status)}</TableCell>
                    <TableCell className="text-right">{batch.valid_rows}</TableCell>
                    <TableCell className="text-right">
                      {batch.invalid_rows > 0 && (
                        <span className="text-red-600">{batch.invalid_rows}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{batch.new_users}</TableCell>
                    <TableCell>
                      {format(new Date(batch.created_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Link to={createPageUrl(`ProvisioningBatchDetail?batchId=${batch.id}`)}>
                        <Button variant="ghost" size="sm">
                          View Details
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CSVUploadModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        onSuccess={loadBatches}
      />
    </div>
  );
}