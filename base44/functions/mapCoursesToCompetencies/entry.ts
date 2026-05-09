import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// All competencies from the PDF competency model
const COMPETENCY_MODEL = [
  // Tactical
  "Time and Resource Management",
  "Talent Intelligence & Development",
  "Agile People Operations",
  "Digital and AI Literacy",
  "Performance Management",
  "Business Acumen",
  "Facilitation & Virtual Collaboration",
  "Data Literacy & Evidence-Based Management",
  // Self Leadership
  "Decision-Making",
  "Adaptability",
  "Strategic Thinking",
  "Emotional Intelligence",
  "Leadership Agility",
  "Learning Agility",
  "Managerial Curiosity",
  "Personal Integrity & Ethics",
  "Cognitive Flexibility",
  "Transition from IC to Leader",
  "Systems Thinking",
  // People Leadership
  "Collaboration",
  "Communication",
  "Delegation",
  "Developing Others",
  "Managing Difficult Conversations",
  "Team Leadership",
  "Partnering with Senior Leaders",
  "Organizational Impact",
  "Psychological Safety Creation",
  "Ethical Decision-Making & AI Governance",
  // Situational Intelligence
  "Situational Intelligence",
];

// Keyword → competency mapping for skill-based alignment
const SKILL_TO_COMPETENCY = {
  // Leadership & Management broad
  "Leadership": ["Team Leadership", "Leadership Agility"],
  "Management": ["Performance Management", "Time and Resource Management"],
  "Management Skills": ["Performance Management", "Time and Resource Management"],

  // Communication
  "Communication": ["Communication"],
  "Public Speaking": ["Communication"],
  "Presentation Skills": ["Communication", "Facilitation & Virtual Collaboration"],
  "Business Communication": ["Communication"],
  "Storytelling": ["Communication"],
  "Writing": ["Communication"],
  "Active Listening": ["Communication"],
  "Nonverbal Communication": ["Communication"],

  // Collaboration & Teams
  "Collaboration": ["Collaboration"],
  "Teamwork": ["Collaboration", "Team Leadership"],
  "Cross-functional Collaboration": ["Collaboration"],
  "Team Building": ["Team Leadership", "Collaboration"],
  "Team Management": ["Team Leadership"],
  "Remote Teams": ["Facilitation & Virtual Collaboration"],
  "Virtual Teams": ["Facilitation & Virtual Collaboration"],
  "Hybrid Work": ["Facilitation & Virtual Collaboration"],

  // Decision Making & Critical Thinking
  "Decision Making": ["Decision-Making"],
  "Critical Thinking": ["Decision-Making", "Cognitive Flexibility"],
  "Problem Solving": ["Decision-Making", "Cognitive Flexibility"],
  "Analytical Skills": ["Decision-Making", "Data Literacy & Evidence-Based Management"],
  "Risk Management": ["Decision-Making"],
  "Judgment": ["Decision-Making"],

  // Strategic & Business
  "Strategic Planning": ["Strategic Thinking", "Business Acumen"],
  "Strategy": ["Strategic Thinking", "Business Acumen"],
  "Business Strategy": ["Business Acumen", "Strategic Thinking"],
  "Business Acumen": ["Business Acumen"],
  "Financial Literacy": ["Business Acumen", "Time and Resource Management"],
  "Finance": ["Business Acumen"],
  "Budgeting": ["Time and Resource Management", "Business Acumen"],
  "Project Management": ["Time and Resource Management"],
  "Time Management": ["Time and Resource Management"],
  "Resource Management": ["Time and Resource Management"],
  "Operational Efficiency": ["Time and Resource Management"],

  // Emotional & Social
  "Emotional Intelligence": ["Emotional Intelligence"],
  "Empathy": ["Emotional Intelligence", "Psychological Safety Creation"],
  "Self-Awareness": ["Emotional Intelligence"],
  "Social Skills": ["Emotional Intelligence", "Collaboration"],
  "Psychological Safety": ["Psychological Safety Creation"],
  "Inclusivity": ["Psychological Safety Creation", "Collaboration"],
  "Diversity and Inclusion": ["Psychological Safety Creation"],
  "Diversity": ["Psychological Safety Creation", "Collaboration"],
  "Inclusion": ["Psychological Safety Creation"],
  "Belonging": ["Psychological Safety Creation"],

  // Coaching & Development
  "Coaching": ["Developing Others", "Performance Management"],
  "Mentoring": ["Developing Others"],
  "Feedback": ["Performance Management", "Developing Others"],
  "Employee Development": ["Developing Others", "Talent Intelligence & Development"],
  "Training": ["Developing Others"],
  "Learning & Development": ["Developing Others", "Learning Agility"],
  "Performance Management": ["Performance Management"],
  "Goal Setting": ["Performance Management"],

  // Adaptability & Change
  "Adaptability": ["Adaptability"],
  "Change Management": ["Adaptability", "Organizational Impact"],
  "Resilience": ["Adaptability"],
  "Agility": ["Adaptability", "Leadership Agility", "Agile People Operations"],
  "Agile": ["Agile People Operations"],
  "Scrum": ["Agile People Operations"],
  "Flexibility": ["Adaptability"],

  // Learning & Curiosity
  "Learning Agility": ["Learning Agility"],
  "Growth Mindset": ["Learning Agility", "Managerial Curiosity"],
  "Curiosity": ["Managerial Curiosity"],
  "Innovation": ["Managerial Curiosity", "Cognitive Flexibility"],
  "Creativity": ["Cognitive Flexibility", "Managerial Curiosity"],
  "Design Thinking": ["Cognitive Flexibility"],

  // Digital & AI
  "Artificial Intelligence": ["Digital and AI Literacy"],
  "Generative AI": ["Digital and AI Literacy", "Ethical Decision-Making & AI Governance"],
  "AI": ["Digital and AI Literacy"],
  "Machine Learning": ["Digital and AI Literacy"],
  "Digital Marketing": ["Digital and AI Literacy"],
  "Digital Transformation": ["Digital and AI Literacy"],
  "Technology": ["Digital and AI Literacy"],

  // Data
  "Data Analysis": ["Data Literacy & Evidence-Based Management"],
  "Data Visualization": ["Data Literacy & Evidence-Based Management"],
  "Data Science": ["Data Literacy & Evidence-Based Management"],
  "Analytics": ["Data Literacy & Evidence-Based Management"],
  "Business Intelligence": ["Data Literacy & Evidence-Based Management", "Business Acumen"],
  "Statistics": ["Data Literacy & Evidence-Based Management"],
  "Data-Driven Decision Making": ["Data Literacy & Evidence-Based Management", "Decision-Making"],

  // Ethics & Integrity
  "Ethics": ["Personal Integrity & Ethics", "Ethical Decision-Making & AI Governance"],
  "Integrity": ["Personal Integrity & Ethics"],
  "Compliance": ["Personal Integrity & Ethics"],
  "Accountability": ["Personal Integrity & Ethics"],
  "Transparency": ["Personal Integrity & Ethics"],

  // Talent & HR
  "Talent Management": ["Talent Intelligence & Development"],
  "Recruiting": ["Talent Intelligence & Development"],
  "Workforce Planning": ["Talent Intelligence & Development"],
  "Human Resources": ["Talent Intelligence & Development"],
  "Onboarding": ["Talent Intelligence & Development"],

  // Influence & Stakeholders
  "Stakeholder Management": ["Partnering with Senior Leaders", "Organizational Impact"],
  "Influencing": ["Partnering with Senior Leaders"],
  "Negotiation": ["Partnering with Senior Leaders"],
  "Executive Presence": ["Partnering with Senior Leaders"],
  "Political Awareness": ["Partnering with Senior Leaders"],

  // Delegation
  "Delegation": ["Delegation"],

  // Difficult Conversations
  "Conflict Resolution": ["Managing Difficult Conversations"],
  "Conflict Management": ["Managing Difficult Conversations"],
  "Difficult Conversations": ["Managing Difficult Conversations"],
  "Mediation": ["Managing Difficult Conversations"],

  // Org Impact
  "Organizational Development": ["Organizational Impact"],
  "Impact": ["Organizational Impact"],
  "Cultural Transformation": ["Organizational Impact", "Psychological Safety Creation"],

  // Systems & Complexity
  "Systems Thinking": ["Systems Thinking"],
  "Complex Problem Solving": ["Systems Thinking", "Cognitive Flexibility"],

  // New Manager
  "New Manager": ["Transition from IC to Leader"],
  "First-Time Manager": ["Transition from IC to Leader"],
  "Personal Branding": ["Communication"],
  "Networking": ["Collaboration", "Partnering with Senior Leaders"],

  // Facilitation
  "Facilitation": ["Facilitation & Virtual Collaboration"],
  "Meeting Management": ["Facilitation & Virtual Collaboration"],
  "Workshop Facilitation": ["Facilitation & Virtual Collaboration"],

  // Microsoft Office / Excel - no direct match but data literacy adjacent
  "Microsoft Excel": ["Data Literacy & Evidence-Based Management"],
  "Microsoft Office": ["Digital and AI Literacy"],

  // Interview skills
  "Interview Skills": ["Communication"],

  // Servant Leadership, etc.
  "Servant Leadership": ["Team Leadership", "Developing Others"],
};

