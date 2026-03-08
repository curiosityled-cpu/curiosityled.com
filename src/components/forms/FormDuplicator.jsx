import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

export default function FormDuplicator({ form }) {
  const [duplicating, setDuplicating] = useState(false);
  const [options, setOptions] = useState({
    new_title: `${form.title} (Copy)`,
    copy_assignments: false,
    copy_scheduling: false,
    copy_webhooks: false,
    copy_submissions: false,
    reset_to_draft: true
  });

  const duplicateForm = async () => {
    if (!options.new_title.trim()) {
      toast.error("Please enter a title for the duplicate");
      return;
    }

    setDuplicating(true);
    try {
      const user = await base44.auth.me();

      // Build new form config
      const newConfig = {
        sections: JSON.parse(JSON.stringify(form.config.sections)),
        scoring_config: form.config.scoring_config,
        ai_analysis_enabled: form.config.ai_analysis_enabled
      };

      if (options.copy_scheduling) {
        newConfig.scheduling = form.config.scheduling;
        newConfig.reminders = form.config.reminders;
      }

      if (options.copy_webhooks) {
        newConfig.webhooks = form.config.webhooks;
        newConfig.report_schedules = form.config.report_schedules;
      }

      const duplicatedForm = await base44.entities.CustomForm.create({
        client_id: user.client_id,
        title: options.new_title,
        description: form.description,
        form_type: form.form_type,
        form_category: form.form_category,
        status: options.reset_to_draft ? "draft" : form.status,
        template_id: form.template_id,
        config: newConfig,
        assigned_to_emails: options.copy_assignments ? form.assigned_to_emails : [],
        multi_step_enabled: form.multi_step_enabled,
        pages: form.pages
      });

      // Copy submissions if requested (limit to prevent performance issues)
      if (options.copy_submissions) {
        const submissions = await base44.entities.CustomFormSubmission.filter({
          form_id: form.id
        }, '-created_date', 100);

        if (submissions.length > 0) {
          await Promise.all(submissions.map(sub =>
            base44.entities.CustomFormSubmission.create({
              form_id: duplicatedForm.id,
              submitter_email: sub.submitter_email,
              submitter_name: sub.submitter_name,
              responses: sub.responses,
              status: "submitted",
              score: sub.score,
              percentage: sub.percentage
            })
          ));
        }
      }

      toast.success("Form duplicated successfully");
      window.location.href = createPageUrl("FormBuilder") + `?formId=${duplicatedForm.id}`;
    } catch (error) {
      console.error("Error duplicating form:", error);
      toast.error("Failed to duplicate form");
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Copy className="w-5 h-5" />
          Duplicate Form
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="new_title">New Form Title</Label>
          <Input
            id="new_title"
            value={options.new_title}
            onChange={(e) => setOptions({ ...options, new_title: e.target.value })}
          />
        </div>

        <div className="space-y-2 pt-2 border-t">
          <Label className="text-sm font-medium">Copy Options</Label>
          
          <div className="flex items-center gap-2">
            <Checkbox
              id="copy_assignments"
              checked={options.copy_assignments}
              onCheckedChange={(checked) => setOptions({ ...options, copy_assignments: checked })}
            />
            <label htmlFor="copy_assignments" className="text-sm cursor-pointer">
              Copy assignments
            </label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="copy_scheduling"
              checked={options.copy_scheduling}
              onCheckedChange={(checked) => setOptions({ ...options, copy_scheduling: checked })}
            />
            <label htmlFor="copy_scheduling" className="text-sm cursor-pointer">
              Copy scheduling & reminders
            </label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="copy_webhooks"
              checked={options.copy_webhooks}
              onCheckedChange={(checked) => setOptions({ ...options, copy_webhooks: checked })}
            />
            <label htmlFor="copy_webhooks" className="text-sm cursor-pointer">
              Copy webhooks & report schedules
            </label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="copy_submissions"
              checked={options.copy_submissions}
              onCheckedChange={(checked) => setOptions({ ...options, copy_submissions: checked })}
            />
            <label htmlFor="copy_submissions" className="text-sm cursor-pointer">
              Copy existing submissions (careful!)
            </label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="reset_to_draft"
              checked={options.reset_to_draft}
              onCheckedChange={(checked) => setOptions({ ...options, reset_to_draft: checked })}
            />
            <label htmlFor="reset_to_draft" className="text-sm cursor-pointer">
              Reset to draft status
            </label>
          </div>
        </div>

        <Button
          onClick={duplicateForm}
          disabled={duplicating}
          className="w-full"
          style={{ backgroundColor: '#0202ff' }}
        >
          {duplicating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Duplicating...
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              Duplicate Form
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}