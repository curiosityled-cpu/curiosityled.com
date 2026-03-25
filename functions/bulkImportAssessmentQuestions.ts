import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Bulk imports assessment questions for the Leadership Index
 * Platform Admin only
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Unauthorized - Platform Admin only' }, { status: 403 });
    }

    const { questions } = await req.json();

    if (!Array.isArray(questions) || questions.length === 0) {
      return Response.json({ error: 'Questions array is required' }, { status: 400 });
    }

    // Fetch competencies to map names to IDs
    const competencies = await base44.asServiceRole.entities.Competency.filter({
      is_platform_default: true
    });

    const competencyMap = {};
    competencies.forEach(c => {
      competencyMap[c.name] = c.id;
      // Also map common variations
      if (c.name === "Time/Resource Management") {
        competencyMap["Resource Management"] = c.id;
      }
    });

    // Process questions and map competency names to IDs
    const processedQuestions = questions.map((q, idx) => {
      const competencyId = competencyMap[q.competency_name];
      
      if (!competencyId) {
        throw new Error(`Competency not found: ${q.competency_name}`);
      }

      return {
        competency_id: competencyId,
        question_number: q.question_number || (idx + 1),
        sector: q.sector,
        leadership_level: q.leadership_level,
        scenario_text: q.scenario_text || "",
        question_text: q.question_text,
        question_type: q.question_type || "scenario_based_mcq",
        options: q.options
      };
    });

    // Check for existing questions to avoid duplicates
    const existingQuestions = await base44.asServiceRole.entities.AssessmentQuestion.list();
    
    if (existingQuestions.length > 0) {
      return Response.json({
        success: true,
        message: `${existingQuestions.length} questions already exist. Skipping import.`,
        existing_count: existingQuestions.length
      });
    }

    // Bulk create questions
    const created = await base44.asServiceRole.entities.AssessmentQuestion.bulkCreate(processedQuestions);

    return Response.json({
      success: true,
      message: `Successfully imported ${created.length} assessment questions`,
      created_count: created.length,
      questions_by_sector: processedQuestions.reduce((acc, q) => {
        acc[q.sector] = (acc[q.sector] || 0) + 1;
        return acc;
      }, {}),
      questions_by_level: processedQuestions.reduce((acc, q) => {
        acc[q.leadership_level] = (acc[q.leadership_level] || 0) + 1;
        return acc;
      }, {})
    });

  } catch (error) {
    console.error('Error importing questions:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});