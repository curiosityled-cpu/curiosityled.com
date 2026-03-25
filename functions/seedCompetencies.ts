import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['Platform Admin', 'Super Administrator'].includes(user.app_role)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const competencies = [
      // SITUATIONAL INTELLIGENCE (Meta-Competency)
      {
        name: "Situational Intelligence",
        category: "Situational Intelligence",
        definition: "The ability to rapidly assess complex situations, predict likely outcomes of different approaches, adapt responses to context, and calibrate decision confidence under conditions of uncertainty and threat.",
        key_components: [
          { name: "Situational Assessment", weight: 25 },
          { name: "Outcome Prediction", weight: 30 },
          { name: "Contextual Adaptation", weight: 25 },
          { name: "Decision Calibration", weight: 20 }
        ],
        leadership_level_requirements: {
          level_1_leading_self: 2,
          level_2_leading_others: 3,
          level_3_leading_managers: 4,
          level_4_leading_functions: 5,
          level_5_leading_organizations: 5
        },
        evidence_base: "Situational Intelligence emerges as a well-established, measurable leadership competency with robust academic foundations. McDaniel et al. meta-analysis of 102 coefficients across 10,640 participants established SJTs have useful criterion-related validity (ρ = .34) for predicting job performance. Meta-analytic evidence analyzing 52 effect sizes from 32 samples with 11,640 participants found a strong positive relationship between leadership and adaptive performance (r = .37, p < .001). Trust-based situational awareness methods increased communication effectiveness by 308% (OR = 3.08, p < 0.001) in a 2025 European multi-country study of 3,370 employees.",
        assessment_mapping: {
          score_mapping: "Based on Endsley's three-level model: Level 1 (Perception), Level 2 (Comprehension), Level 3 (Projection)",
          calculation_method: "Composite score from situational judgment tests measuring conflict management, interpersonal skills, problem-solving, and contextual awareness"
        },
        is_platform_default: true
      },

      // TACTICAL COMPETENCIES
      {
        name: "Time and Resource Management",
        category: "Tactical",
        definition: "Effectively organizing, prioritizing, and allocating time, budget, and resources to maximize efficiency and achieve strategic objectives while maintaining quality standards.",
        key_components: [
          { name: "Planning & prioritization", weight: 35 },
          { name: "Budget allocation", weight: 25 },
          { name: "Resource optimization", weight: 25 },
          { name: "Deadline management", weight: 15 }
        ],
        leadership_level_requirements: {
          level_1_leading_self: 2,
          level_2_leading_others: 4,
          level_3_leading_managers: 4,
          level_4_leading_functions: 5,
          level_5_leading_organizations: 5
        },
        evidence_base: "Dunst et al. (2018) meta-analysis shows performance expectations (planning/prioritization) correlate most strongly with effectiveness (r = .37, p < .001, N=39,433). Resource allocation demonstrates moderate correlations (r = .27-.37) with team performance. Deadline management shows supporting role with smaller effect sizes.",
        assessment_mapping: {
          score_mapping: "0-40: Awareness, 41-60: Developing, 61-80: Proficient, 81-100: Mastery",
          calculation_method: "Weighted average of planning, budgeting, and resource optimization assessments"
        },
        is_platform_default: true
      },

      {
        name: "Talent Intelligence & Development",
        category: "Tactical",
        definition: "Identifying, assessing, attracting, and developing talent through strategic workforce planning, skills gap analysis, internal mobility facilitation, and continuous capability building.",
        key_components: [
          { name: "Strategic workforce planning", weight: 35 },
          { name: "Skills assessment", weight: 30 },
          { name: "Internal mobility", weight: 25 },
          { name: "Reskilling strategies", weight: 10 }
        ],
        leadership_level_requirements: {
          level_1_leading_self: 1,
          level_2_leading_others: 3,
          level_3_leading_managers: 4,
          level_4_leading_functions: 5,
          level_5_leading_organizations: 4
        },
        evidence_base: "LinkedIn 2023 research shows workforce planning yields 4.2x ROI correlation, skills assessment improves role placement accuracy by 78%. Internal mobility programs retain 75% vs. 56% baseline (iMocha), while reskilling shows emerging but limited statistical validation.",
        assessment_mapping: {
          score_mapping: "Based on workforce planning effectiveness, assessment accuracy, and retention metrics",
          calculation_method: "Composite of planning quality, assessment utilization, and mobility success rates"
        },
        is_platform_default: true
      },

      {
        name: "Agile People Operations",
        category: "Tactical",
        definition: "Mastery of adaptive people management practices including continuous performance dialogue, team-based goal setting, flexible work design, and rapid organizational response.",
        key_components: [
          { name: "Continuous performance dialogue", weight: 40 },
          { name: "Team-based goals", weight: 30 },
          { name: "Flexible work arrangements", weight: 20 },
          { name: "Rapid response systems", weight: 10 }
        ],
        leadership_level_requirements: {
          level_1_leading_self: 1,
          level_2_leading_others: 3,
          level_3_leading_managers: 4,
          level_4_leading_functions: 4,
          level_5_leading_organizations: 3
        },
        evidence_base: "Organizations with frequent feedback show 14.9% lower turnover and 17% productivity increase. Team goal alignment explains 18% of variance in team effectiveness (Koeslag-Kreunen meta-analysis, 43 studies). Flexible work and rapid response show moderate statistical validation (PubMed Central).",
        assessment_mapping: {
          score_mapping: "Measured through feedback frequency, goal alignment quality, and adaptation speed",
          calculation_method: "Performance dialogue frequency × team goal clarity × flexibility index"
        },
        is_platform_default: true
      },

      {
        name: "Digital and AI Literacy",
        category: "Tactical",
        definition: "Leveraging digital tools, platforms, and artificial intelligence to enhance decision-making, automate processes, and drive innovation while understanding ethical implications.",
        key_components: [
          { name: "AI collaboration", weight: 32 },
          { name: "Digital tool proficiency", weight: 28 },
          { name: "Data interpretation", weight: 25 },
          { name: "Ethical technology use", weight: 15 }
        ],
        leadership_level_requirements: {
          level_1_leading_self: 2,
          level_2_leading_others: 3,
          level_3_leading_managers: 4,
          level_4_leading_functions: 5,
          level_5_leading_organizations: 5
        },
        evidence_base: "Systematic review of 335 articles with 708 researchers validates AI understanding/collaboration as primary component (32%). Tool proficiency correlates r = .68 with digital transformation success (Nature). Data interpretation shows strong CFA validation (Frontiers), while ethics remains foundational (Springer Nature).",
        assessment_mapping: {
          score_mapping: "AI utilization + tool mastery + data analysis capability + ethical awareness",
          calculation_method: "Weighted competency across digital adoption metrics"
        },
        is_platform_default: true
      },

      {
        name: "Performance Management",
        category: "Tactical",
        definition: "Setting clear expectations, providing continuous feedback, coaching for development, and aligning individual contributions with organizational objectives.",
        key_components: [
          { name: "Goal setting", weight: 34 },
          { name: "Continuous feedback", weight: 28 },
          { name: "Coaching delivery", weight: 31 },
          { name: "Performance measurement", weight: 25 }
        ],
        leadership_level_requirements: {
          level_1_leading_self: 1,
          level_2_leading_others: 4,
          level_3_leading_managers: 5,
          level_4_leading_functions: 4,
          level_5_leading_organizations: 3
        },
        evidence_base: "Leadership Circle Profile (2.5 million assessments) shows goal setting explains 34% of variance in team performance. Coaching effectiveness accounts for 31% variance in subordinate growth (PubMed Central). Feedback quality explains 28% variance in employee development.",
        assessment_mapping: {
          score_mapping: "Goal clarity + feedback frequency + coaching quality + measurement accuracy",
          calculation_method: "Composite of goal achievement rates and development outcomes"
        },
        is_platform_default: true
      },

      {
        name: "Business Acumen",
        category: "Tactical",
        definition: "Understanding organizational operations, financial drivers, market dynamics, and strategic context to make informed decisions that create value.",
        key_components: [
          { name: "Strategic alignment", weight: 30 },
          { name: "Financial literacy", weight: 25 },
          { name: "Market awareness", weight: 23 },
          { name: "Value creation", weight: 22 }
        ],
        leadership_level_requirements: {
          level_1_leading_self: 2,
          level_2_leading_others: 3,
          level_3_leading_managers: 4,
          level_4_leading_functions: 5,
          level_5_leading_organizations: 5
        },
        evidence_base: "Strategic alignment shows strongest correlation with organizational performance (r = .55). Financial literacy correlates r = .52 with strategic decision-making effectiveness. Market awareness and value creation show moderate correlations (r = .48-.59) with business outcomes (PubMed Central).",
        assessment_mapping: {
          score_mapping: "Strategic thinking + financial understanding + market insight + value delivery",
          calculation_method: "Business outcome metrics weighted by strategic impact"
        },
        is_platform_default: true
      },

      {
        name: "Facilitation & Virtual Collaboration",
        category: "Tactical",
        definition: "Designing and leading inclusive, productive interactions across in-person, virtual, and hybrid environments while fostering participation and driving outcomes.",
        key_components: [
          { name: "Virtual facilitation", weight: 35 },
          { name: "Hybrid meeting management", weight: 30 },
          { name: "Inclusive practices", weight: 20 },
          { name: "Asynchronous collaboration", weight: 15 }
        ],
        leadership_level_requirements: {
          level_1_leading_self: 2,
          level_2_leading_others: 4,
          level_3_leading_managers: 4,
          level_4_leading_functions: 5,
          level_5_leading_organizations: 5
        },
        evidence_base: "Norwegian COVID-19 study (N=290 observations) shows transformational leadership in virtual settings explains 28% of variance in cooperation (PubMed Central, NIH). Digital interaction dimension rated most critical in virtual leadership competence validation (N=1,211 across four samples) (Springer).",
        assessment_mapping: {
          score_mapping: "Virtual effectiveness + hybrid coordination + inclusion + async productivity",
          calculation_method: "Meeting effectiveness scores × participation rates × outcome delivery"
        },
        is_platform_default: true
      },

      {
        name: "Data Literacy & Evidence-Based Management",
        category: "Tactical",
        definition: "Reading, analyzing, interpreting, and communicating with data to make informed decisions while understanding statistical limitations and avoiding biases.",
        key_components: [
          { name: "Data analysis", weight: 35 },
          { name: "Evidence evaluation", weight: 25 },
          { name: "Statistical reasoning", weight: 25 },
          { name: "Visualization", weight: 15 }
        ],
        leadership_level_requirements: {
          level_1_leading_self: 2,
          level_2_leading_others: 3,
          level_3_leading_managers: 4,
          level_4_leading_functions: 5,
          level_5_leading_organizations: 5
        },
        evidence_base: "MIT Sloan research shows organizations with data literacy programs demonstrate 75% improvement in decision-making quality. Data analysis most frequently cited as primary driver, with r = .64 correlation between data literacy and leadership effectiveness (MIT Sloan).",
        assessment_mapping: {
          score_mapping: "Analysis capability + evidence quality + statistical understanding + communication",
          calculation_method: "Data-driven decision rate × quality of insights × visualization effectiveness"
        },
        is_platform_default: true
      },

      // SELF LEADERSHIP COMPETENCIES
      {
        name: "Decision-Making",
        category: "Self Leadership",
        definition: "Analyzing information, evaluating alternatives, assessing risks and benefits, and making timely, sound decisions even with incomplete information.",
        key_components: [
          { name: "Critical analysis", weight: 35 },
          { name: "Risk assessment", weight: 25 },
          { name: "Option evaluation", weight: 25 },
          { name: "Timely execution", weight: 15 }
        ],
        leadership_level_requirements: {
          level_1_leading_self: 3,
          level_2_leading_others: 4,
          level_3_leading_managers: 5,
          level_4_leading_functions: 5,
          level_5_leading_organizations: 5
        },
        evidence_base: "Dunst et al. meta-analysis shows 'Soliciting Creative Solutions' (critical analysis) correlates r = .61 with leader effectiveness (N=15,701). Risk assessment through shared decision-making shows r = .57 correlation. Option evaluation and execution show moderate supporting roles.",
        assessment_mapping: {
          score_mapping: "Analysis depth + risk evaluation + option comparison + execution speed",
          calculation_method: "Decision quality × timeliness × outcome success rate"
        },
        is_platform_default: true
      },

      {
        name: "Adaptability",
        category: "Self Leadership",
        definition: "Adjusting effectively to changing circumstances, priorities, or challenges while maintaining performance and well-being.",
        key_components: [
          { name: "Flexibility", weight: 30 },
          { name: "Change resilience", weight: 28 },
          { name: "Ambiguity management", weight: 25 },
          { name: "Learning from failure", weight: 17 }
        ],
        leadership_level_requirements: {
          level_1_leading_self: 3,
          level_2_leading_others: 4,
          level_3_leading_managers: 5,
          level_4_leading_functions: 5,
          level_5_leading_organizations: 5
        },
        evidence_base: "Flexibility shows strongest correlation with team performance (r = .47). Change resilience correlates r = .43 with leadership effectiveness. Ambiguity management critical for complex environments (r = .41). Learning from failure shows predictive validity (r = .38) but lower immediate impact.",
        assessment_mapping: {
          score_mapping: "Response flexibility + resilience + complexity handling + growth mindset",
          calculation_method: "Change adaptation speed × stress management × learning integration"
        },
        is_platform_default: true
      },

      {
        name: "Strategic Thinking",
        category: "Self Leadership",
        definition: "Seeing the big picture, identifying patterns and connections, anticipating future trends, and aligning daily actions with long-term objectives.",
        key_components: [
          { name: "Systems perspective", weight: 35 },
          { name: "Pattern recognition", weight: 25 },
          { name: "Future orientation", weight: 25 },
          { name: "Strategic alignment", weight: 15 }
        ],
        leadership_level_requirements: {
          level_1_leading_self: 2,
          level_2_leading_others: 3,
          level_3_leading_managers: 4,
          level_4_leading_functions: 5,
          level_5_leading_organizations: 5
        },
        evidence_base: "Organizational visioning (systems perspective) shows r = .69 correlation with leader effectiveness (Dunst et al.). Systems thinking research shows significant correlation with leadership performance (MIT). Pattern recognition and future orientation demonstrate moderate correlations (r = .44-.52).",
        assessment_mapping: {
          score_mapping: "Big picture thinking + pattern identification + future planning + goal alignment",
          calculation_method: "Strategic vision clarity × pattern recognition × alignment execution"
        },
        is_platform_default: true
      },

      {
        name: "Emotional Intelligence",
        category: "Self Leadership",
        definition: "Recognizing, understanding, and managing one's own emotions and the emotions of others to build strong relationships and navigate social complexities.",
        key_components: [
          { name: "Social skills", weight: 30 },
          { name: "Empathy", weight: 25 },
          { name: "Self-awareness", weight: 25 },
          { name: "Self-regulation", weight: 20 }
        ],
        leadership_level_requirements: {
          level_1_leading_self: 4,
          level_2_leading_others: 5,
          level_3_leading_managers: 5,
          level_4_leading_functions: 5,
          level_5_leading_organizations: 5
        },
        evidence_base: "Mills (2009) meta-analysis of 141 studies shows social skills correlate r = .60-.70 with team performance. Empathy/social awareness: r = .55-.65 with follower satisfaction. Self-awareness: r = .45-.55. Self-regulation: r = .40-.50. Overall EI-leadership relationship: r = .50-.70 (PubMed Central, ResearchGate).",
        assessment_mapping: {
          score_mapping: "Relationship quality + empathy depth + self-awareness + emotional control",
          calculation_method: "Social effectiveness × emotional regulation × relationship outcomes"
        },
        is_platform_default: true
      },

      {
        name: "Leadership Agility",
        category: "Self Leadership",
        definition: "Rapidly adapting leadership style and approach to meet diverse stakeholder needs, shifting priorities, and unexpected challenges.",
        key_components: [
          { name: "Situational adaptation", weight: 30 },
          { name: "Style flexibility", weight: 28 },
          { name: "Quick pivoting", weight: 25 },
          { name: "Context sensitivity", weight: 17 }
        ],
        leadership_level_requirements: {
          level_1_leading_self: 2,
          level_2_leading_others: 3,
          level_3_leading_managers: 4,
          level_4_leading_functions: 5,
          level_5_leading_organizations: 5
        },
        evidence_base: "Joiner & Josephs research shows situational adaptation as highest-level capability. Duke Corporate Education research indicates style flexibility as foundational prerequisite. Quick pivoting shows moderate correlation, context sensitivity emerges as advanced competency.",
        assessment_mapping: {
          score_mapping: "Adaptation speed + style range + pivot capability + context reading",
          calculation_method: "Leadership approach diversity × context appropriateness × change speed"
        },
        is_platform_default: true
      },

      {
        name: "Learning Agility",
        category: "Self Leadership",
        definition: "Learning from experience, seeking feedback, experimenting with new approaches, and applying insights to novel situations.",
        key_components: [
          { name: "Mental agility", weight: 30 },
          { name: "Change agility", weight: 25 },
          { name: "People agility", weight: 25 },
          { name: "Results agility", weight: 20 }
        ],
        leadership_level_requirements: {
          level_1_leading_self: 3,
          level_2_leading_others: 4,
          level_3_leading_managers: 5,
          level_4_leading_functions: 5,
          level_5_leading_organizations: 5
        },
        evidence_base: "Korn Ferry 30-year validation shows mental agility correlates r = .72 with promotion speed. Change agility correlates r = .74 with innovation outcomes. People agility: r = .68 with leadership effectiveness. Results agility: r = .65 with performance outcomes (Korn Ferry).",
        assessment_mapping: {
          score_mapping: "Learning speed + change embrace + interpersonal skill + results focus",
          calculation_method: "Learning velocity × application success × growth trajectory"
        },
        is_platform_default: true
      },

      {
        name: "Managerial Curiosity",
        category: "Self Leadership",
        definition: "Demonstrating proactive desire to explore new ideas, understand diverse perspectives, question assumptions, and seek novel solutions.",
        key_components: [
          { name: "Active questioning", weight: 40 },
          { name: "Perspective seeking", weight: 25 },
          { name: "Assumption challenging", weight: 20 },
          { name: "Innovation mindset", weight: 15 }
        ],
        leadership_level_requirements: {
          level_1_leading_self: 3,
          level_2_leading_others: 4,
          level_3_leading_managers: 4,
          level_4_leading_functions: 5,
          level_5_leading_organizations: 5
        },
        evidence_base: "Harvard Business Review research shows active questioning as primary driver of innovation and adaptation. R&D study (N=372) shows curiosity influences creativity through questioning processes (PubMed Central). Perspective seeking and assumption challenging show moderate effects.",
        assessment_mapping: {
          score_mapping: "Question frequency + perspective diversity + challenge rate + innovation",
          calculation_method: "Inquiry depth × exploration breadth × innovation outcomes"
        },
        is_platform_default: true
      },

      {
        name: "Personal Integrity & Ethics",
        category: "Self Leadership",
        definition: "Consistently demonstrating honest, ethical behavior, taking ownership of actions and decisions, and maintaining moral principles under pressure.",
        key_components: [
          { name: "Ethical consistency", weight: 35 },
          { name: "Accountability", weight: 25 },
          { name: "Transparency", weight: 23 },
          { name: "Moral courage", weight: 17 }
        ],
        leadership_level_requirements: {
          level_1_leading_self: 4,
          level_2_leading_others: 4,
          level_3_leading_managers: 5,
          level_4_leading_functions: 5,
          level_5_leading_organizations: 5
        },
        evidence_base: "Multiple studies show ethical consistency has highest correlation with follower trust (Harvard Business Review). Accountability strongly predicts team performance. Transparency shows moderate correlation with organizational outcomes. Moral courage critical for crisis leadership but lower frequency usage (ResearchGate).",
        assessment_mapping: {
          score_mapping: "Ethical actions + ownership + openness + principled stands",
          calculation_method: "Trust scores × accountability demonstrations × transparency index"
        },
        is_platform_default: true
      },

      {
        name: "Cognitive Flexibility",
        category: "Self Leadership",
        definition: "Switching between different concepts, perspectives, or mental frameworks and adapting thinking strategies to new situations.",
        key_components: [
          { name: "Mental agility", weight: 35 },
          { name: "Perspective shifting", weight: 30 },
          { name: "Framework switching", weight: 20 },
          { name: "Creative problem-solving", weight: 15 }
        ],
        leadership_level_requirements: {
          level_1_leading_self: 2,
          level_2_leading_others: 3,
          level_3_leading_managers: 4,
          level_4_leading_functions: 5,
          level_5_leading_organizations: 5
        },
        evidence_base: "Kercood et al. longitudinal study (N=55) shows cognitive flexibility predicts achievement outcomes (β = .335-.384). Mental agility identified as foundational prerequisite. Perspective shifting shows strong developmental correlation. Framework switching and creative problem-solving are advanced applications (ResearchGate).",
        assessment_mapping: {
          score_mapping: "Mental switching + viewpoint changes + framework adaptation + creativity",
          calculation_method: "Thinking flexibility × problem-solving innovation × adaptation success"
        },
        is_platform_default: true
      },

      {
        name: "Transition from IC to Leader",
        category: "Self Leadership",
        definition: "Successfully shifting identity and capabilities from individual contributor excellence to leadership effectiveness.",
        key_components: [
          { name: "Identity shift", weight: 40 },
          { name: "Delegation mastery", weight: 30 },
          { name: "Team empowerment", weight: 20 },
          { name: "Strategic focus", weight: 10 }
        ],
        leadership_level_requirements: {
          level_1_leading_self: 2,
          level_2_leading_others: 4,
          level_3_leading_managers: 5,
          level_4_leading_functions: 1,
          level_5_leading_organizations: 1
        },
        evidence_base: "Maurer & London research shows identity shift failure predicts 67% of leadership transition failures (r = .71 with delegation mastery). Delegation mastery shows second-highest correlation with transition success (Odgers). Team empowerment and strategic focus emerge as advanced capabilities (SAGE Journals).",
        assessment_mapping: {
          score_mapping: "Role identity + delegation effectiveness + team enablement + strategic orientation",
          calculation_method: "Identity integration × delegation success × team outcomes"
        },
        is_platform_default: true
      },

      {
        name: "Systems Thinking",
        category: "Self Leadership",
        definition: "Understanding interconnections, feedback loops, and emergent properties within complex systems to identify leverage points.",
        key_components: [
          { name: "Interconnection mapping", weight: 40 },
          { name: "Feedback analysis", weight: 25 },
          { name: "Leverage identification", weight: 20 },
          { name: "Unintended consequences", weight: 15 }
        ],
        leadership_level_requirements: {
          level_1_leading_self: 2,
          level_2_leading_others: 3,
          level_3_leading_managers: 4,
          level_4_leading_functions: 5,
          level_5_leading_organizations: 5
        },
        evidence_base: "Palaima & Skaržauskienė study (N=201) shows systems thinking associated with higher leadership performance. Interconnection mapping identified as foundational 'cognitive intelligence competence.' Feedback analysis shows moderate correlation, leverage identification and consequences analysis are advanced applications (ResearchGate).",
        assessment_mapping: {
          score_mapping: "System comprehension + feedback understanding + leverage points + risk awareness",
          calculation_method: "Systems map complexity × feedback loop identification × leverage effectiveness"
        },
        is_platform_default: true
      },

      // PEOPLE LEADERSHIP COMPETENCIES
      {
        name: "Collaboration",
        category: "People Leadership",
        definition: "Working effectively with diverse stakeholders to achieve shared goals through partnership building, resource sharing, and collective problem-solving.",
        key_components: [
          { name: "Partnership building", weight: 35 },
          { name: "Cross-functional work", weight: 25 },
          { name: "Resource sharing", weight: 22 },
          { name: "Conflict resolution", weight: 18 }
        ],
        leadership_level_requirements: {
          level_1_leading_self: 2,
          level_2_leading_others: 4,
          level_3_leading_managers: 5,
          level_4_leading_functions: 5,
          level_5_leading_organizations: 5
        },
        evidence_base: "Academic R&D study (N=64) shows partnership building highest effectiveness rating (4.56 mean score). Cross-functional work critical for innovation (PubMed Central). Resource sharing shows moderate ratings. Conflict resolution rated as supporting component with lower effectiveness scores.",
        assessment_mapping: {
          score_mapping: "Partnership quality + cross-functional success + sharing effectiveness + resolution",
          calculation_method: "Collaboration outcomes × stakeholder satisfaction × shared goals achieved"
        },
        is_platform_default: true
      },

      {
        name: "Communication",
        category: "People Leadership",
        definition: "Clearly conveying information, ideas, and expectations while actively listening, adapting messages to audiences, and fostering open dialogue.",
        key_components: [
          { name: "Message clarity", weight: 35 },
          { name: "Active listening", weight: 25 },
          { name: "Audience adaptation", weight: 22 },
          { name: "Two-way dialogue", weight: 18 }
        ],
        leadership_level_requirements: {
          level_1_leading_self: 3,
          level_2_leading_others: 4,
          level_3_leading_managers: 5,
          level_4_leading_functions: 5,
          level_5_leading_organizations: 5
        },
        evidence_base: "Dunst et al. shows motivational communication (clarity) correlates r = .66 with leader effectiveness. Encouraging input/feedback (listening) shows r = .54 correlation. Relationship-building through adaptation: r = .58. Two-way dialogue shows supporting correlation (r = .24-.35) (PubMed Central).",
        assessment_mapping: {
          score_mapping: "Message understanding + listening quality + adaptation + dialogue richness",
          calculation_method: "Communication clarity × listening effectiveness × adaptation success"
        },
        is_platform_default: true
      },

      {
        name: "Delegation",
        category: "People Leadership",
        definition: "Effectively assigning appropriate tasks and authority to team members based on capabilities, providing clear expectations, and maintaining accountability.",
        key_components: [
          { name: "Authority granting", weight: 30 },
          { name: "Task matching", weight: 28 },
          { name: "Clear expectations", weight: 25 },
          { name: "Follow-through", weight: 17 }
        ],
        leadership_level_requirements: {
          level_1_leading_self: 1,
          level_2_leading_others: 4,
          level_3_leading_managers: 5,
          level_4_leading_functions: 4,
          level_5_leading_organizations: 3
        },
        evidence_base: "Leadership transition research shows delegation mastery correlates r = .71 with successful IC-to-leader transformation (Odgers). Authority granting and task matching show highest effectiveness. Clear expectations moderately correlate with team performance. Follow-through provides supporting validation.",
        assessment_mapping: {
          score_mapping: "Empowerment + task fit + clarity + accountability",
          calculation_method: "Delegation frequency × task appropriateness × outcome success"
        },
        is_platform_default: true
      },

      {
        name: "Developing Others",
        category: "People Leadership",
        definition: "Supporting growth and skill development of team members through coaching, mentoring, feedback, and creating developmental opportunities.",
        key_components: [
          { name: "Coaching delivery", weight: 35 },
          { name: "Growth planning", weight: 25 },
          { name: "Opportunity creation", weight: 23 },
          { name: "Mentoring", weight: 17 }
        ],
        leadership_level_requirements: {
          level_1_leading_self: 1,
          level_2_leading_others: 4,
          level_3_leading_managers: 5,
          level_4_leading_functions: 5,
          level_5_leading_organizations: 4
        },
        evidence_base: "Multiple coaching studies show 82% effectiveness rating for coaching delivery (PubMed Central). Fortune 500 analysis shows structured programs yield highest ROI. Growth planning significantly correlates with engagement. Mentoring shows 15-38% improvement but lower frequency implementation.",
        assessment_mapping: {
          score_mapping: "Coaching quality + development plans + opportunities + mentorship",
          calculation_method: "Development outcomes × growth acceleration × capability advancement"
        },
        is_platform_default: true
      },

      {
        name: "Managing Difficult Conversations",
        category: "People Leadership",
        definition: "Addressing sensitive topics with confidence, empathy, and clarity while managing emotional reactions and achieving constructive outcomes.",
        key_components: [
          { name: "Preparation strategies", weight: 35 },
          { name: "Clear messaging", weight: 28 },
          { name: "Emotional regulation", weight: 25 },
          { name: "Solution focus", weight: 12 }
        ],
        leadership_level_requirements: {
          level_1_leading_self: 2,
          level_2_leading_others: 4,
          level_3_leading_managers: 5,
          level_4_leading_functions: 5,
          level_5_leading_organizations: 5
        },
        evidence_base: "Bradley & Campbell study shows preparation strategies highest correlation with successful outcomes (r = .58). Clear messaging strong predictor of resolution (r = .52). Emotional regulation moderate correlation (r = .44). Solution focus supports relationship maintenance (r = .49) (Sage Journals).",
        assessment_mapping: {
          score_mapping: "Preparation + clarity + emotion management + constructive outcomes",
          calculation_method: "Conversation success rate × relationship preservation × outcome achievement"
        },
        is_platform_default: true
      },

      {
        name: "Team Leadership",
        category: "People Leadership",
        definition: "Inspiring and guiding teams toward collective goals while building trust, fostering collaboration, and optimizing team dynamics.",
        key_components: [
          { name: "Vision setting", weight: 35 },
          { name: "Trust building", weight: 25 },
          { name: "Team dynamics", weight: 22 },
          { name: "Performance optimization", weight: 18 }
        ],
        leadership_level_requirements: {
          level_1_leading_self: 1,
          level_2_leading_others: 4,
          level_3_leading_managers: 5,
          level_4_leading_functions: 5,
          level_5_leading_organizations: 4
        },
        evidence_base: "Meta-analysis shows team leadership explains 18% variance in team learning (PubMed Central). Vision setting shows strongest correlation (r = .45) with team performance. Trust building correlates r = .41 with team cohesion. Team dynamics and performance optimization show moderate effectiveness.",
        assessment_mapping: {
          score_mapping: "Vision clarity + trust level + dynamics quality + performance",
          calculation_method: "Team cohesion × performance outcomes × member satisfaction"
        },
        is_platform_default: true
      },

      {
        name: "Partnering with Senior Leaders",
        category: "People Leadership",
        definition: "Navigating organizational hierarchy to secure support, align priorities, influence without authority, and advocate for team needs.",
        key_components: [
          { name: "Upward influence", weight: 35 },
          { name: "Priority alignment", weight: 25 },
          { name: "Political awareness", weight: 22 },
          { name: "Advocacy skills", weight: 18 }
        ],
        leadership_level_requirements: {
          level_1_leading_self: 1,
          level_2_leading_others: 3,
          level_3_leading_managers: 4,
          level_4_leading_functions: 5,
          level_5_leading_organizations: 5
        },
        evidence_base: "Malaysian study (N=338) shows rational influence tactics (upward influence) predict all career outcomes (B = 0.267 for salary progression). Priority alignment significantly predicts promotability. Political awareness moderates effectiveness. Advocacy skills support relationship quality (Skillsoft).",
        assessment_mapping: {
          score_mapping: "Influence effectiveness + alignment + political skill + advocacy",
          calculation_method: "Senior support secured × priority integration × advocacy outcomes"
        },
        is_platform_default: true
      },

      {
        name: "Organizational Impact",
        category: "People Leadership",
        definition: "Aligning team efforts with stakeholder needs, translating strategy into action, and delivering measurable value to customers.",
        key_components: [
          { name: "Stakeholder alignment", weight: 35 },
          { name: "Strategy translation", weight: 25 },
          { name: "Value delivery", weight: 25 },
          { name: "Impact measurement", weight: 15 }
        ],
        leadership_level_requirements: {
          level_1_leading_self: 1,
          level_2_leading_others: 3,
          level_3_leading_managers: 4,
          level_4_leading_functions: 5,
          level_5_leading_organizations: 5
        },
        evidence_base: "Leadership development ROI meta-analysis shows stakeholder alignment as primary driver of organizational outcomes (Skillsoft, PubMed Central). Strategy translation correlates significantly with team performance. Value delivery shows moderate effect size on business results. Impact measurement critical for sustained effectiveness.",
        assessment_mapping: {
          score_mapping: "Stakeholder satisfaction + strategy execution + value created + impact metrics",
          calculation_method: "Stakeholder alignment × strategic delivery × value generation"
        },
        is_platform_default: true
      },

      {
        name: "Psychological Safety Creation",
        category: "People Leadership",
        definition: "Fostering an environment where team members feel safe to take risks, make mistakes, ask questions, and express dissenting views.",
        key_components: [
          { name: "Trust establishment", weight: 35 },
          { name: "Open dialogue", weight: 30 },
          { name: "Risk encouragement", weight: 20 },
          { name: "Failure normalization", weight: 15 }
        ],
        leadership_level_requirements: {
          level_1_leading_self: 2,
          level_2_leading_others: 4,
          level_3_leading_managers: 5,
          level_4_leading_functions: 5,
          level_5_leading_organizations: 5
        },
        evidence_base: "Edmondson's research validated by McKinsey study (1,150+ leaders) shows trust establishment correlates r = .67 with team performance (NCBI). Open dialogue facilitates 44% higher innovation. Risk encouragement improves problem identification by 34%. Failure normalization accelerates learning cycles by 23% (McKinsey).",
        assessment_mapping: {
          score_mapping: "Trust + openness + risk-taking + failure learning",
          calculation_method: "Psychological safety score × innovation rate × learning velocity"
        },
        is_platform_default: true
      },

    ];

    const results = [];
    for (const comp of competencies) {
      try {
        const created = await base44.asServiceRole.entities.Competency.create(comp);
        results.push({ success: true, name: comp.name, id: created.id });
      } catch (error) {
        results.push({ success: false, name: comp.name, error: error.message });
      }
    }

    return Response.json({
      message: 'Competencies seeded',
      results,
      summary: {
        total: competencies.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });

  } catch (error) {
    console.error('Error seeding competencies:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});