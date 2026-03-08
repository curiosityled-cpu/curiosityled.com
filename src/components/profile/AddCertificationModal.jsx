import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, FileText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AddCertificationModal({ open, onClose, onSuccess, user }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    issuing_body: '',
    issue_date: '',
    expiration_date: '',
    credential_id_or_url: ''
  });
  const [file, setFile] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let document_uri = null;

      // Upload certificate document if provided
      if (file) {
        const uploadResult = await base44.integrations.Core.UploadPrivateFile({ file });
        document_uri = uploadResult.file_uri;
      }

      // Create certification record
      await base44.entities.Certification.create({
        user_email: user.email,
        client_id: user.client_id,
        name: formData.name,
        issuing_body: formData.issuing_body,
        issue_date: formData.issue_date,
        expiration_date: formData.expiration_date || null,
        credential_id_or_url: formData.credential_id_or_url || null,
        document_uri,
        status: 'pending_verification'
      });

      toast.success('Certification submitted for verification');
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error('Error submitting certification:', error);
      toast.error('Failed to submit certification: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      issuing_body: '',
      issue_date: '',
      expiration_date: '',
      credential_id_or_url: ''
    });
    setFile(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Certification</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Certification Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., PMP, CSM, Six Sigma Black Belt"
              required
            />
          </div>

          <div>
            <Label htmlFor="issuing_body">Issuing Organization *</Label>
            <Input
              id="issuing_body"
              value={formData.issuing_body}
              onChange={(e) => setFormData({ ...formData, issuing_body: e.target.value })}
              placeholder="e.g., PMI, Scrum Alliance"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="issue_date">Issue Date</Label>
              <Input
                id="issue_date"
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="expiration_date">Expiration Date</Label>
              <Input
                id="expiration_date"
                type="date"
                value={formData.expiration_date}
                onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">Leave blank if no expiration</p>
            </div>
          </div>

          <div>
            <Label htmlFor="credential_id_or_url">Credential ID or Verification URL</Label>
            <Input
              id="credential_id_or_url"
              value={formData.credential_id_or_url}
              onChange={(e) => setFormData({ ...formData, credential_id_or_url: e.target.value })}
              placeholder="Credential ID or URL to verify"
            />
          </div>

          <div>
            <Label>Upload Certificate (Optional)</Label>
            <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files[0])}
                className="hidden"
                id="cert-file-upload"
              />
              <label htmlFor="cert-file-upload" className="cursor-pointer">
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-gray-700">{file.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Click to upload certificate</p>
                    <p className="text-xs text-gray-500 mt-1">PDF or image format</p>
                  </>
                )}
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name || !formData.issuing_body}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit for Verification'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}