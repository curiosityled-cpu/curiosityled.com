import React, { useState } from 'react';
import { useAuth } from '@/components/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, Copy, Server, Database, Link2, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function ProvisioningManualValidationPack() {
  const { user, loading, isPlatformAdmin, isSuperAdmin } = useAuth();
  const [checklist, setChecklist] = useState({});

  const appDomain = window.location.origin;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isPlatformAdmin && !isSuperAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Access denied. This validation pack is only available to Platform Administrators.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const toggleCheck = (id) => {
    setChecklist(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const sections = [
    {
      id: 'auth',
      title: 'Part 0: Authentication Setup (DO THIS FIRST)',
      icon: Shield,
      critical: true,
      steps: [
        {
          id: 'auth-1',
          title: 'Choose Authentication Strategy',
          description: 'For Wix integration, we need API key authentication',
          instructions: (
            <div className="space-y-3">
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <p className="font-semibold text-yellow-900 mb-2">CRITICAL DECISION:</p>
                <p className="text-sm text-yellow-800 mb-2">Wix will call Base44 functions via HTTP. We need to authenticate these calls.</p>
                <p className="text-sm text-yellow-800"><strong>Recommended for MVP:</strong> Static API Key (simple, works immediately)</p>
                <p className="text-sm text-yellow-800"><strong>Production Enhancement:</strong> HMAC signed requests (more secure, prevents replay)</p>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="font-semibold text-blue-900 mb-2">Option A: Static API Key (IMPLEMENT THIS NOW)</p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                  <li>Generate a secure random API key: <code className="bg-blue-100 px-1 rounded">openssl rand -hex 32</code></li>
                  <li>Store in Base44 secrets as <code className="bg-blue-100 px-1 rounded">PROVISIONING_API_KEY</code></li>
                  <li>Wix sends: <code className="bg-blue-100 px-1 rounded">Authorization: Bearer &lt;api_key&gt;</code></li>
                  <li>Each function verifies: <code className="bg-blue-100 px-1 rounded">req.headers.get('authorization') === 'Bearer ' + Deno.env.get('PROVISIONING_API_KEY')</code></li>
                  <li>Invalid auth returns: <code className="bg-blue-100 px-1 rounded">401 Unauthorized</code></li>
                </ol>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded p-3">
                <p className="font-semibold text-gray-900 mb-2">Option B: HMAC Signed Requests (Future Enhancement)</p>
                <p className="text-sm text-gray-700 mb-2">Headers required:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li><code className="bg-gray-100 px-1 rounded">X-Client-Id: wix_production</code></li>
                  <li><code className="bg-gray-100 px-1 rounded">X-Timestamp: 1707267600</code></li>
                  <li><code className="bg-gray-100 px-1 rounded">X-Signature: hmac_sha256(secret, timestamp + SHA256(body))</code></li>
                </ul>
                <p className="text-sm text-gray-600 mt-2">Server verifies signature + timestamp skew (&lt; 5 min) + replay protection</p>
              </div>

              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>ACTION REQUIRED:</strong> Functions currently use <code>base44.auth.me()</code> which requires browser session cookies.
                  This will NOT work for Wix webhook calls. We must add API key verification logic to all HTTP-callable functions.
                </AlertDescription>
              </Alert>
            </div>
          ),
          verification: 'API key generated, stored in secrets, verification logic added to functions'
        }
      ]
    },
    {
      id: 'http',
      title: 'Part 1: External HTTP Endpoints',
      icon: Server,
      critical: true,
      steps: [
        {
          id: 'http-1',
          title: '1.1 Health Check (GET /provisioningHealth)',
          curl: `curl -X GET "${appDomain}/api/functions/provisioningHealth" \\
  -H "Authorization: Bearer YOUR_API_KEY_HERE"`,
          expected: {
            status: 200,
            body: {
              ok: true,
              version: '1.0.0',
              timestamp: '2026-02-07T...'
            }
          },
          verification: 'Response shows ok:true with timestamp'
        },
        {
          id: 'http-2',
          title: '1.2 Create Batch (POST /provisioningCreateBatch)',
          curl: `curl -X POST "${appDomain}/api/functions/provisioningCreateBatch" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \\
  -H "X-Idempotency-Key: test-$(uuidgen)" \\
  -d '{
    "tenantId": "YOUR_TENANT_ID",
    "sourceSystem": "WIX",
    "fileName": "wix_sync_$(date +%s).json",
    "records": [
      {
        "email": "valid1@test.com",
        "firstName": "Valid",
        "lastName": "User1",
        "department": "Engineering",
        "appRole": "user",
        "customRoles": ["hr_admin"]
      },
      {
        "email": "valid2@test.com",
        "firstName": "Valid",
        "lastName": "User2",
        "department": "Sales",
        "appRole": "user",
        "customRoles": []
      },
      {
        "email": "valid3@test.com",
        "firstName": "Valid",
        "lastName": "User3",
        "department": "HR",
        "appRole": "admin",
        "customRoles": ["manager"]
      },
      {
        "email": "invalid-email",
        "firstName": "Bad",
        "lastName": "Record",
        "appRole": "user"
      }
    ]
  }'`,
          expected: {
            status: 200,
            body: {
              batchId: '<uuid>',
              status: 'VALIDATED',
              totals: {
                total: 4,
                valid: 3,
                invalid: 1,
                newUsers: 3,
                existingUsers: 0
              }
            }
          },
          verification: 'Returns batchId, totals.valid=3, totals.invalid=1',
          dbCheck: {
            entity: 'ProvisioningBatch',
            filter: 'Use batchId from response',
            expectedFields: ['status=VALIDATED', 'total_rows=4', 'valid_rows=3', 'invalid_rows=1']
          }
        },
        {
          id: 'http-3',
          title: '1.3 Idempotency Replay (same key, same body)',
          curl: `# Re-run exact same curl from 1.2 (same idempotency key)`,
          expected: {
            status: 200,
            body: 'Same response as 1.2, no new batch created'
          },
          verification: 'Returns identical response, no new batch in DB',
          dbCheck: {
            entity: 'ProvisioningBatch',
            filter: 'Count batches for tenant',
            expectedFields: ['Only ONE batch exists (not two)']
          }
        },
        {
          id: 'http-4',
          title: '1.4 Idempotency Conflict (same key, different body)',
          curl: `curl -X POST "${appDomain}/api/functions/provisioningCreateBatch" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \\
  -H "X-Idempotency-Key: SAME_KEY_FROM_1.2" \\
  -d '{
    "tenantId": "YOUR_TENANT_ID",
    "sourceSystem": "WIX",
    "fileName": "different_file.json",
    "records": [{"email": "different@test.com", "firstName": "Diff", "lastName": "User", "appRole": "user"}]
  }'`,
          expected: {
            status: 409,
            body: {
              error: 'Idempotency key already used with different request'
            }
          },
          verification: '409 error, idempotency conflict detected'
        },
        {
          id: 'http-5',
          title: '1.5 Apply Batch (POST /provisioningApplyBatch)',
          curl: `curl -X POST "${appDomain}/api/functions/provisioningApplyBatch/BATCH_ID_FROM_1.2/apply" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \\
  -d '{
    "mode": "RESUME",
    "dryRun": false
  }'`,
          expected: {
            status: 200,
            body: {
              batchId: '<uuid>',
              status: 'APPLIED',
              results: {
                profileUpserted: 3,
                entitlementsApplied: 3,
                failed: 0,
                skipped: 0
              }
            }
          },
          verification: 'profileUpserted=3, entitlementsApplied=3, failed=0',
          dbCheck: {
            entity: 'ProvisioningUser',
            filter: 'batch_id = BATCH_ID, validation_status = VALID',
            expectedFields: ['3 records with apply_status = READY_TO_INVITE']
          }
        },
        {
          id: 'http-6',
          title: '1.6 Verify UserProfile Creation',
          dbCheck: {
            entity: 'UserProfile',
            filter: 'tenant_id = YOUR_TENANT_ID, email IN (valid1@test.com, valid2@test.com, valid3@test.com)',
            expectedFields: [
              '3 profiles created',
              'status = PROVISIONED',
              'first_name, last_name, department populated',
              'custom_role_ids array populated for valid1 and valid3'
            ]
          }
        },
        {
          id: 'http-7',
          title: '1.7 Verify UserRoleAssignment Creation',
          dbCheck: {
            entity: 'UserRoleAssignment',
            filter: 'tenant_id = YOUR_TENANT_ID, email IN (valid1@test.com, valid3@test.com)',
            expectedFields: [
              '2 assignments created (valid1: hr_admin, valid3: manager)',
              'role_id references ProvisioningRole',
              'base44_user_id is null (not linked yet)'
            ]
          }
        },
        {
          id: 'http-8',
          title: '1.8 Export Invalid CSV',
          curl: `curl -X GET "${appDomain}/api/functions/provisioningExportInvalidCSV?batchId=BATCH_ID_FROM_1.2" \\
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \\
  -o invalid_records.csv`,
          expected: {
            status: 200,
            headers: {
              'Content-Type': 'text/csv'
            },
            body: 'CSV file with 1 row (invalid-email record) + headers'
          },
          verification: 'CSV downloaded, contains invalid record with error details'
        },
        {
          id: 'http-9',
          title: '1.9 Export Status CSV',
          curl: `curl -X GET "${appDomain}/api/functions/provisioningExportStatusCSV?batchId=BATCH_ID_FROM_1.2" \\
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \\
  -o batch_status.csv`,
          expected: {
            status: 200,
            headers: {
              'Content-Type': 'text/csv'
            },
            body: 'CSV file with 4 rows (all users) + apply_status column'
          },
          verification: 'CSV downloaded, shows 3 READY_TO_INVITE, 1 NOT_APPLIED (invalid)'
        }
      ]
    },
    {
      id: 'ui',
      title: 'Part 2: UI Apply + Invite Flow',
      icon: Link2,
      critical: true,
      steps: [
        {
          id: 'ui-1',
          title: '2.1 Navigate to Provisioning Batches',
          instructions: (
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Navigate to <code className="bg-gray-100 px-1 rounded">/ProvisioningBatches</code></li>
              <li>Verify page loads with list of batches</li>
              <li>Find batch created in Part 1 (status: VALIDATED or APPLIED)</li>
              <li>Click batch row to open detail page</li>
            </ol>
          ),
          verification: 'Batch detail page displays with user list and status badges'
        },
        {
          id: 'ui-2',
          title: '2.2 Apply Batch via UI',
          instructions: (
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>On batch detail page, locate <strong>Apply</strong> or <strong>Resume Apply</strong> button</li>
              <li>Click button and wait for operation to complete</li>
              <li>Verify success toast/notification appears</li>
              <li>Verify user status badges update to "Ready to Invite"</li>
              <li>Verify batch status updates to "APPLIED"</li>
            </ol>
          ),
          verification: '3 users show READY_TO_INVITE status, 1 shows NOT_APPLIED (invalid)',
          expectedOutcome: 'UI shows real-time status updates, no errors in console'
        },
        {
          id: 'ui-3',
          title: '2.3 Invite Users via UI',
          instructions: (
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>On batch detail page, locate <strong>Invite Ready Users</strong> button</li>
              <li>Click button - should invite 3 READY_TO_INVITE users</li>
              <li>Watch progress indicator (should process ~250ms per user)</li>
              <li>Verify success notification shows "3 invitations sent"</li>
              <li>Verify user status badges update to "Invite Sent"</li>
            </ol>
          ),
          verification: '3 users show INVITE_SENT status',
          expectedOutcome: 'Invite emails sent (check inbox), no console errors',
          dbCheck: {
            entity: 'ProvisioningUser',
            filter: 'batch_id = BATCH_ID, apply_status = INVITE_SENT',
            expectedFields: ['3 records with apply_status = INVITE_SENT']
          }
        },
        {
          id: 'ui-4',
          title: '2.4 Verify UserProfile Status Updated',
          dbCheck: {
            entity: 'UserProfile',
            filter: 'tenant_id = YOUR_TENANT_ID, email IN (valid1@test.com, valid2@test.com, valid3@test.com)',
            expectedFields: [
              'status = INVITED (or ACTIVE if already logged in)'
            ]
          }
        }
      ]
    },
    {
      id: 'linking',
      title: 'Part 3: End-to-End First Login Linking',
      icon: Database,
      critical: true,
      steps: [
        {
          id: 'link-1',
          title: '3.1 Use Real Test Email',
          instructions: (
            <div className="space-y-2">
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>CRITICAL:</strong> Use a real email you can access (e.g., your personal Gmail with +tag)
                  <br />Example: <code>yourname+wixtest@gmail.com</code>
                </AlertDescription>
              </Alert>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Create a NEW batch with 1 user using your test email</li>
                <li>Apply batch via UI</li>
                <li>Invite user via UI</li>
                <li>Check inbox for Base44 invite email</li>
              </ol>
            </div>
          ),
          verification: 'Invite email received in inbox'
        },
        {
          id: 'link-2',
          title: '3.2 Accept Invite and Complete Registration',
          instructions: (
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Click invite link in email</li>
              <li>Complete password setup (if required)</li>
              <li>Login with email + password</li>
              <li>Wait for app to load (FirstLoginLinker runs automatically)</li>
            </ol>
          ),
          verification: 'Successfully logged in, dashboard loads'
        },
        {
          id: 'link-3',
          title: '3.3 Verify FirstLoginLinker Executed',
          instructions: (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Open browser console and check for:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><code className="bg-gray-100 px-1 rounded">[FirstLoginLinker] Attempting to link...</code></li>
                <li><code className="bg-gray-100 px-1 rounded">[FirstLoginLinker] Link successful</code></li>
              </ul>
              <p className="text-sm text-gray-600 mt-2">If errors appear, copy full console output for debugging</p>
            </div>
          ),
          verification: 'Console shows successful link, no errors'
        },
        {
          id: 'link-4',
          title: '3.4 Verify UserProfile Linked',
          dbCheck: {
            entity: 'UserProfile',
            filter: 'email = YOUR_TEST_EMAIL',
            expectedFields: [
              'base44_user_id IS NOT NULL (should match user.id from login)',
              'status = ACTIVE',
              'linked_at timestamp populated'
            ]
          }
        },
        {
          id: 'link-5',
          title: '3.5 Verify UserRoleAssignment Linked',
          dbCheck: {
            entity: 'UserRoleAssignment',
            filter: 'email = YOUR_TEST_EMAIL',
            expectedFields: [
              'base44_user_id IS NOT NULL (matches UserProfile.base44_user_id)',
              'Still references correct role_id'
            ]
          }
        },
        {
          id: 'link-6',
          title: '3.6 Verify ProvisioningUser Status',
          dbCheck: {
            entity: 'ProvisioningUser',
            filter: 'email = YOUR_TEST_EMAIL',
            expectedFields: [
              'apply_status = ACTIVE',
              'base44_user_id populated',
              'linked_at timestamp populated'
            ]
          }
        },
        {
          id: 'link-7',
          title: '3.7 Verify Tenant Resolution (if client_id missing)',
          instructions: (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Test scenario: User has no client_id set</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>In User entity, find test user and remove client_id field</li>
                <li>Logout and login again</li>
                <li>FirstLoginLinker should still work by looking up UserProfile by email</li>
                <li>Verify linking succeeds and derives correct tenant_id from UserProfile</li>
              </ol>
              <Alert className="bg-blue-50 border-blue-200 mt-2">
                <AlertDescription className="text-blue-800 text-sm">
                  This validates the fallback tenant resolution logic when user.client_id is missing
                </AlertDescription>
              </Alert>
            </div>
          ),
          verification: 'Linking works without client_id, derives tenant from UserProfile'
        }
      ]
    },
    {
      id: 'wix',
      title: 'Part 4: Wix Integration Preparation',
      icon: Server,
      critical: true,
      steps: [
        {
          id: 'wix-1',
          title: '4.1 Generate and Store API Key',
          instructions: (
            <div className="space-y-2">
              <p className="text-sm font-semibold mb-2">On your terminal:</p>
              <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
{`# Generate secure API key
openssl rand -hex 32

# Example output:
# 8f3a2b1c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0`}
              </pre>
              <Alert className="bg-yellow-50 border-yellow-200 mt-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 text-sm">
                  <strong>Store this key securely!</strong> You'll need to:
                  <ol className="list-decimal list-inside mt-1">
                    <li>Add to Base44 secrets as <code>PROVISIONING_API_KEY</code></li>
                    <li>Share with Wix team (encrypted/secure channel)</li>
                    <li>Never commit to git or share in plain text</li>
                  </ol>
                </AlertDescription>
              </Alert>
            </div>
          ),
          verification: 'API key generated and stored in Base44 secrets'
        },
        {
          id: 'wix-2',
          title: '4.2 Implement API Key Verification',
          instructions: (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Update ALL HTTP-callable provisioning functions:</p>
              <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
{`// Add to each function BEFORE processing request:
const authHeader = req.headers.get('authorization');
const expectedAuth = 'Bearer ' + Deno.env.get('PROVISIONING_API_KEY');

if (authHeader !== expectedAuth) {
  return Response.json(
    { error: 'Unauthorized: Invalid or missing API key' },
    { status: 401 }
  );
}`}
              </pre>
              <p className="text-sm text-gray-600 mt-2">Functions to update:</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li><code>provisioningHealth</code></li>
                <li><code>provisioningCreateBatch</code></li>
                <li><code>provisioningApplyBatch</code></li>
                <li><code>provisioningExportInvalidCSV</code></li>
                <li><code>provisioningExportStatusCSV</code></li>
              </ul>
            </div>
          ),
          verification: 'All functions reject requests without valid API key (401)'
        },
        {
          id: 'wix-3',
          title: '4.3 Test API Key Authentication',
          curl: `# Test with WRONG key (should fail)
curl -X GET "${appDomain}/api/functions/provisioningHealth" \\
  -H "Authorization: Bearer wrong_key_12345" \\
  -v

# Expected: 401 Unauthorized

# Test with CORRECT key (should succeed)
curl -X GET "${appDomain}/api/functions/provisioningHealth" \\
  -H "Authorization: Bearer YOUR_ACTUAL_API_KEY" \\
  -v

# Expected: 200 OK`,
          expected: {
            wrongKey: { status: 401, body: { error: 'Unauthorized' } },
            correctKey: { status: 200, body: { ok: true } }
          },
          verification: 'Wrong key returns 401, correct key returns 200'
        },
        {
          id: 'wix-4',
          title: '4.4 Document Wix Webhook Configuration',
          instructions: (
            <div className="space-y-3">
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-blue-800">
                  <strong>Wix Configuration:</strong> Provide this to Wix integration team
                </AlertDescription>
              </Alert>
              <div className="bg-gray-50 border rounded p-3 space-y-2">
                <p className="font-semibold text-sm">Webhook Endpoint:</p>
                <code className="block bg-gray-900 text-gray-100 p-2 rounded text-xs">
                  POST {appDomain}/api/functions/provisioningCreateBatch
                </code>
                
                <p className="font-semibold text-sm mt-3">Required Headers:</p>
                <pre className="bg-gray-900 text-gray-100 p-2 rounded text-xs">
{`Content-Type: application/json
Authorization: Bearer <PROVISIONING_API_KEY>
X-Idempotency-Key: <uuid-per-batch>`}
                </pre>

                <p className="font-semibold text-sm mt-3">Payload Format:</p>
                <pre className="bg-gray-900 text-gray-100 p-2 rounded text-xs overflow-x-auto">
{`{
  "tenantId": "<wix_site_id>",
  "sourceSystem": "WIX",
  "fileName": "wix_members_sync_<timestamp>.json",
  "sourceBatchRef": "<wix_webhook_id>",
  "records": [
    {
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "department": "Sales",
      "appRole": "user",
      "customRoles": ["member"],
      "externalUserRef": "<wix_member_id>"
    }
  ]
}`}
                </pre>

                <p className="font-semibold text-sm mt-3">Response Codes:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li><code>200</code> - Batch created successfully, returns batchId</li>
                  <li><code>401</code> - Invalid API key</li>
                  <li><code>409</code> - Idempotency conflict (duplicate key with different body)</li>
                  <li><code>500</code> - Server error</li>
                </ul>
              </div>
            </div>
          ),
          verification: 'Documentation shared with Wix team'
        },
        {
          id: 'wix-5',
          title: '4.5 API Key Rotation Plan',
          instructions: (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Key Rotation Procedure:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Generate new API key: <code>openssl rand -hex 32</code></li>
                <li>Update Base44 secret: <code>PROVISIONING_API_KEY</code></li>
                <li>Notify Wix team with new key (24h notice)</li>
                <li>Wix updates their webhook configuration</li>
                <li>Monitor for successful requests with new key</li>
                <li>Old key remains valid for 7 days grace period</li>
              </ol>
              <Alert className="bg-yellow-50 border-yellow-200 mt-2">
                <AlertDescription className="text-yellow-800 text-sm">
                  <strong>Recommended rotation:</strong> Every 90 days or after security incident
                </AlertDescription>
              </Alert>
            </div>
          ),
          verification: 'Rotation procedure documented and tested'
        }
      ]
    }
  ];

  const allSteps = sections.flatMap(s => s.steps);
  const completedCount = allSteps.filter(step => checklist[step.id]).length;
  const progressPercent = Math.round((completedCount / allSteps.length) * 100);

  const criticalFailed = sections.filter(s => s.critical).some(s => 
    s.steps.some(step => !checklist[step.id])
  );

  const isReadyForWix = completedCount === allSteps.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Provisioning Gateway - Manual Validation Pack
        </h1>
        <p className="text-gray-600">
          Complete all steps before Wix integration. Required for Go/No-Go decision.
        </p>
      </div>

      {/* Progress Card */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Validation Progress</CardTitle>
            <Badge 
              variant={isReadyForWix ? 'default' : 'outline'}
              className={isReadyForWix ? 'bg-green-100 text-green-800 border-green-200' : ''}
            >
              {completedCount} / {allSteps.length} Complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            
            {isReadyForWix ? (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>GO FOR WIX INTEGRATION ✓</strong>
                  <br />
                  All critical paths validated. Backend logic, HTTP endpoints, UI flow, and authentication verified.
                </AlertDescription>
              </Alert>
            ) : criticalFailed ? (
              <Alert className="bg-red-50 border-red-200">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>NO-GO FOR WIX</strong>
                  <br />
                  Critical steps incomplete. Complete all authentication and HTTP endpoint tests before proceeding.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>Validation In Progress</strong>
                  <br />
                  Complete all steps to determine Wix readiness. Check off items as you verify them.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Go/No-Go Criteria */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Go/No-Go Decision Criteria</CardTitle>
          <CardDescription>Ready for Wix = YES only if ALL of the following pass:</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { condition: 'Part 0: API key authentication implemented and tested', critical: true },
              { condition: 'Part 1: All HTTP endpoint tests pass (live execution)', critical: true },
              { condition: 'Part 2: UI Apply + Invite flow works end-to-end', critical: true },
              { condition: 'Part 3: First-login linking verified with real user', critical: true },
              { condition: 'Part 4: Wix webhook configuration documented and shared', critical: true },
              { condition: 'Idempotency works (same key returns cached response)', critical: true },
              { condition: 'Invalid auth returns 401 (security verified)', critical: true },
              { condition: 'Cross-tenant isolation verified (no data leaks)', critical: false }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {item.critical ? (
                  <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
                <span className={`text-sm ${item.critical ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                  {item.condition}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Steps */}
      <div className="space-y-6">
        {sections.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <section.icon className="w-5 h-5 text-gray-600" />
                  <div>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    {section.critical && (
                      <Badge variant="destructive" className="mt-1">CRITICAL</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {section.steps.map((step) => (
                  <div key={step.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={!!checklist[step.id]}
                        onCheckedChange={() => toggleCheck(step.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-2">{step.title}</h4>
                        
                        {step.description && (
                          <p className="text-sm text-gray-600 mb-3">{step.description}</p>
                        )}

                        {step.instructions && (
                          <div className="mb-3">
                            <p className="text-sm font-semibold text-gray-700 mb-2">Instructions:</p>
                            {step.instructions}
                          </div>
                        )}

                        {step.curl && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-semibold text-gray-700">cURL Command:</p>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(step.curl)}
                              >
                                <Copy className="w-4 h-4 mr-1" />
                                Copy
                              </Button>
                            </div>
                            <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
                              {step.curl}
                            </pre>
                          </div>
                        )}

                        {step.expected && (
                          <div className="mb-3">
                            <p className="text-sm font-semibold text-gray-700 mb-2">Expected Response:</p>
                            <pre className="bg-green-50 border border-green-200 text-green-900 p-3 rounded text-xs overflow-x-auto">
                              {typeof step.expected === 'object' 
                                ? JSON.stringify(step.expected, null, 2)
                                : step.expected
                              }
                            </pre>
                          </div>
                        )}

                        {step.expectedOutcome && (
                          <div className="mb-3">
                            <p className="text-sm font-semibold text-gray-700">Expected Outcome:</p>
                            <p className="text-sm text-gray-600">{step.expectedOutcome}</p>
                          </div>
                        )}

                        {step.dbCheck && (
                          <div className="bg-blue-50 border border-blue-200 rounded p-3">
                            <p className="text-sm font-semibold text-blue-900 mb-2">
                              <Database className="w-4 h-4 inline mr-1" />
                              Database Verification:
                            </p>
                            <ul className="space-y-1 text-sm text-blue-800">
                              <li><strong>Entity:</strong> {step.dbCheck.entity}</li>
                              {step.dbCheck.filter && <li><strong>Filter:</strong> {step.dbCheck.filter}</li>}
                              <li>
                                <strong>Expected Fields:</strong>
                                <ul className="list-disc list-inside ml-4 mt-1">
                                  {step.dbCheck.expectedFields.map((field, idx) => (
                                    <li key={idx}>{field}</li>
                                  ))}
                                </ul>
                              </li>
                            </ul>
                          </div>
                        )}

                        {step.verification && (
                          <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded">
                            <p className="text-xs font-semibold text-gray-700">✓ Success Criteria:</p>
                            <p className="text-xs text-gray-600">{step.verification}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Final Notes */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Important Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-700">
            <p><strong>1. Authentication is NOT optional:</strong> Wix webhook calls require API key verification. Browser session cookies won't work.</p>
            <p><strong>2. Test with production-like data:</strong> Use real email addresses you control for linking tests.</p>
            <p><strong>3. Monitor logs:</strong> Check browser console and server logs for errors during testing.</p>
            <p><strong>4. Idempotency is critical:</strong> Wix may retry webhooks. Same idempotency key must return cached response.</p>
            <p><strong>5. Document everything:</strong> Take screenshots of successful tests and save curl outputs.</p>
            <p><strong>6. Security first:</strong> Never share API keys in plain text. Use encrypted channels only.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}