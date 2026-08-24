import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import {
  fetchManagerSignals,
  buildManagerBundle,
  resolveBUManagers,
} from "../../shared/portfolioData.ts";

const ADMIN_ROLES = [
  "Admin Level 1",
  "Admin Level 2",
  "Super Administrator",
  "Platform Admin",
  "Partner Business Administrator",
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const targetHrbpEmail = body.hrbp_email || user.email;

    const userRole = user.app_role || user.data?.app_role || user.role;
    const isAdmin = ADMIN_ROLES.includes(userRole);
    if (targetHrbpEmail !== user.email && !isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Fetch active portfolio assignments for this HRBP
    const portfolios = await base44.asServiceRole.entities.HRBPPortfolio.filter({
      hrbp_email: targetHrbpEmail,
      status: "active",
    });

    // 2. Resolve manager email list (explicit + BU-scoped)
    const explicitEmails = new Set();
    const buScopes = [];
    for (const p of portfolios) {
      if (p.assignment_type === "explicit" && p.manager_emails) {
        p.manager_emails.forEach((e) => explicitEmails.add(e));
      } else if (p.assignment_type === "business_unit") {
        buScopes.push({
          business_unit: p.business_unit,
          department: p.department,
          team: p.team,
          label: p.label,
        });
      }
    }

    // 3. Fetch User records for explicit managers
    const explicitEmailArray = [...explicitEmails];
    let explicitManagers = [];
    if (explicitEmailArray.length > 0) {
      const allUsers = await base44.asServiceRole.entities.User.list(500);
      explicitManagers = allUsers.filter((u) => explicitEmailArray.includes(u.email));
    }

    // 4. Resolve BU-scoped managers
    const buManagers = await resolveBUManagers(base44, buScopes);

    // 5. Combine + deduplicate
    const seenEmails = new Set();
    const managers = [...explicitManagers, ...buManagers].filter((m) => {
      if (seenEmails.has(m.email)) return false;
      seenEmails.add(m.email);
      return true;
    });

    const managerEmails = managers.map((m) => m.email);

    // 6. Fetch signal data (shared)
    const signals = await fetchManagerSignals(base44, managerEmails);

    // 7. Fetch HRBP interventions
    const interventions = await base44.asServiceRole.entities.HRBPIntervention.filter({
      hrbp_email: targetHrbpEmail,
    });

    // 8. Build manager bundles
    const managerBundles = managers.map((m) => buildManagerBundle(m, signals));

    return Response.json({
      hrbp_email: targetHrbpEmail,
      portfolios: portfolios.map((p) => ({
        id: p.id,
        assignment_type: p.assignment_type,
        label: p.label,
        business_unit: p.business_unit,
        department: p.department,
        manager_count:
          p.assignment_type === "explicit" ? (p.manager_emails?.length || 0) : null,
      })),
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