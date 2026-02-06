import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all compare sessions
router.get('/sessions', authenticate, async (req: AuthRequest, res) => {
  try {
    const sessions = await prisma.compareSession.findMany({
      where: {
        createdById: req.user!.id,
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        items: true,
        _count: {
          select: { comments: true, items: true },
        },
      },
    });

    res.json({ sessions });
  } catch (error) {
    console.error('Get compare sessions error:', error);
    res.status(500).json({ error: 'Failed to get compare sessions' });
  }
});

// Create compare session
router.post('/sessions', authenticate, async (req: AuthRequest, res) => {
  try {
    const { title, workspaceId, items } = req.body;

    const session = await prisma.compareSession.create({
      data: {
        title: title || 'New Comparison',
        createdById: req.user!.id,
        workspaceId: workspaceId || null,
        items: items?.length ? {
          create: items.map((item: any, index: number) => ({
            type: item.type,
            title: item.title,
            content: item.content || null,
            data: item.data ? JSON.stringify(item.data) : null,
            position: index,
            documentId: item.documentId || null,
            chartId: item.chartId || null,
          })),
        } : undefined,
      },
      include: {
        items: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(201).json({ session });
  } catch (error) {
    console.error('Create compare session error:', error);
    res.status(500).json({ error: 'Failed to create compare session' });
  }
});

// Get single compare session
router.get('/sessions/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const session = await prisma.compareSession.findFirst({
      where: {
        id: req.params.id,
        createdById: req.user!.id,
      },
      include: {
        items: {
          orderBy: { position: 'asc' },
          include: {
            comments: {
              include: {
                author: {
                  select: { id: true, name: true, avatar: true },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        comments: {
          include: {
            author: {
              select: { id: true, name: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Compare session not found' });
    }

    res.json({ session });
  } catch (error) {
    console.error('Get compare session error:', error);
    res.status(500).json({ error: 'Failed to get compare session' });
  }
});

// Add item to compare session
router.post('/sessions/:id/items', authenticate, async (req: AuthRequest, res) => {
  try {
    const { type, title, content, data, documentId, chartId } = req.body;
    const sessionId = req.params.id;

    // Verify access
    const session = await prisma.compareSession.findFirst({
      where: {
        id: sessionId,
        createdById: req.user!.id,
      },
      include: { items: true },
    });

    if (!session) {
      return res.status(404).json({ error: 'Compare session not found' });
    }

    const item = await prisma.compareItem.create({
      data: {
        type,
        title,
        content: content || null,
        data: data ? JSON.stringify(data) : null,
        position: session.items.length,
        sessionId,
        documentId: documentId || null,
        chartId: chartId || null,
      },
    });

    res.status(201).json({ item });
  } catch (error) {
    console.error('Add compare item error:', error);
    res.status(500).json({ error: 'Failed to add item to comparison' });
  }
});

// Remove item from compare session
router.delete('/sessions/:sessionId/items/:itemId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { sessionId, itemId } = req.params;

    // Verify access
    const session = await prisma.compareSession.findFirst({
      where: {
        id: sessionId,
        createdById: req.user!.id,
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Compare session not found' });
    }

    await prisma.compareItem.delete({
      where: { id: itemId },
    });

    res.json({ message: 'Item removed successfully' });
  } catch (error) {
    console.error('Remove compare item error:', error);
    res.status(500).json({ error: 'Failed to remove item' });
  }
});

// Add comment to session or item
router.post('/sessions/:id/comments', authenticate, async (req: AuthRequest, res) => {
  try {
    const { content, itemId } = req.body;
    const sessionId = req.params.id;

    // Verify access
    const session = await prisma.compareSession.findFirst({
      where: {
        id: sessionId,
        createdById: req.user!.id,
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Compare session not found' });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        authorId: req.user!.id,
        sessionId: itemId ? null : sessionId,
        itemId: itemId || null,
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    res.status(201).json({ comment });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Update comment
router.patch('/comments/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { content } = req.body;

    const comment = await prisma.comment.updateMany({
      where: {
        id: req.params.id,
        authorId: req.user!.id,
      },
      data: { content },
    });

    if (comment.count === 0) {
      return res.status(404).json({ error: 'Comment not found or not authorized' });
    }

    const updated = await prisma.comment.findUnique({
      where: { id: req.params.id },
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    res.json({ comment: updated });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// Delete comment
router.delete('/comments/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await prisma.comment.deleteMany({
      where: {
        id: req.params.id,
        authorId: req.user!.id,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Comment not found or not authorized' });
    }

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// Delete compare session
router.delete('/sessions/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await prisma.compareSession.deleteMany({
      where: {
        id: req.params.id,
        createdById: req.user!.id,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Compare session not found or not authorized' });
    }

    res.json({ message: 'Compare session deleted successfully' });
  } catch (error) {
    console.error('Delete compare session error:', error);
    res.status(500).json({ error: 'Failed to delete compare session' });
  }
});

// Fetch link metadata
router.post('/fetch-link', authenticate, async (req: AuthRequest, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Fetch the URL and extract metadata
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Parse Research Bot/1.0',
      },
    });

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : url;

    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
    const description = descMatch ? descMatch[1].trim() : '';

    // Extract og:image
    const imageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                       html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    const image = imageMatch ? imageMatch[1].trim() : '';

    res.json({
      url,
      title,
      description,
      image,
      type: 'link',
    });
  } catch (error) {
    console.error('Fetch link error:', error);
    res.status(500).json({ error: 'Failed to fetch link metadata' });
  }
});

export default router;
