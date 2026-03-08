import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      conversation_id, 
      strategic_mode = false, 
      risk_data = null,
      action_plan = []
    } = await req.json();

    const doc = new jsPDF();
    let yPosition = 20;

    // Helper function to add text with word wrap
    const addText = (text, x, y, maxWidth = 170) => {
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y);
      return lines.length * 7; // Return height used
    };

    // Header
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229); // Purple
    if (strategic_mode && risk_data) {
      doc.text('Strategic Risk Analysis', 20, yPosition);
      yPosition += 10;
      
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(risk_data.title, 20, yPosition);
      yPosition += 15;
    } else {
      doc.text('Atreus Conversation Export', 20, yPosition);
      yPosition += 15;
    }

    // User info
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`User: ${user.full_name} (${user.email})`, 20, yPosition);
    yPosition += 7;
    doc.text(`Role: ${user.app_role || 'N/A'}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Exported: ${new Date().toLocaleString()}`, 20, yPosition);
    yPosition += 15;

    if (strategic_mode && risk_data) {
      // Strategic Analysis Export
      
      // Risk Details
      doc.setFillColor(254, 226, 226); // Light red
      doc.rect(15, yPosition - 5, 180, 30, 'F');
      
      doc.setFontSize(14);
      doc.setTextColor(185, 28, 28); // Red
      doc.text('Risk Overview', 20, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Severity: ${risk_data.severity.toUpperCase()}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Affected Leaders: ${risk_data.affected_count}`, 20, yPosition);
      yPosition += 10;

      yPosition += 5;

      // Description
      doc.setFontSize(12);
      doc.text('Description:', 20, yPosition);
      yPosition += 7;
      
      doc.setFontSize(10);
      const descHeight = addText(risk_data.description, 20, yPosition);
      yPosition += descHeight + 10;

      // Executive Action Plan
      if (action_plan && action_plan.length > 0) {
        // Check if we need a new page
        if (yPosition > 240) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFillColor(220, 252, 231); // Light green
        doc.rect(15, yPosition - 5, 180, 10, 'F');
        
        doc.setFontSize(14);
        doc.setTextColor(21, 128, 61); // Green
        doc.text('Executive Action Plan', 20, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);

        action_plan.forEach((item, idx) => {
          // Check if we need a new page
          if (yPosition > 260) {
            doc.addPage();
            yPosition = 20;
          }

          const checkbox = item.completed ? '[✓]' : '[ ]';
          doc.text(`${idx + 1}. ${checkbox}`, 20, yPosition);
          
          const actionHeight = addText(item.action, 35, yPosition, 155);
          yPosition += actionHeight + 5;
        });
      }

      // Get conversation messages if available
      if (conversation_id) {
        try {
          const conversation = await base44.entities.Conversation.get(conversation_id);
          
          if (conversation && conversation.messages && conversation.messages.length > 0) {
            // Add new page for conversation
            doc.addPage();
            yPosition = 20;

            doc.setFontSize(14);
            doc.text('Strategic Discussion', 20, yPosition);
            yPosition += 10;

            doc.setFontSize(10);

            conversation.messages.forEach((message) => {
              if (yPosition > 260) {
                doc.addPage();
                yPosition = 20;
              }

              const speaker = message.role === 'user' ? user.full_name : 'Atreus';
              const timestamp = new Date(message.timestamp).toLocaleString();

              doc.setFontSize(9);
              doc.setTextColor(100, 100, 100);
              doc.text(`[${timestamp}] ${speaker}:`, 20, yPosition);
              yPosition += 7;

              doc.setFontSize(10);
              doc.setTextColor(0, 0, 0);
              const messageHeight = addText(message.content, 20, yPosition);
              yPosition += messageHeight + 8;
            });
          }
        } catch (error) {
          console.warn('Could not load conversation:', error);
        }
      }

    } else if (conversation_id) {
      // Regular Conversation Export
      
      try {
        const conversation = await base44.entities.Conversation.get(conversation_id);

        if (!conversation) {
          return Response.json({ error: 'Conversation not found' }, { status: 404 });
        }

        // Conversation title
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Title: ${conversation.title}`, 20, yPosition);
        yPosition += 10;

        // Messages
        if (conversation.messages && conversation.messages.length > 0) {
          doc.setFontSize(10);

          conversation.messages.forEach((message) => {
            if (yPosition > 260) {
              doc.addPage();
              yPosition = 20;
            }

            const speaker = message.role === 'user' ? user.full_name : 'Atreus';
            const timestamp = new Date(message.timestamp).toLocaleString();

            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text(`[${timestamp}] ${speaker}:`, 20, yPosition);
            yPosition += 7;

            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            const messageHeight = addText(message.content, 20, yPosition);
            yPosition += messageHeight + 8;
          });
        } else {
          doc.text('No messages in this conversation.', 20, yPosition);
        }
      } catch (error) {
        console.error('Error loading conversation:', error);
        return Response.json({ error: 'Failed to load conversation' }, { status: 500 });
      }
    } else {
      return Response.json({ error: 'Either conversation_id or strategic_mode with risk_data is required' }, { status: 400 });
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
      doc.text('Generated by Curiosity Led Platform', 105, 285, { align: 'center' });
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=atreus-${strategic_mode ? 'strategic-analysis' : 'conversation'}-${new Date().toISOString().split('T')[0]}.pdf`
      }
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return Response.json({ 
      error: 'Failed to generate PDF',
      details: error.message 
    }, { status: 500 });
  }
});