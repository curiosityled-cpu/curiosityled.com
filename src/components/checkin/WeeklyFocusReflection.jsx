/**
 * WeeklyFocusReflection — Modal/panel for capturing end-of-week reflection
 *
 * Prompts user to reflect on:
 * - What went according to plan
 * - What surprised you
 * - Key decisions made
 * - Biggest learning
 */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function WeeklyFocusReflection({ isOpen, onClose, onSuccess }) {
  const { user } = useAuth();
  const [reflection, setReflection] = useState("");
  const [surprises, setSurprises] = useState("");
  const [keyDecisions, setKeyDecisions] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reflection.trim()) {
      toast.error("Please share your weekly reflection");
      return;
    }

    setSubmitting(true);
    try {
      // Create a weekly debrief pulse record
      const pulse = await base44.entities.ManagerPulse.create({
        user_email: user.email,
        prompt_type: 'weekly_reflection',
        source: 'web',
        biggest_weight_today: reflection,
        identity_friction_note: surprises || null,
        delegation_commitment: keyDecisions || null,
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

      toast.success("Weekly reflection saved. Great work closing the loop!");
      if (onSuccess) onSuccess(pulse);
      onClose();
    } catch (error) {
      console.error('Error saving weekly reflection:', error);
      toast.error("Failed to save reflection");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Weekly Focus Reflection
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Reflect on this week: What went as intended? What surprised you? What did you learn?
          </p>

          <div className="space-y-2">
            <label className="text-sm font-medium">What went well or as planned?</label>
            <Textarea
              placeholder="Wins, moments of focus, things that worked out..."
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              className="h-20 resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">What surprised you?</label>
            <Textarea
              placeholder="Unexpected challenges, pivots, difficult moments (optional)"
              value={surprises}
              onChange={(e) => setSurprises(e.target.value)}
              className="h-16 resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Key decisions or realizations</label>
            <Textarea
              placeholder="Important choices you made, insights for next week (optional)"
              value={keyDecisions}
              onChange={(e) => setKeyDecisions(e.target.value)}
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