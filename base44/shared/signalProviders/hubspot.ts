/**
 * HubSpot Signal Provider
 *
 * Fetches CRM signals from HubSpot using the connected HubSpot connector.
 * Detects deal-level patterns: slipped/stalled deals, at-risk accounts,
 * and contact engagement gaps — signals that no single tool surfaces
 * on its own but become visible when correlated with in-app patterns.
 *
 * Scopes: crm.objects.deals.read, crm.objects.contacts.read, crm.objects.companies.read
 */
import { scoreToStatus, type Signal, type SignalProvider } from './types.ts';

export const hubspotProvider: SignalProvider = {
  source: 'hubspot',
  sourceLabel: 'HubSpot',
  isSimulated: false,

  async isAvailable(base44: any): Promise<boolean> {
    try {
      await base44.asServiceRole.connectors.getConnection('hubspot');
      return true;
    } catch {
      return false;
    }
  },

  async fetchSignals(base44: any, user: any): Promise<Signal[]> {
    let accessToken: string;
    try {
      const conn = await base44.asServiceRole.connectors.getConnection('hubspot');
      accessToken = conn.accessToken;
    } catch {
      return []; // Not connected
    }

    const now = new Date();
    const signals: Signal[] = [];
    const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    try {
      // ── Fetch deals in the pipeline ──
      // Get deals that are in "closed lost" or have been in the same stage too long
      const dealsRes = await fetch(
        'https://api.hubapi.com/crm/v3/objects/deals?limit=100&properties=dealname,dealstage,amount,closedate,hubspot_owner_id,lastmodifieddate',
        { headers }
      );
      if (!dealsRes.ok) return [];
      const dealsData = await dealsRes.json();
      const deals = (dealsData.results || []).map((d: any) => ({
        id: d.id,
        name: d.properties?.dealname || 'Untitled Deal',
        stage: d.properties?.dealstage || '',
        amount: parseFloat(d.properties?.amount || '0'),
        closeDate: d.properties?.closedate,
        ownerEmail: d.properties?.hubspot_owner_id || '',
        lastModified: d.properties?.lastmodifieddate,
      }));

      // ── Signal 1: Stalled deals (no movement in 14+ days) ──
      const fourteenDaysAgo = Date.now() - 14 * 86400000;
      const stalledDeals = deals.filter(d => {
        if (!d.lastModified) return false;
        return new Date(d.lastModified).getTime() < fourteenDaysAgo &&
               d.stage && !d.stage.includes('closed');
      });
      if (stalledDeals.length >= 2) {
        const totalValue = stalledDeals.reduce((s, d) => s + d.amount, 0);
        const severity = Math.min(35 + stalledDeals.length * 8, 80);
        signals.push({
          id: 'hubspot_stalled_deals',
          source: 'hubspot',
          sourceLabel: 'HubSpot',
          isSimulated: false,
          bucket: 'Operational Risk',
          name: 'Stalled Deals',
          tagline: `${stalledDeals.length} deals haven't moved in 14+ days.`,
          evidence: [
            `${stalledDeals.length} deals with no activity in 14+ days (HubSpot)`,
            totalValue > 0 ? `Combined value: $${Math.round(totalValue).toLocaleString()}` : 'Value not available',
          ],
          severity,
          status: scoreToStatus(severity) || 'Emerging',
          generatedAt: now.toISOString(),
          suggestedMove: {
            move: 'Review one stalled deal and identify the next concrete step.',
            reason: 'Stalled deals lose momentum. One call or email can restart the motion.',
            cta: 'Plan with Atreus',
            flow: 'practice',
            atreus: true,
            atreusMsg: 'I have stalled deals in HubSpot. Can you help me think through the next step on one of them?',
            impact: severity,
          },
        });
      }

      // ── Signal 2: Slipped close dates ──
      const now_date = new Date();
      const slippedDeals = deals.filter(d => {
        if (!d.closeDate || d.stage?.includes('closed')) return false;
        return new Date(d.closeDate) < now_date && !d.stage.includes('closed');
      });
      if (slippedDeals.length >= 1) {
        const severity = Math.min(40 + slippedDeals.length * 10, 75);
        signals.push({
          id: 'hubspot_slipped_deals',
          source: 'hubspot',
          sourceLabel: 'HubSpot',
          isSimulated: false,
          bucket: 'Operational Risk',
          name: 'Slipped Deal Deadlines',
          tagline: `${slippedDeals.length} deal(s) past their close date but not closed.`,
          evidence: [
            `${slippedDeals.length} deals past their expected close date (HubSpot)`,
            'Slipped deadlines often indicate scope misalignment or stalled buying process',
          ],
          severity,
          status: scoreToStatus(severity) || 'Emerging',
          generatedAt: now.toISOString(),
          suggestedMove: {
            move: 'Reach out to the contact on one slipped deal.',
            reason: 'Slipped deals need direct contact to re-energize. A short check-in call can unblock.',
            cta: 'Plan with Atreus',
            flow: 'practice',
            atreus: true,
            atreusMsg: 'I have deals that slipped their close dates in HubSpot. Can you help me plan a re-engagement approach?',
            impact: severity,
          },
        });
      }

      // ── Signal 3: At-risk accounts (high-value deals with no recent activity) ──
      const highValueStalled = stalledDeals.filter(d => d.amount >= 50000);
      if (highValueStalled.length >= 1) {
        const severity = 65;
        signals.push({
          id: 'hubspot_at_risk_accounts',
          source: 'hubspot',
          sourceLabel: 'HubSpot',
          isSimulated: false,
          bucket: 'People Risk',
          name: 'At-Risk High-Value Accounts',
          tagline: 'High-value deals are stalling — relationship attention needed.',
          evidence: [
            `${highValueStalled.length} high-value deal(s) ($50K+) with no activity in 14+ days (HubSpot)`,
            'Account disengagement often precedes churn',
          ],
          severity,
          status: scoreToStatus(severity) || 'Active',
          generatedAt: now.toISOString(),
          suggestedMove: {
            move: 'Schedule a check-in with the stakeholder on your biggest at-risk deal.',
            reason: 'High-value deals need relationship investment. A proactive check-in shows you\'re invested.',
            cta: 'Plan with Atreus',
            flow: 'practice',
            atreus: true,
            atreusMsg: 'I have high-value at-risk accounts in HubSpot. Can you help me plan a stakeholder check-in?',
            impact: severity,
          },
        });
      }
    } catch {
      // API error — return what we have
    }

    return signals;
  },
};