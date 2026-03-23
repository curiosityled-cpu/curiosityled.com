import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Backend function to process scheduled forms
 * - Auto-close forms that reached their end date
 * - Auto-close forms that reached max submissions
 * - Send automatic reminders
 * 
 * Should be called periodically (e.g., via cron job)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all published forms with scheduling
    const forms = await base44.asServiceRole.entities.CustomForm.filter({
      status: "published"
    });

    const now = new Date();
    const results = {
      closed: [],
      reminders_sent: [],
      errors: []
    };

    for (const form of forms) {
      try {
        // Check if form should be auto-closed due to end date
        if (form.scheduling?.end_date && form.scheduling?.auto_close_on_end) {
          const endDate = new Date(form.scheduling.end_date);
          
          if (now > endDate) {
            await base44.asServiceRole.entities.CustomForm.update(form.id, {
              status: "archived"
            });
            results.closed.push({ form_id: form.id, reason: "end_date" });
            continue; // Skip other checks if form is closed
          }
        }

        // Check if form should be auto-closed due to max submissions
        if (form.scheduling?.auto_close_on_max_submissions) {
          const maxSubs = form.public_access_config?.max_submissions;
          
          if (maxSubs && form.submission_count >= maxSubs) {
            await base44.asServiceRole.entities.CustomForm.update(form.id, {
              status: "archived"
            });
            results.closed.push({ form_id: form.id, reason: "max_submissions" });
            continue;
          }
        }

        // Process automatic reminders
        if (form.reminders?.enabled && form.assigned_to_emails?.length > 0) {
          const lastSent = form.reminders.last_reminder_sent 
            ? new Date(form.reminders.last_reminder_sent) 
            : null;
          
          const frequencyMs = form.reminders.frequency_days * 24 * 60 * 60 * 1000;
          const shouldSend = !lastSent || (now - lastSent) >= frequencyMs;

          if (shouldSend) {
            // Get all submissions for this form
            const submissions = await base44.asServiceRole.entities.CustomFormSubmission.filter({
              form_id: form.id
            });

            // Find users who haven't submitted
            const submitterEmails = submissions.map(s => s.submitter_email);
            const pendingEmails = form.assigned_to_emails.filter(
              email => !submitterEmails.includes(email)
            );

            // Send reminders
            for (const email of pendingEmails) {
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: email,
                subject: `Reminder: ${form.title}`,
                body: form.reminders.reminder_message || 
                  `This is a reminder to complete the form: ${form.title}`
              });
            }

            // Update last sent timestamp
            await base44.asServiceRole.entities.CustomForm.update(form.id, {
              reminders: {
                ...form.reminders,
                last_reminder_sent: now.toISOString()
              }
            });

            results.reminders_sent.push({
              form_id: form.id,
              recipients: pendingEmails.length
            });
          }
        }
      } catch (error) {
        results.errors.push({
          form_id: form.id,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      processed_at: now.toISOString(),
      results: results
    });
  } catch (error) {
    console.error("Error processing scheduled forms:", error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});