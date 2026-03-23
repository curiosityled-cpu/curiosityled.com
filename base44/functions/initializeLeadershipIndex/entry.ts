import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * One-time initialization function for Leadership Index Assessment
 * Creates competencies and sample questions
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Unauthorized - Platform Admin only' }, { status: 403 });
    }

    const results = {
      competencies: [],
      questions: []
    };

    // Check if already initialized
    const existingCompetencies = await base44.asServiceRole.entities.Competency.filter({
      is_platform_default: true,
      field_key: { $exists: true }
    });

    if (existingCompetencies.length >= 6) {
      return Response.json({
        success: true,
        message: 'Leadership Index already initialized',
        competencies: existingCompetencies.length,
        questions: 0
      });
    }

    // Create competencies
    const competencies = [
      {
        name: "Situational Intelligence",
        field_key: "si",
        category: "Situational Intelligence",
        definition: "The ability to read complex situations, anticipate challenges, and adapt leadership approach based on context.",
        leadership_level_requirements: {
          level_1: 2.0,
          level_2: 2.5,
          level_3: 3.0,
          level_4: 3.5,
          level_5: 3.8
        },
        is_platform_default: true
      },
      {
        name: "Decision-Making",
        field_key: "dm",
        category: "Tactical",
        definition: "The capability to analyze information, evaluate options, and make sound decisions under pressure.",
        leadership_level_requirements: {
          level_1: 2.0,
          level_2: 2.5,
          level_3: 3.0,
          level_4: 3.5,
          level_5: 3.8
        },
        is_platform_default: true
      },
      {
        name: "Communication",
        field_key: "comm",
        category: "People Leadership",
        definition: "The ability to convey information clearly, listen actively, and facilitate understanding across diverse audiences.",
        leadership_level_requirements: {
          level_1: 2.0,
          level_2: 2.5,
          level_3: 3.0,
          level_4: 3.5,
          level_5: 3.8
        },
        is_platform_default: true
      },
      {
        name: "Resource Management",
        field_key: "rm",
        category: "Tactical",
        definition: "The capacity to optimize time, budget, and human resources to achieve objectives efficiently.",
        leadership_level_requirements: {
          level_1: 2.0,
          level_2: 2.5,
          level_3: 3.0,
          level_4: 3.5,
          level_5: 3.8
        },
        is_platform_default: true
      },
      {
        name: "Stakeholder Management",
        field_key: "sm",
        category: "People Leadership",
        definition: "The skill to identify, engage, and align diverse stakeholders toward common goals.",
        leadership_level_requirements: {
          level_1: 1.5,
          level_2: 2.5,
          level_3: 3.0,
          level_4: 3.5,
          level_5: 3.8
        },
        is_platform_default: true
      },
      {
        name: "Performance Management",
        field_key: "pm",
        category: "People Leadership",
        definition: "The ability to set clear expectations, provide coaching, and drive accountability for results.",
        leadership_level_requirements: {
          level_1: 1.5,
          level_2: 2.5,
          level_3: 3.0,
          level_4: 3.5,
          level_5: 3.8
        },
        is_platform_default: true
      }
    ];

    const createdCompetencies = await base44.asServiceRole.entities.Competency.bulkCreate(competencies);
    results.competencies = createdCompetencies;

    return Response.json({
      success: true,
      message: `Successfully initialized ${createdCompetencies.length} competencies`,
      results
    });

  } catch (error) {
    console.error('Error initializing Leadership Index:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});