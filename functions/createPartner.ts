import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Allow Platform Admin and Super Administrator
    const allowedRoles = ['Platform Admin', 'Super Administrator'];
    if (!user || !allowedRoles.includes(user.app_role)) {
      return Response.json({ success: false, error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const body = await req.json();
    const partnerData = body.partnerData || body;

    // Validate required fields
    if (!partnerData.name || !partnerData.contact_email) {
      return Response.json({ 
        success: false,
        error: 'Missing required fields: name, contact_email' 
      }, { status: 400 });
    }

    // Generate slug from name if not provided
    const slug = partnerData.slug || partnerData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Check if slug already exists
    const existing = await base44.asServiceRole.entities.Partner.filter({ slug });
    if (existing.length > 0) {
      return Response.json({ 
        success: false,
        error: 'A partner with this name already exists' 
      }, { status: 400 });
    }

    // Create partner with service role
    const partner = await base44.asServiceRole.entities.Partner.create({
      ...partnerData,
      slug,
      type: partnerData.type || 'consulting_firm',
      status: partnerData.status || 'pending'
    });

    return Response.json({ 
      success: true,
      partner,
      message: 'Partner created successfully' 
    });

  } catch (error) {
    console.error('Error creating partner:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Failed to create partner' 
    }, { status: 500 });
  }
});