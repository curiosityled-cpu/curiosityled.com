import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

/**
 * FirstLoginLinker
 * 
 * Automatically links Base44 user ID to pre-provisioned UserProfile on first login.
 * Should be rendered in Layout or a top-level component after authentication.
 */
export default function FirstLoginLinker() {
  const { user } = useAuth();
  const [linking, setLinking] = useState(false);
  const [linked, setLinked] = useState(false);
  const [error, setError] = useState(null);

  // TODO: Get tenantId from user context
  const tenantId = user?.client_id || 'default';

  useEffect(() => {
    if (user?.email && user?.id && !linked) {
      attemptLink();
    }
  }, [user?.email, user?.id]);

  const attemptLink = async () => {
    // Skip if already checked in this session
    const linkCheckKey = `link_checked_${user.id}`;
    if (sessionStorage.getItem(linkCheckKey)) {
      return;
    }

    try {
      setLinking(true);
      setError(null);

      // Note: tenantId is now fully derived server-side
      // We no longer send it to avoid client trust issues
      const response = await base44.functions.invoke('provisioningLink', {
        email: user.email,
        base44UserId: user.id
      });

      if (response.data?.linked) {
        setLinked(true);
        sessionStorage.setItem(linkCheckKey, 'true');
        
        if (!response.data.alreadyLinked) {
          toast.success('Welcome! Your profile has been linked.');
        }
      }
    } catch (err) {
      console.error('Linking error:', err);
      
      // Parse error response
      const errorData = err.response?.data || {};
      const errorMsg = errorData.error || err.message || '';
      
      if (errorMsg.includes('PROFILE_NOT_PROVISIONED')) {
        setError('Your profile has not been provisioned yet. Please contact your administrator.');
        sessionStorage.setItem(linkCheckKey, 'checked_not_found');
      } else if (errorMsg.includes('AMBIGUOUS_TENANT')) {
        setError('Multiple profiles found. Please contact your administrator to resolve this issue.');
        sessionStorage.setItem(linkCheckKey, 'checked_ambiguous');
      } else if (errorMsg.includes('DUPLICATE_PROFILE_RECORDS')) {
        setError('Data integrity error detected. Please contact your administrator.');
        sessionStorage.setItem(linkCheckKey, 'checked_duplicate');
      } else if (errorMsg.includes('PROFILE_ALREADY_LINKED_TO_DIFFERENT_USER')) {
        setError('This profile is already linked to another account. Contact your administrator.');
        sessionStorage.setItem(linkCheckKey, 'checked_conflict');
      } else if (errorMsg.includes('Forbidden')) {
        setError('Security check failed. Please log out and back in.');
        sessionStorage.setItem(linkCheckKey, 'checked_forbidden');
      } else {
        // Don't mark as checked for transient errors - allow retry on next page load
        setError('Failed to link profile. Please refresh the page or contact your administrator.');
      }
    } finally {
      setLinking(false);
    }
  };

  // Don't render anything if not linking or no error
  if (!linking && !error) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="max-w-md w-full mx-4">
        <CardContent className="pt-6">
          {linking && (
            <div className="text-center py-8">
              <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Finalizing Setup</h3>
              <p className="text-gray-600">
                Linking your profile...
              </p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Profile Not Available</h3>
              <p className="text-gray-600">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}