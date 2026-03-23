import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // This is a scheduled task function, no user auth needed
    const today = new Date();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const fourteenDaysFromNow = new Date(today);
    fourteenDaysFromNow.setDate(today.getDate() + 14);

    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    // Query certifications that are expiring soon
    const allCertifications = await base44.asServiceRole.entities.Certification.filter({
      status: 'verified'
    });

    let remindersSent = 0;

    for (const cert of allCertifications) {
      if (!cert.expiration_date) continue;

      const expirationDate = new Date(cert.expiration_date);
      const daysUntilExpiration = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));

      let shouldSendReminder = false;
      let reminderMessage = '';

      // Check if we should send a reminder
      if (daysUntilExpiration === 30) {
        shouldSendReminder = true;
        reminderMessage = `Your ${cert.name} certification expires in 30 days (${cert.expiration_date}). Please plan for renewal.`;
      } else if (daysUntilExpiration === 14) {
        shouldSendReminder = true;
        reminderMessage = `Your ${cert.name} certification expires in 14 days (${cert.expiration_date}). Please renew soon.`;
      } else if (daysUntilExpiration === 7) {
        shouldSendReminder = true;
        reminderMessage = `Your ${cert.name} certification expires in 7 days (${cert.expiration_date}). Urgent: Please renew.`;
      } else if (daysUntilExpiration === 0) {
        shouldSendReminder = true;
        reminderMessage = `Your ${cert.name} certification expires today (${cert.expiration_date}). Please renew immediately.`;
        // Also update status to expired
        await base44.asServiceRole.entities.Certification.update(cert.id, {
          status: 'expired'
        });
      } else if (daysUntilExpiration < 0 && daysUntilExpiration > -56) {
        // Send weekly reminders for 8 weeks after expiration
        const weeksExpired = Math.abs(Math.floor(daysUntilExpiration / 7));
        if (daysUntilExpiration % 7 === 0) {
          shouldSendReminder = true;
          reminderMessage = `Your ${cert.name} certification expired ${weeksExpired} week(s) ago. Please renew to maintain your credential.`;
        }
      }

      if (shouldSendReminder) {
        // Create notification
        await base44.asServiceRole.entities.Notification.create({
          user_email: cert.user_email,
          type: 'certification_expiring',
          title: 'Certification Expiration Reminder',
          message: reminderMessage,
          priority: daysUntilExpiration <= 7 ? 'high' : 'medium',
          related_entity_type: 'Certification',
          related_entity_id: cert.id
        });

        // Send email
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: cert.user_email,
            subject: 'Certification Expiration Reminder',
            body: reminderMessage
          });
          remindersSent++;
        } catch (emailError) {
          console.error(`Failed to send email to ${cert.user_email}:`, emailError);
        }
      }
    }

    return Response.json({
      success: true,
      remindersSent,
      message: `Sent ${remindersSent} certification reminders`
    });

  } catch (error) {
    console.error('sendCertificationReminder error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});