import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Upload, FileText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AddExternalAssessmentModal({ open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    assessment_type: '',
    designation_or_score: '',
    date_completed: '',
    is_private: false
  });
  const [file, setFile] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let file_uri = null;

      // Upload file if provided
      if (file) {
        const uploadResult = await base44.integrations.Core.UploadPrivateFile({ file });
        file_uri = uploadResult.file_uri;
      }

      // Submit assessment for AI processing
      const result = await base44.functions.invoke('processExternalAssessment', {
        assessment_type: formData.assessment_type,
        designation_text: formData.designation_or_score,
        date_completed: formData.date_completed || new Date().toISOString().split('T')[0],
        is_private: formData.is_private,
        file_uri
      });

      toast.success('Assessment submitted for processing');
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error('Error submitting assessment:', error);
      toast.error('Failed to submit assessment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      assessment_type: '',
      designation_or_score: '',
      date_completed: '',
      is_private: false
    });
    setFile(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add External Assessment Result</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="assessment_type">Assessment Type *</Label>
            <Input
              id="assessment_type"
              value={formData.assessment_type}
              onChange={(e) => setFormData({ ...formData, assessment_type: e.target.value })}
              placeholder="e.g., DiSC, MBTI, Situational Leadership"
              required
            />
          </div>

          <div>
            <Label htmlFor="designation_or_score">Result/Designation</Label>
            <Input
              id="designation_or_score"
              value={formData.designation_or_score}
              onChange={(e) => setFormData({ ...formData, designation_or_score: e.target.value })}
              placeholder="e.g., ISFJ, D Profile, S3"
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional if uploading a document - AI will extract this
            </p>
          </div>

          <div>
            <Label htmlFor="date_completed">Date Completed</Label>
            <Input
              id="date_completed"
              type="date"
              value={formData.date_completed}
              onChange={(e) => setFormData({ ...formData, date_completed: e.target.value })}
            />
          </div>

          <div>
            <Label>Upload Report (Optional)</Label>
            <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files[0])}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-gray-700">{file.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Click to upload PDF or image</p>
                    <p className="text-xs text-gray-500 mt-1">AI will analyze the document</p>
                  </>
                )}
              </label>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_private"
              checked={formData.is_private}
              onCheckedChange={(checked) => setFormData({ ...formData, is_private: checked })}
            />
            <Label htmlFor="is_private" className="text-sm font-normal cursor-pointer">
              Keep this assessment private (visible only to you and specific admins)
            </Label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.assessment_type}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Submit Assessment'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}