import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Security: restrict to admin roles that manage competencies — prevents
    // AI/file-extraction credit abuse by regular users.
    const allowedRoles = ['Admin Level 2', 'Super Administrator', 'Platform Admin'];
    if (!allowedRoles.includes(user.app_role)) {
      return Response.json({ success: false, error: 'Unauthorized — admin access required to import competencies' }, { status: 403 });
    }

    const body = await req.json();
    const { file_url, existing_competencies = [] } = body;

    if (!file_url) {
      return Response.json({ success: false, error: 'file_url is required' }, { status: 400 });
    }

    // Step 1: Extract competency data from the uploaded file
    const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          competencies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                category: { type: "string" },
                key_components: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      weight: { type: "number" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    const extracted =
      extractResult?.output?.competencies ||
      extractResult?.competencies ||
      (Array.isArray(extractResult?.output) ? extractResult.output : []);

    if (!extracted || extracted.length === 0) {
      return Response.json({
        success: true,
        data: {
          extracted: [],
          mappings: [],
          suggestions: [],
          message: 'No competencies found in the uploaded file.'
        }
      });
    }

    // Step 2: Use LLM to map extracted competencies to existing ones and suggest new ones
    const llmPrompt = `You are a leadership development expert analyzing competencies from a client organization's file.

EXISTING PLATFORM COMPETENCIES (with IDs):
${JSON.stringify(existing_competencies.map(c => ({ id: c.id, name: c.name, category: c.category, definition: c.definition?.substring(0, 200) })))}

EXTRACTED COMPETENCIES FROM CLIENT FILE:
${JSON.stringify(extracted.map((c, i) => ({ index: i, name: c.name, description: c.description, category: c.category, key_components: c.key_components })))}

For EACH extracted competency, determine:
1. Does it map to an existing platform competency? Match based on semantic meaning, not just exact name matches. A competency about "making good decisions under pressure" maps to "Decision Making" even if the names differ.
2. Confidence level: "high" (clear semantic match), "medium" (related but not exact), "low" (loosely related), "none" (no match found).
3. If confidence is "low" or "none", include it as a suggestion for a new competency.

For SUGGESTIONS (new competencies to create):
- Assign a category from: "Tactical", "Self Leadership", "People Leadership", "Situational Intelligence"
- Write a clear 1-2 sentence definition
- Suggest 2-4 key components with percentage weights that sum to 100
- Generate a short field_key (2-4 lowercase letters, e.g. "dm" for Decision Making)

Return JSON with:
- "mappings": array of { extracted_index, extracted_name, matched_competency_id (null if no match), matched_competency_name (null if no match), confidence, reasoning }
- "suggestions": array of { name, field_key, category, definition, key_components: [{name, weight}], reasoning }`;

    const llmResult = await base44.integrations.Core.InvokeLLM({
      prompt: llmPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          mappings: {
            type: "array",
            items: {
              type: "object",
              properties: {
                extracted_index: { type: "number" },
                extracted_name: { type: "string" },
                matched_competency_id: { type: "string" },
                matched_competency_name: { type: "string" },
                confidence: { type: "string" },
                reasoning: { type: "string" }
              }
            }
          },
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                field_key: { type: "string" },
                category: { type: "string" },
                definition: { type: "string" },
                key_components: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      weight: { type: "number" }
                    }
                  }
                },
                reasoning: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      data: {
        extracted,
        mappings: llmResult?.mappings || [],
        suggestions: llmResult?.suggestions || []
      }
    });

  } catch (error) {
    console.error('Error in importCompetencies:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to import competencies'
    }, { status: 500 });
  }
});