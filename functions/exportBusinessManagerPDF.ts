import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clients, partners } = await req.json();

    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Business Manager Report', 20, 20);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);

    let y = 45;
    doc.setFontSize(14);
    doc.text(`Clients (${clients.length})`, 20, y);
    y += 10;
    
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