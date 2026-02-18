import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all repositories for the user
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const repositories = await prisma.repository.findMany({
      where: {
        ownerId: req.user!.id,
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: {
            analyses: true,
            documents: true,
            comparisons: true,
          },
        },
      },
    });

    res.json({ repositories });
  } catch (error) {
    console.error('Get repositories error:', error);
    res.status(500).json({ error: 'Failed to get repositories' });
  }
});

// Create new repository
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, description, color, icon } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Repository name is required' });
    }

    const repository = await prisma.repository.create({
      data: {
        name,
        description: description || null,
        color: color || '#7C9FF5',
        icon: icon || 'folder',
        ownerId: req.user!.id,
      },
      include: {
        _count: {
          select: {
            analyses: true,
            documents: true,
            comparisons: true,
          },
        },
      },
    });

    res.status(201).json({ repository });
  } catch (error) {
    console.error('Create repository error:', error);
    res.status(500).json({ error: 'Failed to create repository' });
  }
});

// Get single repository with contents
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const repository = await prisma.repository.findFirst({
      where: {
        id: req.params.id,
        ownerId: req.user!.id,
      },
      include: {
        analyses: {
          orderBy: { addedAt: 'desc' },
        },
        documents: {
          orderBy: { addedAt: 'desc' },
        },
        comparisons: {
          orderBy: { addedAt: 'desc' },
        },
        _count: {
          select: {
            analyses: true,
            documents: true,
            comparisons: true,
          },
        },
      },
    });

    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Fetch full data for analyses
    const analysisIds = repository.analyses.map(a => a.analysisId);
    const analyses = analysisIds.length > 0 ? await prisma.analysis.findMany({
      where: { id: { in: analysisIds } },
      include: {
        _count: { select: { messages: true, charts: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }) : [];

    // Fetch full data for documents
    const documentIds = repository.documents.map(d => d.documentId);
    const documents = documentIds.length > 0 ? await prisma.document.findMany({
      where: { id: { in: documentIds } },
      include: {
        uploadedBy: { select: { id: true, name: true } },
      },
    }) : [];

    // Fetch full data for comparisons
    const comparisonIds = repository.comparisons.map(c => c.comparisonId);
    const comparisons = comparisonIds.length > 0 ? await prisma.compareSession.findMany({
      where: { id: { in: comparisonIds } },
      include: {
        _count: { select: { items: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }) : [];

    res.json({
      repository: {
        ...repository,
        analyses,
        documents,
        comparisons,
      },
    });
  } catch (error) {
    console.error('Get repository error:', error);
    res.status(500).json({ error: 'Failed to get repository' });
  }
});

// Update repository
router.patch('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, description, color, icon } = req.body;

    const repository = await prisma.repository.updateMany({
      where: {
        id: req.params.id,
        ownerId: req.user!.id,
      },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(color && { color }),
        ...(icon && { icon }),
        updatedAt: new Date(),
      },
    });

    if (repository.count === 0) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const updated = await prisma.repository.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: {
            analyses: true,
            documents: true,
            comparisons: true,
          },
        },
      },
    });

    res.json({ repository: updated });
  } catch (error) {
    console.error('Update repository error:', error);
    res.status(500).json({ error: 'Failed to update repository' });
  }
});

// Delete repository
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await prisma.repository.deleteMany({
      where: {
        id: req.params.id,
        ownerId: req.user!.id,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    res.json({ message: 'Repository deleted successfully' });
  } catch (error) {
    console.error('Delete repository error:', error);
    res.status(500).json({ error: 'Failed to delete repository' });
  }
});

