import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { upload, isS3Enabled } from '../middleware/upload.js';
import { documentService } from '../services/documentService.js';
import { uploadToS3, getSignedDownloadUrl, deleteFromS3 } from '../services/s3Service.js';
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

    console.log('Processing upload:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      isS3Enabled
    });

    const { workspaceId } = req.body;
    let filePath: string;
    let content: string | null = null;
    let metadata: any = {};

    if (isS3Enabled) {
      // Upload to S3
      console.log('Uploading to S3...');
      const s3Result = await uploadToS3(req.file, 'documents');
      filePath = s3Result.key; // Store S3 key as path
      console.log('S3 upload complete:', filePath);

      // Parse content from buffer for S3 uploads (wrapped in try-catch)
      try {
        content = await documentService.parseFromBuffer(
          req.file.buffer,
          req.file.mimetype,
          req.file.originalname
        );
      } catch (parseError) {
        console.error('Content parsing failed, continuing with upload:', parseError);
        content = 'File uploaded successfully. Content extraction not available.';
      }
    } else {
      // Local storage
      filePath = req.file.path;
      console.log('Local storage path:', filePath);

      // Parse document content from file (wrapped in try-catch)
      try {
        const parsed = await documentService.parseDocument(
          req.file.path,
          req.file.mimetype
        );
        content = parsed.content;
        metadata = parsed.metadata;
      } catch (parseError) {
        console.error('Content parsing failed, continuing with upload:', parseError);
        content = 'File uploaded successfully. Content extraction not available.';
        metadata = { type: path.extname(req.file.originalname).replace('.', '') };
      }
    }

    const document = await prisma.document.create({
      data: {
        name: req.file.originalname,
        type: path.extname(req.file.originalname).replace('.', ''),
        size: req.file.size,
        path: filePath,
        mimeType: req.file.mimetype,
        content: content,
        metadata: JSON.stringify(metadata),
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
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Failed to upload document',
      details: error?.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
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

    if (isS3Enabled) {
      // Generate signed URL for S3 download
      const signedUrl = await getSignedDownloadUrl(document.path);
      res.json({ downloadUrl: signedUrl });
    } else {
      // Local file download
      res.download(document.path, document.name);
    }
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
    if (isS3Enabled) {
      await deleteFromS3(document.path);
    } else if (fs.existsSync(document.path)) {
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
