import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import {
  getVersionHistory,
  getVersion,
  compareVersions,
  restoreVersion,
  getVersionStats,
} from '../services/versionService.js';

const router = Router();

// Get version history for an analysis
router.get('/analyses/:analysisId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { limit, offset } = req.query;

    // Verify user has access to the analysis
    const analysis = await prisma.analysis.findUnique({
      where: { id: req.params.analysisId },
      include: {
        workspace: {
          include: {
            members: {
              where: { userId: req.user!.id },
            },
          },
        },
      },
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    // Check access
    const hasAccess =
      analysis.createdById === req.user!.id ||
      (analysis.workspace && analysis.workspace.members.length > 0);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await getVersionHistory(req.params.analysisId, {
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json(result);
  } catch (error) {
    console.error('Get version history error:', error);
    res.status(500).json({ error: 'Failed to fetch version history' });
  }
});

// Get version statistics for an analysis
router.get('/analyses/:analysisId/stats', authenticate, async (req: AuthRequest, res) => {
  try {
    const stats = await getVersionStats(req.params.analysisId);
    res.json(stats);
  } catch (error) {
    console.error('Get version stats error:', error);
    res.status(500).json({ error: 'Failed to fetch version stats' });
  }
});

// Get a specific version with full snapshot
router.get('/:versionId', authenticate, async (req: AuthRequest, res) => {
  try {
    const version = await getVersion(req.params.versionId);

    // Verify user has access to the analysis
    const analysis = await prisma.analysis.findUnique({
      where: { id: version.analysisId },
      include: {
        workspace: {
          include: {
            members: {
              where: { userId: req.user!.id },
            },
          },
        },
      },
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    const hasAccess =
      analysis.createdById === req.user!.id ||
      (analysis.workspace && analysis.workspace.members.length > 0);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ version });
  } catch (error: any) {
    console.error('Get version error:', error);
    if (error.message === 'Version not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to fetch version' });
  }
});

// Compare two versions
router.get('/compare/:versionId1/:versionId2', authenticate, async (req: AuthRequest, res) => {
  try {
    const comparison = await compareVersions(req.params.versionId1, req.params.versionId2);
    res.json(comparison);
  } catch (error: any) {
    console.error('Compare versions error:', error);
    if (error.message === 'Version not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to compare versions' });
  }
});

// Restore an analysis to a previous version
router.post('/analyses/:analysisId/restore/:versionId', authenticate, async (req: AuthRequest, res) => {
  try {
    // Verify user has edit access to the analysis
    const analysis = await prisma.analysis.findUnique({
      where: { id: req.params.analysisId },
      include: {
        workspace: {
          include: {
            members: {
              where: { userId: req.user!.id },
            },
          },
        },
      },
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    // Check if user has edit access
    const isOwner = analysis.createdById === req.user!.id;
    const workspaceMember = analysis.workspace?.members[0];
    const canEdit = isOwner || (workspaceMember && ['admin', 'editor'].includes(workspaceMember.role));

    if (!canEdit) {
      return res.status(403).json({ error: 'You do not have permission to restore versions' });
    }

    await restoreVersion(req.params.analysisId, req.params.versionId, req.user!.id);

    res.json({ message: 'Version restored successfully' });
  } catch (error: any) {
    console.error('Restore version error:', error);
    if (error.message === 'Version not found' || error.message === 'Version does not belong to this analysis') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to restore version' });
  }
});

export default router;
