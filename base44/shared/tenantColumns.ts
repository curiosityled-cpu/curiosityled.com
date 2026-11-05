/**
 * Tenant columns on person-owned records.
 *
 * Phase 3 closed the tenant boundary on every type whose rows belong to a client
 * outright. This module covers the other half: records that belong to a *person*
 * and only reach an organisation through that person. Their access rules stay
 * person-bound (that is the correct boundary — a check-in is yours, not your
 * employer's), but each row now also carries `client_id` so the organisation can
 * report on its own activity without ever reading another tenant's.
 *
 * Both the backfill function and the Phase 5 proof read this one map, so the two
 * cannot drift: if a type is added here, the proof starts measuring it.
 */

/** Where a person-owned record keeps the email of the person it belongs to. */
export const TENANT_COLUMN_OWNERS: Record<string, string[]> = {
  UserProfile: ["email"],
  DailyCheckIn: ["user_email"],
  Notification: ["user_email"],
  UserPreference: ["user_email"],
  UserRoleAssignment: ["email"],
  DecisionJournal: ["user_email"],
  DelegationPlan: ["user_email"],
  Milestone: ["created_by"],
  ManagerMemory: ["user_email"],
  AgentAction: ["user_email"],
  AtreusConversationTurn: ["user_email"],
  AtreusMemorySummary: ["user_email"],
  Conversation: ["created_by"],
  ConversationState: ["user_email"],
  CoachMessage: ["sender_email", "recipient_email"],
  CoachReflection: ["coach_email"],
  LearningRecommendation: ["user_email"],
  Item: ["created_by"],
  PulseAccessLog: ["target_email", "accessed_by"],
  BrandingChangeLog: ["changed_by"],
  SyncState: ["user_email"],
};

/** The types this module owns, in the order the phase inventory listed them. */
export const PERSON_OWNED_TENANT_TYPES = Object.keys(TENANT_COLUMN_OWNERS);

/**
 * Types that already recorded their tenant under the provisioning-side name
 * `tenant_id`. The value is the same; the column name was not. They now carry
 * `client_id` as well so a query or report written against one field sees every
 * type, instead of silently missing these six.
 */
export const TENANT_ID_MIRROR_TYPES = [
  "IdempotencyKey",
  "ProvisioningApiKey",
  "ProvisioningBatch",
  "ProvisioningRole",
  "ProvisioningUser",
  "RequestNonce",
];

/**
 * The client a row belongs to, read from the row itself where it already records
 * one (`tenant_id` on the provisioned-profile types), otherwise from the person
 * it belongs to.
 */
export function rowTenantHints(entity: string, row: any): { clientId?: string; emails: string[] } {
  const clientId = row?.client_id || row?.tenant_id || undefined;
  const emails: string[] = [];
  for (const field of TENANT_COLUMN_OWNERS[entity] || []) {
    const value = row?.[field];
    if (typeof value === "string" && value.includes("@")) emails.push(value.toLowerCase());
  }
  return { clientId, emails };
}

/** email → client id, from the membership every screen already reads. */
export function membershipClientMap(users: any[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const u of users || []) {
    const email = (u?.email || "").toLowerCase();
    const clientId = u?.client_id || u?.data?.client_id;
    if (email && clientId) map.set(email, clientId);
  }
  return map;
}