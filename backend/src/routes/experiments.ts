import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { statisticsService } from '../services/statisticsService.js';

const router = Router();
const prisma = new PrismaClient();

// Get all experiments
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { workspaceId, status, type } = req.query;

    const experiments = await prisma.experiment.findMany({
      where: {
        createdById: userId,
        ...(workspaceId && { workspaceId: workspaceId as string }),
        ...(status && { status: status as string }),
        ...(type && { type: type as string }),
      },
      include: {
        createdBy: { select: { id: true, name: true, avatar: true } },
        _count: {
          select: { factors: true, variations: true, runs: true, results: true, metrics: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ experiments });
  } catch (error) {
    console.error('Failed to fetch experiments:', error);
    res.status(500).json({ error: 'Failed to fetch experiments' });
  }
});

// Create experiment
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, description, hypothesis, type, confidenceLevel, workspaceId, analysisId } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    const validTypes = ['ab_test', 'full_factorial', 'parameter_matrix', 'custom'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid experiment type' });
    }

    const experiment = await prisma.experiment.create({
      data: {
        name,
        description,
        hypothesis,
        type,
        confidenceLevel: confidenceLevel || 0.95,
        workspaceId,
        analysisId,
        createdById: userId,
      },
      include: {
        createdBy: { select: { id: true, name: true, avatar: true } },
      },
    });

    res.status(201).json({ experiment });
  } catch (error) {
    console.error('Failed to create experiment:', error);
    res.status(500).json({ error: 'Failed to create experiment' });
  }
});

// Get experiment details
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const experiment = await prisma.experiment.findFirst({
      where: { id, createdById: userId },
      include: {
        createdBy: { select: { id: true, name: true, avatar: true } },
        factors: {
          include: { levelValues: true },
          orderBy: { position: 'asc' },
        },
        variations: {
          orderBy: { position: 'asc' },
        },
        metrics: {
          orderBy: { position: 'asc' },
        },
        runs: {
          include: {
            variation: { select: { id: true, name: true } },
          },
          orderBy: { runNumber: 'asc' },
        },
        results: {
          include: {
            variation: { select: { id: true, name: true } },
            metric: { select: { id: true, name: true, unit: true } },
          },
        },
      },
    });

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    res.json({ experiment });
  } catch (error) {
    console.error('Failed to fetch experiment:', error);
    res.status(500).json({ error: 'Failed to fetch experiment' });
  }
});

// Update experiment
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { name, description, hypothesis, confidenceLevel, conclusion } = req.body;

    const existing = await prisma.experiment.findFirst({
      where: { id, createdById: userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    const experiment = await prisma.experiment.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(hypothesis !== undefined && { hypothesis }),
        ...(confidenceLevel !== undefined && { confidenceLevel }),
        ...(conclusion !== undefined && { conclusion }),
      },
      include: {
        createdBy: { select: { id: true, name: true, avatar: true } },
      },
    });

    res.json({ experiment });
  } catch (error) {
    console.error('Failed to update experiment:', error);
    res.status(500).json({ error: 'Failed to update experiment' });
  }
});

// Delete experiment
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const existing = await prisma.experiment.findFirst({
      where: { id, createdById: userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    await prisma.experiment.delete({ where: { id } });
    res.json({ message: 'Experiment deleted successfully' });
  } catch (error) {
    console.error('Failed to delete experiment:', error);
    res.status(500).json({ error: 'Failed to delete experiment' });
  }
});

// Start experiment
router.post('/:id/start', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const existing = await prisma.experiment.findFirst({
      where: { id, createdById: userId },
      include: { variations: true, metrics: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    if (existing.variations.length < 2) {
      return res.status(400).json({ error: 'At least 2 variations required to start' });
    }

    if (existing.metrics.length < 1) {
      return res.status(400).json({ error: 'At least 1 metric required to start' });
    }

    const experiment = await prisma.experiment.update({
      where: { id },
      data: {
        status: 'running',
        startedAt: new Date(),
      },
    });

    res.json({ experiment });
  } catch (error) {
    console.error('Failed to start experiment:', error);
    res.status(500).json({ error: 'Failed to start experiment' });
  }
});

// Pause experiment
router.post('/:id/pause', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const existing = await prisma.experiment.findFirst({
      where: { id, createdById: userId, status: 'running' },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Running experiment not found' });
    }

    const experiment = await prisma.experiment.update({
      where: { id },
      data: { status: 'paused' },
    });

    res.json({ experiment });
  } catch (error) {
    console.error('Failed to pause experiment:', error);
    res.status(500).json({ error: 'Failed to pause experiment' });
  }
});

