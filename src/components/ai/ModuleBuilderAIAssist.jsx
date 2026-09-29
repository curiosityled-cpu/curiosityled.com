import React, { useState } from "react";
import { Sparkles, Loader2, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * Reusable AI Assist button for the Conversational Module Builder.
 * Calls InvokeLLM with a context-specific prompt and lets the user
 * review / edit / apply the suggestion.
 *
 * Props:
 *  - label: button text
 *  - prompt: the LLM prompt string
 *  - onApply: (text) => void  — called when user clicks Apply
 *  - compact: boolean — smaller button for inline use
 */
export default function AIAssistButton({ label = "AI Assist", prompt, onApply, compact = false }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState("");

  const generate = async () => {
    setLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: { suggestion: { type: "string" } },
          required: ["suggestion"]
        }
      });
      const text = typeof res === "string" ? res : (res?.suggestion || "");
      setSuggestion(text || "");
    } catch (e) {
      console.error("AI assist error:", e);
      toast.error("AI assist failed — please try again");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (o) => {
    setOpen(o);
    if (o && !suggestion && !loading) {
      generate();
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={compact ? "sm" : "default"}
          className={`gap-1.5 border-[#0202ff]/20 text-[#0202ff] hover:bg-[#0202ff]/5 ${compact ? "h-7 text-xs px-2" : ""}`}
        >
          <Sparkles className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-3" align="start">
        {loading ? (
          <div className="flex items-center gap-2 py-6 justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-[#0202ff]" />
            <span className="text-sm text-gray-500">Generating suggestion...</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#0202ff]">
              <Sparkles className="w-3.5 h-3.5" />
              AI Suggestion
            </div>
            <Textarea
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              rows={5}
              className="text-sm"
              placeholder="AI suggestion will appear here. Edit before applying if needed."
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => { onApply(suggestion); setOpen(false); }}
                disabled={!suggestion.trim()}
                className="bg-[#0202ff] hover:bg-[#0202ff]/90"
              >
                <Check className="w-3.5 h-3.5 mr-1" /> Apply
              </Button>
              <Button size="sm" variant="outline" onClick={generate}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Regenerate
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}