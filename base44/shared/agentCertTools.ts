/**
 * Agent certification/assessment tools — extracted from invokeAgent for
 * tenant-scope security. These functions run under the service role, so
 * every cross-tenant access must be explicitly gated.
 */

const ADMIN_ROLES = ['Admin Level 1', 'Admin Level 2', 'Super Administrator', 'Platform Admin'];
const RECOMMEND_ROLES = [...ADMIN_ROLES, 'Analyst', 'User Level 2', 'User Level 3'];

/**
 * Verify that a target user (by email) belongs to the caller's tenant.
 * Returns { ok: true } or { ok: false, message }.
 * Platform Admin is exempt.
 */
async function verifyTenantScope(base44, caller, targetEmail) {
  if (caller.app_role === 'Platform Admin') return { ok: true };

  let targetUser = null;
  try {
    const targetUsers = await base44.asServiceRole.entities.User.filter({ email: targetEmail });
    targetUser = targetUsers[0];
  } catch (_) {}

  const callerClientId = caller.client_id || caller.data?.client_id;

  if (caller.app_role === 'Partner Business Administrator' && caller.partner_id) {
    const clients = await base44.asServiceRole.entities.Client.list();
    const partnerClientIds = clients.filter(c => c.partner_id === caller.partner_id).map(c => c.id);
    if (!targetUser || !partnerClientIds.includes(targetUser.client_id)) {
      return { ok: false, message: 'Forbidden — target user is outside your partner scope.' };
    }
  } else if (!targetUser || targetUser.client_id !== callerClientId) {
    return { ok: false, message: 'Forbidden — target user is outside your tenant.' };
  }

  return { ok: true, targetUser };
}

export async function executeVerifyCertification(base44, user, params) {
  const { userEmail, certificationName, issuingBody, verificationUrl } = params;
  if (!ADMIN_ROLES.includes(user.app_role)) return { message: 'Only administrators may verify certifications.' };

  // Get client_id: try target user first, then admin, then use 'default'
  let clientId = null;
  try {
    const targetUsers = await base44.asServiceRole.entities.User.filter({ email: userEmail });
    clientId = targetUsers.length > 0 ? targetUsers[0].client_id : null;
  } catch (error) {
    console.log('Could not fetch target user for client_id');
  }

  // Security: Non-Platform-Admin callers may only verify certifications for
  // users in their own tenant (or partner scope).
  const scope = await verifyTenantScope(base44, user, userEmail);
  if (!scope.ok) return { message: scope.message };

  // Fallback to admin's client_id
  if (!clientId) {
    clientId = user.client_id || 'default_client';
  }

  // Create certification record with verified status directly
  const certification = await base44.asServiceRole.entities.Certification.create({
    user_email: userEmail,
    client_id: clientId,
    name: certificationName,
    issuing_body: issuingBody,
    credential_id_or_url: verificationUrl,
    status: 'verified',
    verified_by: user.email,
    verified_at: new Date().toISOString(),
    issue_date: new Date().toISOString().split('T')[0]
  });

  // Create notification
  await base44.asServiceRole.entities.Notification.create({
    user_email: userEmail,
    type: 'certification_status',
    title: 'Certification Verified',
    message: `Your ${certificationName} certification has been verified by ${user.full_name}.`,
    scheduled_for: new Date().toISOString(),
    priority: 'medium',
    related_entity_type: 'Certification',
    related_entity_id: certification.id
  });

  return {
    message: `✅ Certification verified for ${userEmail}\n\n📜 ${certificationName} from ${issuingBody}`,
    certification_id: certification.id
  };
}

