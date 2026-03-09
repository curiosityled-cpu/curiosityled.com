import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Send, CheckCircle, XCircle, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Progress } from "@/components/ui/progress";

export default function BulkInviteUsers({ pendingUsers, onComplete, onCancel }) {
  const [inviting, setInviting] = useState(false);
  const [inviteResults, setInviteResults] = useState({ invited: [], failed: [], skipped: [] });
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);

  const handleBulkInvite = async () => {
    setInviting(true);
    setProgress(0);

    try {
      const response = await base44.functions.invoke('bulkInviteUsers', {
        users: pendingUsers
      });

      const result = response?.data || response;

      if (result.success) {
        setInviteResults({
          invited: result.invited || [],
          failed: result.failed || [],
          skipped: result.skipped || []
        });
        setProgress(100);
        setCompleted(true);

        const invitedCount = result.invited?.length || 0;
        const failedCount = result.failed?.length || 0;
        const skippedCount = result.skipped?.length || 0;

        if (invitedCount > 0) {
          toast.success(`Successfully invited ${invitedCount} user(s)!`);
        }
        if (skippedCount > 0) {
          toast.info(`${skippedCount} user(s) skipped (already exist)`);
        }
        if (failedCount > 0) {
          toast.error(`${failedCount} invitation(s) failed`);
        }
      } else {
        toast.error(result.error || 'Bulk invite failed');
        setCompleted(true);
      }
    } catch (error) {
      console.error('Bulk invite error:', error);
      toast.error('Failed to send invitations: ' + error.message);
      setCompleted(true);
    } finally {
      setInviting(false);
    }
  };

  if (completed) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Invitations Sent!</h3>
          <p className="text-gray-600">
            {inviteResults.invited.length} user(s) have been invited successfully
          </p>
        </div>

        {inviteResults.invited.length > 0 && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              <strong>Successfully invited:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                {inviteResults.invited.slice(0, 10).map((item, idx) => (
                  <li key={idx}>{item.email} - {item.role}</li>
                ))}
                {inviteResults.invited.length > 10 && (
                  <li className="text-gray-600">...and {inviteResults.invited.length - 10} more</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {inviteResults.failed.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-900">
              <strong>Failed to invite:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                {inviteResults.failed.map((item, idx) => (
                  <li key={idx}>{item.user?.email || 'Unknown'}: {item.reason}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {inviteResults.skipped.length > 0 && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-900">
              <strong>Skipped (already exist):</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                {inviteResults.skipped.map((item, idx) => (
                  <li key={idx}>{item.user?.email || 'Unknown'}: {item.reason}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button onClick={onComplete} className="flex-1 bg-green-600 hover:bg-green-700">
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>Ready to send invitations</strong>
          <p className="text-sm mt-1">
            {pendingUsers.length} user(s) have passed validation and are ready to be invited. 
            They will receive welcome emails with instructions to activate their accounts.
          </p>
        </AlertDescription>
      </Alert>

      {inviting && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Sending invitations...</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Organization</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingUsers.map((user, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.full_name}</TableCell>
                  <TableCell>
                    <Badge className="bg-blue-100 text-blue-800">
                      {user.app_role || 'User Level 1'}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.department || '-'}</TableCell>
                  <TableCell>
                    {user.client_id && clients.find(c => c.id === user.client_id)?.name}
                    {user.partner_id && partners.find(p => p.id === user.partner_id)?.name}
                    {!user.client_id && !user.partner_id && '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={inviting}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleBulkInvite}
          disabled={inviting}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          {inviting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending Invitations...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send {pendingUsers.length} Invitation{pendingUsers.length !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}