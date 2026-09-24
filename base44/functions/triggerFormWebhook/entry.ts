import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { validateExternalUrl } from '../../shared/urlValidation.ts';

const ADMIN_ROLES = ['Platform Admin', 'Super Administrator', 'Admin Level 1', 'Admin Level 2'];

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

    // Ownership check: only the form creator or a tenant admin may trigger its webhooks.
    // CustomForm RLS allows any authenticated user to create forms, so we must enforce
    // ownership here to prevent a user from firing webhooks on another user's form.
    const isOwner = form.created_by === user.email;
    const isAdmin = ADMIN_ROLES.includes(user.app_role);
    const sameTenant = form.client_id && form.client_id === user.client_id;
    if (!isOwner && !(isAdmin && sameTenant)) {
      return Response.json({ error: 'Forbidden - you do not have permission to trigger webhooks for this form' }, { status: 403 });
    }

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

    // Validate each webhook URL to prevent SSRF before making any request.
    const validWebhooks = [];
    const blockedWebhooks = [];
    for (const webhook of activeWebhooks) {
      const urlCheck = validateExternalUrl(webhook.url);
      if (!urlCheck.valid) {
        blockedWebhooks.push({ status: 'blocked', error: urlCheck.error });
      } else {
        validWebhooks.push(webhook);
      }
    }

    // Trigger valid webhooks in parallel
    const results = await Promise.allSettled(
      validWebhooks.map(webhook =>
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
      webhooks_blocked: blockedWebhooks.length,
      successful,
      failed,
      // Do not echo webhook URLs back to the caller — prevents using this
      // endpoint as a reachability probe against arbitrary hosts.
      details: [
        ...blockedWebhooks,
        ...results.map((r) => ({
          status: r.status === 'fulfilled' ? 'success' : 'failed',
          http_status: r.status === 'fulfilled' ? r.value.status : null,
          error: r.status === 'rejected' ? r.reason.message : null
        }))
      ]
    });

  } catch (error) {
    console.error('Webhook trigger error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});