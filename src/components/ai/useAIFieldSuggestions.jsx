import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { debounce } from 'lodash';

/**
 * Hook for AI-powered field suggestions
 * Analyzes user input and form context to provide intelligent suggestions
 */
export function useAIFieldSuggestions({
  fieldName,
  fieldType = 'text',
  formContext = {},
  historicalData = [],
  entityType = null,
  minChars = 3,
  debounceMs = 600
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  // Debounced function to fetch suggestions
  const fetchSuggestions = useCallback(
    debounce(async (value, context) => {
      if (!value || value.length < minChars) {
        setSuggestions([]);
        return;
      }

      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setLoading(true);
      setError(null);

      try {
        // Build AI prompt based on field type and context
        const prompt = buildPrompt(fieldName, fieldType, value, context, historicalData);

        const response = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: { type: "string" },
                description: "Array of 3-5 relevant suggestions"
              },
              reasoning: {
                type: "string",
                description: "Brief explanation of why these suggestions are relevant"
              }
            }
          }
        });

        if (response.suggestions && Array.isArray(response.suggestions)) {
          setSuggestions(response.suggestions.slice(0, 5)); // Max 5 suggestions
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error fetching AI suggestions:', err);
          setError('Failed to get suggestions');
          setSuggestions([]);
        }
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    }, debounceMs),
    [fieldName, fieldType, minChars, historicalData]
  );

  const getSuggestions = (value, additionalContext = {}) => {
    const context = { ...formContext, ...additionalContext };
    fetchSuggestions(value, context);
  };

  const clearSuggestions = () => {
    setSuggestions([]);
    setError(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      fetchSuggestions.cancel();
    };
  }, []);

  return {
    suggestions,
    loading,
    error,
    getSuggestions,
    clearSuggestions
  };
}

// Build contextual prompt based on field characteristics
function buildPrompt(fieldName, fieldType, currentValue, formContext, historicalData) {
  const contextInfo = Object.entries(formContext)
    .filter(([key, val]) => val && key !== fieldName)
    .map(([key, val]) => `${key}: ${val}`)
    .join(', ');

  let basePrompt = `You are helping a user fill out a form field. 
Field name: "${fieldName}"
Field type: ${fieldType}
Current partial input: "${currentValue}"`;

  if (contextInfo) {
    basePrompt += `\nOther form fields already filled: ${contextInfo}`;
  }

  if (historicalData && historicalData.length > 0) {
    const examples = historicalData.slice(0, 10).join('", "');
    basePrompt += `\nPrevious valid entries for this field: "${examples}"`;
  }

  // Field-specific guidance
  if (fieldName.toLowerCase().includes('title') || fieldName.toLowerCase().includes('name')) {
    basePrompt += `\n\nProvide 3-5 concise, professional title/name suggestions that:
- Complete or improve the user's input
- Are clear and descriptive
- Follow naming best practices
- Are appropriate for professional/business context`;
  } else if (fieldName.toLowerCase().includes('description')) {
    basePrompt += `\n\nProvide 3-5 description suggestions that:
- Expand on the user's partial input
- Are detailed and actionable
- Include relevant business context
- Are 1-2 sentences each`;
  } else if (fieldName.toLowerCase().includes('goal') || fieldName.toLowerCase().includes('objective')) {
    basePrompt += `\n\nProvide 3-5 SMART goal suggestions that:
- Complete the user's thought
- Are Specific, Measurable, Achievable, Relevant, and Time-bound
- Focus on outcomes
- Are professional and actionable`;
  } else if (fieldName.toLowerCase().includes('justification') || fieldName.toLowerCase().includes('reason')) {
    basePrompt += `\n\nProvide 3-5 business justification suggestions that:
- Explain the "why" behind the request
- Include business impact and value
- Are compelling and clear
- Reference ROI or strategic alignment where appropriate`;
  } else if (fieldName.toLowerCase().includes('criteria') || fieldName.toLowerCase().includes('metric')) {
    basePrompt += `\n\nProvide 3-5 success criteria suggestions that:
- Are measurable and specific
- Define clear outcomes
- Can be objectively evaluated
- Align with the request context`;
  } else {
    basePrompt += `\n\nProvide 3-5 relevant completion suggestions that are professional, clear, and contextually appropriate.`;
  }

  basePrompt += `\n\nReturn only valid, complete suggestions that the user can directly use or adapt. Each suggestion should be meaningfully different from the others.`;

  return basePrompt;
}