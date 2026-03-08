import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { aiService } from '../services/aiService.js';
import PDFDocument from 'pdfkit';
import { createNotification, extractMentions, findUsersByMention } from './notifications.js';
import { createVersion } from '../services/versionService.js';
import { analyticsService } from '../services/analyticsService.js';

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

    // Create initial version
    await createVersion(analysis.id, req.user!.id, 'created');

    // Emit socket event
    const io = req.app.get('io');
    if (workspaceId) {
      io.to(`workspace:${workspaceId}`).emit('analysis-created', {
        analysis,
        createdBy: req.user,
      });
    }

    // Track analytics event
    analyticsService.trackEvent({
      eventType: 'analysis_created',
      userId: req.user!.id,
      workspaceId: workspaceId || undefined,
      analysisId: analysis.id,
      eventData: { title: analysis.title },
    });

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
      outputFormat: analysis.outputFormat || undefined,
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

    // Create version for the new message
    await createVersion(analysisId, req.user!.id, 'message_added', content.slice(0, 50));

    // Track analytics events
    analyticsService.trackEvent({
      eventType: 'message_sent',
      userId: req.user!.id,
      workspaceId: analysis.workspaceId || undefined,
      analysisId,
    });

    if (chart) {
      analyticsService.trackEvent({
        eventType: 'chart_generated',
        userId: req.user!.id,
        workspaceId: analysis.workspaceId || undefined,
        analysisId,
        eventData: { chartType: chart.type, chartTitle: chart.title },
      });
    }

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

    // Create version for document addition
    await createVersion(analysisId, req.user!.id, 'document_added', analysisDoc.document.name);

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

// Remove document from analysis
router.delete('/:id/documents/:documentId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id: analysisId, documentId } = req.params;

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

    await prisma.analysisDocument.deleteMany({
      where: {
        analysisId,
        documentId,
      },
    });

    // Create version for document removal
    await createVersion(analysisId, req.user!.id, 'document_removed');

    // Emit socket event
    const io = req.app.get('io');
    io.to(`analysis:${analysisId}`).emit('document-removed', { documentId });

    res.json({ message: 'Document removed from analysis' });
  } catch (error) {
    console.error('Remove document error:', error);
    res.status(500).json({ error: 'Failed to remove document' });
  }
});

