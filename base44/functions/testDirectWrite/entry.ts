import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[testDirectWrite] Starting writes for:', user.email);

    // Test 1: TonePreference direct write
    console.log('[testDirectWrite] Attempting TonePreference write...');
    const tonePrefResult = await base44.asServiceRole.entities.TonePreference.create({
      user_email: 'test-direct@curiosityled.com',
      tone_mode: 'warm_candid',
      cadence_preference: 'every_other_day',
      last_prompt_sent_at: new Date().toISOString()
    });
    console.log('[testDirectWrite] TonePreference result:', tonePrefResult?.id ? 'SUCCESS' : 'FAILED', tonePrefResult?.id);

    // Test 2: Notification direct write
    console.log('[testDirectWrite] Attempting Notification write...');
    const notifResult = await base44.asServiceRole.entities.Notification.create({
      user_email: 'test-direct@curiosityled.com',
      type: 'atreus_checkin',
      title: 'Test',
      message: 'Test message',
      scheduled_for: new Date().toISOString()
    });
    console.log('[testDirectWrite] Notification result:', notifResult?.id ? 'SUCCESS' : 'FAILED', notifResult?.id);

    return Response.json({
      tonePref: tonePrefResult?.id ? 'created' : 'failed',
      notification: notifResult?.id ? 'created' : 'failed'
    });

  } catch (error) {
    console.error('[testDirectWrite] ERROR:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});