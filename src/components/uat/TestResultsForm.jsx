import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { AlertCircle, Upload, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function TestResultsForm({ 
  open, 
  onClose, 
  test, 
  user,
  uatCycle,
  onSubmitSuccess 
}) {
  const [formData, setFormData] = useState({
    status: '',
    severity: '',
    actual_outcome: '',
    notes: '',
    evidence_url: '',
    issue_bug_id: ''
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  // Keyboard shortcut for submit
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && e.key === 'Enter' && !submitting && !uploading) {
        e.preventDefault();
        handleSubmit();
      }
    };

    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, formData, submitting, uploading]);

  const handleSubmit = async () => {
    setError('');

    // Validation
    if (!formData.status) {
      setError('Please select a test status');
      return;
    }

    if ((formData.status === 'fail' || formData.status === 'blocked') && !formData.severity) {
      setError('Severity is required for failed or blocked tests');
      return;
    }

    if (formData.status === 'fail' && !file) {
      setError('Screenshot is required for failed tests');
      return;
    }

    if (!formData.actual_outcome.trim()) {
      setError('Please describe what actually happened');
      return;
    }

    try {
      setSubmitting(true);

      // Upload screenshot if provided
      let screenshotUrl = null;
      if (file) {
        setUploading(true);
        const uploadResult = await base44.integrations.Core.UploadFile({ file });
        screenshotUrl = uploadResult.file_url;
        setUploading(false);
      }

      // Create submission
      const submission = {
        client_id: user?.client_id || '',
        tester_email: user?.email || '',
        tester_role: user?.app_role || '',
        uat_cycle: uatCycle,
        feature_area: test.feature_area,
        test_case_id: test.id,
        test_case_title: test.title,
        status: formData.status,
        severity: formData.severity || '',
        actual_outcome: formData.actual_outcome,
        screenshots_evidence_url: screenshotUrl,
        evidence_url: formData.evidence_url,
        issue_bug_id: formData.issue_bug_id,
        notes: formData.notes,
        test_date: new Date().toISOString()
      };

      await base44.entities.UATSubmission.create(submission);

      // Reset form
      setFormData({
        status: '',
        severity: '',
        actual_outcome: '',
        notes: '',
        evidence_url: '',
        issue_bug_id: ''
      });
      setFile(null);

      onSubmitSuccess(formData.status);
    } catch (err) {
      console.error('Error submitting test results:', err);
      setError(err.message || 'Failed to submit test results');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Test Results - {test?.id}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Status */}
          <div>
            <Label className="mb-3 block">Test Result *</Label>
            <RadioGroup value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
              <div className="space-y-2">
                <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <RadioGroupItem value="pass" />
                  <div>
                    <p className="font-medium">Pass</p>
                    <p className="text-xs text-gray-600">Feature works as expected</p>
                  </div>
                </label>
                <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <RadioGroupItem value="fail" />
                  <div>
                    <p className="font-medium text-red-600">Fail</p>
                    <p className="text-xs text-gray-600">Feature has issues or doesn't work</p>
                  </div>
                </label>
                <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <RadioGroupItem value="blocked" />
                  <div>
                    <p className="font-medium text-orange-600">Blocked</p>
                    <p className="text-xs text-gray-600">Cannot complete test due to blocking issue</p>
                  </div>
                </label>
                <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <RadioGroupItem value="needs_retest" />
                  <div>
                    <p className="font-medium text-yellow-600">Needs Retest</p>
                    <p className="text-xs text-gray-600">Uncertain, requires another test</p>
                  </div>
                </label>
              </div>
            </RadioGroup>
          </div>

          {/* Severity - Show only for fail/blocked */}
          {(formData.status === 'fail' || formData.status === 'blocked') && (
            <div>
              <Label>Severity *</Label>
              <Select value={formData.severity} onValueChange={(value) => setFormData(prev => ({ ...prev, severity: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select severity level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical - Blocks major functionality</SelectItem>
                  <SelectItem value="high">High - Significant impact</SelectItem>
                  <SelectItem value="medium">Medium - Moderate impact</SelectItem>
                  <SelectItem value="low">Low - Minor issue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Actual Outcome */}
          <div>
            <Label>What Actually Happened? *</Label>
            <Textarea
              placeholder="Describe what you observed during the test..."
              value={formData.actual_outcome}
              onChange={(e) => setFormData(prev => ({ ...prev, actual_outcome: e.target.value }))}
              rows={4}
              className="mt-1"
            />
          </div>

          {/* Screenshot Upload */}
          <div>
            <Label>
              Screenshot {formData.status === 'fail' && <span className="text-red-600">*</span>}
            </Label>
            <div className="mt-1">
              <label className="flex items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {file ? file.name : 'Click to upload screenshot (max 10MB)'}
                </span>
              </label>
            </div>
          </div>

          {/* Evidence URL */}
          <div>
            <Label>External Evidence URL (optional)</Label>
            <Input
              type="url"
              placeholder="https://..."
              value={formData.evidence_url}
              onChange={(e) => setFormData(prev => ({ ...prev, evidence_url: e.target.value }))}
              className="mt-1"
            />
          </div>

          {/* Issue/Bug ID */}
          <div>
            <Label>Issue/Bug ID (optional)</Label>
            <Input
              placeholder="e.g., BUG-123"
              value={formData.issue_bug_id}
              onChange={(e) => setFormData(prev => ({ ...prev, issue_bug_id: e.target.value }))}
              className="mt-1"
            />
          </div>

          {/* Additional Notes */}
          <div>
            <Label>Additional Notes (optional)</Label>
            <Textarea
              placeholder="Any other observations, missing features, or suggestions..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="mt-1"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 gap-2"
              disabled={submitting || uploading}
              style={{ backgroundColor: '#0202ff' }}
              title="Submit (Ctrl/Cmd + Enter)"
            >
              {(submitting || uploading) && <Loader2 className="w-4 h-4 animate-spin" />}
              {uploading ? 'Uploading...' : submitting ? 'Submitting...' : 'Submit & Continue'}
            </Button>
          </div>
          <p className="text-xs text-gray-500 text-center">
            💡 Press Ctrl/Cmd + Enter to submit quickly
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}