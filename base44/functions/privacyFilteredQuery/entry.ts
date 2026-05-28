/**
 * privacyFilteredQuery — enforce privacy boundaries on entity reads.
 *
 * Strips sensitive fields from ManagerPulse and ManagerTrends before returning to non-owner/non-admin users.
 * Always-private fields are removed entirely. Abstractable fields are transformed to safe aggregates.
 *
 * Use: const filtered = await privacyFilteredQuery('ManagerPulse', records, user, requester_role);
 */

const ALWAYS_PRIVATE = ['confidence_today', 'resilience_signal', 'emotional_strain', 'identity_friction', 'identity_friction_note', 'avoidance_flag', 'biggest_weight_today', 'motivation_today', 'ai_conversation_content'];

const ABSTRACTABLE = {
  ManagerPulse: {
    confidence_today: (val) => val ? 'tracked' : undefined,
    resilience_signal: (val) => val ? 'tracked' : undefined,
    emotional_strain: (val) => val ? 'tracked' : undefined,
  },
  ManagerTrends: {
    confidence_trend: (val) => val === 'declining' ? 'support_needed' : val === 'improving' ? 'improving' : undefined,
    resilience_trend: (val) => val === 'declining' ? 'recovery_support' : val === 'improving' ? 'improving' : undefined,
    identity_friction_active: (val) => val ? 'transition_support' : undefined,
  }
};

export async function applyPrivacyFilter(entityName, records, userEmail, userRole) {
  if (!Array.isArray(records)) records = [records];
  
  // Admins and record owners always see unfiltered
  if (userRole === 'admin') return records;
  
  return records.map(record => {
    // Own records are always visible unfiltered
    if (record.user_email === userEmail) return record;
    
    // Remove always-private fields
    const filtered = { ...record };
    ALWAYS_PRIVATE.forEach(field => delete filtered[field]);
    
    // Transform abstractable fields
    if (ABSTRACTABLE[entityName]) {
      Object.entries(ABSTRACTABLE[entityName]).forEach(([field, transformer]) => {
        if (field in filtered) {
          const val = filtered[field];
          const transformed = transformer(val);
          if (transformed === undefined) {
            delete filtered[field];
          } else {
            filtered[field] = transformed;
          }
        }
      });
    }
    
    return filtered;
  });
}

// Export for use in entity automations
export const PRIVACY_RULES = {
  always_private: ALWAYS_PRIVATE,
  abstractable: ABSTRACTABLE
};