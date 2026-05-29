/**
 * PostConversationDebrief — Modal for capturing reflection after difficult conversations
 *
 * Triggers via:
 * 1. Manual button in Atreus chat: "I just had a difficult conversation"
 * 2. Calendar-based automation: post-1:1 or post-performance-review
 *
 * Captures:
 * - How emotionally it went
 * - What was surprising
 * - What they'd do differently
 * - Follow-up actions
 */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Heart, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function PostConversationDebrief({ isOpen, onClose, conversationType = "difficult", onSuccess }) {
  const { user } = useAuth();
  const [reflection, setReflection] = useState("");
  const [emotions, setEmotions] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reflection.trim()) {
      toast.error("Please share your reflection");
      return;
    }

    setSubmitting(true);
    try {
      // Create a debrief pulse with the reflection data
      const pulse = await base44.entities.ManagerPulse.create({
        user_email: user.email,
        prompt_type: 'contextual',
        source: 'web',
        biggest_weight_today: reflection,
        identity_friction_note: emotions || null,
        delegation_commitment: nextSteps || null,
        energy_level: null,
        confidence_today: null,
        motivation_today: null,
        optimism_today: null,
        resilience_signal: null,
        mental_clarity: null,
        perceived_load: null,
        room_today: null,
        avoidance_flag: null,
        identity_friction: false,
      });

      toast.success("Reflection saved. This helps Atreus understand your patterns.");
      if (onSuccess) onSuccess(pulse);
      onClose();
    } catch (error) {
      console.error('Error saving debrief:', error);
      toast.error("Failed to save reflection");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Conversation Debrief
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Badge variant="outline" className="w-fit">
            {conversationType || "conversation"}
          </Badge>

          <div className="space-y-2">
            <label className="text-sm font-medium">How did it go?</label>
            <Textarea
              placeholder="What happened? What surprised you? What was hard?"
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              className="h-24 resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">What emotions came up?</label>
            <Textarea
              placeholder="e.g., frustrated, proud, anxious, unclear (optional)"
              value={emotions}
              onChange={(e) => setEmotions(e.target.value)}
              className="h-16 resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">What would you do differently?</label>
            <Textarea
              placeholder="Next time, I'll... (optional)"
              value={nextSteps}
              onChange={(e) => setNextSteps(e.target.value)}
              className="h-16 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !reflection.trim()}
              className="flex-1"
              style={{ backgroundColor: '#0202ff' }}
              onMouseEnter={(e) => !submitting && (e.currentTarget.style.backgroundColor = '#0101dd')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0202ff')}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Reflection"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}