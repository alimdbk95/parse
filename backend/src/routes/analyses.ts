import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { aiService } from '../services/aiService.js';
import PDFDocument from 'pdfkit';

const router = Router();

// Get all analyses
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { workspaceId } = req.query;

    const analyses = await prisma.analysis.findMany({
      where: {
        OR: [
          { createdById: req.user!.id },
          ...(workspaceId ? [{ workspaceId: workspaceId as string }] : []),
        ],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        documents: {
          include: {
            document: {
              select: { id: true, name: true, type: true },
            },
          },
        },
        _count: {
          select: { messages: true, charts: true },
        },
      },
    });

    res.json({ analyses });
  } catch (error) {
    console.error('Get analyses error:', error);
    res.status(500).json({ error: 'Failed to get analyses' });
  }
});

// Create new analysis
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { title, description, workspaceId, documentIds } = req.body;

    const analysis = await prisma.analysis.create({
      data: {
        title: title || 'New Analysis',
        description,
        createdById: req.user!.id,
        workspaceId: workspaceId || null,
        documents: documentIds?.length
          ? {
              create: documentIds.map((docId: string) => ({
                documentId: docId,
              })),
            }
          : undefined,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        documents: {
          include: {
            document: true,
          },
        },
      },
    });

    // Create initial system message
    await prisma.message.create({
      data: {
        role: 'assistant',
        content: `Hello! I'm ready to help you analyze your data. You can upload documents or ask me questions to get started.`,
        analysisId: analysis.id,
      },
    });

    // Emit socket event
    const io = req.app.get('io');
    if (workspaceId) {
      io.to(`workspace:${workspaceId}`).emit('analysis-created', {
        analysis,
        createdBy: req.user,
      });
    }

    res.status(201).json({ analysis });
  } catch (error) {
    console.error('Create analysis error:', error);
    res.status(500).json({ error: 'Failed to create analysis' });
  }
});

