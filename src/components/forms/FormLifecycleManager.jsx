import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Archive, Trash2, AlertTriangle, Shield } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function FormLifecycleManager({ form, onUpdate }) {
  const [deleteProtection, setDeleteProtection] = useState(
    form.config?.lifecycle?.delete_protection || false
  );

  const toggleDeleteProtection = async (enabled) => {
    try {
      await base44.entities.CustomForm.update(form.id, {
        config: {
          ...form.config,
          lifecycle: {
            ...form.config?.lifecycle,
            delete_protection: enabled
          }
        }
      });

      setDeleteProtection(enabled);
      toast.success(enabled ? "Delete protection enabled" : "Delete protection disabled");
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error updating protection:", error);
      toast.error("Failed to update protection");
    }
  };

  const archiveForm = async () => {
    try {
      await base44.entities.CustomForm.update(form.id, {
        status: "archived",
        config: {
          ...form.config,
          lifecycle: {
            ...form.config?.lifecycle,
            archived_at: new Date().toISOString(),
            archived_by: (await base44.auth.me()).email
          }
        }
      });

      toast.success("Form archived");
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error archiving form:", error);
      toast.error("Failed to archive form");
    }
  };

  const unarchiveForm = async () => {
    try {
      await base44.entities.CustomForm.update(form.id, {
        status: "draft",
        config: {
          ...form.config,
          lifecycle: {
            ...form.config?.lifecycle,
            archived_at: null,
            archived_by: null
          }
        }
      });

      toast.success("Form restored from archive");
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error unarchiving form:", error);
      toast.error("Failed to restore form");
    }
  };

  const deleteForm = async () => {
    if (deleteProtection) {
      toast.error("Delete protection is enabled. Disable it first.");
      return;
    }

    try {
      // Delete all submissions first
      const submissions = await base44.entities.CustomFormSubmission.filter({
        form_id: form.id
      });
      
      for (const submission of submissions) {
        await base44.entities.CustomFormSubmission.delete(submission.id);
      }

      await base44.entities.CustomForm.delete(form.id);
      toast.success("Form deleted");
      window.location.href = createPageUrl("FormBuilderDashboard");
    } catch (error) {
      console.error("Error deleting form:", error);
      toast.error("Failed to delete form");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Form Lifecycle & Safety
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Delete Protection */}
        <div className="p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-2 mb-2">
            <Checkbox
              id="delete_protection"
              checked={deleteProtection}
              onCheckedChange={toggleDeleteProtection}
            />
            <label htmlFor="delete_protection" className="text-sm font-medium cursor-pointer">
              Enable delete protection
            </label>
            {deleteProtection && (
              <Badge className="bg-green-100 text-green-700">Protected</Badge>
            )}
          </div>
          <p className="text-xs text-gray-600">
            When enabled, this form cannot be deleted accidentally
          </p>
        </div>

        {/* Archive Section */}
        {form.status !== "archived" ? (
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Archive className="w-4 h-4" />
              Archive Form
            </Label>
            <p className="text-xs text-gray-600 mb-2">
              Archive this form to hide it from the main dashboard. You can restore it later.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Archive className="w-4 h-4 mr-2" />
                  Archive Form
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Archive Form?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This form will be moved to archives. You can restore it anytime.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={archiveForm}>Archive</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Archive className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-900">
                  This form is archived
                </span>
              </div>
              <p className="text-xs text-yellow-700">
                Archived on {new Date(form.config?.lifecycle?.archived_at).toLocaleDateString()}
              </p>
            </div>
            <Button
              onClick={unarchiveForm}
              variant="outline"
              className="w-full"
            >
              Restore from Archive
            </Button>
          </div>
        )}

        {/* Delete Section */}
        <div className="space-y-2 pt-2 border-t">
          <Label className="text-sm font-medium flex items-center gap-2 text-red-600">
            <Trash2 className="w-4 h-4" />
            Delete Form
          </Label>
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-xs font-medium text-red-900">
                Warning: This action cannot be undone
              </span>
            </div>
            <p className="text-xs text-red-700">
              Deleting this form will permanently remove all data including submissions.
            </p>
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full"
                disabled={deleteProtection}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Form Permanently
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Form Forever?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the form and all {form.submission_count || 0} submissions. 
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={deleteForm}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete Forever
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {deleteProtection && (
            <p className="text-xs text-gray-500 text-center">
              Disable delete protection first to enable deletion
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}