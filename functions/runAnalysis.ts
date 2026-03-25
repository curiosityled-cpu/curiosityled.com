import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

// This function will be triggered by the frontend after a user lands on the results page.
Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        // Ensure the user is authenticated to run their own analysis
        const user = await base44.auth.me();
        if (!user) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Authentication required' 
            }), { 
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { assessmentId } = await req.json();
        if (!assessmentId) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Assessment ID is required' 
            }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`Starting analysis for assessment: ${assessmentId} by user: ${user.email}`);
        
        // Use the service role to invoke the agent
        const analysisResult = await base44.asServiceRole.agents.invoke('assessmentAnalyzer', {
            prompt: `Analyze the assessment record with ID ${assessmentId} and generate the full leadership report.`,
        });

        // The agent's logic should handle updating the record,
        // but we can also do it here if needed.
        // For now, we assume the agent returns the JSON payload.
        console.log(`Analysis complete for assessment: ${assessmentId}`);

        // The frontend will poll for the updated record, so we just return success.
        return new Response(JSON.stringify({ 
            success: true, 
            analysis: analysisResult 
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error(`Error running analysis:`, error.message);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});