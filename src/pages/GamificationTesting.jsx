import React, { useState } from 'react';
import { useAuth } from '@/components/useAuth';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  PlayCircle, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Loader2,
  Trash2,
  Database
} from 'lucide-react';
import { toast } from 'sonner';

export default function GamificationTesting() {
  const { user, isPlatformAdmin, isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [activeTest, setActiveTest] = useState(null);

  if (!isPlatformAdmin && !isSuperAdmin) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You need Platform Admin or Super Administrator access to view this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const runTest = async (testType, testFunction, params = {}) => {
    setLoading(true);
    setActiveTest(testType);
    setTestResults(null);

    try {
      const { data } = await base44.functions.invoke(testFunction, params);
      setTestResults(data);
      
      const passed = data.results?.tests?.filter(t => t.status === 'passed').length || 0;
      const total = data.results?.tests?.filter(t => t.status !== 'skipped').length || 0;
      
      if (passed === total) {
        toast.success(`All ${total} tests passed! ✅`);
      } else {
        toast.warning(`${passed}/${total} tests passed`);
      }
    } catch (error) {
      toast.error(`Test failed: ${error.message}`);
      console.error('Test error:', error);
    } finally {
      setLoading(false);
      setActiveTest(null);
    }
  };

  const generateTestData = async (userCount) => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('generateTestData', {
        user_count: userCount,
        include_transactions: true
      });
      toast.success(data.message);
    } catch (error) {
      toast.error(`Failed to generate test data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const cleanupTestData = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('cleanupTestData');
      toast.success(`Cleaned up: ${data.deleted_count.achievements} achievements, ${data.deleted_count.transactions} transactions`);
    } catch (error) {
      toast.error(`Cleanup failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'skipped': return <div className="h-4 w-4" />;
      default: return null;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      passed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800',
      skipped: 'bg-gray-100 text-gray-600'
    };

    return (
      <Badge className={variants[status]}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gamification Testing Suite</h1>
        <p className="text-gray-600">
          Comprehensive testing for the gamification system
        </p>
      </div>

      <Tabs defaultValue="unit" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="unit">Unit Tests</TabsTrigger>
          <TabsTrigger value="integration">Integration</TabsTrigger>
          <TabsTrigger value="load">Load Tests</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="data">Test Data</TabsTrigger>
        </TabsList>

        {/* Unit Tests */}
        <TabsContent value="unit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Unit Tests</CardTitle>
              <CardDescription>
                Test individual gamification components in isolation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => runTest('unit', 'testGamificationUnitTests')}
                disabled={loading}
                className="w-full"
              >
                {loading && activeTest === 'unit' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running Tests...
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Run Unit Tests
                  </>
                )}
              </Button>

              <div className="mt-4 space-y-2">
                <h4 className="font-semibold text-sm">Tests Included:</h4>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Point award logic validation</li>
                  <li>Level calculation accuracy</li>
                  <li>Badge eligibility checking</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integration Tests */}
        <TabsContent value="integration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integration Tests</CardTitle>
              <CardDescription>
                Test complete workflows across multiple components
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => runTest('integration', 'testGamificationIntegration')}
                disabled={loading}
                className="w-full"
              >
                {loading && activeTest === 'integration' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running Tests...
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Run Integration Tests
                  </>
                )}
              </Button>

              <div className="mt-4 space-y-2">
                <h4 className="font-semibold text-sm">Tests Included:</h4>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Complete learning → points → level up flow</li>
                  <li>Peer point giving with budget enforcement</li>
                  <li>Badge award and notification flow</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Load Tests */}
        <TabsContent value="load" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Load & Performance Tests</CardTitle>
              <CardDescription>
                Test system performance under load
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <Button
                  onClick={() => runTest('load-leaderboard', 'testGamificationLoadTests', { 
                    test_type: 'leaderboard', 
                    user_count: 1000 
                  })}
                  disabled={loading}
                  variant="outline"
                >
                  {loading && activeTest === 'load-leaderboard' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <PlayCircle className="mr-2 h-4 w-4" />
                  )}
                  Leaderboard Generation (1000 users)
                </Button>

                <Button
                  onClick={() => runTest('load-concurrent', 'testGamificationLoadTests', { 
                    test_type: 'concurrent_awards', 
                    user_count: 50 
                  })}
                  disabled={loading}
                  variant="outline"
                >
                  {loading && activeTest === 'load-concurrent' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <PlayCircle className="mr-2 h-4 w-4" />
                  )}
                  Concurrent Point Awards (50 ops)
                </Button>

                <Button
                  onClick={() => runTest('load-badges', 'testGamificationLoadTests', { 
                    test_type: 'badge_check_performance', 
                    user_count: 20 
                  })}
                  disabled={loading}
                  variant="outline"
                >
                  {loading && activeTest === 'load-badges' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <PlayCircle className="mr-2 h-4 w-4" />
                  )}
                  Badge Eligibility Performance (20 users)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tests */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Tests</CardTitle>
              <CardDescription>
                Verify RBAC, data integrity, and security controls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => runTest('security', 'testGamificationSecurity')}
                disabled={loading}
                className="w-full"
              >
                {loading && activeTest === 'security' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running Tests...
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Run Security Tests
                  </>
                )}
              </Button>

              <div className="mt-4 space-y-2">
                <h4 className="font-semibold text-sm">Tests Included:</h4>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>RBAC for admin functions</li>
                  <li>Point manipulation prevention</li>
                  <li>Budget enforcement validation</li>
                  <li>Transaction data integrity</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Data Management */}
        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Data Management</CardTitle>
              <CardDescription>
                Generate and cleanup test data for testing purposes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Button
                  onClick={() => generateTestData(10)}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  <Database className="mr-2 h-4 w-4" />
                  Generate 10 Test Users
                </Button>

                <Button
                  onClick={() => generateTestData(100)}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  <Database className="mr-2 h-4 w-4" />
                  Generate 100 Test Users
                </Button>

                <Button
                  onClick={cleanupTestData}
                  disabled={loading}
                  variant="destructive"
                  className="w-full"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Cleanup All Test Data
                </Button>
              </div>

              <Alert>
                <AlertDescription className="text-sm">
                  Test data is prefixed with "test-user-" and can be safely deleted without affecting production data.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Test Results */}
      {testResults && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              {testResults.summary || testResults.results?.test_suite}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.results?.tests?.map((test, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getStatusIcon(test.status)}
                      <div>
                        <h4 className="font-semibold">{test.name}</h4>
                        {test.details && (
                          <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto">
                            {JSON.stringify(test.details, null, 2)}
                          </pre>
                        )}
                        {test.error && (
                          <p className="mt-2 text-sm text-red-600">{test.error}</p>
                        )}
                        {test.note && (
                          <p className="mt-2 text-sm text-gray-600">{test.note}</p>
                        )}
                        {test.reason && (
                          <p className="mt-2 text-sm text-gray-500 italic">{test.reason}</p>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(test.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}