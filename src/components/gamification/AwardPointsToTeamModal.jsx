import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Gift, AlertCircle, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AwardPointsToTeamModal({ 
  open, 
  onOpenChange, 
  teamMembers = [],
  preselectedMember = null,
  onSuccess 
}) {
  const { user } = useAuth();
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [pointsAmount, setPointsAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [budget, setBudget] = useState({ available: 0, total: 0 });

  useEffect(() => {
    if (open) {
      loadBudget();
      if (preselectedMember) {
        setSelectedMembers([preselectedMember.email]);
      }
    }
  }, [open, preselectedMember]);

  const loadBudget = async () => {
    try {
      const settings = await base44.entities.GamificationSettings.filter({
        client_id: user.client_id
      });

      if (settings.length > 0) {
        const config = settings[0];
        
        const thisWeekStart = new Date();
        thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
        thisWeekStart.setHours(0, 0, 0, 0);

        const transactions = await base44.entities.PointTransaction.filter({
          given_by_email: user.email,
          transaction_type: "manager_award",
          created_date: { $gte: thisWeekStart.toISOString() }
        });

        const spentThisWeek = transactions.reduce((sum, t) => sum + t.points_amount, 0);
        const weeklyBudget = config.manager_point_budget_weekly || 500;
        
        setBudget({
          available: Math.max(0, weeklyBudget - spentThisWeek),
          total: weeklyBudget
        });
      }
    } catch (error) {
      console.error("Error loading budget:", error);
    }
  };

  const toggleMember = (email) => {
    setSelectedMembers(prev => 
      prev.includes(email) 
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  const toggleAll = () => {
    if (selectedMembers.length === teamMembers.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(teamMembers.map(m => m.user.email));
    }
  };

  const handleSubmit = async () => {
    if (selectedMembers.length === 0) {
      toast.error("Please select at least one team member");
      return;
    }

    if (!pointsAmount || !reason) {
      toast.error("Please fill in all fields");
      return;
    }

    const points = parseInt(pointsAmount);
    const totalPoints = points * selectedMembers.length;

    if (points <= 0 || totalPoints > budget.available) {
      toast.error(`Total points (${totalPoints}) exceeds your available budget (${budget.available})`);
      return;
    }

    setLoading(true);
    try {
      await Promise.all(
        selectedMembers.map(email =>
          base44.functions.invoke('giveManagerPoints', {
            to_user_email: email,
            points_amount: points,
            reason
          })
        )
      );

      toast.success(`Successfully awarded ${points} points to ${selectedMembers.length} team member(s)!`);
      onOpenChange(false);
      setSelectedMembers([]);
      setPointsAmount("");
      setReason("");
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error awarding points:", error);
      toast.error(error.message || "Failed to award points");
    } finally {
      setLoading(false);
    }
  };

  const totalPointsToAward = parseInt(pointsAmount || 0) * selectedMembers.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-blue-600" />
            Award Points to Team
          </DialogTitle>
          <DialogDescription>
            Recognize your team members for their great work
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              You have <span className="font-bold">{budget.available}</span> points available this week
              {budget.total && ` (${budget.available} of ${budget.total})`}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Team Members</Label>
              <Button variant="ghost" size="sm" onClick={toggleAll}>
                {selectedMembers.length === teamMembers.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
            <div className="border rounded-lg max-h-60 overflow-y-auto p-3 space-y-2">
              {teamMembers.map(({ user: member }) => (
                <div key={member.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                  <Checkbox
                    checked={selectedMembers.includes(member.email)}
                    onCheckedChange={() => toggleMember(member.email)}
                  />
                  <label className="flex-1 cursor-pointer">
                    {member.full_name}
                  </label>
                </div>
              ))}
            </div>
            {selectedMembers.length > 0 && (
              <p className="text-sm text-gray-600">
                {selectedMembers.length} member(s) selected
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="points">Points Per Person</Label>
            <Input
              id="points"
              type="number"
              min="1"
              value={pointsAmount}
              onChange={(e) => setPointsAmount(e.target.value)}
              placeholder="Enter points"
            />
            {totalPointsToAward > 0 && (
              <p className="text-sm text-gray-600">
                Total: <span className="font-bold">{totalPointsToAward}</span> points
                {totalPointsToAward > budget.available && (
                  <span className="text-red-600 ml-2">⚠️ Exceeds budget</span>
                )}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Recognition Message</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What are you recognizing them for?"
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading || totalPointsToAward > budget.available}>
              {loading ? "Awarding..." : `Award ${totalPointsToAward || 0} Points`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}