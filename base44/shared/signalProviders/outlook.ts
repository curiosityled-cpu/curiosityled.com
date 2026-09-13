/**
 * Outlook Signal Provider (Microsoft Graph)
 *
 * Fetches calendar signals from Microsoft Graph using the connected Outlook
 * connector. Detects meeting cadence patterns: back-to-back density, meeting
 * load, 1:1 frequency gaps, and after-hours meetings.
 *
 * Scopes: Calendars.ReadWrite, User.Read (currently authorized)
 * Future Microsoft ecosystem signals (Teams, Viva Insights, Viva Learning,
 * Copilot activity) require additional Graph scopes and are stubbed in the
 * simulated provider until reachable.
 */
import { scoreToStatus, type Signal, type SignalProvider } from './types.ts';

export const outlookProvider: SignalProvider = {
  source: 'outlook',
  sourceLabel: 'Outlook',
  isSimulated: false,

  async isAvailable(base44: any): Promise<boolean> {
    try {
      await base44.asServiceRole.connectors.getConnection('outlook');
      return true;
    } catch {
      return false;
    }
  },

  async fetchSignals(base44: any, user: any): Promise<Signal[]> {
    let accessToken: string;
    try {
      const conn = await base44.asServiceRole.connectors.getConnection('outlook');
      accessToken = conn.accessToken;
    } catch {
      return []; // Not connected
    }

    const now = new Date();
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const signals: Signal[] = [];

    try {
      // Fetch calendar events for the past 7 days
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${encodeURIComponent(weekAgo.toISOString())}&endDateTime=${encodeURIComponent(now.toISOString())}&$top=100&$select=subject,start,end,attendees,showAs`,
        { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
      );

      if (!res.ok) return [];
      const data = await res.json();
      const events = (data.value || []).map((e: any) => ({
        title: e.subject || 'Untitled',
        start: e.start?.dateTime,
        end: e.end?.dateTime,
        attendees: e.attendees?.length || 0,
        showAs: e.showAs,
      }));

      // ── Signal 1: Back-to-back meeting density ──
      const sortedByStart = events
        .filter(e => e.start && e.end)
        .sort((a: any, b: any) => new Date(a.start).getTime() - new Date(b.start).getTime());

      let btbCount = 0;
      let totalPairs = 0;
      for (let i = 0; i < sortedByStart.length - 1; i++) {
        const currEnd = new Date(sortedByStart[i].end).getTime();
        const nextStart = new Date(sortedByStart[i + 1].start).getTime();
        if (nextStart - currEnd < 15 * 60 * 1000) { // < 15 min gap = back-to-back
          btbCount++;
        }
        if (nextStart - currEnd < 60 * 60 * 1000) totalPairs++;
      }
      if (totalPairs > 0 && btbCount / totalPairs >= 0.5) {
        const severity = Math.min(30 + Math.round((btbCount / totalPairs) * 40), 80);
        signals.push({
          id: 'outlook_btb_density',
          source: 'outlook',
          sourceLabel: 'Outlook',
          isSimulated: false,
          bucket: 'Operational Risk',
          name: 'Back-to-Back Meeting Overload',
          tagline: 'Calendar leaves almost no recovery space between meetings.',
          evidence: [
            `${btbCount} back-to-back transitions out of ${totalPairs} consecutive meetings (Outlook)`,
            'Less than 15-minute gaps between most meetings',
          ],
          severity,
          status: scoreToStatus(severity) || 'Emerging',
          generatedAt: now.toISOString(),
          suggestedMove: {
            move: 'Block one 30-minute recovery slot today.',
            reason: 'Back-to-back density is depleting decision capacity. One gap reclaims focus.',
            cta: 'Plan with Atreus',
            flow: 'practice',
            atreus: true,
            atreusMsg: 'My Outlook calendar shows back-to-back meeting overload. Can you help me identify what to block or delegate?',
            impact: severity,
          },
        });
      }

      // ── Signal 2: Meeting load (hours in meetings) ──
      let totalMinutes = 0;
      for (const e of events) {
        if (e.start && e.end) {
          totalMinutes += (new Date(e.end).getTime() - new Date(e.start).getTime()) / 60000;
        }
      }
      const meetingHours = totalMinutes / 60;
      if (meetingHours > 20) { // > 20 hours in 7 days
        const severity = Math.min(35 + Math.round((meetingHours - 20) * 2), 75);
        signals.push({
          id: 'outlook_meeting_load',
          source: 'outlook',
          sourceLabel: 'Outlook',
          isSimulated: false,
          bucket: 'Operational Risk',
          name: 'Meeting Load Squeeze',
          tagline: 'Over 20 hours in meetings this week leaves little room for proactive work.',
          evidence: [
            `${Math.round(meetingHours)} hours in meetings over the last 7 days (Outlook)`,
            'High meeting volume correlates with reactive management patterns',
          ],
          severity,
          status: scoreToStatus(severity) || 'Emerging',
          generatedAt: now.toISOString(),
          suggestedMove: {
            move: 'Identify one recurring meeting to reduce or delegate.',
            reason: 'Meeting load at this level forces reactive mode. Reclaiming one slot creates space for proactive work.',
            cta: 'Plan with Atreus',
            flow: 'practice',
            atreus: true,
            atreusMsg: 'I have over 20 hours of meetings this week in Outlook. Can you help me identify one to reduce or delegate?',
            impact: severity,
          },
        });
      }

      // ── Signal 3: 1:1 cadence gap ──
      const oneOnOnes = events.filter((e: any) =>
        e.attendees === 2 && /1:1|one.on.one|sync|check.in/i.test(e.title)
      );
      if (oneOnOnes.length === 0 && events.length > 10) {
        const severity = 45;
        signals.push({
          id: 'outlook_no_1on1',
          source: 'outlook',
          sourceLabel: 'Outlook',
          isSimulated: false,
          bucket: 'Execution',
          name: 'No 1:1s on Calendar',
          tagline: 'No recurring 1:1 meetings detected in the past week.',
          evidence: [
            'Zero 1:1-style meetings found in Outlook calendar (past 7 days)',
            'Missed 1:1s are a leading indicator of coaching gaps',
          ],
          severity,
          status: scoreToStatus(severity) || 'Emerging',
          generatedAt: now.toISOString(),
          suggestedMove: {
            move: 'Schedule one 1:1 with a direct report this week.',
            reason: 'No 1:1s on your calendar means coaching opportunities are being missed.',
            cta: 'Prep with Atreus',
            flow: 'practice',
            atreus: true,
            atreusMsg: 'I have no 1:1s on my Outlook calendar this week. Can you help me prepare for one?',
            impact: severity,
          },
        });
      }

      // ── Signal 4: After-hours meetings ──
      const afterHours = events.filter((e: any) => {
        if (!e.start) return false;
        const d = new Date(e.start);
        const hour = d.getHours();
        return hour >= 18 || hour < 7;
      });
      if (afterHours.length >= 3) {
        const severity = Math.min(30 + afterHours.length * 8, 70);
        signals.push({
          id: 'outlook_after_hours',
          source: 'outlook',
          sourceLabel: 'Outlook',
          isSimulated: false,
          bucket: 'People Risk',
          name: 'After-Hours Meeting Creep',
          tagline: 'Multiple meetings outside normal hours signal boundary erosion.',
          evidence: [
            `${afterHours.length} meetings before 7am or after 6pm (Outlook)`,
            'After-hours creep correlates with burnout and attrition risk',
          ],
          severity,
          status: scoreToStatus(severity) || 'Emerging',
          generatedAt: now.toISOString(),
          suggestedMove: {
            move: 'Review whether one after-hours meeting can move.',
            reason: 'Boundary erosion is gradual. Catching it early prevents burnout.',
            cta: 'Reflect with Atreus',
            flow: 'practice',
            atreus: true,
            atreusMsg: 'My Outlook calendar shows after-hours meeting creep. Can you help me think through boundaries?',
            impact: severity,
          },
        });
      }
    } catch {
      // Graph API error — return what we have
    }

    return signals;
  },
};