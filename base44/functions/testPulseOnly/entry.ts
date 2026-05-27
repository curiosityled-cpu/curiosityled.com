import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[testPulseOnly] Creating ManagerPulse...');
    
    const result = await base44.asServiceRole.entities.ManagerPulse.create({
      user_email: 'pulse-test@curiosityled.com',
      source: 'system',
      prompt_type: 'baseline_energy'
    });

    console.log('[testPulseOnly] Result:', result?.id ? 'SUCCESS' : 'FAILED', result?.id || 'no ID');

    return Response.json({
      id: result?.id,
      success: !!result?.id
    });

  } catch (error) {
    console.error('[testPulseOnly] ERROR:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});