// Complete experiment
router.post('/:id/complete', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { conclusion } = req.body;

    const existing = await prisma.experiment.findFirst({
      where: { id, createdById: userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    // Calculate final statistics
    const results = await prisma.experimentResult.findMany({
      where: { experimentId: id },
      include: { variation: true, metric: true },
    });

    // Group results by variation and metric for summary
    const summary: any = { variationStats: {}, testResults: [] };

    const variationResults = new Map<string, Map<string, number[]>>();
    for (const result of results) {
      if (!variationResults.has(result.variationId)) {
        variationResults.set(result.variationId, new Map());
      }
      const metricMap = variationResults.get(result.variationId)!;
      if (!metricMap.has(result.metricId)) {
        metricMap.set(result.metricId, []);
      }
      metricMap.get(result.metricId)!.push(result.value);
    }

    // Calculate stats for each variation
    for (const [varId, metricMap] of variationResults) {
      summary.variationStats[varId] = {};
      for (const [metId, values] of metricMap) {
        summary.variationStats[varId][metId] = statisticsService.calculateDescriptiveStats(values);
      }
    }

    const experiment = await prisma.experiment.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        conclusion: conclusion || null,
        resultSummary: JSON.stringify(summary),
      },
    });

    res.json({ experiment, summary });
  } catch (error) {
    console.error('Failed to complete experiment:', error);
    res.status(500).json({ error: 'Failed to complete experiment' });
  }
});

// ============ FACTORS ============

// Add factor
router.post('/:id/factors', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { name, type, unit, description, minValue, maxValue, levels } = req.body;

    const experiment = await prisma.experiment.findFirst({
      where: { id, createdById: userId },
    });

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    if (experiment.status !== 'draft') {
      return res.status(400).json({ error: 'Cannot modify factors after experiment has started' });
    }

    const factorCount = await prisma.experimentFactor.count({
      where: { experimentId: id },
    });

    const factor = await prisma.experimentFactor.create({
      data: {
        name,
        type: type || 'categorical',
        unit,
        description,
        minValue,
        maxValue,
        levels: levels ? JSON.stringify(levels) : null,
        position: factorCount,
        experimentId: id,
      },
      include: { levelValues: true },
    });

    res.status(201).json({ factor });
  } catch (error) {
    console.error('Failed to add factor:', error);
    res.status(500).json({ error: 'Failed to add factor' });
  }
});

// Update factor
router.patch('/:id/factors/:factorId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id, factorId } = req.params;
    const userId = req.user!.id;
    const { name, type, unit, description, minValue, maxValue, levels } = req.body;

    const experiment = await prisma.experiment.findFirst({
      where: { id, createdById: userId, status: 'draft' },
    });

    if (!experiment) {
      return res.status(404).json({ error: 'Draft experiment not found' });
    }

    const factor = await prisma.experimentFactor.update({
      where: { id: factorId },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(unit !== undefined && { unit }),
        ...(description !== undefined && { description }),
        ...(minValue !== undefined && { minValue }),
        ...(maxValue !== undefined && { maxValue }),
        ...(levels !== undefined && { levels: JSON.stringify(levels) }),
      },
      include: { levelValues: true },
    });

    res.json({ factor });
  } catch (error) {
    console.error('Failed to update factor:', error);
    res.status(500).json({ error: 'Failed to update factor' });
  }
});

// Delete factor
router.delete('/:id/factors/:factorId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id, factorId } = req.params;
    const userId = req.user!.id;

    const experiment = await prisma.experiment.findFirst({
      where: { id, createdById: userId, status: 'draft' },
    });

    if (!experiment) {
      return res.status(404).json({ error: 'Draft experiment not found' });
    }

    await prisma.experimentFactor.delete({ where: { id: factorId } });
    res.json({ message: 'Factor deleted successfully' });
  } catch (error) {
    console.error('Failed to delete factor:', error);
    res.status(500).json({ error: 'Failed to delete factor' });
  }
});