export async function executeProcessExternalAssessment(base44, user, params) {
  const { userEmail, assessmentType, fileUrl, keyFindings } = params;
  if (!ADMIN_ROLES.includes(user.app_role)) return { message: 'Only administrators may process external assessments.' };

  // Get client_id: try target user first, then admin, then use 'default'
  let clientId = null;
  try {
    const targetUsers = await base44.asServiceRole.entities.User.filter({ email: userEmail });
    clientId = targetUsers.length > 0 ? targetUsers[0].client_id : null;
  } catch (error) {
    console.log('Could not fetch target user for client_id');
  }

  // Security: Non-Platform-Admin callers may only process assessments for
  // users in their own tenant (or partner scope).
  const scope = await verifyTenantScope(base44, user, userEmail);
  if (!scope.ok) return { message: scope.message };

  // Fallback to admin's client_id
  if (!clientId) {
    clientId = user.client_id || 'default_client';
  }

  // Create external assessment with verified status directly
  const assessment = await base44.asServiceRole.entities.ExternalAssessmentResult.create({
    user_email: userEmail,
    client_id: clientId,
    assessment_type: assessmentType,
    document_uri: fileUrl,
    designation_or_score: keyFindings || 'Results processed',
    date_completed: new Date().toISOString().split('T')[0],
    status: 'verified',
    verified_by: user.email,
    verified_at: new Date().toISOString(),
    ai_summary: keyFindings
  });

  // Create notification
  await base44.asServiceRole.entities.Notification.create({
    user_email: userEmail,
    type: 'assessment_status',
    title: 'External Assessment Processed',
    message: `Your ${assessmentType} assessment has been processed: ${keyFindings}`,
    scheduled_for: new Date().toISOString(),
    priority: 'medium',
    related_entity_type: 'ExternalAssessmentResult',
    related_entity_id: assessment.id
  });

  return {
    message: `✅ Processed ${assessmentType} assessment for ${userEmail}\n\n📊 Key findings: ${keyFindings}`,
    assessment_id: assessment.id
  };
}

export async function executeRecommendCareerPathFromCerts(base44, user, params) {
  const { userEmail, includeGapAnalysis = true } = params;

  // Security: Gate to authorized roles.
  if (!RECOMMEND_ROLES.includes(user.app_role)) {
    return { message: 'Only authorized users may request career path recommendations.' };
  }

  // Security: For non-Platform-Admin callers, verify the target user is in the
  // caller's tenant before reading their certification/assessment data.
  // Self-queries (userEmail === user.email) are always allowed.
  if (userEmail !== user.email) {
    const scope = await verifyTenantScope(base44, user, userEmail);
    if (!scope.ok) return { message: scope.message };
  }

  const [certs, extAssessments] = await Promise.all([
    base44.asServiceRole.entities.Certification.filter({ user_email: userEmail, status: 'verified' }),
    base44.asServiceRole.entities.ExternalAssessmentResult.filter({ user_email: userEmail, status: 'verified' })
  ]);

  const prompt = `Recommend career paths for a user with:

Certifications: ${certs.map(c => c.name).join(', ') || 'None'}
External Assessments: ${extAssessments.map(a => `${a.assessment_type}: ${a.designation_or_score}`).join(', ') || 'None'}

${includeGapAnalysis ? 'Include gap analysis showing what additional qualifications would strengthen each path.' : ''}

Return top 3 career paths with readiness scores.`;

  const paths = await base44.integrations.Core.InvokeLLM({
    prompt: prompt,
    response_json_schema: {
      type: "object",
      properties: {
        recommended_paths: {
          type: "array",
          items: {
            type: "object",
            properties: {
              role: { type: "string" },
              readiness_score: { type: "number" },
              reasoning: { type: "string" },
              gaps: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    }
  });

  return {
    message: `**Career Path Recommendations:**\n\n${paths.recommended_paths.map((p, i) => `**${i + 1}. ${p.role}** (${p.readiness_score}% ready)\n${p.reasoning}\n${includeGapAnalysis ? `\nGaps:\n${p.gaps.map(g => `• ${g}`).join('\n')}` : ''}`).join('\n\n')}`,
    career_paths: paths.recommended_paths
  };
}