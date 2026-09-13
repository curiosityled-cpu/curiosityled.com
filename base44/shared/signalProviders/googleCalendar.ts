/**
 * Google Calendar Signal Provider
 *
 * Fetches calendar signals from Google Calendar API using the connected
 * Google Calendar connector. Detects meeting cadence patterns similar to
 * Outlook: back-to-back density, meeting load, 1:1 frequency gaps.
 */
import { scoreToStatus, type Signal, type SignalProvider } from './types.ts';

export const googleCalendarProvider: SignalProvider = {
  source: 'google-calendar',
  sourceLabel: 'Google Calendar',
  isSimulated: false,

  async isAvailable(base44: any): Promise<boolean> {
    try {
      await base44.asServiceRole.connectors.getConnection('googlecalendar');
      return true;
    } catch {
      return false;
    }
  },

  async fetchSignals(base44: any, user: any): Promise<Signal[]> {
    let accessToken: string;
    try {
      const conn = await base44.asServiceRole.connectors.getConnection('googlecalendar');
      accessToken = conn.accessToken;
    } catch {
      return []; // Not connected
    }

    const now = new Date();
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const signals: Signal[] = [];

    try {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(weekAgo.toISOString())}&timeMax=${encodeURIComponent(now.toISOString())}&maxResults=100&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!res.ok) return [];
      const data = await res.json();
      const events = (data.items || []).map((e: any) => ({
        title: e.summary || 'Untitled',
        start: e.start?.dateTime || e.start?.date,
        end: e.end?.dateTime || e.end?.date,
        attendees: e.attendees?.length || 0,
      }));

      const sortedByStart = events
        .filter(e => e.start && e.end)
        .sort((a: any, b: any) => new Date(a.start).getTime() - new Date(b.start).getTime());

      // ── Signal 1: Back-to-back density ──
      let btbCount = 0;
      let totalPairs = 0;
      for (let i = 0; i < sortedByStart.length - 1; i++) {
        const currEnd = new Date(sortedByStart[i].end).getTime();
        const nextStart = new Date(sortedByStart[i + 1].start).getTime();
        if (nextStart - currEnd < 15 * 60 * 1000) btbCount++;
        if (nextStart - currEnd < 60 * 60 * 1000) totalPairs++;
      }
      if (totalPairs > 0 && btbCount / totalPairs >= 0.5) {
        const severity = Math.min(30 + Math.round((btbCount / totalPairs) * 40), 80);
        signals.push({
          id: 'gcal_btb_density',
          source: 'google-calendar',
          sourceLabel: 'Google Calendar',
          isSimulated: false,
          bucket: 'Operational Risk',
          name: 'Back-to-Back Meeting Overload',
          tagline: 'Calendar leaves almost no recovery space between meetings.',
          evidence: [
            `${btbCount} back-to-back transitions out of ${totalPairs} consecutive meetings (Google Calendar)`,
            'Less than 15-minute gaps between most meetings',
          ],
          severity,
          status: scoreToStatus(severity) || 'Emerging',
          generatedAt: now.toISOString(),
          suggestedMove: {
            move: 'Block one 30-minute recovery slot today.',
            reason: 'Back-to-back density depletes decision capacity. One gap reclaims focus.',
            cta: 'Plan with Atreus',
            flow: 'practice',
            atreus: true,
            atreusMsg: 'My Google Calendar shows back-to-back meeting overload. Can you help me identify what to block or delegate?',
            impact: severity,
          },
        });
      }

      // ── Signal 2: Meeting load ──
      let totalMinutes = 0;
      for (const e of events) {
        if (e.start && e.end) {
          totalMinutes += (new Date(e.end).getTime() - new Date(e.start).getTime()) / 60000;
        }
      }
      const meetingHours = totalMinutes / 60;
      if (meetingHours > 20) {
        const severity = Math.min(35 + Math.round((meetingHours - 20) * 2), 75);
        signals.push({
          id: 'gcal_meeting_load',
          source: 'google-calendar',
          sourceLabel: 'Google Calendar',
          isSimulated: false,
          bucket: 'Operational Risk',
          name: 'Meeting Load Squeeze',
          tagline: 'Over 20 hours in meetings this week leaves little room for proactive work.',
          evidence: [
            `${Math.round(meetingHours)} hours in meetings over the last 7 days (Google Calendar)`,
            'High meeting volume correlates with reactive management patterns',
          ],
          severity,
          status: scoreToStatus(severity) || 'Emerging',
          generatedAt: now.toISOString(),
          suggestedMove: {
            move: 'Identify one recurring meeting to reduce or delegate.',
            reason: 'Meeting load at this level forces reactive mode. Reclaiming one slot creates space.',
            cta: 'Plan with Atreus',
            flow: 'practice',
            atreus: true,
            atreusMsg: 'I have over 20 hours of meetings this week in Google Calendar. Can you help me identify one to reduce?',
            impact: severity,
          },
        });
      }

      // ── Signal 3: No 1:1s ──
      const oneOnOnes = events.filter((e: any) =>
        e.attendees === 2 && /1:1|one.on.one|sync|check.in/i.test(e.title)
      );
      if (oneOnOnes.length === 0 && events.length > 10) {
        const severity = 45;
        signals.push({
          id: 'gcal_no_1on1',
          source: 'google-calendar',
          sourceLabel: 'Google Calendar',
          isSimulated: false,
          bucket: 'Execution',
          name: 'No 1:1s on Calendar',
          tagline: 'No recurring 1:1 meetings detected in the past week.',
          evidence: [
            'Zero 1:1-style meetings found in Google Calendar (past 7 days)',
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
            atreusMsg: 'I have no 1:1s on my Google Calendar this week. Can you help me prepare for one?',
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