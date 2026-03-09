import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function DeleteAccountDialog({ userEmail }) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE MY ACCOUNT') {
      toast.error('Please type the confirmation text correctly');
      return;
    }

    setIsDeleting(true);
    try {
      // Request account deletion
      await base44.integrations.Core.SendEmail({
        to: 'support@curiosityled.com',
        subject: `Account Deletion Request - ${userEmail}`,
        body: `User ${userEmail} has requested account deletion. Please process this request according to data privacy policies.`,
        from_name: 'Curiosity Led Platform'
      });

      toast.success('Account deletion request submitted. You will receive confirmation via email within 24 hours.');
      
      // Log out user after 2 seconds
      setTimeout(() => {
        base44.auth.logout();
      }, 2000);
    } catch (error) {
      console.error('Error requesting account deletion:', error);
      toast.error('Failed to submit deletion request. Please contact support.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full">
          <Trash2 className="w-4 h-4 mr-2" />
          Delete My Account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
            <AlertTriangle className="w-6 h-6" />
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <p>
              This action will permanently delete your account and all associated data, including:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Profile information and preferences</li>
              <li>Learning progress and certifications</li>
              <li>Goals and performance data</li>
              <li>Assessment results and reports</li>
              <li>All notifications and history</li>
            </ul>
            <p className="font-semibold text-red-600 dark:text-red-400">
              This action cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="confirm-delete" className="text-sm font-medium">
              Type <span className="font-bold">DELETE MY ACCOUNT</span> to confirm:
            </Label>
            <Input
              id="confirm-delete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE MY ACCOUNT"
              className="mt-2"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteAccount}
            disabled={confirmText !== 'DELETE MY ACCOUNT' || isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? 'Processing...' : 'Delete Account'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}