// Update analysis
router.patch('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { title, description, outputFormat } = req.body;

    const analysis = await prisma.analysis.updateMany({
      where: {
        id: req.params.id,
        createdById: req.user!.id,
      },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(outputFormat && { outputFormat }),
      },
    });

    if (analysis.count === 0) {
      return res.status(404).json({ error: 'Analysis not found or not authorized' });
    }

    const updated = await prisma.analysis.findUnique({
      where: { id: req.params.id },
    });

    // Create version for title/description change
    if (title) {
      await createVersion(req.params.id, req.user!.id, 'title_changed', title);
    } else if (description !== undefined) {
      await createVersion(req.params.id, req.user!.id, 'description_changed');
    }

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

    // Create version for message edit
    await createVersion(analysisId, req.user!.id, 'message_edited');

    // Emit socket event
    const io = req.app.get('io');
    io.to(`analysis:${analysisId}`).emit('message-updated', { message });

    res.json({ message });
  } catch (error) {
    console.error('Update message error:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// Update message metadata (chart data, etc.)
router.patch('/:analysisId/messages/:messageId/metadata', authenticate, async (req: AuthRequest, res) => {
  try {
    const { metadata } = req.body;
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

    // Get current message metadata
    const currentMessage = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!currentMessage) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Merge existing metadata with new metadata
    const existingMetadata = currentMessage.metadata
      ? (typeof currentMessage.metadata === 'string' ? JSON.parse(currentMessage.metadata) : currentMessage.metadata)
      : {};
    const mergedMetadata = { ...existingMetadata, ...metadata };

    // Update the message
    const message = await prisma.message.update({
      where: { id: messageId },
      data: {
        metadata: JSON.stringify(mergedMetadata),
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
    io.to(`analysis:${analysisId}`).emit('message-metadata-updated', { message });

    res.json({ message });
  } catch (error) {
    console.error('Update message metadata error:', error);
    res.status(500).json({ error: 'Failed to update message metadata' });
  }
});

// Add comment to message
router.post('/:analysisId/messages/:messageId/comments', authenticate, async (req: AuthRequest, res) => {
  try {
    const { content } = req.body;
    const { analysisId, messageId } = req.params;

    // Verify access and get analysis with workspace members
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
        createdBy: { select: { id: true, name: true } },
        workspace: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true } },
              },
            },
          },
        },
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

    // Create notifications for @mentions
    const mentions = extractMentions(content);
    if (mentions.length > 0 && analysis.workspaceId) {
      const mentionedUsers = await findUsersByMention(mentions, analysis.workspaceId);
      for (const user of mentionedUsers) {
        if (user.id !== req.user!.id) {
          const notification = await createNotification({
            userId: user.id,
            type: 'mention',
            title: 'You were mentioned',
            message: `${req.user!.name} mentioned you in a comment on "${analysis.title}"`,
            analysisId,
            messageId,
            commentId: comment.id,
            actorId: req.user!.id,
            actorName: req.user!.name,
          });
          // Send real-time notification
          io.to(`user:${user.id}`).emit('notification', notification);
        }
      }
    }

    // Notify analysis creator if they're not the commenter
    if (analysis.createdById !== req.user!.id) {
      const notification = await createNotification({
        userId: analysis.createdById,
        type: 'comment',
        title: 'New comment on your analysis',
        message: `${req.user!.name} commented on "${analysis.title}"`,
        analysisId,
        messageId,
        commentId: comment.id,
        actorId: req.user!.id,
        actorName: req.user!.name,
      });
      io.to(`user:${analysis.createdById}`).emit('notification', notification);
    }

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

// Update comment
router.patch('/:analysisId/messages/:messageId/comments/:commentId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { content } = req.body;
    const { analysisId, messageId, commentId } = req.params;

    // Find the comment and verify ownership
    const comment = await prisma.comment.findFirst({
      where: {
        id: commentId,
        messageId,
        authorId: req.user!.id,
      },
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found or not authorized' });
    }

    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        content,
        updatedAt: new Date(),
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(`analysis:${analysisId}`).emit('comment-updated', { comment: updatedComment, messageId });

    res.json({ comment: updatedComment });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// Delete comment
router.delete('/:analysisId/messages/:messageId/comments/:commentId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { analysisId, messageId, commentId } = req.params;

    // Find the comment and verify ownership
    const comment = await prisma.comment.findFirst({
      where: {
        id: commentId,
        messageId,
        authorId: req.user!.id,
      },
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found or not authorized' });
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(`analysis:${analysisId}`).emit('comment-deleted', { commentId, messageId });

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// Export analysis as PDF
router.get('/:id/export/pdf', authenticate, async (req: AuthRequest, res) => {
  try {
    // Fetch analysis with all related data
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
        charts: {
          select: {
            id: true,
            title: true,
            type: true,
            data: true,
          },
        },
      },
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    // Fetch user branding settings
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        brandPrimaryColor: true,
        brandAccentColor: true,
        brandTextColor: true,
        brandFont: true,
      },
    });

    // Branding colors (defaults if not set)
    const primaryColor = user?.brandPrimaryColor || '#3b82f6';
    const accentColor = user?.brandAccentColor || '#10b981';
    const textColor = '#333333';

    // Create PDF document
    const doc = new PDFDocument({
      margin: 50,
      size: 'A4',
      bufferPages: true,
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${analysis.title.replace(/[^a-z0-9]/gi, '_')}_analysis.pdf"`
    );

    // Pipe to response
    doc.pipe(res);

    // Header bar
    doc
      .rect(0, 0, 595, 60)
      .fill(primaryColor);

    // Logo text
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .text('Parse', 50, 20);

    // Date in header
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#ffffff')
      .text(new Date().toLocaleDateString(), 450, 25, { width: 100, align: 'right' });

    doc.moveDown(3);

    // Title
    doc
      .fontSize(22)
      .font('Helvetica-Bold')
      .fillColor(textColor)
      .text(analysis.title, 50, 80);

    doc.moveDown(0.5);

    // Metadata line
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#666666')
      .text(`Created by ${analysis.createdBy.name} • ${new Date(analysis.createdAt).toLocaleDateString()}`, 50);

    doc.moveDown(1.5);

    // Documents section
    if (analysis.documents.length > 0) {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(primaryColor)
        .text('DOCUMENTS ANALYZED', 50);

      doc.moveDown(0.5);

      analysis.documents.forEach((d) => {
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor(textColor)
          .text(`• ${d.document.name}`, 60, doc.y, { continued: true })
          .fillColor('#888888')
          .text(` (${d.document.type.toUpperCase()})`);
      });

      doc.moveDown(1.5);
    }

    // Divider
    doc
      .strokeColor('#e5e5e5')
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();

    doc.moveDown(1);

    // Conversation section
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor(primaryColor)
      .text('CONVERSATION', 50);

    doc.moveDown(1);

    // Messages
    for (const message of analysis.messages) {
      // Check page break
      if (doc.y > 700) {
        doc.addPage();
        doc.y = 50;
      }

      const isUser = message.role === 'user';
      const senderName = isUser ? (message.user?.name || 'You') : 'Parse AI';

      // Sender badge
      const badgeColor = isUser ? primaryColor : accentColor;
      const badgeWidth = doc.widthOfString(senderName) + 16;

      doc
        .roundedRect(50, doc.y, badgeWidth, 18, 4)
        .fill(badgeColor);

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text(senderName, 58, doc.y - 14);

      // Timestamp
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#999999')
        .text(new Date(message.createdAt).toLocaleString(), 58 + badgeWidth + 8, doc.y - 12);

      doc.moveDown(0.8);

      // Message content
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(textColor)
        .text(message.content, 50, doc.y, {
          width: 495,
          lineGap: 3,
        });

      // Check for chart in message metadata
      if (message.metadata) {
        try {
          const metadata = JSON.parse(message.metadata);
          if (metadata.chart) {
            doc.moveDown(0.5);

            // Chart indicator box
            doc
              .roundedRect(50, doc.y, 495, 40, 4)
              .fillAndStroke('#f8f9fa', '#e5e5e5');

            doc
              .fontSize(9)
              .font('Helvetica-Bold')
              .fillColor(primaryColor)
              .text(`📊 Chart: ${metadata.chart.title || 'Data Visualization'}`, 60, doc.y - 28);

            doc
              .fontSize(8)
              .font('Helvetica')
              .fillColor('#666666')
              .text(`Type: ${metadata.chart.type?.toUpperCase() || 'CHART'} • Data points: ${metadata.chart.data?.length || 0}`, 60, doc.y - 12);

            doc.moveDown(1.5);
          }
        } catch {
          // Ignore JSON parse errors
        }
      }

      // Edited indicator
      if (message.isEdited) {
        doc
          .fontSize(8)
          .font('Helvetica-Oblique')
          .fillColor('#999999')
          .text('(edited)', 50);
      }

      doc.moveDown(1.2);
    }

    // Charts section (if any standalone charts)
    if (analysis.charts && analysis.charts.length > 0) {
      doc.addPage();

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(primaryColor)
        .text('CHARTS & VISUALIZATIONS', 50, 50);

      doc.moveDown(1);

      for (const chart of analysis.charts) {
        if (doc.y > 680) {
          doc.addPage();
          doc.y = 50;
        }

        // Chart card
        doc
          .roundedRect(50, doc.y, 495, 60, 6)
          .fillAndStroke('#f8f9fa', '#e5e5e5');

        const chartY = doc.y;

        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor(textColor)
          .text(chart.title || 'Untitled Chart', 65, chartY + 12);

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#666666')
          .text(`Type: ${chart.type.toUpperCase()}`, 65, chartY + 30);

        try {
          const chartData = JSON.parse(chart.data);
          doc
            .text(`Data points: ${chartData.length}`, 200, chartY + 30);
        } catch {
          // Ignore
        }

        doc.y = chartY + 70;
        doc.moveDown(0.5);
      }
    }

    // Footer on all pages
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);

      // Footer line
      doc
        .strokeColor('#e5e5e5')
        .lineWidth(0.5)
        .moveTo(50, 780)
        .lineTo(545, 780)
        .stroke();

      // Footer text
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#999999')
        .text(
          `Generated by Parse • Page ${i + 1} of ${pages.count}`,
          50,
          790,
          { width: 495, align: 'center' }
        );
    }

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error('Export PDF error:', error);
    res.status(500).json({ error: 'Failed to export analysis' });
  }
});

export default router;
