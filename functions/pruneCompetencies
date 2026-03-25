import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

const ALLOWED_COMPETENCIES = [
    "Time and Resource Management",
    "Talent Intelligence & Development",
    "Agile People Operations",
    "Digital and AI Literacy",
    "Performance Management",
    "Business Acumen",
    "Facilitation & Virtual Collaboration",
    "Data Literacy & Evidence-Based Management",
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
    "Situational Intelligence"
];

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const allCompetencies = await base44.entities.Competency.list();
        
        const competenciesToDelete = allCompetencies.filter(
            comp => !ALLOWED_COMPETENCIES.includes(comp.name)
        );

        let deletedCount = 0;
        for (const comp of competenciesToDelete) {
            await base44.asServiceRole.entities.Competency.delete(comp.id);
            deletedCount++;
        }

        return Response.json({
            success: true,
            message: `Pruning complete. Removed ${deletedCount} non-model competencies.`,
            deletedCount: deletedCount,
            deletedNames: competenciesToDelete.map(c => c.name)
        });

    } catch (error) {
        console.error('Error pruning competencies:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});