/**
 * DecisionJournal — Track and review complex leadership decisions
 *
 * Surfaces:
 * - Recent decisions with context
 * - Outcomes (what actually happened vs. expected)
 * - Lessons learned
 * - Pattern recognition (types of decisions that work well for you)
 */
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function DecisionJournal() {
  const { user } = useAuth();
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    decision: '',
    context: '',
    options_considered: '',
    decision_made: ''
  });

  useEffect(() => {
    const fetchDecisions = async () => {
      try {
        // Fetch decision-related pulses (those with delegation_commitment recorded)
        const pulses = await base44.entities.ManagerPulse.filter(
          { user_email: user.email },
          '-created_date',
          30
        );

        const decisionPulses = pulses.filter(p => 
          p.delegation_commitment && p.prompt_type === 'contextual'
        );

        setDecisions(decisionPulses);
      } catch (error) {
        console.error('Error fetching decisions:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchDecisions();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.decision.trim()) {
      toast.error("Please describe the decision");
      return;
    }

    setSubmitting(true);
    try {
      // Create a decision journal entry as a pulse
      const pulse = await base44.entities.ManagerPulse.create({
        user_email: user.email,
        prompt_type: 'contextual',
        source: 'web',
        biggest_weight_today: formData.decision,
        ...(formData.context && { identity_friction_note: formData.context }),
        ...(formData.decision_made && { delegation_commitment: formData.decision_made }),
      });

      setDecisions(prev => [pulse, ...prev]);
      setFormData({ decision: '', context: '', options_considered: '', decision_made: '' });
      setShowForm(false);
      toast.success("Decision logged. You can review outcomes later.");
    } catch (error) {
      console.error('Error logging decision:', error);
      toast.error("Failed to save decision");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Decision Journal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Decision Journal
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(true)}
              className="gap-1"
            >
              <Plus className="w-4 h-4" />
              Log Decision
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {decisions.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm text-gray-500">
                No decisions logged yet. Start capturing complex decisions to track outcomes and patterns.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {decisions.slice(0, 10).map((decision, i) => (
                <div key={i} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-900">
                      {decision.biggest_weight_today}
                    </p>
                    <Badge variant="outline" className="flex-shrink-0 text-xs">
                      {new Date(decision.created_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </Badge>
                  </div>
                  {decision.identity_friction_note && (
                    <p className="text-xs text-gray-600 mt-1">
                      <span className="font-semibold">Context:</span> {decision.identity_friction_note.length > 80 ? decision.identity_friction_note.substring(0, 80) + '…' : decision.identity_friction_note}
                    </p>
                  )}
                  {decision.delegation_commitment && (
                    <p className="text-xs text-gray-600 mt-1">
                      <span className="font-semibold">Decision:</span> {decision.delegation_commitment.length > 80 ? decision.delegation_commitment.substring(0, 80) + '…' : decision.delegation_commitment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Decision Logging Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Log a Leadership Decision
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">What decision are you facing?</label>
              <Input
                placeholder="e.g., Whether to promote Sarah or bring in external candidate"
                value={formData.decision}
                onChange={(e) => setFormData({ ...formData, decision: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Context</label>
              <Textarea
                placeholder="Why does this matter? Who's affected? Timeline?"
                value={formData.context}
                onChange={(e) => setFormData({ ...formData, context: e.target.value })}
                className="h-16 resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Options you considered</label>
              <Textarea
                placeholder="What alternatives did you weigh? (optional)"
                value={formData.options_considered}
                onChange={(e) => setFormData({ ...formData, options_considered: e.target.value })}
                className="h-16 resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">What did you decide?</label>
              <Textarea
                placeholder="Your final decision and reasoning"
                value={formData.decision_made}
                onChange={(e) => setFormData({ ...formData, decision_made: e.target.value })}
                className="h-16 resize-none"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !formData.decision.trim()}
                className="flex-1"
                style={{ backgroundColor: '#0202ff' }}
                onMouseEnter={(e) => !submitting && (e.currentTarget.style.backgroundColor = '#0101dd')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0202ff')}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Logging...
                  </>
                ) : (
                  "Log Decision"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}