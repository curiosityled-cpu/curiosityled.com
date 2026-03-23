import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { form_id, event_type, data } = await req.json();

    if (!form_id || !event_type) {
      return Response.json({ error: 'form_id and event_type required' }, { status: 400 });
    }

    // Load form
    const forms = await base44.asServiceRole.entities.CustomForm.filter({
      id: form_id
    });

    if (forms.length === 0) {
      return Response.json({ error: 'Form not found' }, { status: 404 });
    }

    const form = forms[0];
    const webhooks = form.config?.webhooks || [];

    // Filter active webhooks that subscribe to this event
    const activeWebhooks = webhooks.filter(w => 
      w.enabled && w.events.includes(event_type)
    );

    if (activeWebhooks.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'No active webhooks for this event' 
      });
    }

    // Prepare payload
    const payload = {
      event: event_type,
      form_id: form.id,
      form_title: form.title,
      timestamp: new Date().toISOString(),
      data: data || {}
    };

    // Trigger webhooks in parallel
    const results = await Promise.allSettled(
      activeWebhooks.map(webhook => 
        fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Form-Builder-Event': event_type,
            'X-Form-Id': form.id
          },
          body: JSON.stringify(payload)
        })
      )
    );

    // Log results
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.ok).length;
    const failed = results.length - successful;

    return Response.json({
      success: true,
      webhooks_triggered: results.length,
      successful,
      failed,
      details: results.map((r, idx) => ({
        webhook_url: activeWebhooks[idx].url,
        status: r.status === 'fulfilled' ? 'success' : 'failed',
        error: r.status === 'rejected' ? r.reason.message : null
      }))
    });

  } catch (error) {
    console.error('Webhook trigger error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});