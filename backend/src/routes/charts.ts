import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { chartService } from '../services/chartService.js';

const router = Router();

// Get all charts
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { workspaceId, analysisId } = req.query;

    const charts = await prisma.chart.findMany({
      where: {
        OR: [
          { createdById: req.user!.id },
          ...(workspaceId ? [{ workspaceId: workspaceId as string }] : []),
        ],
        ...(analysisId && { analysisId: analysisId as string }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        analysis: {
          select: { id: true, title: true },
        },
      },
    });

    res.json({ charts });
  } catch (error) {
    console.error('Get charts error:', error);
    res.status(500).json({ error: 'Failed to get charts' });
  }
});

// Create chart
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const {
      title,
      type,
      data,
      config,
      colors,
      background,
      fontFamily,
      showLegend,
      showGrid,
      workspaceId,
      analysisId,
    } = req.body;

    // Generate config if not provided
    const chartConfig = config || chartService.generateChartConfig(
      type || 'bar',
      data || chartService.getSampleData(type || 'bar'),
      { title, colors, background, fontFamily, showLegend, showGrid }
    );

    const chart = await prisma.chart.create({
      data: {
        title: title || 'Untitled Chart',
        type: type || 'bar',
        data: JSON.stringify(data || chartService.getSampleData(type || 'bar')),
        config: JSON.stringify(chartConfig),
        colors: colors ? JSON.stringify(colors) : null,
        background: background || 'dark',
        fontFamily,
        showLegend: showLegend !== false,
        showGrid: showGrid !== false,
        createdById: req.user!.id,
        workspaceId: workspaceId || null,
        analysisId: analysisId || null,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Emit socket event
    const io = req.app.get('io');
    if (workspaceId) {
      io.to(`workspace:${workspaceId}`).emit('chart-created', {
        chart,
        createdBy: req.user,
      });
    }

    res.status(201).json({ chart });
  } catch (error) {
    console.error('Create chart error:', error);
    res.status(500).json({ error: 'Failed to create chart' });
  }
});

// Get single chart
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const chart = await prisma.chart.findFirst({
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
        analysis: {
          select: { id: true, title: true },
        },
      },
    });

    if (!chart) {
      return res.status(404).json({ error: 'Chart not found' });
    }

    res.json({ chart });
  } catch (error) {
    console.error('Get chart error:', error);
    res.status(500).json({ error: 'Failed to get chart' });
  }
});

// Update chart
router.patch('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const {
      title,
      type,
      data,
      config,
      colors,
      background,
      fontFamily,
      showLegend,
      showGrid,
    } = req.body;

    // Verify ownership or editor access
    const existing = await prisma.chart.findFirst({
      where: {
        id: req.params.id,
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

    if (!existing) {
      return res.status(404).json({ error: 'Chart not found or not authorized' });
    }

    const chart = await prisma.chart.update({
      where: { id: req.params.id },
      data: {
        ...(title && { title }),
        ...(type && { type }),
        ...(data && { data: JSON.stringify(data) }),
        ...(config && { config: JSON.stringify(config) }),
        ...(colors && { colors: JSON.stringify(colors) }),
        ...(background && { background }),
        ...(fontFamily !== undefined && { fontFamily }),
        ...(showLegend !== undefined && { showLegend }),
        ...(showGrid !== undefined && { showGrid }),
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Emit socket event
    const io = req.app.get('io');
    if (chart.workspaceId) {
      io.to(`workspace:${chart.workspaceId}`).emit('chart-updated', {
        chart,
        updatedBy: req.user,
      });
    }

    res.json({ chart });
  } catch (error) {
    console.error('Update chart error:', error);
    res.status(500).json({ error: 'Failed to update chart' });
  }
});

// Duplicate chart
router.post('/:id/duplicate', authenticate, async (req: AuthRequest, res) => {
  try {
    const original = await prisma.chart.findFirst({
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
    });

    if (!original) {
      return res.status(404).json({ error: 'Chart not found' });
    }

    const chart = await prisma.chart.create({
      data: {
        title: `${original.title} (Copy)`,
        type: original.type,
        data: original.data,
        config: original.config,
        colors: original.colors,
        background: original.background,
        fontFamily: original.fontFamily,
        showLegend: original.showLegend,
        showGrid: original.showGrid,
        createdById: req.user!.id,
        workspaceId: original.workspaceId,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(201).json({ chart });
  } catch (error) {
    console.error('Duplicate chart error:', error);
    res.status(500).json({ error: 'Failed to duplicate chart' });
  }
});

// Delete chart
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const chart = await prisma.chart.findFirst({
      where: {
        id: req.params.id,
        createdById: req.user!.id,
      },
    });

    if (!chart) {
      return res.status(404).json({ error: 'Chart not found or not authorized' });
    }

    await prisma.chart.delete({
      where: { id: req.params.id },
    });

    // Emit socket event
    const io = req.app.get('io');
    if (chart.workspaceId) {
      io.to(`workspace:${chart.workspaceId}`).emit('chart-deleted', {
        chartId: chart.id,
        deletedBy: req.user,
      });
    }

    res.json({ message: 'Chart deleted successfully' });
  } catch (error) {
    console.error('Delete chart error:', error);
    res.status(500).json({ error: 'Failed to delete chart' });
  }
});

// Get chart types info
router.get('/meta/types', authenticate, async (req: AuthRequest, res) => {
  res.json({
    types: [
      { id: 'bar', name: 'Bar Chart', description: 'Compare values across categories' },
      { id: 'line', name: 'Line Chart', description: 'Show trends over time' },
      { id: 'pie', name: 'Pie Chart', description: 'Show proportional distribution' },
      { id: 'area', name: 'Area Chart', description: 'Visualize cumulative values' },
      { id: 'scatter', name: 'Scatter Plot', description: 'Show correlation between variables' },
    ],
  });
});

export default router;
