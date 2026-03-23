
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { format } from 'npm:date-fns@2.30.0'; // Import date-fns for date formatting

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // This function should be called by a cron job daily
        // It processes all scheduled reports that are due
        
        console.log('Starting scheduled report processor...');
        
        // Fetch all active scheduled reports using service role
        const allReports = await base44.asServiceRole.entities.ScheduledReport.filter({
            status: 'active'
        });
        
        console.log(`Found ${allReports.length} active scheduled reports`);
        
        const now = new Date();
        const processedReports = [];
        const failedReports = [];
        
        for (const report of allReports) {
            try {
                // Check if this report is due
                const isDue = isReportDue(report, now);
                
                if (!isDue) {
                    console.log(`Report ${report.id} (${report.report_name}) is not due yet`);
                    continue;
                }

                // Check if report has ended (for recurring reports with end date)
                if (report.schedule_end_date) {
                    const endDate = new Date(report.schedule_end_date);
                    if (now > endDate) {
                        console.log(`Report ${report.id} has passed its end date, marking as completed`);
                        await base44.asServiceRole.entities.ScheduledReport.update(report.id, {
                            status: 'completed',
                            error_message: null
                        }).catch(err => console.error('Failed to mark as completed:', err));
                        continue;
                    }
                }
                
                console.log(`Processing report ${report.id} (${report.report_name})...`);
                
                // Generate the report by calling generateCustomReport
                const generateResult = await base44.asServiceRole.functions.invoke('generateCustomReport', {
                    report_config: report.report_config,
                    output_format: report.output_format
                });
                
                if (!generateResult.data.success) {
                    throw new Error(generateResult.data.error || 'Report generation failed');
                }
                
                const fileUri = generateResult.data.file_uri;
                
                // Create a signed URL for the file (valid for 7 days)
                const signedUrlResult = await base44.asServiceRole.integrations.invoke('Core', 'CreateFileSignedUrl', {
                    file_uri: fileUri,
                    expires_in: 604800 // 7 days in seconds
                });
                
                // Send emails to all recipients
                const emailPromises = [];
                for (const recipientEmail of report.recipients) {
                    const emailBody = `
                        <html>
                        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #1e40af;">Your Scheduled Report is Ready</h2>
                            <p>Hello,</p>
                            <p>Your scheduled report "<strong>${report.report_name}</strong>" has been generated and is ready for download.</p>
                            
                            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                <p style="margin: 5px 0;"><strong>Report Name:</strong> ${report.report_name}</p>
                                <p style="margin: 5px 0;"><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
                                <p style="margin: 5px 0;"><strong>Format:</strong> ${report.output_format.toUpperCase()}</p>
                                <p style="margin: 5px 0;"><strong>Schedule:</strong> ${getScheduleDescription(report)}</p>
                            </div>
                            
                            <p style="margin: 30px 0;">
                                <a href="${signedUrlResult.signed_url}" 
                                   style="background-color: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                    Download Report
                                </a>
                            </p>
                            
                            <p style="color: #6b7280; font-size: 14px;">
                                <em>Note: This download link will expire in 7 days.</em>
                            </p>
                            
                            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
                            
                            <p style="color: #6b7280; font-size: 12px;">
                                This is an automated message from your Leadership Analytics platform. 
                                To manage your scheduled reports, log in to your dashboard.
                            </p>
                        </body>
                        </html>
                    `;
                    
                    emailPromises.push(
                        base44.asServiceRole.integrations.invoke('Core', 'SendEmail', {
                            to: recipientEmail,
                            subject: `Your Scheduled Report: ${report.report_name}`,
                            body: emailBody
                        })
                    );
                }
                
                await Promise.all(emailPromises);
                console.log(`Emails sent to ${report.recipients.length} recipient(s)`);
                
                // Calculate next scheduled date
                const nextScheduledDate = calculateNextScheduledDate(report, now);
                
                // Update generation history (keep last 10)
                const currentHistory = report.generation_history || [];
                const newHistoryEntry = {
                    timestamp: now.toISOString(),
                    status: 'success',
                    file_uri: fileUri,
                    recipients_count: report.recipients.length
                };
                const updatedHistory = [newHistoryEntry, ...currentHistory].slice(0, 10);
                
                // Update the report with generation info
                await base44.asServiceRole.entities.ScheduledReport.update(report.id, {
                    last_generated_date: now.toISOString(),
                    last_file_uri: fileUri,
                    next_scheduled_date: nextScheduledDate,
                    status: report.schedule_interval === 'once' ? 'completed' : 'active',
                    error_message: null,
                    generation_history: updatedHistory,
                    total_generations: (report.total_generations || 0) + 1
                });
                
                processedReports.push({
                    id: report.id,
                    name: report.report_name,
                    recipients: report.recipients.length
                });
                
                console.log(`Successfully processed report ${report.id}`);
                
            } catch (error) {
                console.error(`Error processing report ${report.id}:`, error);
                
                // Update generation history with failure
                const currentHistory = report.generation_history || [];
                const newHistoryEntry = {
                    timestamp: now.toISOString(),
                    status: 'failed',
                    error_message: error.message
                };
                const updatedHistory = [newHistoryEntry, ...currentHistory].slice(0, 10);
                
                // Update report with error status
                await base44.asServiceRole.entities.ScheduledReport.update(report.id, {
                    status: 'failed',
                    error_message: error.message,
                    generation_history: updatedHistory
                }).catch(err => console.error('Failed to update error status:', err));
                
                failedReports.push({
                    id: report.id,
                    name: report.report_name,
                    error: error.message
                });
            }
        }
        
        console.log('Scheduled report processor completed');
        
        return Response.json({
            success: true,
            summary: {
                total_reports_checked: allReports.length,
                reports_processed: processedReports.length,
                reports_failed: failedReports.length
            },
            processed_reports: processedReports,
            failed_reports: failedReports
        });
        
    } catch (error) {
        console.error('Error in scheduleReportProcessor:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});

// Helper function to check if a report is due
function isReportDue(report, now) {
    const interval = report.schedule_interval;
    
    // One-time reports that haven't been generated yet
    if (interval === 'once' && !report.last_generated_date) {
        return true;
    }
    
    // One-time reports that have been generated
    if (interval === 'once' && report.last_generated_date) {
        return false;
    }
    
    // Specific dates - check if today matches any of the specified dates
    if (interval === 'specific_dates') {
        if (!report.schedule_specific_dates || report.schedule_specific_dates.length === 0) {
            return false;
        }
        
        const todayStr = format(now, 'yyyy-MM-dd');
        const hasMatchingDate = report.schedule_specific_dates.some(dateStr => {
            const scheduledDate = new Date(dateStr);
            const scheduledDateStr = format(scheduledDate, 'yyyy-MM-dd');
            return scheduledDateStr === todayStr;
        });
        
        // Only generate once per day for specific dates
        if (hasMatchingDate) {
            if (report.last_generated_date) {
                const lastGenDate = format(new Date(report.last_generated_date), 'yyyy-MM-dd');
                return lastGenDate !== todayStr; // Generate only if not already generated today
            }
            return true;
        }
        return false;
    }
    
    // Check if next_scheduled_date has passed for other recurring reports
    if (report.next_scheduled_date) {
        const nextDate = new Date(report.next_scheduled_date);
        return now >= nextDate;
    }
    
    // If no next_scheduled_date, check if it should be generated now based on interval
    return shouldGenerateRecurringReport(report, now);
}

// Helper function to determine if a recurring report should be generated
function shouldGenerateRecurringReport(report, now) {
    const interval = report.schedule_interval;
    
    if (!report.last_generated_date) {
        return true; // Never generated, generate now
    }
    
    const lastGenerated = new Date(report.last_generated_date);
    const daysSinceLastGen = Math.floor((now.getTime() - lastGenerated.getTime()) / (1000 * 60 * 60 * 24));
    
    // Daily reports
    if (interval === 'daily') {
        return daysSinceLastGen >= 1;
    }
    
    // Every N days
    if (interval === 'every_n_days') {
        const nDays = report.schedule_every_n_days || 1;
        return daysSinceLastGen >= nDays;
    }
    
    // Weekly reports
    if (interval === 'weekly') {
        const currentDayOfWeek = now.getDay();
        return daysSinceLastGen >= 7 && currentDayOfWeek === report.schedule_day_of_week;
    }
    
    // Monthly reports
    if (interval === 'monthly') {
        const currentDayOfMonth = now.getDate();
        const lastGenMonth = lastGenerated.getMonth();
        const currentMonth = now.getMonth();
        
        // Ensure it's a new month and today's date is on or after the scheduled day of month
        // Also ensure the year is not the same if current month is less than lastGenMonth (e.g. Dec to Jan)
        return (currentMonth !== lastGenMonth || now.getFullYear() !== lastGenerated.getFullYear()) && currentDayOfMonth >= report.schedule_day_of_month;
    }
    
    // First weekday of month
    if (interval === 'first_weekday_of_month') {
        const currentDayOfWeek = now.getDay();
        const currentDayOfMonth = now.getDate();
        const lastGenMonth = lastGenerated.getMonth();
        const currentMonth = now.getMonth();
        
        // Must be a weekday (Mon-Fri)
        if (currentDayOfWeek === 0 || currentDayOfWeek === 6) {
            return false;
        }
        
        // Must be a different month from last generation (or different year if month rolled over)
        if (currentMonth === lastGenMonth && now.getFullYear() === lastGenerated.getFullYear()) {
            return false;
        }
        
        // Must be within the first 5 days of the month (to catch the first weekday, accounting for weekend shifts)
        if (currentDayOfMonth > 5) { // A safe upper bound for first weekday
            return false;
        }
        
        // Check if this is the first weekday of the month
        for (let day = 1; day <= currentDayOfMonth; day++) {
            const testDate = new Date(now.getFullYear(), now.getMonth(), day);
            const testDayOfWeek = testDate.getDay();
            if (testDayOfWeek !== 0 && testDayOfWeek !== 6) { // If testDate is a weekday
                return currentDayOfMonth === day; // It's due if currentDayOfMonth is this first weekday
            }
        }
        return false;
    }
    
    return false;
}

// Helper function to calculate the next scheduled date
function calculateNextScheduledDate(report, currentDate) {
    const interval = report.schedule_interval;
    
    if (interval === 'once' || interval === 'specific_dates') {
        return null; // These don't have a predictable next date
    }
    
    const next = new Date(currentDate);
    
    // Set time to start of day to avoid time-of-day issues with recurrence logic
    next.setHours(0, 0, 0, 0); 

    if (interval === 'daily') {
        next.setDate(next.getDate() + 1);
    } else if (interval === 'every_n_days') {
        const nDays = report.schedule_every_n_days || 1;
        next.setDate(next.getDate() + nDays);
    } else if (interval === 'weekly') {
        // Add 7 days
        next.setDate(next.getDate() + 7);
        
        // Adjust to the correct day of week if needed
        while (next.getDay() !== report.schedule_day_of_week) {
            next.setDate(next.getDate() + 1);
        }
    } else if (interval === 'monthly') {
        // Move to next month
        next.setMonth(next.getMonth() + 1);
        
        // Set to the specified day of month, handling end of month
        const lastDayOfMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(report.schedule_day_of_month, lastDayOfMonth));
    } else if (interval === 'first_weekday_of_month') {
        // Move to next month
        next.setMonth(next.getMonth() + 1);
        next.setDate(1); // Start at the first day of the new month
        
        // Find first weekday
        while (next.getDay() === 0 || next.getDay() === 6) { // 0 = Sunday, 6 = Saturday
            next.setDate(next.getDate() + 1);
        }
    }
    
    return next.toISOString();
}

// Helper function to get a human-readable schedule description
function getScheduleDescription(report) {
    const interval = report.schedule_interval;
    
    if (interval === 'once') {
        return 'One-time report';
    }
    
    if (interval === 'daily') {
        return 'Daily';
    }
    
    if (interval === 'every_n_days') {
        const nDays = report.schedule_every_n_days || 1;
        return `Every ${nDays} day${nDays > 1 ? 's' : ''}`;
    }
    
    if (interval === 'weekly') {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return `Weekly on ${days[report.schedule_day_of_week]}`;
    }
    
    if (interval === 'monthly') {
        const day = report.schedule_day_of_month;
        const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th';
        return `Monthly on the ${day}${suffix}`;
    }
    
    if (interval === 'first_weekday_of_month') {
        return 'First weekday of each month';
    }
    
    if (interval === 'specific_dates') {
        const count = report.schedule_specific_dates?.length || 0;
        return `${count} specific date${count !== 1 ? 's' : ''}`;
    }
    
    return 'Unknown schedule';
}
