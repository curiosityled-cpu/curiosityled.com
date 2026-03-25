import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { duplicateBy = 'name_exact', keep = 'most_complete' } = await req.json();

        // Get all competencies
        const competencies = await base44.entities.Competency.list();
        
        // Function to normalize names for better matching
        const normalizeName = (name) => {
            return name
                .toLowerCase()
                .trim()
                .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                .replace(/[&]/g, 'and') // Replace & with 'and'
                .replace(/[^\w\s]/g, '') // Remove punctuation
                .replace(/\bal\b/g, 'ai') // Replace standalone 'al' with 'ai' (common typo)
                .replace(/\s+/g, ''); // Remove all spaces for fuzzy matching
        };

        // Group by selected criteria
        const competencyGroups = {};
        competencies.forEach(comp => {
            let key;
            switch (duplicateBy) {
                case 'name_insensitive':
                    key = normalizeName(comp.name);
                    break;
                case 'name_exact':
                default:
                    key = comp.name;
                    break;
            }
            if (!competencyGroups[key]) {
                competencyGroups[key] = [];
            }
            competencyGroups[key].push(comp);
        });

        let deletedCount = 0;
        const keepCompetencies = [];
        const deleteCompetencies = [];

        // For each group, decide which to keep based on the 'keep' rule
        Object.values(competencyGroups).forEach((comps) => {
            if (comps.length > 1) {
                // Sort according to the keep rule
                switch (keep) {
                    case 'newest':
                        comps.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
                        break;
                    case 'oldest':
                        comps.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
                        break;
                    case 'most_complete':
                    default:
                        comps.sort((a, b) => {
                            const aScore = (a.key_components && Array.isArray(a.key_components) && 
                                           a.key_components.length > 0 && 
                                           a.key_components.some(kc => kc.weight > 0)) ? 1 : 0;
                            const bScore = (b.key_components && Array.isArray(b.key_components) && 
                                           b.key_components.length > 0 && 
                                           b.key_components.some(kc => kc.weight > 0)) ? 1 : 0;
                            return bScore - aScore; // Descending order of completeness
                        });
                        break;
                }

                // Keep the first one (which is now the "best" one), delete the rest
                keepCompetencies.push(comps[0]);
                for (let i = 1; i < comps.length; i++) {
                    deleteCompetencies.push(comps[i]);
                }
            } else {
                keepCompetencies.push(comps[0]);
            }
        });

        // Delete the duplicates
        for (const comp of deleteCompetencies) {
            await base44.asServiceRole.entities.Competency.delete(comp.id);
            deletedCount++;
        }

        return Response.json({ 
            success: true, 
            message: `Cleanup complete. Deleted ${deletedCount} duplicate competencies.`,
            kept: keepCompetencies.length,
            deleted: deletedCount,
            details: deleteCompetencies.map(c => c.name) // Show what was deleted
        });

    } catch (error) {
        console.error('Error cleaning up competencies:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});