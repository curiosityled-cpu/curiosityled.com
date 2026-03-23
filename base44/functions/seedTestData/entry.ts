import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Unauthorized - Platform Admin only' }, { status: 401 });
    }

    // Create test clients
    const clients = [
      {
        name: 'Acme Corporation',
        slug: 'acme-corp',
        type: 'direct_customer',
        status: 'active',
        industry: 'Technology',
        company_size: '501-1000',
        contact_name: 'Jane Smith',
        contact_email: 'jane.smith@acme.com',
        contact_phone: '+1-555-0100',
        billing_email: 'billing@acme.com',
        license_count: 100,
        annual_contract_value: 50000,
        payment_terms: 'annual',
        settings: {
          allow_custom_competencies: true,
          allow_custom_assessments: true,
          allow_custom_learning: true,
          include_leadership_index: true,
          enable_industry_benchmarks: true,
          default_new_user_role: 'User Level 1'
        }
      },
      {
        name: 'Global Healthcare Partners',
        slug: 'global-healthcare',
        type: 'direct_customer',
        status: 'active',
        industry: 'Healthcare',
        company_size: '1001-5000',
        contact_name: 'Dr. Michael Chen',
        contact_email: 'm.chen@globalhealthcare.com',
        contact_phone: '+1-555-0200',
        billing_email: 'billing@globalhealthcare.com',
        license_count: 250,
        annual_contract_value: 150000,
        payment_terms: 'annual',
        settings: {
          allow_custom_competencies: true,
          allow_custom_assessments: false,
          allow_custom_learning: true,
          include_leadership_index: true,
          enable_industry_benchmarks: true,
          default_new_user_role: 'User Level 1'
        }
      },
      {
        name: 'Retail Excellence Inc',
        slug: 'retail-excellence',
        type: 'partner_client',
        status: 'trial',
        industry: 'Retail',
        company_size: '201-500',
        contact_name: 'Sarah Johnson',
        contact_email: 's.johnson@retailexcellence.com',
        contact_phone: '+1-555-0300',
        billing_email: 'billing@retailexcellence.com',
        license_count: 50,
        annual_contract_value: 25000,
        payment_terms: 'monthly',
        settings: {
          allow_custom_competencies: false,
          allow_custom_assessments: false,
          allow_custom_learning: false,
          include_leadership_index: true,
          enable_industry_benchmarks: true,
          default_new_user_role: 'User Level 1'
        }
      }
    ];

    const createdClients = [];
    for (const clientData of clients) {
      const existing = await base44.asServiceRole.entities.Client.filter({ slug: clientData.slug });
      if (existing.length === 0) {
        const client = await base44.asServiceRole.entities.Client.create(clientData);
        createdClients.push(client);
      } else {
        createdClients.push(existing[0]);
      }
    }

    // Create test partners
    const partners = [
      {
        name: 'Elite Consulting Group',
        slug: 'elite-consulting',
        type: 'consulting_firm',
        status: 'active',
        contact_name: 'Robert Williams',
        contact_email: 'r.williams@eliteconsulting.com',
        contact_phone: '+1-555-1000',
        website: 'https://eliteconsulting.com',
        commission_rate: 20,
        payment_terms: 'net_30',
        total_revenue_generated: 0,
        total_commissions_paid: 0,
        client_count: 0
      },
      {
        name: 'Leadership Coaching Partners',
        slug: 'leadership-coaching',
        type: 'coaching_practice',
        status: 'active',
        contact_name: 'Emily Rodriguez',
        contact_email: 'e.rodriguez@leadershipcoaching.com',
        contact_phone: '+1-555-2000',
        website: 'https://leadershipcoaching.com',
        commission_rate: 15,
        payment_terms: 'net_30',
        total_revenue_generated: 0,
        total_commissions_paid: 0,
        client_count: 0
      }
    ];

    const createdPartners = [];
    for (const partnerData of partners) {
      const existing = await base44.asServiceRole.entities.Partner.filter({ slug: partnerData.slug });
      if (existing.length === 0) {
        const partner = await base44.asServiceRole.entities.Partner.create(partnerData);
        createdPartners.push(partner);
      } else {
        createdPartners.push(existing[0]);
      }
    }

    // Link partner clients
    if (createdClients.length >= 3 && createdPartners.length >= 1) {
      await base44.asServiceRole.entities.Client.update(createdClients[2].id, {
        partner_id: createdPartners[0].id
      });
    }

    // Create test users for each client
    const testUsers = [];
    
    // Acme Corp users
    if (createdClients.length > 0) {
      const acmeUsers = [
        {
          email: 'ceo@acme.com',
          full_name: 'Alice Johnson',
          app_role: 'Super Administrator',
          client_id: createdClients[0].id,
          current_role: 'Chief Executive Officer',
          department: 'Executive',
          sector: 'Technology'
        },
        {
          email: 'manager1@acme.com',
          full_name: 'Bob Smith',
          app_role: 'User Level 2',
          client_id: createdClients[0].id,
          current_role: 'Engineering Manager',
          department: 'Engineering',
          sector: 'Technology',
          manager_email: 'ceo@acme.com'
        },
        {
          email: 'employee1@acme.com',
          full_name: 'Charlie Davis',
          app_role: 'User Level 1',
          client_id: createdClients[0].id,
          current_role: 'Senior Engineer',
          department: 'Engineering',
          sector: 'Technology',
          manager_email: 'manager1@acme.com'
        }
      ];

      for (const userData of acmeUsers) {
        const existing = await base44.asServiceRole.entities.User.filter({ email: userData.email });
        if (existing.length === 0) {
          const newUser = await base44.asServiceRole.entities.User.create(userData);
          testUsers.push(newUser);
        }
      }
    }

    // Healthcare users
    if (createdClients.length > 1) {
      const healthcareUsers = [
        {
          email: 'director@globalhealthcare.com',
          full_name: 'Diana Lee',
          app_role: 'Super Administrator',
          client_id: createdClients[1].id,
          current_role: 'Director of Operations',
          department: 'Operations',
          sector: 'Healthcare'
        },
        {
          email: 'manager2@globalhealthcare.com',
          full_name: 'Edward Martinez',
          app_role: 'User Level 2',
          client_id: createdClients[1].id,
          current_role: 'Clinical Manager',
          department: 'Clinical Services',
          sector: 'Healthcare',
          manager_email: 'director@globalhealthcare.com'
        }
      ];

      for (const userData of healthcareUsers) {
        const existing = await base44.asServiceRole.entities.User.filter({ email: userData.email });
        if (existing.length === 0) {
          const newUser = await base44.asServiceRole.entities.User.create(userData);
          testUsers.push(newUser);
        }
      }
    }

    return Response.json({
      message: 'Test data seeded successfully',
      clients_created: createdClients.length,
      partners_created: createdPartners.length,
      users_created: testUsers.length,
      clients: createdClients.map(c => ({ id: c.id, name: c.name, slug: c.slug })),
      partners: createdPartners.map(p => ({ id: p.id, name: p.name, slug: p.slug })),
      users: testUsers.map(u => ({ email: u.email, client: createdClients.find(c => c.id === u.client_id)?.name }))
    });

  } catch (error) {
    console.error('Error seeding test data:', error);
    return Response.json({
      error: error.message || 'Failed to seed test data',
      details: error.stack
    }, { status: 500 });
  }
});