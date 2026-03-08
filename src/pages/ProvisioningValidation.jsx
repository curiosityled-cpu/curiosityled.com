import React, { useState } from "react";
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
import { Play, Shield, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function ProvisioningValidation() {
  const { user, isPlatformAdmin, isSuperAdmin } = useAuth();
  const [smokeResults, setSmokeResults] = useState(null);
  const [securityResults, setSecurityResults] = useState(null);
  const [runningSmokeTest, setRunningSmokeTest] = useState(false);
  const [runningSecurityTest, setRunningSecurityTest] = useState(false);

  const runSmokeTest = async () => {
    try {
      setRunningSmokeTest(true);
      setSmokeResults(null);

      const { data, error } = await base44.functions.invoke('provisioningTestSmoke', {
        tenantId: null, // Platform Admin sees all tenants
        cleanup: true
      });

      console.log('Smoke test full response:', { data, error });

      if (error) {
        const errorMsg = error.message || error.error || JSON.stringify(error);
        console.error('Smoke test returned error:', errorMsg);
        setSmokeResults({ error: errorMsg, readyForProduction: false, results: [] });
        toast.error('Smoke test encountered an error');
      } else if (data) {
        console.log('Smoke test data:', data);
        setSmokeResults(data);
        
        if (data.readyForProduction) {
          toast.success('All smoke tests passed!');
        } else {
          toast.error('Some smoke tests failed');
        }
      } else {
        console.log('No data or error in smoke test response');
        setSmokeResults({ error: 'No response data received', readyForProduction: false, results: [] });
      }
    } catch (error) {
      console.error('Smoke test exception:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      toast.error(`Smoke test failed: ${errorMsg}`);
      setSmokeResults({ error: errorMsg, readyForProduction: false, results: [] });
    } finally {
      setRunningSmokeTest(false);
    }
  };

  const runSecurityTest = async () => {
    try {
      setRunningSecurityTest(true);
      setSecurityResults(null);

      const response = await base44.functions.invoke('provisioningValidateSecurityBoundaries', {});

      if (response.data) {
        setSecurityResults(response.data);
        
        if (response.data.allSecurityChecksPassed) {
          toast.success('All security tests passed!');
        } else {
          toast.error('Some security tests failed');
        }
      }
    } catch (error) {
      console.error('Security test error:', error);
      toast.error(`Security test failed: ${error.message}`);
      setSecurityResults({ error: error.message, allSecurityChecksPassed: false });
    } finally {
      setRunningSecurityTest(false);
    }
  };

  if (!isPlatformAdmin && !isSuperAdmin) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertCircle className="w-5 h-5" />
              <p>Admin access required to run validation tests.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Provisioning Gateway Validation</h1>
        <p className="text-gray-600 mt-1">
          Run comprehensive tests to validate provisioning logic and security
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Pre-Wix Readiness Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium">Tenant Resolution</div>
                <div className="text-gray-600">System derives tenantId server-side, handling missing user.client_id via email lookup</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium">Security Boundaries</div>
                <div className="text-gray-600">All admin endpoints enforce role checks and derive tenant from authenticated context</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium">Link Security</div>
                <div className="text-gray-600">Link endpoint validates authenticated user matches email+userId, fully idempotent</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium">Apply Idempotency</div>
                <div className="text-gray-600">Re-running apply is safe, prevents duplicates, never downgrades ACTIVE status</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              Smoke Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Tests the full provisioning lifecycle: create batch, apply, invite workflow, and linking.
            </p>
            <Button 
              onClick={runSmokeTest} 
              disabled={runningSmokeTest}
              className="w-full"
            >
              {runningSmokeTest ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Running Smoke Test...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Smoke Test
                </>
              )}
            </Button>

            {smokeResults && (
              <div className="mt-4 space-y-3">
                {/* Show error if present */}
                {smokeResults.error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-900">Test Execution Error</p>
                        <p className="text-sm text-red-700 mt-1">{smokeResults.error}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Test Results</span>
                  <Badge variant={smokeResults.readyForProduction ? "default" : "destructive"}>
                    {smokeResults.summary?.passed || 0} / {smokeResults.summary?.total || 0} passed
                  </Badge>
                </div>

                {smokeResults.results && smokeResults.results.length > 0 && (
                  <div className="space-y-1 text-xs">
                    {smokeResults.results.map((result, idx) => (
                      <div 
                        key={idx}
                        className={`flex items-start gap-2 p-2 rounded ${result.passed ? 'bg-green-50' : 'bg-red-50'}`}
                      >
                        {result.passed ? (
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{result.step}</div>
                          {result.details && (
                            <pre className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security Validation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Tests tenant isolation, admin enforcement, and link endpoint security.
            </p>
            <Button 
              onClick={runSecurityTest} 
              disabled={runningSecurityTest}
              className="w-full"
            >
              {runningSecurityTest ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Running Security Tests...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Run Security Tests
                </>
              )}
            </Button>

            {securityResults && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Security Status</span>
                  <Badge variant={securityResults.allSecurityChecksPassed ? "default" : "destructive"}>
                    {securityResults.summary?.passed || 0} / {securityResults.summary?.total || 0} passed
                  </Badge>
                </div>

                {securityResults.tests && securityResults.tests.length > 0 && (
                  <div className="space-y-1 text-xs">
                    {securityResults.tests.map((test, idx) => (
                      <div 
                        key={idx}
                        className={`flex items-start gap-2 p-2 rounded ${test.passed ? 'bg-green-50' : 'bg-red-50'}`}
                      >
                        {test.passed ? (
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{test.testName}</div>
                          {test.details && (
                            <pre className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">
                              {JSON.stringify(test.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {(smokeResults || securityResults) && (
        <Card>
          <CardHeader>
            <CardTitle>Production Readiness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {smokeResults && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">Smoke Tests</div>
                    <div className="text-sm text-gray-600">Full lifecycle validation</div>
                  </div>
                  <Badge variant={smokeResults.readyForProduction ? "default" : "destructive"}>
                    {smokeResults.readyForProduction ? 'READY' : 'NOT READY'}
                  </Badge>
                </div>
              )}

              {securityResults && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">Security Tests</div>
                    <div className="text-sm text-gray-600">Boundary and isolation checks</div>
                  </div>
                  <Badge variant={securityResults.allSecurityChecksPassed ? "default" : "destructive"}>
                    {securityResults.allSecurityChecksPassed ? 'SECURE' : 'ISSUES FOUND'}
                  </Badge>
                </div>
              )}

              {smokeResults?.readyForProduction && securityResults?.allSecurityChecksPassed && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3 text-green-900">
                    <CheckCircle className="w-5 h-5" />
                    <div>
                      <div className="font-semibold">Ready for External Provisioning Source</div>
                      <div className="text-sm text-green-700">
                        All tests passed. System is ready for Wix or SCIM integration.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}