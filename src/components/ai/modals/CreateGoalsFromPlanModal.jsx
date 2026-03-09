
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import UserComboBox from "@/components/onboarding/UserComboBox";
import { useAuth } from "@/components/useAuth";
import { base44 } from "@/api/base44Client";
import { Target, Plus, Trash2, Edit2, Save, X, Calendar as CalendarIcon, Users, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function CreateGoalsFromPlanModal({ isOpen, onClose, actionPlan, riskData }) {
  const { user, hasPermission, hasRole } = useAuth();
  
  const [goals, setGoals] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [assignmentMode, setAssignmentMode] = useState("self"); // self, specific, division
  const [assignToEmail, setAssignToEmail] = useState("");
  const [assignToDivision, setAssignToDivision] = useState("");
  const [loading, setLoading] = useState(false);
  const [divisions, setDivisions] = useState([]);

  // Permission checks
  const canAssignToOthers = hasPermission('goals.assign') || hasRole(['User Level 2', 'User Level 3', 'Admin Level 1', 'Admin Level 2', 'Admin Level 3']);
  const canCascade = hasPermission('goals.cascade') || hasRole(['User Level 3', 'Admin Level 2', 'Admin Level 3']);

  useEffect(() => {
    if (isOpen && actionPlan) {
      // Parse action plan items into goal templates
      const parsedGoals = parseActionPlanToGoals(actionPlan);
      setGoals(parsedGoals);
      loadDivisions();
    }
  }, [isOpen, actionPlan]);

  const loadDivisions = async () => {
    try {
      const users = await base44.entities.User.list();
      const uniqueDivisions = [...new Set(users.map(u => u.department).filter(Boolean))];
      setDivisions(uniqueDivisions);
    } catch (error) {
      console.error('Error loading divisions:', error);
    }
  };

  const parseActionPlanToGoals = (plan) => {
    if (!plan) return [];
    
    // Extract action items from the plan
    const items = [];
    const lines = plan.split('\n').filter(line => line.trim());
    
    lines.forEach((line, index) => {
      // Look for numbered items or bullet points
      const match = line.match(/^[\d]+\.?\s*(.+)$/) || line.match(/^[-•]\s*(.+)$/);
      if (match) {
        const title = match[1].trim();
        items.push({
          id: `goal-${index}`,
          title: title,
          description: "",
          category: "strategic",
          due_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
          milestones: []
        });
      }
    });
    
    return items.length > 0 ? items : [{
      id: 'goal-1',
      title: riskData?.title ? `Address: ${riskData.title}` : "Strategic Goal",
      description: riskData?.description || "",
      category: "strategic",
      due_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      milestones: []
    }];
  };

  const handleAddGoal = () => {
    setGoals([...goals, {
      id: `goal-${Date.now()}`,
      title: "",
      description: "",
      category: "strategic",
      due_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      milestones: []
    }]);
    setEditingIndex(goals.length);
  };

  const handleRemoveGoal = (index) => {
    setGoals(goals.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  const handleUpdateGoal = (index, field, value) => {
    const updated = [...goals];
    updated[index] = { ...updated[index], [field]: value };
    setGoals(updated);
  };

  const handleCreateGoals = async () => {
    if (goals.length === 0) {
      toast.error('Please add at least one goal');
      return;
    }

    // Validate all goals have titles
    if (goals.some(g => !g.title.trim())) {
      toast.error('All goals must have a title');
      return;
    }

    // Validate assignment
    if (assignmentMode === 'specific' && !assignToEmail) {
      toast.error('Please select a user to assign to');
      return;
    }

    if (assignmentMode === 'division' && !assignToDivision) {
      toast.error('Please select a division');
      return;
    }

    setLoading(true);
    try {
      let targetEmails = [];
      
      if (assignmentMode === 'self') {
        targetEmails = [user.email];
      } else if (assignmentMode === 'specific') {
        targetEmails = [assignToEmail];
      } else if (assignmentMode === 'division') {
        // Get all users in the selected division
        const users = await base44.entities.User.filter({ department: assignToDivision });
        targetEmails = users.map(u => u.email);
      }

      let successCount = 0;
      let failCount = 0;

      for (const targetEmail of targetEmails) {
        for (const goal of goals) {
          try {
            await base44.entities.Goal.create({
              user_email: targetEmail,
              title: goal.title,
              description: goal.description,
              category: goal.category,
              due_date: goal.due_date,
              status: 'pending_acceptance',
              assigned_by: user.email,
              milestones: goal.milestones
            });

            // Create notification
            await base44.functions.invoke('createNotification', {
              user_email: targetEmail,
              type: 'goal_assignment',
              title: 'New Strategic Goal Assigned',
              message: `${user.full_name} has assigned you a new goal: "${goal.title}"`,
              priority: 'high',
              action_url: '/Goals',
              scheduled_for: new Date().toISOString()
            });

            successCount++;
          } catch (error) {
            console.error('Error creating goal:', error);
            failCount++;
          }
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully created ${successCount} goal(s) for ${targetEmails.length} user(s)`);
        onClose();
      } else {
        toast.error('Failed to create goals');
      }
    } catch (error) {
      console.error('Error creating goals:', error);
      toast.error('Failed to create goals');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            Create Goals from Action Plan
          </DialogTitle>
          <p className="text-sm text-gray-600">Review and customize goals before assigning</p>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Goals Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Goals ({goals.length})</h3>
                <Button onClick={handleAddGoal} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Goal
                </Button>
              </div>

              <div className="h-[300px] rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Title</TableHead>
                      <TableHead className="w-[30%]">Category</TableHead>
                      <TableHead className="w-[20%]">Due Date</TableHead>
                      <TableHead className="w-[10%]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {goals.map((goal, index) => (
                        <motion.tr
                          key={goal.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <TableCell>
                            {editingIndex === index ? (
                              <Input
                                value={goal.title}
                                onChange={(e) => handleUpdateGoal(index, 'title', e.target.value)}
                                placeholder="Goal title..."
                              />
                            ) : (
                              <span className="font-medium">{goal.title}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={goal.category}
                              onValueChange={(value) => handleUpdateGoal(index, 'category', value)}
                              disabled={editingIndex !== index}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="strategic">Strategic</SelectItem>
                                <SelectItem value="operational">Operational</SelectItem>
                                <SelectItem value="people">People</SelectItem>
                                <SelectItem value="development">Development</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" disabled={editingIndex !== index}>
                                  <CalendarIcon className="w-4 h-4 mr-2" />
                                  {format(new Date(goal.due_date), 'MMM d, yyyy')}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={new Date(goal.due_date)}
                                  onSelect={(date) => handleUpdateGoal(index, 'due_date', format(date, 'yyyy-MM-dd'))}
                                  disabled={(date) => date < new Date()}
                                />
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {editingIndex === index ? (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setEditingIndex(null)}
                                >
                                  <Save className="w-4 h-4 text-green-600" />
                                </Button>
                              ) : (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setEditingIndex(index)}
                                >
                                  <Edit2 className="w-4 h-4 text-blue-600" />
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleRemoveGoal(index)}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Assignment Section */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold">Assignment</h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="assign-self"
                    checked={assignmentMode === 'self'}
                    onChange={() => setAssignmentMode('self')}
                    className="cursor-pointer"
                  />
                  <label htmlFor="assign-self" className="text-sm cursor-pointer">
                    Assign to myself
                  </label>
                </div>

                {canAssignToOthers && (
                  <>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="assign-specific"
                        checked={assignmentMode === 'specific'}
                        onChange={() => setAssignmentMode('specific')}
                        className="cursor-pointer"
                      />
                      <label htmlFor="assign-specific" className="text-sm cursor-pointer">
                        Assign to specific user
                      </label>
                    </div>

                    {assignmentMode === 'specific' && (
                      <div className="ml-6">
                        <UserComboBox
                          value={assignToEmail}
                          onValueChange={setAssignToEmail}
                          placeholder="Select user..."
                          currentUserEmail={user.email}
                        />
                      </div>
                    )}
                  </>
                )}

                {canCascade && (
                  <>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="assign-division"
                        checked={assignmentMode === 'division'}
                        onChange={() => setAssignmentMode('division')}
                        className="cursor-pointer"
                      />
                      <label htmlFor="assign-division" className="text-sm cursor-pointer">
                        Cascade to entire division/team
                      </label>
                    </div>

                    {assignmentMode === 'division' && (
                      <div className="ml-6">
                        <Select value={assignToDivision} onValueChange={setAssignToDivision}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select division..." />
                          </SelectTrigger>
                          <SelectContent>
                            {divisions.map(div => (
                              <SelectItem key={div} value={div}>{div}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                )}
              </div>

              {!canAssignToOthers && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                  <p className="text-sm text-blue-900">
                    You can only create goals for yourself. Contact your manager to assign goals to others.
                  </p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 mt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreateGoals} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Target className="w-4 h-4 mr-2" />
                Create {goals.length} Goal(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
