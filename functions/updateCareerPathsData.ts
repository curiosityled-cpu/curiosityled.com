import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all entities
        const [roles, careerPaths, competencies, learningResources] = await Promise.all([
            base44.asServiceRole.entities.Role.list(),
            base44.asServiceRole.entities.CareerPath.list(),
            base44.asServiceRole.entities.Competency.list(),
            base44.asServiceRole.entities.LearningResource.list()
        ]);

        // Create lookup maps
        const roleMap = new Map(roles.map(r => [r.title, r]));
        const competencyNames = new Set(competencies.map(c => c.name));

        let deleted = 0;
        let updated = 0;
        const errors = [];

        // Process each career path
        for (const path of careerPaths) {
            const fromRole = roleMap.get(path.from_role_id);
            const toRole = roleMap.get(path.to_role_id);

            // Delete if roles don't exist
            if (!fromRole || !toRole) {
                await base44.asServiceRole.entities.CareerPath.delete(path.id);
                deleted++;
                errors.push(`Deleted: ${path.title} - Invalid roles (${path.from_role_id} → ${path.to_role_id})`);
                continue;
            }

            // Update the path with correct data
            const updates = {};

            // 1. Ensure brief_description exists
            if (!path.brief_description) {
                updates.brief_description = `Transition from ${fromRole.title} to ${toRole.title}, requiring enhanced leadership skills and strategic capabilities.`;
            }

            // 2. Populate core competencies from target role
            if (toRole.required_competencies && toRole.required_competencies.length > 0) {
                updates.core_competencies = toRole.required_competencies.slice(0, 5).map(rc => {
                    const compName = typeof rc === 'string' ? rc : rc.competency_name;
                    return {
                        competency_name: compName,
                        priority: 'high'
                    };
                });
            }

            // 3. Match learning resources to competencies
            const targetCompetencies = updates.core_competencies?.map(c => c.competency_name) || [];
            
            // Also include competencies from development focus if they exist
            if (path.development_focus) {
                path.development_focus.forEach(focus => {
                    if (typeof focus === 'object' && focus.competency_name) {
                        targetCompetencies.push(focus.competency_name);
                    }
                });
            }

            const matchedResources = learningResources.filter(resource => {
                if (!resource.competencies) return false;
                
                return resource.competencies.some(comp => 
                    targetCompetencies.some(targetComp => 
                        comp.toLowerCase().includes(targetComp.toLowerCase()) ||
                        targetComp.toLowerCase().includes(comp.toLowerCase())
                    )
                );
            });

            // Score resources by number of matching competencies
            const scoredResources = matchedResources.map(resource => {
                const matchCount = resource.competencies.filter(comp =>
                    targetCompetencies.some(targetComp =>
                        comp.toLowerCase().includes(targetComp.toLowerCase()) ||
                        targetComp.toLowerCase().includes(comp.toLowerCase())
                    )
                ).length;

                return { resource, score: matchCount };
            });

            // Get top 6 most relevant resources
            updates.learning_resources = scoredResources
                .sort((a, b) => b.score - a.score)
                .slice(0, 6)
                .map(item => item.resource.id);

            // 4. Ensure mentorship suggestions exist
            if (!path.mentorship_suggestions || path.mentorship_suggestions.length === 0) {
                updates.mentorship_suggestions = [
                    `Seek mentorship from a current ${toRole.title} who can share insights about the role`,
                    `Connect with someone who successfully transitioned from ${fromRole.title} to ${toRole.title}`,
                    `Find a sponsor at the Director or VP level to advocate for your advancement`,
                    `Join peer networking groups with other aspiring ${toRole.title}s`
                ];
            }

            // Update the path
            await base44.asServiceRole.entities.CareerPath.update(path.id, updates);
            updated++;
        }

        return Response.json({
            success: true,
            message: `Career paths updated successfully`,
            deleted,
            updated,
            total_roles: roles.length,
            total_paths_remaining: careerPaths.length - deleted,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Error updating career paths:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});