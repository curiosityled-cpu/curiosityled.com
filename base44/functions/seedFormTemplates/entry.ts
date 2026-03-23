import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Unauthorized - Platform Admin required' }, { status: 403 });
    }

    const templates = [
      {
        title: "360 Leadership Assessment",
        description: "Comprehensive multi-rater feedback for leadership development",
        form_type: "360_assessment",
        form_category: "assessment",
        is_platform_default: true,
        tags: ["leadership", "feedback", "assessment"],
        config: {
          sections: [
            {
              id: "leadership_competencies",
              title: "Leadership Competencies",
              questions: [
                {
                  id: "strategic_thinking",
                  question_text: "Rate the leader's strategic thinking ability",
                  type: "linear_scale",
                  required: true,
                  options: { min: 1, max: 5, min_label: "Poor", max_label: "Excellent" }
                },
                {
                  id: "communication",
                  question_text: "Rate the leader's communication effectiveness",
                  type: "linear_scale",
                  required: true,
                  options: { min: 1, max: 5, min_label: "Poor", max_label: "Excellent" }
                },
                {
                  id: "team_development",
                  question_text: "Rate the leader's ability to develop their team",
                  type: "linear_scale",
                  required: true,
                  options: { min: 1, max: 5, min_label: "Poor", max_label: "Excellent" }
                }
              ]
            }
          ]
        }
      },
      {
        title: "DISC Personality Assessment",
        description: "Identify behavioral style using DISC framework",
        form_type: "disc_assessment",
        form_category: "assessment",
        is_platform_default: true,
        tags: ["personality", "disc", "behavioral"],
        config: {
          sections: [
            {
              id: "behavioral_tendencies",
              title: "Behavioral Tendencies",
              questions: [
                {
                  id: "work_style",
                  question_text: "Which describes your typical work style?",
                  type: "radio",
                  required: true,
                  options: {
                    choices: [
                      "Direct and results-focused (Dominance)",
                      "Enthusiastic and people-oriented (Influence)",
                      "Steady and supportive (Steadiness)",
                      "Analytical and detail-oriented (Conscientiousness)"
                    ]
                  }
                }
              ]
            }
          ]
        }
      },
      {
        title: "MBTI Personality Type",
        description: "Discover your Myers-Briggs personality type",
        form_type: "mbti_assessment",
        form_category: "assessment",
        is_platform_default: true,
        tags: ["personality", "mbti", "myers-briggs"],
        config: {
          sections: [
            {
              id: "personality_dimensions",
              title: "Personality Dimensions",
              questions: [
                {
                  id: "energy_source",
                  question_text: "How do you recharge your energy?",
                  type: "radio",
                  required: true,
                  options: {
                    choices: [
                      "Social interaction and being around people (Extraversion)",
                      "Quiet time alone or with close friends (Introversion)"
                    ]
                  }
                }
              ]
            }
          ]
        }
      },
      {
        title: "Kirkpatrick Level 1: Reaction",
        description: "Measure immediate reactions to training",
        form_type: "kirkpatrick_level_1",
        form_category: "evaluation",
        is_platform_default: true,
        tags: ["training", "evaluation", "kirkpatrick"],
        config: {
          sections: [
            {
              id: "satisfaction",
              title: "Training Satisfaction",
              questions: [
                {
                  id: "overall_satisfaction",
                  question_text: "Overall, how satisfied were you with this training?",
                  type: "rating",
                  required: true,
                  options: { max_stars: 5 }
                },
                {
                  id: "content_relevance",
                  question_text: "The content was relevant to my role",
                  type: "linear_scale",
                  required: true,
                  options: { min: 1, max: 5, min_label: "Strongly Disagree", max_label: "Strongly Agree" }
                }
              ]
            }
          ]
        }
      },
      {
        title: "Kirkpatrick Level 2: Learning",
        description: "Assess knowledge and skill acquisition",
        form_type: "kirkpatrick_level_2",
        form_category: "evaluation",
        is_platform_default: true,
        tags: ["training", "evaluation", "kirkpatrick", "learning"],
        config: {
          sections: [
            {
              id: "knowledge_check",
              title: "Knowledge Assessment",
              questions: [
                {
                  id: "key_concepts",
                  question_text: "What are the key concepts you learned?",
                  type: "textarea",
                  required: true
                }
              ]
            }
          ]
        }
      },
      {
        title: "Kirkpatrick Level 3: Behavior",
        description: "Evaluate on-the-job application of learning",
        form_type: "kirkpatrick_level_3",
        form_category: "evaluation",
        is_platform_default: true,
        tags: ["training", "evaluation", "kirkpatrick", "behavior"],
        config: {
          sections: [
            {
              id: "application",
              title: "Behavior Application",
              questions: [
                {
                  id: "application_frequency",
                  question_text: "How often have you applied the skills learned?",
                  type: "radio",
                  required: true,
                  options: {
                    choices: ["Daily", "Weekly", "Monthly", "Rarely", "Never"]
                  }
                }
              ]
            }
          ]
        }
      },
      {
        title: "Kirkpatrick Level 4: Results",
        description: "Measure business impact and ROI",
        form_type: "kirkpatrick_level_4",
        form_category: "evaluation",
        is_platform_default: true,
        tags: ["training", "evaluation", "kirkpatrick", "roi"],
        config: {
          sections: [
            {
              id: "business_impact",
              title: "Business Impact",
              questions: [
                {
                  id: "performance_change",
                  question_text: "Describe measurable changes in performance",
                  type: "textarea",
                  required: true
                }
              ]
            }
          ]
        }
      },
      {
        title: "Development Request Form",
        description: "Submit requests for development programs",
        form_type: "request",
        form_category: "operational",
        is_platform_default: true,
        tags: ["request", "development"],
        config: {
          sections: [
            {
              id: "request_details",
              title: "Request Details",
              questions: [
                {
                  id: "request_type",
                  question_text: "Type of Development Request",
                  type: "select",
                  required: true,
                  options: {
                    choices: ["Coaching", "Mentoring", "Training Program", "Conference", "Certification"]
                  }
                },
                {
                  id: "description",
                  question_text: "Description",
                  type: "textarea",
                  required: true
                }
              ]
            }
          ]
        }
      },
      {
        title: "Program Enrollment Form",
        description: "Enroll in learning programs and journeys",
        form_type: "enrollment",
        form_category: "operational",
        is_platform_default: true,
        tags: ["enrollment", "program"],
        config: {
          sections: [
            {
              id: "enrollment_info",
              title: "Enrollment Information",
              questions: [
                {
                  id: "program_interest",
                  question_text: "Which program are you interested in?",
                  type: "text",
                  required: true
                }
              ]
            }
          ]
        }
      },
      {
        title: "1-on-1 Coaching Evaluation",
        description: "Evaluate individual coaching sessions",
        form_type: "coaching_evaluation_1on1",
        form_category: "evaluation",
        is_platform_default: true,
        tags: ["coaching", "evaluation"],
        config: {
          sections: [
            {
              id: "session_feedback",
              title: "Session Feedback",
              questions: [
                {
                  id: "coach_effectiveness",
                  question_text: "Rate the coach's effectiveness",
                  type: "rating",
                  required: true,
                  options: { max_stars: 5 }
                }
              ]
            }
          ]
        }
      }
    ];

    const results = {
      created: [],
      skipped: [],
      errors: []
    };

    for (const template of templates) {
      try {
        // Check if template already exists
        const existing = await base44.asServiceRole.entities.CustomFormTemplate.filter({
          title: template.title,
          is_platform_default: true
        });

        if (existing.length > 0) {
          results.skipped.push(template.title);
          continue;
        }

        const created = await base44.asServiceRole.entities.CustomFormTemplate.create(template);
        results.created.push(created.title);
      } catch (error) {
        results.errors.push({ title: template.title, error: error.message });
      }
    }

    return Response.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Seed templates error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});