// Add factor level
router.post('/:id/factors/:factorId/levels', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id, factorId } = req.params;
    const userId = req.user!.id;
    const { value, label, isControl } = req.body;

    const experiment = await prisma.experiment.findFirst({
      where: { id, createdById: userId, status: 'draft' },
    });

    if (!experiment) {
      return res.status(404).json({ error: 'Draft experiment not found' });
    }

    const level = await prisma.factorLevel.create({
      data: {
        value,
        label,
        isControl: isControl || false,
        factorId,
      },
    });

    res.status(201).json({ level });
  } catch (error) {
    console.error('Failed to add factor level:', error);
    res.status(500).json({ error: 'Failed to add factor level' });
  }
});

// ============ VARIATIONS ============

// Add variation
router.post('/:id/variations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { name, description, isControl, factorValues, trafficWeight } = req.body;

    const experiment = await prisma.experiment.findFirst({
      where: { id, createdById: userId },
    });

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    if (experiment.status !== 'draft') {
      return res.status(400).json({ error: 'Cannot add variations after experiment has started' });
    }

    const varCount = await prisma.experimentVariation.count({
      where: { experimentId: id },
    });

    const variation = await prisma.experimentVariation.create({
      data: {
        name,
        description,
        isControl: isControl || false,
        factorValues: factorValues ? JSON.stringify(factorValues) : '{}',
        trafficWeight,
        position: varCount,
        experimentId: id,
      },
    });

    res.status(201).json({ variation });
  } catch (error) {
    console.error('Failed to add variation:', error);
    res.status(500).json({ error: 'Failed to add variation' });
  }
});

// Generate factorial variations
router.post('/:id/variations/generate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const experiment = await prisma.experiment.findFirst({
      where: { id, createdById: userId, status: 'draft' },
      include: {
        factors: {
          include: { levelValues: true },
        },
      },
    });

    if (!experiment) {
      return res.status(404).json({ error: 'Draft experiment not found' });
    }

    if (experiment.factors.length === 0) {
      return res.status(400).json({ error: 'Add factors before generating variations' });
    }

    // Delete existing variations
    await prisma.experimentVariation.deleteMany({
      where: { experimentId: id },
    });

    // Prepare factors with their levels
    const factorsWithLevels = experiment.factors.map((f) => ({
      id: f.id,
      name: f.name,
      levels: f.levelValues.length > 0
        ? f.levelValues.map((l) => ({ id: l.id, value: l.value, isControl: l.isControl }))
        : JSON.parse(f.levels || '[]').map((v: string) => ({ value: v, isControl: false })),
    }));

    // Generate all combinations
    const combinations = statisticsService.generateFactorialCombinations(
      factorsWithLevels.map((f) => ({
        name: f.name,
        levels: f.levels.map((l: any) => l.value),
      }))
    );

    // Create variations
    const variations = [];
    for (let i = 0; i < combinations.length; i++) {
      const combo = combinations[i];
      const factorValues: Record<string, string> = {};

      for (const factor of factorsWithLevels) {
        factorValues[factor.id] = combo[factor.name];
      }

      // Check if this is the control (all control levels)
      const isControl = factorsWithLevels.every((f) => {
        const controlLevel = f.levels.find((l: any) => l.isControl);
        return controlLevel && combo[f.name] === controlLevel.value;
      });

      const variation = await prisma.experimentVariation.create({
        data: {
          name: Object.values(combo).join(' / '),
          isControl,
          factorValues: JSON.stringify(factorValues),
          position: i,
          experimentId: id,
        },
      });

      variations.push(variation);
    }

    res.json({ variations, count: variations.length });
  } catch (error) {
    console.error('Failed to generate variations:', error);
    res.status(500).json({ error: 'Failed to generate variations' });
  }
});

// Update variation
router.patch('/:id/variations/:variationId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id, variationId } = req.params;
    const userId = req.user!.id;
    const { name, description, isControl, trafficWeight } = req.body;

    const experiment = await prisma.experiment.findFirst({
      where: { id, createdById: userId },
    });

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    const variation = await prisma.experimentVariation.update({
      where: { id: variationId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(isControl !== undefined && { isControl }),
        ...(trafficWeight !== undefined && { trafficWeight }),
      },
    });

    res.json({ variation });
  } catch (error) {
    console.error('Failed to update variation:', error);
    res.status(500).json({ error: 'Failed to update variation' });
  }
});

