import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all roles and career paths
        const roles = await base44.asServiceRole.entities.Role.list();
        const careerPaths = await base44.asServiceRole.entities.CareerPath.list();

        // Create a set of valid role titles for quick lookup
        const validRoleTitles = new Set(roles.map(role => role.title));

        // Find paths that reference non-existent roles
        const pathsToDelete = careerPaths.filter(path => {
            const fromRoleExists = validRoleTitles.has(path.from_role_id);
            const toRoleExists = validRoleTitles.has(path.to_role_id);
            
            return !fromRoleExists || !toRoleExists;
        });

        // Delete the invalid paths
        let deletedCount = 0;
        const deletedDetails = [];

        for (const path of pathsToDelete) {
            const fromExists = validRoleTitles.has(path.from_role_id);
            const toExists = validRoleTitles.has(path.to_role_id);
            
            deletedDetails.push({
                title: path.title,
                from_role: path.from_role_id,
                to_role: path.to_role_id,
                reason: !fromExists ? `From role "${path.from_role_id}" does not exist` : `To role "${path.to_role_id}" does not exist`
            });

            await base44.asServiceRole.entities.CareerPath.delete(path.id);
            deletedCount++;
        }

        // Summary of valid roles
        const validRoles = roles.map(role => ({
            title: role.title,
            level: role.level,
            department: role.department
        }));

        return Response.json({
            success: true,
            message: `Cleanup complete. Removed ${deletedCount} invalid career paths.`,
            total_paths: careerPaths.length,
            deleted_count: deletedCount,
            remaining_paths: careerPaths.length - deletedCount,
            deleted_details: deletedDetails,
            valid_roles: validRoles
        });

    } catch (error) {
        console.error('Error cleaning up career paths:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});