// Add analysis to repository
router.post('/:id/analyses', authenticate, async (req: AuthRequest, res) => {
  try {
    const { analysisId } = req.body;

    // Verify repository ownership
    const repository = await prisma.repository.findFirst({
      where: {
        id: req.params.id,
        ownerId: req.user!.id,
      },
    });

    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Check if analysis exists and belongs to user
    const analysis = await prisma.analysis.findFirst({
      where: {
        id: analysisId,
        createdById: req.user!.id,
      },
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    // Add to repository
    const repoAnalysis = await prisma.repositoryAnalysis.create({
      data: {
        repositoryId: req.params.id,
        analysisId,
      },
    });

    // Update repository timestamp
    await prisma.repository.update({
      where: { id: req.params.id },
      data: { updatedAt: new Date() },
    });

    res.status(201).json({ repositoryAnalysis: repoAnalysis });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Analysis already in repository' });
    }
    console.error('Add analysis to repository error:', error);
    res.status(500).json({ error: 'Failed to add analysis to repository' });
  }
});

// Remove analysis from repository
router.delete('/:id/analyses/:analysisId', authenticate, async (req: AuthRequest, res) => {
  try {
    // Verify repository ownership
    const repository = await prisma.repository.findFirst({
      where: {
        id: req.params.id,
        ownerId: req.user!.id,
      },
    });

    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    await prisma.repositoryAnalysis.deleteMany({
      where: {
        repositoryId: req.params.id,
        analysisId: req.params.analysisId,
      },
    });

    res.json({ message: 'Analysis removed from repository' });
  } catch (error) {
    console.error('Remove analysis from repository error:', error);
    res.status(500).json({ error: 'Failed to remove analysis from repository' });
  }
});

// Add document to repository
router.post('/:id/documents', authenticate, async (req: AuthRequest, res) => {
  try {
    const { documentId } = req.body;

    // Verify repository ownership
    const repository = await prisma.repository.findFirst({
      where: {
        id: req.params.id,
        ownerId: req.user!.id,
      },
    });

    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Check if document exists and belongs to user
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        uploadedById: req.user!.id,
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Add to repository
    const repoDocument = await prisma.repositoryDocument.create({
      data: {
        repositoryId: req.params.id,
        documentId,
      },
    });

    // Update repository timestamp
    await prisma.repository.update({
      where: { id: req.params.id },
      data: { updatedAt: new Date() },
    });

    res.status(201).json({ repositoryDocument: repoDocument });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Document already in repository' });
    }
    console.error('Add document to repository error:', error);
    res.status(500).json({ error: 'Failed to add document to repository' });
  }
});

// Remove document from repository
router.delete('/:id/documents/:documentId', authenticate, async (req: AuthRequest, res) => {
  try {
    // Verify repository ownership
    const repository = await prisma.repository.findFirst({
      where: {
        id: req.params.id,
        ownerId: req.user!.id,
      },
    });

    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    await prisma.repositoryDocument.deleteMany({
      where: {
        repositoryId: req.params.id,
        documentId: req.params.documentId,
      },
    });

    res.json({ message: 'Document removed from repository' });
  } catch (error) {
    console.error('Remove document from repository error:', error);
    res.status(500).json({ error: 'Failed to remove document from repository' });
  }
});

// Add comparison to repository
router.post('/:id/comparisons', authenticate, async (req: AuthRequest, res) => {
  try {
    const { comparisonId } = req.body;

    // Verify repository ownership
    const repository = await prisma.repository.findFirst({
      where: {
        id: req.params.id,
        ownerId: req.user!.id,
      },
    });

    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Check if comparison exists and belongs to user
    const comparison = await prisma.compareSession.findFirst({
      where: {
        id: comparisonId,
        createdById: req.user!.id,
      },
    });

    if (!comparison) {
      return res.status(404).json({ error: 'Comparison not found' });
    }

    // Add to repository
    const repoComparison = await prisma.repositoryComparison.create({
      data: {
        repositoryId: req.params.id,
        comparisonId,
      },
    });

    // Update repository timestamp
    await prisma.repository.update({
      where: { id: req.params.id },
      data: { updatedAt: new Date() },
    });

    res.status(201).json({ repositoryComparison: repoComparison });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Comparison already in repository' });
    }
    console.error('Add comparison to repository error:', error);
    res.status(500).json({ error: 'Failed to add comparison to repository' });
  }
});

// Remove comparison from repository
router.delete('/:id/comparisons/:comparisonId', authenticate, async (req: AuthRequest, res) => {
  try {
    // Verify repository ownership
    const repository = await prisma.repository.findFirst({
      where: {
        id: req.params.id,
        ownerId: req.user!.id,
      },
    });

    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    await prisma.repositoryComparison.deleteMany({
      where: {
        repositoryId: req.params.id,
        comparisonId: req.params.comparisonId,
      },
    });

    res.json({ message: 'Comparison removed from repository' });
  } catch (error) {
    console.error('Remove comparison from repository error:', error);
    res.status(500).json({ error: 'Failed to remove comparison from repository' });
  }
});

export default router;
