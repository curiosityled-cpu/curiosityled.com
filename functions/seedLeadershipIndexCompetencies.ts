import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Seeds the 6 core Leadership Index competencies
 * Run once to initialize the assessment framework
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Unauthorized - Platform Admin only' }, { status: 403 });
    }

    const competencies = [
      {
        name: "Situational Intelligence",
        field_key: "si",
        category: "Situational Intelligence",
        definition: "The ability to read complex situations, anticipate challenges, and adapt leadership approach based on context.",
        key_components: [
          { name: "Pattern Recognition", weight: 30 },
          { name: "Contextual Awareness", weight: 25 },
          { name: "Adaptive Response", weight: 25 },
          { name: "Anticipatory Thinking", weight: 20 }
        ],
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
        key_components: [
          { name: "Information Analysis", weight: 25 },
          { name: "Risk Assessment", weight: 25 },
          { name: "Decisiveness", weight: 30 },
          { name: "Judgment Quality", weight: 20 }
        ],
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
        key_components: [
          { name: "Clarity & Conciseness", weight: 30 },
          { name: "Active Listening", weight: 25 },
          { name: "Audience Adaptation", weight: 25 },
          { name: "Feedback Delivery", weight: 20 }
        ],
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
        key_components: [
          { name: "Time Management", weight: 30 },
          { name: "Budget Allocation", weight: 25 },
          { name: "Resource Optimization", weight: 25 },
          { name: "Prioritization", weight: 20 }
        ],
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
        key_components: [
          { name: "Stakeholder Mapping", weight: 25 },
          { name: "Relationship Building", weight: 30 },
          { name: "Influence & Persuasion", weight: 25 },
          { name: "Conflict Navigation", weight: 20 }
        ],
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
        key_components: [
          { name: "Goal Setting", weight: 25 },
          { name: "Coaching & Development", weight: 30 },
          { name: "Accountability", weight: 25 },
          { name: "Performance Feedback", weight: 20 }
        ],
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

    // Check if competencies already exist
    const existing = await base44.asServiceRole.entities.Competency.filter({
      is_platform_default: true
    });

    if (existing.length > 0) {
      return Response.json({
        success: true,
        message: `${existing.length} competencies already exist`,
        competencies: existing.map(c => ({ id: c.id, name: c.name, field_key: c.field_key }))
      });
    }

    // Create competencies
    const created = await base44.asServiceRole.entities.Competency.bulkCreate(competencies);

    return Response.json({
      success: true,
      message: `Successfully created ${created.length} competencies`,
      competencies: created.map(c => ({ id: c.id, name: c.name, field_key: c.field_key }))
    });

  } catch (error) {
    console.error('Error seeding competencies:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});