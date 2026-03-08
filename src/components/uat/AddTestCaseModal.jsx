import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AddTestCaseModal({ open, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    test_case_id: '',
    role: 'User',
    feature_area: '',
    description: '',
    expected_outcome: '',
    priority: 'P1'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.test_case_id?.trim() || !formData.description?.trim() || !formData.feature_area?.trim()) {
      toast.error("Test Case ID, Feature Area, and Description are required");
      return;
    }

    setLoading(true);
    try {
      const testCaseData = {
        test_case_id: formData.test_case_id.trim(),
        role: formData.role,
        feature_area: formData.feature_area.trim(),
        description: formData.description.trim(),
        expected_outcome: formData.expected_outcome?.trim() || '',
        priority: formData.priority || 'P2',
        test_runs: [],
        overall_risk_score: 0
      };
      
      await base44.entities.UATTestCase.create(testCaseData);
      toast.success("Test case created successfully");
      // Reset form only after success
      const initialForm = {
        test_case_id: '',
        role: 'User',
        feature_area: '',
        description: '',
        expected_outcome: '',
        priority: 'P1'
      };
      setFormData(initialForm);
      setLoading(false);
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error("Failed to create test case");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDialogOpenChange = (isOpen) => {
    if (!loading && !isOpen) {
      // Reset form when closing
      setFormData({
        test_case_id: '',
        role: 'User',
        feature_area: '',
        description: '',
        expected_outcome: '',
        priority: 'P1'
      });
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Test Case</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Test Case ID *</label>
            <Input
              value={formData.test_case_id}
              onChange={(e) => setFormData({ ...formData, test_case_id: e.target.value })}
              placeholder="e.g., U_UC-1.1"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Role *</label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="User">User</SelectItem>
                <SelectItem value="Team Leader">Team Leader</SelectItem>
                <SelectItem value="Analyst">Analyst</SelectItem>
                <SelectItem value="Program Administrator">Program Administrator</SelectItem>
                <SelectItem value="HR Administrator">HR Administrator</SelectItem>
                <SelectItem value="Super Administrator">Super Administrator</SelectItem>
                <SelectItem value="Partner Business Administrator">Partner Business Administrator</SelectItem>
                <SelectItem value="Platform Administrator">Platform Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Feature Area *</label>
            <Input
              value={formData.feature_area}
              onChange={(e) => setFormData({ ...formData, feature_area: e.target.value })}
              placeholder="e.g., Dashboard & Navigation"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Description *</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of the test case"
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Expected Outcome</label>
            <Textarea
              value={formData.expected_outcome}
              onChange={(e) => setFormData({ ...formData, expected_outcome: e.target.value })}
              placeholder="What should happen when the test passes"
              rows={2}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Priority</label>
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="P0">P0 (Critical)</SelectItem>
                <SelectItem value="P1">P1 (High)</SelectItem>
                <SelectItem value="P2">P2 (Medium)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            className="bg-blue-600 hover:bg-blue-700" 
            disabled={loading || !formData.test_case_id?.trim() || !formData.description?.trim() || !formData.feature_area?.trim()}
          >
            {loading ? "Creating..." : "Create Test Case"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}