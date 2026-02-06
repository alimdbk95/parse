import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { documentService } from '../services/documentService.js';
import fs from 'fs';
import path from 'path';

const router = Router();

// Get all documents
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { workspaceId } = req.query;

    const documents = await prisma.document.findMany({
      where: {
        OR: [
          { uploadedById: req.user!.id },
          ...(workspaceId ? [{ workspaceId: workspaceId as string }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json({ documents });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to get documents' });
  }
});

// Upload document
router.post('/upload', authenticate, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { workspaceId } = req.body;

    // Parse document content
    const parsed = await documentService.parseDocument(
      req.file.path,
      req.file.mimetype
    );

    const document = await prisma.document.create({
      data: {
        name: req.file.originalname,
        type: path.extname(req.file.originalname).replace('.', ''),
        size: req.file.size,
        path: req.file.path,
        mimeType: req.file.mimetype,
        content: parsed.content,
        metadata: JSON.stringify(parsed.metadata),
        uploadedById: req.user!.id,
        workspaceId: workspaceId || null,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (workspaceId) {
      io.to(`workspace:${workspaceId}`).emit('document-uploaded', {
        document,
        uploadedBy: req.user,
      });
    }

    res.status(201).json({ document });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Get single document
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const document = await prisma.document.findFirst({
      where: {
        id: req.params.id,
        OR: [
          { uploadedById: req.user!.id },
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
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ document });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: 'Failed to get document' });
  }
});

// Get document content/preview
router.get('/:id/content', authenticate, async (req: AuthRequest, res) => {
  try {
    const document = await prisma.document.findFirst({
      where: {
        id: req.params.id,
        OR: [
          { uploadedById: req.user!.id },
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

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      content: document.content,
      metadata: document.metadata ? JSON.parse(document.metadata) : null,
    });
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({ error: 'Failed to get document content' });
  }
});

// Download document
router.get('/:id/download', authenticate, async (req: AuthRequest, res) => {
  try {
    const document = await prisma.document.findFirst({
      where: {
        id: req.params.id,
        OR: [
          { uploadedById: req.user!.id },
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

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.download(document.path, document.name);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// Delete document
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const document = await prisma.document.findFirst({
      where: {
        id: req.params.id,
        uploadedById: req.user!.id,
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found or not authorized' });
    }

    // Delete file from storage
    if (fs.existsSync(document.path)) {
      fs.unlinkSync(document.path);
    }

    await prisma.document.delete({
      where: { id: req.params.id },
    });

    // Emit socket event
    const io = req.app.get('io');
    if (document.workspaceId) {
      io.to(`workspace:${document.workspaceId}`).emit('document-deleted', {
        documentId: document.id,
        deletedBy: req.user,
      });
    }

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;
