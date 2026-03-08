import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Users, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function BulkAssignTestCasesModal({ 
  open, 
  onClose, 
  role, 
  testCases,
  onSuccess 
}) {
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (open && role) {
      loadUsers();
    } else if (!open) {
      setUsers([]);
      setSelectedUsers([]);
      setSearchTerm("");
    }
  }, [open, role]);

  const loadUsers = async () => {
    try {
      const allUsers = await base44.entities.User.list();
      // Filter users by role - this is a simplified filter, adjust based on your actual role field
      const filteredUsers = allUsers.filter(u => u.app_role === role || u.role === role);
      setUsers(filteredUsers);
      setSelectedUsers([]);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users");
    }
  };

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const calculateRiskScore = (testRuns) => {
    if (!testRuns || testRuns.length === 0) return 0;

    const severityWeights = { Critical: 100, High: 75, Medium: 50, Low: 25 };
    const statusWeights = { Failed: 1, Blocked: 0.8, Passed: 0, 'Not Tested': 0 };
    let riskSum = 0;
    let failureCount = 0;

    testRuns.forEach(run => {
      if (!run || !run.status) return;
      const severityWeight = severityWeights[run.severity] || 0;
      const statusWeight = statusWeights[run.status] || 0;
      riskSum += (severityWeight * statusWeight) / 100;
      if (run.status === 'Failed' || run.status === 'Blocked') {
        failureCount++;
      }
    });

    const baseRisk = (riskSum / testRuns.length) * 100;
    const failureRate = (failureCount / testRuns.length) * 100;
    const score = Math.round((baseRisk + failureRate) / 2);
    return Math.min(100, Math.max(0, score));
  };

  const handleAssign = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Please select at least one user");
      return;
    }

    if (testCases.length === 0) {
      toast.error("No test cases to assign");
      return;
    }

    setLoading(true);

    try {
      let successCount = 0;
      let failureCount = 0;

      // Evenly distribute test cases across selected users
      const testsPerUser = Math.ceil(testCases.length / selectedUsers.length);
      let testIndex = 0;

      for (let i = 0; i < selectedUsers.length; i++) {
        const userId = selectedUsers[i];
        const user = users.find(u => u.id === userId);

        if (!user) {
          console.warn(`User ${userId} not found`);
          failureCount++;
          continue;
        }

        // Assign tests to this user (evenly split)
        const endIndex = Math.min(testIndex + testsPerUser, testCases.length);
        const userTests = testCases.slice(testIndex, endIndex);

        for (const testCase of userTests) {
          try {
            const newTestRun = {
              tester_name: user.full_name || user.email,
              tester_email: user.email,
              status: 'Not Tested',
              test_date: new Date().toISOString(),
              actual_outcome: '',
              severity: '',
              issue_bug_id: '',
              evidence_url: '',
              notes: ''
            };

            // Fetch fresh data to avoid race condition
            const freshTestCase = await base44.asServiceRole.entities.UATTestCase.filter({ id: testCase.id });
            const currentCase = freshTestCase?.[0];
            if (!currentCase) {
              console.warn(`Test case ${testCase.id} not found`);
              failureCount++;
              continue;
            }

            const existingRuns = Array.isArray(currentCase.test_runs) ? currentCase.test_runs : [];
            const updatedTestRuns = [...existingRuns, newTestRun];
            const newRiskScore = calculateRiskScore(updatedTestRuns);

            await base44.asServiceRole.entities.UATTestCase.update(testCase.id, {
              test_runs: updatedTestRuns,
              overall_risk_score: Math.min(100, newRiskScore)
            });

            successCount++;
          } catch (err) {
            console.error(`Error assigning test case ${testCase.id}:`, err);
            failureCount++;
          }
        }

        testIndex = endIndex;
        if (testIndex >= testCases.length) break;
      }

      if (successCount > 0) {
        toast.success(`Assigned ${successCount} test run(s)`);
      }
      if (failureCount > 0) {
        toast.warning(`Failed to assign ${failureCount} test run(s)`);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error assigning test cases:", error);
      toast.error("Failed to assign test cases");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !loading && isOpen === false && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Assign Test Cases</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">
                  {testCases.length} test cases for {role}
                </p>
                <p className="text-blue-700 text-xs mt-1">
                  Selected tests will be evenly distributed among chosen users
                </p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div>
            <Label htmlFor="user-search" className="text-sm font-medium mb-2 block">
              Search Users by Name or Email
            </Label>
            <Input
              id="user-search"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Users List */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Select Users ({selectedUsers.length} selected)
            </Label>
            <div className="border rounded-lg max-h-64 overflow-y-auto space-y-2 p-3">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">{searchTerm ? "No users found" : "No users available"}</p>
                </div>
              ) : (
                filteredUsers.map(user => (
                  <div key={user.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                    <Checkbox
                      id={user.id}
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => toggleUser(user.id)}
                    />
                    <Label 
                      htmlFor={user.id} 
                      className="flex-1 cursor-pointer text-sm"
                    >
                      <div className="font-medium">{user.full_name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </Label>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Distribution Info */}
          {selectedUsers.length > 0 && testCases.length > 0 && (
            <div className="rounded-lg bg-amber-50 p-3 border border-amber-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Each user will receive ~{Math.ceil(testCases.length / selectedUsers.length)} test cases
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
           <Button 
             variant="outline" 
             onClick={() => !loading && onClose()}
             disabled={loading}
           >
             Cancel
           </Button>
           <Button 
             onClick={handleAssign}
             disabled={selectedUsers.length === 0 || loading || testCases.length === 0}
             className="bg-blue-600 hover:bg-blue-700"
           >
             {loading ? "Assigning..." : "Assign Test Cases"}
           </Button>
         </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}