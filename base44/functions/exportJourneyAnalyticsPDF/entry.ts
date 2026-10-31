import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';
import { buildReportContext, drawReportHeader, drawReportFooter, drawSectionHeading } from '../../shared/reportContext.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { scope, filters, metrics } = await req.json();

    const doc = new jsPDF();

    const scopeName = String(scope || 'Personal');
    const context = buildReportContext({
      title: 'Journey Analytics Report',
      reportType: 'Journey analytics',
      view: scopeName.charAt(0).toUpperCase() + scopeName.slice(1),
      subject:
        scopeName.toLowerCase() === 'personal'
          ? 'Your own journey enrolments'
          : 'Journeys and learners in this scope',
      timeframe: filters?.timeRange ? `Last ${filters.timeRange}` : '',
      filters: filters?.track ? [{ label: 'Track', value: filters.track }] : [],
      preparedBy: user.full_name || user.email,
      note: 'Enrolment and completion figures rest on the journeys listed in this report.',
    });

    let y = drawReportHeader(doc, context, { margin: 20 });
    y = drawSectionHeading(doc, 'Key metrics', y, { margin: 20 });
    
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    
    const metricsData = [
      { label: 'Total Journeys', value: metrics?.totalJourneys || 0 },
      { label: 'Total Enrollments', value: metrics?.totalEnrollments || 0 },
      { label: 'Active Learners', value: metrics?.activeLearners || 0 },
      { label: 'Completion Rate', value: `${metrics?.completionRate || 0}%` }
    ];

    metricsData.forEach(metric => {
      doc.text(`${metric.label}:`, 25, y);
      doc.setFont(undefined, 'bold');
      doc.text(String(metric.value), 80, y);
      doc.setFont(undefined, 'normal');
      y += 8;
    });

    y += 10;

    // Filters Applied Section
    if (filters) {
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text('Filters Applied', 20, y);
      y += 12;
      
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(`Time Range: ${filters.timeframe || 'Last 6 Months'}`, 25, y);
      y += 7;
      if (filters.division && filters.division !== 'all') {
        doc.text(`Division: ${filters.division}`, 25, y);
        y += 7;
      }
      if (filters.level && filters.level !== 'all') {
        doc.text(`Level: ${filters.level}`, 25, y);
        y += 7;
      }
      if (filters.journeyType && filters.journeyType !== 'all') {
        doc.text(`Journey Type: ${filters.journeyType}`, 25, y);
        y += 7;
      }
    }

    y += 10;

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Curiosity Led - Leadership Development Platform', 20, 285);
    doc.text(`Page 1`, 180, 285);

    drawReportFooter(doc, context, { margin: 20 });
    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=journey-analytics.pdf'
      }
    });
  } catch (error) {
    console.error('Error exporting PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});