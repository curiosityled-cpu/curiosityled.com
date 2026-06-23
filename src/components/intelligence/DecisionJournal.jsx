/**
 * DecisionJournal — Track and review complex leadership decisions
 * Uses the DecisionJournal entity (not ManagerPulse).
 */
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, FileText } from "lucide-react";
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
        const rows = await base44.entities.DecisionJournal.filter(
          { user_email: user.email },
          '-created_date',
          30
        );
        setDecisions(rows || []);
      } catch (error) {
        console.error('Error fetching decisions:', error);
      } finally {
        setLoading(false);
      }
    };
    if (user?.email) fetchDecisions();
  }, [user?.email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.decision.trim()) {
      toast.error("Please describe the decision");
      return;
    }
    setSubmitting(true);
    try {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      const weekOf = d.toISOString().split('T')[0];

      const record = await base44.entities.DecisionJournal.create({
        user_email: user.email,
        decision_text: formData.decision,
        rationale: formData.context || '',
        status: 'committed',
        week_of: weekOf,
        outcome_notes: (formData.options_considered || formData.decision_made) ? JSON.stringify({
          options_considered: formData.options_considered,
          decision_made: formData.decision_made,
        }) : undefined,
      });

      setDecisions(prev => [record, ...prev]);
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
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)} className="gap-1">
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
              {decisions.slice(0, 10).map((decision) => (
                <div key={decision.id} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-900">{decision.decision_text}</p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {decision.status === 'completed' && (
                        <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700">Done</Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {new Date(decision.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Badge>
                    </div>
                  </div>
                  {decision.rationale && (
                    <p className="text-xs text-gray-600 mt-1">
                      <span className="font-semibold">Context:</span> {decision.rationale.length > 80 ? decision.rationale.substring(0, 80) + '…' : decision.rationale}
                    </p>
                  )}
                  {decision.pattern_name && (
                    <p className="text-xs text-[#0202ff]/70 mt-0.5">{decision.pattern_name}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
              <label className="text-sm font-medium">What are you leaning toward?</label>
              <Textarea
                placeholder="Your current inclination and reasoning"
                value={formData.decision_made}
                onChange={(e) => setFormData({ ...formData, decision_made: e.target.value })}
                className="h-16 resize-none"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button
                type="submit"
                disabled={submitting || !formData.decision.trim()}
                className="flex-1"
                style={{ backgroundColor: '#0202ff' }}
                onMouseEnter={(e) => !submitting && (e.currentTarget.style.backgroundColor = '#0101dd')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0202ff')}
              >
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Logging...</> : "Log Decision"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}