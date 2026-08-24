import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import {
  fetchManagerSignals,
  buildManagerBundle,
  resolveBUManagers,
  resolveExplicitManagers,
} from "../../shared/portfolioData.ts";

const HEAD_OF_HR_ROLES = [
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

    const userRole = user.app_role || user.data?.app_role || user.role;
    if (!HEAD_OF_HR_ROLES.includes(userRole)) {
      return Response.json({ error: "Forbidden — Head of HR access required" }, { status: 403 });
    }

    // 1. Fetch ALL active portfolio assignments across all HRBPs
    const allPortfolios = await base44.asServiceRole.entities.HRBPPortfolio.filter({
      status: "active",
    });

    // 2. Group by HRBP email
    const hrbpMap = {};
    for (const p of allPortfolios) {
      if (!hrbpMap[p.hrbp_email]) {
        hrbpMap[p.hrbp_email] = {
          hrbp_email: p.hrbp_email,
          portfolios: [],
          explicitEmails: new Set(),
          buScopes: [],
        };
      }
      hrbpMap[p.hrbp_email].portfolios.push(p);
      if (p.assignment_type === "explicit" && p.manager_emails) {
        p.manager_emails.forEach((e) => hrbpMap[p.hrbp_email].explicitEmails.add(e));
      } else if (p.assignment_type === "business_unit") {
        hrbpMap[p.hrbp_email].buScopes.push({
          business_unit: p.business_unit,
          department: p.department,
          team: p.team,
          label: p.label,
        });
      }
    }

    // 3. Resolve all managers across all HRBPs
    const allExplicitEmails = new Set();
    const allBUScopes = [];
    for (const hrbpEmail of Object.keys(hrbpMap)) {
      hrbpMap[hrbpEmail].explicitEmails.forEach((e) => allExplicitEmails.add(e));
      hrbpMap[hrbpEmail].buScopes.forEach((s) => allBUScopes.push(s));
    }

    // Fetch explicit managers
    const explicitEmailArray = [...allExplicitEmails];
    let explicitManagers = [];
    if (explicitEmailArray.length > 0) {
      const allUsers = await base44.asServiceRole.entities.User.list(500);
      explicitManagers = resolveExplicitManagers(allUsers, explicitEmailArray);
    }

    // Resolve BU managers
    const buManagers = await resolveBUManagers(base44, allBUScopes);

    // Combine + deduplicate
    const seenEmails = new Set();
    const allManagers = [...explicitManagers, ...buManagers].filter((m) => {
      if (seenEmails.has(m.email)) return false;
      seenEmails.add(m.email);
      return true;
    });

    const managerEmails = allManagers.map((m) => m.email);

    // 4. Fetch signal data for all managers (shared)
    const signals = await fetchManagerSignals(base44, managerEmails);

    // 5. Build manager bundles
    const managerBundles = allManagers.map((m) => buildManagerBundle(m, signals));

    // 6. Fetch all interventions (for HRBP engagement metric)
    const allInterventions = await base44.asServiceRole.entities.HRBPIntervention.list(500);

    // 7. Group managers by HRBP and by department (for heat map)
    const managersByHrbp = {};
    const managersByDepartment = {};
    for (let i = 0; i < allManagers.length; i++) {
      const m = allManagers[i];
      const bundle = managerBundles[i];
      const dept = m.department || "Unassigned";

      if (!managersByDepartment[dept]) managersByDepartment[dept] = [];
      managersByDepartment[dept].push(bundle);

      // Find which HRBP(s) cover this manager
      for (const hrbpEmail of Object.keys(hrbpMap)) {
        const h = hrbpMap[hrbpEmail];
        if (h.explicitEmails.has(m.email) || h.buScopes.some((s) => s.department === m.department)) {
          if (!managersByHrbp[hrbpEmail]) managersByHrbp[hrbpEmail] = [];
          managersByHrbp[hrbpEmail].push(bundle);
        }
      }
    }

    return Response.json({
      total_managers: managerBundles.length,
      total_hrbps: Object.keys(hrbpMap).length,
      managers: managerBundles,
      managers_by_department: managersByDepartment,
      managers_by_hrbp: managersByHrbp,
      hrbp_emails: Object.keys(hrbpMap),
      interventions: allInterventions.map((i) => ({
        id: i.id,
        hrbp_email: i.hrbp_email,
        manager_email: i.manager_email,
        intervention_type: i.intervention_type,
        status: i.status,
        created_date: i.created_date,
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}