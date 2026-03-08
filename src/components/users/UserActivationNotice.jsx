import React, { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function UserActivationNotice({ user }) {
  const [activating, setActivating] = useState(false);
  const [isActivated, setIsActivated] = useState(false);

  useEffect(() => {
    // Auto-activate on first login if pending
    if (user?.account_status === 'pending_activation' && !user?.license_activated_at) {
      activateLicense();
    } else if (user?.account_status === 'active' && user?.license_activated_at) {
      setIsActivated(true);
    }
  }, [user]);

  const activateLicense = async () => {
    setActivating(true);
    try {
      const response = await base44.functions.invoke('activateLicenseOnFirstLogin');
      const result = response?.data || response;
      
      if (result.success) {
        setIsActivated(true);
        if (!result.already_active) {
          toast.success('Welcome! Your license has been activated.');
        }
      }
    } catch (error) {
      console.error('Error activating license:', error);
      toast.error('Failed to activate license. Please contact support.');
    } finally {
      setActivating(false);
    }
  };

  // Don't show anything if already active
  if (isActivated || user?.account_status === 'active') {
    return null;
  }

  // Show activation in progress
  if (activating) {
    return (
      <Alert className="border-blue-200 bg-blue-50 mb-6">
        <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
        <AlertDescription className="text-blue-800">
          <strong>Activating your license...</strong>
          <p className="text-sm mt-1">Please wait while we set up your account.</p>
        </AlertDescription>
      </Alert>
    );
  }

  // Show pending activation notice
  if (user?.account_status === 'pending_activation') {
    return (
      <Alert className="border-yellow-200 bg-yellow-50 mb-6">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <strong>Your account is pending activation</strong>
          <p className="text-sm mt-1">
            You should have received an email with activation instructions. 
            If you completed the password reset, your license will activate automatically.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}