function mapSkillsToCompetencies(skills) {
  if (!skills || !Array.isArray(skills)) return [];
  const competencySet = new Set();
  for (const skill of skills) {
    const trimmed = skill.trim();
    const matches = SKILL_TO_COMPETENCY[trimmed];
    if (matches) {
      matches.forEach(c => competencySet.add(c));
    }
  }
  return Array.from(competencySet);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Fetch all LinkedIn Learning courses imported from CSV
    let updated = 0;
    let skipped = 0;
    let page = 0;
    const PAGE_SIZE = 50;

    while (true) {
      const resources = await base44.asServiceRole.entities.LearningResource.filter(
        { provider: "LinkedIn Learning" },
        null,
        PAGE_SIZE,
        page * PAGE_SIZE
      );

      if (!resources || resources.length === 0) break;

      for (const r of resources) {
        const rawSkills = r.tags || r.competencies || [];
        const mapped = mapSkillsToCompetencies(rawSkills);

        if (mapped.length > 0) {
          await base44.asServiceRole.entities.LearningResource.update(r.id, {
            competencies: mapped,
          });
          updated++;
        } else {
          skipped++;
        }
      }

      if (resources.length < PAGE_SIZE) break;
      page++;
    }

    return Response.json({ success: true, updated, skipped });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});