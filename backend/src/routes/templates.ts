import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all templates for user
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Get user's workspace IDs
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true },
    });
    const workspaceIds = memberships.map((m) => m.workspaceId);

    const templates = await prisma.template.findMany({
      where: {
        OR: [
          { createdById: userId },
          { workspaceId: { in: workspaceIds } },
          { isPublic: true },
        ],
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        sections: {
          orderBy: { position: 'asc' },
        },
        _count: {
          select: { sections: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ templates });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Get single template
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const template = await prisma.template.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        sections: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ template });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Create template
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, description, workspaceId, isPublic, sections } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Template name is required' });
    }

    const template = await prisma.template.create({
      data: {
        name,
        description,
        isPublic: isPublic || false,
        createdById: req.user!.id,
        workspaceId,
        sections: sections
          ? {
              create: sections.map((s: any, index: number) => ({
                type: s.type,
                content: s.content ? JSON.stringify(s.content) : null,
                position: s.position ?? index,
                width: s.width || 'full',
                chartId: s.chartId,
              })),
            }
          : undefined,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        sections: {
          orderBy: { position: 'asc' },
        },
      },
    });

    res.status(201).json({ template });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update template
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, description, isPublic, sections } = req.body;

    // Verify ownership
    const existing = await prisma.template.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (existing.createdById !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized to edit this template' });
    }

    // If sections are provided, delete existing and create new ones
    if (sections) {
      await prisma.templateSection.deleteMany({
        where: { templateId: req.params.id },
      });
    }

    const template = await prisma.template.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        isPublic,
        sections: sections
          ? {
              create: sections.map((s: any, index: number) => ({
                type: s.type,
                content: s.content ? JSON.stringify(s.content) : null,
                position: s.position ?? index,
                width: s.width || 'full',
                chartId: s.chartId,
              })),
            }
          : undefined,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        sections: {
          orderBy: { position: 'asc' },
        },
      },
    });

    res.json({ template });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete template
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.template.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (existing.createdById !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized to delete this template' });
    }

    await prisma.template.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Duplicate template
router.post('/:id/duplicate', authenticate, async (req: AuthRequest, res) => {
  try {
    const original = await prisma.template.findUnique({
      where: { id: req.params.id },
      include: { sections: true },
    });

    if (!original) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = await prisma.template.create({
      data: {
        name: `${original.name} (Copy)`,
        description: original.description,
        isPublic: false,
        createdById: req.user!.id,
        workspaceId: original.workspaceId,
        sections: {
          create: original.sections.map((s) => ({
            type: s.type,
            content: s.content,
            position: s.position,
            width: s.width,
            chartId: s.chartId,
          })),
        },
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        sections: {
          orderBy: { position: 'asc' },
        },
      },
    });

    res.status(201).json({ template });
  } catch (error) {
    console.error('Duplicate template error:', error);
    res.status(500).json({ error: 'Failed to duplicate template' });
  }
});

// Add section to template
router.post('/:id/sections', authenticate, async (req: AuthRequest, res) => {
  try {
    const { type, content, position, width, chartId } = req.body;

    const template = await prisma.template.findUnique({
      where: { id: req.params.id },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (template.createdById !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get current max position
    const maxPosition = await prisma.templateSection.aggregate({
      where: { templateId: req.params.id },
      _max: { position: true },
    });

    const section = await prisma.templateSection.create({
      data: {
        templateId: req.params.id,
        type,
        content: content ? JSON.stringify(content) : null,
        position: position ?? (maxPosition._max.position ?? -1) + 1,
        width: width || 'full',
        chartId,
      },
    });

    res.status(201).json({ section });
  } catch (error) {
    console.error('Add section error:', error);
    res.status(500).json({ error: 'Failed to add section' });
  }
});

// Update section
router.put('/:id/sections/:sectionId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { type, content, position, width, chartId } = req.body;

    const template = await prisma.template.findUnique({
      where: { id: req.params.id },
    });

    if (!template || template.createdById !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const section = await prisma.templateSection.update({
      where: { id: req.params.sectionId },
      data: {
        type,
        content: content !== undefined ? JSON.stringify(content) : undefined,
        position,
        width,
        chartId,
      },
    });

    res.json({ section });
  } catch (error) {
    console.error('Update section error:', error);
    res.status(500).json({ error: 'Failed to update section' });
  }
});

// Delete section
router.delete('/:id/sections/:sectionId', authenticate, async (req: AuthRequest, res) => {
  try {
    const template = await prisma.template.findUnique({
      where: { id: req.params.id },
    });

    if (!template || template.createdById !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.templateSection.delete({
      where: { id: req.params.sectionId },
    });

    res.json({ message: 'Section deleted' });
  } catch (error) {
    console.error('Delete section error:', error);
    res.status(500).json({ error: 'Failed to delete section' });
  }
});

// Reorder sections
router.put('/:id/sections/reorder', authenticate, async (req: AuthRequest, res) => {
  try {
    const { sectionIds } = req.body;

    const template = await prisma.template.findUnique({
      where: { id: req.params.id },
    });

    if (!template || template.createdById !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Update positions based on array order
    await Promise.all(
      sectionIds.map((id: string, index: number) =>
        prisma.templateSection.update({
          where: { id },
          data: { position: index },
        })
      )
    );

    const sections = await prisma.templateSection.findMany({
      where: { templateId: req.params.id },
      orderBy: { position: 'asc' },
    });

    res.json({ sections });
  } catch (error) {
    console.error('Reorder sections error:', error);
    res.status(500).json({ error: 'Failed to reorder sections' });
  }
});

export default router;
