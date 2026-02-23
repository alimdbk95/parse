import express from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

interface SearchResult {
  id: string;
  type: 'analysis' | 'document' | 'repository';
  title: string;
  subtitle?: string;
  icon: 'conversation' | 'document' | 'folder';
  url: string;
  updatedAt?: string;
}

// Global search
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { q } = req.query;
    const query = (q as string)?.toLowerCase() || '';

    if (!query || query.length < 2) {
      return res.json({ results: [] });
    }

    const userId = req.user!.id;

    // Get user's workspace IDs
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true },
    });
    const workspaceIds = memberships.map((m) => m.workspaceId);

    // Search analyses
    const analyses = await prisma.analysis.findMany({
      where: {
        OR: [
          { createdById: userId },
          { workspaceId: { in: workspaceIds } },
        ],
        title: {
          contains: query,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { content: true },
        },
      },
      take: 5,
      orderBy: { updatedAt: 'desc' },
    });

    // Search documents
    const documents = await prisma.document.findMany({
      where: {
        OR: [
          { uploadedById: userId },
          { workspaceId: { in: workspaceIds } },
        ],
        name: {
          contains: query,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        name: true,
        type: true,
        updatedAt: true,
      },
      take: 5,
      orderBy: { updatedAt: 'desc' },
    });

    // Search repositories
    const repositories = await prisma.repository.findMany({
      where: {
        ownerId: userId,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        updatedAt: true,
      },
      take: 5,
      orderBy: { updatedAt: 'desc' },
    });

    // Format results
    const results: SearchResult[] = [
      ...analyses.map((a) => ({
        id: a.id,
        type: 'analysis' as const,
        title: a.title,
        subtitle: a.messages[0]?.content?.slice(0, 60) || 'No messages yet',
        icon: 'conversation' as const,
        url: `/dashboard/chat/${a.id}`,
        updatedAt: a.updatedAt.toISOString(),
      })),
      ...documents.map((d) => ({
        id: d.id,
        type: 'document' as const,
        title: d.name,
        subtitle: d.type,
        icon: 'document' as const,
        url: `/dashboard/documents?highlight=${d.id}`,
        updatedAt: d.updatedAt.toISOString(),
      })),
      ...repositories.map((r) => ({
        id: r.id,
        type: 'repository' as const,
        title: r.name,
        subtitle: r.description || 'Repository',
        icon: 'folder' as const,
        url: `/dashboard/repositories/${r.id}`,
        updatedAt: r.updatedAt.toISOString(),
      })),
    ];

    // Sort by most recent
    results.sort((a, b) => {
      if (!a.updatedAt || !b.updatedAt) return 0;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    res.json({ results: results.slice(0, 10) });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