// Delete variation
router.delete('/:id/variations/:variationId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id, variationId } = req.params;
    const userId = req.user!.id;

    const experiment = await prisma.experiment.findFirst({
      where: { id, createdById: userId, status: 'draft' },
    });

    if (!experiment) {
      return res.status(404).json({ error: 'Draft experiment not found' });
    }

    await prisma.experimentVariation.delete({ where: { id: variationId } });
    res.json({ message: 'Variation deleted successfully' });
  } catch (error) {
    console.error('Failed to delete variation:', error);
    res.status(500).json({ error: 'Failed to delete variation' });
  }
});

// ============ METRICS ============

// Add metric
router.post('/:id/metrics', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { name, type, unit, isPrimary, higherIsBetter, baselineValue, targetValue } = req.body;

    const experiment = await prisma.experiment.findFirst({
      where: { id, createdById: userId },
    });

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    const metricCount = await prisma.experimentMetric.count({
      where: { experimentId: id },
    });

    const metric = await prisma.experimentMetric.create({
      data: {
        name,
        type: type || 'numeric',
        unit,
        isPrimary: isPrimary || false,
        higherIsBetter: higherIsBetter !== false,
        baselineValue,
        targetValue,
        position: metricCount,
        experimentId: id,
      },
    });

    res.status(201).json({ metric });
  } catch (error) {
    console.error('Failed to add metric:', error);
    res.status(500).json({ error: 'Failed to add metric' });
  }
});

// Update metric
router.patch('/:id/metrics/:metricId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id, metricId } = req.params;
    const userId = req.user!.id;
    const { name, type, unit, isPrimary, higherIsBetter, baselineValue, targetValue } = req.body;

    const experiment = await prisma.experiment.findFirst({
      where: { id, createdById: userId },
    });

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    const metric = await prisma.experimentMetric.update({
      where: { id: metricId },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(unit !== undefined && { unit }),
        ...(isPrimary !== undefined && { isPrimary }),
        ...(higherIsBetter !== undefined && { higherIsBetter }),
        ...(baselineValue !== undefined && { baselineValue }),
        ...(targetValue !== undefined && { targetValue }),
      },
    });

    res.json({ metric });
  } catch (error) {
    console.error('Failed to update metric:', error);
    res.status(500).json({ error: 'Failed to update metric' });
  }
});

// Delete metric
router.delete('/:id/metrics/:metricId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id, metricId } = req.params;
    const userId = req.user!.id;

    const experiment = await prisma.experiment.findFirst({
      where: { id, createdById: userId },
    });

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    await prisma.experimentMetric.delete({ where: { id: metricId } });
    res.json({ message: 'Metric deleted successfully' });
  } catch (error) {
    console.error('Failed to delete metric:', error);
    res.status(500).json({ error: 'Failed to delete metric' });
  }
});

// ============ RUNS ============

// Create run
router.post('/:id/runs', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { variationId, inputParams, notes } = req.body;

    const experiment = await prisma.experiment.findFirst({
      where: { id, createdById: userId },
    });

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    const runCount = await prisma.experimentRun.count({
      where: { experimentId: id },
    });

    const run = await prisma.experimentRun.create({
      data: {
        runNumber: runCount + 1,
        status: 'pending',
        inputParams: inputParams ? JSON.stringify(inputParams) : null,
        notes,
        experimentId: id,
        variationId,
      },
      include: {
        variation: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ run });
  } catch (error) {
    console.error('Failed to create run:', error);
    res.status(500).json({ error: 'Failed to create run' });
  }
});

// Update run
router.patch('/:id/runs/:runId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id, runId } = req.params;
    const userId = req.user!.id;
    const { status, notes, startedAt, completedAt, duration } = req.body;

    const experiment = await prisma.experiment.findFirst({
      where: { id, createdById: userId },
    });

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    const run = await prisma.experimentRun.update({
      where: { id: runId },
      data: {
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
        ...(startedAt !== undefined && { startedAt: new Date(startedAt) }),
        ...(completedAt !== undefined && { completedAt: new Date(completedAt) }),
        ...(duration !== undefined && { duration }),
      },
      include: {
        variation: { select: { id: true, name: true } },
      },
    });

    res.json({ run });
  } catch (error) {
    console.error('Failed to update run:', error);
    res.status(500).json({ error: 'Failed to update run' });
  }
});

