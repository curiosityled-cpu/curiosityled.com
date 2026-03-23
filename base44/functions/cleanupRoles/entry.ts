import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { duplicateBy = 'title_exact', keep = 'most_complete' } = await req.json();

        const roles = await base44.entities.Role.list();
        
        const normalizeTitle = (title) => title.toLowerCase().trim().replace(/\s+/g, ' ');

        const roleGroups = {};
        roles.forEach(role => {
            const key = duplicateBy === 'title_insensitive' ? normalizeTitle(role.title) : role.title;
            if (!roleGroups[key]) {
                roleGroups[key] = [];
            }
            roleGroups[key].push(role);
        });

        let deletedCount = 0;
        const deletedRoles = [];

        for (const group of Object.values(roleGroups)) {
            if (group.length <= 1) continue;

            group.sort((a, b) => {
                if (keep === 'newest') return new Date(b.created_date) - new Date(a.created_date);
                if (keep === 'oldest') return new Date(a.created_date) - new Date(b.created_date);
                
                // default to 'most_complete'
                const aScore = (a.key_responsibilities?.length || 0) + (a.required_competencies?.length || 0);
                const bScore = (b.key_responsibilities?.length || 0) + (b.required_competencies?.length || 0);
                return bScore - aScore;
            });

            const rolesToDelete = group.slice(1);
            for (const role of rolesToDelete) {
                await base44.asServiceRole.entities.Role.delete(role.id);
                deletedRoles.push(role);
                deletedCount++;
            }
        }

        return Response.json({ 
            success: true, 
            deleted: deletedCount,
            details: deletedRoles.map(r => r.title)
        });

    } catch (error) {
        console.error('Error cleaning up roles:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});