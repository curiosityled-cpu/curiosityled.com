import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { template_key, variables = {} } = await req.json();

    if (!template_key) {
      return Response.json({ error: 'template_key is required' }, { status: 400 });
    }

    // Get the template
    const templates = await base44.asServiceRole.entities.EmailTemplate.filter({
      template_key,
      is_active: true
    });

    if (templates.length === 0) {
      return Response.json({ 
        error: `Template "${template_key}" not found or inactive` 
      }, { status: 404 });
    }

    const template = templates[0];

    // Simple variable replacement
    let subject = template.subject;
    let body_html = template.body_html;
    let body_text = template.body_text || '';

    // Add default variables
    const allVariables = {
      platform_name: 'Curiosity Led',
      current_year: new Date().getFullYear().toString(),
      login_url: Deno.env.get('APP_URL') || 'https://curiosityled.ai',
      ...variables
    };

    // Replace variables in subject and body
    for (const [key, value] of Object.entries(allVariables)) {
      const placeholder = `{{${key}}}`;
      subject = subject.replaceAll(placeholder, value || '');
      body_html = body_html.replaceAll(placeholder, value || '');
      body_text = body_text.replaceAll(placeholder, value || '');
    }

    // Handle conditional blocks (simple implementation)
    // Remove blocks like {{#variable}}...{{/variable}} if variable is empty
    for (const [key, value] of Object.entries(allVariables)) {
      const startTag = `{{#${key}}}`;
      const endTag = `{{/${key}}}`;
      
      if (!value) {
        const regex = new RegExp(`${startTag}[\\s\\S]*?${endTag}`, 'g');
        body_html = body_html.replace(regex, '');
        body_text = body_text.replace(regex, '');
      } else {
        body_html = body_html.replaceAll(startTag, '').replaceAll(endTag, '');
        body_text = body_text.replaceAll(startTag, '').replaceAll(endTag, '');
      }
    }

    return Response.json({
      success: true,
      template: {
        subject,
        body_html,
        body_text,
        template_name: template.template_name,
        template_key: template.template_key
      }
    });

  } catch (error) {
    console.error('Error getting email template:', error);
    return Response.json({ 
      error: 'Failed to get email template',
      details: error.message 
    }, { status: 500 });
  }
});