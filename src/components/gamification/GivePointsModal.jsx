import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Gift, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function GivePointsModal({ open, onOpenChange, recipientEmail = null }) {
  const { user } = useAuth();
  const [recipients, setRecipients] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState(recipientEmail || "");
  const [pointsAmount, setPointsAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [budget, setBudget] = useState({ available: 0, type: "peer" });

  useEffect(() => {
    if (open) {
      loadRecipients();
      loadBudget();
    }
  }, [open, user?.email]);

  const loadRecipients = async () => {
    try {
      const users = await base44.entities.User.filter({
        client_id: user.client_id
      });
      
      setRecipients(users.filter(u => u.email !== user.email));
    } catch (error) {
      console.error("Error loading recipients:", error);
    }
  };

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
          created_date: { $gte: thisWeekStart.toISOString() }
        });

        const spentThisWeek = transactions.reduce((sum, t) => sum + t.points_amount, 0);
        
        const isManager = user.app_role === 'User Level 2' || user.app_role === 'Admin Level 1';
        const weeklyBudget = isManager ? config.manager_point_budget_weekly : config.peer_point_budget_weekly;
        
        setBudget({
          available: Math.max(0, weeklyBudget - spentThisWeek),
          type: isManager ? "manager" : "peer",
          total: weeklyBudget
        });
      }
    } catch (error) {
      console.error("Error loading budget:", error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedRecipient || !pointsAmount || !reason) {
      toast.error("Please fill in all fields");
      return;
    }

    const points = parseInt(pointsAmount);
    if (points <= 0 || points > budget.available) {
      toast.error(`Points must be between 1 and ${budget.available}`);
      return;
    }

    setLoading(true);
    try {
      const functionName = budget.type === "manager" ? "giveManagerPoints" : "givePeerPoints";
      
      await base44.functions.invoke(functionName, {
        to_user_email: selectedRecipient,
        points_amount: points,
        reason
      });

      toast.success(`Successfully awarded ${points} points!`);
      onOpenChange(false);
      setSelectedRecipient("");
      setPointsAmount("");
      setReason("");
    } catch (error) {
      console.error("Error giving points:", error);
      toast.error(error.message || "Failed to award points");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-blue-600" />
            Give Recognition Points
          </DialogTitle>
          <DialogDescription>
            Recognize a colleague for their great work
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
            <Label htmlFor="recipient">Recipient</Label>
            <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
              <SelectTrigger id="recipient">
                <SelectValue placeholder="Select a colleague" />
              </SelectTrigger>
              <SelectContent>
                {recipients.map(recipient => (
                  <SelectItem key={recipient.id} value={recipient.email}>
                    {recipient.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="points">Points Amount</Label>
            <Input
              id="points"
              type="number"
              min="1"
              max={budget.available}
              value={pointsAmount}
              onChange={(e) => setPointsAmount(e.target.value)}
              placeholder="Enter points"
            />
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
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Awarding..." : "Award Points"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}