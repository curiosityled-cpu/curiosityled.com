import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Combined Assessment Scoring Engine
 * 
 * Implements both:
 * 1. Absolute Proficiency + Benchmark Comparison (quantitative)
 * 2. Leadership Style Profiling (qualitative)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { submission_id } = await req.json();

    if (!submission_id) {
      return Response.json({ error: 'submission_id required' }, { status: 400 });
    }

    // Get the submission
    const submissions = await base44.asServiceRole.entities.AssessmentSubmission.filter({ 
      id: submission_id 
    });

    if (submissions.length === 0) {
      return Response.json({ error: 'Submission not found' }, { status: 404 });
    }

    const submission = submissions[0];
    const responses = submission.user_responses || [];

    if (responses.length === 0) {
      return Response.json({ error: 'No responses to score' }, { status: 400 });
    }

    // ============================================
    // PART 1: PROFICIENCY SCORING + BENCHMARKING
    // ============================================

    // Group responses by competency
    const competencyResponses = {};
    
    for (const response of responses) {
      const competencyId = response.competency_id;
      if (!competencyResponses[competencyId]) {
        competencyResponses[competencyId] = [];
      }
      competencyResponses[competencyId].push(response);
    }

    // Get all competencies referenced
    const competencyIds = Object.keys(competencyResponses);
    const competencies = await base44.asServiceRole.entities.Competency.filter({
      id: { $in: competencyIds }
    });

    const competencyMap = {};
    competencies.forEach(c => {
      competencyMap[c.id] = c;
    });

    // Calculate proficiency scores
    const competencyScores = {};
    let totalProficiency = 0;
    let totalBenchmark = 0;
    let competencyCount = 0;

    for (const [competencyId, compResponses] of Object.entries(competencyResponses)) {
      const competency = competencyMap[competencyId];
      if (!competency) continue;

      // Calculate average proficiency for this competency
      const proficiencySum = compResponses.reduce((sum, r) => sum + (r.proficiency_value || 0), 0);
      const avgProficiency = proficiencySum / compResponses.length;

      // Get benchmark for user's level
      const levelKey = {
        "Level 1 (Leading Self)": "level_1",
        "Level 2 (Leading Others)": "level_2",
        "Level 3 (Leading Managers)": "level_3",
        "Level 4 (Leading Functions)": "level_4",
        "Level 5 (Leading Organizations)": "level_5",
        "HiPo Individual Contributor": "level_1" // Use Level 1 benchmark for HiPo
      }[submission.leadership_level] || "level_1";

      const benchmark = competency.leadership_level_requirements?.[levelKey] || 2.0;
      const gap = avgProficiency - benchmark;

      // Determine gap label
      let gapLabel = "On Track";
      if (gap >= 1.5) gapLabel = "Significantly Exceeding";
      else if (gap >= 0.75) gapLabel = "Exceeding Expectations";
      else if (gap >= -0.25) gapLabel = "On Track";
      else if (gap >= -0.75) gapLabel = "Developing";
      else gapLabel = "Needs Focus";

      // Determine proficiency label
      let proficiencyLabel = "Awareness";
      if (avgProficiency >= 3.5) proficiencyLabel = "Mastery";
      else if (avgProficiency >= 2.5) proficiencyLabel = "Proficient";
      else if (avgProficiency >= 1.5) proficiencyLabel = "Developing";

      competencyScores[competency.name] = {
        proficiency_level: Math.round(avgProficiency * 10) / 10,
        benchmark: benchmark,
        gap: Math.round(gap * 10) / 10,
        gap_label: gapLabel,
        proficiency_label: proficiencyLabel,
        question_scores: compResponses.map(r => r.proficiency_value)
      };

      totalProficiency += avgProficiency;
      totalBenchmark += benchmark;
      competencyCount++;
    }

    const overallProficiency = totalProficiency / competencyCount;
    const overallBenchmark = totalBenchmark / competencyCount;
    const overallGap = overallProficiency - overallBenchmark;

    let proficiencyBand = "Awareness";
    if (overallProficiency >= 3.5) proficiencyBand = "Mastery";
    else if (overallProficiency >= 2.5) proficiencyBand = "Proficient";
    else if (overallProficiency >= 1.5) proficiencyBand = "Developing";

    let performanceSummary = "On track for " + submission.leadership_level;
    if (overallGap >= 0.75) performanceSummary = "Exceeding expectations for " + submission.leadership_level;
    else if (overallGap < -0.5) performanceSummary = "Developing toward expectations for " + submission.leadership_level;

    const proficiencyScores = {
      competency_scores: competencyScores,
      overall_proficiency: Math.round(overallProficiency * 10) / 10,
      overall_benchmark: Math.round(overallBenchmark * 10) / 10,
      overall_gap: Math.round(overallGap * 10) / 10,
      proficiency_band: proficiencyBand,
      performance_summary: performanceSummary
    };

    // ============================================
    // PART 2: LEADERSHIP STYLE PROFILING
    // ============================================

    // Count response distribution
    const distribution = { A: 0, B: 0, C: 0, D: 0 };
    responses.forEach(r => {
      if (r.selected_option) {
        distribution[r.selected_option]++;
      }
    });

    const totalResponses = responses.length;
    const responseDistribution = {
      A_count: distribution.A,
      B_count: distribution.B,
      C_count: distribution.C,
      D_count: distribution.D,
      A_percentage: Math.round((distribution.A / totalResponses) * 100),
      B_percentage: Math.round((distribution.B / totalResponses) * 100),
      C_percentage: Math.round((distribution.C / totalResponses) * 100),
      D_percentage: Math.round((distribution.D / totalResponses) * 100)
    };

    // Determine style dimensions
    const collaborationScore = distribution.C + distribution.D;
    const collaborationPct = collaborationScore / totalResponses;
    
    let collaborationOrientation = "Individualistic";
    if (collaborationPct >= 0.7) collaborationOrientation = "Empowering";
    else if (collaborationPct >= 0.5) collaborationOrientation = "Collaborative";
    else if (collaborationPct >= 0.3) collaborationOrientation = "Directive";

    const decisionScore = distribution.C + distribution.D;
    const decisionPct = decisionScore / totalResponses;
    
    let decisionSpeed = "Avoidant";
    if (decisionPct >= 0.7) decisionSpeed = "Action-Oriented";
    else if (decisionPct >= 0.5) decisionSpeed = "Decisive";
    else if (decisionPct >= 0.3) decisionSpeed = "Consultative";

    const peopleFocusScore = (distribution.B * 0.3) + (distribution.C * 0.6) + (distribution.D * 1.0);
    const peopleFocusPct = peopleFocusScore / totalResponses;
    
    let peopleFocus = "Task-Focused";
    if (peopleFocusPct >= 0.7) peopleFocus = "Team-Empowering";
    else if (peopleFocusPct >= 0.5) peopleFocus = "People-Centered";
    else if (peopleFocusPct >= 0.3) peopleFocus = "Process-Focused";

    const innovationScore = distribution.C + (distribution.D * 1.5);
    const innovationPct = innovationScore / (totalResponses * 1.5);
    
    let innovationOrientation = "Conservative";
    if (innovationPct >= 0.6) innovationOrientation = "Innovative";
    else if (innovationPct >= 0.4) innovationOrientation = "Adaptive";
    else if (innovationPct >= 0.25) innovationOrientation = "Cautious";

    const stakeholderScore = (distribution.B * 0.5) + (distribution.C * 1.0) + (distribution.D * 1.5);
    const stakeholderPct = stakeholderScore / (totalResponses * 1.5);
    
    let stakeholderApproach = "Hierarchical";
    if (stakeholderPct >= 0.7) stakeholderApproach = "Influencing";
    else if (stakeholderPct >= 0.5) stakeholderApproach = "Networked";
    else if (stakeholderPct >= 0.3) stakeholderApproach = "Formal";

    // ============================================
    // ARCHETYPE DETERMINATION
    // Based on competency strengths and response patterns
    // ============================================

    // Identify top 2 competencies by proficiency
    const sortedCompetencies = Object.entries(competencyScores)
      .sort((a, b) => b[1].proficiency_level - a[1].proficiency_level)
      .slice(0, 2);

    const topCompetency1 = sortedCompetencies[0]?.[0] || "";
    const topCompetency2 = sortedCompetencies[1]?.[0] || "";

    // Archetype mapping based on Leadership Index framework
    let primaryArchetype = "The Developing Leader";
    let archetypeTagline = "Building foundational leadership capabilities";

    // The Adaptive Strategist: Decision-Making + Situational Intelligence
    if ((topCompetency1.includes("Decision") || topCompetency2.includes("Decision")) &&
        (topCompetency1.includes("Situational") || topCompetency2.includes("Situational"))) {
      primaryArchetype = "The Adaptive Strategist";
      archetypeTagline = "Excels at seeing the big picture and flexing plans in fast-changing environments";
    }
    // The Influential Connector: Communication + Stakeholder Management
    else if ((topCompetency1.includes("Communication") || topCompetency2.includes("Communication")) &&
             (topCompetency1.includes("Stakeholder") || topCompetency2.includes("Stakeholder") ||
              topCompetency1.includes("Collaboration") || topCompetency2.includes("Collaboration"))) {
      primaryArchetype = "The Influential Connector";
      archetypeTagline = "Builds strong networks and unites stakeholders to drive outcomes";
    }
    // The Resourceful Optimizer: Resource Management + Decision-Making
    else if ((topCompetency1.includes("Resource") || topCompetency2.includes("Resource")) &&
             (topCompetency1.includes("Decision") || topCompetency2.includes("Decision"))) {
      primaryArchetype = "The Resourceful Optimizer";
      archetypeTagline = "Makes the most of resources—keeps teams focused, efficient, and calm under pressure";
    }
    // The Performance Catalyst: Performance Management + Communication
    else if ((topCompetency1.includes("Performance") || topCompetency2.includes("Performance")) &&
             (topCompetency1.includes("Communication") || topCompetency2.includes("Communication"))) {
      primaryArchetype = "The Performance Catalyst";
      archetypeTagline = "Elevates team performance with clear standards, coaching, and accountability";
    }
    // The Steady Operator: Resource Management + Performance Management
    else if ((topCompetency1.includes("Resource") || topCompetency2.includes("Resource")) &&
             (topCompetency1.includes("Performance") || topCompetency2.includes("Performance"))) {
      primaryArchetype = "The Steady Operator";
      archetypeTagline = "Ensures reliability and structure, keeping everything on track—especially in uncertain times";
    }
    // The Change Navigator: Situational Intelligence + Stakeholder Management
    else if ((topCompetency1.includes("Situational") || topCompetency2.includes("Situational")) &&
             (topCompetency1.includes("Stakeholder") || topCompetency2.includes("Stakeholder"))) {
      primaryArchetype = "The Change Navigator";
      archetypeTagline = "Thrives in ambiguity, adapts quickly, and inspires others through transitions";
    }
    // The Collaborative Problem-Solver: High collaboration across competencies
    else if (collaborationPct >= 0.65 && (topCompetency1.includes("Collaboration") || 
                                          topCompetency2.includes("Collaboration") ||
                                          topCompetency1.includes("Communication") || 
                                          topCompetency2.includes("Communication"))) {
      primaryArchetype = "The Collaborative Problem-Solver";
      archetypeTagline = "Excels at collaborative decision-making and bringing diverse perspectives to the table";
    }
    // The Visionary Architect: High D responses with strategic orientation
    else if (distribution.D >= distribution.C && 
             (topCompetency1.includes("Decision") || topCompetency1.includes("Situational"))) {
      primaryArchetype = "The Visionary Architect";
      archetypeTagline = "Focuses on long-term goals, aligns teams to purpose, and charts new paths";
    }

    let primaryStyle = primaryArchetype;
    let secondaryStyle = archetypeTagline;

    // Analyze competency-specific styles
    const competencyStyles = {};
    
    for (const [competencyId, compResponses] of Object.entries(competencyResponses)) {
      const competency = competencyMap[competencyId];
      if (!competency) continue;

      const compDist = { A: 0, B: 0, C: 0, D: 0 };
      compResponses.forEach(r => {
        if (r.selected_option) compDist[r.selected_option]++;
      });

      let dominantApproach = "Structured & Inclusive";
      if (compDist.D > compDist.C) dominantApproach = "Strategic & Transformational";
      else if (compDist.B > compDist.C) dominantApproach = "Practical & Developing";
      else if (compDist.A > 0) dominantApproach = "Reactive & Learning";

      competencyStyles[competency.name] = {
        dominant_approach: dominantApproach,
        pattern_notes: `${compDist.A} Awareness, ${compDist.B} Developing, ${compDist.C} Proficient, ${compDist.D} Mastery responses`
      };
    }

    // Generate style strengths and development areas using AI
    const aiPrompt = `Analyze this leadership assessment profile and provide insights:

LEADERSHIP LEVEL: ${submission.leadership_level}
SECTOR: ${submission.sector}

LEADERSHIP ARCHETYPE: ${primaryArchetype}
ARCHETYPE TAGLINE: ${archetypeTagline}

PROFICIENCY SCORES (vs. Benchmark for ${submission.leadership_level}):
${JSON.stringify(competencyScores, null, 2)}

LEADERSHIP STYLE DIMENSIONS:
- Collaboration: ${collaborationOrientation}
- Decision Speed: ${decisionSpeed}
- People Focus: ${peopleFocus}
- Innovation: ${innovationOrientation}
- Stakeholder Approach: ${stakeholderApproach}

RESPONSE DISTRIBUTION: ${responseDistribution.A_percentage}% Awareness, ${responseDistribution.B_percentage}% Developing, ${responseDistribution.C_percentage}% Proficient, ${responseDistribution.D_percentage}% Mastery

TOP COMPETENCIES: ${topCompetency1}, ${topCompetency2}

Using the Leadership Index framework, generate:

1. style_description (2-3 sentences describing their unique leadership approach based on their archetype)

2. style_strengths (4-6 specific strengths based on their archetype and proficiency scores)

3. style_development_areas (4-6 development considerations specific to:
   - Their archetype's typical blind spots
   - Their leadership level expectations
   - Gaps between their proficiency and benchmark)

4. level_appropriate_style_feedback (How their archetype and demonstrated proficiency fit their current leadership level. Are they ready for advancement? Should they deepen certain competencies?)

5. development_insights (array of 4-6 competency-specific observations with actionable recommendations. For each, reference their proficiency gap and archetype patterns)

6. executive_summary (3-4 sentences summarizing their archetype, overall proficiency vs. benchmark, and readiness)

7. key_findings (5-7 bullet points highlighting most important insights about their leadership)

8. recommended_actions (5-7 specific, actionable next steps for development)`;

    const aiAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt: aiPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          style_description: { type: "string" },
          style_strengths: {
            type: "array",
            items: { type: "string" }
          },
          style_development_areas: {
            type: "array",
            items: { type: "string" }
          },
          level_appropriate_style_feedback: { type: "string" },
          development_insights: {
            type: "array",
            items: {
              type: "object",
              properties: {
                competency_name: { type: "string" },
                observation: { type: "string" },
                recommendation: { type: "string" }
              }
            }
          },
          executive_summary: { type: "string" },
          key_findings: {
            type: "array",
            items: { type: "string" }
          },
          recommended_actions: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    const leadershipStyleProfile = {
      primary_style: primaryStyle,
      secondary_style: secondaryStyle,
      archetype: primaryArchetype,
      archetype_tagline: archetypeTagline,
      style_description: aiAnalysis.style_description,
      style_dimensions: {
        collaboration_orientation: collaborationOrientation,
        decision_speed: decisionSpeed,
        people_focus: peopleFocus,
        innovation_orientation: innovationOrientation,
        stakeholder_approach: stakeholderApproach
      },
      response_distribution: responseDistribution,
      competency_styles: competencyStyles,
      style_strengths: aiAnalysis.style_strengths,
      style_development_areas: aiAnalysis.style_development_areas,
      level_appropriate_style_feedback: aiAnalysis.level_appropriate_style_feedback
    };

    // ============================================
    // PART 3: CREATE BACKWARD-COMPATIBLE ASSESSMENT RECORD
    // ============================================

    // Map competency names to legacy field keys
    const competencyFieldMap = {};
    competencies.forEach(c => {
      if (c.field_key) {
        competencyFieldMap[c.name] = c.field_key;
      }
    });

    // Build legacy assessment record
    const legacyAssessment = {
      client_id: submission.client_id,
      email: submission.user_email,
      response_id: submission.id,
      submission_ts: submission.submission_date || new Date().toISOString(),
      overall_pct: Math.round(overallProficiency * 25), // Convert 1-4 scale to percentage
      archetype_label: primaryArchetype,
      band_overall: proficiencyBand,
      record: {
        proficiency_scores: proficiencyScores,
        leadership_style_profile: leadershipStyleProfile,
        development_insights: aiAnalysis.development_insights,
        ai_generated_report: {
          executive_summary: aiAnalysis.executive_summary,
          key_findings: aiAnalysis.key_findings,
          recommended_actions: aiAnalysis.recommended_actions
        }
      }
    };

    // Map competency scores to legacy percentage fields
    Object.entries(competencyScores).forEach(([compName, compData]) => {
      const fieldKey = competencyFieldMap[compName];
      if (fieldKey) {
        legacyAssessment[`${fieldKey}_pct`] = Math.round(compData.proficiency_level * 25);
      }
    });

    // Check if Assessment already exists for this submission
    const existingAssessments = await base44.asServiceRole.entities.Assessment.filter({
      response_id: submission.id
    });

    if (existingAssessments.length > 0) {
      // Update existing
      await base44.asServiceRole.entities.Assessment.update(
        existingAssessments[0].id,
        legacyAssessment
      );
    } else {
      // Create new
      await base44.asServiceRole.entities.Assessment.create(legacyAssessment);
    }

    // ============================================
    // PART 4: UPDATE SUBMISSION
    // ============================================

    const updateData = {
      status: "scored",
      proficiency_scores: proficiencyScores,
      leadership_style_profile: leadershipStyleProfile,
      development_insights: aiAnalysis.development_insights,
      ai_generated_report: {
        executive_summary: aiAnalysis.executive_summary,
        key_findings: aiAnalysis.key_findings,
        recommended_actions: aiAnalysis.recommended_actions
      }
    };

    await base44.asServiceRole.entities.AssessmentSubmission.update(
      submission_id,
      updateData
    );

    // Award gamification points for assessment completion
    try {
      await base44.asServiceRole.functions.invoke('awardPoints', {
        user_email: submission.user_email,
        points_amount: submission.points_value || 100,
        transaction_type: 'earned_activity',
        reason: 'Completed leadership assessment',
        related_entity_type: 'AssessmentSubmission',
        related_entity_id: submission_id,
        client_id: submission.client_id
      });
    } catch (gamificationError) {
      console.log('Gamification award failed (non-critical):', gamificationError.message);
    }

    return Response.json({
      success: true,
      submission_id,
      proficiency_scores: proficiencyScores,
      leadership_style: {
        archetype: primaryArchetype,
        archetype_tagline: archetypeTagline,
        primary_style: primaryStyle,
        style_description: aiAnalysis.style_description
      },
      overall_summary: {
        proficiency_band: proficiencyBand,
        performance_summary: performanceSummary,
        archetype: primaryArchetype,
        executive_summary: aiAnalysis.executive_summary
      }
    });

  } catch (error) {
    console.error('Error scoring assessment:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});