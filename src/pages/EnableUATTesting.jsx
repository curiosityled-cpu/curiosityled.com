import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function EnableUATTesting() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleEnable = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { data } = await base44.functions.invoke('enableUATTesting', {});
      setSuccess(true);
      
      // Redirect to UAT Testing Guide after 2 seconds
      setTimeout(() => {
        window.location.href = createPageUrl("UATTestingGuide");
      }, 2000);
    } catch (err) {
      console.error('Error enabling UAT testing:', err);
      setError(err.message || 'Failed to enable UAT testing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Enable UAT Testing</CardTitle>
          <CardDescription>
            Click the button below to enable UAT testing access for your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded text-green-700">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">UAT testing enabled! Redirecting...</p>
            </div>
          )}

          <Button
            onClick={handleEnable}
            disabled={loading || success}
            className="w-full"
            style={{ backgroundColor: '#0202ff' }}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {success ? 'Enabled!' : 'Enable UAT Testing'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}