// Complete run with results
router.post('/:id/runs/:runId/complete', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id, runId } = req.params;
    const userId = req.user!.id;
    const { results, notes } = req.body;

    const experiment = await prisma.experiment.findFirst({
      where: { id, createdById: userId },
    });

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    const run = await prisma.experimentRun.findFirst({
      where: { id: runId, experimentId: id },
    });

    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    // Create results
    const createdResults = [];
    for (const result of results || []) {
      const created = await prisma.experimentResult.create({
        data: {
          value: result.value,
          rawValue: result.rawValue,
          sampleSize: result.sampleSize || 1,
          standardError: result.standardError,
          experimentId: id,
          variationId: run.variationId,
          metricId: result.metricId,
          runId,
        },
      });
      createdResults.push(created);
    }

    // Update run status
    const updatedRun = await prisma.experimentRun.update({
      where: { id: runId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        notes: notes || run.notes,
      },
      include: {
        variation: { select: { id: true, name: true } },
        results: {
          include: {
            metric: { select: { id: true, name: true, unit: true } },
          },
        },
      },
    });

    res.json({ run: updatedRun, results: createdResults });
  } catch (error) {
    console.error('Failed to complete run:', error);
    res.status(500).json({ error: 'Failed to complete run' });
  }
});

// ============ RESULTS ============

// Record result
router.post('/:id/results', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { variationId, metricId, value, rawValue, sampleSize, standardError, runId } = req.body;

    const experiment = await prisma.experiment.findFirst({
      where: { id, createdById: userId },
    });

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    const result = await prisma.experimentResult.create({
      data: {
        value,
        rawValue,
        sampleSize: sampleSize || 1,
        standardError,
        experimentId: id,
        variationId,
        metricId,
        runId,
      },
      include: {
        variation: { select: { id: true, name: true } },
        metric: { select: { id: true, name: true, unit: true } },
      },
    });

    res.status(201).json({ result });
  } catch (error) {
    console.error('Failed to record result:', error);
    res.status(500).json({ error: 'Failed to record result' });
  }
});

// Bulk record results
router.post('/:id/results/bulk', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { results } = req.body;

    const experiment = await prisma.experiment.findFirst({
      where: { id, createdById: userId },
    });

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    const createdResults = [];
    for (const r of results || []) {
      const result = await prisma.experimentResult.create({
        data: {
          value: r.value,
          rawValue: r.rawValue,
          sampleSize: r.sampleSize || 1,
          standardError: r.standardError,
          experimentId: id,
          variationId: r.variationId,
          metricId: r.metricId,
          runId: r.runId,
        },
      });
      createdResults.push(result);
    }

    res.status(201).json({ results: createdResults, count: createdResults.length });
  } catch (error) {
    console.error('Failed to bulk record results:', error);
    res.status(500).json({ error: 'Failed to bulk record results' });
  }
});

// Delete result
router.delete('/:id/results/:resultId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id, resultId } = req.params;
    const userId = req.user!.id;

    const experiment = await prisma.experiment.findFirst({
      where: { id, createdById: userId },
    });

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    await prisma.experimentResult.delete({ where: { id: resultId } });
    res.json({ message: 'Result deleted successfully' });
  } catch (error) {
    console.error('Failed to delete result:', error);
    res.status(500).json({ error: 'Failed to delete result' });
  }
});

// ============ STATISTICS ============

