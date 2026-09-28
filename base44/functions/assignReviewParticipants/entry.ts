import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

/**
 * Bulk-assigns a participant roster to a review cycle.
 * Validates that all assigned emails belong to tenant users.
 *
 * Payload: {
 *   review_cycle_id: string,
 *   participants: [{ employee_email, employee_name?, manager_email?, peer_emails?, self_assessment_due?, manager_review_due? }]
 * }
 * Returns: { assigned: number, participants: ReviewParticipant[] } or { error, invalid_emails }
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { review_cycle_id, participants } = body;

    if (!review_cycle_id || !participants || !Array.isArray(participants)) {
      return Response.json({ error: "review_cycle_id and participants array required" }, { status: 400 });
    }

    const clientId = user.data?.client_id;
    if (!clientId) return Response.json({ error: "No client context" }, { status: 403 });

    // Collect all unique emails to validate
    const allEmails = new Set<string>();
    for (const p of participants) {
      if (p.employee_email) allEmails.add(String(p.employee_email).toLowerCase().trim());
      if (p.manager_email) allEmails.add(String(p.manager_email).toLowerCase().trim());
      if (p.peer_emails && Array.isArray(p.peer_emails)) {
        for (const e of p.peer_emails) allEmails.add(String(e).toLowerCase().trim());
      }
    }

    // Validate against tenant users
    const tenantUsers = await base44.asServiceRole.entities.User.list(500);
    const tenantEmails = new Set(
      tenantUsers.map((u: any) => u.email?.toLowerCase()).filter(Boolean)
    );
    const invalidEmails = [...allEmails].filter(e => !tenantEmails.has(e));

    if (invalidEmails.length > 0) {
      return Response.json({
        error: "Some assigned emails are not users in this tenant",
        invalid_emails: invalidEmails,
      }, { status: 400 });
    }

    // Remove existing roster for this cycle (replace mode)
    await base44.asServiceRole.entities.ReviewParticipant.deleteMany({
      review_cycle_id,
      client_id: clientId,
    });

    // Create new participant records
    const records = participants.map((p: any) => ({
      client_id: clientId,
      review_cycle_id,
      employee_email: String(p.employee_email).toLowerCase().trim(),
      employee_name: p.employee_name || "",
      manager_email: p.manager_email ? String(p.manager_email).toLowerCase().trim() : "",
      peer_emails: Array.isArray(p.peer_emails)
        ? p.peer_emails.map((e: string) => String(e).toLowerCase().trim())
        : [],
      self_assessment_due: p.self_assessment_due || null,
      manager_review_due: p.manager_review_due || null,
      status: "assigned",
    }));

    const created = await base44.asServiceRole.entities.ReviewParticipant.bulkCreate(records);

    return Response.json({
      assigned: created.length,
      participants: created,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}