import { createClientFromRequest } from 'npm:@base44/sdk@0.8.51';
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { deriveServerOwnedPermissions, BASE_ROLE_PERMISSIONS } from "../../shared/successionRolePermissions.ts";

/**
 * successionPrivilegeEscalationTest — table-driven privilege-escalation
 * regression suite.
 *
 * Tests that an ordinary user CANNOT self-grant permissions via the
 * platform-owned updateMe method (or any user-update path) and have
 * the backend authorization layer honor them.
 *
 * Method:
 * 1. Get the current authenticated user.
 * 2. Save original authorization state (data.permissions, permissions).
 * 3. For each escalation vector, temporarily write the privileged field
 *    via asServiceRole (simulating what updateMe would do).
 * 4. Call bootstrapSuccessionAuth and verify the self-granted permission
 *    is NOT in auth.permissions.
 * 5. Call authorizeSuccessionAction with the self-granted permission and
 *    verify denial.
 * 6. Restore original authorization state.
 * 7. Run positive tests (admin path via dedicated function).
 *
 * This test MODIFIES the current user's data temporarily. It saves and
 * restores the original state. If the test crashes before restore, the
 * user's data.permissions may be left in a modified state — the restore
 * is in a finally block to minimize this risk.
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const results: any[] = [];
  let originalDataPermissions: any = undefined;
  let originalPermissions: any = undefined;
  let user: any = null;

  try {
    user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Save original state
    originalDataPermissions = user.data?.permissions;
    originalPermissions = user.permissions;

    const role = user.app_role || user.data?.app_role || user.role || 'user';
    const isOrdinaryUser = !['Platform Admin', 'Super Administrator', 'Admin Level 2',
      'Partner Business Administrator', 'Admin Level 1'].includes(role);

    // ── Helper: write data.permissions and verify it's not trusted ────────
    const testEscalation = async (
      testId: string,
      testName: string,
      fieldPath: 'data.permissions' | 'permissions',
      payload: any,
      expectedDeniedPermission: string
    ) => {
      try {
        // Simulate updateMe by writing the privileged field via asServiceRole
        const updatePayload: any = {};
        if (fieldPath === 'data.permissions') {
          updatePayload.data = { ...(user.data || {}), permissions: payload };
        } else {
          updatePayload.permissions = payload;
        }
        await base44.asServiceRole.entities.User.update(user.id, updatePayload);

        // Re-fetch the user to simulate a fresh session
        const refreshedUser = await base44.auth.me();

        // Call bootstrapSuccessionAuth — the centralized authorization layer
        const auth = await bootstrapSuccessionAuth(base44);

        // Check 1: The self-granted permission must NOT be in auth.permissions
        // (unless the user's role already grants it)
        const rolePermissions = BASE_ROLE_PERMISSIONS[role] || [];
        const hasRolePermission = rolePermissions.includes(expectedDeniedPermission);
        const hasAuthPermission = auth.permissions.includes(expectedDeniedPermission);

        // Check 2: authorizeSuccessionAction must DENY the action
        const authResult = await authorizeSuccessionAction({
          base44,
          auth,
          action: 'test_escalation',
          required_permission: expectedDeniedPermission,
          target_entity_type: 'TestEntity',
          target_entity_id: 'test',
        });

        const passed = hasRolePermission
          ? true // If role already grants it, the test is N/A (user legitimately has it)
          : (!hasAuthPermission && !authResult.allowed);

        results.push({
          id: testId,
          name: testName,
          passed,
          details: {
            fieldPath,
            expectedDenied: expectedDeniedPermission,
            roleAlreadyGrants: hasRolePermission,
            authHasPermission: hasAuthPermission,
            authResultAllowed: authResult.allowed,
            deniedReason: authResult.denied_reason,
          },
        });
      } catch (err: any) {
        results.push({
          id: testId,
          name: testName,
          passed: false,
          details: { error: err.message || String(err) },
        });
      }
    };

    // ── NEGATIVE TESTS: Self-grant attempts ──────────────────────────────
    // These tests work for ALL users (including admins) by verifying that
    // a FAKE permission written to data.permissions is NOT merged into
    // auth.permissions. For ordinary users, we also test real succession
    // permissions are denied.

    // Universal test: fake permission in data.permissions must NOT appear
    // in auth.permissions (works for any role)
    await testEscalation('ESC-00', 'Fake permission in data.permissions not merged (universal)',
      'data.permissions', ['FAKE_PERMISSION_ESCALATION_TEST_XYZ'], 'FAKE_PERMISSION_ESCALATION_TEST_XYZ');

    if (isOrdinaryUser) {
      // 1. Self-grant succession.cycles.view via data.permissions
      await testEscalation('ESC-01', 'Self-grant succession.cycles.view via data.permissions',
        'data.permissions', ['succession.cycles.view'], 'succession.cycles.view');

      // 2. Self-grant succession.evidence.manage via data.permissions
      await testEscalation('ESC-02', 'Self-grant succession.evidence.manage via data.permissions',
        'data.permissions', ['succession.evidence.manage'], 'succession.evidence.manage');

      // 3. Self-grant succession.transition.manage via data.permissions
      await testEscalation('ESC-03', 'Self-grant succession.transition.manage via data.permissions',
        'data.permissions', ['succession.transition.manage'], 'succession.transition.manage');

      // 4. Self-grant wildcard * via data.permissions
      await testEscalation('ESC-04', 'Self-grant wildcard * via data.permissions',
        'data.permissions', ['*'], 'succession.cycles.view');

      // 5. Self-grant via top-level permissions field
      await testEscalation('ESC-05', 'Self-grant succession.cycles.view via top-level permissions',
        'permissions', ['succession.cycles.view'], 'succession.cycles.view');

      // 6. Self-grant assessment-admin permission via data.permissions
      await testEscalation('ESC-06', 'Self-grant leadership_index.assign via data.permissions',
        'data.permissions', ['leadership_index.assign'], 'leadership_index.assign');

      // 7. Nested privileged fields (data.permissions inside nested object)
      await testEscalation('ESC-07', 'Self-grant via nested data.permissions object',
        'data.permissions', { 'succession.cycles.view': true }, 'succession.cycles.view');

      // 8. Mixed valid profile + privileged fields
      try {
        await base44.asServiceRole.entities.User.update(user.id, {
          data: { ...(user.data || {}), permissions: ['succession.cycles.view'], display_name: 'Test' },
          display_name: 'Test',
        });
        const auth = await bootstrapSuccessionAuth(base44);
        const hasPerm = auth.permissions.includes('succession.cycles.view');
        const rolePerms = BASE_ROLE_PERMISSIONS[role] || [];
        results.push({
          id: 'ESC-08',
          name: 'Mixed valid profile + privileged fields',
          passed: rolePerms.includes('succession.cycles.view') ? true : !hasPerm,
          details: { authHasPermission: hasPerm, roleAlreadyGrants: rolePerms.includes('succession.cycles.view') },
        });
      } catch (err: any) {
        results.push({ id: 'ESC-08', name: 'Mixed valid profile + privileged fields', passed: false, details: { error: err.message } });
      }

      // 9. Array variant (permissions as array of objects)
      await testEscalation('ESC-09', 'Self-grant via array of objects',
        'data.permissions', [{ key: 'succession.cycles.view' }], 'succession.cycles.view');

      // 10. Case variant
      await testEscalation('ESC-10', 'Self-grant via case variant SUCCESSION.CYCLES.VIEW',
        'data.permissions', ['SUCCESSION.CYCLES.VIEW'], 'succession.cycles.view');

      // 11. Whitespace variant
      await testEscalation('ESC-11', 'Self-grant via whitespace variant',
        'data.permissions', [' succession.cycles.view '], 'succession.cycles.view');

      // 12. Unknown privileged field (data.app_role override attempt)
      try {
        await base44.asServiceRole.entities.User.update(user.id, {
          data: { ...(user.data || {}), app_role: 'Admin Level 2' },
        });
        const refreshedUser = await base44.auth.me();
        const auth = await bootstrapSuccessionAuth(base44);
        const escalatedToAdmin = auth.role === 'Admin Level 2' && role !== 'Admin Level 2';
        results.push({
          id: 'ESC-12',
          name: 'Self-grant app_role via data.app_role',
          passed: !escalatedToAdmin,
          details: { originalRole: role, authRole: auth.role, escalated: escalatedToAdmin },
        });
      } catch (err: any) {
        results.push({ id: 'ESC-12', name: 'Self-grant app_role via data.app_role', passed: false, details: { error: err.message } });
      }

      // 13. Self-grant client_id (tenant switching)
      try {
        await base44.asServiceRole.entities.User.update(user.id, {
          data: { ...(user.data || {}), client_id: 'foreign-tenant-123' },
        });
        const auth = await bootstrapSuccessionAuth(base44);
        const switchedTenant = auth.client_id === 'foreign-tenant-123';
        results.push({
          id: 'ESC-13',
          name: 'Self-grant client_id (tenant switch)',
          passed: !switchedTenant,
          details: { originalClientId: user.client_id || user.data?.client_id, authClientId: auth.client_id, switched: switchedTenant },
        });
      } catch (err: any) {
        results.push({ id: 'ESC-13', name: 'Self-grant client_id (tenant switch)', passed: false, details: { error: err.message } });
      }
    } else {
      // For admin users, skip negative tests (they legitimately have permissions)
      results.push({
        id: 'ESC-SKIP',
        name: 'Negative escalation tests skipped (admin user)',
        passed: true,
        skipped: true,
        details: { role, note: 'Admin users legitimately hold succession permissions; negative tests are for ordinary users only.' },
      });
    }

    // ── POSITIVE TESTS: Admin path via dedicated function ─────────────────
    // Verify that the server-owned derivation produces the CORRECT permissions
    // for the user's role
    try {
      const auth = await bootstrapSuccessionAuth(base44);
      const expectedBase = BASE_ROLE_PERMISSIONS[role] || [];
      const hasAllBase = expectedBase.every((p: string) => auth.permissions.includes(p));

      results.push({
        id: 'POS-01',
        name: 'Server-owned derivation includes all role permissions',
        passed: hasAllBase,
        details: {
          role,
          expectedBaseCount: expectedBase.length,
          authPermissionCount: auth.permissions.length,
          hasAllBase,
        },
      });
    } catch (err: any) {
      results.push({ id: 'POS-01', name: 'Server-owned derivation includes all role permissions', passed: false, details: { error: err.message } });
    }

    // Verify CustomRole permissions are merged (if user has one)
    try {
      const customRoleId = user.custom_role_id || user.data?.custom_role_id;
      if (customRoleId) {
        const customRoles = await base44.asServiceRole.entities.CustomRole.filter({ id: customRoleId });
        if (customRoles.length > 0) {
          const customRolePerms = customRoles[0].permissions || [];
          const auth = await bootstrapSuccessionAuth(base44);
          const hasAllCustom = customRolePerms.every((p: string) => auth.permissions.includes(p));
          results.push({
            id: 'POS-02',
            name: 'CustomRole permissions merged into auth.permissions',
            passed: hasAllCustom,
            details: { customRoleId, customRolePermCount: customRolePerms.length, hasAllCustom },
          });
        } else {
          results.push({ id: 'POS-02', name: 'CustomRole permissions merged', passed: true, skipped: true, details: { note: 'CustomRole not found' } });
        }
      } else {
        results.push({ id: 'POS-02', name: 'CustomRole permissions merged', passed: true, skipped: true, details: { note: 'No custom_role_id' } });
      }
    } catch (err: any) {
      results.push({ id: 'POS-02', name: 'CustomRole permissions merged', passed: false, details: { error: err.message } });
    }

    // ── Restore original state ─────────────────────────────────────────────
  } finally {
    // Restore original authorization state
    if (user) {
      try {
        const restorePayload: any = {};
        if (originalDataPermissions !== undefined) {
          restorePayload.data = { ...(user.data || {}), permissions: originalDataPermissions };
        } else {
          // Remove the permissions field from data if it wasn't there originally
          const cleanData = { ...(user.data || {}) };
          delete cleanData.permissions;
          restorePayload.data = cleanData;
        }
        if (originalPermissions !== undefined) {
          restorePayload.permissions = originalPermissions;
        }
        await base44.asServiceRole.entities.User.update(user.id, restorePayload);
      } catch (restoreErr) {
        console.error('Failed to restore user state:', restoreErr);
      }
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  const passed = results.filter((r) => r.passed && !r.skipped).length;
  const failed = results.filter((r) => !r.passed && !r.skipped).length;
  const skipped = results.filter((r) => r.skipped).length;
  const total = results.length;

  return Response.json({
    timestamp: new Date().toISOString(),
    user_role: user?.app_role || user?.data?.app_role || user?.role || 'unknown',
    is_ordinary_user: !['Platform Admin', 'Super Administrator', 'Admin Level 2',
      'Partner Business Administrator', 'Admin Level 1'].includes(user?.app_role || user?.data?.app_role || user?.role || ''),
    summary: { passed, failed, skipped, total },
    tests: results,
  });
});