// Get single analysis with messages
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const analysis = await prisma.analysis.findFirst({
      where: {
        id: req.params.id,
        OR: [
          { createdById: req.user!.id },
          {
            workspace: {
              members: {
                some: { userId: req.user!.id },
              },
            },
          },
        ],
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        documents: {
          include: {
            document: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
        charts: true,
        workspace: {
          include: {
            members: {
              where: { userId: req.user!.id },
              select: { role: true },
            },
          },
        },
      },
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    // Determine user's role
    let userRole = 'viewer';
    if (analysis.createdById === req.user!.id) {
      userRole = 'admin';
    } else if (analysis.workspace?.members?.[0]?.role) {
      userRole = analysis.workspace.members[0].role;
    }

    // Remove workspace member info from response
    const { workspace, ...analysisWithoutWorkspace } = analysis;

    res.json({
      analysis: {
        ...analysisWithoutWorkspace,
        workspaceId: workspace?.id || null,
      },
      userRole,
    });
  } catch (error) {
    console.error('Get analysis error:', error);
    res.status(500).json({ error: 'Failed to get analysis' });
  }
});

// Add message to analysis (chat)
router.post('/:id/messages', authenticate, async (req: AuthRequest, res) => {
  try {
    const { content } = req.body;
    const analysisId = req.params.id;

    if (!content) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Verify access
    const analysis = await prisma.analysis.findFirst({
      where: {
        id: analysisId,
        OR: [
          { createdById: req.user!.id },
          {
            workspace: {
              members: {
                some: { userId: req.user!.id },
              },
            },
          },
        ],
      },
      include: {
        documents: {
          include: { document: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    // Create user message
    const userMessage = await prisma.message.create({
      data: {
        role: 'user',
        content,
        analysisId,
        userId: req.user!.id,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    // Emit user message via socket
    const io = req.app.get('io');
    io.to(`analysis:${analysisId}`).emit('new-message', {
      message: userMessage,
    });

    // Generate AI response
    const aiResponse = await aiService.generateResponse(content, {
      documents: analysis.documents.map(d => ({
        name: d.document.name,
        content: d.document.content || '',
        type: d.document.type,
      })),
      previousMessages: analysis.messages.reverse().map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    // Create assistant message
    const assistantMessage = await prisma.message.create({
      data: {
        role: 'assistant',
        content: aiResponse.text,
        metadata: aiResponse.chart ? JSON.stringify({ chart: aiResponse.chart }) : null,
        analysisId,
      },
    });

    // If chart was generated, save it
    let chart = null;
    if (aiResponse.chart) {
      chart = await prisma.chart.create({
        data: {
          title: aiResponse.chart.title,
          type: aiResponse.chart.type,
          data: JSON.stringify(aiResponse.chart.data),
          config: JSON.stringify({
            description: aiResponse.chart.description,
          }),
          createdById: req.user!.id,
          workspaceId: analysis.workspaceId,
          analysisId,
        },
      });
    }

    // Emit assistant message via socket
    io.to(`analysis:${analysisId}`).emit('new-message', {
      message: assistantMessage,
      chart,
    });

    // Update analysis timestamp
    await prisma.analysis.update({
      where: { id: analysisId },
      data: { updatedAt: new Date() },
    });

    res.status(201).json({
      userMessage,
      assistantMessage,
      chart,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Add document to analysis
router.post('/:id/documents', authenticate, async (req: AuthRequest, res) => {
  try {
    const { documentId } = req.body;
    const analysisId = req.params.id;

    // Verify access
    const analysis = await prisma.analysis.findFirst({
      where: {
        id: analysisId,
        OR: [
          { createdById: req.user!.id },
          {
            workspace: {
              members: {
                some: { userId: req.user!.id, role: { in: ['admin', 'editor'] } },
              },
            },
          },
        ],
      },
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    const analysisDoc = await prisma.analysisDocument.create({
      data: {
        analysisId,
        documentId,
      },
      include: {
        document: true,
      },
    });

    // Add system message about new document
    await prisma.message.create({
      data: {
        role: 'assistant',
        content: `Document "${analysisDoc.document.name}" has been added to this analysis. I'm ready to help you explore its contents.`,
        analysisId,
      },
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(`analysis:${analysisId}`).emit('document-added', {
      document: analysisDoc.document,
    });

    res.status(201).json({ analysisDocument: analysisDoc });
  } catch (error) {
    console.error('Add document error:', error);
    res.status(500).json({ error: 'Failed to add document' });
  }
});

// Update analysis
router.patch('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { title, description } = req.body;

    const analysis = await prisma.analysis.updateMany({
      where: {
        id: req.params.id,
        createdById: req.user!.id,
      },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
      },
    });

    if (analysis.count === 0) {
      return res.status(404).json({ error: 'Analysis not found or not authorized' });
    }

    const updated = await prisma.analysis.findUnique({
      where: { id: req.params.id },
    });

    res.json({ analysis: updated });
  } catch (error) {
    console.error('Update analysis error:', error);
    res.status(500).json({ error: 'Failed to update analysis' });
  }
});

// Delete analysis
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await prisma.analysis.deleteMany({
      where: {
        id: req.params.id,
        createdById: req.user!.id,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Analysis not found or not authorized' });
    }

    res.json({ message: 'Analysis deleted successfully' });
  } catch (error) {
    console.error('Delete analysis error:', error);
    res.status(500).json({ error: 'Failed to delete analysis' });
  }
});

// Update message (edit outcome)
router.patch('/:analysisId/messages/:messageId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { content } = req.body;
    const { analysisId, messageId } = req.params;

    // Verify access to analysis
    const analysis = await prisma.analysis.findFirst({
      where: {
        id: analysisId,
        OR: [
          { createdById: req.user!.id },
          {
            workspace: {
              members: {
                some: { userId: req.user!.id, role: { in: ['admin', 'editor'] } },
              },
            },
          },
        ],
      },
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    // Update the message
    const message = await prisma.message.update({
      where: { id: messageId },
      data: {
        content,
        isEdited: true,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(`analysis:${analysisId}`).emit('message-updated', { message });

    res.json({ message });
  } catch (error) {
    console.error('Update message error:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// Add comment to message
router.post('/:analysisId/messages/:messageId/comments', authenticate, async (req: AuthRequest, res) => {
  try {
    const { content } = req.body;
    const { analysisId, messageId } = req.params;

    // Verify access
    const analysis = await prisma.analysis.findFirst({
      where: {
        id: analysisId,
        OR: [
          { createdById: req.user!.id },
          {
            workspace: {
              members: {
                some: { userId: req.user!.id },
              },
            },
          },
        ],
      },
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        authorId: req.user!.id,
        messageId,
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(`analysis:${analysisId}`).emit('new-comment', { comment, messageId });

    res.status(201).json({ comment });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Get comments for a message
router.get('/:analysisId/messages/:messageId/comments', authenticate, async (req: AuthRequest, res) => {
  try {
    const { messageId } = req.params;

    const comments = await prisma.comment.findMany({
      where: { messageId },
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ comments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to get comments' });
  }
});

// Export analysis as PDF
router.get('/:id/export/pdf', authenticate, async (req: AuthRequest, res) => {
  try {
    const analysis = await prisma.analysis.findFirst({
      where: {
        id: req.params.id,
        OR: [
          { createdById: req.user!.id },
          {
            workspace: {
              members: {
                some: { userId: req.user!.id },
              },
            },
          },
        ],
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        documents: {
          include: {
            document: {
              select: { id: true, name: true, type: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    // Create PDF document
    const doc = new PDFDocument({
      margin: 50,
      size: 'A4',
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${analysis.title.replace(/[^a-z0-9]/gi, '_')}_analysis.pdf"`
    );

    // Pipe to response
    doc.pipe(res);

    // Title
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text(analysis.title, { align: 'center' });

    doc.moveDown();

    // Metadata
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#666666')
      .text(`Created by: ${analysis.createdBy.name}`, { align: 'center' })
      .text(`Date: ${new Date(analysis.createdAt).toLocaleDateString()}`, { align: 'center' });

    doc.moveDown();

    // Documents section
    if (analysis.documents.length > 0) {
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text('Documents Analyzed:');

      doc.moveDown(0.5);

      analysis.documents.forEach((d) => {
        doc
          .fontSize(10)
          .font('Helvetica')
          .text(`• ${d.document.name} (${d.document.type.toUpperCase()})`);
      });

      doc.moveDown();
    }

    // Divider
    doc
      .strokeColor('#cccccc')
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();

    doc.moveDown();

    // Conversation section
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text('Analysis Conversation:');

    doc.moveDown();

    // Messages
    for (const message of analysis.messages) {
      const isUser = message.role === 'user';
      const senderName = isUser ? (message.user?.name || 'User') : 'Parse AI';

      // Message header
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(isUser ? '#3b82f6' : '#10b981')
        .text(senderName, { continued: true })
        .font('Helvetica')
        .fillColor('#999999')
        .text(`  •  ${new Date(message.createdAt).toLocaleString()}`);

      doc.moveDown(0.3);

      // Message content
      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#333333')
        .text(message.content, {
          align: 'left',
          lineGap: 2,
        });

      // Check if message has edited flag
      if (message.isEdited) {
        doc
          .fontSize(8)
          .fillColor('#999999')
          .text('(edited)');
      }

      doc.moveDown();

      // Add page break if needed
      if (doc.y > 700) {
        doc.addPage();
      }
    }

    // Footer
    doc.moveDown();
    doc
      .fontSize(8)
      .fillColor('#999999')
      .text(`Generated by Parse on ${new Date().toLocaleString()}`, {
        align: 'center',
      });

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error('Export PDF error:', error);
    res.status(500).json({ error: 'Failed to export analysis' });
  }
});

export default router;
