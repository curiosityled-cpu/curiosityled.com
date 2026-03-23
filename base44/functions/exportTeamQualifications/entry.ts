import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only team leaders and admins can export
    const allowedRoles = ['User Level 2', 'Analyst', 'Admin Level 1', 'Admin Level 2', 'Super Administrator', 'Platform Admin'];
    if (!allowedRoles.includes(user.app_role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { subordinate_emails = [], format = 'csv' } = await req.json();
    
    // Get team qualifications
    const [certifications, assessments, users] = await Promise.all([
      base44.entities.Certification.filter({
        user_email: { $in: subordinate_emails }
      }, '-created_date'),
      base44.entities.ExternalAssessmentResult.filter({
        user_email: { $in: subordinate_emails }
      }, '-created_date'),
      base44.entities.User.filter({
        email: { $in: subordinate_emails }
      })
    ]);

    if (format === 'csv') {
      // Generate CSV
      const csvRows = [
        ['User Name', 'Email', 'Type', 'Name/Type', 'Status', 'Date', 'Expiration', 'Result/Issuer']
      ];

      certifications.forEach(cert => {
        const userName = users.find(u => u.email === cert.user_email)?.full_name || cert.user_email;
        csvRows.push([
          userName,
          cert.user_email,
          'Certification',
          cert.name,
          cert.status,
          cert.issue_date || '',
          cert.expiration_date || '',
          cert.issuing_body || ''
        ]);
      });

      assessments.forEach(assess => {
        const userName = users.find(u => u.email === assess.user_email)?.full_name || assess.user_email;
        csvRows.push([
          userName,
          assess.user_email,
          'Assessment',
          assess.assessment_type,
          assess.status,
          assess.date_completed || '',
          '',
          assess.designation_or_score || ''
        ]);
      });

      const csvContent = csvRows.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="team_qualifications.csv"'
        }
      });
    } else if (format === 'pdf') {
      // Generate PDF
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text('Team Qualifications Report', 20, 20);
      
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);
      doc.text(`Team Leader: ${user.full_name || user.email}`, 20, 36);
      doc.text(`Total Team Members: ${subordinate_emails.length}`, 20, 42);

      let y = 55;
      
      // Certifications Section
      if (certifications.length > 0) {
        doc.setFontSize(14);
        doc.text('Certifications', 20, y);
        y += 8;
        
        doc.setFontSize(9);
        certifications.forEach(cert => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          
          const userName = users.find(u => u.email === cert.user_email)?.full_name || cert.user_email;
          doc.text(`${userName}`, 20, y);
          doc.text(`${cert.name} - ${cert.status}`, 25, y + 5);
          doc.text(`Issuer: ${cert.issuing_body || 'N/A'}`, 25, y + 10);
          if (cert.expiration_date) {
            doc.text(`Expires: ${new Date(cert.expiration_date).toLocaleDateString()}`, 25, y + 15);
          }
          y += 22;
        });
        y += 5;
      }

      // Assessments Section
      if (assessments.length > 0) {
        if (y > 240) {
          doc.addPage();
          y = 20;
        }
        
        doc.setFontSize(14);
        doc.text('External Assessments', 20, y);
        y += 8;
        
        doc.setFontSize(9);
        assessments.forEach(assess => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          
          const userName = users.find(u => u.email === assess.user_email)?.full_name || assess.user_email;
          doc.text(`${userName}`, 20, y);
          doc.text(`${assess.assessment_type} - ${assess.status}`, 25, y + 5);
          if (assess.designation_or_score) {
            doc.text(`Result: ${assess.designation_or_score}`, 25, y + 10);
          }
          y += 18;
        });
      }

      const pdfBytes = doc.output('arraybuffer');
      
      return new Response(pdfBytes, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="team_qualifications.pdf"'
        }
      });
    }

    return Response.json({ error: 'Invalid format' }, { status: 400 });
  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});