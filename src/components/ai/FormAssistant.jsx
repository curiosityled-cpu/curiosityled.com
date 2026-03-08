import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, X, Lightbulb, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function FormAssistant({ 
  formSchema, 
  onApply, 
  formType = "generic",
  placeholder = "Describe what you want to create in plain language...",
  compact = false 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  const handleGenerate = async () => {
    if (!input.trim()) {
      toast.error("Please describe what you want to create");
      return;
    }

    setProcessing(true);
    setSuggestions(null);

    try {
      const prompt = `You are a form completion assistant. Based on the user's description, generate structured data that matches the required form schema.

User Description: ${input}

Form Type: ${formType}
Form Schema: ${JSON.stringify(formSchema, null, 2)}

Generate a JSON object that fills in the form fields based on the user's description. Be specific and actionable. If the user didn't mention something, use sensible defaults or leave it empty.

IMPORTANT: Return ONLY valid JSON that matches the schema. No markdown, no explanations.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: formSchema
      });

      setSuggestions(response);
      toast.success("Form populated by AI - review and adjust as needed");
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error("Failed to generate form data. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleApplySuggestions = () => {
    if (suggestions) {
      onApply(suggestions);
      setIsOpen(false);
      setInput("");
      setSuggestions(null);
    }
  };

  const handleDiscard = () => {
    setSuggestions(null);
    setInput("");
  };

  if (compact) {
    return (
      <div className="space-y-3">
        {!isOpen && (
          <Button
            onClick={() => setIsOpen(true)}
            variant="outline"
            className="w-full border-2 border-dashed border-purple-300 hover:border-purple-400 hover:bg-purple-50 text-sm sm:text-base"
          >
            <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
            <span className="truncate">Use AI Assistant</span>
          </Button>
        )}

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="border-2" style={{ borderColor: '#A25DDC', background: 'linear-gradient(to bottom right, #faf5ff, #eff6ff)' }}>
                <CardContent className="p-3 sm:p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">AI Form Assistant</h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setIsOpen(false);
                        setInput("");
                        setSuggestions(null);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {!suggestions ? (
                    <>
                      <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={placeholder}
                        rows={3}
                        className="bg-white"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={handleGenerate}
                          disabled={processing || !input.trim()}
                          className="flex-1"
                          style={{ backgroundColor: '#A25DDC' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9147cc'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#A25DDC'}
                        >
                          {processing ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              Generate
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsOpen(false);
                            setInput("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-white rounded-lg p-3 border border-purple-200">
                        <div className="flex items-start gap-2 mb-2">
                          <Lightbulb className="w-4 h-4 text-purple-600 mt-0.5" />
                          <p className="text-sm font-medium text-gray-900">AI has populated the form</p>
                        </div>
                        <p className="text-xs text-gray-600">
                          Review the suggested values and click "Apply" to fill the form, or "Discard" to try again.
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          onClick={handleApplySuggestions}
                          className="flex-1 text-sm sm:text-base"
                          style={{ backgroundColor: '#0202ff' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0101dd'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0202ff'}
                        >
                          Apply to Form
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleDiscard}
                          className="text-sm sm:text-base"
                        >
                          Discard
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Full card view (non-compact)
  return (
    <Card className="border-2" style={{ borderColor: '#A25DDC', background: 'linear-gradient(to bottom right, #faf5ff, #eff6ff)' }}>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">AI Form Assistant</h3>
            <p className="text-sm text-gray-600">
              Describe what you want to create and let AI fill in the form for you
            </p>
          </div>
        </div>

        {!suggestions ? (
          <>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              rows={4}
              className="bg-white"
            />
            <Button
              onClick={handleGenerate}
              disabled={processing || !input.trim()}
              className="w-full"
              style={{ backgroundColor: '#A25DDC' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9147cc'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#A25DDC'}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  AI is thinking...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Form Data
                </>
              )}
            </Button>
          </>
        ) : (
          <div className="space-y-3">
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="flex items-start gap-2 mb-3">
                <Lightbulb className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 mb-1">AI Suggestions Ready</p>
                  <p className="text-sm text-gray-600">
                    Review the populated fields below and apply them to your form.
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 rounded p-3 max-h-48 overflow-y-auto">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(suggestions, null, 2)}
                </pre>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleApplySuggestions}
                className="flex-1"
                style={{ backgroundColor: '#0202ff' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0101dd'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0202ff'}
              >
                Apply to Form
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                onClick={handleDiscard}
              >
                Try Again
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}