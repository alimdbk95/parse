import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Get all parameters for an analysis
router.get('/:analysisId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { analysisId } = req.params;
    const userId = req.user!.id;

    // Verify user has access to this analysis
    const analysis = await prisma.analysis.findFirst({
      where: {
        id: analysisId,
        OR: [
          { createdById: userId },
          {
            workspace: {
              members: {
                some: { userId }
              }
            }
          }
        ]
      }
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    const parameters = await prisma.analysisParameter.findMany({
      where: { analysisId },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ parameters });
  } catch (error) {
    console.error('Failed to fetch parameters:', error);
    res.status(500).json({ error: 'Failed to fetch parameters' });
  }
});

// Add a new parameter
router.post('/:analysisId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { analysisId } = req.params;
    const { key, value, comment } = req.body;
    const userId = req.user!.id;

    if (!key || typeof key !== 'string' || key.trim() === '') {
      return res.status(400).json({ error: 'Parameter key is required' });
    }

    // Verify user has edit access to this analysis
    const analysis = await prisma.analysis.findFirst({
      where: {
        id: analysisId,
        OR: [
          { createdById: userId },
          {
            workspace: {
              members: {
                some: {
                  userId,
                  role: { in: ['admin', 'editor'] }
                }
              }
            }
          }
        ]
      }
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found or no edit access' });
    }

    // Check if key already exists
    const existing = await prisma.analysisParameter.findFirst({
      where: { analysisId, key: key.trim() }
    });

    if (existing) {
      return res.status(400).json({ error: 'Parameter with this key already exists' });
    }

    const parameter = await prisma.analysisParameter.create({
      data: {
        key: key.trim(),
        value: value || '',
        comment: comment || null,
        analysisId
      }
    });

    res.status(201).json({ parameter });
  } catch (error) {
    console.error('Failed to create parameter:', error);
    res.status(500).json({ error: 'Failed to create parameter' });
  }
});

// Update a parameter
router.put('/:analysisId/:paramId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { analysisId, paramId } = req.params;
    const { key, value, comment } = req.body;
    const userId = req.user!.id;

    // Verify user has edit access
    const analysis = await prisma.analysis.findFirst({
      where: {
        id: analysisId,
        OR: [
          { createdById: userId },
          {
            workspace: {
              members: {
                some: {
                  userId,
                  role: { in: ['admin', 'editor'] }
                }
              }
            }
          }
        ]
      }
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found or no edit access' });
    }

    // Check if parameter exists
    const existing = await prisma.analysisParameter.findFirst({
      where: { id: paramId, analysisId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Parameter not found' });
    }

    // If changing key, check for duplicate
    if (key && key !== existing.key) {
      const duplicate = await prisma.analysisParameter.findFirst({
        where: {
          analysisId,
          key: key.trim(),
          id: { not: paramId }
        }
      });

      if (duplicate) {
        return res.status(400).json({ error: 'Parameter with this key already exists' });
      }
    }

    const parameter = await prisma.analysisParameter.update({
      where: { id: paramId },
      data: {
        ...(key !== undefined && { key: key.trim() }),
        ...(value !== undefined && { value }),
        ...(comment !== undefined && { comment: comment || null })
      }
    });

    res.json({ parameter });
  } catch (error) {
    console.error('Failed to update parameter:', error);
    res.status(500).json({ error: 'Failed to update parameter' });
  }
});

// Delete a parameter
router.delete('/:analysisId/:paramId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { analysisId, paramId } = req.params;
    const userId = req.user!.id;

    // Verify user has edit access
    const analysis = await prisma.analysis.findFirst({
      where: {
        id: analysisId,
        OR: [
          { createdById: userId },
          {
            workspace: {
              members: {
                some: {
                  userId,
                  role: { in: ['admin', 'editor'] }
                }
              }
            }
          }
        ]
      }
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found or no edit access' });
    }

    // Check if parameter exists
    const existing = await prisma.analysisParameter.findFirst({
      where: { id: paramId, analysisId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Parameter not found' });
    }

    await prisma.analysisParameter.delete({
      where: { id: paramId }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete parameter:', error);
    res.status(500).json({ error: 'Failed to delete parameter' });
  }
});

export default router;