// Get experiment statistics
router.get('/:id/statistics', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const experiment = await prisma.experiment.findFirst({
      where: { id, createdById: userId },
      include: {
        variations: true,
        metrics: true,
        results: {
          include: {
            variation: { select: { id: true, name: true, isControl: true } },
            metric: { select: { id: true, name: true, unit: true, higherIsBetter: true } },
          },
        },
      },
    });

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    // Group results by variation and metric
    const groupedResults = new Map<string, Map<string, number[]>>();

    for (const result of experiment.results) {
      const varKey = result.variationId;
      const metKey = result.metricId;

      if (!groupedResults.has(varKey)) {
        groupedResults.set(varKey, new Map());
      }
      if (!groupedResults.get(varKey)!.has(metKey)) {
        groupedResults.get(varKey)!.set(metKey, []);
      }
      groupedResults.get(varKey)!.get(metKey)!.push(result.value);
    }

    // Calculate descriptive stats for each variation/metric
    const descriptive: Record<string, Record<string, any>> = {};
    for (const [varId, metricMap] of groupedResults) {
      descriptive[varId] = {};
      for (const [metId, values] of metricMap) {
        descriptive[varId][metId] = statisticsService.calculateDescriptiveStats(values, 1 - experiment.confidenceLevel);
      }
    }

    // Perform hypothesis tests for each metric
    const hypothesisTests: Record<string, any> = {};
    const controlVariation = experiment.variations.find((v) => v.isControl);

    for (const metric of experiment.metrics) {
      const metricId = metric.id;
      const groups: number[][] = [];
      const variationInfo: Array<{ id: string; name: string; isControl: boolean }> = [];

      for (const variation of experiment.variations) {
        const values = groupedResults.get(variation.id)?.get(metricId) || [];
        if (values.length > 0) {
          groups.push(values);
          variationInfo.push({
            id: variation.id,
            name: variation.name,
            isControl: variation.isControl,
          });
        }
      }

      if (groups.length === 2) {
        // Two-sample t-test
        const testResult = statisticsService.tTestTwoSample(
          groups[0],
          groups[1],
          1 - experiment.confidenceLevel
        );
        hypothesisTests[metricId] = {
          ...testResult,
          variations: variationInfo,
          effectSizeInterpretation: statisticsService.interpretEffectSize(testResult.effectSize || 0),
        };
      } else if (groups.length > 2) {
        // One-way ANOVA
        const testResult = statisticsService.oneWayAnova(groups, 1 - experiment.confidenceLevel);
        hypothesisTests[metricId] = {
          ...testResult,
          variations: variationInfo,
          effectSizeInterpretation: statisticsService.interpretEffectSize(testResult.effectSize || 0),
        };
      }
    }

    // Power analysis for primary metric
    let powerAnalysis = null;
    const primaryMetric = experiment.metrics.find((m) => m.isPrimary);
    if (primaryMetric && controlVariation) {
      const controlValues = groupedResults.get(controlVariation.id)?.get(primaryMetric.id) || [];
      const treatmentVariation = experiment.variations.find((v) => !v.isControl);
      const treatmentValues = treatmentVariation
        ? groupedResults.get(treatmentVariation.id)?.get(primaryMetric.id) || []
        : [];

      if (controlValues.length > 0 && treatmentValues.length > 0) {
        powerAnalysis = statisticsService.powerAnalysis(
          controlValues,
          treatmentValues,
          1 - experiment.confidenceLevel
        );
      }
    }

    res.json({
      descriptive,
      hypothesisTests,
      powerAnalysis,
      totalResults: experiment.results.length,
      variationCount: experiment.variations.length,
      metricCount: experiment.metrics.length,
    });
  } catch (error) {
    console.error('Failed to calculate statistics:', error);
    res.status(500).json({ error: 'Failed to calculate statistics' });
  }
});

// Power analysis
router.post('/:id/statistics/power', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { effectSize, desiredPower, alpha } = req.body;

    const experiment = await prisma.experiment.findFirst({
      where: { id, createdById: userId },
    });

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    const requiredSampleSize = statisticsService.calculateRequiredSampleSize(
      effectSize || 0.5,
      desiredPower || 0.8,
      alpha || (1 - experiment.confidenceLevel)
    );

    const achievedPower = statisticsService.calculatePower(
      requiredSampleSize,
      effectSize || 0.5,
      alpha || (1 - experiment.confidenceLevel)
    );

    res.json({
      requiredSampleSize,
      achievedPower,
      effectSize: effectSize || 0.5,
      alpha: alpha || (1 - experiment.confidenceLevel),
      desiredPower: desiredPower || 0.8,
    });
  } catch (error) {
    console.error('Failed to calculate power:', error);
    res.status(500).json({ error: 'Failed to calculate power' });
  }
});

export default router;
