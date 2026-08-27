import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import {
  fetchManagerSignals,
  buildManagerBundle,
  resolvePortfolioManagers,
} from "../../shared/portfolioData.ts";

const ADMIN_ROLES = [
  "Admin Level 2",
  "Super Administrator",
  "Platform Admin",
  "Partner Business Administrator",
];

// A delegation is in effect when status is active and today falls within the
// optional [start_date, end_date] window. Missing dates mean unbounded.
function isDelegationActive(d) {
  if (d.status !== "active") return false;
  const now = new Date();
  if (d.start_date && new Date(d.start_date) > now) return false;
  if (d.end_date) {
    const end = new Date(d.end_date);
    end.setHours(23, 59, 59, 999);
    if (end < now) return false;
  }
  return true;
}

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

    // 1. Fetch active portfolio assignments owned by this HRBP
    const ownPortfolios = await base44.asServiceRole.entities.HRBPPortfolio.filter({
      hrbp_email: targetHrbpEmail,
      status: "active",
    });

    // 2. Resolve own managers (explicit + BU + client scopes)
    const ownManagers = await resolvePortfolioManagers(base44, ownPortfolios);

    // 3. Active delegations TO this HRBP (backup coverage)
    const delegationsRaw = await base44.asServiceRole.entities.HRBPDelegation.filter({
      to_hrbp_email: targetHrbpEmail,
      status: "active",
    });
    const activeDelegations = delegationsRaw.filter(isDelegationActive);

    // 4. Resolve delegated managers (whole portfolio or single assignment)
    const delegatedManagers = [];
    const delegationSummaries = [];
    for (const d of activeDelegations) {
      let delegatedPortfolios = [];
      if (d.scope === "all") {
        delegatedPortfolios = await base44.asServiceRole.entities.HRBPPortfolio.filter({
          hrbp_email: d.from_hrbp_email,
          status: "active",
        });
      } else if (d.assignment_id) {
        const p = await base44.asServiceRole.entities.HRBPPortfolio
          .get(d.assignment_id)
          .catch(() => null);
        if (p && p.status === "active") delegatedPortfolios = [p];
      }
      const managers = await resolvePortfolioManagers(base44, delegatedPortfolios);
      managers.forEach((m) => {
        delegatedManagers.push({
          ...m,
          delegated_from: d.from_hrbp_email,
          delegation_id: d.id,
        });
      });
      delegationSummaries.push({
        id: d.id,
        from_hrbp_email: d.from_hrbp_email,
        scope: d.scope,
        assignment_id: d.assignment_id,
        start_date: d.start_date,
        end_date: d.end_date,
        reason: d.reason,
        manager_count: managers.length,
      });
    }

    // 5. Combine + dedupe — own portfolio takes precedence over delegated
    const seenEmails = new Set();
    const managers = [];
    for (const m of ownManagers) {
      if (seenEmails.has(m.email)) continue;
      seenEmails.add(m.email);
      managers.push({ ...m, delegated_from: null, delegation_id: null });
    }
    for (const m of delegatedManagers) {
      if (seenEmails.has(m.email)) continue;
      seenEmails.add(m.email);
      managers.push(m);
    }

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
        delegated_manager_count: delegatedManagers.length,
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