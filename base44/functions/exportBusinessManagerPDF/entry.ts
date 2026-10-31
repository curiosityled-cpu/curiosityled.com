import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { jsPDF } from 'npm:jspdf@2.5.1';
import { buildReportContext, drawReportHeader, drawReportFooter, drawSectionHeading } from '../../shared/reportContext.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clients, partners } = await req.json();

    const doc = new jsPDF();

    const context = buildReportContext({
      title: 'Business Manager Report',
      reportType: 'Commercial overview',
      view: 'Platform',
      subject: 'All clients and partners on the platform',
      selection: `${clients.length} clients · ${partners.length} partners`,
      preparedBy: user.full_name || user.email,
      note: 'Seat usage compares seats in use against licensed seats for each client.',
    });

    let y = drawReportHeader(doc, context, { margin: 20 });
    y = drawSectionHeading(doc, `Clients (${clients.length})`, y, { margin: 20 });
    
    doc.setFontSize(8);
    clients.forEach(c => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${c.name} - ${c.type} - ${c.status} - ${c.seats_used || 0}/${c.license_count || 0} seats`, 20, y);
      y += 5;
    });

    y += 10;
    doc.setFontSize(14);
    doc.text(`Partners (${partners.length})`, 20, y);
    y += 10;
    
    doc.setFontSize(8);
    partners.forEach(p => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${p.name} - ${p.type} - ${p.client_count || 0} clients - $${p.total_revenue_generated || 0} revenue`, 20, y);
      y += 5;
    });

    drawReportFooter(doc, context, { margin: 20 });
    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=business-manager.pdf'
      }
    });
  } catch (error) {
    console.error('Error exporting PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});