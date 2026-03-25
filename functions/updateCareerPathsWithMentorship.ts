import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch all career paths
        const paths = await base44.asServiceRole.entities.CareerPath.list();
        
        let updated = 0;
        let skipped = 0;

        for (const path of paths) {
            // Skip if already has mentorship suggestions
            if (path.mentorship_suggestions && path.mentorship_suggestions.length > 0) {
                skipped++;
                continue;
            }

            // Generate appropriate mentorship suggestions based on the path
            const mentorshipSuggestions = [
                `Seek mentorship from a current ${path.to_role_id} who can share insights on the transition`,
                `Connect with someone who successfully transitioned from ${path.from_role_id} to ${path.to_role_id}`,
                `Find a sponsor at the Director or VP level who can advocate for your advancement`,
                `Join peer networking groups with other aspiring ${path.to_role_id}s to share experiences`
            ];

            // Update the path
            await base44.asServiceRole.entities.CareerPath.update(path.id, {
                mentorship_suggestions: mentorshipSuggestions
            });

            updated++;
        }

        return Response.json({
            success: true,
            message: `Updated ${updated} career paths with mentorship suggestions (${skipped} already had suggestions)`,
            updated,
            skipped
        });

    } catch (error) {
        console.error('Error updating career paths:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});