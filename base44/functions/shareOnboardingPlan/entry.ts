import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Shares an onboarding plan via email with formatted HTML content
 */
Deno.serve(async (req) => {
    // Helper functions at root level
    const generateMilestonesHTML = (milestones) => {
        const phases = [...new Set(milestones.map(m => m.phase))].filter(Boolean);
        
        if (phases.length > 0) {
            return phases.map(phase => {
                const phaseMilestones = milestones.filter(m => m.phase === phase);
                const phaseLabel = phaseMilestones[0]?.phase_label || phase;
                
                return `
                    <div class="phase-header">${phaseLabel}</div>
                    ${phaseMilestones.map(m => generateMilestoneHTML(m)).join('')}
                `;
            }).join('');
        } else {
            return milestones.map(m => generateMilestoneHTML(m)).join('');
        }
    };

    const generateMilestoneHTML = (milestone) => {
        const isCompleted = milestone.status === 'completed';
        return `
            <div class="milestone ${isCompleted ? 'completed' : ''}">
                <div class="milestone-header">
                    <span class="checkbox ${isCompleted ? 'checked' : ''}"></span>
                    <span class="milestone-title">${milestone.title || 'Untitled Milestone'}</span>
                </div>
                ${milestone.description ? `<p style="margin: 5px 0; font-size: 14px; color: #4b5563;">${milestone.description}</p>` : ''}
                <div class="milestone-meta">
                    ${milestone.due_day ? `<span class="badge badge-blue">Day ${milestone.due_day}</span> ` : ''}
                    ${milestone.type ? `<span class="badge badge-yellow">${milestone.type}</span> ` : ''}
                    ${isCompleted ? '<span class="badge badge-green">Completed</span>' : ''}
                </div>
            </div>
        `;
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { planId, recipientEmail } = await req.json();

        // Validation
        if (!planId || !recipientEmail) {
            return Response.json({ 
                success: false, 
                error: 'planId and recipientEmail are required' 
            }, { status: 400 });
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recipientEmail)) {
            return Response.json({ 
                success: false, 
                error: 'Invalid email format' 
            }, { status: 400 });
        }

        // Fetch the onboarding plan
        const plans = await base44.entities.OnboardingPlan.filter({ id: planId });
        
        if (plans.length === 0) {
            return Response.json({ 
                success: false, 
                error: 'Onboarding plan not found' 
            }, { status: 404 });
        }

        const plan = plans[0];

        // Authorization check
        const isAuthorized = 
            plan.assigned_to_email === user.email ||
            plan.assigned_by === user.email ||
            plan.created_by === user.email ||
            ['Admin Level 1', 'Admin Level 2', 'Admin Level 3'].includes(user.app_role);

        if (!isAuthorized) {
            return Response.json({ 
                success: false, 
                error: 'Unauthorized - You do not have permission to share this plan' 
            }, { status: 403 });
        }

        // Build HTML email content
        const completedMilestones = plan.milestones?.filter(m => m.status === 'completed').length || 0;
        const totalMilestones = plan.milestones?.length || 0;
        const progressPercentage = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

        const emailHTML = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; }
        .header h1 { margin: 0 0 10px 0; font-size: 28px; }
        .header p { margin: 0; opacity: 0.9; }
        .section { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3b82f6; }
        .section h2 { margin-top: 0; color: #1e40af; font-size: 18px; }
        .progress-bar { background: #e5e7eb; height: 24px; border-radius: 12px; overflow: hidden; margin: 15px 0; }
        .progress-fill { background: #3b82f6; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px; }
        .milestone { padding: 12px; background: white; border-radius: 6px; margin-bottom: 10px; border: 1px solid #e5e7eb; }
        .milestone.completed { background: #f0fdf4; border-color: #86efac; }
        .milestone-header { display: flex; align-items: center; gap: 10px; margin-bottom: 5px; }
        .checkbox { width: 16px; height: 16px; border: 2px solid #d1d5db; border-radius: 3px; display: inline-block; }
        .checkbox.checked { background: #22c55e; border-color: #22c55e; position: relative; }
        .checkbox.checked::after { content: '✓'; color: white; position: absolute; top: -2px; left: 2px; font-size: 14px; }
        .milestone-title { font-weight: 600; color: #1f2937; }
        .milestone-meta { font-size: 12px; color: #6b7280; margin-top: 5px; }
        .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }
        .badge-blue { background: #dbeafe; color: #1e40af; }
        .badge-green { background: #dcfce7; color: #166534; }
        .badge-yellow { background: #fef3c7; color: #854d0e; }
        .footer { text-align: center; padding-top: 30px; border-top: 1px solid #e5e7eb; margin-top: 30px; color: #6b7280; font-size: 12px; }
        .phase-header { background: #1e40af; color: white; padding: 10px 15px; border-radius: 6px; margin: 20px 0 10px 0; font-weight: 600; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${plan.title || 'Onboarding Plan'}</h1>
        <p>Shared by ${user.full_name} on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    <div class="section">
        <h2>Plan Overview</h2>
        <p><strong>Target Role:</strong> ${plan.target_role || 'Not specified'}</p>
        <p><strong>Duration:</strong> ${plan.duration_days || 'N/A'} days</p>
        <p><strong>Status:</strong> <span class="badge badge-blue">${plan.status || 'draft'}</span></p>
        <p><strong>Assigned to:</strong> ${plan.assigned_to_email || 'Unassigned'}</p>
        ${plan.description ? `<p><strong>Description:</strong> ${plan.description}</p>` : ''}
    </div>

    <div class="section">
        <h2>Progress</h2>
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${progressPercentage}%;">
                ${progressPercentage}% Complete
            </div>
        </div>
        <p>${completedMilestones} of ${totalMilestones} milestones completed</p>
    </div>

    ${totalMilestones > 0 ? `
    <div class="section">
        <h2>Milestones</h2>
        ${generateMilestonesHTML(plan.milestones)}
    </div>
    ` : '<p>No milestones defined yet.</p>'}

    <div class="footer">
        <p>This onboarding plan was generated and shared via <strong>Curiosity Led</strong></p>
        <p>Leadership Development Platform</p>
    </div>
</body>
</html>
        `;

        // Send email
        await base44.integrations.Core.SendEmail({
            from_name: 'Curiosity Led',
            to: recipientEmail,
            subject: `Onboarding Plan: ${plan.title || 'Untitled Plan'}`,
            body: emailHTML
        });

        return Response.json({ 
            success: true,
            message: `Onboarding plan shared successfully with ${recipientEmail}`
        });

    } catch (error) {
        console.error('Error sharing onboarding plan:', error);
        return Response.json({ 
            success: false, 
            error: error.message || 'Failed to share onboarding plan' 
        }, { status: 500 });
    }
});