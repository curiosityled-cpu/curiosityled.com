import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import {
  fetchManagerSignals,
  buildManagerBundle,
  resolveHRBPManagerEmails,
} from "../../shared/portfolioData.ts";

const ADMIN_ROLES = [
  "Admin Level 2",
  "Super Administrator",
  "Platform Admin",
  "Partner Business Administrator",
];

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const targetHrbpEmail = body.hrbp_email || user.email;
    const scopeOnly = !!body.scope_only;

    const userRole = user.app_role || user.data?.app_role || user.role;
    const isAdmin = ADMIN_ROLES.includes(userRole);
    if (targetHrbpEmail !== user.email && !isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Resolve own portfolio + active delegations (shared scoping logic)
    const { managers, ownPortfolios, delegationSummaries } =
      await resolveHRBPManagerEmails(base44, targetHrbpEmail);

    const portfolioSummary = (p) => ({
      id: p.id,
      assignment_type: p.assignment_type,
      label: p.label,
      business_unit: p.business_unit,
      department: p.department,
      team: p.team,
      scope_client_id: p.scope_client_id,
      manager_count: p.assignment_type === "explicit" ? p.manager_emails?.length || 0 : null,
      status: p.status,
    });

    // 6. Scope-only: lightweight response for lens scoping (no signal fetch)
    if (scopeOnly) {
      return Response.json({
        hrbp_email: targetHrbpEmail,
        portfolios: ownPortfolios.map(portfolioSummary),
        delegations: delegationSummaries,
        manager_emails: managers.map((m) => m.email),
        manager_count: managers.length,
        delegated_manager_count: managers.filter((m) => m.delegated_from).length,
      });
    }

    // 7. Full: fetch signals + interventions + build bundles
    const managerEmails = managers.map((m) => m.email);
    const signals = await fetchManagerSignals(base44, managerEmails);
    const interventions = await base44.asServiceRole.entities.HRBPIntervention.filter({
      hrbp_email: targetHrbpEmail,
    });
    const managerBundles = managers.map((m) => ({
      ...buildManagerBundle(m, signals),
      delegated_from: m.delegated_from || null,
      delegation_id: m.delegation_id || null,
    }));

    return Response.json({
      hrbp_email: targetHrbpEmail,
      portfolios: ownPortfolios.map(portfolioSummary),
      delegations: delegationSummaries,
      managers: managerBundles,
      interventions: interventions.map((i) => ({
        id: i.id,
        manager_email: i.manager_email,
        manager_name: i.manager_name,
        intervention_type: i.intervention_type,
        notes: i.notes,
        status: i.status,
        follow_up_date: i.follow_up_date,
        linked_manager_signal: i.linked_manager_signal,
        outcome_notes: i.outcome_notes,
        created_date: i.created_date,
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}