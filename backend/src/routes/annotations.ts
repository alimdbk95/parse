import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get annotations for a chart
router.get('/charts/:chartId', authenticate, async (req: AuthRequest, res) => {
  try {
    const annotations = await prisma.chartAnnotation.findMany({
      where: { chartId: req.params.chartId },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ annotations });
  } catch (error) {
    console.error('Get annotations error:', error);
    res.status(500).json({ error: 'Failed to fetch annotations' });
  }
});

// Create annotation
router.post('/charts/:chartId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { content, dataIndex, dataKey, x, y, color } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Annotation content is required' });
    }

    if (dataIndex === undefined && (x === undefined || y === undefined)) {
      return res.status(400).json({ error: 'Either dataIndex or x/y coordinates required' });
    }

    // Verify chart exists
    const chart = await prisma.chart.findUnique({
      where: { id: req.params.chartId },
    });

    if (!chart) {
      return res.status(404).json({ error: 'Chart not found' });
    }

    const annotation = await prisma.chartAnnotation.create({
      data: {
        chartId: req.params.chartId,
        createdById: req.user!.id,
        content,
        dataIndex: dataIndex ?? 0,
        dataKey,
        x,
        y,
        color,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    res.status(201).json({ annotation });
  } catch (error) {
    console.error('Create annotation error:', error);
    res.status(500).json({ error: 'Failed to create annotation' });
  }
});

// Update annotation
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { content, color } = req.body;

    const existing = await prisma.chartAnnotation.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Annotation not found' });
    }

    if (existing.createdById !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized to edit this annotation' });
    }

    const annotation = await prisma.chartAnnotation.update({
      where: { id: req.params.id },
      data: {
        content,
        color,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    res.json({ annotation });
  } catch (error) {
    console.error('Update annotation error:', error);
    res.status(500).json({ error: 'Failed to update annotation' });
  }
});

// Delete annotation
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.chartAnnotation.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Annotation not found' });
    }

    if (existing.createdById !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized to delete this annotation' });
    }

    await prisma.chartAnnotation.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Annotation deleted successfully' });
  } catch (error) {
    console.error('Delete annotation error:', error);
    res.status(500).json({ error: 'Failed to delete annotation' });
  }
});

export default router;
