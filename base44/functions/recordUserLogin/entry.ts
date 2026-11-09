import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Stamps the caller's own last_login_date when they open the app.
 *
 * The platform owns authentication, so the app never sees a sign-in event
 * itself: this is the one hook that keeps "Last Login" truthful. It only ever
 * writes the caller's own record, and only when the stored value is stale, so
 * a user browsing around does not produce a write on every page load.
 */

const STALE_AFTER_MS = 30 * 60 * 1000;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await base44.asServiceRole.entities.User.filter({ email: user.email });
    const record = users[0];

    if (!record) {
      return Response.json({ record_found: false });
    }

    const previous = record.last_login_date ? new Date(record.last_login_date).getTime() : 0;
    if (previous && Date.now() - previous < STALE_AFTER_MS) {
      return Response.json({ record_found: true, last_login_date: record.last_login_date, updated: false });
    }

    const now = new Date().toISOString();
    await base44.asServiceRole.entities.User.update(record.id, { last_login_date: now });

    return Response.json({ record_found: true, last_login_date: now, updated: true });
  } catch (error) {
    console.error('recordUserLogin failed:', error);
    return Response.json({ error: 'Failed to record login' }, { status: 500 });
  }
});