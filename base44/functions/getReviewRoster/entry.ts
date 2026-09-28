import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

/**
 * Fetches the participant roster for a review cycle, enriched with submission status.
 * For each participant, checks whether self-assessment, manager review, and peer feedback
 * have been submitted.
 *
 * Payload: { review_cycle_id: string }
 * Returns: { roster: EnrichedParticipant[], total: number, completion_stats: {...} }
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { review_cycle_id } = body;

    if (!review_cycle_id) return Response.json({ error: "review_cycle_id required" }, { status: 400 });

    // Fetch roster and submissions in parallel
    const [roster, submissions] = await Promise.all([
      base44.asServiceRole.entities.ReviewParticipant.filter({ review_cycle_id }),
      base44.asServiceRole.entities.CustomFormSubmission.filter({ review_cycle_id }, "-submitted_at"),
    ]);

    // Enrich each roster entry with submission status
    const enriched = roster.map((p: any) => {
      const selfSub = submissions.find((s: any) =>
        s.linked_employee_email === p.employee_email && s.submitter_role === "self"
      );
      const managerSub = submissions.find((s: any) =>
        s.linked_employee_email === p.employee_email && s.submitter_role === "manager"
      );
      const peerSubs = submissions.filter((s: any) =>
        s.linked_employee_email === p.employee_email && s.submitter_role === "peer"
      );
      const acknowledged = submissions.find((s: any) =>
        s.linked_employee_email === p.employee_email && s.acknowledged_at
      );

      const selfDone = !!selfSub;
      const mgrDone = !!managerSub;
      const peerDone = peerSubs.length >= (p.peer_emails?.length || 0);

      let status = "assigned";
      if (acknowledged) status = "acknowledged";
      else if (selfDone && mgrDone) status = "completed";
      else if (mgrDone) status = "manager_submitted";
      else if (selfDone) status = "self_submitted";

      return {
        ...p,
        self_assessment_submitted: selfDone,
        manager_review_submitted: mgrDone,
        peer_reviews_submitted: peerSubs.length,
        peer_reviews_expected: p.peer_emails?.length || 0,
        peer_reviews_complete: peerDone,
        acknowledged: !!acknowledged,
        status,
      };
    });

    // Compute completion stats
    const stats = {
      total: enriched.length,
      self_submitted: enriched.filter(p => p.self_assessment_submitted).length,
      manager_submitted: enriched.filter(p => p.manager_review_submitted).length,
      completed: enriched.filter(p => p.status === "completed").length,
      acknowledged: enriched.filter(p => p.acknowledged).length,
    };

    return Response.json({ roster: enriched, total: enriched.length, completion_stats: stats });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}